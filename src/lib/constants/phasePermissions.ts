import type { GamePhase } from '@/types';

export const canUseShopping = (phase: GamePhase): boolean => phase === 'ShoppingSpree';
export const canUseEdit = (phase: GamePhase): boolean => phase === 'Accessorize';
export const canOpenWardrobe = (phase: GamePhase): boolean => phase === 'StylingRound';

export const shoppingTooltipFor = (phase: GamePhase): string => {
  if (phase === 'ShoppingSpree') return 'Search real clothes (S)';
  if (phase === 'StylingRound') return 'Shopping is disabled during Styling';
  return 'Shopping is unavailable now';
};

export const editTooltipFor = (phase: GamePhase): string => {
  if (phase === 'Accessorize') return 'Accessorize: Edit with AI (E)';
  if (phase === 'StylingRound') return 'Editing moves to Accessorize';
  return 'Editing is unavailable now';
};

export const wardrobeTooltipFor = (phase: GamePhase): string => {
  if (phase === 'StylingRound') return 'Your wardrobe (W)';
  if (phase === 'Accessorize') return 'Wardrobe is disabled during Accessorize';
  return 'Wardrobe opens during Styling';
};


