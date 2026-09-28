import { autoplay, type AutoStrategy, type AutoplayOptions } from '../engine/game-engine';
import { calculateScore } from '../engine/scoring-engine';
import { choosePayout } from '../engine/game-engine';
import type { ProfileId } from '../types';
import { PensionRoadApp } from './app';

const common: AutoplayOptions = { scenario:'classic', defaultTrading:true, defaultLifecycle:true, updatedFinance:true, settlementLearning:true, contributionPacing:true, automaticStamps:true, ghost:false };
export const resultCases: Array<{id:string;name:string;seed:string;strategy:AutoStrategy;profile:ProfileId;options?:AutoplayOptions;lump?:boolean}> = [
 {id:'balanced',name:'균형 운용 · 기본 결과',seed:'review-1',strategy:'balanced',profile:'balanced'},
 {id:'goal-met',name:'낮은 목표 · 목표 달성 점검',seed:'review-2',strategy:'steward',profile:'balanced',options:{goalMonthly:300000}},
 {id:'goal-unmet',name:'높은 목표 · 목표 미달 점검',seed:'review-3',strategy:'passive',profile:'balanced',options:{goalMonthly:900000}},
 {id:'contribution',name:'추가납입 중심',seed:'review-4',strategy:'contributor',profile:'balanced'},
 {id:'deposit',name:'안정형 · 보유 유지',seed:'review-5',strategy:'passive',profile:'stable'},
 {id:'equity',name:'주식 ETF 중심',seed:'review-6',strategy:'etfOnly',profile:'aggressive'},
 {id:'recession',name:'경기침체 · 공격적 운용',seed:'review-7',strategy:'etfOnly',profile:'aggressive',options:{scenario:'recession'}},
 {id:'default-option',name:'디폴트옵션 운용',seed:'review-8',strategy:'defaultOption',profile:'balanced'},
 {id:'quiz-none',name:'학습 비교 · 퀴즈 미참여',seed:'review-learning',strategy:'balanced',profile:'balanced',options:{quiz:'none'}},
 {id:'quiz-correct',name:'학습 비교 · 퀴즈 정답',seed:'review-learning',strategy:'balanced',profile:'balanced',options:{quiz:'correct'}},
 {id:'annuity',name:'수령 비교 · 연금',seed:'review-payout',strategy:'steward',profile:'balanced'},
 {id:'lump-sum',name:'수령 비교 · 일시금',seed:'review-payout',strategy:'steward',profile:'balanced',lump:true}
];
export function resultCaseState(id:string) {
 const c=resultCases.find(c=>c.id===id);
 if(!c)return null;
 const state=autoplay(c.seed,c.strategy,c.profile,{...common,...c.options});
 return choosePayout(state,c.lump?'lumpSum':'annuity20').state;
}
export function mountResultReview(root:HTMLElement,id:string) {
 const selected=resultCases.find(c=>c.id===id);
 const header=document.createElement('aside');
 header.className='result-review-nav';
 header.innerHTML=`<strong>게임 종료 화면 검토</strong><p>실제 규칙으로 12턴을 자동 진행한 결과입니다. 결과 화면·수령 비교·상세 펼치기를 확인할 수 있어요. 저장·업적·최고 기록은 변경하지 않습니다. 재도전 버튼은 검토 모드에서 실행하지 않습니다.</p><nav aria-label="결과 케이스">${resultCases.map(c=>`<a href="?resultReview=${c.id}" ${c.id===id?'aria-current="page"':''}>${c.name}</a>`).join('')}</nav><a href="?resultReview=all">전체 케이스 목록</a> · <a href="/">일반 게임으로</a>`;
 root.before(header);
 if(!selected){root.innerHTML=`<section class="result-review-index"><h1>${id==='all'?'확인할 종료 화면을 선택하세요':'찾을 수 없는 케이스입니다'}</h1><p>각 링크는 같은 시드와 선택으로 재현됩니다. 별점과 금액은 임의 지정하지 않고 실제 계산합니다.</p>${resultCases.map(c=>{const state=resultCaseState(c.id)!;const s=calculateScore(state);return `<article><a href="?resultReview=${c.id}"><h2>${c.name}</h2></a><p>별 ${s.stars}개 · 종합 ${s.totalScore}점 · 학습 ${s.knowledgeScore}/20점</p><p>최종 IRP ${Math.round(s.irpValue).toLocaleString('ko-KR')}원 · 생활자금 ${Math.round(s.cash).toLocaleString('ko-KR')}원</p></article>`;}).join('')}</section>`;return;}
 const state=resultCaseState(id)!;
 const label=document.createElement('p');label.textContent=`현재 케이스: ${selected.name} · 시드 ${selected.seed}`;header.append(label);
 new PensionRoadApp(root,{resultState:state});
}
