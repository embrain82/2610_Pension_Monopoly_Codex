// @vitest-environment happy-dom
import { beforeEach, expect, it } from 'vitest';
import { PensionRoadApp } from '../src/ui/app';
import { defaultSave, loadSave, STORAGE_KEY } from '../src/ui/ui-state';
import { CHECKPOINT_KEY, checkpointVersion, parseCheckpoint } from '../src/ui/play-checkpoint';
import { createGame, startTurn } from '../src/engine/game-engine';
import { renderDiceMarkup, shouldSkipDiceAnimation } from '../src/ui/dice';

let root: HTMLElement;
const click = (action: string) => root.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!.click();
const snapshot = () => parseCheckpoint(localStorage.getItem(CHECKPOINT_KEY));
beforeEach(() => {
  localStorage.clear(); document.body.innerHTML = '<div id="app"></div>'; root = document.querySelector('#app')!;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({...defaultSave, disclaimerAccepted:true, profileAssessment:{profileId:'balanced',origin:'confirmed'}}));
});
it('새 기본값과 이전 system은 기기 효과 끔에도 켜지고 명시적 끄기는 보존한다', () => {
  for (const mode of [undefined, 'system', 'on', 'off']) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({...defaultSave, settings:{...defaultSave.settings,motionEffects:mode}}));
    const settings=loadSave().settings;
    expect(settings.motionEffects).toBe(mode==='off'?'off':'on');
    expect(shouldSkipDiceAnimation(settings.reducedMotion,true,settings.motionEffects)).toBe(mode==='off');
  }
  localStorage.removeItem(STORAGE_KEY);
  expect(loadSave().settings).toMatchObject({motionEffects:'on',speed:1.5});
  new PensionRoadApp(root); click('open-settings');
  expect([...root.querySelectorAll<HTMLOptionElement>('#motion-effects option')].map(x=>x.value)).toEqual(['on','off']);
});
it('첫 캐릭터 선택은 최종 시작 때만 저장하고 성향 및 주사위 상태를 바꾸지 않는다', () => {
  new PensionRoadApp(root); const original=localStorage.getItem(STORAGE_KEY);
  click('begin'); expect(root.querySelector('.modal-character')).not.toBeNull();
  root.querySelector<HTMLButtonElement>('.modal-character [data-avatar="stable"]')!.click();
  expect(root.querySelector('.modal-character [data-avatar="stable"]')!.getAttribute('aria-pressed')).toBe('true');
  expect(localStorage.getItem(STORAGE_KEY)).toBe(original); expect(snapshot()).toBeNull();
  click('character-continue'); expect(root.querySelector('.modal-character')).toBeNull();
  click('confirm-default-option');
  expect(snapshot()!.game).toMatchObject({turn:0,avatarId:'stable',profileId:'balanced'});
  expect(loadSave().avatarId).toBe('stable');
  root.innerHTML=''; new PensionRoadApp(root); click('resume-game');
  expect(root.querySelector('.modal-character')).toBeNull();
});
it('캐릭터 선택창을 취소하면 선택과 판을 저장하지 않는다', () => {
  new PensionRoadApp(root); const original=localStorage.getItem(STORAGE_KEY);
  click('begin'); root.querySelector<HTMLButtonElement>('.modal-character [data-avatar="stable"]')!.click(); click('close-modal');
  expect(localStorage.getItem(STORAGE_KEY)).toBe(original); expect(snapshot()).toBeNull();
  expect(root.querySelector('.title-screen')).not.toBeNull();
});
it('운용 펼침과 용어 도움말은 같은 창의 선택·스크롤·행동을 보존한다', () => {
  const game={...startTurn(createGame('mobile-feedback','balanced',500000,{defaultTrading:true}),5).state,currentEventId:null,awaitingAction:true,actionsLeft:2};
  localStorage.setItem(CHECKPOINT_KEY,JSON.stringify({version:checkpointVersion(game),game,modal:'action',lastSummary:null,quizCardId:null,quizPicked:null,finalQuizQueue:[],finalQuizTotal:0,finishing:false,defaultOptionAsk:false}));
  new PensionRoadApp(root); click('resume-game');
  const dialog=root.querySelector<HTMLElement>('.modal-action')!;
  const heading=root.querySelector('.action-menu-heading');
  const button=root.querySelector<HTMLButtonElement>('[data-action="show-all-actions"]')!;
  dialog.scrollTop=150; button.focus(); click('show-all-actions');
  expect(root.querySelector('.modal-action')).toBe(dialog); expect(root.querySelector('.action-menu-heading')).toBe(heading);
  expect(dialog.scrollTop).toBe(150); expect(document.activeElement).toBe(button);
  expect(button.getAttribute('aria-expanded')).toBe('true');
  expect(root.querySelectorAll('.purpose-choice')).toHaveLength(2);
  expect(root.querySelectorAll('#all-actions-panel .action-menu-card')).toHaveLength(6);
  expect(root.querySelectorAll('[data-action="do-hold"]')).toHaveLength(1);
  const help=root.querySelector<HTMLDetailsElement>('.action-menu-heading .term-help')!;
  expect(help).not.toBeNull(); expect(root.querySelector('.beginner-action-menu > .term-help')).toBeNull();
  help.open=true; click('show-all-actions');
  expect(root.querySelector<HTMLElement>('#all-actions-panel')!.hidden).toBe(true);
  expect(root.querySelector<HTMLDetailsElement>('.action-heading-help')!.open).toBe(true);
  help.querySelector('summary')!.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  expect(help.open).toBe(false); expect(root.querySelector('.modal-action')).toBe(dialog);
  expect(snapshot()!.game).toEqual(game);
});
it('바닥판을 제거해도 주사위 2개와 개별 그림자는 유지한다', () => {
  root.innerHTML=renderDiceMarkup([3,6],true);
  expect(root.querySelector('.dice-table')).toBeNull();
  expect(root.querySelectorAll('.dice-shadow')).toHaveLength(2);
  expect(root.querySelectorAll('.dice-slot .dice')).toHaveLength(2);
});
