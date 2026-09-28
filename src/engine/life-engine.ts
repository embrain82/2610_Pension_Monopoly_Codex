import { consumeMaturityCash } from './maturity-cash';
import { defaultScopes, scopedHolding } from './position-engine';
import { previewContribution } from './contribution-engine';
import { inflatedEvent } from './scenario-engine';
import { addAccountFlow, grossForNet, withdrawalTax, TRANSFER_TAX_NOTICE } from './account-engine';
import { lifeEvents, policyRules } from '../data/content';
import type { ActionResult, GameState, DefaultScope, LifeChoice, LifeChoiceOption, LifeEvent, LifePaymentPreview, LifeResolution } from '../types';
import { sellProduct, portfolioValue } from './portfolio-engine';
import { contributionCredit } from './policy-engine';

const won = (value: number) => `${Math.round(value).toLocaleString('ko-KR')}원`;

export const LIFE_CHOICE_LABELS: Record<LifeChoice, string> = {
  cash: '생활자금으로 해결',
  deposit: 'IRP 예금 현금화 후 중도인출',
  withdraw: 'IRP 중도인출',
  'contribute-all': '전액 IRP 납입',
  'contribute-half': '절반 납입 · 절반 생활자금',
  'transfer-irp': 'IRP로 이전'
};

/** 사건 종류별 `cash` 선택지 이름. 뜻은 늘 "IRP는 그대로, 생활자금 쪽으로" */
export const CASH_CHOICE_LABELS: Record<LifeEvent['kind'], string> = {
  cost: '생활자금으로 해결',
  bonus: '생활자금으로 두기',
  transfer: '지금 받기(일시 수령)'
};

/** 원천별 세금과 공통 매도 규칙으로 인출을 미리 계산한다. 미결 펀드는 생활비로 쓸 수 없다. */
function withdrawalPlan(state: GameState, event: LifeEvent, depositOnly = false): ActionResult {
  if (!event.eligibleWithdrawal) return { ok: false, message: '이번 사건은 IRP 중도인출 사유에 해당하지 않아요. 생활자금으로 해결하는 방법을 확인해보세요.', state };
  if (state.rebalancePlan || state.pendingOrders.length) return { ok: false, message: '처리 중인 주문이 있어 지금은 인출할 수 없어요. 생활자금으로 지급하고, 부족한 금액은 나누어 지급하는 방법을 확인해보세요.', state };
  if (depositOnly && !state.holdings.some(h => h.productId === 'deposit' && h.amount > 0)) return { ok: false, message: '현재 현금화할 수 있는 IRP 예금이 없어요. 다른 해결 방법을 확인해보세요.', state };
  let next = state;
  const amount = Math.abs(event.cost);
  const covers = (candidate: GameState) => withdrawalTax(portfolioValue(candidate), candidate.accountBasis, candidate.irpCash).net >= amount;
  const targets: Array<{id:'deposit'|'equityEtf';scope?:DefaultScope}> = (depositOnly ? ['deposit'] as const : ['deposit','equityEtf'] as const).map(id=>({id}));
  // 즉시 결제 가능한 예금 100% 옵션만 생활사건에서 환매한다. 펀드 혼합의 예금만 꺼내지 않는다.
  if(state.defaultTrading) for(const scope of defaultScopes(state)) if(scope.optionId==='principal') targets.push({id:'deposit',scope});
  for (const {id,scope} of targets) {
    if (covers(next)) break;
    const holding = scopedHolding(next,id,scope);
    if (!holding || holding.amount <= 0) continue;
    const full = sellProduct(next, id, holding.amount, true, scope);
    if (!full.ok) continue;
    if (!covers(full.state)) { next = full.state; continue; }
    let low = 0, high = holding.amount;
    for (let i = 0; i < 48; i++) {
      const mid = (low + high) / 2;
      const candidate = sellProduct(next, id, mid, true, scope);
      if (candidate.ok && covers(candidate.state)) high = mid;
      else low = mid;
    }
    next = sellProduct(next, id, high, true, scope).state;
  }
  const gross = grossForNet(portfolioValue(next), next.accountBasis, amount);
  if (!Number.isFinite(gross) || next.irpCash + 0.001 < gross) return { ok: false, message: '지금 인출할 수 있는 IRP 자금이 부족해요. 펀드나 처리 중인 주문의 금액은 바로 인출할 수 없어요.', state };
  const tax = withdrawalTax(portfolioValue(next), next.accountBasis, gross);
  next = { ...consumeMaturityCash(next, gross), irpCash: Math.max(0, next.irpCash - gross), accountBasis: tax.nextBasis,
    cashFlows: [...next.cashFlows, { turn: state.turn, kind: 'withdrawal', amount: -gross }] };
  return { ok: true, message: `허용 사유를 확인한 인출 · 생활비 ${won(amount)} + 재원별 세금 ${won(tax.tax)}. 계좌 내 매도와 계좌 밖 인출을 별도 처리했습니다.`, state: next };
}

/** 미리보기와 확정이 같은 계산을 사용한다. 입력 상태는 변경하지 않는다. */
function costChoicePlan(state: GameState, event: LifeEvent, choice: 'cash' | 'deposit' | 'withdraw'): { result: ActionResult; payment: LifePaymentPreview } {
  const amount = Math.abs(event.cost);
  if (choice === 'cash') {
    const paid = Math.min(state.cash, amount);
    const unpaid = amount - paid;
    const next = { ...state, cash: state.cash - paid, livingDebt: state.livingDebt + unpaid,
      cashShortages: state.cashShortages + (unpaid > 0 ? 1 : 0), safeActionCount: state.safeActionCount + (unpaid > 0 ? 0 : 1) };
    return {
      result: { ok: true, state: next, message: unpaid > 0
        ? `생활비 ${won(paid)} 지급 · 미지급 ${won(unpaid)}는 다음 급여에서 우선 지급합니다. IRP는 인출하지 않았습니다.`
        : '생활자금으로 해결해 IRP를 지켰습니다.' },
      payment: { cashPaid: paid, unpaid, irpDelta: 0, tax: 0, penalty: 0 }
    };
  }
  const result = withdrawalPlan(state, event, choice === 'deposit');
  const irpDelta = portfolioValue(result.state) - portfolioValue(state);
  const gross = result.ok ? -result.state.cashFlows.at(-1)!.amount : 0;
  return { result, payment: { cashPaid: 0, unpaid: 0, irpDelta,
    tax: result.ok ? gross - amount : 0, penalty: result.ok ? Math.max(0, -irpDelta - gross) : 0 } };
}

/** 선택지와 비용표. 모달이 그대로 그린다. 비활성 선택지도 이유와 함께 돌려준다 */
export function lifeChoicesFor(state: GameState, event: LifeEvent): LifeChoiceOption[] {
  const amount = Math.abs(event.cost);
  const monthly = (value: number) => won(value / policyRules.receivingMonths);
  if (event.kind === 'cost') {
    const cash = costChoicePlan(state, event, 'cash');
    const shortage = cash.payment.unpaid;
    const cashLine = shortage > 0
      ? `생활자금에서 ${won(cash.payment.cashPaid)}을 지급해요. 부족한 ${won(shortage)}은 미지급 생활비로 남아요.`
      : `생활자금에서 ${won(amount)}을 지급해요.`;
    const withdraw = costChoicePlan(state, event, 'withdraw');
    const deposit = costChoicePlan(state, event, 'deposit');
    return [
      { id: 'cash', label: shortage ? '생활비 분할 지급' : LIFE_CHOICE_LABELS.cash, enabled: true,
        payment: cash.payment, immediate: cashLine, longTerm: shortage > 0 ? 'IRP의 은퇴자금은 유지돼요. 미지급 생활비는 다음 급여에서 우선 지급하고, 안정성 평가에 반영돼요.' : `지급 후 생활자금은 ${won(state.cash - amount)}이고, IRP의 은퇴자금은 유지돼요.` },
      { id: 'deposit', label: 'IRP 예금 현금화 후 중도인출', enabled: deposit.result.ok, reason: deposit.result.ok ? undefined : deposit.result.message,
        payment: deposit.payment, immediate: deposit.result.ok ? `IRP 예금을 현금화한 뒤, 필요한 생활비 ${won(amount)}을 인출해요. 이번 선택의 예상 세금은 ${won(deposit.payment.tax)}이에요.` : deposit.result.message, longTerm: '예금을 중도해지하면 받는 이자가 줄어들 수 있어요. 인출한 금액만큼 IRP에 남는 은퇴자금도 줄어들어요.' },
      { id: 'withdraw', label: LIFE_CHOICE_LABELS.withdraw, enabled: withdraw.result.ok, reason: withdraw.result.ok ? undefined : withdraw.result.message,
        payment: withdraw.payment, immediate: withdraw.result.ok ? `IRP에서 필요한 생활비 ${won(amount)}을 인출해요. 이번 선택의 예상 세금은 ${won(withdraw.payment.tax)}이에요.` : withdraw.result.message, longTerm: '인출한 금액만큼 IRP에 남는 은퇴자금이 줄어들어요. 인출에 쓰이는 자금의 종류에 따라 세금이 달라질 수 있어요.' }
    ];
  }
  if (event.kind === 'bonus') {
    const fullQuote = previewContribution(state, { requested: amount, availableSource: amount });
    const halfQuote = previewContribution(state, { requested: Math.floor(amount / 2), availableSource: amount });
    const all = fullQuote.accepted, half = halfQuote.accepted;
    const creditAll = contributionCredit(state.contributionTotal, all).benefit;
    const creditHalf = contributionCredit(state.contributionTotal, half).benefit;
    const contributionLine = (accepted: number, credit: number) => `받은 금액 중 ${won(accepted)}을 IRP에 납입해요. ${amount > accepted ? `나머지 ${won(amount - accepted)}은 생활자금으로 남아요.` : '이번 선택으로 생활자금은 늘어나지 않아요.'} ${credit > 0 ? `예상 세액공제 ${won(credit)}은 환급 대기 금액에 반영돼요.` : '이번 납입으로 추가되는 세액공제는 없어요.'}`;
    const choices: LifeChoiceOption[] = [
      {
        id: 'contribute-all', label: state.contributionPacing ? `${won(all)} 납입 · ${won(amount - all)} 생활자금` : LIFE_CHOICE_LABELS['contribute-all'], enabled: fullQuote.availability.enabled, reason: fullQuote.availability.enabled ? undefined : fullQuote.availability.reason,
        immediate: contributionLine(all, creditAll),
        longTerm: `납입한 돈은 IRP 대기자금이 돼요. 상품을 보유하려면 별도 매수가 필요해요.${state.contributionPacing ? ' 이번 납입은 같은 턴의 추가납입 한도를 함께 사용해요.' : ''}`,
        pensionEstimate: monthly(all)
      },
      {
        id: 'contribute-half', label: state.contributionPacing ? `${won(half)} 납입 · ${won(amount - half)} 생활자금` : LIFE_CHOICE_LABELS['contribute-half'], enabled: halfQuote.availability.enabled, reason: halfQuote.availability.enabled ? undefined : halfQuote.availability.reason,
        immediate: contributionLine(half, creditHalf),
        longTerm: '은퇴자금을 늘리면서 다음 지출에 쓸 생활자금도 마련해요. IRP에 납입한 돈은 우선 대기자금으로 남아요.',
        pensionEstimate: monthly(half)
      },
      { id: 'cash', label: CASH_CHOICE_LABELS.bonus, enabled: true, immediate: `받은 ${won(amount)}을 모두 생활자금으로 남겨요.`, longTerm: '이번 선택으로 IRP의 은퇴자금은 늘어나지 않아요. 이후에도 남은 납입 한도 안에서 IRP에 추가로 납입할 수 있어요.' }
    ];
    return state.contributionPacing && all === half ? choices.filter(c => c.id !== 'contribute-half') : choices;
  }
  const tax = amount / TRANSFER_TAX_NOTICE.gross * TRANSFER_TAX_NOTICE.tax;
  return [
    {
      id: 'transfer-irp', label: LIFE_CHOICE_LABELS['transfer-irp'], enabled: true,
      immediate: `퇴직급여 ${won(amount)}을 IRP로 옮겨요. 지금 세금을 차감하지 않고, 세금 납부를 뒤로 미뤄요.`,
      longTerm: '옮긴 돈은 IRP 대기자금이 되고, 생활자금은 늘어나지 않아요. 퇴직급여 이전은 추가납입 한도를 사용하지 않아요.',
      pensionEstimate: monthly(amount)
    },
    {
      id: 'cash', label: CASH_CHOICE_LABELS.transfer, enabled: true,
      immediate: `퇴직급여에서 가상 영수증에 적힌 퇴직소득세 ${won(tax)}을 빼고, ${won(amount - tax)}을 생활자금으로 받아요.`,
      longTerm: '당장 사용할 생활자금이 늘어나지만, 이번 퇴직급여가 IRP의 은퇴자금으로 쌓이지는 않아요.'
    }
  ];
}

function alternativeLine(options: LifeChoiceOption[], chosen: LifeChoice): string {
  const others = options.filter((option) => option.id !== chosen && option.enabled);
  if (others.length === 0) return '';
  return `다른 선택이었다면: ${others.map((option) => `${option.label} — ${option.immediate}`).join(' / ')}`;
}

function resolutionBase(event: LifeEvent, choice: LifeChoice, options: LifeChoiceOption[]): Pick<LifeResolution, 'eventId' | 'title' | 'kind' | 'choice' | 'choiceLabel' | 'cost' | 'alternative'> {
  return {
    eventId: event.id,
    title: event.title,
    kind: event.kind,
    choice,
    choiceLabel: options.find((option) => option.id === choice)?.label ?? LIFE_CHOICE_LABELS[choice],
    cost: event.cost,
    alternative: alternativeLine(options, choice)
  };
}

function unlockCard(state: GameState, cardId: string): GameState {
  return state.unlockedCards.includes(cardId) ? state : { ...state, unlockedCards: [...state.unlockedCards, cardId] };
}

function finish(state: GameState, event: LifeEvent, resolution: LifeResolution, extraCard?: string): ActionResult {
  let next: GameState = {
    ...state,
    currentEventId: null,
    awaitingAction: true,
    lifeResolution: resolution,
    record: { ...state.record, lifeChoices: [...state.record.lifeChoices, { eventId: event.id, choice: resolution.choice }] },
    logs: [...state.logs, { turn: state.turn, type: 'life', message: `${event.title}: ${resolution.message}`, impact: -event.cost }]
  };
  next = unlockCard(next, event.learningCardId);
  if (extraCard) next = unlockCard(next, extraCard);
  return { ok: true, message: resolution.message, state: next };
}

/** 생활사건 선택 실행. 선택지가 사건 종류·상태에 맞지 않으면 거절한다 */
export function resolveLifeChoice(state: GameState, choice: LifeChoice): ActionResult {
  const rawEvent = lifeEvents.find((item) => item.id === state.currentEventId);
  const event = rawEvent ? inflatedEvent(state, rawEvent) : undefined;
  if (!event) return { ok: false, message: '해결할 생활사건이 없습니다.', state };
  const options = lifeChoicesFor(state, event);
  const option = options.find((item) => item.id === choice);
  if (!option) return { ok: false, message: '이 사건에서 고를 수 없는 선택입니다.', state };
  if (!option.enabled) return { ok: false, message: option.reason ?? '지금은 고를 수 없는 선택입니다.', state };
  const amount = Math.abs(event.cost);
  const base = resolutionBase(event, choice, options);

  if (event.kind === 'cost') {
    const { result, payment } = costChoicePlan(state, event, choice as 'cash' | 'deposit' | 'withdraw');
    if (!result.ok) return result;
    return finish(result.state, event, { ...base, cashDelta: -payment.cashPaid, irpDelta: payment.irpDelta,
      penalty: payment.penalty, fee: payment.tax, sales: [], shortage: payment.unpaid > 0, message: result.message });
  }

  if (event.kind === 'bonus') {
    if (choice === 'cash') {
      const next: GameState = { ...state, cash: state.cash + amount };
      return finish(next, event, { ...base, cashDelta: amount, irpDelta: 0, penalty: 0, fee: 0, sales: [], shortage: false, message: '보너스를 생활자금에 반영했습니다.' });
    }
    const wanted = choice === 'contribute-all' ? amount : Math.floor(amount / 2);
    const accepted = previewContribution(state, { requested: wanted, availableSource: amount }).accepted;
    const credit = contributionCredit(state.contributionTotal, accepted);
    const next: GameState = {
      ...state,
      cash: state.cash + (amount - accepted),
      irpCash: state.irpCash + accepted,
      contributionTotal: state.contributionTotal + accepted,
      taxCreditEligible: state.taxCreditEligible + credit.eligible,
      taxCreditBenefit: state.taxCreditBenefit + credit.benefit,
      pendingTaxCredit: state.pendingTaxCredit + credit.benefit,
      understandingPoints: state.understandingPoints + 1
    };
    const message = `보너스 ${won(accepted)}을 IRP에 납입했습니다${amount - accepted > 0 ? ` (나머지 ${won(amount - accepted)}는 생활자금)` : ''}. 세액공제 ${won(credit.benefit)}은 연말정산 칸을 지날 때 돌아옵니다.`;
    return finish(addAccountFlow(next, accepted, 'contribution', credit.eligible), event, { ...base, cashDelta: amount - accepted, irpDelta: accepted, penalty: 0, fee: 0, sales: [], shortage: false, message }, 'tax-credit');
  }

  // transfer
  if (choice === 'transfer-irp') {
    const next: GameState = { ...state, irpCash: state.irpCash + amount, understandingPoints: state.understandingPoints + 1 };
    return finish(addAccountFlow(next, amount, 'transfer'), event, { ...base, cashDelta: 0, irpDelta: amount, penalty: 0, fee: 0, sales: [], shortage: false, message: `퇴직급여 ${won(amount)}을 IRP 대기자금으로 옮겼습니다. 세금은 수령 때까지 미뤄집니다.` }, 'default-option');
  }
  const tax = amount / TRANSFER_TAX_NOTICE.gross * TRANSFER_TAX_NOTICE.tax;
  const next: GameState = { ...state, cash: state.cash + amount - tax };
  return finish(next, event, { ...base, cashDelta: amount - tax, irpDelta: 0, penalty: 0, fee: tax, sales: [], shortage: false, message: `퇴직급여를 지금 받아 교육용 세금 ${won(tax)}를 뗀 ${won(amount - tax)}이 생활자금이 됐습니다.` });
}
