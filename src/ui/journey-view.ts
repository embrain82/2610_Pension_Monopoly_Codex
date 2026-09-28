import type { GameState } from '../types';
import { missionDisplay } from '../engine/progress-engine';
import { profileLimits } from '../engine/profile-engine';
import { formatWon } from './format';

const chapters = [{"title": "기초 다지기", "goal": "생활자금과 IRP 안의 돈을 구분해 보세요."}, {"title": "변화에 적응하기", "goal": "시장 변화 뒤 위험비중과 생활자금 여유를 확인해 보세요."}, {"title": "목표에 다가가기", "goal": "납입 효과와 운용 수익을 따로 확인해 보세요."}, {"title": "은퇴 준비 마무리", "goal": "목표·생활 안정·낙폭 조건을 점검하고 수령 방식을 비교하세요."}];
export function journeyChapter(g: GameState): number {
  return Math.min(4, Math.max(1, Math.ceil((g.turn + (!g.awaitingAction && !g.currentEventId && g.status !== 'finished' ? 1 : 0)) / 3)));
}
/** 장별 목표 안내만 유지한다. 탐험 선택·기념카드·앨범은 제거했다. */
export function renderJourney(g: GameState): string {
 const n=journeyChapter(g), chapter=chapters[n-1];
 const goal=missionDisplay(g), reached=g.milestonesHit.includes('goal-100');
 return `<section class="journey-panel" aria-label="장별 목표 안내"><p class="eyebrow">${g.campaign?.practice?'분기 연습 · ':''}${n}장 / 4장 · ${3*n-2}–${3*n}턴</p><h2>${chapter.title}</h2><p>${goal.passed?'목표권에 들어왔어요. 이제 마지막까지 조건을 지키는 도전!':reached?'한 번 닿았던 목표를 회복해 보세요.':chapter.goal}</p><p class="hint">생활자금 기준 ${formatWon(profileLimits(g).safeCash)} · 최종 별은 12턴 뒤 판정</p></section>`;
}
