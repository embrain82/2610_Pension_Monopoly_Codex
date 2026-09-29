// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { createGame } from '../src/engine/game-engine';
import { renderOngoing } from '../src/ui/ongoing-view';
import { updateView } from '../src/ui/dom-view';
it('starts open and preserves a collapsed order panel when the current turn updates', () => {
  const game = createGame('ongoing-disclosure', 'growth', 500000, { scenario: 'classic', ghost: false });
  game.turn = 4;
  game.pendingOrders = [{ id: 'pending', side: 'buy', stage: 'received', productId: 'tdf', amount: 1000000, submittedTurn: 3, priceTurn: 4, settlesTurn: 5 }];
  const before = JSON.stringify(game);
  const root = document.createElement('div');
  updateView(root, renderOngoing(game));
  const panel = root.querySelector('details')!;
  expect(panel.open).toBe(true);
  expect(panel.querySelector('summary')!.textContent).toContain('현재 4/12턴');
  panel.open = false;
  updateView(root, renderOngoing({ ...game, turn: 5 }));
  expect(root.querySelector('details')).toBe(panel);
  expect(panel.open).toBe(false);
  expect(panel.querySelector('summary')!.textContent).toContain('현재 5/12턴');
  expect(panel.querySelector('.ongoing-content')!.textContent).toContain('1,000,000원');
  expect(JSON.stringify(game)).toBe(before);
});
