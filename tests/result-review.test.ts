// @vitest-environment happy-dom
import {beforeEach,expect,it} from 'vitest';
import {resultCases,resultCaseState,mountResultReview} from '../src/ui/result-review';
import {calculateScore} from '../src/engine/scoring-engine';
import {STORAGE_KEY,defaultSave} from '../src/ui/ui-state';
import {CHECKPOINT_KEY} from '../src/ui/play-checkpoint';
beforeEach(()=>{document.body.innerHTML='<div id="app"></div>';localStorage.clear();});
it('all review cases finish through the engine with finite values and deterministic outcomes',()=>{
 for(const c of resultCases){const g=resultCaseState(c.id)!;expect(g.status).toBe('finished');expect(g.turn).toBe(12);expect(g.pendingOrders).toHaveLength(0);expect(Number.isFinite(calculateScore(g).irpValue)).toBe(true);expect(resultCaseState(c.id)).toEqual(g);}
 expect(calculateScore(resultCaseState('goal-met')!).goalRate).toBeGreaterThanOrEqual(1);
 expect(calculateScore(resultCaseState('goal-unmet')!).goalRate).toBeLessThan(1);
 expect(calculateScore(resultCaseState('quiz-correct')!).knowledgeScore).toBeGreaterThan(calculateScore(resultCaseState('quiz-none')!).knowledgeScore);
});
it('result review uses real result and payout screens without writing save or checkpoint',()=>{
 const saved=JSON.stringify({...defaultSave,playCount:17});localStorage.setItem(STORAGE_KEY,saved);localStorage.setItem(CHECKPOINT_KEY,'original-checkpoint');
 const root=document.querySelector<HTMLElement>('#app')!;mountResultReview(root,'annuity');
 expect(root.querySelector('.result-screen')).not.toBeNull();
 root.querySelector<HTMLButtonElement>('[data-action="open-payout"]')!.click();
 root.querySelector<HTMLButtonElement>('[data-action="choose-payout"][data-choice="lumpSum"]')!.click();
 root.querySelector<HTMLButtonElement>('[data-action="confirm-payout"]')!.click();
 expect(root.querySelector('.result-net')!.textContent).toContain('세후 일시 수령액');
 root.querySelector<HTMLButtonElement>('[data-action="new-seed"]')!.click();
 expect(root.querySelector('.result-screen')).not.toBeNull();
 expect(localStorage.getItem(STORAGE_KEY)).toBe(saved);expect(localStorage.getItem(CHECKPOINT_KEY)).toBe('original-checkpoint');
});
it('unknown case shows catalog without starting a game',()=>{const root=document.querySelector<HTMLElement>('#app')!;mountResultReview(root,'unknown');expect(root.textContent).toContain('찾을 수 없는');expect(root.querySelectorAll('article')).toHaveLength(12);expect(localStorage.length).toBe(0);});
it('score panels explain actual totals and final portfolio is read-only in every case',()=>{
 for(const c of resultCases){
  document.body.innerHTML='<div id="app"></div>';
  const root=document.querySelector<HTMLElement>('#app')!;mountResultReview(root,c.id);
  expect(root.textContent).not.toContain('내 선택으로 돌아보는 이번 판');
  expect(root.querySelector('.maturity-summary')).toBeNull();
  const click=(selector:string)=>root.querySelector<HTMLButtonElement>(selector)!.click();
  click('[data-part="income"]');expect(root.querySelector('#score-detail-panel')?.textContent).toContain('목표 달성률');
  click('[data-part="stability"]');expect(root.querySelector('#score-detail-panel')?.textContent).toContain('자금 부족 횟수');
  expect(root.querySelectorAll('[aria-expanded="true"][data-part]')).toHaveLength(1);
  click('[data-part="stability"]');expect(root.querySelector('#score-detail-panel')?.hasAttribute('hidden')).toBe(true);
  click('[data-part="learning"]');expect(root.querySelector('#score-detail-panel')?.textContent).toContain('시작 기본 4점');
  click('[data-action="open-portfolio"]');
  const modal=root.querySelector('.modal-sheet')!;
  expect(modal.textContent).toContain('최종 포트폴리오');
  expect(modal.textContent).not.toContain('디폴트옵션 · 지금 상태');
  expect(modal.querySelector('[data-action="review-deposit"]')).toBeNull();
  expect(modal.querySelector('[data-action*="practice"]')).toBeNull();
  expect(modal.textContent).toContain('누적 운용손익');
  click('[data-action="close-modal"]');
  expect(root.querySelector('.result-screen')).not.toBeNull();
 }
 expect(localStorage.length).toBe(0);
});
