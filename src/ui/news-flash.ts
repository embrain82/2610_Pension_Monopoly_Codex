import { explainMarketStep } from '../engine/market-explanation';
import { renderMarketStory } from './market-story';
export { renderIrpApplied } from './market-story';
import { marketShocks } from '../data/content';
import type { BoardTile, MarketStep, TileEffect, TurnLedger } from '../types';
import { renderMarketAlert } from './market-view';
import { renderSpeech } from './speech';
import { renderTileEffects } from './tile-effects-view';
import type { ScenePace } from './fx';

const DIAL_SWEEP_DEG = 120;

export const COACH_MARKET_FIRST = '뉴스를 본 순간 가격은 이미 움직였어요. 투자상품 수익률은 턴 시작에 보유분에 들어갔고, 지금 고르는 행동은 다음 턴 흐름에 거는 거예요.';

export interface NewsFlashOptions {
  compact?:boolean;
  nextLabel?: string;
  characters: boolean;
  /** 턴 시작 → 시장 반영 IRP. 있으면 "내 IRP에 반영" 줄을 그린다 */
  ledger?: Pick<TurnLedger, 'open' | 'afterMarket' | 'marketEffects' | 'cashInterest'>;
  /** 이번 턴 도착·통과 칸 효과(최대 2개) */
  tileEffects?: TileEffect[];
  /** 1턴에만 나오는 코치 말풍선 */
  coach?: boolean;
  /** 후반 가속. fast면 헤드라인 타이핑·다이얼·화살표 연출이 절반 길이 */
  pace?: ScenePace;
}

export function dialAngle(ratePct: number, minPct: number, maxPct: number): number {
  if (maxPct <= minPct) return 0;
  const ratio = Math.min(1, Math.max(0, (ratePct - minPct) / (maxPct - minPct)));
  return Math.round((ratio * 2 - 1) * DIAL_SWEEP_DEG * 100) / 100;
}

export function renderNewsFlash(step: MarketStep, _prev: MarketStep, tile: BoardTile, options: NewsFlashOptions = { characters: true }): string {
  step = explainMarketStep(step);
  const shock = step.shockId ? marketShocks.find((item) => item.id === step.shockId) : undefined;
  const live = tile.kind === 'market' ? '<span class="news-live">현장 연결</span>' : '';
  const classes = ['news-flash', step.shock ? 'shock' : '', shock?.positive ? 'positive' : '', options.pace === 'fast' ? 'fast' : '', 'road-news'].filter(Boolean).join(' ');
  const coach = options.coach
    ? renderSpeech('coach', `<p>${COACH_MARKET_FIRST}</p>`, { characters: options.characters, title: '코치 · 첫 턴 한마디' })
    : '';
  const effects = renderTileEffects(options.tileEffects ?? [], { compact: true });
  return `<div class="${classes}">
    <div class="news-tape"><span class="news-badge">${step.shock ? '속보 · 충격' : '속보'}</span><span>TURN ${String(step.turn).padStart(2, '0')}</span><span class="news-phase">${step.phase}</span>${live}</div>
    <h2 class="news-headline">${step.headline}</h2>
    ${renderMarketStory(step,options.ledger)}
    ${coach}
    ${renderMarketAlert(step)}
    <section class="news-arrival-card"><p class="news-arrival">도착 · ${String(tile.index + 1).padStart(2, '0')} ${tile.label}</p>${effects}</section>
    <div class="button-stack compact"><button class="primary jumbo" data-action="dismiss-news">${options.nextLabel ?? '계속'}</button><button class="text-button" data-action="open-tile">칸 설명 보기</button></div>
  </div>`;
}
