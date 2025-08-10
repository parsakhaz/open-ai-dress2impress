export async function parallel<T>(count: number, fn: (index: number) => Promise<T>): Promise<T[]> {
  const tasks = Array.from({ length: count }, (_, i) => fn(i));
  return Promise.all(tasks);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

export async function poll<T>(opts: {
  fn: () => Promise<T>;
  isDone: (result: T) => boolean;
  intervalMs: number;
  timeoutMs: number;
}): Promise<T> {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = await opts.fn();
    if (opts.isDone(result)) return result;
    if (Date.now() - start > opts.timeoutMs) {
      throw new Error('Polling timed out');
    }
    await sleep(opts.intervalMs);
  }
}


