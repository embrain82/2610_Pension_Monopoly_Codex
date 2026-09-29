// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from 'vitest';
import { renderBrandArt } from '../src/ui/design-system';
import { syncHomeHeroMotion } from '../src/ui/home-hero-motion';

afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ''; delete document.documentElement.dataset.reduceMotion; });
function setup() {
  document.body.innerHTML = renderBrandArt('board');
  Object.defineProperty(document, 'hidden', { configurable: true, value: false });
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
  const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  return { video: document.querySelector('video')!, play, pause };
}
it('keeps the image until playback starts and falls back when autoplay is denied', async () => {
  const {video, play} = setup();
  play.mockRejectedValue(new Error('NotAllowedError'));
  syncHomeHeroMotion(document.body);
  await Promise.resolve(); await Promise.resolve();
  expect(video.dataset.ready).toBeUndefined();
  expect(document.querySelector('img')?.hidden).toBe(false);
});
it('does not reveal a late playback response after the page becomes hidden', async () => {
  const {video, play, pause} = setup(); let finish!: () => void;
  play.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  syncHomeHeroMotion(document.body);
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  finish(); await Promise.resolve();
  expect(pause).toHaveBeenCalled(); expect(video.dataset.ready).toBeUndefined();
});
it('pauses for motion settings and resumes silent looping at normal speed', async () => {
  const {video, play, pause} = setup();
  document.documentElement.dataset.reduceMotion = 'true'; syncHomeHeroMotion(document.body);
  expect(play).not.toHaveBeenCalled(); expect(pause).toHaveBeenCalled();
  delete document.documentElement.dataset.reduceMotion; syncHomeHeroMotion(document.body); await Promise.resolve();
  expect(video.dataset.ready).toBe('true'); expect(video.muted).toBe(true); expect(video.loop).toBe(true); expect(video.playbackRate).toBe(1);
  expect(renderBrandArt('journey')).not.toContain('<video'); expect(renderBrandArt('board', false)).not.toContain('<video');
});
