import type { GameState } from '../types';
import { formatWon, signedWon } from './format';
const esc=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function renderDecisionHighlights(g:GameState): string {
 const reviews=g.campaign?.reviews??[];
 if (!reviews.length) return '';
 const choices=[reviews.find(r=>Math.abs(r.flow)>0),[...reviews].sort((a,b)=>a.market-b.market)[0],reviews.at(-1)].filter((r,i,a)=>r && a.findIndex(x=>x?.turn===r.turn)===i);
 return `<section class="decision-highlights"><h2>내 선택으로 돌아보는 이번 판</h2><div>${choices.map(r=>`<article><small>${r!.turn}턴 · ${esc(r!.headline)}</small><h3>${r!.actions.map((a,i)=>esc(a.replace('이번 턴은 행동하지 않고',i>0?'남은 행동은 추가 거래 없이':'새 운용지시 없이'))).join(' · ')||'기존 구성 유지'}</h3><p>시장 손익 ${signedWon(r!.market)} · 순입출금 ${signedWon(r!.flow)}</p><p>정산 뒤 IRP ${formatWon(r!.irp)} · 생활자금 ${formatWon(r!.cash)}</p></article>`).join('')}</div><p class="hint">실제 기록의 대표 장면이에요. 시장 손익 전체가 그 턴의 선택 때문에 발생한 것은 아니에요.</p></section>`;
}
