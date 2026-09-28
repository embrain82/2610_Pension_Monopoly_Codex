import { products } from '../data/content';
import type { GameState } from '../types';
import { formatWon } from './format';
import { orderSchedule, turnLabel } from './order-timeline';
import { renderMaturitySummary } from './maturity-view';
/** Read the actual order and maturity ledgers; no simulated settlement or duplicated money totals. */
export function renderOngoing(g: GameState): string {
  const maturity=renderMaturitySummary(g);
  if (!maturity && !g.pendingOrders.length) return '';
  return `<section class="ongoing-panel" aria-label="진행 중인 일"><h2>진행 중인 일</h2><p class="eyebrow">현재 ${g.turn}/12턴</p>${g.pendingOrders.length?`<ul class="ongoing-orders">${g.pendingOrders.map(o=>`<li><strong>${products.find(p=>p.id===o.productId)!.shortName} ${o.side==='buy'?'매수':'매도'} · ${formatWon(o.amount)}</strong><span>${o.defaultScope?'디폴트옵션':'직접 운용'} · ${o.stage==='received'?'가격 확정 대기':'결제 대기'}</span><small>${orderSchedule(o)}</small><p>${o.side==='buy'?`${turnLabel(o.settlesTurn)} 결제 후 보유 반영`:`${turnLabel(o.settlesTurn)} 결제 후 IRP 안에서 사용 가능`}${o.targetProductId?' · 이후 연결 매수 조건 재확인':''}</p></li>`).join('')}</ul>`:''}${maturity}<p class="hint">자동주문도 예금은 즉시, 펀드·TDF는 결제 후 반영돼요. 위 대기금액과 만기 대상은 겹칠 수 있어 합산하지 않아요.</p></section>`;
}
