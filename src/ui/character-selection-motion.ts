const prepared = new WeakSet<HTMLVideoElement>();
const pending = new WeakSet<HTMLVideoElement>();
const selected = new WeakSet<HTMLVideoElement>();

function visible(video: HTMLVideoElement): boolean {
  return video.isConnected && document.documentElement.dataset.reduceMotion !== 'true' && !document.hidden
    && !video.closest('[inert], [hidden], details:not([open])') && !video.error;
}
function canPlay(video: HTMLVideoElement): boolean {
  return visible(video) && video.closest('.character-choice')?.getAttribute('aria-pressed') === 'true';
}

/** Prepare all visible choices once; keep their decoders across selection renders. */
export function syncCharacterSelectionMotion(root: HTMLElement): void {
  for (const video of root.querySelectorAll<HTMLVideoElement>('.character-selection-video')) {
    video.muted = true;
    video.defaultPlaybackRate = video.playbackRate = 1.5;
    video.onloadeddata = () => syncCharacterSelectionMotion(root);
    video.onerror = () => { video.removeAttribute('data-ready'); video.pause(); };
    if (visible(video)) {
      video.preload = 'auto';
      if (!prepared.has(video)) { prepared.add(video); video.load(); }
    }
    if (!canPlay(video)) {
      video.pause();
      video.removeAttribute('data-ready');
      if (selected.delete(video) && video.readyState >= 1) video.currentTime = 0;
      continue;
    }
    selected.add(video);
    if (video.readyState >= 2) video.dataset.ready = 'true';
    if (video.paused && !pending.has(video)) {
      pending.add(video);
      void video.play().then(() => {
        // An earlier play request must not revive a character deselected meanwhile.
        if (!canPlay(video)) { video.pause(); video.removeAttribute('data-ready'); }
        else if (video.readyState >= 2) video.dataset.ready = 'true';
      }).catch(() => video.removeAttribute('data-ready')).finally(() => pending.delete(video));
    }
  }
}
