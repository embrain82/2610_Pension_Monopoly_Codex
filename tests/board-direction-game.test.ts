// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PensionRoadApp } from '../src/ui/app';
import { defaultSave, STORAGE_KEY } from '../src/ui/ui-state';
import { CHECKPOINT_KEY, checkpointVersion, parseCheckpoint, type PlayCheckpoint } from '../src/ui/play-checkpoint';
import { createGame, startTurn } from '../src/engine/game-engine';
import { dicePairForTurn, DICE_ROLL_DURATION_MS, DICE_LAND_HOLD_MS } from '../src/ui/dice';
import { TILE_REVEAL_MS } from '../src/ui/board-discovery';
import { BoardCharacterMotion } from '../src/ui/board-character-motion';
import type { GameState } from '../src/types';

let root: HTMLElement;
const click = (action: string) => root.querySelector<HTMLElement>(`[data-action="${action}"]`)!.click();
const saved = () => parseCheckpoint(localStorage.getItem(CHECKPOINT_KEY))!;
const fresh = () => createGame('emotion-arrival', 'growth', 500000, { updatedFinance: true, scenario: 'classic', boardVisibility: 'arrival-v1', ghost: false });
function mount(game: GameState, pending = false, reducedMotion = false) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...defaultSave, disclaimerAccepted: true, quickGuideSeen: true, howtoSeen: true,
    settings: { ...defaultSave.settings, speed:1, speedSelected:true, motionEffects: reducedMotion ? 'off' : 'on', reducedMotion, characters: true } }));
  const data: PlayCheckpoint = { version: checkpointVersion(game), game, arrivalPending: pending, modal: null, lastSummary: null,
    quizCardId: null, quizPicked: null, finalQuizQueue: [], finalQuizTotal: 0, finishing: false, defaultOptionAsk: false };
  localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(data));
  document.body.innerHTML = '<div id="app"></div>'; root = document.querySelector('#app')!;
  new PensionRoadApp(root); click('resume-game');
}
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear();
  vi.spyOn(Element.prototype, 'animate').mockImplementation((_frames, options) => {
    const duration = typeof options === 'number' ? options : (Number(options?.duration ?? 0) + Number(options?.delay ?? 0));
    let reject!: (e: Error) => void, timer: ReturnType<typeof setTimeout>;
    const finished = new Promise<Animation>((resolve, fail) => { reject = fail; timer = setTimeout(() => resolve({} as Animation), duration); });
    return { finished, cancel: () => { clearTimeout(timer); reject(new Error('cancelled')); } } as Animation;
  });
});
afterEach(() => { document.body.innerHTML = ''; vi.restoreAllMocks(); vi.useRealTimers(); });


it('the real game waits 100ms at each crossed corner, then commits the turn once', async () => {
  vi.spyOn(BoardCharacterMotion.prototype, 'sync').mockImplementation(() => {});
  vi.spyOn(BoardCharacterMotion.prototype, 'ready', 'get').mockReturnValue(true);
  const turns = vi.spyOn(BoardCharacterMotion.prototype, 'turn');
  const walks = vi.spyOn(BoardCharacterMotion.prototype, 'walk');
  const game = fresh(); game.position = 5; mount(game);
  const faces = dicePairForTurn(game.seed, 0), steps = faces[0] + faces[1];
  const corners = Math.floor((5 + steps - 1) / 6);
  const duration = DICE_ROLL_DURATION_MS + DICE_LAND_HOLD_MS + steps * 260 + corners * 100 + TILE_REVEAL_MS;
  click('roll-dice'); await vi.advanceTimersByTimeAsync(duration - 1);
  expect(saved().game.turn).toBe(0);
  await vi.advanceTimersByTimeAsync(1);
  expect(turns).toHaveBeenCalledTimes(corners); expect(turns.mock.calls[0]).toEqual(['right', 'down']);
  expect(walks.mock.calls[0]).toEqual(['right']); expect(walks).toHaveBeenCalledTimes(steps);
  expect(saved().game).toEqual(startTurn(game, steps).state);
  await vi.advanceTimersByTimeAsync(2000);
  expect(saved().game).toEqual(startTurn(game, steps).state);
});
it('hiding the tab during a corner cancels movement without committing a turn', async () => {
  vi.spyOn(BoardCharacterMotion.prototype, 'sync').mockImplementation(() => {});
  vi.spyOn(BoardCharacterMotion.prototype, 'ready', 'get').mockReturnValue(true);
  const stop = vi.spyOn(BoardCharacterMotion.prototype, 'stop');
  const turn = vi.spyOn(BoardCharacterMotion.prototype, 'turn');
  const game = fresh(); game.position = 5; mount(game);
  click('roll-dice'); await vi.advanceTimersByTimeAsync(DICE_ROLL_DURATION_MS + DICE_LAND_HOLD_MS + 260 + 50);
  expect(turn).toHaveBeenCalledWith('right', 'down');
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  document.dispatchEvent(new Event('visibilitychange')); await vi.advanceTimersByTimeAsync(5000);
  expect(stop).toHaveBeenCalled(); expect(saved().game).toEqual(game);
  hidden.mockRestore();
});
