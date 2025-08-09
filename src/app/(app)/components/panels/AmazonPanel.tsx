"use client";
import { useState } from 'react';
import { searchAmazon } from '@/lib/adapters/amazon';
import type { WardrobeItem } from '@/types';
import { useGameStore } from '@/lib/state/gameStore';

export default function AmazonPanel() {
  const [query, setQuery] = useState('black leather jacket');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<WardrobeItem[]>([]);
  const addToWardrobe = useGameStore((s) => s.addToWardrobe);

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const items = await searchAmazon(query);
      setResults(items);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border rounded p-3 bg-white">
      <form onSubmit={onSearch} className="flex gap-2 mb-3">
        <input
          className="border rounded px-2 py-1 flex-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search Amazon fashion"
        />
        <button className="px-3 py-1 bg-black text-white rounded" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
      </form>
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {results.map((r) => (
          <div key={r.id} className="border rounded overflow-hidden">
            <img src={r.imageUrl} alt={r.name} className="w-full h-40 object-cover" />
            <div className="p-2 text-sm line-clamp-2">{r.name}</div>
            <div className="p-2">
              <button className="px-2 py-1 text-xs border rounded" onClick={() => addToWardrobe(r)}>
                Add to Wardrobe
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


