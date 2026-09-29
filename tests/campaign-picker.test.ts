// @vitest-environment happy-dom
import { beforeEach, expect, it } from 'vitest';
import { PensionRoadApp } from '../src/ui/app';
import { defaultSave, STORAGE_KEY } from '../src/ui/ui-state';

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...defaultSave, goalMonthly: 650000 }));
  document.body.innerHTML = '<div id="app"></div>';
});
it('시장과 미션을 바꾸면 선택을 유지한 채 해당 설명과 실제 목표를 갱신한다', () => {
  const root = document.querySelector<HTMLElement>('#app')!;
  new PensionRoadApp(root);
  root.querySelector<HTMLDetailsElement>('.road-personalize')!.open = true;
  root.querySelector<HTMLDetailsElement>('.campaign-picker')!.open = true;
  const choose = (id: string, value: string) => {
    const select = root.querySelector<HTMLSelectElement>(id)!;
    select.value = value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(root.querySelector<HTMLSelectElement>(id)!.value).toBe(value);
    expect(root.querySelector<HTMLDetailsElement>('.campaign-picker')!.open).toBe(true);
  };
  expect(root.querySelector('#campaign-mission-description')!.textContent).toContain('650,000원');
  for (const [scenario, expected] of [['inflation','지출액'], ['recession','회복 강도'], ['recovery','되돌림'], ['classic','예금·채권·주식']]) {
    choose('#scenario-pick', scenario);
    expect(root.querySelector('#campaign-market-description')!.textContent).toContain(expected);
  }
  choose('#mission-pick', 'cushion');
  expect(root.querySelector('#campaign-mission-description')!.textContent).toContain('1,800만원');
  expect(root.querySelector('#campaign-mission-description')!.textContent).toContain('미지급 생활비는 0원');
  choose('#scenario-pick', 'inflation');
  expect(root.querySelector<HTMLSelectElement>('#mission-pick')!.value).toBe('cushion');
  choose('#mission-pick', 'purchasing');
  expect(root.querySelector('#campaign-mission-description')!.textContent).toContain('납입을 제외한');
  expect(root.querySelector('#campaign-mission-description')!.textContent).toContain('100 이상');
  choose('#mission-pick', 'pension');
  expect(root.querySelector('#campaign-mission-description')!.textContent).toContain('650,000원');
  expect(root.querySelector('#campaign-mission-description')!.textContent).not.toContain('1,800만원');
});
