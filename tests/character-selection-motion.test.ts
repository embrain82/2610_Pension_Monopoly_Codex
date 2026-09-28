// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { renderCharacterPicker } from '../src/ui/character-picker';
import { syncCharacterSelectionMotion } from '../src/ui/character-selection-motion';

afterEach(() => { vi.restoreAllMocks(); delete document.documentElement.dataset.reduceMotion; });
it('selected character plays at 1.5x; disabled motion and inert pickers stay static', async () => {
  document.body.innerHTML = renderCharacterPicker('stableGrowth', true, 'test');
  const root = document.body;
  const videos = root.querySelectorAll('video');
  expect(videos).toHaveLength(1);
  const video = videos[0];
  expect(video.src).toContain('/woni.mp4');
  const play = vi.spyOn(video, 'play').mockResolvedValue();
  const pause = vi.spyOn(video, 'pause').mockImplementation(() => {});
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  Object.defineProperty(video, 'readyState', { configurable: true, value: 2 });
  syncCharacterSelectionMotion(root);
  expect(video.playbackRate).toBe(1.5);
  expect(play).toHaveBeenCalledOnce();
  expect(video.dataset.ready).toBe('true');
  document.documentElement.dataset.reduceMotion = 'true';
  syncCharacterSelectionMotion(root);
  expect(video.hasAttribute('data-ready')).toBe(false);
  expect(pause).toHaveBeenCalled();
  document.documentElement.dataset.reduceMotion = 'false';
  video.parentElement!.setAttribute('inert', '');
  syncCharacterSelectionMotion(root);
  expect(play).toHaveBeenCalledOnce();
  video.parentElement!.removeAttribute('inert');
  video.dispatchEvent(new Event('error'));
  expect(video.hasAttribute('data-ready')).toBe(false);
});
