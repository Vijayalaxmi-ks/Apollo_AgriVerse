/** Agmarknet-style spot market client (mock + normalized structure from Python client) */

export type SpotRecord = {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  grade: string;
  min_price: number;
  max_price: number;
  modal_price: number; // ₹ / quintal
};

const MOCK_SPOT: SpotRecord[] = [
  { state: 'MAHARASHTRA', district: 'NASHIK', market: 'PIMPALGAON', commodity: 'GRAPE', variety: 'THOMPSON SEEDLESS', grade: 'A-GRADE', min_price: 4200, max_price: 5200, modal_price: 4800 },
  { state: 'MAHARASHTRA', district: 'SANGLI', market: 'SANGLI', commodity: 'GRAPE', variety: 'SONAKA', grade: 'A-GRADE', min_price: 4400, max_price: 5400, modal_price: 4900 },
  { state: 'MAHARASHTRA', district: 'NASHIK', market: 'LASALGAON', commodity: 'GRAPE', variety: 'SHARAD SEEDLESS', grade: 'A-GRADE', min_price: 4000, max_price: 5000, modal_price: 4600 },
  { state: 'MAHARASHTRA', district: 'PUNE', market: 'PUNE', commodity: 'GRAPE', variety: 'FLAME SEEDLESS', grade: 'A-GRADE', min_price: 4500, max_price: 5600, modal_price: 5100 },
  { state: 'MAHARASHTRA', district: 'SOLAPUR', market: 'SOLAPUR', commodity: 'GRAPE', variety: 'BLACK GRAPES', grade: 'FAQ', min_price: 3800, max_price: 4800, modal_price: 4300 },
  { state: 'MAHARASHTRA', district: 'NASHIK', market: 'LASALGAON', commodity: 'ONION', variety: 'RED', grade: 'FAQ', min_price: 1900, max_price: 2400, modal_price: 2250 },
  { state: 'MAHARASHTRA', district: 'SOLAPUR', market: 'SOLAPUR', commodity: 'POMEGRANATE', variety: 'BHAGWA', grade: 'EXPORT-GRADE', min_price: 8500, max_price: 12500, modal_price: 10500 },
  { state: 'MAHARASHTRA', district: 'JALGAON', market: 'JALGAON', commodity: 'BANANA', variety: 'GRAND NAINE', grade: 'FAQ', min_price: 1400, max_price: 1800, modal_price: 1600 },
  { state: 'MAHARASHTRA', district: 'NAGPUR', market: 'NAGPUR', commodity: 'COTTON', variety: 'BT COTTON', grade: 'FAQ', min_price: 7200, max_price: 7700, modal_price: 7450 },
  { state: 'MAHARASHTRA', district: 'KOLHAPUR', market: 'KOLHAPUR', commodity: 'SUGARCANE', variety: 'CO 86032', grade: 'FAQ', min_price: 3100, max_price: 3400, modal_price: 3250 },
  { state: 'MAHARASHTRA', district: 'PUNE', market: 'PUNE', commodity: 'TOMATO', variety: 'HYBRID', grade: 'FAQ', min_price: 1800, max_price: 2600, modal_price: 2200 },
  { state: 'MAHARASHTRA', district: 'SANGLI', market: 'SANGLI', commodity: 'TURMERIC', variety: 'RAJAPORE', grade: 'FAQ', min_price: 13000, max_price: 15500, modal_price: 14200 },
  { state: 'PUNJAB', district: 'LUDHIANA', market: 'LUDHIANA', commodity: 'WHEAT', variety: 'SHARBATI', grade: 'FAQ', min_price: 2250, max_price: 2400, modal_price: 2320 },
  { state: 'GUJARAT', district: 'RAJKOT', market: 'RAJKOT', commodity: 'COTTON', variety: 'BT COTTON', grade: 'FAQ', min_price: 7100, max_price: 7600, modal_price: 7350 },
  { state: 'MADHYA PRADESH', district: 'INDORE', market: 'INDORE', commodity: 'SOYBEAN', variety: 'YELLOW', grade: 'FAQ', min_price: 4400, max_price: 4800, modal_price: 4650 },
];

export type CropPriceSummary = {
  status: 'SUCCESS' | 'NOT_FOUND' | 'NO_DATA';
  commodity: string;
  state_filtered: string;
  modal_price_quintal: number;
  modal_price_ton: number;
  min_price_quintal: number;
  max_price_quintal: number;
  reporting_markets_count: number;
  variety?: string;
};

function coreCommodity(name: string): string {
  return name.split('(')[0].replace(/Grape/i, 'GRAPE').trim().toUpperCase();
}

export function fetchSpotRecords(): SpotRecord[] {
  return MOCK_SPOT;
}

export function getCropPriceSummary(commodity: string, state?: string): CropPriceSummary {
  const df = fetchSpotRecords();
  if (!df.length) return { status: 'NO_DATA', commodity, state_filtered: state || 'ALL', modal_price_quintal: 0, modal_price_ton: 0, min_price_quintal: 0, max_price_quintal: 0, reporting_markets_count: 0 };

  const clean = coreCommodity(commodity);
  let filtered = df.filter((r) => r.commodity.includes(clean) || clean.includes(r.commodity));
  if (state) {
    const st = state.split(' ')[0].toUpperCase();
    const byState = filtered.filter((r) => r.state.includes(st));
    if (byState.length) filtered = byState;
  }
  if (!filtered.length) {
    return { status: 'NOT_FOUND', commodity: clean, state_filtered: state || 'ALL', modal_price_quintal: 0, modal_price_ton: 0, min_price_quintal: 0, max_price_quintal: 0, reporting_markets_count: 0 };
  }

  const modal = filtered.reduce((s, r) => s + r.modal_price, 0) / filtered.length;
  const minP = Math.min(...filtered.map((r) => r.min_price));
  const maxP = Math.max(...filtered.map((r) => r.max_price));
  const markets = new Set(filtered.map((r) => r.market)).size;

  return {
    status: 'SUCCESS',
    commodity: clean,
    state_filtered: state || 'ALL_INDIA',
    modal_price_quintal: Math.round(modal * 100) / 100,
    modal_price_ton: Math.round(modal * 10 * 100) / 100,
    min_price_quintal: minP,
    max_price_quintal: maxP,
    reporting_markets_count: markets,
    variety: filtered[0]?.variety,
  };
}

/** Market table rows for grape varieties (₹/kg) */
export function getGrapeMarketTable(): { variety: string; priceKg: number; trend7d: number }[] {
  const grapes = MOCK_SPOT.filter((r) => r.commodity === 'GRAPE');
  return grapes.map((r) => ({
    variety: r.variety.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/ Seedless/i, ' Seedless'),
    priceKg: Math.round((r.modal_price / 100) * 100) / 100, // quintal → approx ₹/kg
    trend7d: 3.5 + (r.modal_price % 17) / 10,
  }));
}
