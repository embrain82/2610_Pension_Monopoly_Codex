// @vitest-environment happy-dom
import { beforeEach, expect, it } from 'vitest';
import { createGame, startTurn, performAction, resolveActionAmount, type GameAction } from '../src/engine/game-engine';
import { buyDecision } from '../src/engine/action-availability';
import { previewContribution } from '../src/engine/contribution-engine';
import { previewDefaultOptIn, nextDefaultCommand } from '../src/engine/default-trade-engine';
import { portfolioValue, settleAllOrders } from '../src/engine/portfolio-engine';
import { scopedHolding } from '../src/engine/position-engine';
import { PensionRoadApp } from '../src/ui/app';
import { portfolioComposition, holdingComposition, renderPortfolio } from '../src/ui/portfolio-view';
import { CHECKPOINT_KEY, parseCheckpoint } from '../src/ui/play-checkpoint';
import { defaultSave, STORAGE_KEY } from '../src/ui/ui-state';
import type { GameState } from '../src/types';

let root: HTMLElement;
const game = (): GameState => ({ ...startTurn(createGame('d2b-qa', 'growth', 500000,
 { ghost: false, scenario: 'classic', defaultTrading: true, contributionPacing: true }), 5).state,
 currentEventId: null, irpCash: 2_000_000, cash: 10_000_000, actionsLeft: 2, awaitingAction: true });
const saved = () => parseCheckpoint(localStorage.getItem(CHECKPOINT_KEY))!;
const click = (selector: string) => { const b = root.querySelector<HTMLElement>(selector); expect(b, selector).not.toBeNull(); b!.click(); };
function mount(g: GameState) {
 localStorage.setItem(CHECKPOINT_KEY, JSON.stringify({version:'c3', game:g, modal:'action', lastSummary:null,
 quizCardId:null, quizPicked:null, finalQuizQueue:[], finalQuizTotal:0, finishing:false, defaultOptionAsk:false}));
 new PensionRoadApp(root); click('[data-action="resume-game"]'); root.querySelector<HTMLButtonElement>('[data-action="show-all-actions"][aria-expanded="false"]')?.click();
}
const change = (id: string, value: string) => { const e=root.querySelector<HTMLInputElement|HTMLSelectElement>(id)!;e.value=value;e.dispatchEvent(new Event('change',{bubbles:true})); };
beforeEach(() => {
 localStorage.clear(); document.body.innerHTML='<div id="app"></div>';root=document.querySelector('#app')!;
 localStorage.setItem(STORAGE_KEY,JSON.stringify({...defaultSave,disclaimerAccepted:true,quickGuideSeen:true,howtoSeen:true,settings:{...defaultSave.settings,motionEffects:'off',reducedMotion:true}}));
});

it.each(['contribute','buy','sell','switch','rebalance'] as const)('%s 입력→미리보기→확정이며 실제 실행 결과는 기존 엔진과 같다', kind => {
 const g=game();mount(g);click(`[data-view="${kind}"]`);
 const panels=root.querySelectorAll('.order-split>section');expect(panels).toHaveLength(2);
 expect(panels[0].className).toBe('order-input');expect(panels[1].className).toBe('order-review');
 expect(root.querySelectorAll('.order-tabs button')).toHaveLength(5);
 expect(root.querySelector('.order-tabs [aria-pressed="true"]')?.getAttribute('data-view')).toBe(kind);
 if(kind==='buy')change('#buy-product','tdf');
 if(kind==='sell')change('#sell-product','deposit');
 if(kind==='switch'){change('#switch-from','balanced');change('#switch-to','tdf');}
 const amount=resolveActionAmount(g,kind,'default',kind==='sell'?'deposit':kind==='switch'?'balanced':'tdf');
 const choice:GameAction=kind==='buy'?{kind,productId:'tdf',amount}:kind==='sell'?{kind,productId:'deposit',amount}:
 kind==='switch'?{kind,fromProductId:'balanced',toProductId:'tdf',amount}:kind==='contribute'?{kind,amount:previewContribution(g,{requested:amount}).accepted}:{kind};
 const expected=performAction(g,choice);expect(expected.ok).toBe(true);expect(saved().game).toEqual(g);
 const submit=root.querySelector<HTMLButtonElement>(`[data-action="do-${kind}"]`)!;expect(root.querySelector('.order-confirm')!.contains(submit)).toBe(true);expect(panels[1].compareDocumentPosition(submit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();submit.click();
 expect(saved().game).toEqual(expected.state);
});

it('일반 주문 탭·금액·포트폴리오 왕복은 거래하지 않고 입력 선택을 유지한다', () => {
 const g=game();mount(g);click('[data-view="switch"]');change('#switch-from','balanced');change('#switch-to','tdf');click('[data-preset="half"]');
 click('[data-action="action-portfolio"]');click('[data-action="return-action"]');
 expect(root.querySelector<HTMLSelectElement>('#switch-from')!.value).toBe('balanced');expect(root.querySelector<HTMLSelectElement>('#switch-to')!.value).toBe('tdf');
 expect(root.querySelector('[data-preset="half"]')?.getAttribute('aria-pressed')).toBe('true');
 click('.order-tabs [data-view="sell"]');click('.order-tabs [data-view="buy"]');expect(saved().game).toEqual(g);
 click('[data-action="close-modal"]');expect(saved().game).toEqual(g);
});

it('첫 전액 주문 이후 일반 탭도 불가 사유와 실제 사용 가능 여부를 반영한다', () => {
 const g=performAction(game(),{kind:'buy',productId:'tdf',amount:2_000_000}).state;mount(g);click('[data-view="sell"]');
 for(const kind of ['buy','rebalance']){
  const button=root.querySelector<HTMLButtonElement>(`.order-tabs [data-view="${kind}"]`)!;expect(button.disabled).toBe(true);
  expect(root.querySelector('#'+button.getAttribute('aria-describedby'))?.textContent!.length).toBeGreaterThan(5);
  button.dispatchEvent(new MouseEvent('click',{bubbles:true}));expect(saved().game).toEqual(g);
 }
});

it('위험한도 조정 미리보기와 확인 실행은 같은 한도 금액을 사용한다', () => {
 const g={...game(),irpCash:300_000_000};mount(g);click('[data-view="buy"]');change('#buy-product','equityEtf');click('[data-preset="max"]');
 const decision=buyDecision(g,'equityEtf',resolveActionAmount(g,'buy','max','equityEtf'));expect(decision.kind).toBe('confirm');if(decision.kind!=='confirm')return;
 expect(root.querySelector('.order-review')?.textContent).toContain('한도까지 조정한 금액');
 click('[data-action="do-buy"]');expect(saved().game).toEqual(g);click('[data-action="confirm-buy-cap"]');
 expect(saved().game).toEqual(performAction(g,{kind:'buy',productId:'equityEtf',amount:decision.capped}).state);
});

it('디폴트 입력 노드·초점을 유지하며 잘못된 금액은 확정할 수 없다', () => {
 const g=game();mount(g);click('[data-view="default"]');const input=root.querySelector<HTMLInputElement>('#default-trade-amount')!;input.focus();
 for(const value of ['9','99999','3000000','123456']){
  input.value=value;input.dispatchEvent(new Event('input',{bubbles:true}));
  expect(root.querySelector('#default-trade-amount')).toBe(input);expect(document.activeElement).toBe(input);
  expect(input.value).toBe(value);expect(saved().game).toEqual(g);
  expect(root.querySelector<HTMLButtonElement>('[data-action="submit-default-trade"]')!.disabled).toBe(value!=='123456');
 }
 const option=root.querySelector<HTMLSelectElement>('#default-trade-option')!.value;
 click('[data-action="action-portfolio"]');click('[data-action="return-action"]');expect(root.querySelector<HTMLInputElement>('#default-trade-amount')!.value).toBe('123456');
 expect(root.querySelector<HTMLSelectElement>('#default-trade-option')!.value).toBe(option);
});

it('직접·옵션·미결제·대기자금 분류는 예약/부분결제/환매 상태 모두 총액과 일치한다', () => {
 const g=game(),pending=previewDefaultOptIn(g,'midRisk',1_000_000).state;
 const held=settleAllOrders(pending);
 const out=performAction({...held,actionsLeft:2,awaitingAction:true},{kind:'default-opt-out',fraction:.5,commandId:nextDefaultCommand(held)}).state;
 for(const state of [g,pending,held,out]){
  const snapshot=structuredClone(state),parts=portfolioComposition(state);
  const heldParts=holdingComposition(state);
  expect(heldParts).toHaveLength(7);
  expect(heldParts.reduce((sum,p)=>sum+p.amount,0)).toBeCloseTo(state.holdings.reduce((sum,h)=>sum+h.amount,0),5);
  expect(heldParts.find(p=>p.id==='default')!.amount).toBe(parts[1].amount);
  expect(parts.reduce((s,p)=>s+p.amount,0)).toBeCloseTo(portfolioValue(state),5);
  expect(parts.find(p=>p.id==='pending')!.amount).toBe(state.pendingOrders.reduce((s,o)=>s+o.amount,0));
  root.innerHTML=renderPortfolio(state);expect(root.querySelector('.portfolio-categories')).toBeNull();
  expect(root.querySelector('.portfolio-direct')?.textContent).toContain(Math.round(scopedHolding(state,'deposit').amount).toLocaleString('ko-KR')+'원');
  expect(root.querySelector('.portfolio-risk')?.textContent).toContain('전체 IRP');
  expect(state).toEqual(snapshot);
 }
});


it('주문 입력 후 스크롤은 숫자 입력 초점을 해제하고 금액·초안을 유지한다', () => {
 const g=game();mount(g);click('[data-view="default"]');change('#default-trade-amount','123456');
 const field=root.querySelector<HTMLInputElement>('#default-trade-amount')!;field.focus();
 field.dispatchEvent(new WheelEvent('wheel',{deltaY:400,bubbles:true,cancelable:true}));
 expect(document.activeElement).not.toBe(field);expect(field.value).toBe('123456');
 expect(saved().actionContext!.draft!.amount).toBe(123456);expect(saved().game).toEqual(g);
});


it('상품 그래프는 전액 대기·미결제 상태에 허위 비중을 만들지 않고 상세보다 먼저 읽힌다', () => {
 const g={...game(),holdings:[]};
 root.innerHTML=renderPortfolio(g);
 expect(root.querySelector('.portfolio-donut')).toBeNull();
 expect(root.querySelector('.portfolio-empty')).not.toBeNull();
 expect(root.querySelectorAll('.holding-category')).toHaveLength(7);
 const ordered=['.portfolio-composition','.portfolio-direct','.portfolio-account-summary','.portfolio-risk'].map(s=>root.querySelector(s)!);
 for(let i=1;i<ordered.length;i++)expect(ordered[i-1].compareDocumentPosition(ordered[i])&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
 expect(root.querySelector('.money-flow-trade')).toBeNull();
 expect(root.querySelector('[data-money-bucket="pending"]')).not.toBeNull();
});


it('상품 상세는 기본 접힘이며 예금은 현재 금리가 아닌 가입 건별 금리를 보여준다', () => {
 const g={...game(),turn:5};
 const holding=g.holdings.find(h=>h.productId==='deposit')!;
 holding.positions=undefined;
 holding.lots=[{amount:1000000,principal:1000000,openedTurn:1,maturityTurn:7,ratePerTurn:.004},{amount:2000000,principal:2000000,openedTurn:2,maturityTurn:4,ratePerTurn:.006}];
 holding.amount=3000000;
 root.innerHTML=renderPortfolio(g);
 expect(root.querySelectorAll('.portfolio-holdings-disclosure')).toHaveLength(2);
 expect(root.querySelectorAll('.portfolio-holdings-disclosure[open]')).toHaveLength(0);
 const rates=root.querySelector('.portfolio-direct .holding-deposit-rates')!.textContent;
 expect(rates).toContain('턴당 0.40%');expect(rates).toContain('턴당 0.60%');expect(rates).toContain('만기 완료');
 expect(root.querySelector('.portfolio-total-card')).toBeNull();
 expect(root.querySelector('.portfolio-fund-breakdown')).toBeNull();
 expect(root.querySelector('.cash-rule')).toBeNull();
 expect(root.querySelector('[data-money-bucket="cash"]')).not.toBeNull();
});
