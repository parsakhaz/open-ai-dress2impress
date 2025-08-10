import { createValidationError } from './errorHandling';

export function assertString(name: string, v: unknown): asserts v is string {
  if (typeof v !== 'string' || v.length === 0) {
    throw createValidationError(name, v, 'must be a non-empty string');
  }
}

export function assertMinLength(name: string, v: unknown, min: number): asserts v is string {
  assertString(name, v);
  if (v.length < min) {
    throw createValidationError(name, v, `must be at least ${min} characters`);
  }
}

export function assertUrl(name: string, v: unknown): asserts v is string {
  assertString(name, v);
  try {
    // Allow data URLs as well
    if (v.startsWith('data:')) return;
    new URL(v);
  } catch {
    throw createValidationError(name, v, 'must be a valid URL or data URL');
  }
}

// Shared API request types (runtime guards only). Actual TS types live in src/lib/api/types.ts
export const guards = {
  avatar(body: unknown) {
    const b = body as { imageDataUrl?: unknown };
    assertString('imageDataUrl', b.imageDataUrl);
    return { imageDataUrl: b.imageDataUrl } as { imageDataUrl: string };
  },
  edit(body: unknown) {
    const b = body as { baseImageUrl?: unknown; instruction?: unknown };
    assertUrl('baseImageUrl', b.baseImageUrl);
    assertMinLength('instruction', b.instruction, 2);
    return { baseImageUrl: b.baseImageUrl, instruction: b.instruction } as { baseImageUrl: string; instruction: string };
  },
  tryon(body: unknown) {
    const b = body as { characterImageUrl?: unknown; clothingImageUrl?: unknown };
    assertUrl('characterImageUrl', b.characterImageUrl);
    assertUrl('clothingImageUrl', b.clothingImageUrl);
    return { characterImageUrl: b.characterImageUrl, clothingImageUrl: b.clothingImageUrl } as {
      characterImageUrl: string;
      clothingImageUrl: string;
    };
  },
  amazon(body: unknown) {
    const b = body as { query?: unknown };
    assertMinLength('query', b.query, 2);
    return { query: b.query } as { query: string };
  },
  theme(body: unknown) {
    const b = body as { context?: unknown };
    if (b.context !== undefined && typeof b.context !== 'string') {
      throw createValidationError('context', b.context, 'must be a string when provided');
    }
    return { context: b.context as string | undefined };
  },
  video(body: unknown) {
    const b = body as { imageUrl?: unknown };
    assertUrl('imageUrl', b.imageUrl);
    return { imageUrl: b.imageUrl } as { imageUrl: string };
  },
};


