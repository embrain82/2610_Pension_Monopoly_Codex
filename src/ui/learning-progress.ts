import { formatWon } from './format';
import type { GameState, LearningCard } from '../types';
import { calculateScore, knowledgeBreakdown, KNOWLEDGE_CAPS, starChecklist, stabilityBreakdown } from '../engine/scoring-engine';
import { learningExamples } from '../data/learning-examples';

export function renderConceptExample(card: LearningCard):string {
 const e=learningExamples[card.id];
 if(!e)return '';
 return `<details class="concept-example" data-preserve-open><summary>먼저 개념과 다른 예시 살펴보기</summary><p><strong>${e.concept}</strong></p><p>${e.example}</p><small>설명용 예시예요. 아래 문제에서는 다른 상황에 적용해 보세요. 읽기만 해서는 점수나 행동이 변하지 않아요.</small></details>`;
}
export function learningProgressData(state:GameState) {
 const k=knowledgeBreakdown(state), score=calculateScore(state);
 const without=calculateScore({...state,quizLog:[]});
 return { ...k, quizCap:state.campaign?16:KNOWLEDGE_CAPS.quiz, contribution:score.totalScore-without.totalScore, totalScore:score.totalScore };
}
export function renderLearningProgress(state:GameState):string {
 const k=learningProgressData(state);
 return `<aside class="learning-progress" aria-label="퀴즈 점수의 쓰임"><strong>학습 ${k.total}/20점 · 퀴즈 정답 ${k.quizCorrect}개</strong><p>시작 기본 ${KNOWLEDGE_CAPS.base}점 · 퀴즈 획득 ${k.quiz}/${k.quizCap}점${!state.campaign ? ` · 이해 ${k.understanding}점 · 리밸런싱 ${k.rebalance}점` : ''}${k.penalty ? ` · 위반 감점 −${k.penalty}점` : ''}</p><p>학습 점수는 12턴 최종 종합점수 100점 중 20점에 포함돼요.</p><details data-preserve-open><summary>퀴즈 기여와 평가 기준</summary><p>퀴즈 항목 ${k.quiz}/${k.quizCap}점 · 정답 1개당 최대 2점.</p><small>현재 퀴즈가 종합점수에 더한 점수 +${k.contribution}점 · 상한·감점 반영. 연금액·자산·별을 직접 늘리지는 않아요. 퀴즈는 선택이며 오답 벌점은 없어요.</small></details></aside>`;
}
export function renderFinalPerformance(state:GameState, selected: string | null = null):string {
 const s=calculateScore(state), k=learningProgressData(state),checks=starChecklist(state,s);
 const good=checks.find(c=>c.passed);
 const next=checks.find(c=>!c.passed);
 return `<section class="final-performance" aria-label="목표와 학습의 최종 성과"><h2>목표와 배움을 함께 돌아봐요</h2><p class="final-total">종합 성과 <strong>${s.totalScore}/100점</strong></p><div class="performance-parts">${[['income','연금 목표',s.incomeScore,50,'목표용 월 환산액 기준'],['stability','안정성',s.stabilityScore,30,'생활자금·낙폭·분산 등'],['learning','학습',s.knowledgeScore,20,'퀴즈와 이해 점수']].map(([id,label,value,max,sub])=>`<button type="button" data-action="score-detail" data-part="${id}" aria-expanded="${selected===id}" aria-controls="score-detail-panel" class="score-part ${selected===id?'selected':''}"><strong>${label} ${value}/${max}</strong><small>${sub}</small><span aria-hidden="true">${selected===id?'⌃':'⌄'}</span></button>`).join('')}</div><div id="score-detail-panel" class="score-detail-panel" ${selected?'':'hidden'}>${selected ? renderScoreDetail(state,selected) : ''}</div><p class="hint">각 항목과 합계는 반올림하므로 표시 점수의 합이 1점 다를 수 있어요. 별은 미션·생활자금 등 별도 조건으로 결정해요.</p><div class="result-takeaway"><p><strong>이번 판에서 해낸 것</strong><br>${good?good.label:k.quizCorrect?`퀴즈 ${k.quizCorrect}문항을 맞히며 배웠어요.`:'12턴을 끝까지 진행하며 결과를 확인했어요.'}</p><p><strong>다음 도전 한 가지</strong><br>${next?next.label+' 조건을 먼저 살펴보세요.':'달성한 조건을 다른 시장에서도 지킬 수 있는지 비교해 보세요.'}</p></div></section>`;
}

function renderScoreDetail(state:GameState, selected:string):string {
 const s=calculateScore(state), k=learningProgressData(state);
 const row=(label:string,value:string)=>`<div><dt>${label}</dt><dd>${value}</dd></div>`;
 if(selected==='income')return `<h3>연금 목표 점수는 어떻게 정해졌나요?</h3><dl>${row('목표 월 연금액',formatWon(state.goalMonthly))}${row(state.payoutChoice==='lumpSum'?'목표용 월 환산액 · 일시금 조정':'목표용 월 환산액 · 세전',formatWon(s.monthlyPension))}${row('목표 달성률',(s.goalRate*100).toFixed(1)+'%')}${row(s.monthlyPension>=state.goalMonthly?'목표 초과 금액':'목표까지 부족한 금액','월 '+formatWon(Math.abs(state.goalMonthly-s.monthlyPension)))}${row('획득 점수',`${s.incomeScore} / 50점`)}</dl><p>달성률 × 50점 = ${(Math.min(50,Math.max(0,s.goalRate*50))).toFixed(2)}점 → 반올림 ${s.incomeScore}점. 최대 50점이에요.</p><small>${state.payoutChoice==='lumpSum'?'일시금은 세후 비교 비율을 반영한 목표용 환산액이며 실제 월 지급액이 아니에요.':'세전 목표용 월 환산액 기준이며 세후 수령액과 구분해요.'}</small>`;
 if(selected==='stability')return `<h3>안정성 점수는 어떻게 정해졌나요?</h3><dl>${stabilityBreakdown(state).map(r=>{const detail=r.unit==='won'?`${formatWon(r.value)} / 기준 ${formatWon(r.target)} · 미지급 생활비 차감 후`:r.unit==='percent'?`최대 ${(r.value*100).toFixed(1)}% / 허용 ${(r.target*100).toFixed(1)}%`:r.unit==='count'?`${r.value}개 상품군 · 개수 × 2.4점, 최대 7점`:`${r.value}회 · 5점에서 1회당 2점 차감`;return row(r.label,`${r.points.toFixed(2)} / ${r.max}점<small>${detail}</small>`)}).join('')}</dl><p>생활자금은 기준액 미달 시 비례 계산해요. 최대 낙폭은 허용 기준 이내면 9점, 초과하면 9 × (1 − 최대 낙폭)으로 계산해요.</p><p>세부 점수의 반올림 전 합계를 반올림해 <strong>${s.stabilityScore}/30점</strong>이에요.</p>`;
 return `<h3>학습 점수는 어떻게 정해졌나요?</h3>${renderLearningProgress(state)}<p>기본 ${KNOWLEDGE_CAPS.base} + 퀴즈 ${k.quiz}${state.campaign?'':` + 이해 ${k.understanding} + 리밸런싱 ${k.rebalance}`} − 위반 ${k.penalty} → <strong>${k.total}/20점</strong> (0~20점 상한).</p><small>위반 감점은 게임에서 기록된 규정 위반에 따른 값이며 퀴즈 오답 벌점은 없어요.${state.campaign?' 이 판은 거래 횟수 보너스 없이 기본 4점과 퀴즈 최대 16점으로 평가해요.':''}</small>`;
}
