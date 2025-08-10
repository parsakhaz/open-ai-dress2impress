import { useState } from 'react';
import { editImage } from '@/lib/adapters/edit';
import { useGameStore } from '@/lib/state/gameStore';
import { useToast } from '@/hooks/useToast';
import { selectImage } from '@/lib/services/stateActions';

export function useEditWithAI(baseImageUrl: string | null | undefined, phase: ReturnType<typeof useGameStore>['phase']) {
  const [instruction, setInstruction] = useState('');
  const [variants, setVariants] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accessorizeUsed = useGameStore((s) => s.accessorizeUsed);
  const setAccessorizeUsed = useGameStore((s) => s.setAccessorizeUsed);
  const setRunwayBaseImageUrl = useGameStore((s) => s.setRunwayBaseImageUrl);
  const { showToast } = useToast();

  const canGenerate = !!baseImageUrl && instruction.trim().length > 0 && !(phase === 'Accessorize' && accessorizeUsed);

  const generate = async () => {
    if (!canGenerate || !baseImageUrl) return;
    setLoading(true);
    setError(null);
    showToast('Generating 4 options (30–100s)…', 'info', 2200);
    try {
      const urls = await editImage(baseImageUrl, instruction.trim());
      setVariants(urls);
      if (phase === 'Accessorize') setAccessorizeUsed(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Edit failed');
    } finally {
      setLoading(false);
    }
  };

  const chooseVariant = async (url: string) => {
    await selectImage(url, { type: 'edit', description: instruction || 'AI edit', addToHistory: true });
    setRunwayBaseImageUrl(url);
  };

  return { instruction, setInstruction, variants, setVariants, loading, error, canGenerate, generate, chooseVariant };
}


