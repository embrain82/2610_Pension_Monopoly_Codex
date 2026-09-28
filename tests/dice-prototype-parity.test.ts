import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
import { diceThrowPlan } from '../src/ui/dice-throw';
import { defaultSave, loadSave } from '../src/ui/ui-state';

// Execute the original standalone proposal's B branch against recording targets.
// This deliberately uses the frozen proposal rather than a copy of production frames.
const html=readFileSync('docs/prototypes/dice-motion-lab.html','utf8');
const branch=html.slice(html.indexOf("if(id==='B')"),html.indexOf("if(id==='C')"));
const pushes=html.match(/active\.push\(flight\.animate[^\n]+/)![0].replace(/\}\);$/, ';');
const original=new Function('x','y','sign','i','speed', `
  const duration=1700/speed,delay=i*85/speed,end=\`rotateX(\${x}deg) rotateY(\${y}deg)\`,id='B';
  let path,turns;const calls=[],active=[];
  const record=()=>({animate:(frames,options)=>{calls.push({frames,options});return {};}});
  const flight=record(),cube=record(),shadow=record();
  ${branch}
  ${pushes}
  return calls;
`);
it('원본 B안과 6개 눈·양쪽 주사위·3개 속도의 궤적, 회전, 그림자 및 타이밍이 일치한다',()=>{
 const poses=[[0,0],[0,-90],[-90,0],[90,0],[0,90],[0,180]];
 for(const speed of [1,1.5,2]) for(const variant of [0,1] as const) for(let face=1;face<=6;face++) {
   const plan=diceThrowPlan(face,variant,speed),[x,y]=poses[face-1];
   expect([plan.flight,plan.cube,plan.shadow]).toEqual(original(x,y,variant===0?-1:1,variant,speed));
 }
});
it('새 사용자와 종전 기본속도는 1.5배속, 명시적으로 선택한 1배속은 유지한다',()=>{
 expect(defaultSave.settings.speed).toBe(1.5);
 for(const [speed,selected,expected] of [[1,false,1.5],[2,false,2],[1,true,1],[1.5,true,1.5],[2,true,2]] as const) {
  const save={...defaultSave,settings:{...defaultSave.settings,speed,speedSelected:selected}};
  expect(loadSave({getItem:()=>JSON.stringify(save)}).settings.speed).toBe(expected);
 }
});
