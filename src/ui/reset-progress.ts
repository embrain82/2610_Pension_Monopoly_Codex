import { CHECKPOINT_KEY } from './play-checkpoint';
import { STORAGE_KEY } from './ui-state';

type GameStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>;

/** Remove only this game's two save records; leave other origin data intact. */
export function resetProgress(storage?: GameStorage): boolean {
  const before = new Map<string, string | null>();
  try {
    const active = storage ??= localStorage;
    for (const key of [STORAGE_KEY, CHECKPOINT_KEY]) before.set(key, active.getItem(key));
    for (const key of before.keys()) active.removeItem(key);
    if ([...before.keys()].some(key => active.getItem(key) !== null)) throw new Error('Save removal failed');
    return true;
  } catch {
    // Restore any partially removed record when storage remains writable.
    for (const [key, value] of before) {
      try { if (value !== null) storage?.setItem(key, value); } catch { /* Storage may be blocked. */ }
    }
    return false;
  }
}
