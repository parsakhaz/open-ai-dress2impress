import { performTryOn } from '@/lib/adapters/fashn';
import type { TryOnJob, WardrobeItem } from '@/types';
import { getBaseImageKey, getJobByPair, listQueued, updateJobStatus, upsertQueuedJob } from './tryOnRepo';
import { logger } from '@/lib/util/logger';

type Listener = (job: TryOnJob) => void;

class TryOnQueueService {
  private running: boolean = false;
  private maxClientConcurrency: number = 3;
  private inFlight: Set<string> = new Set();
  private listeners: Set<Listener> = new Set();

  onChange(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(job: TryOnJob): void {
    for (const l of this.listeners) l(job);
  }

  async enqueue(params: { baseImageId?: string | null; baseImageUrl: string; item: WardrobeItem }): Promise<TryOnJob> {
    const job = await upsertQueuedJob(params);
    this.start();
    return job;
  }

  private start(): void {
    if (this.running) return;
    this.running = true;
    void this.loop();
  }

  private async loop(): Promise<void> {
    try {
      while (true) {
        // Refill up to max concurrency
        const capacity = this.maxClientConcurrency - this.inFlight.size;
        if (capacity > 0) {
          const queued = await listQueued(capacity);
          for (const job of queued) {
            if (this.inFlight.has(job.id)) continue;
            this.process(job).catch((err) => {
              logger.error('TRYON_QUEUE', 'Process error', err);
            });
          }
        }

        // Idle wait
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (e) {
      logger.error('TRYON_QUEUE', 'Loop crashed, restarting', e);
      this.running = false;
      setTimeout(() => this.start(), 1000);
    }
  }

  private async process(job: TryOnJob): Promise<void> {
    this.inFlight.add(job.id);
    await updateJobStatus(job.id, 'running');
    this.emit({ ...job, status: 'running' });
    try {
      const images = await performTryOn(job.baseImageUrl, job.itemImageUrl);
      await updateJobStatus(job.id, 'succeeded', { images });
      this.emit({ ...job, status: 'succeeded', images });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      await updateJobStatus(job.id, 'failed', { error: message });
      this.emit({ ...job, status: 'failed', error: message });
    } finally {
      this.inFlight.delete(job.id);
    }
  }
}

export const tryOnQueue = new TryOnQueueService();


