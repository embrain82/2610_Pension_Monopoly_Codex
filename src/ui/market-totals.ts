import type { TurnLedger } from '../types';
import { formatWon, signedWon } from './format';

type Ledger = Pick<TurnLedger, 'open' | 'afterMarket' | 'marketEffects' | 'cashInterest'>;

/** Only recorded market exposure is aggregated; the ledger remains the authoritative total. */
export function marketTotals(ledger: Ledger, turn: number) {
  const effects = ledger.marketEffects;
  const valid = effects !== undefined && effects.every(effect => Number.isFinite(effect.delta));
  const gains = valid ? effects.reduce((sum, effect) => sum + Math.max(0, effect.delta), 0) : null;
  const losses = valid ? effects.reduce((sum, effect) => sum + Math.min(0, effect.delta), 0) : null;
  const interest = ledger.cashInterest;
  const cash = !interest ? 0 : interest.turn === turn && Number.isFinite(interest.amount) ? interest.amount : null;
  const total = ledger.afterMarket - ledger.open;
  const difference = gains !== null && losses !== null && cash !== null ? total - gains - losses - cash : null;
  return { gains, losses, cash, total, difference, complete: difference !== null && Math.abs(difference) < .01 };
}

export function renderMarketTotals(ledger: Ledger, turn: number): string {
  const totals = marketTotals(ledger, turn);
  const amount = (value: number | null) => value === null ? '기록 없음' : signedWon(Math.abs(value) < .5 ? 0 : value);
  const row = (label: string, value: number | null) => `<div><dt>${label}</dt><dd>${amount(value)}</dd></div>`;
  const basis = ledger.cashInterest?.turn === turn
    ? `<small>대기자금 이자: 턴 시작 ${formatWon(ledger.cashInterest.opening)} × 턴당 ${(ledger.cashInterest.rate * 100).toLocaleString('ko-KR')}% · 게임 가정</small>` : '';
  const note = totals.complete ? '원 단위 반올림으로 표시된 금액의 합은 차이 날 수 있어요.'
    : totals.difference === null ? '상세 기록이 없어 항목별 합계를 모두 확인할 수 없어요. 이번 턴 합계는 실제 잔고에 반영된 기록이에요.'
    : `상세 기록과 잔고 반영 합계에 ${signedWon(totals.difference)} 차이가 있어요. 이번 턴 합계는 실제 잔고에 반영된 기록이에요.`;
  return `<div class="market-totals"><dl>${row('상품 이익 합계',totals.gains)}${row('상품 손실 합계',totals.losses)}${row('대기자금 이자',totals.cash)}${row('이번 턴 합계',totals.total)}</dl>${basis}<small class="market-totals-note">${note}</small></div>`;
}
