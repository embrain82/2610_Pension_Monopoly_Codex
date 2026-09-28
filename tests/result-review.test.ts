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
