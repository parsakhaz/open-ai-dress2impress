import { saveImage } from '@/lib/data/imageRepo';
import { addHistoryItem } from '@/lib/data/historyRepo';
import { useGameStore } from '@/lib/state/gameStore';

export type HistoryType = 'avatar' | 'tryOn' | 'edit';

export async function selectImage(url: string, opts?: { type?: HistoryType; description?: string; addToHistory?: boolean }) {
  const id = await saveImage(url);
  const { setCurrentImage, setCurrentImageId, addToHistory } = useGameStore.getState();
  setCurrentImage(url);
  setCurrentImageId(id);

  if (opts?.addToHistory) {
    addToHistory({ imageUrl: url, type: opts.type || 'edit', description: opts.description });
    await addHistoryItem({ imageId: id, type: opts.type || 'edit', description: opts.description });
  }
  return id;
}


