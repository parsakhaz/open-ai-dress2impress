SYSTEM PROMPT — AI Player (paste as your system message)
You are the AI Player in a timed fashion game called “Dress To Impress.”
You play against a human. You have tools and must use them strategically and in parallel to produce one final outfit that looks great on the avatar.

Game constraints
Categories: top, bottom, dress (no shoes/accessories for this MVP).

No budget requirement.

Round time: 2 minutes. If < 20 seconds remain, immediately pick the best available result.

Avatar: You will receive the avatar as an inline image in the user message.

Goal: Output one final outfit: either [top + bottom] or [dress]. Colors should be cohesive and flattering; proportions should suit the avatar.

Tools you can call
searchAmazon(query, category, filters) → fetch product candidates (RapidAPI-backed on the server).

getCurrentClothes(categories) → read preloaded local wardrobe (already hosted as URLs).

callFashnAPI(avatarImage, items[], variation) → virtual try‑on; server allows 6 concurrent calls.

evaluate(theme, items[], tryOnImages[]) → quick non‑LLM heuristics (palette hints, notes).

Tool calling rules
When you need multiple independent datapoints, issue multiple tool calls in the same turn (parallel).
Examples:

In GATHER, call searchAmazon for top, bottom, and dress together, plus getCurrentClothes.

In TRYON, for each outfit candidate, call callFashnAPI twice with different variation values (e.g., 11 and 77) in one turn so the server runs them concurrently (max 6).

If any tool is slow or fails, continue with partial results and say what’s missing in ui.log.

Phased process (you must follow this)
PLAN
Emit a plan JSON that includes:

paletteIntent (e.g., ["navy","white","tan"])

queries for all three categories (top, bottom, dress), each with a short search string and a limit (e.g., 8).
After emitting PLAN, immediately proceed to GATHER by issuing the parallel searchAmazon + getCurrentClothes tool calls in the same turn.

GATHER
Use the returned results to shortlist candidates for up to two outfits.
Emit which outfits you will try (e.g., O1: top+bottom, O2: dress).
Then in the same turn, request callFashnAPI for each outfit twice with different variation values (e.g., 11 and 77) so you get slight render differences.

TRYON
After try‑on images are returned, call evaluate once per outfit (pass the resulting try‑on image URLs). Then visually compare the try‑on images and decide whether to iterate once more (if time allows) or proceed to PICK.

PICK
Output the final selection with one best try‑on image and a short reason. If time is running low (< 20s), pick now.

Output contract (every non‑tool reply)
Always return a single JSON object:

json
Copy
Edit
{
  "phase": "PLAN | GATHER | TRYON | PICK | DONE",
  "ui": { "log": ["short, human-readable steps for the UI"] },
  "phase_result": { /* phase-specific JSON as described below */ }
}
Phase payloads
PLAN → phase_result

json
Copy
Edit
{
  "paletteIntent": ["string", "..."],
  "queries": [
    { "category": "top", "query": "linen shirt navy summer", "limit": 8 },
    { "category": "bottom", "query": "beige chinos slim summer", "limit": 8 },
    { "category": "dress", "query": "white midi sundress summer", "limit": 8 }
  ]
}
GATHER → phase_result (what you will try on)

json
Copy
Edit
{
  "outfits": [
    { "id": "O1", "items": [ {"id": "top-3"}, {"id": "bottom-1"} ] },
    { "id": "O2", "items": [ {"id": "dress-2"} ] }
  ],
  "variations": [11, 77]
}
Then, in the same turn, call callFashnAPI for each outfit × variation.

TRYON → phase_result (ranking + next action)

json
Copy
Edit
{
  "candidates": [
    { "id": "O1", "images": ["url1","url2"], "notes": "why it works/doesn't" },
    { "id": "O2", "images": ["url3","url4"], "notes": "..." }
  ],
  "next_step": "iterate | pick"
}
PICK → phase_result

json
Copy
Edit
{
  "final_outfit": {
    "items": [
      { "id": "top-3", "title": "Navy Linen Shirt", "category": "top", "image": "url" },
      { "id": "bottom-1", "title": "Beige Chinos", "category": "bottom", "image": "url" }
    ],
    "tryOnImage": "url-of-the-best-render",
    "reason": "Cohesive cool palette; proportionally flattering; light summer texture."
  }
}
Image handling expectations
All images (avatar, products, try‑ons) will be provided as absolute HTTP(S) URLs.

The avatar arrives inline in the user message using { "type": "image_url", "image_url": { "url": "…" } }.

When you ask to compare or pick among renders, refer to the images by URL and describe what you see.

TOOL DEFINITIONS (register these with the Python client)
Use these exact names and parameter shapes so your messages and tool calls stay consistent.

jsonc
Copy
Edit
// searchAmazon
{
  "type": "function",
  "function": {
    "name": "searchAmazon",
    "description": "Fetch product candidates for a category using RapidAPI-backed search.",
    "parameters": {
      "type": "object",
      "properties": {
        "query": { "type": "string" },
        "category": { "type": "string", "enum": ["top", "bottom", "dress"] },
        "filters": {
          "type": "object",
          "properties": {
            "gender": { "type": "string", "enum": ["men", "women", "unisex", "auto"] },
            "colorPalette": { "type": "array", "items": { "type": "string" } },
            "limit": { "type": "number" }
          }
        }
      },
      "required": ["query", "category"]
    }
  }
}

// getCurrentClothes
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
          "items": { "type": "string", "enum": ["top", "bottom", "dress"] }
        }
      }
    }
  }
}

// callFashnAPI
{
  "type": "function",
  "function": {
    "name": "callFashnAPI",
    "description": "Virtual try-on for one avatar and 1–2 garments (either [top+bottom] or [dress]). Server runs ≤6 concurrently.",
    "parameters": {
      "type": "object",
      "properties": {
        "avatarImage": { "type": "string" },
        "items": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "image": { "type": "string" },
              "category": { "type": "string", "enum": ["top", "bottom", "dress"] }
            },
            "required": ["id", "image", "category"]
          },
          "minItems": 1,
          "maxItems": 2
        },
        "variation": { "type": "number" }
      },
      "required": ["avatarImage", "items", "variation"]
    }
  }
}

// evaluate
{
  "type": "function",
  "function": {
    "name": "evaluate",
    "description": "Quick non-LLM heuristics for palette/notes. No budget.",
    "parameters": {
      "type": "object",
      "properties": {
        "theme": { "type": "string" },
        "items": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "title": { "type": "string" },
              "category": { "type": "string", "enum": ["top", "bottom", "dress"] },
              "image": { "type": "string" }
            },
            "required": ["id", "category", "image"]
          }
        },
        "tryOnImages": { "type": "array", "items": { "type": "string" } }
      },
      "required": ["theme", "items", "tryOnImages"]
    }
  }
}
USER MESSAGE TEMPLATES (Python—send as content arrays)
Start of round (attach avatar image)
python
Copy
Edit
start_message = {
  "role": "user",
  "content": [
    {"type": "text", "text": f'Theme: "{THEME}". Categories: top|bottom|dress. Avatar attached.'},
    {"type": "image_url", "image_url": {"url": AVATAR_IMAGE_URL}},
    {"type": "text", "text": "Start with PLAN, then do GATHER in parallel (search top, bottom, dress + getCurrentClothes)."}
  ]
}
After try‑ons complete (feed images back)
python
Copy
Edit
tryon_feedback = {
  "role": "user",
  "content": [
    {"type": "text", "text": "Here are your try-on results."},
    {"type": "text", "text": "O1:"},
    {"type": "image_url", "image_url": {"url": o1_seed11}},
    {"type": "image_url", "image_url": {"url": o1_seed77}},
    {"type": "text", "text": "O2:"},
    {"type": "image_url", "image_url": {"url": o2_seed11}},
    {"type": "image_url", "image_url": {"url": o2_seed77}}
  ]
}
“Docs” cheat‑sheet for Python Chat Completions with tools & images
Inline images: send as content=[{"type":"text",...},{"type":"image_url","image_url":{"url":"https://..."}}].

Tools: register a list of function definitions under tools=[...]. Use tool_choice="auto" so the model decides which to call (and can call multiple in a single turn).

Parallel tool calls: when a response contains message.tool_calls, execute all of them concurrently on your server (e.g., with asyncio.gather) and feed a single “tool” message back that includes each call’s result.

Structured output: request response_format={"type": "json_object"} so the model returns your envelope schema every non‑tool turn.

Minimal Python call (skeleton):

python
Copy
Edit
from openai import OpenAI
client = OpenAI()

resp = client.chat.completions.create(
    model="gpt-5",                           # your image+tools model
    messages=[system_msg, start_message],    # include inline image here
    tools=TOOLS,                             # the JSON tool definitions above
    tool_choice="auto",
    response_format={"type": "json_object"}  # enforce JSON envelope
)
When you receive tool calls:

python
Copy
Edit
if msg.tool_calls:
    # Run all tool calls concurrently, gather results
    results = await asyncio.gather(*[dispatch_tool(tc) for tc in msg.tool_calls])
    messages.append(msg)  # assistant with tool calls
    messages.append({
        "role": "tool",
        "tool_call_id": "batch",
        "content": json.dumps({"results": results})
    })




context + psuedo code: 

got it—thanks for the specifics. here’s an updated, in‑depth pseudocode spec (one “file” worth) that you can paste into ChatGPT or hand to your devs. it’s tailored to:

no budget

only top | bottom | dress (no shoes/accessories for now)

2‑minute rounds

FASHN: 6 concurrent (≈50/min)

RapidAPI Amazon search as the primary provider

images stored locally (served as URLs)

skip video judging for now

i’ll show exactly how images flow, how the tools should be called in parallel, and what each function does. i also explain seeds and give you defaults.

One‑file pseudocode spec (AI player + minimal judge)
pseudo
Copy
Edit
// ========================================================
// RUNWAY RIVALS — AI Player MVP (pseudocode)
// ========================================================
// Goal: ChatGPT (GPT‑5) plays a 2‑minute round of “Dress To Impress”
// by planning, searching, trying on, and picking a final outfit.
// Categories: "top", "bottom", "dress" (no budget, no accessories).
// Tools: searchAmazon, getCurrentClothes, callFashnAPI, evaluate.
// Parallelism: search (3 calls at once), try‑on (≤6 at once).
// Images: always pass HTTPS/HTTP URLs to the model; never file paths.
// ========================================================


// ---------- 0) Image handling (IMPORTANT) ----------
// You said images are stored locally in a folder. The model needs URLs.
// Serve the folder at a static route so every image has a reachable URL:
//   - In Next.js: place files in `/public/uploads/...`
//     → URL: http://localhost:3000/uploads/<filename>.jpg
//   - Or use a tiny static server that exposes /uploads/*
// DO NOT pass "file://..." or local absolute paths to the model.

// avatarImageURL = "http://localhost:3000/uploads/avatar_123.jpg"
// wardrobe item images and try-on outputs must also be URLs.


// ---------- 1) Data contracts ----------

type Category = "top" | "bottom" | "dress"

type Product = {
  id: string
  title: string
  image: url                // absolute http(s) URL
  url: url                  // product page (for display)
  price?: number            // optional (not used for rules now)
  category: Category
  colors?: string[]
  brand?: string
  provider?: "rapidapi" | "mock"
}

type TryOnItem = { id: string, image: url, category: Category }

type FashnResult = {
  renderId: string
  images: url[]            // one or more try-on image URLs
  latencyMs: number
}

type EvaluateFeatures = {
  paletteHint: "cohesive" | "mixed" | "busy"
  notes: string
}


// ---------- 2) Tools (model-visible) ----------
// All tools must accept/return JSON with the exact shapes below.
// The orchestrator will run tool calls in parallel and return results
// in a single "tool" message.

// T1: searchAmazon — RapidAPI adapter (primary)
tool searchAmazon(args: {
  query: string
  category: Category
  filters?: {
    gender?: "men" | "women" | "unisex" | "auto"
    colorPalette?: string[]
    limit?: number           // default 12
  }
}): { items: Product[] }

// T2: getCurrentClothes — read local/preloaded wardrobe dir
tool getCurrentClothes(args: {
  categories?: Category[]    // default all three
}): { wardrobe: Product[] }

// T3: callFashnAPI — virtual try-on
tool callFashnAPI(args: {
  avatarImage: url
  items: TryOnItem[]         // either [dress] OR [top, bottom]
  variation?: number         // like "seed"; if unknown, just use 1..N
}): FashnResult

// T4: evaluate — simple non-LLM heuristics (no budget)
tool evaluate(args: {
  theme: string
  items: Product[]
  tryOnImages: url[]
}): { features: EvaluateFeatures }


// ---------- 3) “Seed” / variation explanation ----------
// Some image systems accept a "seed" to create small visual differences.
// If your FASHN endpoint doesn’t support seeds, simulate by passing a
// "variation" param and let your backend tweak any randomness or simply
// call the same render twice. The goal is to get 2 slightly different
// outputs and let the model pick the better one.


// ---------- 4) Player System Prompt (for the model) ----------

SYSTEM (Player):
"You are the AI Player in a timed fashion game. You have tools:
- searchAmazon (RapidAPI-backed),
- getCurrentClothes (local wardrobe),
- callFashnAPI (virtual try-on),
- evaluate (simple heuristics).
Goal: produce ONE final outfit using categories {top, bottom} OR {dress}.
No budget. Colors should be cohesive and flattering; proportions should suit the avatar.
Round length: 2 minutes. If <20s remain, immediately pick the best available result.

Process:
1) PLAN → emit {paletteIntent, queries[]} where queries cover top/bottom/dress (3 total).
2) GATHER → in a single step, call searchAmazon for each category in PARALLEL (+ getCurrentClothes).
3) TRYON → build up to 2 outfit candidates; for EACH candidate, call callFashnAPI twice with different variation values (e.g., 11 and 77) in the SAME step (parallel). Use either [top+bottom] or [dress].
4) PICK → call evaluate once per outfit; then VISUALLY compare try-on images and output final_outfit.

Rules:
- If any tool fails, continue with partial results.
- Prefer ≤3 colors; avoid clashing palettes.
- Always respond as JSON envelope: { phase, ui:{log:[]}, phase_result }.
- When multiple datapoints are needed, issue multiple tool calls in ONE step (parallel)."


// ---------- 5) Judge System Prompt (minimal, for later) ----------

SYSTEM (Judge):
"You are the Judge. Compare two try-on images for the theme.
No numeric scoring needed yet. Output JSON:
{ winner: 'human'|'ai', verdict: string (<=50 words) }"


// ---------- 6) Orchestrator (single file loop) ----------

function playRound(theme: string, avatarImageURL: url, roundDurationMs: 120000):
  roundEndsAt = now() + roundDurationMs

  messages = [
    system(Player),
    user([
      {type:"text", text:`Theme: "${theme}". Categories: top|bottom|dress. Avatar attached.`},
      {type:"image_url", image_url:{url: avatarImageURL}},
      {type:"text", text:"Start with PLAN, then do GATHER in parallel."}
    ])
  ]

  tools = [searchAmazon, getCurrentClothes, callFashnAPI, evaluate]

  // caches for resolving product ids between turns
  cache = {
    search: { top: Product[], bottom: Product[], dress: Product[] },
    wardrobe: Product[],
    tryons: Map<outfitId, {variation:number, images:url[]}>
  }

  while now() < roundEndsAt:
    // ask the model
    resp = openai.chat.create({ model, messages, tools, tool_choice:"auto", response_format:"json_object" })

    if resp.message.tool_calls exists:
      // --- run all tools IN PARALLEL (respect limits) ---
      grouped = groupByName(resp.message.tool_calls)

      // SEARCH parallel (no throttle needed)
      results_search = runAll(grouped.searchAmazon, timeoutMs=8000)

      // WARDROBE (fast, local)
      result_wardrobe = runAll(grouped.getCurrentClothes, timeoutMs=3000)

      // TRY‑ON parallel with CONCURRENCY LIMIT 6 (FASHN)
      results_fashn = runParallel(grouped.callFashnAPI, limit=6, timeoutMs=15000)

      // EVALUATE (local, instant)
      results_eval = runAll(grouped.evaluate, timeoutMs=2000)

      // update local caches from results
      cache.search.top    = mergeIfPresent(cache.search.top,    fromTool(results_search, category="top"))
      cache.search.bottom = mergeIfPresent(cache.search.bottom, fromTool(results_search, category="bottom"))
      cache.search.dress  = mergeIfPresent(cache.search.dress,  fromTool(results_search, category="dress"))
      cache.wardrobe      = mergeIfPresent(cache.wardrobe,      fromTool(result_wardrobe))

      for each fashn in results_fashn:
        // stash render images by (outfitId, variation) if you encoded them in args
        cache.tryons[outfitIdFromArgs(fashn.callArgs)].push(fashn.result.images)

      // feed aggregated tool results back in a SINGLE tool message
      messages.push(resp.message)             // assistant turn with tool calls
      messages.push(tool({ results:[...all tool results with their call ids...] }))
      continue

    // --- no tool calls: assistant returned an envelope ---
    env = parseJSON(resp.message.content)
    logToUI(env.ui.log)

    if env.phase == "PICK":
      finalAI = env.phase_result   // { items[], tryOnImage, reason }
      break

    messages.push(resp.message)

    // guard: stop if too many turns
    if messages.length > 30: break

  // DONE: you have AI's final outfit (image + items)
  return finalAI


// ---------- 7) What each phase returns ----------

// PLAN (assistant → us)
phase_result: {
  paletteIntent: string[]              // e.g., ["navy","white","tan"]
  queries: [
    { category:"top",    query:"linen shirt navy summer men",   limit:8 },
    { category:"bottom", query:"beige chinos slim summer men",  limit:8 },
    { category:"dress",  query:"sundress midi white summer",    limit:8 }
  ]
}
// We immediately execute: searchAmazon(top), searchAmazon(bottom), searchAmazon(dress), getCurrentClothes(all)
// (IN ONE STEP, PARALLEL)

// TRYON plan (assistant → us)
phase_result: {
  outfits: [
    // choose either [top+bottom] OR [dress]
    { id:"O1", items:[{id:"top-3"}, {id:"bottom-1"}] },
    { id:"O2", items:[{id:"dress-2"}] }
  ],
  variations: [11, 77]    // seeds/variation values
}
// We resolve the ids → full Products using cache.search + cache.wardrobe,
// then issue callFashnAPI for EACH outfit × EACH variation (parallel, limit 6).

// PICK (assistant → us)
phase_result: {
  final_outfit: {
    items: [ ProductMinimal... ],
    tryOnImage: url,
    reason: "Cohesive palette; proportionally flattering on avatar; clean lines."
  }
}
// You show this in the UI; (optional) kick off video gen later.


// ---------- 8) Tool implementations (server-side pseudo) ----------

function tool_searchAmazon(args):
  // PRIMARY: RapidAPI (you already have)
  // Normalize to Product[]
  // If empty, relax query slightly (append category term, broaden gender)
  // Limit default 12
  return { items: normalizedProducts }

function tool_getCurrentClothes(args):
  // Read from preloaded directory listing (mapped to URLs under /uploads)
  // Filter by categories if provided
  return { wardrobe: items }

function tool_callFashnAPI(args):
  // args.avatarImage: url
  // args.items: [{id,image,category}]  // ensure images are URLs
  // args.variation: number (treat as seed if your API supports it; otherwise ignore)
  // Call FASHN. Respect concurrency=6 in dispatcher. Timeout ~15s.
  // Return { renderId, images:[url], latencyMs }
  return fashnResult

function tool_evaluate(args):
  // Simple heuristics, no budget:
  // - paletteHint: if total unique colors across items <= 2 → "cohesive"; <=4 → "mixed"; else "busy"
  // - notes: include # of try-on images and any category completeness hints.
  return { features: { paletteHint, notes } }


// ---------- 9) Time / fallback rules ----------

function timeLeft(roundEndsAt): ms

rule: if timeLeft < 20000 ms at any point:
  - stop launching new try-ons
  - pick best available with current images
  - emit PICK

search fallback:
  - if search returns < 3 items for a category, run a second call with a relaxed query (add the category word, remove a color)

fashn fallback:
  - retry a failed call once with a different variation
  - if still failing and the outfit is [top+bottom], ask model (via log) to try a [dress] path (single item is faster)


// ---------- 10) Minimal judge (for later; optional now) ----------

function judge(theme, humanFinal, aiFinal):
  messages = [
    system(Judge),
    user([
      {type:"text", text:`Theme: ${theme}. Compare HUMAN vs AI visually.`},
      {type:"text", text:"HUMAN:"},
      {type:"image_url", image_url:{url: humanFinal.tryOnImage}},
      {type:"text", text:"AI:"},
      {type:"image_url", image_url:{url: aiFinal.tryOnImage}}
    ])
  ]
  resp = openai.chat.create({ model, messages, response_format:"json_object" })
  return parseJSON(resp.message.content) // { winner, verdict }


// ---------- 11) UI hooks (right-rail “thinking” log) ----------
onEnvelope(env):
  append env.ui.log[] to the "Under the Hood" panel
  show tool timings (dispatcher records start/finish per call)
Updated prompts (drop‑in)
Player mode — system
You are the AI Player in a timed fashion game. Tools: searchAmazon, getCurrentClothes, callFashnAPI, evaluate.
Categories: top, bottom, dress. No budget.
Process:

PLAN → emit {paletteIntent, queries[3]} (top/bottom/dress).

GATHER → in a single step, call searchAmazon for each category in parallel (+ getCurrentClothes).

TRYON → propose up to 2 outfit candidates; for each, call callFashnAPI twice with different variation values in the same step (parallel; server limits to 6).

PICK → call evaluate once per outfit; then visually compare the try‑on images and output final_outfit { items[], tryOnImage, reason }.
Rules: Prefer ≤3 colors; continue with partial results if any tool is slow; if <20s remain, stop trying new things and pick the best available.
Always return JSON { phase, ui:{log:[]}, phase_result }.

First user turn
Theme: {{theme}}. Avatar attached. Start with PLAN, then do GATHER in parallel.
(Attach {type:"image_url", url: avatarImageURL})

Notes tailored to your answers
No budget: I removed budget logic everywhere (including evaluate).

Categories: only top | bottom | dress.

FASHN concurrency: dispatcher caps at 6 in parallel, retry once if needed, and we’ll keep total calls under the 50/min ceiling.

RapidAPI: set as default provider in searchAmazon.

Seeds/variation: if your try‑on API doesn’t support a seed, just accept variation and ignore it; still make 2 calls so GPT can pick the nicer render.

Local images: must be served via /uploads/* URLs (Next.js public/ is perfect). File paths won’t work for the model.

2‑minute rounds: hardcoded; model told to stop iteration if <20s remain.

Judging: we’ll add later; for now, AI just picks its own best outfit.

if you want, i can translate this pseudocode into a single TypeScript file using your RapidAPI and FASHN stubs (with a tiny static server for /uploads) so you can run a local, end‑to‑end demo today.




REMEMEBR THIS NEEDS TO BE IN PYTHON. 