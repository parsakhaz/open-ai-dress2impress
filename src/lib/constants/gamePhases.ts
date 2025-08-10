import type { GamePhase } from '@/types';

export const GAME_PHASES: GamePhase[] = [
  'CharacterSelect',
  'ThemeSelect',
  'ShoppingSpree',
  'StylingRound',
  'Accessorize',
  'Evaluation',
  'WalkoutAndEval',
  'Results',
];

export function isTimedPhase(phase: GamePhase): boolean {
  return phase === 'ShoppingSpree' || phase === 'StylingRound';
}

export function defaultTimeForPhase(phase: GamePhase): number {
  if (phase === 'ShoppingSpree') return 120;
  if (phase === 'StylingRound') return 90;
  return 0;
}


