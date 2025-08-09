"use client";
import Webcam from 'react-webcam';
import { useCallback, useRef, useState } from 'react';
import { generateAvatarFromSelfie } from '@/lib/adapters/avatar';
import { useGameStore } from '@/lib/state/gameStore';
import type { Character } from '@/types';

export default function AvatarPanel() {
  const webcamRef = useRef<Webcam>(null);
  const [variants, setVariants] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setCharacter = useGameStore((s) => s.setCharacter);
  const setCurrentImage = useGameStore((s) => s.setCurrentImage);
  const setPhase = useGameStore((s) => s.setPhase);

  const capture = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;
    setLoading(true);
    setError(null);
    try {
      // Note: If OpenAI rejects data URLs, we will need to upload to a blob store and pass a URL.
      const urls = await generateAvatarFromSelfie(imageSrc);
      setVariants(urls);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Avatar generation failed');
    } finally {
      setLoading(false);
    }
  }, []);

  function choose(url: string) {
    const c: Character = { id: `char-${Date.now()}`, avatarUrl: url };
    setCharacter(c);
    setCurrentImage(url);
    setPhase('ShoppingSpree');
  }

  return (
    <div className="border rounded p-3 bg-white">
      <div className="font-medium mb-2">Create Your Avatar</div>
      <div className="flex flex-col gap-2 items-start">
        <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" className="w-full max-w-sm rounded border" />
        <button className="px-3 py-1 bg-black text-white rounded" onClick={capture} disabled={loading}>
          {loading ? 'Generating…' : 'Capture & Generate Avatars'}
        </button>
      </div>
      {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
      {variants.length > 0 && (
        <div className="mt-3">
          <div className="font-medium mb-2">Choose one</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {variants.map((u, i) => (
              <div key={i} className="border rounded overflow-hidden">
                <img src={u} alt={`avatar ${i + 1}`} className="w-full h-40 object-cover" />
                <div className="p-2">
                  <button className="px-2 py-1 text-xs border rounded" onClick={() => choose(u)}>
                    Select
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


