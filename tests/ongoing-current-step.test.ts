// @vitest-environment happy-dom
import { expect, it } from 'vitest';
import { renderOngoingSchedule } from '../src/ui/ongoing-view';
import type { PendingOrder } from '../src/types';
const order: PendingOrder = {id:'review',productId:'shortBond',side:'buy',stage:'priced',amount:6174011,submittedTurn:6,priceTurn:7,settlesTurn:8};
const render = (value:PendingOrder,turn:number) => {const root=document.createElement('div');root.innerHTML=renderOngoingSchedule(value,turn);return root;};
it('7턴에는 기준가를 현재 단계로 강조하고 결제는 예정으로 표시한다',()=>{
 const root=render(order,7);
 expect(root.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
 expect(root.querySelector('.current')?.textContent).toBe('기준가7턴현재 7턴');
 expect(root.querySelector('.complete')?.textContent).toBe('접수6턴완료');
 expect(root.querySelector('.planned')?.textContent).toBe('결제8턴예정');
});
it('접수 상태와 지연된 주문은 날짜만으로 완료 처리하지 않는다',()=>{
 const before=JSON.stringify(order);
 expect(render({...order,stage:'received'},6).querySelector('.current')?.textContent).toBe('접수6턴현재 6턴');
 expect(render(order,8).querySelector('.current')?.textContent).toBe('기준가7턴현재 8턴');
 expect(render(order,8).querySelector('.planned')?.textContent).toBe('결제8턴예정');
 expect(JSON.stringify(order)).toBe(before);
});
it('12턴 이후 일정은 최종 정산으로 남긴다',()=>{
 const root=render({...order,side:'sell',priceTurn:12,settlesTurn:13},12);
 expect(root.querySelector('.current')?.textContent).toBe('기준가12턴현재 12턴');
 expect(root.querySelector('.planned')?.textContent).toBe('결제최종 정산예정');
});
