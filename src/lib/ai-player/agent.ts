import { buildSystemPrompt, buildUserContext } from './prompts';
import { getToolDefinitions } from './toolSpec';
import * as localTools from './tools';
import * as remote from './remote';
import { saveManifest } from './results';
import type { Category, AIStreamEvent, Product } from './types';

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

  async run() {
    await this.emit({ phase: 'INIT', eventType: 'system', message: 'AI Player (GPT) initialized' });
    const sys = buildSystemPrompt();
    const user = buildUserContext(this.theme, this.avatarUrl, this.remainingSeconds());
    const tools = getToolDefinitions();

    // Chat loop
    let messages: any[] = [ { role: 'system', content: sys }, { role: 'user', content: user } ];
    for (let step = 0; step < 20; step++) {
      // Call OpenAI
      const body = { model: 'gpt-5', messages, tool_choice: 'auto', tools } as any;
      await this.emit({ phase: 'PLAN', eventType: 'thought', message: 'GPT request: compact meta logged' });
      const { OPENAI_API_KEY, OPENAI_BASE_URL } = { OPENAI_API_KEY: process.env.OPENAI_API_KEY!, OPENAI_BASE_URL: process.env.OPENAI_BASE_URL || 'https://api.openai.com' };
      const res = await fetch(`${OPENAI_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      const msg = data?.choices?.[0]?.message;
      if (!msg) break;

      // Tool calls?
      if (Array.isArray(msg.tool_calls) && msg.tool_calls.length > 0) {
        messages.push({ role: 'assistant', content: msg.content || '', tool_calls: msg.tool_calls });
        // Execute tools in parallel
        const results = await Promise.all(msg.tool_calls.map(async (tc: any) => {
          const name = tc.function?.name as string;
          const args = tc.function?.arguments ? JSON.parse(tc.function.arguments) : {};
          const toolResult = await this.executeTool(name, args).catch((err) => ({ error: String(err) }));
          return { tool_call_id: tc.id, role: 'tool', name, content: JSON.stringify(toolResult) };
        }));
        results.forEach((r) => messages.push(r));
        continue; // request again with tool results
      }

      // Assistant returned regular content; consider done
      await this.emit({ phase: 'DONE', eventType: 'system', message: 'AI player (GPT) finished.' });
      break;
    }
  }

  private async executeTool(name: string, args: any): Promise<any> {
    switch (name) {
      case 'getCurrentClothes': {
        await this.emit({ phase: 'GATHER', eventType: 'tool:start', tool: { name }, message: 'List closet', context: args });
        const res = await localTools.getCurrentClothes(args.categories as Category[]);
        await this.emit({ phase: 'GATHER', eventType: 'tool:result', tool: { name }, message: `Found ${res.length}`, context: { count: res.length } });
        return { wardrobe: res };
      }
      case 'searchRapid': {
        if (this.rapidSearches >= 3) {
          await this.emit({ phase: 'GATHER', eventType: 'tool:error', tool: { name }, message: 'Rapid search limit reached' });
          return { error: 'limit_reached' };
        }
        this.rapidSearches++;
        await this.emit({ phase: 'GATHER', eventType: 'tool:start', tool: { name }, message: 'Rapid search', context: args });
        try {
          const res = await remote.searchRapid(args.query, args.category);
          await this.emit({ phase: 'GATHER', eventType: 'tool:result', tool: { name }, message: `Got ${res.length}` });
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
          await this.emit({ phase: 'TRYON', eventType: 'tool:error', tool: { name }, message: 'Rapid picks limit reached' });
          return { error: 'rapid_pick_limit' };
        }
        await this.emit({ phase: 'TRYON', eventType: 'tool:start', tool: { name }, message: 'Fashn try-on', context: { variation: args.variation } });
        const imgs = await remote.tryOnFashn(args.avatarImage, items[0].image);
        this.rapidPicks += 0; // keep simple; real enforcement can inspect source
        await this.emit({ phase: 'TRYON', eventType: 'tool:result', tool: { name }, message: `Images ${imgs.length}` });
        return { renderId: 'RF-' + Math.random().toString(36).slice(2, 10), images: imgs, latencyMs: 0 };
      }
      case 'evaluate': {
        await this.emit({ phase: 'TRYON', eventType: 'tool:start', tool: { name }, message: 'Evaluate outfit' });
        const { features } = await localTools.evaluate(args.theme, args.items as Product[], args.tryOnImages as string[]);
        await this.emit({ phase: 'TRYON', eventType: 'tool:result', tool: { name }, message: `Palette ${features.paletteHint}` });
        return { features };
      }
      case 'saveManifest': {
        await saveManifest(this.runId, args.data);
        await this.emit({ phase: 'DONE', eventType: 'tool:result', tool: { name }, message: 'Manifest saved' });
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


