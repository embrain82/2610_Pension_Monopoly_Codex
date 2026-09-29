// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { createGame, startTurn } from '../src/engine/game-engine';
import { products } from '../src/data/content';
import { marketTotals, renderMarketTotals } from '../src/ui/market-totals';
import { renderMarketImpacts } from '../src/ui/market-impact-view';
import { renderOrderLayout } from '../src/ui/order-layout';
import { applyMarketStep, marketHoldingEffects } from '../src/engine/market-engine';
import { returnExplanation } from '../src/ui/return-explanation';
import type { MarketHoldingEffect } from '../src/types';
const dom=(html:string)=>{const root=document.createElement('div');root.innerHTML=html;return root;};
it.each([[100,200,-500,-1000,300,-400],[1,2,3,4,5,6],[-1,-2,-3,-4,-5,-6]])('모든 실제 손익을 고정 순서로 표시하고 합계를 맞춘다 %j',(...values)=>{
 const effects:MarketHoldingEffect[]=products.map((p,i)=>({productId:p.id,opening:100000,delta:values[i],returnRate:values[i]/100000}));
 const ledger={open:1000000,afterMarket:1000000+values.reduce((a,b)=>a+b,0)+100,marketEffects:effects,cashInterest:{turn:1,opening:100000,rate:.001,amount:100}};
 const total=marketTotals(ledger,1);expect(total.complete).toBe(true);expect(total.gains!+total.losses!+total.cash!).toBe(total.total);
 const root=dom(renderMarketImpacts([...effects].reverse(),1,false,true));
 expect([...root.querySelectorAll('li>div>strong')].map(x=>x.textContent)).toEqual(products.map(p=>p.shortName));
 expect(root.querySelectorAll('li')).toHaveLength(6);expect(root.querySelectorAll('details[open]')).toHaveLength(0);
 expect(root.querySelectorAll('details .holding-cause')).toHaveLength(6);
});
it('빈 내역과 구형 기록을 구분하고 불일치를 숨기지 않는다',()=>{
 const ledger={open:100,afterMarket:100};
 expect(marketTotals({...ledger,marketEffects:[]},1).complete).toBe(true);
 expect(marketTotals(ledger,1).gains).toBeNull();
 expect(renderMarketTotals(ledger,1)).toContain('상세 기록');
 expect(renderMarketTotals({...ledger,afterMarket:123,marketEffects:[]},1)).toContain('+23원 차이');
 expect(marketTotals({...ledger,marketEffects:[],cashInterest:{turn:2,opening:100,rate:.001,amount:.1}},1).cash).toBeNull();
});
it('실제 시장 처리에서 예금·채권·주식 보수 계산과 대기 이자를 합계에 한 번만 반영한다',()=>{
 for(const profile of ['stable','balanced','aggressive'] as const){
  const state=startTurn(createGame('feedback-'+profile,profile,500000,{updatedFinance:true}),3).state;
  expect(marketTotals(state.ledger,state.turn).complete).toBe(true);
 }
 const before=createGame('feedback-all');before.holdings=products.map(p=>({productId:p.id,amount:1000000,principal:1000000,depositTurnsHeld:0}));
 const market=before.marketPath[0];const after=applyMarketStep({...before,turn:1},market);
 for(const effect of marketHoldingEffects(before,after)){
  const why=returnExplanation(effect,market);expect(why.rows.reduce((sum,row)=>sum+row.value,0)).toBeCloseTo(effect.delta,5);
  if(effect.productId==='equityEtf'){expect(why.rows[0].label).toBe('가격 변동에 따른 손익');expect(why.note).not.toContain('기타');}
  if(effect.productId==='longBond')expect(why.note).toContain('세부 원인별');
 }
});
it('운용지시 전환과 용어 도움말을 분리하며 접힘을 기본으로 한다',()=>{
 const root=dom(renderOrderLayout(createGame('order-feedback'),{kind:'buy',title:'상품 사기',inputs:'',preview:'',actions:''}));
 expect(root.querySelector('.order-alternatives>summary')?.textContent).toBe('다른 운용지시 선택');
 expect(root.querySelector('.order-alternatives[open]')).toBeNull();
 expect(root.querySelectorAll('.order-tabs button')).toHaveLength(5);
 expect(root.querySelector('.order-alternatives-help .term-help')).not.toBeNull();
});
