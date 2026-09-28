import { balanceConfig } from '../data/content';
import { portfolioValue } from '../engine/portfolio-engine';
import type { GameState } from '../types';
import { formatWon, signedWon } from './format';

export function actionAccountSummary(state:GameState) {
 const total=portfolioValue(state);
 // Signed external flows: contributions/transfers positive, gross withdrawals negative.
 const profit=total-balanceConfig.startingIrp-state.cashFlows.reduce((sum,flow)=>sum+flow.amount,0);
 return {total,profit};
}
export function renderActionAccountSummary(state:GameState):string {
 const {total,profit}=actionAccountSummary(state);
 return `<div class="action-money"><div><span>전체 IRP 평가액</span><strong>${formatWon(total)}</strong></div><div><span>납입·인출 제외 누적 운용손익</span><strong>${signedWon(Math.round(profit))}</strong></div><div><span>주문 가능 · IRP 안</span><strong>${formatWon(state.irpCash)}</strong></div><div><span>생활자금 · IRP 밖</span><strong>${formatWon(state.cash)}</strong></div></div>`;
}
