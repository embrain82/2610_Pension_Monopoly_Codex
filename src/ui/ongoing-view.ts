import { products } from '../data/content';
import type { GameState, PendingOrder } from '../types';
import { formatWon } from './format';
import { orderSchedule, turnLabel } from './order-timeline';
import { renderMaturitySummary } from './maturity-view';
/** Highlight the recorded processing stage, not a guessed completion from dates. */
export function renderOngoingSchedule(order: PendingOrder, currentTurn: number): string {
  const current = order.stage === 'received' ? 0 : 1;
  const steps = [
    { label: '접수', turn: order.submittedTurn },
    { label: '기준가', turn: order.priceTurn ?? order.settlesTurn },
    { label: '결제', turn: order.settlesTurn }
  ];
  return `<div class="ongoing-schedule" aria-label="현재 ${currentTurn}턴 · ${orderSchedule(order)}">${steps.map((step,index) => {
    const status = index < current ? 'complete' : index === current ? 'current' : 'planned';
    return `<span class="ongoing-step ${status}" ${index === current ? 'aria-current="step"' : ''}>${step.label}<b>${turnLabel(step.turn)}</b><small>${index === current ? `현재 ${currentTurn}턴` : index < current ? '완료' : '예정'}</small></span>`;
  }).join('')}</div>`;
}
/** Read the actual order and maturity ledgers; no simulated settlement or duplicated money totals. */
export function renderOngoing(g: GameState): string {
  const maturity=renderMaturitySummary(g);
  if (!maturity && !g.pendingOrders.length) return '';
  return `<details class="ongoing-panel" data-preserve-open open><summary class="ongoing-heading"><span class="ongoing-title">진행 중인 일</span><span class="eyebrow">현재 ${g.turn}/12턴</span></summary><div class="ongoing-content">${g.pendingOrders.length?`<ul class="ongoing-orders">${g.pendingOrders.map(o=>`<li><strong>${products.find(p=>p.id===o.productId)!.shortName} ${o.side==='buy'?'매수':'매도'}</strong><strong class="ongoing-amount">${formatWon(o.amount)}</strong><span class="ongoing-status">${o.defaultScope?'디폴트옵션':'직접 운용'} · ${o.stage==='received'?'가격 확정 대기':'결제 대기'}</span>${renderOngoingSchedule(o,g.turn)}<p>${o.side==='buy'?`${turnLabel(o.settlesTurn)} 결제 후 보유 반영`:`${turnLabel(o.settlesTurn)} 결제 후 IRP 안에서 사용 가능`}${o.targetProductId?' · 이후 연결 매수 조건 재확인':''}</p></li>`).join('')}</ul>`:''}${maturity}<p class="hint">자동주문도 예금은 즉시, 펀드·TDF는 결제 후 반영돼요. 위 대기금액과 만기 대상은 겹칠 수 있어 합산하지 않아요.</p></div></details>`;
}
