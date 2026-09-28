import { formatWon } from './format';
import type { GameState, LifeChoiceOption, LifeEvent, LifeResolution } from '../types';
import { lifeChoicesFor } from '../engine/life-engine';
import { operationIcon } from './design-system';

const signedWon = (value: number) => `${value > 0 ? '+' : ''}${formatWon(value)}`;

export function lifeEyebrow(event: LifeEvent): string {
  if (event.kind === 'bonus') return '생활 사건 · 목돈이 들어왔습니다';
  if (event.kind === 'transfer') return '생활 사건 · 퇴직급여를 어디로';
  return `생활 사건 · ${event.eligibleWithdrawal ? '중도인출 가능 사유 가정' : '중도인출 제한 체험'}`;
}

export function lifeCostLabel(event: LifeEvent): string {
  if (event.kind === 'cost') return '필요 금액';
  if (event.kind === 'bonus') return '들어온 금액';
  return '퇴직급여';
}

/** 선택지 한 장. 비활성이면 이유를 보이고 버튼을 잠근다 */
export function renderLifeChoice(option: LifeChoiceOption, index: number): string {
  const classes = ['life-choice', option.enabled ? '' : 'disabled'].filter(Boolean).join(' ');
  const reason = option.enabled ? '' : `<p class="life-reason" id="life-reason-${index}">${option.reason ?? '지금은 고를 수 없습니다.'}</p>`;
  return `<div class="life-choice-wrap${option.enabled?'':' unavailable'}"><button type="button" class="${classes}" data-action="resolve-life" data-choice="${option.id}" ${option.enabled ? '' : 'disabled'} aria-describedby="life-choice-${index}${option.enabled?'':` life-reason-${index}`}">
      <span class="choice-index">${operationIcon(option.id==='cash'?'cash':option.id.startsWith('contribute')?'contribute':'default')}</span>
      <span class="life-choice-body" id="life-choice-${index}">
        <strong>${option.label}</strong>
        ${!option.enabled && option.immediate === option.reason ? '' : `<small class="now">선택하면: ${option.immediate}</small>`}
        <small class="later">알아둘 점: ${option.longTerm}</small>
        ${option.enabled && option.pensionEstimate ? `<small class="later">게임 기준 예상 월 연금 증가: ${option.pensionEstimate}</small>` : ''}
      </span>
      <span class="life-choice-arrow" aria-hidden="true">${option.enabled?'›':'—'}</span>
    </button>${reason}</div>`;
}

/**
 * 생활사건 3지선다. 사건 본문 → 금액 → 선택지(즉시/장기 비용표) 순서. 모든 선택지는 엔진(`lifeChoicesFor`)이
 * 계산한 그대로 그리고, 여기서는 문구만 붙인다.
 */
export function renderLifeModal(state: GameState, event: LifeEvent): string {
  const choices = lifeChoicesFor(state, event);
  const cashChoice = choices.find(choice => choice.id === 'cash');
  const coverNote = cashChoice?.payment && cashChoice.payment.unpaid > 0
    ? `<p class="note">「${cashChoice.label}」: ${cashChoice.immediate} IRP 대기자금·보유 상품은 그대로입니다.</p>`
    : '';
  return `<div class="life-scene kind-${event.kind}"><p class="eyebrow">TURN ${state.turn} · ${lifeEyebrow(event)}</p>
    <h2>${event.title}</h2>
    ${event.body.split(/\n\s*\n/).map(paragraph => `<p class="modal-lead">${paragraph}</p>`).join('')}
    <div class="event-cost"><div><span>${lifeCostLabel(event)}</span><strong>${formatWon(Math.abs(event.cost))}</strong></div><div class="event-cash"><span>현재 생활자금</span><b>${formatWon(state.cash)}</b></div></div>
    ${coverNote}${event.kind==='cost'?`<p class="life-preparation">${state.cash>=Math.abs(event.cost)?'지금까지 남겨 둔 생활자금으로 이번 필요 금액을 감당할 수 있어요.':'현재 생활자금만으로는 부족해요. 각 선택의 미지급액과 비용을 확인하세요.'}${state.logs.some(l=>l.turn<state.turn && l.type==='life')?' 앞선 생활사건 이후 남은 자금으로 다시 판단하는 순간입니다.':''}</p>`:''}
    <p class="life-prompt">어떻게 할까요? 선택마다 생활자금과 IRP에 미치는 영향이 다릅니다.</p>
    <div class="life-choices">${choices.flatMap((option, index) => option.enabled ? [renderLifeChoice(option, index)] : []).join('')}</div>
    ${event.kind==='cost'?`<details class="life-blocked"><summary>인출·세금 기준 자세히</summary><p>예금 현금화와 중도인출은 별도 절차예요. IRP 안에서 예금을 현금화한 뒤, 중도인출 요건과 인출 가능한 자금, 예상 세금을 확인해 계좌 밖으로 인출해요.</p><p>인출할 때는 세액공제를 받지 않은 원금 → 퇴직급여 → 세액공제를 받은 원금과 운용수익 순서로 사용해요.${event.id==='medical'?' 의료비에 대한 세법상 특별 감면은 별도 요건이 있어, 이번 게임 사례에서는 적용하지 않아요.':''}</p></details>`:''}
    ${choices.some(c=>!c.enabled)?`<details class="life-blocked"><summary>지금 선택할 수 없는 방법 · 이유 보기</summary>${choices.flatMap((option,index)=>option.enabled?[]:[renderLifeChoice(option,index)]).join('')}</details>`:''}<p class="life-account-note">${event.kind==='cost'?'IRP 안의 상품 매도와 계좌 밖 중도인출·해지는 다른 절차입니다. 선택 가능 여부는 이번 사건의 조건을 반영합니다.':event.kind==='bonus'?'생활자금과 IRP 대기자금은 별개입니다. 납입만으로 상품을 매수하지 않습니다.':'IRP 이전과 현금 수령은 세금·생활자금에 미치는 영향이 다릅니다. 위의 선택 결과와 알아둘 점을 함께 확인하세요.'}</p></div>`;
}

/** 정산 「사건」 블록. 무엇을 골랐고 무엇이 움직였는지, 다른 선택이었다면 한 줄 */
export function renderLifeSettleBlock(resolution: LifeResolution | null): string {
  if (!resolution) return '';
  const rows: string[] = [];
  if (Math.abs(resolution.cashDelta) >= 1) rows.push(`생활자금 <b class="${resolution.cashDelta < 0 ? 'neg' : 'pos'}">${signedWon(resolution.cashDelta)}</b>`);
  if (Math.abs(resolution.irpDelta) >= 1) rows.push(`IRP <b class="${resolution.irpDelta < 0 ? 'neg' : 'pos'}">${signedWon(resolution.irpDelta)}</b>`);
  if (resolution.penalty >= 1) rows.push(`불이익 <b class="neg">−${formatWon(resolution.penalty)}</b>`);
  if (resolution.fee >= 1) rows.push(`${resolution.kind === 'transfer' ? '세금' : '세금·비용'} <b class="neg">−${formatWon(resolution.fee)}</b>`);
  if (resolution.sales.length) rows.push(`매도 ${resolution.sales.length}건`);
  if (resolution.shortage) rows.push('<b class="neg">생활자금 부족 +1</b>');
  const alternative = resolution.alternative ? `<p class="life-alt">${resolution.alternative}</p>` : '';
  return `<div class="preview-box settle-life kind-${resolution.kind}"><strong>사건 · ${resolution.title}</strong>
      <p class="life-picked">내 선택: <b>${resolution.choiceLabel}</b></p>
      <p class="life-rows">${rows.join(' · ') || '자산 변화 없음'}</p>
      <p>${resolution.message}</p>
      ${alternative}
    </div>`;
}
