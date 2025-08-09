# Dress To Impress (AI Styler) – POC v3.0

Minimal end-to-end playable POC implementing the core flow: avatar creation, shopping, try-on, and basic UI shell.

## Quick start

1) Install deps

```bash
npm i
```

2) Environment

Create `.env.local` with:

```
# Amazon RapidAPI
RAPIDAPI_KEY=YOUR_KEY
RAPIDAPI_HOST=YOUR_HOST

# OpenAI (server-side)
OPENAI_API_KEY=YOUR_OPENAI_KEY
# Optional if using a proxy
# OPENAI_BASE_URL=https://api.openai.com

# FASHN AI (server-side)
FASHN_AI_API_KEY=YOUR_FASHN_KEY

# Kling (not wired to UI yet; recommended to keep server-side later)
# KLING_ACCESS_KEY=...
# KLING_SECRET_KEY=...
```

3) Run

```bash
npm run dev
```

Open http://localhost:3000.

## What’s implemented

- Phase 0: Avatar creation
  - Webcam capture via `react-webcam`
  - Calls `POST /api/avatar` → OpenAI Images Edits (multipart) → returns 4 avatars
  - Selecting an avatar sets it as current and advances to Shopping
- Phase 1: Shopping
  - Amazon search panel calls `POST /api/amazon` → RapidAPI → results shown
  - Add items to wardrobe
  - Wardrobe modal lists items
- Phase 2: Styling
  - Try-on: Wardrobe modal calls `POST /api/tryon` (FASHN AI), gets 4 variants
  - “Use This” sets the center stage image
  - Edit with AI: `POST /api/edit` returns 4 edited variants for any URL you paste
- UI/State
  - `TopBar` with phase indicators, manual phase buttons, and auto timers (120s Shopping → 90s Styling)
  - `CenterStage` shows current image; `AIConsole` displays simple log line

## Testing notes

- Avatar route accepts data URLs from the webcam and converts to multipart upload, which is the most compatible form with OpenAI Images Edits.
- Try-on is server-side to avoid CORS; timeout ~90s.
- All sensitive keys are server-side. The client hits our Next API routes only.
- If OpenAI or FASHN rejects data URLs, consider uploading to a storage bucket and passing a signed URL.
- For production, replace `<img>` with `next/image` for performance and configure allowed domains.

## Known gaps

- No history persistence yet (Dexie is configured but unused for undo).
- No FSM-driven full phase transitions beyond Shopping→Styling timers.
- Walkout (Kling) and Judge adapters exist but are not wired to UI.
- Categorization of Amazon items is hard-coded to `top` placeholder.

## Structure

- Client adapters call our API routes:
  - `/api/avatar` → OpenAI (Images Edits)
  - `/api/edit` → OpenAI (Images Edits)
  - `/api/tryon` → FASHN AI
  - `/api/amazon` → RapidAPI Amazon
- Secrets remain server-side.

## Development tips

- If an API returns 400/401, check `.env.local` values and restart dev server.
- Network timeouts: increase `maxDuration` in API routes if using serverless with strict limits.
- Long-running: image-to-video can take minutes; our routes set `maxDuration = 600s`. Adjust per host.
- When wiring Kling/Judge, add server routes to avoid exposing secrets.
