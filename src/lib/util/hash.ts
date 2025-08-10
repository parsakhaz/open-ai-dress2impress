export function stableHash(input: string): string {
  // Simple FNV-1a 32-bit hash for stability across sessions
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return `h${hash.toString(16)}`;
}


