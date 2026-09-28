// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { shouldSkipDiceAnimation } from '../src/ui/dice';
import { defaultSave, STORAGE_KEY, loadSave } from '../src/ui/ui-state';
import { PensionRoadApp } from '../src/ui/app';

beforeEach(() => { localStorage.clear(); document.body.innerHTML = '<div id="app"></div>'; });
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });
it.each([false,true])('기기 동작 줄이기 %s에서도 명시적 선택이 우선한다', os => {
  expect(shouldSkipDiceAnimation(false, os, 'on')).toBe(false);
  expect(shouldSkipDiceAnimation(true, os, 'on')).toBe(false);
  expect(shouldSkipDiceAnimation(false, os, 'off')).toBe(true);
  expect(shouldSkipDiceAnimation(false, os, 'system')).toBe(os);
});
it.each([false,true])('이전 동작 줄이기 %s 저장을 보존한다', reducedMotion => {
  localStorage.setItem(STORAGE_KEY,JSON.stringify({...defaultSave,settings:{...defaultSave.settings,motionEffects:undefined,reducedMotion}}));
  const saved=loadSave().settings;
  expect(saved.reducedMotion).toBe(reducedMotion);
  expect(shouldSkipDiceAnimation(saved.reducedMotion, false, saved.motionEffects)).toBe(reducedMotion);
});
it('OS 동작 줄이기가 켜져도 게임 효과 켜기를 저장하고 실제 주사위 오버레이를 실행한다', async () => {
  vi.useFakeTimers();
  // happy-dom does not advance WAAPI; preserve browser duration and cancellation.
  vi.spyOn(Element.prototype, 'animate').mockImplementation((_frames, options) => {
    const duration=typeof options==='number'?options:Number(options?.duration ?? 0);
    let reject!: (error: Error) => void, timer: ReturnType<typeof setTimeout>;
    const finished=new Promise<Animation>((resolve, fail) => { reject=fail; timer=setTimeout(()=>resolve({} as Animation),duration); });
    return { finished, cancel:()=>{clearTimeout(timer);reject(new Error('cancelled'));} } as Animation;
  });
  const native = window.matchMedia.bind(window);
  vi.spyOn(window,'matchMedia').mockImplementation(query => {
    const result=native(query);
    Object.defineProperty(result,'matches',{value:query==='(prefers-reduced-motion: reduce)'});
    return result;
  });
  localStorage.setItem(STORAGE_KEY,JSON.stringify({...defaultSave,profileAssessment:{profileId:'balanced',origin:'confirmed'},disclaimerAccepted:true,quickGuideSeen:true,howtoSeen:true}));
  const root=document.querySelector<HTMLElement>('#app')!; new PensionRoadApp(root);
  const click=(action:string)=>root.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!.click();
  expect(document.documentElement.dataset.reduceMotion).toBe('false');
  click('open-settings');
  const select=root.querySelector<HTMLSelectElement>('#motion-effects')!;
  select.value='on'; select.dispatchEvent(new Event('change',{bubbles:true}));
  expect(loadSave().settings.motionEffects).toBe('on');
  expect(document.documentElement.dataset.reduceMotion).toBe('false');
  click('close-modal'); click('begin');root.querySelector<HTMLButtonElement>('[data-action="character-continue"]')?.click(); click('prepare-no-option'); click('confirm-default-option'); click('roll-dice');
  expect(root.querySelector('.dice-overlay .rolling')).not.toBeNull();
  await vi.advanceTimersByTimeAsync(10000);
  expect(root.querySelector('.dice-overlay')).toBeNull();
  expect(root.textContent).toContain('1/12');
});
