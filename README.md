# 👗 Dress to Impress: AI Fashion Showdown

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-15.4.6-black?style=for-the-badge&logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19.1.0-61dafb?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind%20CSS-4-38bdf8?style=for-the-badge&logo=tailwindcss" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/OpenAI-API-74aa9c?style=for-the-badge&logo=openai" alt="OpenAI" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT" />
  <br/>
  <sub><b>Built at the SF OpenAI × Cerebral Valley GPT‑5 Hackathon in 24 hours.</b></sub>
  <br/>
</div>

---

## Features

### Core gameplay
- **Avatar creation**: Webcam capture → 4 AI-generated avatars (OpenAI Images Edits)
- **Theme challenges**: On-demand theme generation
- **Real-time shopping**: Amazon search via RapidAPI
- **Virtual try-on**: FASHN AI garment try-on
- **AI accessorizing**: Edit accessories/details with OpenAI
- **AI opponent**: GPT-driven agent shops/styles against you
- **Runway video**: Image-to-video with Kling AI
- **AI judge**: Multimodal outfit evaluation

### Game phases
1. **Character Select** — capture and generate avatars
2. **Theme Select** — get a theme challenge
3. **Shopping Spree (1:00)** — search and add items (max 9)
4. **Styling Round (1:30)** — mix and match try-ons
5. **Accessorize** — AI edit for final touches
6. **Evaluation** — AI judge scores both looks
7. **Results** — winner and reasoning

### Technical
- **Next.js 15 + Turbopack**, **React 19**, **TypeScript (strict)**
- **Zustand** state with persistence (IndexedDB)
- **Tailwind CSS 4** UI
- **Server-only API keys**; robust retries/timeouts
- **Sharp** image optimization

## Quick start

### Prerequisites
- Node.js 18.17+
- npm
- API keys (see Configuration)

### Install & run

```bash
# Clone
git clone <repo-url>
cd open-ai-dress2impress

# Install
npm install

# Configure env vars (create .env.local)
printf "OPENAI_API_KEY=\nFASHN_AI_API_KEY=\nRAPIDAPI_KEY=\nRAPIDAPI_HOST=real-time-amazon-data.p.rapidapi.com\n# Optional overrides\n# OPENAI_BASE_URL=https://api.openai.com\n# KLING_ACCESS_KEY=\n# KLING_SECRET_KEY=\n" > .env.local

# Dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Configuration

Required environment variables (`.env.local`):

```env
# OpenAI (avatars, edits, judge, themes, stylist)
OPENAI_API_KEY=your_openai_api_key
# Optional proxy base
# OPENAI_BASE_URL=https://api.openai.com

# Amazon via RapidAPI (shopping)
RAPIDAPI_KEY=your_rapidapi_key
RAPIDAPI_HOST=real-time-amazon-data.p.rapidapi.com

# FASHN AI (virtual try-on)
FASHN_AI_API_KEY=your_fashn_api_key

# Kling AI (runway video, optional)
# KLING_ACCESS_KEY=your_kling_access_key
# KLING_SECRET_KEY=your_kling_secret_key
```

Service setup:
- RapidAPI: subscribe to Real-Time Amazon Data
- OpenAI: Images API + chat completions
- FASHN AI: API access
- Kling AI: API access (optional)

## API routes

- **POST `/api/avatar`** → `{ imageDataUrl }` → `{ images: string[] }` (4 variants)
- **POST `/api/amazon`** → `AmazonSearchRequest` (supports `query` or `categoryId`) → `{ products: [...] }`
- **POST `/api/tryon`** → `{ characterImageUrl, clothingImageUrl }` → `{ images: string[] }`
- **POST `/api/edit`** → `{ baseImageUrl, instruction }` → `{ images: string[] }`
- **POST `/api/ai-style/instruction`** → `{ theme, baseImageUrl }` → `{ instruction: string }`
- **POST `/api/theme`** → `{ context? }` → `{ themes: string[] }`
- **POST `/api/evaluate`** → `{ playerImageUrl, aiImageUrl, theme }` → scores, winner, reasoning
- **POST `/api/video`** → `{ imageUrl }` → `{ url }` (requires Kling credentials)
- **POST `/api/ai-player/run`** → NDJSON stream; accepts `{ theme?, avatarUrl?, durationMs? }`
- **GET `/api/debug/env`** (dev only) → presence flags for env vars

Notes:
- Shopping is 1:00; Styling is 1:30. If the wardrobe hits capacity (9), Shopping may clamp to a shorter remaining timer.
- Wardrobe capacity: **9 items**.

## Development

```bash
# Dev with hot reload
npm run dev

# Lint
npm run lint

# Build & start (production)
npm run build && npm start
```

Debugging:
- Press `D` to toggle the debug panel
- Live AI player logs
- Manual phase controls

## Deployment

Vercel recommended:

```bash
npm i -g vercel
vercel
```

Set env vars from `.env.local`. `NODE_ENV=production` is implied on Vercel builds.

Performance
- Configure image domains in `next.config.ts`
- API route `maxDuration` up to 600s where used
- CDN for static assets

## License

MIT — see `LICENSE`.

## Acknowledgments

- OpenAI (avatars, edits, judging, stylist)
- FASHN AI (try-on)
- Amazon via RapidAPI (catalog)
- Kling AI (video)

<div align="center">
  <sub>Built by the Dress to Impress team</sub>
</div>