import type { GameState } from '../types';
import { missionDisplay } from '../engine/progress-engine';
import { profileLimits } from '../engine/profile-engine';
import { formatWon } from './format';

/** Cosmetic exploration only. Never passed to a financial engine or used to reveal a board tile. */
export interface JourneyProgress { chapters: Record<number, { topic: number; solved: boolean; tried?: boolean }> }
const chapters = [
  { title: '기초 다지기', goal: '생활자금과 IRP 안의 돈을 구분해 보세요.', topics: [
    { name: '생활자금 쉼터', clue: '생활비는 IRP 밖 생활자금에서 냅니다. 상품 매도만으로 계좌 밖으로 돈이 나오지는 않아요.', question: 'IRP 상품을 팔면 대금은 어디로 갈까요?', answers: ['IRP 안 대기자금', '생활비 통장'], correct: 0 },
    { name: '주문 시간표', clue: '게임에서 펀드는 접수 → 다음 턴 가격 확정 → 그다음 턴 결제 순서입니다.', question: '펀드 주문 접수는 보유 완료일까요?', answers: ['바로 보유 완료', '결제를 기다려야 함'], correct: 1 }
  ] },
  { title: '변화에 적응하기', goal: '시장 변화 뒤 위험비중과 생활자금 여유를 확인해 보세요.', topics: [
    { name: '금리 관측소', clue: '다른 조건이 같으면 금리 상승은 기존 채권 가격에 하락 압력입니다. 장기채가 더 크게 반응할 수 있어요.', question: '금리 상승 시 기존 장기채 가격은?', answers: ['반드시 오른다', '하락 압력을 받는다'], correct: 1 },
    { name: '비상금 쉼터', clue: '비상금을 남기면 생활사건 때 IRP 중도인출·해지 비용을 피할 여지가 생깁니다.', question: 'IRP 매도만으로 생활비를 낼 수 있나요?', answers: ['아니요, 계좌 밖 인출은 별도 절차', '네, 매도 즉시 생활비로 사용'], correct: 0 }
  ] },
  { title: '목표에 다가가기', goal: '납입 효과와 운용 수익을 따로 확인해 보세요.', topics: [
    { name: '만기 안내소', clue: '사전지정은 즉시 매수가 아닙니다. 대상 만기자금은 통지와 대기를 거쳐 상품별로 주문됩니다.', question: '혼합 옵션의 예금과 펀드는?', answers: ['항상 함께 즉시 결제', '예금 즉시, 펀드는 결제 대기'], correct: 1 },
    { name: '수익 기록실', clue: '생활자금을 IRP에 넣으면 IRP는 커지지만 그 금액 자체는 투자로 번 돈이 아닙니다.', question: '추가납입 100만원은 운용 수익일까요?', answers: ['아니요, 계좌 밖에서 들어온 돈', '네, 투자로 번 100만원'], correct: 0 }
  ] },
  { title: '은퇴 준비 마무리', goal: '목표·생활 안정·낙폭 조건을 점검하고 수령 방식을 비교하세요.', topics: [
    { name: '수령 전망대', clue: '게임의 세전 월 환산 목표와 세후 수령액은 다릅니다. 물가까지 고려한 구매력도 함께 살펴보세요.', question: '세전 목표 달성액은 세후 입금액과?', answers: ['언제나 같다', '다를 수 있다'], correct: 1 },
    { name: '마지막 주문소', clue: '12턴 이후 주문 단계는 종료 가격으로 최종 정산합니다. 추가 시장 수익과 급여가 생기지 않아요.', question: '최종 정산은 13턴 시장을 새로 여나요?', answers: ['아니요, 종료 가격으로 처리', '네, 한 턴 더 수익이 난다'], correct: 0 }
  ] }
];
export function journeyChapter(g: GameState): number {
  return Math.min(4, Math.max(1, Math.ceil((g.turn + (!g.awaitingAction && !g.currentEventId && g.status !== 'finished' ? 1 : 0)) / 3)));
}
export function normalizeJourney(raw: unknown, g: GameState): JourneyProgress | undefined {
  if (!raw || typeof raw !== 'object' || !('chapters' in raw) || !raw.chapters || typeof raw.chapters !== 'object') return undefined;
  const valid: JourneyProgress = { chapters: {} };
  for (const [key,value] of Object.entries(raw.chapters)) {
    const n=Number(key);
    if (!Number.isInteger(n) || n<1 || n>journeyChapter(g) || !value || typeof value!=='object') continue;
    const v=value as Record<string,unknown>;
    if ((v.topic===0 || v.topic===1) && typeof v.solved==='boolean') valid.chapters[n]={topic:v.topic,solved:v.solved,tried:v.tried===true};
  }
  return valid;
}
export function exploreJourney(g: GameState, previous: JourneyProgress|undefined, chapter: number, topic: number): JourneyProgress|undefined {
  if (g.status==='finished' || chapter!==journeyChapter(g) || ![0,1].includes(topic)) return previous;
  if (previous?.chapters[chapter]?.solved) return previous;
  return {chapters:{...previous?.chapters,[chapter]:{topic,solved:false}}};
}
export function answerJourney(g: GameState, previous: JourneyProgress|undefined, chapter: number, answer: number): JourneyProgress|undefined {
  const current=previous?.chapters[chapter];
  if (!current || g.status==='finished' || chapter!==journeyChapter(g) || ![0,1].includes(answer)) return previous;
  return {chapters:{...previous!.chapters,[chapter]:{...current,tried:true,solved:current.solved || answer===chapters[chapter-1].topics[current.topic].correct}}};
}
export function renderJourney(g: GameState, progress?: JourneyProgress): string {
  const n=journeyChapter(g), chapter=chapters[n-1], pick=progress?.chapters[n], topic=pick?chapter.topics[pick.topic]:null;
  const goal=missionDisplay(g), reached=g.milestonesHit.includes('goal-100');
  return `<section class="journey-panel" aria-label="장별 도전과 탐험"><p class="eyebrow">${g.campaign?.practice?'분기 연습 · ':''}${n}장 / 4장 · ${3*n-2}–${3*n}턴</p><h2>${chapter.title}</h2><p>${goal.passed?'목표권에 들어왔어요. 이제 마지막까지 조건을 지키는 도전!':reached?'한 번 닿았던 목표를 회복해 보세요.':chapter.goal}</p><p class="hint">생활자금 기준 ${formatWon(profileLimits(g).safeCash)} · 최종 별은 12턴 뒤 판정</p>
    <details class="chapter-explore" data-preserve-open><summary>이번 장 작은 탐험 · ${pick?.solved?'기념카드 획득':'두 곳 중 한 곳 고르기'}</summary><p>선택 학습 · 실제 이동·미래 시장·매수 가능 범위는 바뀌지 않아요.</p>
    <div class="explore-topics">${chapter.topics.map((t,i)=>`<button class="secondary" data-action="journey-topic" data-chapter="${n}" data-topic="${i}" aria-pressed="${pick?.topic===i}" ${pick?.solved?'disabled':''}>${t.name}</button>`).join('')}</div>
    ${topic?`<article class="explore-clue"><h3>${topic.name}</h3><p>${topic.clue}</p>${pick!.solved?'<p role="status">✓ 이해했어요! 이번 장 기념카드를 모았어요.</p>':`<p><strong>${topic.question}</strong></p><div class="button-stack">${topic.answers.map((a,i)=>`<button data-action="journey-answer" data-chapter="${n}" data-answer="${i}">${a}</button>`).join('')}</div>${pick!.tried?'<p role="status">단서를 다시 읽어 보세요. 벌점 없이 다시 고를 수 있어요.</p>':''}`}</article>`:''}<p class="hint">기념카드는 장식 보상이며 자금·별·학습 점수를 올리지 않아요.</p></details>${renderJourneyAlbum(progress)}</section>`;
}
export function renderJourneyAlbum(progress?: JourneyProgress): string {
  const entries=Object.entries(progress?.chapters??{}).filter(([,p])=>p.solved);
  return `<details class="journey-album"><summary>내 탐험 앨범 ${entries.length}/4</summary>${entries.length?`<ul>${entries.map(([n,p])=>`<li>✦ ${n}장 · ${chapters[Number(n)-1].topics[p.topic].name}</li>`).join('')}</ul>`:'<p>장마다 한 곳의 단서를 읽고 작은 질문을 풀면 기념카드를 얻어요.</p>'}</details>`;
}
