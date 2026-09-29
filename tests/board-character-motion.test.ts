// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { BoardCharacterMotion } from '../src/ui/board-character-motion';
import { CORNER_TURN_MS, outgoingDirection } from '../src/ui/board-walk-route';

const keys = ['walk-right', 'walk-down', 'walk-left', 'walk-up', 'turn-right-down', 'turn-down-left', 'turn-left-up', 'turn-up-right'];
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });
const flush = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
function setup() {
  document.body.innerHTML = '<canvas class="board-walk-canvas" width="256" height="256"></canvas>';
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  const fetcher = vi.fn(async () => ({ ok: true, json: async () => Object.fromEntries(keys.map(key => [key, { file: key + '.webp', count: 20, columns: 8, size: 256, fps: 24 }])) }));
  vi.stubGlobal('fetch', fetcher);
  vi.stubGlobal('Image', class { src = ''; decode() { return Promise.resolve(); } });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ clearRect: vi.fn(), drawImage: vi.fn() } as unknown as CanvasRenderingContext2D);
  let tick: FrameRequestCallback = () => {};
  vi.stubGlobal('requestAnimationFrame', vi.fn((fn: FrameRequestCallback) => { tick = fn; return 1; }));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  let now = 0; vi.spyOn(performance, 'now').mockImplementation(() => now);
  return { player: new BoardCharacterMotion(), fetcher, canvas: document.querySelector('canvas')!, advance: (ms: number) => { now += ms; tick(now); } };
}
it('preloads only the selected avatar, preserves gait across renders, and returns to static front on arrival', async () => {
  const { player, fetcher, canvas, advance } = setup();
  player.sync(document.body, 'growth', false, true); await flush();
  expect(fetcher.mock.calls[0]).toEqual(['/assets/characters/directional-walk/dalli/manifest.json']);
  expect(canvas.dataset.playing).toBeUndefined();
  player.sync(document.body, 'growth', true, true); player.walk('right'); advance(100);
  expect(player.ready).toBe(true); expect(canvas.dataset.clip).toBe('walk-right'); expect(canvas.dataset.frame).toBe('4');
  player.sync(document.body, 'growth', true, true); player.walk('right'); advance(100);
  expect(canvas.dataset.frame).toBe('8'); expect(fetcher).toHaveBeenCalledTimes(1);
  player.sync(document.body, 'growth', false, true);
  expect(player.ready).toBe(false); expect(canvas.dataset.playing).toBeUndefined();
});
it('turns in exactly 100ms then resumes the outgoing direction', async () => {
  const { player, canvas, advance } = setup();
  player.sync(document.body, 'stable', true, true); await flush();
  player.walk('right'); player.turn('right', 'down'); advance(50);
  expect(canvas.dataset.clip).toBe('turn-right-down'); expect(canvas.dataset.frame).toBe('9');
  advance(50); expect(canvas.dataset.frame).toBe('19');
  player.walk('down'); expect(canvas.dataset.clip).toBe('walk-down'); expect(canvas.dataset.frame).toBe('1');
  expect(CORNER_TURN_MS).toBe(100);
});
it('maps every edge and wraparound to its walking direction', () => {
  expect([0, 5, 6, 11, 12, 17, 18, 23, 24].map(outgoingDirection)).toEqual(['right', 'right', 'down', 'down', 'left', 'left', 'up', 'up', 'right']);
});
it('reduced motion, hidden tabs and failed loads use the static fallback', async () => {
  const { player, fetcher, canvas } = setup();
  player.sync(document.body, 'growth', true, false); expect(fetcher).not.toHaveBeenCalled();
  fetcher.mockRejectedValueOnce(new Error('offline'));
  player.sync(document.body, 'growth', true, true); await flush();
  expect(player.ready).toBe(false); expect(canvas.dataset.playing).toBeUndefined();
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  player.sync(document.body, 'stable', true, true); expect(fetcher).toHaveBeenCalledTimes(1);
});
it('does not revive playback when loading finishes after stop', async () => {
  const { player, canvas } = setup();
  player.sync(document.body, 'stable', true, true); player.stop(); await flush();
  expect(player.ready).toBe(false); expect(canvas.dataset.playing).toBeUndefined();
});
it('ignores an old character loading after a newer selection', async () => {
  const { player, fetcher, canvas } = setup();
  let resolveOld!: (value: Awaited<ReturnType<typeof fetcher>>) => void;
  fetcher.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve; }));
  player.sync(document.body, 'growth', true, true);
  player.sync(document.body, 'aggressive', true, true); await flush(); player.walk('up');
  resolveOld({ ok: false, json: async () => ({}) }); await flush();
  expect(player.ready).toBe(true); expect(canvas.dataset.clip).toBe('walk-up');
});
