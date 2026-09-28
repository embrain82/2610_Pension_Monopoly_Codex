import {it,expect} from 'vitest';
import {createGame} from '../src/engine/game-engine';
import {actionAccountSummary,renderActionAccountSummary} from '../src/ui/action-account-summary';
import {renderLearningProgress} from '../src/ui/learning-progress';
import {renderOngoing} from '../src/ui/ongoing-view';
import type {GameState} from '../src/types';
it('누적손익은 납입과 인출을 제외하고 현재 보유/현금/미결제만 합산한다',()=>{
 const g=createGame('account-summary','growth',500000,{scenario:'classic',ghost:false});
 const initial=actionAccountSummary(g);expect(initial.profit).toBe(0);
 const contributed:GameState={...g,irpCash:g.irpCash+1000000,cashFlows:[{turn:1,kind:'contribution',amount:1000000}]};
 expect(actionAccountSummary(contributed).profit).toBe(0);
 const withdrawn:GameState={...contributed,irpCash:contributed.irpCash-500000,cashFlows:[...contributed.cashFlows,{turn:2,kind:'withdrawal',amount:-500000}]};
 expect(actionAccountSummary(withdrawn).profit).toBe(0);
 expect(actionAccountSummary({...withdrawn,irpCash:withdrawn.irpCash+12345}).profit).toBe(12345);
 expect(actionAccountSummary({...withdrawn,irpCash:withdrawn.irpCash-12345}).profit).toBe(-12345);
 expect(renderActionAccountSummary({...withdrawn,irpCash:withdrawn.irpCash+12345})).toContain('+12,345원');
});
it('학습의 기본/퀴즈 점수를 구분하며 진행 중인 일은 실제 현재 턴을 표시한다',()=>{
 const g=createGame('learning-label','growth',500000,{scenario:'classic',ghost:false});
 expect(renderLearningProgress(g)).toContain('시작 기본 4점 · 퀴즈 획득 0/16점');
 const order={id:'test',side:'buy' as const,stage:'received' as const,productId:'tdf' as const,amount:1000000,submittedTurn:5,priceTurn:6,settlesTurn:7};
 const html=renderOngoing({...g,turn:5,pendingOrders:[order]});expect(html).toContain('현재 5/12턴');expect(html).toContain('결제 7턴');
});
