// @vitest-environment happy-dom
import {it,expect} from 'vitest';
import {PensionRoadApp} from '../src/ui/app';
import {createGame,startTurn} from '../src/engine/game-engine';
import {knowledgeBreakdown} from '../src/engine/scoring-engine';
import {defaultSave,STORAGE_KEY} from '../src/ui/ui-state';
import {CHECKPOINT_KEY,checkpointVersion,parseCheckpoint} from '../src/ui/play-checkpoint';
const setup=(modal:string|null, arrivalPending=false)=>{
 localStorage.clear();document.body.innerHTML='<div id="app"></div>';
 const g={...startTurn(createGame('life-report','growth',500000,{scenario:'classic',ghost:false}),5).state,currentEventId:'moving',awaitingAction:false};
 localStorage.setItem(STORAGE_KEY,JSON.stringify({...defaultSave,disclaimerAccepted:true,quickGuideSeen:true,howtoSeen:true}));
 localStorage.setItem(CHECKPOINT_KEY,JSON.stringify({version:checkpointVersion(g),game:g,modal,arrivalPending,lastSummary:null,quizCardId:null,quizPicked:null,finalQuizQueue:[],finalQuizTotal:0,finishing:false,defaultOptionAsk:false}));
 const root=document.querySelector<HTMLElement>('#app')!;new PensionRoadApp(root);
 root.querySelector<HTMLButtonElement>('[data-action="resume-game"]')!.click();return root;
};
it('미응답 학습은 기본4점이며 퀴즈 획득은 0점이다',()=>{const g=createGame('score-report','growth',500000,{scenario:'classic',ghost:false});expect(knowledgeBreakdown(g)).toMatchObject({total:4,quiz:0,quizCorrect:0});});
it.each(['open-portfolio','open-market','open-settings'])('%s 조회 후 닫으면 미해결 생활사건으로 돌아간다',action=>{
 const root=setup('life');const before=parseCheckpoint(localStorage.getItem(CHECKPOINT_KEY))!.game;expect(root.querySelector('.modal-life')).not.toBeNull();
 root.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!.click();
 root.querySelector<HTMLButtonElement>('[data-action="close-modal"]')!.click();
 expect(root.querySelector('.modal-life')).not.toBeNull();
 expect(root.querySelector<HTMLButtonElement>('[data-action="open-life"]')!.disabled).toBe(false);
 expect(parseCheckpoint(localStorage.getItem(CHECKPOINT_KEY))!.game).toEqual(before);
});
it('미해결 사건의 창 없는 저장은 이어하기에서 복원한다',()=>{
 const root=setup(null);expect(root.querySelector('.modal-life')).not.toBeNull();expect(root.querySelector<HTMLButtonElement>('[data-action="open-life"]')!.disabled).toBe(false);
});

it('하단 재진입은 사건을 다시 실행하지 않으며 현재 금액을 유지한다',()=>{
 const root=setup(null),before=parseCheckpoint(localStorage.getItem(CHECKPOINT_KEY))!.game;
 root.querySelector<HTMLButtonElement>('[data-action="open-life"]')!.click();
 expect(root.querySelector('.modal-life')).not.toBeNull();expect(parseCheckpoint(localStorage.getItem(CHECKPOINT_KEY))!.game).toEqual(before);
});
it('도착 대기와 시장 속보는 생활사건 복원보다 먼저 유지된다',()=>{
 let root=setup('news');expect(root.querySelector('.modal-news')).not.toBeNull();
 root=setup(null,true);expect(root.querySelector('.modal-life')).toBeNull();expect(root.querySelector('[data-action="continue-arrival"]')).not.toBeNull();
});
