const pending = new WeakSet<HTMLVideoElement>();

function canPlay(video: HTMLVideoElement): boolean {
  return video.isConnected && !document.hidden && !video.error
    && document.documentElement.dataset.reduceMotion !== 'true'
    && !video.closest('[inert], [hidden]');
}

/** Preserve the static artwork until playback actually starts. */
export function syncHomeHeroMotion(root: HTMLElement): void {
  for (const video of root.querySelectorAll<HTMLVideoElement>('.home-hero-video')) {
    video.muted = true;
    video.playbackRate = 1;
    video.onloadeddata = () => syncHomeHeroMotion(root);
    video.onplaying = () => {
      if (canPlay(video)) video.dataset.ready = 'true';
      else { video.pause(); video.removeAttribute('data-ready'); }
    };
    video.onerror = () => { video.pause(); video.removeAttribute('data-ready'); };
    if (!canPlay(video)) {
      video.pause();
      video.removeAttribute('data-ready');
      continue;
    }
    video.preload = 'auto';
    if (!video.paused && video.readyState >= 2) video.dataset.ready = 'true';
    if (video.paused && !pending.has(video)) {
      pending.add(video);
      void video.play().then(() => {
        if (!canPlay(video)) { video.pause(); video.removeAttribute('data-ready'); }
        else video.dataset.ready = 'true';
      }).catch(() => video.removeAttribute('data-ready')).finally(() => pending.delete(video));
    }
  }
}
