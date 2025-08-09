"""
AI Player Testing Script — Dress To Impress (Python)
===================================================

What this does
--------------
This single-file script simulates the AI Player for a 2-minute fashion round.
It follows the PLAN → GATHER → TRYON → PICK phases, emits structured JSON
envelopes for each phase, and uses only local assets under `Agent/`.

Key features
------------
- Serves local images (avatar + closet) via an embedded static HTTP server
  so every image has an http:// URL
- Implements mocked tools: searchAmazon, getCurrentClothes, callFashnAPI, evaluate
- Runs tool calls in parallel where appropriate (asyncio) with a concurrency
  limit of 6 for try-ons
- Optionally composes simple try-on preview images (avatar and garments) if
  Pillow (PIL) is available; otherwise returns garment URLs as placeholders
- Outputs the exact JSON envelopes expected by the UI for each phase

Usage
-----
python3 Agent/main.py --theme "Summer Rooftop Party" --avatar woman

Options
-------
- --theme: string theme to guide palette/queries
- --avatar: "woman" | "man" | a custom relative path under Agent/ (e.g., "character/Woman.webp")
- --port: static server port (default 8000; auto-increments if busy)
- --duration-ms: round duration in ms (default 120000)

Notes
-----
- All images must be URLs; this script starts a local server and maps
  `Agent/` to `http://localhost:<port>/`.
- No external APIs required. `searchAmazon` is mocked by scanning the local closet
  and ranking by filename similarity to the query.
- `callFashnAPI` is also mocked; if Pillow is installed, it creates a quick
  composite preview; otherwise it returns the garment image URL as the
  try-on result.
"""

from __future__ import annotations

import argparse
import asyncio
import dataclasses
import hashlib
import json
import os
import random
import re
import socket
import string
import threading
import time
from dataclasses import dataclass
from datetime import datetime
import base64
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from typing import Dict, List, Literal, Optional, Tuple
from urllib.parse import urlparse
import urllib.request
import urllib.error
import json as json_lib


# Optional dependencies for image composition in mocked try-on
try:  # Pillow is optional; if not present, we degrade gracefully
    from PIL import Image, ImageDraw, ImageFont

    HAS_PIL = True
except Exception:
    HAS_PIL = False

# Optional OpenAI client; enabled when running in GPT mode
try:
    from openai import OpenAI  # type: ignore

    HAS_OPENAI = True
except Exception:
    HAS_OPENAI = False

# Optional dotenv loader
try:
    from dotenv import load_dotenv  # type: ignore

    HAS_DOTENV = True
except Exception:
    HAS_DOTENV = False


# ------------------------------------------------------------
# Paths and constants
# ------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
RESULTS_DIR = BASE_DIR / "results"
LOG_FILE = BASE_DIR / "logs.txt"

# Map categories to their local directories
CATEGORY_TO_DIR: Dict[str, Path] = {
    "top": BASE_DIR / "closet" / "tops",
    "bottom": BASE_DIR / "closet" / "bottoms",
    "dress": BASE_DIR / "closet" / "dresses",
}

# Allowed image extensions
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp", ".avif"}

Category = Literal["top", "bottom", "dress"]


# ------------------------------------------------------------
# Data contracts (types)
# ------------------------------------------------------------
@dataclass
class Product:
    id: str
    title: str
    image: str  # absolute http(s) URL
    url: str  # product page (for display); here same as image
    category: Category
    price: Optional[float] = None
    colors: Optional[List[str]] = None
    brand: Optional[str] = None
    provider: Optional[Literal["rapidapi", "mock"]] = None


@dataclass
class TryOnItem:
    id: str
    image: str
    category: Category


@dataclass
class FashnResult:
    renderId: str
    images: List[str]  # try-on previews (URLs)
    latencyMs: int


@dataclass
class EvaluateFeatures:
    paletteHint: Literal["cohesive", "mixed", "busy"]
    notes: str


@dataclass
class Config:
    base_url: str  # e.g., "http://localhost:8000"
    round_duration_ms: int = 120_000
    openai_model: str = "gpt-5"
    # If you need to override OpenAI API host, set env OPENAI_BASE_URL
    openai_base_url: Optional[str] = None
    # FASHN API configuration
    fashn_base_url: str = "https://api.fashn.ai/v1"
    fashn_model_name: str = "tryon-v1.6"
    # Wardrobe gallery controls for multimodal messages
    wardrobe_max_per_category: int = 8


# ------------------------------------------------------------
# Utilities
# ------------------------------------------------------------
def _slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9\-\_\s]", "", text)
    text = re.sub(r"\s+", "-", text).strip("-")
    return text[:80]


def _hash_short(text: str, length: int = 8) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:length]


def _normalize_title_from_filename(filename: str) -> str:
    name = Path(filename).stem
    name = re.sub(r"[_\-]+", " ", name)
    name = name.strip()
    # Capitalize words, keep numbers
    return " ".join(word.capitalize() for word in name.split())


def _extract_colors_from_filename(filename: str) -> List[str]:
    # Very light heuristic: detect common color words from filename
    COLOR_WORDS = [
        "white",
        "black",
        "navy",
        "tan",
        "beige",
        "olive",
        "charcoal",
        "blue",
        "red",
        "green",
        "yellow",
        "brown",
        "royal",
        "dark",
        "light",
        "natural",
        "khaki",
        "camo",
        "charcoal",
    ]
    lowered = filename.lower()
    found = []
    for color in COLOR_WORDS:
        if color in lowered:
            found.append(color)
    # de-duplicate while preserving order
    seen = set()
    deduped = []
    for c in found:
        if c not in seen:
            deduped.append(c)
            seen.add(c)
    return deduped


def _ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def _resolve_local_path_from_url(config: Config, url: str) -> Optional[Path]:
    """If URL is served by our local static server, map it back to a local file path."""
    try:
        parsed = urlparse(url)
        base = urlparse(config.base_url)
        if parsed.scheme == base.scheme and parsed.netloc == base.netloc:
            # Path relative to Agent/
            rel = parsed.path.lstrip("/")
            return BASE_DIR / rel
    except Exception:
        pass
    return None


def _download_image_to(path: Path, url: str) -> None:
    """Download remote image to local path using stdlib urllib."""
    try:
        _ensure_dir(path.parent)
        with urllib.request.urlopen(url) as resp:  # nosec B310
            data = resp.read()
        with open(path, "wb") as f:
            f.write(data)
        _log_event(f"Saved image to {path}")
    except Exception as e:
        _log_event(f"Download failed for {url}: {e}")


def _image_to_jpeg_data_uri(path: Path, max_dim_px: int = 512, target_max_bytes: int = 900_000) -> Optional[str]:
    """Convert a local image file to a downscaled JPEG data URI under ~900KB if possible.
    Requires Pillow. Returns None if conversion fails.
    """
    if not HAS_PIL:
        return None
    try:
        img = Image.open(path)
        img = img.convert("RGB")
        w, h = img.size
        scale = min(1.0, float(max_dim_px) / float(max(w, h)))
        if scale < 1.0:
            img = img.resize((int(w * scale), int(h * scale)))

        # Try a few qualities to stay under target size
        for quality in (75, 65, 55):
            from io import BytesIO

            buf = BytesIO()
            img.save(buf, format="JPEG", quality=quality, optimize=True)
            data = buf.getvalue()
            if len(data) <= target_max_bytes:
                b64 = base64.b64encode(data).decode("ascii")
                return f"data:image/jpeg;base64,{b64}"
        # As a fallback, return highest compression even if bigger
        from io import BytesIO

        buf = BytesIO()
        img.save(buf, format="JPEG", quality=50, optimize=True)
        data = buf.getvalue()
        b64 = base64.b64encode(data).decode("ascii")
        return f"data:image/jpeg;base64,{b64}"
    except Exception:
        return None


def _local_url_to_data_uri(config: Config, url: str, max_dim_px: int = 512) -> Optional[str]:
    """Map a local served URL to a base64 data URI for GPT image blocks."""
    local = _resolve_local_path_from_url(config, url)
    if not local or not local.exists():
        return None
    # Prefer JPEG conversion for compatibility and size control
    data_uri = _image_to_jpeg_data_uri(local, max_dim_px=max_dim_px)
    return data_uri


def _save_image_any(path: Path, src: str) -> None:
    """Save an image from an http(s) URL or a data URI to a local path."""
    try:
        if src.startswith("data:image/"):
            header, b64 = src.split(",", 1)
            data = base64.b64decode(b64)
            _ensure_dir(path.parent)
            with open(path, "wb") as f:
                f.write(data)
            _log_event(f"Saved data URI image to {path}")
            return
    except Exception as e:
        _log_event(f"Failed to decode data URI: {e}")
    # Fallback to HTTP download
    _download_image_to(path, src)


# ------------------------------------------------------------
# Logging
# ------------------------------------------------------------
def _log_event(message: str) -> None:
    ts = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts} UTC] {message}\n"
    try:
        with open(LOG_FILE, "a", encoding="utf-8") as f:
            f.write(line)
    except Exception:
        pass
    try:
        print(f"[log] {message}")
    except Exception:
        pass


def _truncate(obj: object, max_len: int = 4000) -> str:
    s = obj if isinstance(obj, str) else json.dumps(obj, default=str)
    return s if len(s) <= max_len else s[:max_len] + f"...(truncated +{len(s) - max_len})"


def _summarize_content_blocks(blocks: List[Dict]) -> Dict:
    text_count = 0
    image_count = 0
    data_uri_count = 0
    for b in blocks or []:
        t = b.get("type")
        if t == "text":
            text_count += 1
        elif t == "image_url":
            image_count += 1
            url = ((b.get("image_url") or {}).get("url"))
            if isinstance(url, str) and url.startswith("data:image/"):
                data_uri_count += 1
    return {"texts": text_count, "images": image_count, "dataURIs": data_uri_count}


# ------------------------------------------------------------
# Static HTTP server to expose Agent/ as http:// URLs
# ------------------------------------------------------------
def start_static_server(port: int = 8000) -> str:
    """Start a static file server rooted at Agent/ in a background thread.

    Returns base URL like "http://localhost:<port>". If the requested port is
    busy, increments until it finds a free port.
    """

    def find_free_port(start: int) -> int:
        p = start
        while True:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
                try:
                    s.bind(("127.0.0.1", p))
                    return p
                except OSError:
                    p += 1

    chosen_port = find_free_port(port)
    handler_cls = lambda *args, **kwargs: SimpleHTTPRequestHandler(
        *args, directory=str(BASE_DIR), **kwargs
    )
    httpd = ThreadingHTTPServer(("127.0.0.1", chosen_port), handler_cls)

    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    _log_event(f"Static server started on http://localhost:{chosen_port}")
    return f"http://localhost:{chosen_port}"


# ------------------------------------------------------------
# Closet scanning (local, used by mocked tools)
# ------------------------------------------------------------
def _list_closet_images_for_category(category: Category) -> List[Path]:
    directory = CATEGORY_TO_DIR[category]
    if not directory.exists():
        return []
    files = []
    for child in sorted(directory.iterdir()):
        if child.is_file() and child.suffix.lower() in IMAGE_EXTENSIONS:
            files.append(child)
    return files


def _file_to_product(config: Config, path: Path, category: Category) -> Product:
    rel = path.relative_to(BASE_DIR)
    image_url = f"{config.base_url}/{rel.as_posix()}"
    pid = f"local-{category}-{_hash_short(str(rel))}"
    title = _normalize_title_from_filename(path.name)
    colors = _extract_colors_from_filename(path.name)
    return Product(
        id=pid,
        title=title,
        image=image_url,
        url=image_url,
        category=category,
        colors=colors or None,
        provider="mock",
    )


def _all_products_by_category(config: Config, category: Category) -> List[Product]:
    return [_file_to_product(config, p, category) for p in _list_closet_images_for_category(category)]


# ------------------------------------------------------------
# Wardrobe image gallery blocks for GPT messages
# ------------------------------------------------------------
def build_wardrobe_image_blocks(config: Config, categories: Optional[List[Category]] = None, max_per_category: Optional[int] = None) -> List[Dict]:
    cats = categories or ["top", "bottom", "dress"]
    limit = max_per_category or config.wardrobe_max_per_category
    blocks: List[Dict] = []
    for cat in cats:
        items = _all_products_by_category(config, cat)[:limit]
        if not items:
            continue
        blocks.append({"type": "text", "text": f"Wardrobe {cat}s (showing up to {limit}):"})
        for p in items:
            data_uri = _local_url_to_data_uri(config, p.image, max_dim_px=512)
            if data_uri:
                blocks.append({"type": "image_url", "image_url": {"url": data_uri}})
            # Skip if cannot convert; avoids invalid localhost URLs
    return blocks


# ------------------------------------------------------------
# Mocked tools
# ------------------------------------------------------------
async def searchAmazon(
    config: Config,
    query: str,
    category: Category,
    filters: Optional[Dict] = None,
) -> Dict[str, List[Product]]:
    """Mocked search: scans local closet and ranks by filename similarity.

    Returns: { "items": Product[] }
    """
    filters = filters or {}
    limit = int(filters.get("limit", 12))
    tokens = {tok for tok in re.split(r"\W+", query.lower()) if tok}

    # Fetch local candidates
    candidates = _all_products_by_category(config, category)

    def score(prod: Product) -> int:
        filename = Path(urlparse(prod.image).path).name.lower()
        # Basic keyword match score
        base = sum(1 for t in tokens if t and t in filename)
        # Bonus if color from filters matches (if provided)
        palette = set(str(c).lower() for c in filters.get("colorPalette", []) if isinstance(c, str))
        if palette and prod.colors:
            if palette.intersection(set(c.lower() for c in prod.colors)):
                base += 1
        return base

    ranked = sorted(candidates, key=score, reverse=True)

    # If everything has score 0, just take the first N
    items = ranked[:limit] if ranked and score(ranked[0]) > 0 else candidates[:limit]
    # Shuffle very slightly to diversify
    random.shuffle(items)
    return {"items": items}


async def getCurrentClothes(
    config: Config,
    categories: Optional[List[Category]] = None,
) -> Dict[str, List[Product]]:
    cats = categories or ["top", "bottom", "dress"]
    wardrobe: List[Product] = []
    for c in cats:
        wardrobe.extend(_all_products_by_category(config, c))
    return {"wardrobe": wardrobe}


async def callFashnAPI(
    config: Config,
    avatarImage: str,
    items: List[TryOnItem],
    variation: int,
) -> FashnResult:
    """Mocked try-on. If Pillow is available, create a simple composite preview.
    Otherwise, return the garment image URL as the preview. Always returns a
    single image URL and latency.
    """
    start = time.perf_counter()
    # Construct a stable-ish render id from inputs
    items_key = ",".join([f"{it.category}:{it.id}" for it in items])
    rid = f"R-{_hash_short(avatarImage + '|' + items_key + '|' + str(variation), 10)}"

    out_dir = BASE_DIR / "out" / "tryon"
    _ensure_dir(out_dir)

    out_filename = f"{rid}_v{variation}.png"
    out_path = out_dir / out_filename

    # If we can compose, do a simple side-by-side preview (avatar | garments)
    composed_image_url: str
    if HAS_PIL:
        try:
            avatar_local_path = _resolve_local_path_from_url(config, avatarImage)
            if avatar_local_path and avatar_local_path.exists():
                avatar = Image.open(avatar_local_path).convert("RGBA")
            else:
                # Cannot resolve avatar locally; fallback blank canvas
                avatar = Image.new("RGBA", (512, 768), (240, 240, 240, 255))

            garment_images: List[Image.Image] = []
            for it in items:
                local = _resolve_local_path_from_url(config, it.image)
                if local and local.exists():
                    try:
                        garment_images.append(Image.open(local).convert("RGBA"))
                    except Exception:
                        pass

            # Keep preview compact; resize avatar to a reasonable width
            target_avatar_w = 380
            if avatar.width > target_avatar_w:
                scale = target_avatar_w / avatar.width
                avatar = avatar.resize((target_avatar_w, int(avatar.height * scale)))

            # Prepare garments column (max width ~300)
            column_w = 300
            pad = 12
            # Resize garments with max width
            processed = []
            for g in garment_images[:2]:  # use at most two garments
                if g.width > column_w:
                    scale = column_w / g.width
                    g = g.resize((column_w, int(g.height * scale)))
                processed.append(g)

            # Compute output canvas size
            right_h = sum((img.height for img in processed)) + pad * (len(processed) + 1)
            right_h = max(right_h, avatar.height + pad * 2)
            out_w = avatar.width + column_w + pad * 3
            out_h = right_h + pad * 2
            canvas = Image.new("RGBA", (out_w, out_h), (250, 250, 250, 255))

            # Paste avatar
            canvas.paste(avatar, (pad, pad), mask=avatar)

            # Paste garments stacked on the right
            y = pad
            x = avatar.width + pad * 2
            for g in processed:
                canvas.paste(g, (x, y), mask=g)
                y += g.height + pad

            # Add labels
            draw = ImageDraw.Draw(canvas)
            label = f"Variation {variation}" if variation is not None else "Preview"
            try:
                font = ImageFont.load_default()
            except Exception:
                font = None
            draw.rectangle([(0, 0), (out_w, 28)], fill=(0, 0, 0, 128))
            draw.text((8, 6), label, fill=(255, 255, 255, 255), font=font)

            # Save output
            canvas = canvas.convert("RGB")
            canvas.save(out_path)
            composed_image_url = f"{config.base_url}/{out_path.relative_to(BASE_DIR).as_posix()}"
        except Exception:
            # Fallback to first garment image
            composed_image_url = items[0].image if items else avatarImage
    else:
        # No PIL available, fallback
        composed_image_url = items[0].image if items else avatarImage

    latency_ms = int((time.perf_counter() - start) * 1000)
    return FashnResult(renderId=rid, images=[composed_image_url], latencyMs=latency_ms)


async def evaluate(
    theme: str,
    items: List[Product],
    tryOnImages: List[str],
) -> Dict[str, EvaluateFeatures]:
    """Non-LLM quick heuristics: palette hint + notes."""
    # Count unique colors from filename-derived hints
    colors: List[str] = []
    for it in items:
        if it.colors:
            colors.extend([c.lower() for c in it.colors])
    unique = set(colors)
    if len(unique) <= 2:
        hint: Literal["cohesive", "mixed", "busy"] = "cohesive"
    elif len(unique) <= 4:
        hint = "mixed"
    else:
        hint = "busy"

    notes = f"{len(tryOnImages)} try-on image(s); theme='{theme}'."
    return {"features": EvaluateFeatures(paletteHint=hint, notes=notes)}


# ------------------------------------------------------------
# AI Player Orchestrator
# ------------------------------------------------------------
class AIPlayer:
    """Implements the PLAN → GATHER → TRYON → PICK flow and emits JSON envelopes.

    This is a deterministic, non-LLM orchestrator intended for local testing.
    """

    def __init__(self, config: Config, theme: str, avatar_url: str):
        self.config = config
        self.theme = theme
        self.avatar_url = avatar_url
        self.round_ends_at = time.monotonic() + (config.round_duration_ms / 1000.0)

        # Caches (mimic the spec)
        self.cache_search: Dict[Category, List[Product]] = {"top": [], "bottom": [], "dress": []}
        self.cache_wardrobe: List[Product] = []
        self.tryons: Dict[str, List[str]] = {}  # outfitId -> list of image URLs

    def time_left_ms(self) -> int:
        return max(0, int((self.round_ends_at - time.monotonic()) * 1000))

    def emit(self, phase: Literal["PLAN", "GATHER", "TRYON", "PICK", "DONE"], ui_log: List[str], phase_result: Dict) -> None:
        envelope = {
            "phase": phase,
            "ui": {"log": ui_log},
            "phase_result": phase_result,
        }
        print(json.dumps(envelope, indent=2))
        _log_event(f"EMIT {phase}: {json.dumps(phase_result)[:800]}")

    # ---------- PLAN ----------
    def plan(self) -> Dict:
        palette = self._infer_palette_from_theme(self.theme)
        queries = [
            {"category": "top", "query": f"linen shirt {palette[0]} summer", "limit": 8},
            {"category": "bottom", "query": f"beige chinos slim summer", "limit": 8},
            {"category": "dress", "query": f"{palette[1]} midi sundress", "limit": 8},
        ]

        phase_result = {"paletteIntent": palette, "queries": queries}
        self.emit(
            phase="PLAN",
            ui_log=[
                f"Theme set: {self.theme}",
                f"Palette intent: {', '.join(palette)}",
                "Planning searches for top, bottom, and dress.",
            ],
            phase_result=phase_result,
        )
        return phase_result

    def _infer_palette_from_theme(self, theme: str) -> List[str]:
        lowered = theme.lower()
        if any(k in lowered for k in ["summer", "beach", "rooftop"]):
            return ["navy", "white", "tan"]
        if any(k in lowered for k in ["winter", "formal", "evening"]):
            return ["black", "charcoal", "white"]
        if any(k in lowered for k in ["spring", "garden", "day"]):
            return ["olive", "white", "khaki"]
        return ["navy", "white", "tan"]

    # ---------- GATHER ----------
    async def gather(self, plan_result: Dict) -> Dict:
        # Fire searches in parallel (top, bottom, dress) + local wardrobe
        palette = plan_result["paletteIntent"]
        q_top = plan_result["queries"][0]["query"]
        q_bottom = plan_result["queries"][1]["query"]
        q_dress = plan_result["queries"][2]["query"]

        search_tasks = [
            searchAmazon(self.config, q_top, "top", {"colorPalette": palette, "limit": 8}),
            searchAmazon(self.config, q_bottom, "bottom", {"colorPalette": palette, "limit": 8}),
            searchAmazon(self.config, q_dress, "dress", {"colorPalette": palette, "limit": 8}),
            getCurrentClothes(self.config, ["top", "bottom", "dress"]),
        ]
        _log_event("GATHER: dispatching wardrobe and searches")
        results = await asyncio.gather(*search_tasks)

        # Unpack results
        top_items = results[0]["items"]
        bottom_items = results[1]["items"]
        dress_items = results[2]["items"]
        wardrobe = results[3]["wardrobe"]

        self.cache_search["top"] = top_items
        self.cache_search["bottom"] = bottom_items
        self.cache_search["dress"] = dress_items
        self.cache_wardrobe = wardrobe

        # Shortlist outfits
        outfits: List[Dict] = []
        if top_items and bottom_items:
            outfits.append({"id": "O1", "items": [{"id": top_items[0].id}, {"id": bottom_items[0].id}]})
        if dress_items:
            outfits.append({"id": "O2", "items": [{"id": dress_items[0].id}]})

        variations = [11, 77]

        phase_result = {"outfits": outfits, "variations": variations}
        self.emit(
            phase="GATHER",
            ui_log=[
                f"Collected {len(top_items)} tops, {len(bottom_items)} bottoms, {len(dress_items)} dresses.",
                f"Wardrobe cache: {len(wardrobe)} items.",
                f"Trying outfits: {[o['id'] for o in outfits]} with variations {variations}.",
            ],
            phase_result=phase_result,
        )
        return phase_result

    # ---------- TRYON ----------
    async def tryon(self, gather_result: Dict) -> Dict:
        # Resolve item ids to full Products
        id_to_product: Dict[str, Product] = {p.id: p for p in self.cache_wardrobe}
        for cat, items in self.cache_search.items():
            for p in items:
                id_to_product.setdefault(p.id, p)

        outfits = []
        for o in gather_result["outfits"]:
            resolved_items: List[Product] = []
            for ref in o["items"]:
                prod = id_to_product.get(ref["id"])
                if prod:
                    resolved_items.append(prod)
            if resolved_items:
                outfits.append({"id": o["id"], "items": resolved_items})

        # Launch try-ons in parallel with ≤6 concurrency
        sem = asyncio.Semaphore(6)

        async def run_one(outfit_id: str, products: List[Product], variation: int) -> Tuple[str, int, FashnResult]:
            # Wrap call under semaphore
            async with sem:
                tryon_items = [TryOnItem(id=p.id, image=p.image, category=p.category) for p in products]
                res = await callFashnAPI(self.config, self.avatar_url, tryon_items, variation)
                return outfit_id, variation, res

        tasks = []
        for o in outfits:
            for v in gather_result["variations"]:
                tasks.append(run_one(o["id"], o["items"], v))

        _log_event(f"TRYON: launching {len(tasks)} try-on task(s)")
        results: List[Tuple[str, int, FashnResult]] = await asyncio.gather(*tasks)

        # Stash images per outfit
        for outfit_id, variation, res in results:
            self.tryons.setdefault(outfit_id, []).extend(res.images)

        # Evaluate each outfit (one eval per outfit)
        candidates = []
        for o in outfits:
            images = self.tryons.get(o["id"], [])
            eval_res = await evaluate(self.theme, o["items"], images)
            features: EvaluateFeatures = eval_res["features"]
            candidates.append(
                {
                    "id": o["id"],
                    "images": images,
                    "notes": f"{features.paletteHint}; {features.notes}",
                }
            )

        phase_result = {"candidates": candidates, "next_step": "pick"}
        self.emit(
            phase="TRYON",
            ui_log=[
                f"Received renders for outfits: {', '.join(self.tryons.keys())}.",
                "Evaluated candidates; ready to pick.",
            ],
            phase_result=phase_result,
        )
        return phase_result

    # ---------- PICK ----------
    async def pick(self, tryon_result: Dict) -> Dict:
        # Very simple ranking: prefer 'cohesive' in notes text; fallback first
        def score_candidate(c: Dict) -> int:
            score = 0
            notes = c.get("notes", "")
            if "cohesive" in notes:
                score += 2
            if "mixed" in notes:
                score += 1
            score += len(c.get("images", []))
            return score

        candidates = tryon_result.get("candidates", [])
        if not candidates:
            # Fallback: nothing rendered
            phase_result = {
                "final_outfit": {
                    "items": [],
                    "tryOnImage": self.avatar_url,
                    "reason": "No renders available; falling back to avatar.",
                }
            }
            self.emit(
                phase="PICK",
                ui_log=["No candidates; fallback pick."],
                phase_result=phase_result,
            )
            return phase_result

        best = max(candidates, key=score_candidate)
        # We need to return item metadata; resolve via caches
        id_to_product: Dict[str, Product] = {p.id: p for p in self.cache_wardrobe}
        for cat, items in self.cache_search.items():
            for p in items:
                id_to_product.setdefault(p.id, p)

        # Guess the items from tryon key using outfit id in previous step
        # For this local harness, infer by picking from cache top/bottom/dress
        items_minimal: List[Dict] = []
        if best["id"] == "O1":
            # top+bottom
            if self.cache_search["top"]:
                p = self.cache_search["top"][0]
                items_minimal.append({"id": p.id, "title": p.title, "category": p.category, "image": p.image})
            if self.cache_search["bottom"]:
                p = self.cache_search["bottom"][0]
                items_minimal.append({"id": p.id, "title": p.title, "category": p.category, "image": p.image})
            reason = "Cohesive palette; balanced proportions; clean lines."
        else:
            if self.cache_search["dress"]:
                p = self.cache_search["dress"][0]
                items_minimal.append({"id": p.id, "title": p.title, "category": p.category, "image": p.image})
            reason = "Single statement dress with cohesive tones and flattering shape."

        try_on_image = best.get("images", [self.avatar_url])[0]
        phase_result = {
            "final_outfit": {
                "items": items_minimal,
                "tryOnImage": try_on_image,
                "reason": reason,
            }
        }
        self.emit(
            phase="PICK",
            ui_log=[f"Picked {best['id']} with {len(best.get('images', []))} image(s)."],
            phase_result=phase_result,
        )
        return phase_result


# ------------------------------------------------------------
# CLI / main
# ------------------------------------------------------------
def _avatar_default_url(config: Config, avatar_arg: str) -> str:
    # avatar_arg can be "woman" | "man" | relative path under Agent/
    if avatar_arg.lower() == "woman":
        rel = "character/Woman.webp"
    elif avatar_arg.lower() == "man":
        rel = "character/man.webp"
    else:
        rel = avatar_arg.lstrip("/")
    return f"{config.base_url}/{rel}"


async def main_async(theme: str, avatar_arg: str, port: int, round_duration_ms: int) -> None:
    base_url = start_static_server(port)
    config = Config(base_url=base_url, round_duration_ms=round_duration_ms)
    avatar_url = _avatar_default_url(config, avatar_arg)

    player = AIPlayer(config=config, theme=theme, avatar_url=avatar_url)

    # PLAN
    plan_result = player.plan()

    # GATHER
    gather_result = await player.gather(plan_result)

    # If low on time, pick early
    if player.time_left_ms() < 20_000:
        await player.pick({"candidates": []})
        return

    # TRYON
    tryon_result = await player.tryon(gather_result)

    # If low on time, pick now
    if player.time_left_ms() < 20_000:
        await player.pick(tryon_result)
        return

    # PICK
    await player.pick(tryon_result)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="AI Player test harness (Python)")
    p.add_argument("--theme", type=str, default="Summer Rooftop Party", help="Style theme")
    p.add_argument("--avatar", type=str, default="woman", help='"woman" | "man" | relative path under Agent/')
    p.add_argument("--port", type=int, default=8000, help="Static server port (auto-increments if busy)")
    p.add_argument("--duration-ms", type=int, default=120_000, help="Round duration in ms (default 120000)")
    p.add_argument("--mode", type=str, choices=["local", "gpt"], default="gpt", help="Run mode: local (mocked) or gpt (real OpenAI+FASHN)")
    p.add_argument("--env-file", type=str, default="", help="Path to .env; if empty, auto-detect Agent/.env or project .env")
    return p.parse_args()


def main() -> None:
    args = parse_args()
    # Load environment variables from .env
    _load_env_from_file(args.env_file)
    try:
        if args.mode == "gpt":
            asyncio.run(run_gpt_round(args.theme, args.avatar, args.port, args.duration_ms))
        else:
            asyncio.run(main_async(args.theme, args.avatar, args.port, args.duration_ms))
    except KeyboardInterrupt:
        pass

# ============================================================
# GPT-5 Orchestrator (Real tools: getCurrentClothes, callFashnAPI[FASHN], evaluate)
# ============================================================

"""
Below is the GPT-5 driven orchestrator that follows the tools & images flow
described in Agent/instructions.md. Amazon search is intentionally disabled.

Run it by:
  python3 Agent/main.py --theme "Summer Rooftop Party" --avatar woman --port 8001

Set environment variables:
  - OPENAI_API_KEY (required)
  - FASHN_AI_API_KEY (required)
  - OPENAI_BASE_URL (optional)

It will:
  1) Start a local static server to expose `Agent/` images as URLs
  2) Send a system+user prompt with the avatar image to GPT-5
  3) Register tools (getCurrentClothes, callFashnAPI, evaluate)
  4) Dispatch tool calls concurrently (≤6 for FASHN)
  5) Save each FASHN output image into `Agent/character/` with the version name
  6) Print JSON envelopes per phase returned by the model
"""

# ---------- Tool definitions for OpenAI ----------
def build_tools_for_openai() -> List[Dict]:
    return [
        {
            "type": "function",
            "function": {
                "name": "getCurrentClothes",
                "description": "Return items from the local wardrobe (preloaded; hosted as URLs).",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "categories": {
                            "type": "array",
                            "items": {"type": "string", "enum": ["top", "bottom", "dress"]},
                        }
                    },
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "callFashnAPI",
                "description": "Virtual try-on for one avatar and 1–2 garments (either [top+bottom] or [dress]). Server runs ≤6 concurrently.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "avatarImage": {"type": "string"},
                        "items": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "string"},
                                    "image": {"type": "string"},
                                    "category": {"type": "string", "enum": ["top", "bottom", "dress"]},
                                },
                                "required": ["id", "image", "category"],
                            },
                            "minItems": 1,
                            "maxItems": 2,
                        },
                        "variation": {"type": "number"},
                    },
                    "required": ["avatarImage", "items", "variation"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "evaluate",
                "description": "Quick non-LLM heuristics for palette/notes. No budget.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "theme": {"type": "string"},
                        "items": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "id": {"type": "string"},
                                    "title": {"type": "string"},
                                    "category": {"type": "string", "enum": ["top", "bottom", "dress"]},
                                    "image": {"type": "string"},
                                },
                                "required": ["id", "category", "image"],
                            },
                        },
                        "tryOnImages": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["theme", "items", "tryOnImages"],
                },
            },
        },
    ]


def build_player_system_prompt() -> str:
    return (
        "You are the AI Player in a timed fashion game. Tools: getCurrentClothes, callFashnAPI, evaluate. "
        "Categories: top, bottom, dress. No budget.\n"
        "Process:\n"
        "- PLAN → emit {paletteIntent, queries[3]} (top/bottom/dress).\n"
        "- GATHER → call getCurrentClothes (Amazon search disabled).\n"
        "- TRYON → propose up to 2 outfit candidates; for each, call callFashnAPI twice with different variation values in the same step (parallel; server limits to 6).\n"
        "- PICK → call evaluate once per outfit; then visually compare the try‑on images and output final_outfit { items[], tryOnImage, reason }.\n"
        "Rules: Prefer ≤3 colors; continue with partial results if any tool is slow; if <20s remain, stop trying new things and pick the best available.\n"
        "Always return JSON { phase, ui:{log:[]}, phase_result }."
    )


async def fashn_run_and_poll(config: Config, avatar_url: str, garment_url: str) -> str:
    """Start a FASHN try-on job and poll for result; return resulting image URL."""
    api_key = os.environ.get("FASHN_AI_API_KEY")
    # Support alternate env var name from docs
    if not api_key:
        api_key = os.environ.get("FASHN_API_KEY")
    if not api_key:
        raise RuntimeError("FASHN_AI_API_KEY not set")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    # Convert localhost URLs to base64 data URIs for FASHN compatibility
    def _maybe_to_data_uri(url: str) -> str:
        try:
            parsed = urlparse(url)
            if parsed.scheme in {"http", "https"}:
                base = urlparse(config.base_url)
                if parsed.netloc == base.netloc:
                    data = _local_url_to_data_uri(config, url, max_dim_px=1024)
                    return data or url
                return url
            # Already a data URI; pass through
            if url.startswith("data:image/"):
                return url
        except Exception:
            pass
        return url

    payload = {
        "model_name": config.fashn_model_name,
        "inputs": {"model_image": _maybe_to_data_uri(avatar_url), "garment_image": _maybe_to_data_uri(garment_url)},
    }

    # Use stdlib for HTTP in a worker thread
    def _post_run() -> Dict:
        req = urllib.request.Request(
            url=f"{config.fashn_base_url}/run",
            data=json.dumps(payload).encode("utf-8"),
            headers=headers,
            method="POST",
        )
        with urllib.request.urlopen(req) as resp:  # nosec B310
            return json_lib.loads(resp.read().decode("utf-8"))

    _log_event(f"FASHN /run: model={config.fashn_model_name}")
    run_data = await asyncio.to_thread(_post_run)
    _log_event(f"FASHN /run response: {json.dumps(run_data)[:500]}")
    prediction_id = run_data.get("id")
    if not prediction_id:
        raise RuntimeError("FASHN: missing prediction id")

    async def _get_status() -> Dict:
        url = f"{config.fashn_base_url}/status/{prediction_id}"

        def _do_get() -> Dict:
            req = urllib.request.Request(url=url, headers=headers, method="GET")
            with urllib.request.urlopen(req) as resp:  # nosec B310
                return json_lib.loads(resp.read().decode("utf-8"))

        return await asyncio.to_thread(_do_get)

    # Poll up to 90s (30 * 3s)
    for i in range(30):
        status = await _get_status()
        s = status.get("status")
        _log_event(f"FASHN /status: {s} (poll {i+1}/30) body={json.dumps(status)[:500]}")
        if s == "completed" and status.get("output"):
            _log_event("FASHN completed")
            return status["output"][0]
        if s in {"failed", "canceled"}:
            err = status.get("error") or "unknown"
            _log_event(f"FASHN failed: {err}")
            raise RuntimeError(f"FASHN: job {s}. Reason: {err}")
        await asyncio.sleep(3)

    raise RuntimeError("FASHN: prediction timed out after 90s")


_fashn_semaphore = asyncio.Semaphore(6)


async def tool_callFashnAPI_real(
    config: Config,
    avatarImage: str,
    items: List[Dict],
    variation: int,
) -> Dict:
    """Real FASHN-backed tool. Calls FASHN once per garment, returns first image URL(s).
    Also downloads each resulting image to Agent/character with version name.
    """
    start = time.perf_counter()
    images: List[str] = []
    version_token = config.fashn_model_name.replace(".", "_").replace("-", "-")

    async with _fashn_semaphore:
        for garment in items:
            garment_url = garment["image"]
            try:
                _log_event(f"callFashnAPI: variation={variation} garment={garment.get('id','?')}")
                image_url = await fashn_run_and_poll(config, avatarImage, garment_url)
                images.append(image_url)
            except Exception:
                # Continue with partial results
                _log_event("callFashnAPI: error during try-on; continuing with partials")
                continue

    latency_ms = int((time.perf_counter() - start) * 1000)
    rid = f"RF-{_hash_short(avatarImage + '|' + '|'.join([it['id'] for it in items]) + '|' + str(variation), 10)}"
    if not images and items:
        # Fallback to garment URL so model still receives an image
        images = [items[0]["image"]]

    # Save all result images (including fallbacks)
    _ensure_dir(RESULTS_DIR)
    seen: set = set()
    for url in images:
        if url in seen:
            continue
        seen.add(url)
        short = _hash_short(url, 6)
        filename = f"{version_token}_v{variation}_{short}.jpg"
        local_path = RESULTS_DIR / filename
        try:
            await asyncio.to_thread(_save_image_any, local_path, url)
            _log_event(f"Saved try-on result to {local_path}")
        except Exception as e:
            _log_event(f"Failed saving try-on result {url}: {e}")

    _log_event(f"callFashnAPI done: renderId={rid} images={len(images)} latencyMs={latency_ms}")
    return {"renderId": rid, "images": images, "latencyMs": latency_ms}


# ------------------------------------------------------------
# .env support
# ------------------------------------------------------------
def _load_env_from_file(env_file_arg: str) -> None:
    """Load environment variables from a .env file.
    Priority: explicit --env-file > Agent/.env > project-root/.env
    Supports both python-dotenv (if installed) and a simple fallback parser.
    """
    candidates: List[Path] = []
    if env_file_arg:
        candidates.append(Path(env_file_arg).expanduser())
    candidates.append(BASE_DIR / ".env")
    candidates.append(BASE_DIR.parent / ".env")

    chosen: Optional[Path] = None
    for p in candidates:
        if p.exists() and p.is_file():
            chosen = p
            break

    if not chosen:
        return

    try:
        if HAS_DOTENV:
            load_dotenv(dotenv_path=str(chosen), override=False)
            _log_event(f"Loaded env from {chosen}")
            return
    except Exception as e:
        _log_event(f"dotenv load failed for {chosen}: {e}")

    # Fallback: simple parse KEY=VALUE
    try:
        with open(chosen, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" not in line:
                    continue
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                os.environ.setdefault(key, val)
        _log_event(f"Loaded env (fallback) from {chosen}")
    except Exception as e:
        _log_event(f"Failed to parse env file {chosen}: {e}")


async def tool_getCurrentClothes_real(config: Config, categories: Optional[List[str]]) -> Dict:
    cats = categories or ["top", "bottom", "dress"]
    wardrobe: List[Dict] = []
    for c in cats:
        for p in _all_products_by_category(config, c):
            wardrobe.append(dataclasses.asdict(p))
    return {"wardrobe": wardrobe}


async def tool_evaluate_real(theme: str, items: List[Dict], tryOnImages: List[str]) -> Dict:
    # Reuse the same heuristic
    prods = []
    for item in items:
        # Convert dict to Product-like object for color extraction if needed
        colors = _extract_colors_from_filename(Path(urlparse(item["image"]).path).name)
        prods.append(Product(id=item.get("id", ""), title=item.get("title", ""), image=item["image"], url=item["image"], category=item["category"], colors=colors))
    features = (await evaluate(theme, prods, tryOnImages))["features"]
    return {"features": dataclasses.asdict(features)}


async def run_gpt_round(theme: str, avatar_arg: str, port: int, round_duration_ms: int) -> None:
    if not HAS_OPENAI:
        raise RuntimeError("OpenAI SDK not installed. Please `pip install openai`." )

    base_url = start_static_server(port)
    config = Config(base_url=base_url, round_duration_ms=round_duration_ms)
    avatar_url = _avatar_default_url(config, avatar_arg)

    # Build messages with multimodal wardrobe gallery so GPT visually sees items
    system_msg = {"role": "system", "content": build_player_system_prompt()}
    # Convert avatar to data URI so the model can see it (avoid localhost URL issues)
    avatar_data_uri = _local_url_to_data_uri(config, avatar_url, max_dim_px=768)
    content_blocks: List[Dict] = [
        {"type": "text", "text": f'Theme: "{theme}". Categories: top|bottom|dress. Avatar attached.'},
        {"type": "image_url", "image_url": {"url": avatar_data_uri or avatar_url}},
        {"type": "text", "text": "Below is the wardrobe gallery (tops, bottoms, dresses)."},
    ]
    content_blocks.extend(build_wardrobe_image_blocks(config, ["top", "bottom", "dress"], config.wardrobe_max_per_category))
    content_blocks.append({"type": "text", "text": "Start with PLAN, then do GATHER using getCurrentClothes. When trying outfits, call callFashnAPI twice per outfit with different variations."})

    user_msg = {"role": "user", "content": content_blocks}

    tools = build_tools_for_openai()

    # OpenAI client
    client = OpenAI()

    messages: List[Dict] = [system_msg, user_msg]

    # Local dispatcher
    async def dispatch_tool_call(tc) -> Dict:
        name = tc.function.name
        args = json.loads(tc.function.arguments or "{}")
        if name == "getCurrentClothes":
            return await tool_getCurrentClothes_real(config, args.get("categories"))
        if name == "callFashnAPI":
            return await tool_callFashnAPI_real(config, args["avatarImage"], args["items"], int(args["variation"]))
        if name == "evaluate":
            return await tool_evaluate_real(args["theme"], args["items"], args["tryOnImages"])
        return {}

    # Main loop
    start_time = time.monotonic()
    while True:
        # Time guard: let the model manage timing per instructions; we can stop after 30 turns or timeout
        if time.monotonic() - start_time > (round_duration_ms / 1000.0) + 10:
            break

        # Log outbound GPT request shape (with counts for multimodal blocks)
        _log_event(
            "GPT request: "
            + _truncate(
                {
                    "model": config.openai_model,
                    "messages": [
                        {
                            "role": m.get("role"),
                            "content_summary": _summarize_content_blocks(m.get("content", []))
                            if isinstance(m.get("content"), list)
                            else _truncate(m.get("content", ""), 500),
                        }
                        for m in messages
                    ],
                    "tools_count": len(tools),
                    "tool_choice": "auto",
                },
                1200,
            )
        )

        resp = client.chat.completions.create(
            model=config.openai_model,
            messages=messages,
            tools=tools,
            tool_choice="auto",
            response_format={"type": "json_object"},
        )

        # Log truncated full response
        _log_event("GPT response meta: " + _truncate(resp.model_dump(exclude_none=True), 2000))
        msg = resp.choices[0].message
        tool_calls = msg.tool_calls or []

        if tool_calls:
            # Run all tool calls concurrently (≤6 for FASHN enforced in dispatcher)
            results = await asyncio.gather(*[dispatch_tool_call(tc) for tc in tool_calls])
            # Append assistant turn that requested tool calls
            messages.append({"role": "assistant", "tool_calls": [tc.model_dump() for tc in tool_calls], "content": msg.content or ""})
            # Append individual tool messages per call id
            for tc, res in zip(tool_calls, results):
                messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "name": tc.function.name,
                    "content": json.dumps(res),
                })
            _log_event("Tools returned: " + _truncate({tc.function.name: res for tc, res in zip(tool_calls, results)}, 2000))
            continue

        # No tool calls: model returned an envelope JSON; print and check phase
        messages.append({"role": "assistant", "content": msg.content or ""})
        try:
            env = json.loads(msg.content or "{}")
        except Exception:
            # If model didn't return JSON, just print content and continue
            print(msg.content)
            continue

        # Emit to console
        print(json.dumps(env, indent=2))

        phase = env.get("phase")
        if phase == "PICK" or phase == "DONE":
            break
        # Prevent infinite loops
        if len(messages) > 40:
            break




if __name__ == "__main__":
    main()

