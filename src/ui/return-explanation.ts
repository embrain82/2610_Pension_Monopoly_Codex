import { balanceConfig, products } from '../data/content';
import { rateShockReturn } from '../engine/return-model';
import type { MarketHoldingEffect, MarketStep } from '../types';
import { signedWon } from './format';

/** Uses the recorded opening exposure and the same turn's market, never today's positions. */
export function returnExplanation(effect: MarketHoldingEffect, market?: MarketStep) {
  const up = effect.delta > .005, down = effect.delta < -.005;
  if (effect.productId === 'deposit') return {
    line: up ? '시장금리 변동과 별개로 가입 때 정한 약정 이자가 붙어 예금이 늘었어요.' : down ? '예금 기록에 감소가 있어요. 가입 건별 약정과 정산 내역을 확인해 주세요.' : '이번 시장 구간에 추가된 예금 이자는 없어요. 만기 여부를 확인해 주세요.',
    rows: [{label:'가입 건별 약정·만기 반영',value:effect.delta}],
    note:'일반 예금은 가입 당시 원금과 턴당 약정 이자로 계산해요. 만기 뒤에는 해당 약정 이자가 중단돼요.'
  };
  const bond = effect.productId === 'shortBond' || effect.productId === 'longBond';
  const line = bond
    ? `${up ? '채권의 이자수익과 가격 변동을 합친 뒤 보수를 빼도 이익이 남았어요.' : down ? '채권의 이자수익이 있어도 가격 하락과 보수 때문에 손실이 날 수 있어요.' : '채권 이자·가격 변화·보수의 합이 거의 0이에요.'} 주가지수 등락을 그대로 따르는 상품은 아니에요.`
    : `${effect.productId === 'equityEtf' ? '주식시장과 상품 자체의 가격 변동' : '주식·채권 등 편입 자산의 움직임'}에 상품 보수를 반영한 결과예요.`;
  if (!market || !Number.isFinite(effect.opening) || !Number.isFinite(market.returns[effect.productId])) return {line,rows:[],note:'이전 기록에는 원인별 계산 근거가 없어 상세 금액을 나누지 않아요.'};
  const gross = effect.opening * market.returns[effect.productId];
  const fee = -Math.max(0,(effect.opening + gross) * products.find(p=>p.id===effect.productId)!.feeRate);
  // A foreign/legacy record must not be passed off as a precise reconstruction.
  if (Math.abs(gross + fee - effect.delta) > .01) return {line,rows:[],note:'이 기록은 현재 계산과 일치하지 않아 원인별 금액을 나누지 않아요.'};
  const carry = effect.opening * market.ratePct * balanceConfig.market.bondCarryPerRatePct;
  const rate = effect.opening * rateShockReturn(effect.productId,market.rateDeltaPct);
  const rows = bond ? [{label:'채권 이자수익 가정',value:carry},{label:'금리 변화의 가격 영향',value:rate},{label:'기타 가격 변동·충격·상하한 조정',value:gross-carry-rate},{label:'상품 보수',value:fee}]
    : [{label:'가격 변동에 따른 손익',value:gross},{label:'상품 보수',value:fee}];
  return {line,rows,note:'이번 턴 시작 시 보유한 상품과, 주문 처리 중에도 가격 변동이 반영되는 금액을 기준으로 계산했어요. ' + (bond ? '‘기타 가격 변동’은 전체 변동에서 이자수익과 금리 영향을 뺀 금액이에요. 세부 원인별 금액은 구분해 계산하지 않아요.' : '여기서 상품 보수를 빼면 이번 턴 손익이 돼요.')};
}
export function renderReturnExplanation(effect:MarketHoldingEffect, market?:MarketStep):string {
  const e=returnExplanation(effect,market);
  return `<details class="holding-cause-detail" data-preserve-open><summary>왜 이 금액인가요?</summary><p class="holding-cause">${e.line}</p>${e.rows.length?`<dl>${e.rows.map(r=>`<div><dt>${r.label}${r.label === '가격 변동에 따른 손익' ? '<small class="return-before-fee">보수 차감 전</small>' : ''}</dt><dd>${signedWon(Math.abs(r.value)<.5 ? 0 : r.value)}</dd></div>`).join('')}</dl><p>합계 ${signedWon(effect.delta)} · 원 단위 반올림으로 표시 합은 차이 날 수 있어요.</p>`:''}<p>${e.note}</p><small>게임의 턴당 계산이며 실제 연이율이 아니에요. 채권형 상품도 손실이 가능합니다.</small></details>`;
}
