// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { renderCharacterPicker } from '../src/ui/character-picker';
import { syncCharacterSelectionMotion } from '../src/ui/character-selection-motion';
import { updateView } from '../src/ui/dom-view';

afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; delete document.documentElement.dataset.reduceMotion; });
function setup() {
  document.body.innerHTML = renderCharacterPicker('stableGrowth', true, 'test');
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => {});
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  const videos = [...document.querySelectorAll('video')];
  for (const video of videos) Object.defineProperty(video, 'readyState', { configurable: true, value: 2 });
  return { videos, load, play, pause };
}
it('prepares five visible choices once and plays only the selected one at 1.5x', async () => {
  const { videos, load, play } = setup();
  syncCharacterSelectionMotion(document.body);
  expect(videos).toHaveLength(5); expect(load).toHaveBeenCalledTimes(5);
  expect(videos.every(v => v.preload === 'auto')).toBe(true);
  expect(play).toHaveBeenCalledTimes(1); expect(play.mock.instances[0]).toBe(videos[1]);
  expect(videos[1].playbackRate).toBe(1.5); expect(videos[1].dataset.ready).toBe('true');
  syncCharacterSelectionMotion(document.body); expect(load).toHaveBeenCalledTimes(5); expect(play).toHaveBeenCalledTimes(1);
});
it('retains prepared video nodes when the picker changes selection and starts the new choice immediately', () => {
  const { videos, load, play } = setup(); syncCharacterSelectionMotion(document.body);
  videos[1].currentTime = 2;
  updateView(document.body, renderCharacterPicker('growth', true, 'test'));
  syncCharacterSelectionMotion(document.body);
  expect([...document.querySelectorAll('video')]).toEqual(videos);
  expect(load).toHaveBeenCalledTimes(5); expect(play.mock.instances[1]).toBe(videos[3]);
  expect(videos[3].dataset.ready).toBe('true'); expect(videos[1].dataset.ready).toBeUndefined(); expect(videos[1].currentTime).toBe(0);
});
it('does not download or play hidden/inert or reduced-motion pickers', () => {
  const { videos, load, play } = setup(); document.documentElement.dataset.reduceMotion = 'true';
  syncCharacterSelectionMotion(document.body); expect(load).not.toHaveBeenCalled(); expect(play).not.toHaveBeenCalled();
  delete document.documentElement.dataset.reduceMotion; document.body.setAttribute('inert', '');
  syncCharacterSelectionMotion(document.body); expect(load).not.toHaveBeenCalled();
  document.body.removeAttribute('inert');
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  syncCharacterSelectionMotion(document.body); expect(play).not.toHaveBeenCalled(); expect(videos.every(v=>!v.hasAttribute('data-ready'))).toBe(true);
});
it('a late play resolution cannot revive the previously selected video', async () => {
  const { videos, play } = setup(); let finish!: () => void;
  play.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  syncCharacterSelectionMotion(document.body);
  videos[1].closest('button')!.setAttribute('aria-pressed', 'false'); videos[0].closest('button')!.setAttribute('aria-pressed', 'true');
  syncCharacterSelectionMotion(document.body); finish(); await Promise.resolve();
  expect(videos[1].dataset.ready).toBeUndefined(); expect(videos[0].dataset.ready).toBe('true');
});
