import fs from 'fs/promises';
import path from 'path';

const BASE_DIR = path.resolve(process.cwd());
const RESULTS_DIR = path.join(BASE_DIR, 'public', 'out', 'results');

export async function ensureResultsDir(runId: string): Promise<string> {
  const dir = path.join(RESULTS_DIR, runId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function saveManifest(runId: string, data: unknown): Promise<void> {
  const dir = await ensureResultsDir(runId);
  const file = path.join(dir, 'manifest.json');
  await fs.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
}


