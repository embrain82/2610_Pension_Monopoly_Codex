import { journeyChapter } from './journey-view';
import { formatWon as won } from './format';
import { missionDisplay } from '../engine/progress-engine';
import { products } from '../data/content';
import { SCENARIOS, MISSIONS, tdfEquity, type ScenarioId, type MissionId } from '../engine/scenario-engine';
import { calculateScore } from '../engine/scoring-engine';
import type { GameState } from '../types';
const pct=(n:number)=>(n*100).toFixed(1)+'%';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const scenarioGuidance: Record<ScenarioId, { title: string; detail: string; focus: string }> = {
  classic: { title: '금리가 바뀌면, 상품의 흐름도 달라져요', detail: '금리 인상·인하와 주가 충격이 섞이는 기본 시장이에요. 예금·채권·주식이 같은 시장 변화에 어떻게 다르게 반응하는지 살펴보세요.', focus: '상품별 움직임을 비교하며 균형 잡기' },
  inflation: { title: '잔액뿐 아니라 돈의 가치도 살펴봐요', detail: '기본 시장보다 높은 물가와 금리에서 시작하고, 긴축으로 넘어갈 가능성도 높아요. 누적 물가는 구매력을 낮추고 생활사건의 지출액에도 반영돼요.', focus: '물가 상승과 생활비 부담 함께 살피기' },
  recession: { title: '성장이 더딘 시장에서 여유를 지켜요', detail: '낮은 금리·물가에서 시작하고, 주식의 기대 상승 흐름과 회복 강도가 기본 시장보다 약해요. 불규칙한 반등 속에서 생활자금과 감당할 변동을 함께 챙겨보세요.', focus: '회복을 기다릴 여유와 자금 배분 점검하기' },
  recovery: { title: '회복의 기회에도 흔들림은 있어요', detail: '주식의 기대 상승 흐름이 기본 시장보다 강하지만, 가격의 흔들림도 커요. 상승만 이어진다고 가정하지 말고 되돌림과 보유 비중을 함께 살펴보세요.', focus: '성장 기회와 변동성 함께 관리하기' }
};
export function renderCampaignPicker(scenario:ScenarioId,mission:MissionId, open=false, goalMonthly=500000):string {
  const market=scenarioGuidance[scenario];
  const goal=mission==='cushion'
    ? { title:'순생활자금 1,800만원 이상', detail:'12턴을 마칠 때 생활자금에서 미지급 생활비를 뺀 금액이 1,800만원 이상이고, 미지급 생활비는 0원이어야 해요.', focus:'IRP 잔액과 생활에 쓸 수 있는 돈을 구분해요.' }
    : mission==='purchasing'
      ? { title:'실질 운용지수 100 이상', detail:'12턴을 마칠 때 납입을 제외한 운용지수를 누적 물가로 나눈 값이 100 이상이면 달성해요. 시작할 때의 구매력 100을 지키는 목표예요.', focus:'추가납입으로 잔액이 늘어나는 것과 운용 성과는 달라요.' }
      : { title:`목표용 월 환산액 ${won(goalMonthly)} 이상`, detail:'12턴을 마칠 때 게임의 목표용 월 환산액이 정해 둔 목표 이상이면 달성해요. 연금 선택 시 IRP를 240개월로 나눈 세전 기준이며, 일시금 선택 시에는 수령 방식에 따른 조정이 반영돼요.', focus:'실제 세후 수령액은 마지막 수령 비교에서 따로 확인해요.' };
  return `<details class="campaign-picker" ${open ? 'open' : ''}><summary><span class="campaign-heading"><strong>이번 판 설정</strong><small>${SCENARIOS[scenario].name} · ${MISSIONS[mission].name}</small></span><span class="campaign-chevron" aria-hidden="true">⌄</span></summary>
    <div class="campaign-body"><div class="campaign-fields">
      <div class="campaign-field"><label for="scenario-pick">시장 시나리오</label><select id="scenario-pick" aria-describedby="campaign-market-description">${Object.entries(SCENARIOS).map(([id,s])=>`<option value="${id}" ${id===scenario?'selected':''}>${s.name}</option>`).join('')}</select></div>
      <div class="campaign-field"><label for="mission-pick">이번 판 미션</label><select id="mission-pick" aria-describedby="campaign-mission-description">${Object.entries(MISSIONS).map(([id,m])=>`<option value="${id}" ${id===mission?'selected':''}>${m.name}</option>`).join('')}</select></div>
    </div><div class="campaign-explanation" aria-live="polite" aria-atomic="true">
      <section class="campaign-explanation-block" id="campaign-market-description"><span class="campaign-kicker">이 시장에서는</span><h3>${market.title}</h3><p>${market.detail}</p><small>${market.focus}</small></section>
      <section class="campaign-explanation-block campaign-goal" id="campaign-mission-description"><span class="campaign-kicker">이번 판의 목표</span><h3>${goal.title}</h3><p>${goal.detail}</p><small>${goal.focus}</small></section>
    </div><p class="campaign-footnote">선택한 시장에서 12턴을 진행하고, 선택한 미션으로 목표 달성을 확인해요.</p></div></details>`;
}
export function renderCampaignStatus(g:GameState):string {
  if(!g.campaign) return '';
  const d=g.campaign, mission=missionDisplay(g);
  return `<aside class="campaign-status"><strong>${SCENARIOS[d.scenario].name} · ${MISSIONS[d.mission].name}</strong>
    <p>${mission.progress} · ${journeyChapter(g)}장 / 4장</p>
    <small>누적 물가 ${pct(d.priceIndex-1)} · TDF 2029 주식 비중 ${pct(tdfEquity(g.turn))}</small></aside>`;
}
export function renderCampaignResult(g:GameState):string {
  if(!g.campaign) return '';
  const d=g.campaign, score=calculateScore(g);
  return `<section class="campaign-report"><h2>운용과 자금 흐름 복기</h2>
    <p>${g.payoutChoice === 'lumpSum' ? '세후 일시금의 비교용 월 환산 · 오늘 가치' : '오늘 가치의 세후 평균 월 연금'} <strong>${won(score.payout.monthlyNet/d.priceIndex)}</strong> · 명목 ${won(score.payout.monthlyNet)}</p>
    <p>운용지수 ${(100*d.index).toFixed(1)} · 실질 운용지수 ${(100*d.index/d.priceIndex).toFixed(1)} · 시작 100</p>
    <details data-preserve-open><summary>12턴 선택과 자금 흐름 펼쳐 보기</summary><div class="table-wrap"><table><thead><tr><th>턴</th><th>시장·선택</th><th>시장 손익</th><th>순입출금</th><th>매매·정산 영향</th><th>IRP</th></tr></thead><tbody>
    ${d.reviews.map(r=>`<tr><td>${r.turn}${r.chapter?' · 장 완료':''}</td><td>${esc(r.headline)}<br>${r.actions.map(esc).join('<br>')}<small><br>정산 후 보유: ${r.holdings.map(h=>`${products.find(p=>p.id===h.productId)?.shortName} ${won(h.amount)}`).join(' · ')}${r.defaultHoldings?.length?`<br>그중 디폴트옵션: ${r.defaultHoldings.map(h=>`${products.find(p=>p.id===h.productId)?.shortName} ${won(h.amount)}`).join(' · ')}`:''}${r.defaultOrders?.length?`<br>옵션 처리 중 주문 ${r.defaultOrders.length}건`:''}</small></td><td>${won(r.market)}</td><td>${won(r.flow)}</td><td>${won(r.costs)}</td><td>${won(r.irp)}</td></tr>`).join('')}</tbody></table></div></details>
    <p>분기 연습은 완료된 장 끝으로 돌아가 이후 운용을 바꿉니다. 시장은 같고 이미 확인한 미래 정보가 있으므로 첫 플레이와 같은 조건의 성과는 아닙니다.</p>
    <div class="decision-tools">${d.branches.map(b=>`<button class="secondary" data-action="replay-chapter" data-turn="${b.turn}">${b.turn}턴 끝부터 다른 선택</button>`).join('')}<button class="secondary" data-action="export-run">복기 기록 다운로드</button></div></section>`;
}
