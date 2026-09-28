import type { GameState } from '../types';
import { missionDisplay } from '../engine/progress-engine';
import { profileLimits } from '../engine/profile-engine';
import { formatWon } from './format';

const chapters = [{"title": "기초 다지기", "goal": "생활에 쓸 돈과 은퇴를 준비할 돈, 각각 어디에 있는지 확인해보세요."}, {"title": "변화에 적응하기", "goal": "시장이 달라졌어요. 위험자산의 비중과 앞으로 쓸 생활자금이 충분한지 살펴보세요."}, {"title": "목표에 다가가기", "goal": "은퇴자금이 얼마나 늘었나요? 추가로 납입한 돈과 운용으로 생긴 이익·손실을 나누어 살펴보세요."}, {"title": "은퇴 준비 마무리", "goal": "마무리할 시간이에요. 목표 달성 여부와 남은 생활자금, 운용 중 자산이 얼마나 하락했는지 확인하고 연금과 일시금 수령을 비교해보세요."}];
export function journeyChapter(g: GameState): number {
  return Math.min(4, Math.max(1, Math.ceil((g.turn + (!g.awaitingAction && !g.currentEventId && g.status !== 'finished' ? 1 : 0)) / 3)));
}
/** 장별 목표 안내만 유지한다. 탐험 선택·기념카드·앨범은 제거했다. */
export function renderJourney(g: GameState): string {
 const n=journeyChapter(g), chapter=chapters[n-1];
 const goal=missionDisplay(g), reached=g.milestonesHit.includes('goal-100');
 return `<section class="journey-panel" aria-label="장별 목표 안내"><ol class="journey-chapters" aria-label="4개 장 중 현재 장">${chapters.map((_, i) => `<li${i + 1 === n ? ' aria-current="step"' : ''}>${i + 1}장</li>`).join('')}</ol><p class="eyebrow">${g.campaign?.practice?'분기 연습 · ':''}${n}장 / 4장 · ${3*n-2}–${3*n}턴</p><h2>${chapter.title}</h2><p>${goal.passed?'현재 목표에 도달했어요! 마지막까지 목표를 유지하면서 생활자금과 자산의 변동도 함께 살펴보세요.':reached?'목표에 도달한 뒤 다시 조금 멀어졌어요. 무엇이 달라졌는지 살펴보고, 남은 턴의 운용을 생각해보세요.':chapter.goal}</p><div class="journey-foot"><div>생활자금 평가 기준: <strong>${formatWon(profileLimits(g).safeCash)}</strong></div><div>최종 별은 12턴을 마친 뒤 정해져요.</div></div></section>`;
}
