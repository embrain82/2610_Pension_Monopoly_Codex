import {normalizeUiProgress} from '../src/ui/turn-notices';
// @vitest-environment happy-dom
import {beforeEach,expect,it} from 'vitest';
import {createGame,startTurn,performAction,autoplay} from '../src/engine/game-engine';
import {buyProduct} from '../src/engine/portfolio-engine';
import {calculateScore} from '../src/engine/scoring-engine';
import {journeyChapter,renderJourney} from '../src/ui/journey-view';
import {renderOngoing} from '../src/ui/ongoing-view';
import {renderTradePreview} from '../src/ui/trade-preview';
import {renderResultHero} from '../src/ui/result-summary';
import {renderDecisionHighlights} from '../src/ui/decision-highlights';
import {renderRetrySuggestion} from '../src/ui/retry-view';
import {renderSettlementModal} from '../src/ui/settlement';
import {PensionRoadApp} from '../src/ui/app';
import {CHECKPOINT_KEY,checkpointVersion,parseCheckpoint} from '../src/ui/play-checkpoint';
import {defaultSave,STORAGE_KEY} from '../src/ui/ui-state';
import type {GameState} from '../src/types';
const game=()=>createGame('simpler-road','balanced',500000,{scenario:'classic',defaultTrading:true,defaultLifecycle:true,updatedFinance:true,settlementLearning:true,ghost:false});
let root:HTMLElement;
const click=(selector:string)=>{const button=root.querySelector<HTMLButtonElement>(selector);expect(button,selector).not.toBeNull();button!.click();};
beforeEach(()=>{localStorage.clear();document.body.innerHTML='<div id="app"></div>';root=document.querySelector('#app')!;localStorage.setItem(STORAGE_KEY,JSON.stringify({...defaultSave,disclaimerAccepted:true,settings:{...defaultSave.settings,motionEffects:'off',reducedMotion:true}}));});
function mount(g:GameState){localStorage.setItem(CHECKPOINT_KEY,JSON.stringify({version:checkpointVersion(g),game:g,modal:null,lastSummary:null,quizCardId:null,quizPicked:null,finalQuizQueue:[],finalQuizTotal:0,finishing:false,defaultOptionAsk:false}));new PensionRoadApp(root);click('[data-action="resume-game"]');}
it.each([0,1,4])('과거 기념카드 %i장 저장판은 금융 상태를 보존하고 탐험 기록만 무시한다',count=>{
 const g=autoplay('retired-journey','passive','balanced',{scenario:'classic',defaultTrading:true,defaultLifecycle:true,updatedFinance:true,settlementLearning:true,ghost:false});
 const journey={chapters:Object.fromEntries(Array.from({length:count},(_,i)=>[i+1,{topic:0,solved:true}]))};
 const raw={...saveCheckpoint(g),uiProgress:{journey,riskNoticeAckTurn:12}};
 const restored=parseCheckpoint(JSON.stringify(raw))!;
 expect(restored.game).toEqual(g);expect(calculateScore(restored.game)).toEqual(calculateScore(g));
 expect(restored.uiProgress).toEqual({riskNoticeAckTurn:12});
});
function saveCheckpoint(g:GameState){return {version:checkpointVersion(g),game:g,modal:null,lastSummary:null,quizCardId:null,quizPicked:null,finalQuizQueue:[],finalQuizTotal:0,finishing:false,defaultOptionAsk:false};}
it('작은 탐험과 앨범을 제거하고 A안 순서 및 장별 목표는 유지한다',()=>{
 mount(game());expect(root.querySelector('[data-action="journey-topic"]')).toBeNull();expect(root.textContent).not.toContain('내 탐험 앨범');expect(root.textContent).not.toContain('기념카드');
 expect(root.textContent).toContain('기초 다지기');
 const html=root.innerHTML;expect(html.indexOf('board-next')).toBeLessThan(html.indexOf('board-funds'));expect(html.indexOf('board-funds')).toBeLessThan(html.indexOf('board-goal'));
 const guide=root.querySelector('details.first-turn-guide')!;expect(guide).not.toBeNull();expect(guide.hasAttribute('open')).toBe(false);
 for(let n=1;n<=4;n++)expect(journeyChapter({...game(),turn:(n-1)*3,awaitingAction:false,currentEventId:null})).toBe(n);
 expect(normalizeUiProgress({journey:{chapters:{1:{topic:999}}}},game())).toEqual({});
});
it('목표를 달성한 뒤 다시 내려오면 회복 도전으로 설명한다',()=>{
 const g={...game(),milestonesHit:['goal-100' as const]};expect(renderJourney(g)).toContain('목표에 도달한 뒤 다시 조금 멀어졌어요');
 expect(renderJourney({...g,goalMonthly:100000,campaign:{...g.campaign!,startingGoal:100000}})).toContain('현재 목표에 도달했어요');
});
it('처리 중 카드와 간결한 미리보기는 엔진의 펀드 결제 일정을 그대로 표시한다',()=>{
 const g={...startTurn(game(),1).state,currentEventId:null,irpCash:3000000,awaitingAction:true,actionsLeft:1};
 const before=JSON.stringify(g),order=buyProduct(g,'shortBond',1000000);
 expect(order.ok).toBe(true);const pending=order.state.pendingOrders.at(-1)!;
 root.innerHTML=renderTradePreview(g,order);expect(root.querySelector('.trade-quick')!.textContent).toContain(`기준가 ${pending.priceTurn}턴 → 결제 ${pending.settlesTurn}턴`);
 expect(root.querySelector('.trade-full')!.hasAttribute('open')).toBe(false);expect(root.textContent).toContain('별도 매매수수료');
 expect(renderOngoing(order.state)).toContain(`${pending.settlesTurn}턴 결제 후 보유 반영`);expect(JSON.stringify(g)).toBe(before);
});
it('두 행동 중 거래 후 마감한 정산은 거래를 지우거나 무행동으로 설명하지 않는다',()=>{
 const g={...startTurn(game(),5).state,currentEventId:null,irpCash:3000000,actionsLeft:2};
 const bought=performAction(g,{kind:'buy',productId:'shortBond',amount:1000000});expect(bought.ok).toBe(true);
 const held=performAction(bought.state,{kind:'hold'});expect(held.summary!.actionLines.length).toBe(2);
 const before=JSON.stringify(held.summary);root.innerHTML=renderSettlementModal(held.summary!,{characters:false});
 expect(root.querySelector('.recap-action')!.textContent).toContain('남은 행동은 추가 거래 없이');expect(root.textContent).not.toContain('이번 턴은 행동하지 않고');expect(root.textContent).not.toContain('새 거래가 없어도');expect(JSON.stringify(held.summary)).toBe(before);
});
it('결과는 실제 선택 기록과 3·6·9턴 분기 연습을 먼저 보여준다',()=>{
 const g=autoplay('simpler-result','steward','balanced',{scenario:'classic',goalMonthly:100000});const before=JSON.stringify(g);
 const highlights=renderDecisionHighlights(g);expect(highlights).toContain('12턴');expect(highlights).toContain('순입출금');
 const retry=renderRetrySuggestion(g);for(const b of g.campaign!.branches)expect(retry).toContain(`data-turn="${b.turn}"`);
 expect(retry).toContain('첫 플레이 성과와 구분');expect(JSON.stringify(g)).toBe(before);
});

it('결과 첫 카드에서 목표용 값과 수령 방식별 세후 금액을 함께 구분한다',()=>{
 const g=autoplay('net-result','steward','balanced',{scenario:'classic'});
 for(const payoutChoice of ['annuity20','lumpSum'] as const){const current={...g,payoutChoice};const score=calculateScore(current);root.innerHTML=renderResultHero(current,false);expect(root.querySelector('.result-net')!.textContent).toContain(payoutChoice==='annuity20'?'세후 평균 월 수령액':'세후 일시 수령액');expect(root.querySelector('.result-net')!.textContent).toContain(Math.round(payoutChoice==='annuity20'?score.payout.monthlyNet:score.payout.net).toLocaleString('ko-KR'));}
});
