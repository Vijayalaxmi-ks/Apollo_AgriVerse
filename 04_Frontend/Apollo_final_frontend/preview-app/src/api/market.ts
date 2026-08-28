import { apiGet } from './client';

export type BackendSpot = {
  success: boolean;
  source: string;
  is_live: boolean;
  commodity: string;
  state: string;
  district?: string | null;
  modal_price_per_qtl: number;
  min_price_per_qtl: number;
  max_price_per_qtl: number;
  price_trend: string;
  modal_price_per_ton: number;
};

export type BackendArbitrage = {
  success: boolean;
  is_live: boolean;
  source: string;
  commodity: string;
  state: string;
  local_spot_price_quintal_inr: number;
  local_spot_price_ton_inr: number;
  global_futures_usd_per_ton: number;
  forex_usd_inr: number;
  net_export_value_inr: number;
  arbitrage_spread_inr_ton: number;
  spread_percentage: number;
  action_tag: string;
  directive_message: string;
  price_trend: string;
};

export async function fetchMarketSpot(
  commodity: string,
  state = 'Maharashtra',
  district = '',
): Promise<BackendSpot> {
  const q = new URLSearchParams({
    commodity,
    state,
    ...(district ? { district } : {}),
  });
  return apiGet<BackendSpot>(`/api/market/spot?${q.toString()}`);
}

export async function fetchMarketArbitrage(
  commodity: string,
  state = 'Maharashtra',
  district = '',
): Promise<BackendArbitrage> {
  const q = new URLSearchParams({
    commodity,
    state,
    ...(district ? { district } : {}),
  });
  return apiGet<BackendArbitrage>(`/api/market/arbitrage?${q.toString()}`);
}
