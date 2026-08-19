/** Arbitrage / export parity engine (TS port of Python ApolloArbitrageEngine concepts) */

import { getCropPriceSummary } from './marketAgmarknet';

const HORT_EXPORT_USD_TON: Record<string, number> = {
  GRAPE: 3330,
  ONION: 450,
  POMEGRANATE: 2400,
  MANGO: 3800,
  BANANA: 650,
  TOMATO: 550,
  POTATO: 380,
  TURMERIC: 1850,
  COTTON: 1800,
  WHEAT: 280,
  SOYBEAN: 420,
  SUGARCANE: 220,
};

const DEFAULT_FRICTION_INR_PER_TON = 3500;
const FALLBACK_USD_INR = 83.5;

export type ArbitrageResult = {
  status: 'SUCCESS' | 'FAILED';
  reason?: string;
  commodity: string;
  region: string;
  forex_usd_inr: number;
  market_type: string;
  local_spot_price_quintal_inr: number;
  local_spot_price_ton_inr: number;
  global_futures_usd_per_ton: number;
  net_export_value_inr: number;
  arbitrage_spread_inr_ton: number;
  spread_percentage: number;
  action_tag: string;
  directive_message: string;
};

function coreKey(commodity: string): string {
  return commodity.split('(')[0].replace(/Grape/i, 'GRAPE').trim().toUpperCase();
}

export function evaluateMarketArbitrage(commodity: string, state = 'Maharashtra'): ArbitrageResult {
  const spot = getCropPriceSummary(commodity, state);
  if (spot.status !== 'SUCCESS') {
    return {
      status: 'FAILED',
      reason: `Unable to fetch spot mandi data for ${commodity}`,
      commodity,
      region: state,
      forex_usd_inr: FALLBACK_USD_INR,
      market_type: '—',
      local_spot_price_quintal_inr: 0,
      local_spot_price_ton_inr: 0,
      global_futures_usd_per_ton: 0,
      net_export_value_inr: 0,
      arbitrage_spread_inr_ton: 0,
      spread_percentage: 0,
      action_tag: '—',
      directive_message: 'No data',
    };
  }

  const key = coreKey(commodity);
  const usdTon = HORT_EXPORT_USD_TON[key] ?? 800;
  const usdInr = FALLBACK_USD_INR;
  const localTon = spot.modal_price_ton;
  const grossExport = usdTon * usdInr;
  const netExport = grossExport - DEFAULT_FRICTION_INR_PER_TON;
  const spread = netExport - localTon;
  const pct = localTon > 0 ? (spread / localTon) * 100 : 0;

  let action_tag = '🟡 EQUILIBRIUM / HOLD';
  let directive_message = 'Price differential is within logistics friction. Hold in climate-controlled storage.';
  if (pct > 12) {
    action_tag = '🟢 EXPORT FAVORABLE';
    directive_message = 'Global market offers a premium over domestic mandis. Route inventory toward APEDA export corridors.';
  } else if (pct < -5) {
    action_tag = '🔴 DOMESTIC SPOT FAVORABLE';
    directive_message = 'Domestic spot exceeds international parity. Prefer local APMC liquidation.';
  }

  return {
    status: 'SUCCESS',
    commodity: key,
    region: state.toUpperCase(),
    forex_usd_inr: usdInr,
    market_type: HORT_EXPORT_USD_TON[key] ? 'PHYSICAL_EXPORT_BENCHMARK' : 'ESTIMATED',
    local_spot_price_quintal_inr: spot.modal_price_quintal,
    local_spot_price_ton_inr: localTon,
    global_futures_usd_per_ton: usdTon,
    net_export_value_inr: Math.round(netExport * 100) / 100,
    arbitrage_spread_inr_ton: Math.round(spread * 100) / 100,
    spread_percentage: Math.round(pct * 100) / 100,
    action_tag,
    directive_message,
  };
}
