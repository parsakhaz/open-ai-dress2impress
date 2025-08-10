import { buildSystemPrompt, buildUserContext } from './prompts';
import { getToolDefinitions } from './toolSpec';
import * as localTools from './tools';
import * as remote from './remote';
import { saveManifest } from './results';
import type { Category, AIStreamEvent, Product } from './types';
import { getOpenAIEnvOnly } from '@/lib/util/env';

type Writer = WritableStreamDefaultWriter<Uint8Array>;

export class AIPlayerAgent {
  private runId: string;
  private writer: Writer;
  private enc = new TextEncoder();
  private seq = 0;
  private rapidSearches = 0;
  private rapidPicks = 0;
  private startAt = Date.now();
  private durationMs: number;
  private theme: string;
  private avatarUrl: string;
  private avatarBytes: number = 0;

  constructor(opts: { runId: string; writer: Writer; theme: string; avatarUrl: string; durationMs: number }) {
    this.runId = opts.runId;
    this.writer = opts.writer;
    this.durationMs = opts.durationMs;
    this.theme = opts.theme;
    this.avatarUrl = opts.avatarUrl;
  }

  private async emit(e: Omit<AIStreamEvent, 'runId'|'seq'|'timestamp'>) {
    const line = JSON.stringify({ runId: this.runId, seq: ++this.seq, timestamp: new Date().toISOString(), ...e }) + '\n';
    await this.writer.write(this.enc.encode(line));
  }

  private remainingSeconds(): number {
    return Math.max(0, Math.round((this.startAt + this.durationMs - Date.now()) / 1000));
  }

  private baseUrl(): string {
    const fromEnv = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    return fromEnv.endsWith('/') ? fromEnv.slice(0, -1) : fromEnv;
  }

  private async toDataUri(url: string): Promise<string> {
    if (url.startsWith('data:')) return url;
    // If local public path, read from disk to avoid network/CORS
    if (url.startsWith('/')) {
      const path = require('path') as typeof import('path');
      const fs = require('fs/promises') as typeof import('fs/promises');
      const sharp: typeof import('sharp') = require('sharp');
      const relRaw = url.replace(/^\//, '');
      const relDecoded = (() => { try { return decodeURIComponent(relRaw); } catch { return relRaw; } })();
      const candidate = path.normalize(path.join(process.cwd(), 'public', relDecoded));
      const publicDir = path.join(process.cwd(), 'public');
      const absFile = (candidate.startsWith(publicDir + path.sep) || candidate === publicDir) ? candidate : path.join(publicDir, relRaw);
      try {
        let buf = await fs.readFile(absFile);
        // Downscale to keep payload small for GPT vision
        try {
          buf = await sharp(buf).resize({ width: 512, height: 512, fit: 'inside' }).webp({ quality: 60 }).toBuffer();
        } catch {}
        const mime = 'image/webp';
        return `data:${mime};base64,${Buffer.from(buf).toString('base64')}`;
      } catch {
        // Fallback: try reading a known good avatar asset; if that fails, try fetching via HTTP
        try {
          const fallback = path.join(process.cwd(), 'public', 'character', 'image.webp');
          let buf = await fs.readFile(fallback);
          try {
            buf = await sharp(buf).resize({ width: 512, height: 512, fit: 'inside' }).webp({ quality: 60 }).toBuffer();
          } catch {}
          return `data:image/webp;base64,${Buffer.from(buf).toString('base64')}`;
        } catch {}
        // Last resort: fetch from server origin
        const full = `${this.baseUrl()}${url}`;
        const res = await fetch(full);
        if (!res.ok) throw new Error(`Failed to fetch local image: ${res.status}`);
        let buf = Buffer.from(await res.arrayBuffer());
        try {
          buf = await sharp(buf).resize({ width: 512, height: 512, fit: 'inside' }).webp({ quality: 60 }).toBuffer();
        } catch {}
        return `data:image/webp;base64,${buf.toString('base64')}`;
      }
    }
    // Remote URL
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch image for GPT: ${res.status}`);
    const sharp: typeof import('sharp') = require('sharp');
    const ab = await res.arrayBuffer();
    // Create a Node Buffer safely from ArrayBuffer
    // Node typings can be picky in some TS configs; coerce via any to allow Buffer creation
    let buf = Buffer.from(ab as any);
    try {
      buf = await sharp(buf).resize({ width: 512, height: 512, fit: 'inside' }).webp({ quality: 60 }).toBuffer();
    } catch {}
    return `data:image/webp;base64,${buf.toString('base64')}`;
  }

  private async buildUserMessage(): Promise<any> {
    const content: any[] = [
      { type: 'text', text: buildUserContext(this.theme, '[avatar hidden for context]', this.remainingSeconds()) },
    ];
    try {
      const dataUri = await this.toDataUri(this.avatarUrl);
      this.avatarBytes = dataUri.length;
      content.push({ type: 'image_url', image_url: { url: dataUri } });
    } catch {
      // non-fatal; proceed without image
    }
    return { role: 'user', content };
  }

  async run() {
    await this.emit({ phase: 'INIT', eventType: 'system', message: 'ChatGPT has started analyzing the theme...' });
    const plan = await this.planOnce();
    const candidates = await this.executePlanAndTryOn(plan);
    await this.finalPickOnce(candidates);
  }

  private async planOnce(): Promise<{ queries: { category: Category; query: string }[]; outfits: { id: string; items: { category: Category; source: 'closet'|'rapid' }[] }[]; palette: string[] }> {
    const { OPENAI_API_KEY, OPENAI_BASE_URL } = getOpenAIEnvOnly();
    const system = 'You are a fashion AI. Respond JSON only. No prose.';
    const user = `Theme: ${this.theme}\nConstraints: max 2 Rapid searches, 1-2 outfits, prefer top+bottom. JSON format: {"palette": string[], "queries": [{"category":"top|bottom|dress","query": string}], "outfits": [{"id": "A"|"B", "items": [{"category":"top|bottom|dress","source":"closet"|"rapid"}]}]}`;
    const body = { model: 'gpt-5-mini', messages: [ { role: 'system', content: system }, { role: 'user', content: user } ] } as any;
    await this.emit({ phase: 'PLAN', eventType: 'tool:start', tool: { name: 'openai.chat' }, message: "I'm thinking about outfit ideas for this theme..." });
    const res = await fetch(`${OPENAI_BASE_URL}/v1/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` }, body: JSON.stringify(body) });
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || '{}';
    try {
      const parsed = JSON.parse(text);
      const queries = Array.isArray(parsed?.queries) ? parsed.queries.slice(0, 2).map((q: any) => ({ category: (q.category || 'top') as Category, query: String(q.query || '') })) : [];
      const outfits = Array.isArray(parsed?.outfits) ? parsed.outfits.slice(0, 2).map((o: any, i: number) => ({ id: String(o.id || (i === 0 ? 'A' : 'B')), items: Array.isArray(o.items) ? o.items.map((it: any) => ({ category: (it.category || 'top') as Category, source: (it.source || 'closet') as 'closet'|'rapid' })) : [] })) : [];
      const palette = Array.isArray(parsed?.palette) ? parsed.palette.map((s: any) => String(s)) : ['black','white'];
      await this.emit({ phase: 'PLAN', eventType: 'tool:result', tool: { name: 'openai.chat' }, message: "I've got some great outfit ideas!", context: { plan: { queries, outfits, palette } } });
      return { queries, outfits, palette };
    } catch {
      await this.emit({ phase: 'PLAN', eventType: 'tool:result', tool: { name: 'openai.chat' }, message: "I've created a simple outfit plan.", context: { plan: { queries: [], outfits: [{ id: 'A', items: [{ category: 'top', source: 'rapid' }] }], palette: ['black','white'] } } });
      return { queries: [], outfits: [{ id: 'A', items: [{ category: 'top', source: 'rapid' }] }], palette: ['black','white'] };
    }
  }

  private async executePlanAndTryOn(plan: { queries: { category: Category; query: string }[]; outfits: { id: string; items: { category: Category; source: 'closet'|'rapid' }[] }[]; palette: string[] }) {
    await this.emit({ phase: 'GATHER', eventType: 'phase:start', message: "I'm checking the closet and searching for perfect pieces..." });
    // Emit narrative tool messages around RapidAPI calls for better UI visibility
    const closetPromise = localTools.getCurrentClothes(['top','bottom','dress']);
    const rapidPromises: Promise<Product[]>[] = [];
    if (plan.queries[0]) {
      const q0 = plan.queries[0];
      await this.emit({ phase: 'GATHER', eventType: 'tool:start', tool: { name: 'searchRapid' }, message: `I'm searching for ${q0.category} items...`, context: { query: q0.query, category: q0.category, callId: 'search-0' } });
      rapidPromises.push(
        remote.searchRapid(q0.query, q0.category)
          .then(async (r) => {
            await this.emit({
              phase: 'GATHER',
              eventType: 'tool:result',
              tool: { name: 'searchRapid' },
              message: `Found ${r.length} great options!`,
              context: { images: r.slice(0, 6).map((p) => p.image), callId: 'search-0', count: r.length, query: q0.query, category: q0.category },
            });
            return r;
          })
          .catch(async (e) => { await this.emit({ phase: 'GATHER', eventType: 'tool:error', tool: { name: 'searchRapid' }, message: String(e), context: { callId: 'search-0', query: q0.query, category: q0.category } }); return [] as Product[]; })
      );
    }
    if (plan.queries[1]) {
      const q1 = plan.queries[1];
      await this.emit({ phase: 'GATHER', eventType: 'tool:start', tool: { name: 'searchRapid' }, message: `I'm also looking for ${q1.category} pieces...`, context: { query: q1.query, category: q1.category, callId: 'search-1' } });
      rapidPromises.push(
        remote.searchRapid(q1.query, q1.category)
          .then(async (r) => {
            await this.emit({
              phase: 'GATHER',
              eventType: 'tool:result',
              tool: { name: 'searchRapid' },
              message: `Found ${r.length} more options!`,
              context: { images: r.slice(0, 6).map((p) => p.image), callId: 'search-1', count: r.length, query: q1.query, category: q1.category },
            });
            return r;
          })
          .catch(async (e) => { await this.emit({ phase: 'GATHER', eventType: 'tool:error', tool: { name: 'searchRapid' }, message: String(e), context: { callId: 'search-1', query: q1.query, category: q1.category } }); return [] as Product[]; })
      );
    }
    const [closet, ...rapidLists] = await Promise.all([closetPromise, ...rapidPromises]);
    const [rapidA = [], rapidB = []] = rapidLists;
    const rapidMap: Record<Category, Product[]> = { top: [], bottom: [], dress: [] };
    for (const p of [...rapidA, ...rapidB]) (rapidMap[p.category] ||= []).push(p);
    const closetMap: Record<Category, Product[]> = { top: [], bottom: [], dress: [] };
    for (const p of closet) (closetMap[p.category] ||= []).push(p);

    const outfits = plan.outfits.length > 0 ? plan.outfits : [{ id: 'A', items: [{ category: 'top' as Category, source: 'rapid' as const }] }];
    const resolved = outfits.slice(0, 2).map((o) => {
      const items = o.items.length ? o.items : [{ category: 'top' as Category, source: 'rapid' as const }];
      const chosen = items.map((it) => {
        const pool = it.source === 'rapid' ? rapidMap[it.category as Category] : closetMap[it.category as Category];
        return pool && pool.length ? pool[0] : (closetMap[it.category as Category][0] || rapidMap[it.category as Category][0]);
      }).filter(Boolean) as Product[];
      return { id: o.id, items: chosen };
    });

    await this.emit({ phase: 'TRYON', eventType: 'phase:start', message: "I'm conducting virtual try-ons to see how everything looks..." });
    const modelDataUri = await this.toDataUri(this.avatarUrl);
    const tryonPromises = resolved.map(async (o) => {
      const garment = o.items[0];
      if (!garment) return { id: o.id, images: [] as string[] };
      await this.emit({ phase: 'TRYON', eventType: 'tool:start', tool: { name: 'fashn.tryon' }, message: `I'm trying on Outfit ${o.id}...`, context: { callId: o.id, outfitId: o.id } });
      const garmentDataUri = await this.toDataUri(garment.image);
      const images = await remote.tryOnFashnData(modelDataUri, garmentDataUri);
      await this.emit({ phase: 'TRYON', eventType: 'tool:result', tool: { name: 'fashn.tryon' }, message: `Outfit ${o.id} try-on complete!`, context: { images, callId: o.id, outfitId: o.id, count: images.length } });
      return { id: o.id, images };
    });
    return Promise.all(tryonPromises);
  }

  private async finalPickOnce(candidates: { id: string; images: string[] }[]) {
    const { OPENAI_API_KEY, OPENAI_BASE_URL } = getOpenAIEnvOnly();
    const sys = 'You are a fashion AI. Respond JSON only.';
    const user = `Theme: ${this.theme}\nCandidates: ${JSON.stringify(candidates.map(c => ({ id: c.id, images: c.images.slice(0,2) })))}\nChoose best: {"final_outfit_id": "A|B", "reason": string}`;
    const body = { model: 'gpt-5-mini', messages: [ { role: 'system', content: sys }, { role: 'user', content: user } ] } as any;
    await this.emit({ phase: 'PICK', eventType: 'tool:start', tool: { name: 'openai.chat' }, message: "I'm evaluating the outfits to pick the best one..." });
    const res = await fetch(`${OPENAI_BASE_URL}/v1/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` }, body: JSON.stringify(body) });
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || '{}';
    let finalId = candidates[0]?.id || 'A'; let reason = 'Best available.';
    try { const parsed = JSON.parse(text); finalId = parsed.final_outfit_id || finalId; reason = parsed.reason || reason; } catch {}
    await this.emit({ phase: 'PICK', eventType: 'phase:result', message: `I picked Outfit ${finalId}!`, context: { finalId, reason } });
    await saveManifest(this.runId, { runId: this.runId, theme: this.theme, avatarUrl: this.avatarUrl, candidates, final: { id: finalId, reason } });
    await this.emit({ phase: 'DONE', eventType: 'system', message: 'ChatGPT is done thinking.' });
  }

  private async executeTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'getCurrentClothes': {
        await this.emit({ phase: 'GATHER', eventType: 'tool:start', tool: { name }, message: "I'm checking what's in the closet...", context: args });
        const res = await localTools.getCurrentClothes(args.categories as Category[]);
        await this.emit({ phase: 'GATHER', eventType: 'tool:result', tool: { name }, message: `I found ${res.length} items in the closet!`, context: { count: res.length } });
        return { wardrobe: res };
      }
      case 'searchRapid': {
        if (this.rapidSearches >= 3) {
          await this.emit({ phase: 'GATHER', eventType: 'tool:error', tool: { name }, message: "I've hit the search limit - I'll work with what I have!" });
          return { error: 'limit_reached' };
        }
        this.rapidSearches++;
        await this.emit({ phase: 'GATHER', eventType: 'tool:start', tool: { name }, message: `I'm searching online for ${args.category} items...`, context: args });
        try {
          const res = await remote.searchRapid(args.query, args.category);
          await this.emit({ phase: 'GATHER', eventType: 'tool:result', tool: { name }, message: `Great! I found ${res.length} items online.` });
          return { products: res };
        } catch (e) {
          await this.emit({ phase: 'GATHER', eventType: 'tool:error', tool: { name }, message: String(e) });
          return { error: String(e) };
        }
      }
      case 'callFashnAPI': {
        // Count rapid picks
        const items = (args.items || []) as { id: string; image: string; category: Category }[];
        // (Optional) derive provider from id format; skip strict enforcement here but can be wired later
        if (this.rapidPicks >= 3) {
          await this.emit({ phase: 'TRYON', eventType: 'tool:error', tool: { name }, message: "I've reached the try-on limit for this session." });
          return { error: 'rapid_pick_limit' };
        }
        await this.emit({ phase: 'TRYON', eventType: 'tool:start', tool: { name }, message: "I'm generating a virtual try-on preview...", context: { variation: args.variation } });
        // Convert both model and garment images to Base64 data URLs for Fashn
        const modelDataUri = await this.toDataUri(args.avatarImage);
        const garmentDataUri = await this.toDataUri(items[0].image);
        const imgs = await remote.tryOnFashnData(modelDataUri, garmentDataUri);
        this.rapidPicks += 0; // keep simple; real enforcement can inspect source
        await this.emit({ phase: 'TRYON', eventType: 'tool:result', tool: { name }, message: `Try-on complete! Generated ${imgs.length} preview${imgs.length > 1 ? 's' : ''}.`, context: { images: imgs } });
        return { renderId: 'RF-' + Math.random().toString(36).slice(2, 10), images: imgs, latencyMs: 0 };
      }
      case 'evaluate': {
        await this.emit({ phase: 'TRYON', eventType: 'tool:start', tool: { name }, message: "I'm evaluating how well this outfit matches the theme..." });
        const { features } = await localTools.evaluate(args.theme, args.items as Product[], args.tryOnImages as string[]);
        await this.emit({ phase: 'TRYON', eventType: 'tool:result', tool: { name }, message: `The outfit features ${features.paletteHint} colors - perfect for the theme!` });
        return { features };
      }
      case 'saveManifest': {
        await saveManifest(this.runId, args.data);
        await this.emit({ phase: 'DONE', eventType: 'tool:result', tool: { name }, message: "I've saved my outfit selection!" });
        return { ok: true };
      }
      case 'log': {
        await this.emit({ phase: 'INIT', eventType: 'thought', message: String(args.message), context: args.context });
        return { ok: true };
      }
      default:
        return { error: `Unknown tool ${name}` };
    }
  }
}


