// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { BoardCharacterMotion, removeWalkBackground } from '../src/ui/board-character-motion';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ''; });

it('removes border whites while preserving enclosed white highlights and colored edges', () => {
  const data = new Uint8ClampedArray(5 * 5 * 4).fill(255);
  for (let y = 1; y < 4; y++) for (let x = 1; x < 4; x++) {
    const i = (y * 5 + x) * 4;
    data[i] = 245; data[i + 1] = 190; data[i + 2] = 120;
  }
  const center = 12 * 4;
  data[center] = data[center + 1] = data[center + 2] = 255;
  removeWalkBackground(data, 5, 5);
  expect(data[3]).toBe(0);
  expect(data[6 * 4 + 3]).toBe(255);
  expect(data[center + 3]).toBe(255);
});

function setup() {
  document.body.innerHTML = '<canvas class="board-walk-canvas" width="256" height="256"></canvas>';
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  const create = document.createElement.bind(document);
  let video: HTMLVideoElement;
  vi.spyOn(document, 'createElement').mockImplementation((name: string) => {
    const el = create(name);
    if (name === 'video') {
      video = el as HTMLVideoElement;
      Object.defineProperty(video, 'readyState', { configurable: true, value: 2 });
      Object.defineProperty(video, 'paused', { configurable: true, get: () => paused });
    }
    return el;
  });
  let paused = true;
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(async () => { paused = false; });
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => { paused = true; });
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(), getImageData: () => ({ data: new Uint8ClampedArray(256 * 256 * 4).fill(255) }), putImageData: vi.fn()
  } as unknown as CanvasRenderingContext2D);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  return { player: new BoardCharacterMotion(), play, video: () => video!, canvas: document.querySelector('canvas')! };
}

it('preloads only the current avatar, plays across tile renders, and stops on arrival', async () => {
  const { player, play, video, canvas } = setup();
  player.sync(document.body, 'growth', false, true);
  expect(video().src).toContain('/dalli-walk-aligned.mp4'); expect(play).not.toHaveBeenCalled();
  player.sync(document.body, 'growth', true, true); await Promise.resolve();
  expect(player.ready).toBe(true); expect(video().playbackRate).toBe(1.5); expect(canvas.dataset.playing).toBe('true');
  player.sync(document.body, 'growth', true, true); expect(play).toHaveBeenCalledOnce();
  player.sync(document.body, 'growth', false, true); expect(player.ready).toBe(false); expect(canvas.dataset.playing).toBeUndefined();
  player.sync(document.body, 'stable', false, true); expect(video().src).toContain('/olli-walk-aligned.mp4');
});

it('reduced motion, hidden tabs and rejected playback retain the static fallback', async () => {
  const { player, play, canvas } = setup();
  player.sync(document.body, 'growth', true, false); expect(play).not.toHaveBeenCalled();
  play.mockRejectedValueOnce(new Error('autoplay blocked'));
  player.sync(document.body, 'growth', true, true); await Promise.resolve(); await Promise.resolve();
  expect(player.ready).toBe(false); expect(canvas.dataset.playing).toBeUndefined();
  player.sync(document.body, 'growth', true, true); expect(play).toHaveBeenCalledOnce();
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  player.sync(document.body, 'stable', true, true); expect(play).toHaveBeenCalledOnce();
});
