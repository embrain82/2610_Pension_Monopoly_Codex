/** Only the selected, visible picker plays. Static avatar remains as a fallback. */
export function syncCharacterSelectionMotion(root: HTMLElement): void {
  const reduced = document.documentElement.dataset.reduceMotion === 'true';
  for (const video of root.querySelectorAll<HTMLVideoElement>('.character-selection-video')) {
    const allowed = !reduced && !document.hidden && !video.closest('[inert], [hidden], details:not([open])') && !video.error;
    video.muted = true;
    video.defaultPlaybackRate = video.playbackRate = 1.5;
    video.onloadeddata = () => syncCharacterSelectionMotion(root);
    video.onerror = () => { video.removeAttribute('data-ready'); video.pause(); };
    if (!allowed) {
      video.pause();
      video.removeAttribute('data-ready');
      continue;
    }
    if (video.readyState >= 2) video.dataset.ready = 'true';
    if (video.paused) void video.play().catch(() => video.removeAttribute('data-ready'));
  }
}
