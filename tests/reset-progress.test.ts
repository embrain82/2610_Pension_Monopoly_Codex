// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { PensionRoadApp } from '../src/ui/app';
import { resetProgress } from '../src/ui/reset-progress';
import { defaultSave, loadSave, STORAGE_KEY } from '../src/ui/ui-state';
import { createGame } from '../src/engine/game-engine';
import { CHECKPOINT_KEY, checkpointVersion } from '../src/ui/play-checkpoint';

let root: HTMLElement;
const click = (action: string) => root.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!.click();
beforeEach(() => {
  localStorage.clear(); document.body.innerHTML='<div id="app"></div>'; root=document.querySelector('#app')!;
  localStorage.setItem(STORAGE_KEY,JSON.stringify({...defaultSave,playCount:3,bestScore:90,disclaimerAccepted:true,avatarId:'stable',profileAssessment:{profileId:'balanced',origin:'confirmed'},settings:{...defaultSave.settings,motionEffects:'off',speed:2},quickGuideSeen:true,howtoSeen:true}));
  const game=createGame('reset-test','balanced',500000,{scenario:'classic'});
  localStorage.setItem(CHECKPOINT_KEY,JSON.stringify({version:checkpointVersion(game),game,modal:null,lastSummary:null,quizCardId:null,quizPicked:null,finalQuizQueue:[],finalQuizTotal:0,finishing:false,defaultOptionAsk:false}));
  localStorage.setItem('unrelated-app','keep');
});
afterEach(()=>vi.restoreAllMocks());
it('초기화 열기·취소·Esc는 기록과 설정을 바꾸지 않는다',()=>{
  const before=[localStorage.getItem(STORAGE_KEY),localStorage.getItem(CHECKPOINT_KEY)];
  new PensionRoadApp(root); click('open-reset');
  expect(root.querySelector('.modal-reset')!.textContent).toContain('되돌릴 수 없습니다');
  expect(document.activeElement?.getAttribute('data-action')).not.toBe('confirm-reset');
  click('close-modal'); click('open-reset');
  document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  expect(root.querySelector('.modal-reset')).toBeNull();
  expect([localStorage.getItem(STORAGE_KEY),localStorage.getItem(CHECKPOINT_KEY)]).toEqual(before);
});
it('확정하면 이 게임 기록만 삭제하고 재접속 후 첫 판 캐릭터 선택이 다시 나온다',()=>{
  const reload=vi.spyOn(window.location,'reload').mockImplementation(()=>{});
  new PensionRoadApp(root); click('open-reset'); click('confirm-reset');
  expect(reload).toHaveBeenCalledOnce();
  expect(localStorage.getItem(STORAGE_KEY)).toBeNull(); expect(localStorage.getItem(CHECKPOINT_KEY)).toBeNull();
  expect(localStorage.getItem('unrelated-app')).toBe('keep');
  expect(loadSave()).toEqual(defaultSave);
  root.remove(); document.body.innerHTML='<div id="app2"></div>';root=document.querySelector('#app2')!;
  new PensionRoadApp(root);
  expect(root.querySelector('[data-action="resume-game"]')).toBeNull();
  expect(root.querySelector<HTMLInputElement>('#disclaimer')!.checked).toBe(false);
  const agree=root.querySelector<HTMLInputElement>('#disclaimer')!; agree.checked=true; agree.dispatchEvent(new Event('change',{bubbles:true}));
  click('begin'); expect(root.querySelector('.modal-character')).not.toBeNull();
});
it('저장소 삭제가 거부되면 부분 삭제를 복구하고 실패를 반환한다',()=>{
  const records=new Map([[STORAGE_KEY,'settings'],[CHECKPOINT_KEY,'game'],['other','keep']]);
  expect(resetProgress({getItem:key=>records.get(key)??null,setItem:(key,value)=>{records.set(key,value);},removeItem:key=>{if(key===CHECKPOINT_KEY)throw new Error('blocked');records.delete(key);}})).toBe(false);
  expect(records.get(STORAGE_KEY)).toBe('settings'); expect(records.get(CHECKPOINT_KEY)).toBe('game'); expect(records.get('other')).toBe('keep');
});
it('저장소 접근 오류는 완료로 표시하거나 페이지를 다시 열지 않는다',()=>{
  new PensionRoadApp(root); click('open-reset');
  const reload=vi.spyOn(window.location,'reload').mockImplementation(()=>{});
  vi.spyOn(localStorage,'removeItem').mockImplementation(()=>{throw new Error('blocked');});
  click('confirm-reset'); expect(reload).not.toHaveBeenCalled();
  expect(root.querySelector('.modal-reset')!.textContent).toContain('초기화를 완료하지 못했습니다');
});
