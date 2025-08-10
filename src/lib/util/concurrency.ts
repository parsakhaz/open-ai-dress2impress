import { logger } from '@/lib/util/logger';

/**
 * Simple in-memory semaphore with FIFO queue.
 * Used to cap concurrent external API calls (e.g., FASHN) to provider limits.
 */
class Semaphore {
  private readonly maxConcurrency: number;
  private activeCount: number = 0;
  private readonly waitQueue: Array<() => void> = [];

  constructor(maxConcurrency: number) {
    if (!Number.isFinite(maxConcurrency) || maxConcurrency <= 0) {
      throw new Error(`Semaphore requires positive maxConcurrency, got: ${maxConcurrency}`);
    }
    this.maxConcurrency = maxConcurrency;
  }

  private tryStartNext(): void {
    if (this.activeCount >= this.maxConcurrency) return;
    const start = this.waitQueue.shift();
    if (!start) return;
    start();
  }

  private acquireInternal(): Promise<() => void> {
    return new Promise<() => void>((resolve) => {
      const start = () => {
        this.activeCount += 1;
        const release = () => {
          this.activeCount = Math.max(0, this.activeCount - 1);
          this.tryStartNext();
        };
        resolve(release);
      };

      if (this.activeCount < this.maxConcurrency) {
        start();
      } else {
        this.waitQueue.push(start);
      }
    });
  }

  async run<T>(operation: () => Promise<T>): Promise<T> {
    const release = await this.acquireInternal();
    try {
      return await operation();
    } finally {
      release();
    }
  }

  get inUse(): number {
    return this.activeCount;
  }

  get queued(): number {
    return this.waitQueue.length;
  }

  get capacity(): number {
    return this.maxConcurrency;
  }
}

// Allow override via env for testing/tuning; default to 6 per FASHN docs
const FASHN_CONCURRENCY = Number(process.env.FASHN_CONCURRENCY || 6);

export const fashnSemaphore = new Semaphore(FASHN_CONCURRENCY);

export async function runWithFashnConcurrency<T>(fn: () => Promise<T>): Promise<T> {
  if (fashnSemaphore.queued > 0 || fashnSemaphore.inUse >= fashnSemaphore.capacity) {
    logger.debug('FASHN_CONCURRENCY', `Queueing request (inUse=${fashnSemaphore.inUse}/${fashnSemaphore.capacity}, queued=${fashnSemaphore.queued})`);
  }
  return fashnSemaphore.run(fn);
}

export type ConcurrencyStats = {
  inUse: number;
  queued: number;
  capacity: number;
};

export function getFashnConcurrencyStats(): ConcurrencyStats {
  return {
    inUse: fashnSemaphore.inUse,
    queued: fashnSemaphore.queued,
    capacity: fashnSemaphore.capacity,
  };
}


