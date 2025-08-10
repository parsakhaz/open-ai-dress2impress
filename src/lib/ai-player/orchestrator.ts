// src/lib/ai-player/orchestrator.ts

import * as tools from './tools';
import * as remote from './remote';
import { saveManifest } from './results';
import { AIStreamEvent, Product, Category } from './types';

function isoNow() {
  return new Date().toISOString();
}

function createRunId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export class AIPlayer {
  private theme: string;
  private avatarUrl: string;
  private roundEndsAt: number;
  private writer: WritableStreamDefaultWriter<Uint8Array>;
  private textEncoder: TextEncoder;
  private runId: string;
  private seq: number;

  private cache_search: Record<Category, Product[]> = {
    top: [],
    bottom: [],
    dress: [],
  };
  private cache_wardrobe: Product[] = [];
  private tryons: Record<string, string[]> = {};
  private rapidSearchesUsed = 0;
  private rapidItemsPicked = 0;

  constructor(theme: string, avatarUrl: string, durationMs: number, stream: WritableStream<Uint8Array>) {
    this.theme = theme;
    this.avatarUrl = avatarUrl;
    this.roundEndsAt = Date.now() + durationMs;
    this.writer = stream.getWriter();
    this.textEncoder = new TextEncoder();
    this.runId = createRunId();
    this.seq = 0;
  }

  private async emit(event: Omit<AIStreamEvent, 'runId' | 'seq' | 'timestamp'>) {
    const enriched: AIStreamEvent = {
      runId: this.runId,
      seq: ++this.seq,
      timestamp: isoNow(),
      ...event,
    };
    const line = JSON.stringify(enriched) + '\n';
    await this.writer.write(this.textEncoder.encode(line));
  }

  private async withToolLogging<T>(
    phase: AIStreamEvent['phase'],
    name: string,
    messageStart: string,
    ctxStart: Record<string, unknown>,
    fn: () => Promise<T>,
    resultSummary?: (result: T) => { message: string; context?: Record<string, unknown> }
  ): Promise<T> {
    const start = Date.now();
    await this.emit({ phase, eventType: 'tool:start', tool: { name }, message: messageStart, context: ctxStart });
    try {
      const result = await fn();
      const durationMs = Date.now() - start;
      const summary = resultSummary ? resultSummary(result) : { message: 'Completed' };
      await this.emit({ phase, eventType: 'tool:result', tool: { name }, durationMs, message: summary.message, context: summary.context });
      return result;
    } catch (e) {
      const durationMs = Date.now() - start;
      const message = e instanceof Error ? e.message : 'Unknown tool error';
      await this.emit({ phase, eventType: 'tool:error', tool: { name }, durationMs, message, error: { message } });
      throw e;
    }
  }

  async run() {
    try {
      await this.emit({ phase: 'INIT', eventType: 'system', message: 'AI Player initialized' });
      await this.emit({ phase: 'INIT', eventType: 'thought', message: `Using avatar: ${this.avatarUrl.substring(0, 80)}` });

      // PLAN
      await this.emit({ phase: 'PLAN', eventType: 'phase:start', message: 'Planning outfit searches' });
      const planResult = this.plan();
      await this.emit({ phase: 'PLAN', eventType: 'thought', message: `Theme set: ${this.theme}` });
      await this.emit({ phase: 'PLAN', eventType: 'thought', message: `Palette intent: ${planResult.paletteIntent.join(', ')}` });
      await this.emit({
        phase: 'PLAN',
        eventType: 'phase:result',
        message: `Planned queries for categories`,
        context: { palette: planResult.paletteIntent, queries: planResult.queries.map((q) => ({ category: q.category, q: q.query, limit: q.limit })) },
      });

      // GATHER
      await this.emit({ phase: 'GATHER', eventType: 'phase:start', message: 'Gathering candidates from closet' });
      const gatherResult = await this.gather(planResult);
      await this.emit({
        phase: 'GATHER',
        eventType: 'phase:result',
        message: `Shortlisted ${gatherResult.outfits.length} outfits`,
        context: { variations: gatherResult.variations, outfits: gatherResult.outfits.map((o) => o.id) },
      });
      const tCount = this.cache_search.top.length;
      const bCount = this.cache_search.bottom.length;
      const dCount = this.cache_search.dress.length;
      const wCount = this.cache_wardrobe.length;
      await this.emit({ phase: 'GATHER', eventType: 'thought', message: `Collected ${tCount} tops, ${bCount} bottoms, ${dCount} dresses. Wardrobe has ${wCount} items.` });

      // TRYON
      await this.emit({ phase: 'TRYON', eventType: 'phase:start', message: 'Rendering try-ons and evaluating' });
      const tryonResult = await this.tryon(gatherResult);
      await this.emit({
        phase: 'TRYON',
        eventType: 'phase:result',
        message: `Got ${tryonResult.candidates.length} candidates`,
        context: { candidates: tryonResult.candidates.map((c) => ({ id: c.id, images: c.images.length })) },
      });
      await this.emit({ phase: 'TRYON', eventType: 'thought', message: `Received renders for outfits: ${Object.keys(this.tryons).join(', ') || 'none'}.` });

      // PICK
      await this.emit({ phase: 'PICK', eventType: 'phase:start', message: 'Picking best outfit' });
      const pickResult = await this.pick(tryonResult);
      await this.emit({
        phase: 'PICK',
        eventType: 'phase:result',
        message: pickResult?.final_outfit ? 'Picked final outfit' : 'No outfit selected',
        context: pickResult?.final_outfit
          ? { items: pickResult.final_outfit.items.map((i) => i.id), tryOnImage: pickResult.final_outfit.tryOnImage }
          : undefined,
      });
      if (pickResult?.final_outfit) {
        await this.emit({ phase: 'PICK', eventType: 'thought', message: `Picked outfit with ${pickResult.final_outfit.items.length} item(s).` });
      }

      await this.emit({ phase: 'DONE', eventType: 'system', message: 'AI player has finished its turn.' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.emit({ phase: 'DONE', eventType: 'phase:error', message: 'AI player failed', error: { message } });
      await this.emit({ phase: 'DONE', eventType: 'system', message: 'AI player has finished its turn.' });
    } finally {
      await this.writer.close();
    }
  }

  private plan() {
    // Keep a lightweight local heuristic plan; can be swapped to GPT later
    const palette = this.inferPaletteFromTheme(this.theme);
    const queries = [
      { category: 'top' as const, query: `best ${palette[0]} summer top`, limit: 10 },
      { category: 'bottom' as const, query: `${palette[2]} casual pants`, limit: 10 },
      { category: 'dress' as const, query: `${palette[1]} dress`, limit: 10 },
    ];
    return { paletteIntent: palette, queries };
  }

  private inferPaletteFromTheme(theme: string): string[] {
    const lowered = theme.toLowerCase();
    if (['summer', 'beach', 'rooftop'].some((k) => lowered.includes(k))) return ['navy', 'white', 'tan'];
    if (['winter', 'formal', 'evening'].some((k) => lowered.includes(k))) return ['black', 'charcoal', 'white'];
    return ['navy', 'white', 'tan'];
  }

  private async gather(planResult: ReturnType<typeof this.plan>) {
    const { queries, paletteIntent } = planResult;

    // 1) Scan local closet
    const [closetTops, closetBottoms, closetDresses, wardrobe] = await Promise.all([
      this.withToolLogging('GATHER', 'searchCloset', 'Scan closet: tops', { category: 'top' }, () => tools.searchCloset(queries[0].query, 'top', { colorPalette: paletteIntent, limit: 20 }), (r) => ({ message: `Found ${r.length} tops (closet)`, context: { count: r.length } })),
      this.withToolLogging('GATHER', 'searchCloset', 'Scan closet: bottoms', { category: 'bottom' }, () => tools.searchCloset(queries[1].query, 'bottom', { colorPalette: paletteIntent, limit: 20 }), (r) => ({ message: `Found ${r.length} bottoms (closet)`, context: { count: r.length } })),
      this.withToolLogging('GATHER', 'searchCloset', 'Scan closet: dresses', { category: 'dress' }, () => tools.searchCloset(queries[2].query, 'dress', { colorPalette: paletteIntent, limit: 20 }), (r) => ({ message: `Found ${r.length} dresses (closet)`, context: { count: r.length } })),
      this.withToolLogging('GATHER', 'getCurrentClothes', 'Load wardrobe', { categories: ['top','bottom','dress'] }, () => tools.getCurrentClothes(['top','bottom','dress']), (res) => ({ message: `Loaded wardrobe (${res.length})` }))
    ]);

    // 2) Up to 3 Rapid searches total
    const rapidResults: Record<Category, Product[]> = { top: [], bottom: [], dress: [] };
    const rapidSearchPlan = queries.slice(0, 3);
    for (const q of rapidSearchPlan) {
      if (this.rapidSearchesUsed >= 3) break;
      try {
        const results = await this.withToolLogging(
          'GATHER',
          'searchRapid',
          `Rapid search ${q.category}`,
          { category: q.category, q: q.query },
          () => remote.searchRapid(q.query, q.category),
          (res) => ({ message: `Rapid returned ${res.length}`, context: { count: res.length } })
        );
        this.rapidSearchesUsed += 1;
        rapidResults[q.category] = results.slice(0, 10);
      } catch (e) {
        await this.emit({ phase: 'GATHER', eventType: 'thought', message: `Rapid search failed for ${q.category}; continuing with closet.` });
      }
    }

    // Cache pools: mix closet and rapid (pick at most 3 rapid items later)
    this.cache_search.top = [...rapidResults.top, ...closetTops];
    this.cache_search.bottom = [...rapidResults.bottom, ...closetBottoms];
    this.cache_search.dress = [...rapidResults.dress, ...closetDresses];
    this.cache_wardrobe = wardrobe;

    // 3) Build naive outfits honoring constraints on rapid picks (<=3)
    const pickFrom = (arr: Product[], n: number) => arr.slice(0, n);
    const outfits: { id: string; items: { id: string }[] }[] = [];
    // Prefer top+bottom; otherwise dress
    const topPick = pickFrom(this.cache_search.top, 2);
    const bottomPick = pickFrom(this.cache_search.bottom, 2);
    if (topPick[0] && bottomPick[0]) outfits.push({ id: 'O1', items: [{ id: topPick[0].id }, { id: bottomPick[0].id }] });
    const dressPick = pickFrom(this.cache_search.dress, 1);
    if (dressPick[0]) outfits.push({ id: 'O2', items: [{ id: dressPick[0].id }] });

    const variations = [11, 77];
    return { outfits, variations };
  }

  private async tryon(gatherResult: Awaited<ReturnType<typeof this.gather>>) {
    const idToProduct = new Map<string, Product>();
    for (const p of this.cache_wardrobe) idToProduct.set(p.id, p);
    for (const p of Object.values(this.cache_search).flat()) idToProduct.set(p.id, p);

    const outfits = gatherResult.outfits
      .map((o) => ({ id: o.id, items: o.items.map((ref) => idToProduct.get(ref.id)).filter((p): p is Product => !!p) }))
      .filter((o) => o.items.length > 0);

    const tryonTasks: Promise<{ outfitId: string; variation: number; images: string[] }>[] = [];
    for (const outfit of outfits) {
      for (const variation of gatherResult.variations) {
        const task = async () => {
          const tryonItems = outfit.items.map((p) => ({ id: p.id, image: p.image, category: p.category }));
          // For AI parity with human flow: if there are multiple garments, try them individually for now
          const first = tryonItems[0];
          const images = await this.withToolLogging(
            'TRYON',
            'tryOnFashn',
            `FASHN try-on for ${outfit.id}`,
            { outfitId: outfit.id, items: tryonItems.length, variation },
            () => remote.tryOnFashn(this.avatarUrl, first.image),
            (imgs) => ({ message: `Got ${imgs.length} image(s)`, context: { images: imgs.length } })
          );
          return { outfitId: outfit.id, variation, images };
        };
        tryonTasks.push(task());
      }
    }

    const tryonResults = await Promise.all(tryonTasks);
    for (const { outfitId, images } of tryonResults) {
      if (!this.tryons[outfitId]) this.tryons[outfitId] = [];
      this.tryons[outfitId].push(...images);
    }

    const candidates = await Promise.all(
      outfits.map(async (o) => {
        const images = this.tryons[o.id] || [];
        const { features } = await this.withToolLogging(
          'TRYON',
          'evaluate',
          'Evaluating outfit',
          { outfitId: o.id, images: images.length },
          () => tools.evaluate(this.theme, o.items, images),
          (res) => ({ message: `Palette ${res.features.paletteHint}`, context: { paletteHint: res.features.paletteHint } })
        );
        return { id: o.id, images, notes: `${features.paletteHint}; ${features.notes}` };
      })
    );

    // Persist a simple manifest for later viewing
    await this.withToolLogging('TRYON', 'saveManifest', 'Saving manifest', { candidates: candidates.length }, async () => {
      await saveManifest(this.runId, {
        runId: this.runId,
        theme: this.theme,
        avatarUrl: this.avatarUrl,
        candidates,
        tryons: this.tryons,
      });
      return true as const;
    });

    return { candidates, next_step: 'pick' as const };
  }

  private async pick(tryonResult: Awaited<ReturnType<typeof this.tryon>>) {
    const { candidates } = tryonResult;
    if (!candidates || candidates.length === 0) {
      return { final_outfit: null };
    }
    const best = candidates.reduce((a, b) => (a.notes.includes('cohesive') ? a : b));

    const items_minimal: Pick<Product, 'id' | 'title' | 'category' | 'image'>[] = [];
    if (best.id === 'O1') {
      if (this.cache_search.top[0]) items_minimal.push(this.cache_search.top[0]);
      if (this.cache_search.bottom[0]) items_minimal.push(this.cache_search.bottom[0]);
    } else if (best.id === 'O2') {
      if (this.cache_search.dress[0]) items_minimal.push(this.cache_search.dress[0]);
    }

    return {
      final_outfit: {
        items: items_minimal.map((p) => ({ id: p.id, title: p.title, category: p.category, image: p.image })),
        tryOnImage: best.images[0] || this.avatarUrl,
        reason: best.notes || 'This was the best option.',
      },
    };
  }
}


