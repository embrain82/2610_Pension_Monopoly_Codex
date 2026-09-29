export type WalkDirection = 'right' | 'down' | 'left' | 'up';
/** Fixed wall-clock turn duration, independent of the user's general animation speed. */
export const CORNER_TURN_MS = 100;
export function outgoingDirection(index: number): WalkDirection {
  const tile = ((index % 24) + 24) % 24;
  return tile < 6 ? 'right' : tile < 12 ? 'down' : tile < 18 ? 'left' : 'up';
}
export function turnKey(from: WalkDirection, to: WalkDirection): string { return `turn-${from}-${to}`; }
