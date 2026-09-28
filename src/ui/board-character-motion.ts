import type { AvatarId } from '../types';
import { CHARACTERS } from './avatars';

/** Only near-white regions connected to an outer edge are removed. */
export function removeWalkBackground(data: Uint8ClampedArray, width: number, height: number, seen = new Uint8Array(width * height), queue = new Int32Array(width * height)): void {
  const count = width * height;
  seen.fill(0); let head = 0; let tail = 0;
  const add = (pixel: number) => {
    if (seen[pixel]) return;
    seen[pixel] = 1;
    const i = pixel * 4;
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    const max = Math.max(data[i], data[i + 1], data[i + 2]);
    if (min > 222 && max - min < 18) queue[tail++] = pixel;
  };
  for (let x = 0; x < width; x++) { add(x); add(count - width + x); }
  for (let y = 0; y < height; y++) { add(y * width); add(y * width + width - 1); }
  while (head < tail) {
    const pixel = queue[head++]; data[pixel * 4 + 3] = 0;
    const x = pixel % width;
    if (x > 0) add(pixel - 1);
    if (x < width - 1) add(pixel + 1);
    if (pixel >= width) add(pixel - width);
    if (pixel < count - width) add(pixel + width);
  }
}

/** One off-DOM decoder per app, never one decoder per board tile. */
export class BoardCharacterMotion {
  private video: HTMLVideoElement | null = null;
  private asset = '';
  private target: HTMLCanvasElement | null = null;
  private moving = false;
  private failed = false;
  private starting = false;
  private epoch = 0;
  private raf = 0;
  private lastTime = -1;
  private readonly seen = new Uint8Array(256 * 256);
  private readonly queue = new Int32Array(256 * 256);

  get ready(): boolean { return Boolean(this.moving && !this.failed && this.video && this.video.readyState >= 2 && !this.video.paused); }

  sync(root: HTMLElement, avatar: AvatarId | undefined, moving: boolean, enabled: boolean): void {
    const target = root.querySelector<HTMLCanvasElement>('.board-walk-canvas');
    if (!enabled || !avatar || !target || document.hidden) { this.stop(); return; }
    if (this.target !== target) { this.target?.removeAttribute('data-playing'); this.target = target; }
    const asset = CHARACTERS[avatar].asset;
    if (this.asset !== asset) {
      this.stop(); this.asset = asset; this.target = target; this.failed = false;
      if (!this.video) {
        this.video = document.createElement('video');
        this.video.muted = true; this.video.playsInline = true; this.video.loop = true; this.video.preload = 'auto';
        this.video.onloadeddata = () => { if (this.moving) this.start(); };
        this.video.onerror = () => { this.failed = true; this.stop(); };
      }
      this.video.src = `/assets/characters/walk/${asset}-walk-aligned.mp4`;
      this.video.load();
    }
    if (!moving) { this.stop(); return; }
    this.moving = true;
    if (this.video && this.video.readyState >= 2) this.start();
  }

  stop(): void {
    this.epoch++; this.moving = false; this.starting = false;
    cancelAnimationFrame(this.raf); this.raf = 0;
    this.video?.pause(); this.target?.removeAttribute('data-playing'); this.lastTime = -1;
  }

  private start(): void {
    const video = this.video;
    if (!video || this.failed || !this.moving || this.starting) return;
    if (!video.paused) { this.target?.setAttribute('data-playing', 'true'); return; }
    this.starting = true;
    const epoch = this.epoch;
    video.currentTime = 0; video.defaultPlaybackRate = video.playbackRate = 1.5;
    void video.play().then(() => {
      if (epoch !== this.epoch || !this.moving) return;
      this.starting = false; this.paint();
    }).catch(() => {
      if (epoch !== this.epoch) return;
      this.failed = true; this.stop();
    });
  }

  private paint = (): void => {
    const video = this.video, target = this.target;
    if (!this.moving || !video || !target?.isConnected || document.hidden) { this.stop(); return; }
    try {
      if (video.readyState >= 2 && video.currentTime !== this.lastTime) {
        const ctx = target.getContext('2d', { willReadFrequently: true });
        if (!ctx) { this.failed = true; this.stop(); return; }
        ctx.drawImage(video, 0, 0, 256, 256);
        const frame = ctx.getImageData(0, 0, 256, 256);
        removeWalkBackground(frame.data, 256, 256, this.seen, this.queue);
        ctx.putImageData(frame, 0, 0);
        target.dataset.playing = 'true'; this.lastTime = video.currentTime;
      }
      this.raf = requestAnimationFrame(this.paint);
    } catch { this.failed = true; this.stop(); }
  };
}
