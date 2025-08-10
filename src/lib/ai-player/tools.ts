// src/lib/ai-player/tools.ts

import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { Product, TryOnItem, FashnResult, EvaluateFeatures, Category } from './types';

const BASE_DIR = path.resolve(process.cwd());
const PUBLIC_DIR = path.join(BASE_DIR, 'public');
const CLOSET_DIR = path.join(PUBLIC_DIR, 'closet');
const TRYON_OUT_DIR = path.join(PUBLIC_DIR, 'out', 'tryon');

const CATEGORY_TO_DIR: Record<Category, string> = {
  top: path.join(CLOSET_DIR, 'tops'),
  bottom: path.join(CLOSET_DIR, 'bottoms'),
  dress: path.join(CLOSET_DIR, 'dresses'),
};

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

function hashShort(text: string, length = 8) {
  return crypto.createHash('sha256').update(text).digest('hex').substring(0, length);
}

function normalizeTitle(filename: string): string {
  return path
    .basename(filename, path.extname(filename))
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

async function ensureDir(dirPath: string) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch {
    // ignore
  }
}

async function listClosetImages(category: Category): Promise<string[]> {
  const dir = CATEGORY_TO_DIR[category];
  try {
    const files = await fs.readdir(dir);
    return files.filter((file) => IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase()));
  } catch {
    return [];
  }
}

function fileToProduct(filePath: string, category: Category): Product {
  const relativePath = path.relative(PUBLIC_DIR, filePath);
  const imageUrl = `/${relativePath.replace(/\\/g, '/')}`;
  return {
    id: `local-${category}-${hashShort(relativePath)}`,
    title: normalizeTitle(filePath),
    image: imageUrl,
    url: imageUrl,
    category,
    provider: 'mock',
  };
}

async function allProductsByCategory(category: Category): Promise<Product[]> {
  const dir = CATEGORY_TO_DIR[category];
  const files = await listClosetImages(category);
  return files.map((file) => fileToProduct(path.join(dir, file), category));
}

export async function getCurrentClothes(categories: Category[]): Promise<Product[]> {
  const products = await Promise.all(categories.map((c) => allProductsByCategory(c)));
  return products.flat();
}

export async function searchCloset(
  query: string,
  category: Category,
  filters: { limit?: number; colorPalette?: string[] } = {}
): Promise<Product[]> {
  const candidates = await allProductsByCategory(category);
  const queryWords = query.toLowerCase().split(' ').filter(Boolean);
  const results = candidates.filter((p) => {
    const title = p.title.toLowerCase();
    return queryWords.some((word) => title.includes(word));
  });
  const limit = typeof filters.limit === 'number' ? filters.limit : 12;
  if (results.length > 0) return results.slice(0, limit);
  // Fallback: if no matches, just return the first N candidates
  return candidates.slice(0, limit);
}

export async function callFashnAPI(
  avatarUrl: string,
  items: TryOnItem[],
  variation: number
): Promise<FashnResult> {
  const start = Date.now();
  await ensureDir(TRYON_OUT_DIR);

  const itemsKey = items.map((it) => `${it.category}:${it.id}`).join(',');
  const renderId = `R-${hashShort(`${avatarUrl}|${itemsKey}|${variation}`, 10)}`;
  const outPath = path.join(TRYON_OUT_DIR, `${renderId}_v${variation}.png`);
  const outUrl = `/out/tryon/${renderId}_v${variation}.png`;

  try {
    // Prepare avatar input (supports local public path, remote URL, or data URL)
    let avatarInput: string | Buffer;
    if (avatarUrl.startsWith('/')) {
      avatarInput = path.join(PUBLIC_DIR, avatarUrl.replace(/^\//, ''));
    } else if (avatarUrl.startsWith('data:')) {
      const match = avatarUrl.match(/^data:[^;]+;base64,(.+)$/);
      const base64 = match?.[1] ?? '';
      avatarInput = Buffer.from(base64, 'base64');
    } else if (/^https?:\/\//i.test(avatarUrl)) {
      const res = await fetch(avatarUrl);
      const buf = await res.arrayBuffer();
      avatarInput = Buffer.from(buf);
    } else {
      // Fallback to treating as local relative
      avatarInput = path.join(PUBLIC_DIR, avatarUrl);
    }

    const avatarImage = sharp(avatarInput);

    const compositeOperations = [] as sharp.OverlayOptions[];
    for (const item of items) {
      const itemPath = path.join(PUBLIC_DIR, item.image.replace(/^\//, ''));
      compositeOperations.push({ input: itemPath, gravity: 'center' });
    }

    await avatarImage.composite(compositeOperations).toFile(outPath);

    return {
      renderId,
      images: [outUrl],
      latencyMs: Date.now() - start,
    };
  } catch {
    return {
      renderId,
      images: items.length > 0 ? [items[0].image] : [avatarUrl],
      latencyMs: Date.now() - start,
    };
  }
}

export async function evaluate(
  theme: string,
  items: Product[],
  tryOnImages: string[]
): Promise<{ features: EvaluateFeatures }> {
  const colors = items.flatMap((it) => it.colors || []);
  const uniqueColors = new Set(colors).size;

  let hint: EvaluateFeatures['paletteHint'] = 'cohesive';
  if (uniqueColors > 4) hint = 'busy';
  else if (uniqueColors > 2) hint = 'mixed';

  return {
    features: {
      paletteHint: hint,
      notes: `${tryOnImages.length} try-on image(s); theme='${theme}'. Colors are ${hint}.`,
    },
  };
}


