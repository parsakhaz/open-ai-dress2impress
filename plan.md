### Refactor Architecture Plan — Dress To Impress (Target: 100% type safety, ≥40% redundancy reduction)

This plan identifies duplicate patterns, proposes shared utility modules, and defines a phased refactor to improve maintainability, type safety, and consistency across server and client. It references current files and outlines concrete edits.

### Objectives
- Ensure 100% TypeScript type safety (no `any`, strict server/client boundaries, typed APIs).
- Reduce duplication by ≥40% via shared modules for validation, HTTP calls, environment checks, logging, retry, and polling.
- Establish consistent patterns for server routes, adapters, and UI components.

### Key Observations (current code)
- API routes repeat similar patterns: request parse, env checks, fetch calls, 4-parallel calls, error handling.
  - Files: `src/app/api/avatar/route.ts`, `src/app/api/edit/route.ts`, `src/app/api/tryon/route.ts`, `src/app/api/amazon/route.ts`, `src/app/api/video/route.ts`
- Adapters repeat similar client fetch logic and result mapping.
  - Files: `src/lib/adapters/*`
- Utilities already exist but are underused/duplicated:
  - `src/lib/util/errorHandling.ts` provides rich helpers (retry, categorization, env validation) not used in routes.
  - `src/lib/util/logger.ts` has env validation and logging; routes use `console.*` directly.
- Validation is ad-hoc across routes; request bodies are minimally validated.
- Types exist (`src/types/index.d.ts`) but API contracts are not shared between server and client.

### Duplicate Patterns to Consolidate
- Request parsing and validation in API routes (JSON shape checks are repeated or minimal).
- Environment variable checks across routes (`OPENAI_API_KEY`, `FASHN_AI_API_KEY`, `RAPIDAPI_*`, Kling keys).
- Fetch boilerplate: building headers, handling `res.ok`, extracting JSON, mapping to typed outputs.
- Parallel variant generation (4 calls) and polling loops (FASHN/Kling) with timeouts.
- Error handling/logging: mixed `console.*` vs `logger` vs plain `Response('...', {status})`.

### Proposed Shared Modules (new/expanded)

1) `src/lib/util/env.ts`
- Purpose: Centralize env access and validation; return typed config objects.
- Exports:
  - `getServerEnv()` returns: `{ OPENAI_API_KEY, OPENAI_BASE_URL, FASHN_AI_API_KEY, RAPIDAPI_KEY, RAPIDAPI_HOST, KLING_ACCESS_KEY?, KLING_SECRET_KEY? }` with exhaustive validation using `ErrorHandler.validateEnvironmentVariable` and throw on missing.
  - `getOptionalServerEnv()` for optional keys.
  - `assertEnv(keys: string[]): void` to preflight routes.
- Replace ad-hoc `process.env.*` usages in routes and adapters.

2) `src/lib/util/http.ts`
- Purpose: Typed HTTP helpers with consistent error mapping and logging.
- Exports:
  - `typedFetch<T>(url: string, init?: RequestInit, options?: { apiName?: string; asTextOnError?: boolean }): Promise<T>`
  - `postJson<TReq, TRes>(url: string, body: TReq, init?: RequestInit, options?: { apiName?: string }): Promise<TRes>`
  - `withTimeout<T>(p: Promise<T>, ms: number): Promise<T>`
  - These use `logger.api`, map failures via `createAPIError`, and throw rich `DTIError`.

3) `src/lib/util/validation.ts`
- Purpose: Reusable runtime validation for API request bodies and query params.
- Strategy: Lightweight hand-rolled guards or `zod` if allowed later. For now, guards.
- Exports examples:
  - `assertString(name: string, v: unknown): asserts v is string`
  - `assertUrl(name: string, v: unknown): asserts v is string`
  - Schemas: `AvatarRequest`, `EditRequest`, `TryOnRequest`, `AmazonSearchRequest`, `VideoRequest` shared across route and adapter.

4) `src/lib/util/promise.ts`
- Purpose: Concurrency utilities.
- Exports:
  - `parallel<T>(n: number, fn: () => Promise<T>): Promise<T[]>` for repeated calls (e.g., 4 variants).
  - `sleep(ms: number): Promise<void>`
  - `poll<T>({ fn, isDone, intervalMs, timeoutMs }): Promise<T>` for FASHN/Kling.
  - `withRetry` re-export from `errorHandling` to encourage consistent use.

5) `src/lib/util/apiRoute.ts`
- Purpose: Standard wrapper for Next.js route handlers.
- Exports:
  - `createHandler<TReq, TRes>(opts: { parse: (req: NextRequest) => Promise<TReq>; handle: (reqBody: TReq, ctx: { env: Env }) => Promise<TRes>; }): (req: NextRequest) => Promise<Response>`
- Responsibilities:
  - Parse + validate body via `validation.ts`.
  - Preflight env via `env.ts`.
  - Catch errors, convert `DTIError` into JSON with `statusCode` if present and log via `logger`.

6) `src/lib/api/types.ts`
- Purpose: Shared API contracts between server routes and client adapters.
- Define request/response types for `/api/avatar`, `/api/edit`, `/api/tryon`, `/api/amazon`, `/api/video`.
- Example:
  - `export interface AvatarRequest { imageDataUrl: string }`
  - `export interface AvatarResponse { images: string[] }`

7) Expand `src/lib/util/errorHandling.ts`
- Already strong; enforce usage across routes/adapters and re-export `withRetry`, `create*Error`.

### Route Refactors (server)
- Unify to `createHandler` pattern with `env`, `validation`, `http`, `promise`, and `errorHandling`.

- `src/app/api/avatar/route.ts`
  - Replace inline `inputToBlob`, prompt variants, and `fetch` with:
    - `validation.assertString('imageDataUrl', body.imageDataUrl)`
    - Transform URL→Blob via shared `http` helper `fetchBlob(url | dataUrl)` (add to `http.ts`).
    - Use `parallel(4, () => openAI.editImage({ blob, prompt: variantPrompt }))` via a new local OpenAI service wrapper or function inside the route using `typedFetch`.
    - Wrap with `withRetry` for transient failures.
    - Remove all `console.*` in favor of `logger`.

- `src/app/api/edit/route.ts`
  - Share the same `inputToBlob`/`fetchBlob` and `parallel(4, ...)` pattern.
  - Commonize OpenAI call code with avatar route in a small module `src/lib/server/openai.ts` exposing `editImage`.

- `src/app/api/tryon/route.ts`
  - Use `poll` from `promise.ts` for status checks.
  - Use `parallel(4, () => runSingleTryOn(...))` and `withRetry` for start/poll steps.
  - Map all errors via `createAPIError('FASHN', ...)`.

- `src/app/api/amazon/route.ts`
  - Use `postJson/getJson` from `http.ts` to call RapidAPI.
  - Validate `query` strictly (min length, etc.).

- `src/app/api/video/route.ts`
  - Use `poll` util and `withRetry` similarly to try-on.
  - Move `generateKlingToken` into a shared `src/lib/server/kling.ts` and expose `createTask`/`getStatus` functions.

Expected redundancy reduction: 40–60% across routes by removing duplicate parse, env, timeout, polling, and fetch logic.

### Adapter Refactors (client)
- Replace raw `fetch('/api/...')` calls with a tiny typed client using `src/lib/api/types.ts`.
- Create `src/lib/api/client.ts`:
  - `apiPost<TReq, TRes>(path: string, body: TReq): Promise<TRes>`
  - Internally standardize headers, error mapping to user-facing errors.
- Update:
  - `src/lib/adapters/amazon.ts` → use `apiPost<AmazonSearchRequest, AmazonSearchResponse>`
  - `src/lib/adapters/avatar.ts` → `apiPost<AvatarRequest, AvatarResponse>`
  - `src/lib/adapters/edit.ts` → `apiPost<EditRequest, EditResponse>`
  - `src/lib/adapters/fashn.ts` → `apiPost<TryOnRequest, TryOnResponse>`
  - `src/lib/adapters/video.ts` → `apiPost<VideoRequest, VideoResponse>`

### Type Safety Strategy
- Enable full strictness already present in `tsconfig.json` and flip Next config to fail builds:
  - In `next.config.ts`, set `typescript.ignoreBuildErrors = false` and `eslint.ignoreDuringBuilds = false` once the refactor lands.
- Replace all `unknown` to typed in catch blocks by converting thrown errors into `DTIError` and returning typed error responses.
- Add exhaustive types in `src/lib/api/types.ts` for all payloads and responses; update components to use these types end-to-end.

### Logging & Error Handling Alignment
- Replace all `console.*` in routes and adapters with `logger.*` calls.
- Wrap external calls with `withRetry` where safe (idempotent): OpenAI edits, FASHN status queries, Kling status.
- Always convert thrown errors to `DTIError` and return JSON `{ error: string, code?: string }` with proper status.

### Validation Coverage
- Request guards via `validation.ts` for every route:
  - Avatar: `imageDataUrl: non-empty string`
  - Edit: `baseImageUrl: url | dataUrl`, `instruction: non-empty string`
  - TryOn: `characterImageUrl: url`, `clothingImageUrl: url`
  - Amazon: `query: min length 2`
  - Video: `imageUrl: url`
- Add environment preflight on server boot path: call `ErrorHandler.checkAllEnvironmentVariables` in one server-entry point or lazily per route on first hit.

### File-Level Changes (edits)
- Add new files:
  - `src/lib/util/env.ts`
  - `src/lib/util/http.ts`
  - `src/lib/util/validation.ts`
  - `src/lib/util/promise.ts`
  - `src/lib/util/apiRoute.ts`
  - `src/lib/api/types.ts`
  - `src/lib/api/client.ts`
  - `src/lib/server/openai.ts`
  - `src/lib/server/kling.ts`

- Update existing routes to use `createHandler` and shared modules:
  - `src/app/api/avatar/route.ts`
  - `src/app/api/edit/route.ts`
  - `src/app/api/tryon/route.ts`
  - `src/app/api/amazon/route.ts`
  - `src/app/api/video/route.ts`

- Update adapters to use typed `api/client.ts`.

- Replace route console logging with `logger` and `ErrorHandler`.

### Phased Execution Plan

Phase 1 — Foundations (shared modules)
- Add `env.ts`, `http.ts`, `validation.ts`, `promise.ts`, `api/types.ts`, `api/client.ts`.
- No behavior changes; add unit tests for guards and typedFetch.

Phase 2 — Server Routes migration
- Migrate `amazon`, `avatar`, `edit` routes to `createHandler` with `http`, `env`, `validation`.
- Introduce `server/openai.ts` (`editImage` function).

Phase 3 — Polling services
- Migrate `tryon` to use `poll`, `withRetry`.
- Introduce `server/kling.ts`; migrate `video` route accordingly.

Phase 4 — Client adapters
- Switch adapters to `api/client.ts` with shared `api/types.ts`.
- Remove duplicate mapping/headers logic.

Phase 5 — Type safety hardening
- Flip `next.config.ts`: set `ignoreBuildErrors: false`, `ignoreDuringBuilds: false`.
- Fix any remaining type gaps; remove `@ts-ignore` where feasible.

Phase 6 — Cleanup & Docs
- Remove now-redundant helpers inside routes (local `sleep`, `inputToBlob`, etc.) superseded by shared modules.
- Update `README.md` to reference new modules and error/reporting behavior.

### Estimated Redundancy Reduction
- Route-level duplication (validation/env/fetch/polling): ~50–65% reduction.
- Adapter-level boilerplate: ~40–50% reduction.
- Net code size may remain similar due to added shared modules, but per-feature LOC shrinks and cohesion increases.

### Risks & Mitigations
- Risk: Behavior change during refactor.
  - Mitigation: Phase-by-phase migration with parity tests and manual checks on each route.
- Risk: Over-abstracting.
  - Mitigation: Keep shared modules small, cohesive, and focused; avoid framework-y complexity.

### Follow-up Enhancements (optional)
- Consider `zod` for richer validation schemas once baseline lands.
- Introduce API response envelope: `{ data, error }` typed discriminated unions.
- Add request/response tracing IDs in `logger` for end-to-end correlation.

### File References
- Routes: `src/app/api/{avatar,edit,tryon,amazon,video}/route.ts`
- Adapters: `src/lib/adapters/{avatar,edit,amazon,fashn,video}.ts`
- Utilities present: `src/lib/util/{errorHandling.ts,logger.ts,timers.ts,persistence.ts}`
- Types: `src/types/index.d.ts`


