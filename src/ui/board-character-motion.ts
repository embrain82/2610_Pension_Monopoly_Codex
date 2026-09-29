import type { AvatarId } from '../types';
import { CHARACTERS } from './avatars';
import { CORNER_TURN_MS, turnKey, type WalkDirection } from './board-walk-route';

type Clip = { file: string; count: number; columns: number; size: number; fps: number; renderScale?: number };
type LoadedClip = Clip & { image: HTMLImageElement };
const KEYS = ['walk-right', 'walk-down', 'walk-left', 'walk-up', 'turn-right-down', 'turn-down-left', 'turn-left-up', 'turn-up-right'];

/** Decode only the selected character. Transparent atlases need no per-frame pixel processing. */
export class BoardCharacterMotion {
  private asset = '';
  private clips: Record<string, LoadedClip> = {};
  private target: HTMLCanvasElement | null = null;
  private moving = false;
  private generation = 0;
  private raf = 0;
  private key = 'walk-down';
  private started = 0;

  get ready(): boolean { return this.moving && Boolean(this.clips[this.key]); }

  sync(root: HTMLElement, avatar: AvatarId | undefined, moving: boolean, enabled: boolean): void {
    const target = root.querySelector<HTMLCanvasElement>('.board-walk-canvas');
    if (!enabled || !avatar || !target || document.hidden) { this.stop(); return; }
    if (this.target !== target) { this.target?.removeAttribute('data-playing'); this.target = target; }
    const asset = CHARACTERS[avatar].asset;
    if (asset !== this.asset) {
      this.stop(); this.asset = asset; this.clips = {};
      void this.load(asset, ++this.generation);
    }
    if (!moving) { this.stop(); return; }
    if (!this.moving) this.started = performance.now();
    this.moving = true;
    if (!this.raf && this.ready) this.paint();
  }

  walk(direction: WalkDirection): void { this.select(`walk-${direction}`); }
  turn(from: WalkDirection, to: WalkDirection): void { this.select(turnKey(from, to)); }

  stop(): void {
    this.moving = false;
    cancelAnimationFrame(this.raf); this.raf = 0;
    this.target?.removeAttribute('data-playing');
    this.target?.removeAttribute('data-clip');
    this.key = 'walk-down';
  }

  private select(key: string): void {
    if (this.key !== key) { this.key = key; this.started = performance.now(); }
    if (this.ready) { cancelAnimationFrame(this.raf); this.raf = 0; this.paint(); }
  }

  private async load(asset: string, generation: number): Promise<void> {
    try {
      const base = `/assets/characters/directional-walk/${asset}/`;
      const response = await fetch(`${base}manifest.json`);
      if (!response.ok) throw new Error('Motion unavailable');
      const manifest = await response.json() as Record<string, Clip>;
      const entries = await Promise.all(KEYS.map(async key => {
        const clip = manifest[key];
        if (!clip || clip.count < 2 || clip.columns < 1 || clip.size !== 256) throw new Error('Invalid motion');
        const image = new Image(); image.src = base + clip.file; await image.decode();
        return [key, { ...clip, image }] as const;
      }));
      if (generation !== this.generation) return;
      this.clips = Object.fromEntries(entries);
      if (this.moving && !this.raf) this.paint();
    } catch {
      // The static front-facing character and original hop remain available on load failure.
      if (generation === this.generation) { this.clips = {}; this.stop(); }
    }
  }

  private paint = (): void => {
    this.raf = 0;
    const target = this.target, clip = this.clips[this.key];
    if (!this.moving || !target?.isConnected || document.hidden || !clip) { this.stop(); return; }
    const ctx = target.getContext('2d');
    if (!ctx) { this.stop(); return; }
    const elapsed = performance.now() - this.started;
    const frame = this.key.startsWith('turn-')
      ? Math.floor(Math.min(1, elapsed / CORNER_TURN_MS) * (clip.count - 1))
      : 1 + Math.floor(elapsed / 1000 * clip.fps * 1.5) % (clip.count - 1);
    ctx.clearRect(0, 0, 256, 256);
    ctx.drawImage(clip.image, (frame % clip.columns) * clip.size, Math.floor(frame / clip.columns) * clip.size, clip.size, clip.size, 0, 0, 256, 256);
    target.style.transform = `scale(${clip.renderScale ?? 1})`;
    target.style.transformOrigin = '50% 92%';
    target.dataset.playing = 'true'; target.dataset.clip = this.key; target.dataset.frame = String(frame);
    this.raf = requestAnimationFrame(this.paint);
  };
}
