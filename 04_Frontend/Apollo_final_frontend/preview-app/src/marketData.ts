/** Apollo Agriverse — bundled market catalog, Agmarknet spot, arbitrage */

export const INDIAN_LOCATIONS: Record<string, string[]> = {
  Maharashtra: [
    'Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara', 'Buldhana',
    'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna',
    'Kolhapur', 'Latur', 'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Osmanabad',
    'Palghar', 'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara',
    'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal',
  ],
  Gujarat: ['Ahmedabad', 'Rajkot', 'Surat', 'Vadodara', 'Junagadh', 'Bhavnagar'],
  Karnataka: ['Bengaluru Urban', 'Mysuru', 'Belagavi', 'Ballari', 'Dharwad'],
  Punjab: ['Ludhiana', 'Amritsar', 'Bathinda', 'Jalandhar', 'Patiala'],
  'Madhya Pradesh': ['Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain'],
  'Uttar Pradesh': ['Lucknow', 'Meerut', 'Varanasi', 'Kanpur Nagar', 'Agra'],
};

export const CROPS_CATALOG: Record<string, string[]> = {
  'Grapes & Viticulture': [
    'Grape (Thompson Seedless)', 'Grape (Sonaka)', 'Grape (Sharad Seedless / Black)',
    'Grape (Tas-A-Ganesh)', 'Grape (Manik Chaman)', 'Grape (Flame Seedless / Red)',
  ],
  Horticulture: [
    'Pomegranate (Bhagwa)', 'Mango (Alphonso)', 'Banana (Grand Naine)', 'Onion (Red / Nasik)',
  ],
  'Cash & Fiber': ['Cotton (Bt Cotton)', 'Sugarcane (Co 86032)'],
  'Cereals & Oilseeds': ['Wheat (Sharbati)', 'Soybean', 'Maize (Corn)'],
  Vegetables: ['Tomato (Hybrid)', 'Potato (Kufri Jyoti)', 'Green Chili'],
  Spices: ['Turmeric (Rajapore)', 'Cumin (Jeera)'],
};

export const SEASONS = ['Kharif 2025', 'Rabi 2024-25', 'Summer 2025', 'Annual 2024-25'];

/** Season profiles drive analytics multipliers, chart months, and date ranges */
export type SeasonProfile = {
  id: string;
  label: string;
  months: string[];
  dateRange: string;
  yieldFactor: number;   // relative to baseline commercial yield
  priceFactor: number;   // mandi / farm-gate price bias
  costFactor: number;    // production cost intensity
  harvestMonths: string;
  nextSeason: string;
  insight: string;
};

export const SEASON_PROFILES: Record<string, SeasonProfile> = {
  'Kharif 2025': {
    id: 'Kharif 2025',
    label: 'Kharif 2025',
    months: ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'],
    dateRange: '15 Jun 2025 – 30 Nov 2025',
    yieldFactor: 1.08,
    priceFactor: 0.96,
    costFactor: 1.05,
    harvestMonths: 'Oct–Nov',
    nextSeason: 'Rabi 2024-25',
    insight: 'Monsoon-linked season — higher vegetative growth, moderate price pressure at harvest glut.',
  },
  'Rabi 2024-25': {
    id: 'Rabi 2024-25',
    label: 'Rabi 2024-25',
    months: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
    dateRange: '15 Oct 2024 – 31 Mar 2025',
    yieldFactor: 1.0,
    priceFactor: 1.06,
    costFactor: 0.98,
    harvestMonths: 'Feb–Mar',
    nextSeason: 'Summer 2025',
    insight: 'Cool-season crop — stable yields and stronger farm-gate prices into spring demand.',
  },
  'Summer 2025': {
    id: 'Summer 2025',
    label: 'Summer 2025',
    months: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
    dateRange: '01 Feb 2025 – 15 Jul 2025',
    yieldFactor: 0.92,
    priceFactor: 1.12,
    costFactor: 1.12,
    harvestMonths: 'May–Jun',
    nextSeason: 'Kharif 2025',
    insight: 'Heat-stress window — lower yield but peak market prices; irrigation cost elevated.',
  },
  'Annual 2024-25': {
    id: 'Annual 2024-25',
    label: 'Annual 2024-25',
    months: ['Apr', 'Jun', 'Aug', 'Oct', 'Dec', 'Feb'],
    dateRange: '01 Apr 2024 – 31 Mar 2025',
    yieldFactor: 1.0,
    priceFactor: 1.0,
    costFactor: 1.0,
    harvestMonths: 'Multiple',
    nextSeason: 'Annual 2025-26',
    insight: 'Full-year aggregate across Kharif, Rabi and Summer cycles for annual P&L.',
  },
};

export function getSeasonProfile(season: string): SeasonProfile {
  return SEASON_PROFILES[season] || SEASON_PROFILES['Rabi 2024-25'];
}

/** Map lifecycle harvest completion → next calendar season label */
export function seasonAfterHarvest(current: string): string {
  const p = getSeasonProfile(current);
  return p.nextSeason;
}

/** Live env + field constraints → yield / cost / disease / irrigation modifiers */
export type FieldEnvInput = {
  temperature?: number;
  humidity?: number;
  rainfall?: number;
  sunlight?: number;
  windSpeed?: number;
  soilMoisture?: number;
  soilType?: string;
  stressHeat?: number;
  stressWater?: number;
  stressNutrient?: number;
  weatherMode?: string;
  hydrogelSat?: number;
  mulchCoverage?: number;
};

export type FieldConstraintResult = {
  yieldFactor: number;
  costFactor: number;
  diseaseBias: number;
  irrigExtraMm: number;
  weatherScore: number; // 0–100
  constraints: string[];
  tempImpact: string;
  rainImpact: string;
  moistureImpact: string;
};

/**
 * How weather + soil + stress reshape outcomes for one field.
 * Sandy soils dry faster; clay holds moisture; heat/rain/humidity shift disease & yield.
 */
export function computeFieldConstraints(env: FieldEnvInput = {}): FieldConstraintResult {
  const temp = env.temperature ?? 28;
  const humidity = env.humidity ?? 60;
  const rain = env.rainfall ?? 2;
  const sun = env.sunlight ?? 600;
  const wind = env.windSpeed ?? 15;
  const moisture = env.soilMoisture ?? 60;
  const soil = (env.soilType || 'Loam').toLowerCase();
  const heat = env.stressHeat ?? Math.max(0, (temp - 32) / 12);
  const water = env.stressWater ?? Math.max(0, (48 - moisture) / 35);
  const nutrient = env.stressNutrient ?? 0.15;
  const hydrogel = env.hydrogelSat ?? 70;
  const mulch = env.mulchCoverage ?? 60;

  // Soil texture bias
  let soilYield = 1;
  let soilWaterHold = 1;
  let soilDisease = 0;
  if (soil.includes('sand')) {
    soilYield = 0.94;
    soilWaterHold = 0.85;
    soilDisease = -2;
  } else if (soil.includes('clay')) {
    soilYield = 0.97;
    soilWaterHold = 1.12;
    soilDisease = 3;
  } else if (soil.includes('loam')) {
    soilYield = 1.02;
    soilWaterHold = 1.0;
  }

  // Temperature optimum ~26–30°C for grapes
  const tempDelta = Math.abs(temp - 28);
  const tempFactor = Math.max(0.72, 1 - tempDelta * 0.018 - heat * 0.12);

  // Rainfall: light positive, heavy near harvest negative
  const rainFactor = rain < 0.5 ? 0.96 : rain < 8 ? 1.02 : rain < 25 ? 0.94 : 0.88;

  // Moisture band 50–70 ideal
  const moistFactor =
    moisture < 40 ? 0.78 : moisture < 50 ? 0.9 : moisture <= 70 ? 1.05 : moisture <= 78 ? 0.95 : 0.88;

  // Humidity drives disease more than yield
  const diseaseBias = Math.round(
    (humidity - 55) * 0.35 +
      (moisture > 70 ? 5 : 0) +
      (rain > 10 ? 4 : 0) +
      soilDisease +
      heat * 4,
  );

  // Sunlight (W/m² proxy) — low sun hurts yield
  const sunFactor = Math.max(0.85, Math.min(1.08, 0.9 + (sun - 400) / 2000));

  // Wind slight stress above 25 km/h
  const windFactor = wind > 30 ? 0.96 : wind > 22 ? 0.98 : 1;

  // Hydrogel / mulch buffer water stress
  const buffer = 1 + (hydrogel / 100) * 0.04 + (mulch / 100) * 0.03 - water * 0.15 - nutrient * 0.08;

  const yieldFactor = +(
    soilYield * tempFactor * rainFactor * moistFactor * sunFactor * windFactor * Math.max(0.75, buffer)
  ).toFixed(3);

  // Irrigation cost up when dry or sandy or high heat
  const costFactor = +(
    1 +
    (moisture < 55 ? 0.06 : 0) +
    (soil.includes('sand') ? 0.04 : 0) +
    heat * 0.05 +
    (rain < 1 ? 0.03 : 0)
  ).toFixed(3);

  const irrigExtraMm = +(
    Math.max(0, (58 - moisture) * 0.35) +
    heat * 6 +
    (soil.includes('sand') ? 3 : 0) -
    rain * 0.4 -
    (hydrogel / 100) * 4
  ).toFixed(1);

  const weatherScore = Math.min(
    100,
    Math.max(
      20,
      Math.round(55 + (yieldFactor - 1) * 80 + (1 - heat) * 8 + (1 - water) * 10 + moistFactor * 12),
    ),
  );

  const constraints: string[] = [];
  if (temp > 34) constraints.push('Heat stress');
  if (temp < 16) constraints.push('Cold stress');
  if (moisture < 48) constraints.push('Low soil moisture');
  if (moisture > 78) constraints.push('Excess moisture');
  if (humidity > 80) constraints.push('High humidity (disease)');
  if (rain > 15) constraints.push('Heavy rain risk');
  if (wind > 28) constraints.push('High wind');
  if (soil.includes('sand') && moisture < 55) constraints.push('Sandy soil drying');
  if (heat > 0.35) constraints.push('Elevated heat stress index');
  if (water > 0.35) constraints.push('Water stress index');
  if (!constraints.length) constraints.push('Within optimal band');

  const tempImpact =
    temp >= 24 && temp <= 32 ? 'Positive ↑' : temp > 32 ? 'Heat risk ↓' : 'Cool stress ↓';
  const rainImpact =
    rain >= 1 && rain <= 10 ? 'Favorable' : rain > 10 ? 'Excess risk' : 'Dry — irrigate';
  const moistureImpact =
    moisture >= 50 && moisture <= 70 ? 'Optimal' : moisture < 50 ? 'Deficit' : 'High — watch rot';

  return {
    yieldFactor,
    costFactor,
    diseaseBias,
    irrigExtraMm,
    weatherScore,
    constraints,
    tempImpact,
    rainImpact,
    moistureImpact,
  };
}

/**
 * Generate season-scaled analytics bundle (synthetic “API” data).
 * Used by Analytics panel so KPIs, charts and year forecast all move with season.
 * Optional env applies live weather + field constraints.
 */
/** Per-acre input cost model (INR) — variety / soil / weather aware */
export type InputCostBreakdown = {
  seeds: number;
  technology: number;
  chemicals: number;
  other: number;
  total: number;
  perAcre: { seeds: number; technology: number; chemicals: number; other: number; total: number };
  notes: string[];
};

/**
 * Estimate field input costs:
 * - Seeds / planting material (cuttings, rootstock)
 * - Technology (drip, sensors, hydrogel, mulch, power)
 * - Chemicals (fertilizers, pesticides, growth regulators)
 * Scaled by variety vigor, soil class, and live weather stress.
 */
export function estimateInputCostBreakdown(opts: {
  acres: number;
  varietyId?: string;
  soilClass?: string;
  season?: string;
  env?: FieldEnvInput;
}): InputCostBreakdown {
  const acres = Math.max(0.01, opts.acres);
  const varietyId = (opts.varietyId || 'thompson').toLowerCase();
  const soil = (opts.soilClass || 'alluvial').toLowerCase();
  const season = opts.season || '';
  const env = opts.env || {};

  // Base per-acre INR (Maharashtra commercial table grape order of magnitude)
  let seedPerAc = 18500; // cuttings / rootstock / gap filling
  let techPerAc = 32000; // drip amortized + sensors + mulch + hydrogel share
  let chemPerAc = 28000; // fertigation + fungicides + insecticides + PGR
  let otherPerAc = 14000; // labor share of inputs logistics, misc

  // Variety adjustments
  if (varietyId.includes('sharad') || varietyId.includes('shyama')) {
    seedPerAc *= 1.12; // coloured material premium
    chemPerAc *= 1.08; // colour / quality sprays
    techPerAc *= 1.05;
  } else if (varietyId.includes('naveen')) {
    seedPerAc *= 1.06;
    chemPerAc *= 0.97; // shorter cycle, slightly less chem window
  } else if (varietyId.includes('ganesh') || varietyId.includes('tas')) {
    seedPerAc *= 1.04;
    techPerAc *= 1.03;
  }

  // Soil class adjustments
  if (soil === 'alkaline') {
    chemPerAc *= 1.18; // gypsum / amendments / extra nutrition
    techPerAc *= 1.08;
  } else if (soil === 'lateritic') {
    chemPerAc *= 1.12;
    seedPerAc *= 1.05;
  } else if (soil === 'black') {
    techPerAc *= 1.06; // drainage / pumping
    chemPerAc *= 1.04;
  } else if (soil === 'red') {
    chemPerAc *= 1.03;
  } else if (soil === 'alluvial') {
    chemPerAc *= 0.97;
    seedPerAc *= 0.98;
  }

  // Weather / environment
  const rain = env.rainfall ?? 2;
  const heat = env.stressHeat ?? 0;
  const water = env.stressWater ?? 0;
  const humid = env.humidity ?? 60;
  if (rain > 6 || humid > 78) chemPerAc *= 1.12; // disease pressure
  if (heat > 0.35) {
    techPerAc *= 1.08; // cooling / extra irrigation tech
    chemPerAc *= 1.04;
  }
  if (water > 0.4) techPerAc *= 1.1; // more pumping / hydrogel
  if ((env.hydrogelSat ?? 70) < 45) techPerAc *= 1.06;
  if ((env.mulchCoverage ?? 80) < 60) {
    techPerAc *= 1.05;
    chemPerAc *= 1.03; // more weed / moisture loss pressure
  }

  // Season
  if (season.includes('Summer')) {
    techPerAc *= 1.12;
    chemPerAc *= 1.05;
  } else if (season.includes('Kharif')) {
    chemPerAc *= 1.1;
  }

  const notes: string[] = [];
  notes.push(`Variety driver: ${varietyId}`);
  notes.push(`Soil driver: ${soil}`);
  if (rain > 6 || humid > 78) notes.push('Elevated disease pressure → higher chemical budget');
  if (heat > 0.35 || water > 0.4) notes.push('Heat/water stress → higher technology / irrigation spend');
  if (soil === 'alkaline' || soil === 'lateritic') notes.push('Challenging soil → amendments & nutrition uplift');

  const perAcre = {
    seeds: Math.round(seedPerAc),
    technology: Math.round(techPerAc),
    chemicals: Math.round(chemPerAc),
    other: Math.round(otherPerAc),
    total: Math.round(seedPerAc + techPerAc + chemPerAc + otherPerAc),
  };

  return {
    seeds: Math.round(perAcre.seeds * acres),
    technology: Math.round(perAcre.technology * acres),
    chemicals: Math.round(perAcre.chemicals * acres),
    other: Math.round(perAcre.other * acres),
    total: Math.round(perAcre.total * acres),
    perAcre,
    notes,
  };
}

export function generateSeasonAnalytics(opts: {
  season: string;
  crop: string;
  state: string;
  city: string;
  acres: number;
  healthIndex: number;
  env?: FieldEnvInput;
  varietyId?: string;
  soilClass?: string;
}) {
  const profile = getSeasonProfile(opts.season);
  const cropYieldPerAcre = getTypicalYieldPerAcre(opts.crop);
  const healthFactor = 0.85 + (opts.healthIndex / 100) * 0.25;
  const constraints = computeFieldConstraints(opts.env || {});
  // Variety yield tilt
  const vId = (opts.varietyId || '').toLowerCase();
  let varietyYield = 1;
  if (vId.includes('ganesh') || vId.includes('tas')) varietyYield = 1.08;
  else if (vId.includes('naveen')) varietyYield = 1.05;
  else if (vId.includes('sharad')) varietyYield = 0.98;
  else if (vId.includes('shyama')) varietyYield = 0.95;
  // Base seasonal yield (tons) × live environment factor
  let totalYield = +(
    cropYieldPerAcre * opts.acres * healthFactor * 0.55 * profile.yieldFactor * constraints.yieldFactor * varietyYield
  ).toFixed(2);

  // Annual = sum of three seasonal cycles with slight variation + env
  if (opts.season.startsWith('Annual')) {
    const envY = constraints.yieldFactor;
    const kh = cropYieldPerAcre * opts.acres * healthFactor * 0.55 * SEASON_PROFILES['Kharif 2025'].yieldFactor * envY;
    const ra = cropYieldPerAcre * opts.acres * healthFactor * 0.55 * SEASON_PROFILES['Rabi 2024-25'].yieldFactor * envY;
    const su = cropYieldPerAcre * opts.acres * healthFactor * 0.55 * SEASON_PROFILES['Summer 2025'].yieldFactor * envY;
    totalYield = +((kh + ra + su) * 0.92).toFixed(2); // slight multi-cropping efficiency loss
  }

  const priceSummary = getCropPriceSummary(opts.crop, opts.state, opts.city);
  const basePricePerTon = priceSummary.modal_price_ton || priceSummary.modal_price_quintal * 10 || 30000;
  const pricePerTon = Math.round(basePricePerTon * profile.priceFactor);

  const baseCostRatio = coreCommodity(opts.crop) === 'GRAPE' ? 0.536
    : coreCommodity(opts.crop) === 'SUGARCANE' ? 0.62
    : 0.55;
  const costRatio = Math.min(0.82, baseCostRatio * profile.costFactor * constraints.costFactor);

  const revenue = Math.round(totalYield * pricePerTon);

  // Detailed input costs (seeds / technology / chemicals) from agronomy model
  const inputCosts = estimateInputCostBreakdown({
    acres: opts.acres,
    varietyId: opts.varietyId,
    soilClass: opts.soilClass,
    season: opts.season,
    env: opts.env,
  });
  // Blend structured inputs with revenue-linked overhead so total stays realistic
  const overhead = Math.round(revenue * costRatio * 0.42);
  const productionCost = Math.max(inputCosts.total + overhead, Math.round(revenue * costRatio * 0.85));
  const profit = revenue - productionCost;
  const margin = revenue > 0 ? +((profit / revenue) * 100).toFixed(1) : 0;

  // Year forecast: if single season, project remaining seasons; if Annual, use as-is
  let yearRevenue = revenue;
  let yearProfit = profit;
  let yearYield = totalYield;
  if (!opts.season.startsWith('Annual')) {
    // Weighted mix of the three seasons (current season full weight)
    const factors = [
      { y: SEASON_PROFILES['Kharif 2025'].yieldFactor, p: SEASON_PROFILES['Kharif 2025'].priceFactor, c: SEASON_PROFILES['Kharif 2025'].costFactor },
      { y: SEASON_PROFILES['Rabi 2024-25'].yieldFactor, p: SEASON_PROFILES['Rabi 2024-25'].priceFactor, c: SEASON_PROFILES['Rabi 2024-25'].costFactor },
      { y: SEASON_PROFILES['Summer 2025'].yieldFactor, p: SEASON_PROFILES['Summer 2025'].priceFactor, c: SEASON_PROFILES['Summer 2025'].costFactor },
    ];
    let yR = 0, yP = 0, yY = 0;
    for (const f of factors) {
      const ty = cropYieldPerAcre * opts.acres * healthFactor * 0.55 * f.y * constraints.yieldFactor;
      const pr = basePricePerTon * f.p;
      const rev = ty * pr;
      const cost = rev * Math.min(0.82, baseCostRatio * f.c * constraints.costFactor);
      yY += ty;
      yR += rev;
      yP += rev - cost;
    }
    yearYield = +yY.toFixed(2);
    yearRevenue = Math.round(yR);
    yearProfit = Math.round(yP);
  }

  // Progressive yield curve for charts
  const curve = [0.18, 0.32, 0.48, 0.65, 0.84, 1.0];
  const yieldActual = curve.map((t) => +(totalYield * t).toFixed(1));
  const yieldEst = yieldActual.map((v, i) => +(v * (1.015 + i * 0.006)).toFixed(1));
  const revBars = yieldActual.map((y) => +((y * pricePerTon) / 1e5).toFixed(1));
  const profitBars = revBars.map((r) => +(r * (margin / 100)).toFixed(1));

  // Vs last season deltas — include environment shift
  const vsYield = +(
    (profile.yieldFactor - 1) * 100 +
    (opts.healthIndex - 72) * 0.15 +
    (constraints.yieldFactor - 1) * 40
  ).toFixed(1);
  const vsRevenue = +((profile.priceFactor * profile.yieldFactor * constraints.yieldFactor - 1) * 100 + 4.2).toFixed(1);
  const vsProfit = +((vsRevenue * 1.15) + (1 - profile.costFactor * constraints.costFactor) * 8).toFixed(1);
  const vsCost = +((profile.costFactor * constraints.costFactor - 1) * 100 - 1.5).toFixed(1);

  return {
    profile,
    totalYield,
    pricePerTon,
    revenue,
    productionCost,
    profit,
    margin,
    yearYield,
    yearRevenue,
    yearProfit,
    yearMargin: yearRevenue > 0 ? +((yearProfit / yearRevenue) * 100).toFixed(1) : 0,
    yieldActual,
    yieldEst,
    revBars,
    profitBars,
    months: profile.months,
    dateRange: profile.dateRange,
    vsYield,
    vsRevenue,
    vsProfit,
    vsCost,
    priceSummary,
    constraints,
    inputCosts,
    overhead,
  };
}

/** Typical commercial yield (tons/acre) by crop family — used to scale analytics */
const CROP_YIELD_TON_PER_ACRE: Record<string, number> = {
  GRAPE: 3.4,
  POMEGRANATE: 4.2,
  MANGO: 2.8,
  BANANA: 12.5,
  ONION: 8.0,
  COTTON: 0.55,
  SUGARCANE: 35,
  WHEAT: 1.8,
  SOYBEAN: 0.9,
  MAIZE: 2.2,
  TOMATO: 10,
  POTATO: 9,
  TURMERIC: 2.5,
  CUMIN: 0.4,
};

/** District bias on modal price (±%) so city selection changes numbers */
const DISTRICT_PRICE_BIAS: Record<string, number> = {
  NASHIK: 1.04,
  SANGLI: 1.06,
  PUNE: 1.02,
  SOLAPUR: 0.98,
  JALGAON: 0.97,
  NAGPUR: 1.0,
  KOLHAPUR: 1.01,
  LUDHIANA: 1.03,
  RAJKOT: 0.99,
  INDORE: 1.01,
  MEERUT: 0.98,
  AHMEDABAD: 1.0,
  DEFAULT: 1.0,
};

export function getAllStates(): string[] {
  return Object.keys(INDIAN_LOCATIONS).sort();
}

export function getCities(state: string): string[] {
  return [...(INDIAN_LOCATIONS[state] || [])].sort();
}

export function getAllCropsFlat(): string[] {
  return Object.values(CROPS_CATALOG).flat().sort();
}

export function coreCommodity(name: string): string {
  const raw = name.split('(')[0].trim().toUpperCase();
  if (raw.includes('GRAPE')) return 'GRAPE';
  if (raw.includes('POMEGRANATE')) return 'POMEGRANATE';
  if (raw.includes('MANGO')) return 'MANGO';
  if (raw.includes('BANANA')) return 'BANANA';
  if (raw.includes('ONION')) return 'ONION';
  if (raw.includes('COTTON')) return 'COTTON';
  if (raw.includes('SUGARCANE') || raw.includes('SUGAR')) return 'SUGARCANE';
  if (raw.includes('WHEAT')) return 'WHEAT';
  if (raw.includes('SOY')) return 'SOYBEAN';
  if (raw.includes('MAIZE') || raw.includes('CORN')) return 'MAIZE';
  if (raw.includes('TOMATO')) return 'TOMATO';
  if (raw.includes('POTATO')) return 'POTATO';
  if (raw.includes('TURMERIC')) return 'TURMERIC';
  if (raw.includes('CUMIN') || raw.includes('JEERA')) return 'CUMIN';
  return raw.split(/\s+/)[0];
}

export function getTypicalYieldPerAcre(commodity: string): number {
  return CROP_YIELD_TON_PER_ACRE[coreCommodity(commodity)] ?? 2.5;
}

export type SpotRecord = {
  state: string;
  district: string;
  market: string;
  commodity: string;
  variety: string;
  grade: string;
  min_price: number;
  max_price: number;
  modal_price: number;
};

const MOCK_SPOT: SpotRecord[] = [
  { state: 'MAHARASHTRA', district: 'NASHIK', market: 'PIMPALGAON', commodity: 'GRAPE', variety: 'THOMPSON SEEDLESS', grade: 'A-GRADE', min_price: 4200, max_price: 5200, modal_price: 4800 },
  { state: 'MAHARASHTRA', district: 'SANGLI', market: 'SANGLI', commodity: 'GRAPE', variety: 'SONAKA', grade: 'A-GRADE', min_price: 4400, max_price: 5400, modal_price: 4900 },
  { state: 'MAHARASHTRA', district: 'NASHIK', market: 'LASALGAON', commodity: 'GRAPE', variety: 'SHARAD SEEDLESS', grade: 'A-GRADE', min_price: 4000, max_price: 5000, modal_price: 4600 },
  { state: 'MAHARASHTRA', district: 'PUNE', market: 'PUNE', commodity: 'GRAPE', variety: 'FLAME SEEDLESS', grade: 'A-GRADE', min_price: 4500, max_price: 5600, modal_price: 5100 },
  { state: 'MAHARASHTRA', district: 'SOLAPUR', market: 'SOLAPUR', commodity: 'GRAPE', variety: 'BLACK GRAPES', grade: 'FAQ', min_price: 3800, max_price: 4800, modal_price: 4300 },
  { state: 'MAHARASHTRA', district: 'NASHIK', market: 'LASALGAON', commodity: 'ONION', variety: 'RED', grade: 'FAQ', min_price: 1900, max_price: 2400, modal_price: 2250 },
  { state: 'MAHARASHTRA', district: 'PUNE', market: 'PUNE', commodity: 'ONION', variety: 'WHITE', grade: 'FAQ', min_price: 1700, max_price: 2200, modal_price: 2000 },
  { state: 'MAHARASHTRA', district: 'SOLAPUR', market: 'SOLAPUR', commodity: 'POMEGRANATE', variety: 'BHAGWA', grade: 'EXPORT-GRADE', min_price: 8500, max_price: 12500, modal_price: 10500 },
  { state: 'MAHARASHTRA', district: 'NASHIK', market: 'NASHIK', commodity: 'POMEGRANATE', variety: 'ARAKTA', grade: 'A-GRADE', min_price: 7800, max_price: 11000, modal_price: 9200 },
  { state: 'MAHARASHTRA', district: 'JALGAON', market: 'JALGAON', commodity: 'BANANA', variety: 'GRAND NAINE', grade: 'FAQ', min_price: 1400, max_price: 1800, modal_price: 1600 },
  { state: 'MAHARASHTRA', district: 'JALGAON', market: 'BHUSAWAL', commodity: 'BANANA', variety: 'ROBUSTA', grade: 'FAQ', min_price: 1200, max_price: 1600, modal_price: 1450 },
  { state: 'MAHARASHTRA', district: 'NAGPUR', market: 'NAGPUR', commodity: 'COTTON', variety: 'BT COTTON', grade: 'FAQ', min_price: 7200, max_price: 7700, modal_price: 7450 },
  { state: 'MAHARASHTRA', district: 'KOLHAPUR', market: 'KOLHAPUR', commodity: 'SUGARCANE', variety: 'CO 86032', grade: 'FAQ', min_price: 3100, max_price: 3400, modal_price: 3250 },
  { state: 'MAHARASHTRA', district: 'PUNE', market: 'PUNE', commodity: 'TOMATO', variety: 'HYBRID', grade: 'FAQ', min_price: 1800, max_price: 2600, modal_price: 2200 },
  { state: 'MAHARASHTRA', district: 'NASHIK', market: 'NASHIK', commodity: 'TOMATO', variety: 'DESI', grade: 'FAQ', min_price: 1500, max_price: 2100, modal_price: 1850 },
  { state: 'MAHARASHTRA', district: 'SANGLI', market: 'SANGLI', commodity: 'TURMERIC', variety: 'RAJAPORE', grade: 'FAQ', min_price: 13000, max_price: 15500, modal_price: 14200 },
  { state: 'PUNJAB', district: 'LUDHIANA', market: 'LUDHIANA', commodity: 'WHEAT', variety: 'SHARBATI', grade: 'FAQ', min_price: 2250, max_price: 2400, modal_price: 2320 },
  { state: 'PUNJAB', district: 'BATHINDA', market: 'BATHINDA', commodity: 'WHEAT', variety: 'KALYANSONA', grade: 'FAQ', min_price: 2180, max_price: 2350, modal_price: 2280 },
  { state: 'GUJARAT', district: 'RAJKOT', market: 'RAJKOT', commodity: 'COTTON', variety: 'BT COTTON', grade: 'FAQ', min_price: 7100, max_price: 7600, modal_price: 7350 },
  { state: 'MADHYA PRADESH', district: 'INDORE', market: 'INDORE', commodity: 'SOYBEAN', variety: 'YELLOW', grade: 'FAQ', min_price: 4400, max_price: 4800, modal_price: 4650 },
  { state: 'UTTAR PRADESH', district: 'MEERUT', market: 'MEERUT', commodity: 'SUGAR', variety: 'MEDIUM', grade: 'FAQ', min_price: 3800, max_price: 3950, modal_price: 3890 },
  { state: 'MAHARASHTRA', district: 'RATNAGIRI', market: 'RATNAGIRI', commodity: 'MANGO', variety: 'ALPHONSO', grade: 'EXPORT-GRADE', min_price: 12000, max_price: 18000, modal_price: 15000 },
  { state: 'MAHARASHTRA', district: 'PUNE', market: 'PUNE', commodity: 'POTATO', variety: 'KUFRI JYOTI', grade: 'FAQ', min_price: 1200, max_price: 1800, modal_price: 1500 },
];

export type CropPriceSummary = {
  status: 'SUCCESS' | 'NOT_FOUND' | 'NO_DATA';
  commodity: string;
  state_filtered: string;
  district?: string;
  modal_price_quintal: number;
  modal_price_ton: number;
  min_price_quintal: number;
  max_price_quintal: number;
  reporting_markets_count: number;
  variety?: string;
  markets: { market: string; district: string; modal: number; min: number; max: number; variety: string }[];
};

export function fetchSpotRecords(): SpotRecord[] {
  return MOCK_SPOT;
}

export function getCropPriceSummary(commodity: string, state?: string, city?: string): CropPriceSummary {
  const df = fetchSpotRecords();
  if (!df.length) {
    return { status: 'NO_DATA', commodity, state_filtered: state || 'ALL', modal_price_quintal: 0, modal_price_ton: 0, min_price_quintal: 0, max_price_quintal: 0, reporting_markets_count: 0, markets: [] };
  }
  const clean = coreCommodity(commodity);
  let filtered = df.filter((r) => r.commodity === clean || r.commodity.includes(clean) || clean.includes(r.commodity));
  if (state) {
    const st = state.split(' ')[0].toUpperCase();
    const byState = filtered.filter((r) => r.state.includes(st));
    if (byState.length) filtered = byState;
  }
  // Prefer district matching selected city when available
  if (city) {
    const dist = city.split('(')[0].trim().toUpperCase();
    const byCity = filtered.filter((r) => r.district.includes(dist) || dist.includes(r.district));
    if (byCity.length) filtered = byCity;
  }
  if (!filtered.length) {
    // soft fallback: any state for this crop
    filtered = df.filter((r) => r.commodity === clean || r.commodity.includes(clean));
  }
  if (!filtered.length) {
    // synthetic fallback from typical benchmarks so UI always reacts
    const base = syntheticModal(clean);
    const bias = DISTRICT_PRICE_BIAS[(city || '').toUpperCase()] ?? DISTRICT_PRICE_BIAS.DEFAULT;
    const modal = Math.round(base * bias);
    return {
      status: 'SUCCESS',
      commodity: clean,
      state_filtered: state || 'ALL_INDIA',
      district: city,
      modal_price_quintal: modal,
      modal_price_ton: modal * 10,
      min_price_quintal: Math.round(modal * 0.88),
      max_price_quintal: Math.round(modal * 1.12),
      reporting_markets_count: 1,
      variety: commodity,
      markets: [{ market: city || 'LOCAL', district: city || '—', modal, min: Math.round(modal * 0.88), max: Math.round(modal * 1.12), variety: commodity }],
    };
  }

  const bias = DISTRICT_PRICE_BIAS[(city || filtered[0].district || '').toUpperCase()] ?? 1;
  const modal = (filtered.reduce((s, r) => s + r.modal_price, 0) / filtered.length) * bias;
  const markets = filtered.map((r) => ({
    market: r.market,
    district: r.district,
    modal: Math.round(r.modal_price * bias),
    min: Math.round(r.min_price * bias),
    max: Math.round(r.max_price * bias),
    variety: r.variety,
  }));

  return {
    status: 'SUCCESS',
    commodity: clean,
    state_filtered: state || 'ALL_INDIA',
    district: city,
    modal_price_quintal: Math.round(modal * 100) / 100,
    modal_price_ton: Math.round(modal * 10 * 100) / 100,
    min_price_quintal: Math.min(...filtered.map((r) => r.min_price)),
    max_price_quintal: Math.max(...filtered.map((r) => r.max_price)),
    reporting_markets_count: new Set(filtered.map((r) => r.market)).size,
    variety: filtered[0]?.variety,
    markets,
  };
}

function syntheticModal(comm: string): number {
  const map: Record<string, number> = {
    GRAPE: 4800, ONION: 2200, POMEGRANATE: 10000, MANGO: 14000, BANANA: 1600,
    COTTON: 7400, SUGARCANE: 3200, WHEAT: 2300, SOYBEAN: 4600, MAIZE: 2100,
    TOMATO: 2000, POTATO: 1500, TURMERIC: 14000, CUMIN: 28000,
  };
  return map[comm] ?? 3000;
}

/** Variety / market rows for the selected crop */
export function getMarketTableForCrop(commodity: string, state?: string, city?: string): {
  variety: string;
  market: string;
  district: string;
  priceKg: number;
  priceQtl: number;
  trend7d: number;
  min: number;
  max: number;
}[] {
  const summary = getCropPriceSummary(commodity, state, city);
  if (summary.markets.length) {
    return summary.markets.map((m, i) => ({
      variety: m.variety.replace(/\b\w/g, (c) => c.toUpperCase()),
      market: m.market,
      district: m.district,
      priceQtl: m.modal,
      priceKg: Math.round((m.modal / 100) * 100) / 100,
      min: m.min,
      max: m.max,
      trend7d: +(2.5 + (m.modal % 19) / 8 + i * 0.3).toFixed(1),
    }));
  }
  // single synthetic row
  const q = summary.modal_price_quintal || syntheticModal(coreCommodity(commodity));
  return [{
    variety: commodity,
    market: city || 'LOCAL',
    district: city || '—',
    priceQtl: q,
    priceKg: Math.round((q / 100) * 100) / 100,
    min: summary.min_price_quintal || Math.round(q * 0.9),
    max: summary.max_price_quintal || Math.round(q * 1.1),
    trend7d: 3.2,
  }];
}

/** @deprecated use getMarketTableForCrop */
export function getGrapeMarketTable() {
  return getMarketTableForCrop('Grape (Thompson Seedless)', 'Maharashtra', 'Nashik').map((r) => ({
    variety: r.variety,
    priceKg: r.priceKg,
    trend7d: r.trend7d,
  }));
}

const HORT_EXPORT_USD_TON: Record<string, number> = {
  GRAPE: 3330, ONION: 450, POMEGRANATE: 2400, MANGO: 3800, BANANA: 650,
  TOMATO: 550, POTATO: 380, TURMERIC: 1850, COTTON: 1800, WHEAT: 280, SOYBEAN: 420, SUGARCANE: 220, MAIZE: 220, CUMIN: 4500,
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

export function evaluateMarketArbitrage(commodity: string, state = 'Maharashtra', city?: string): ArbitrageResult {
  const spot = getCropPriceSummary(commodity, state, city);
  if (spot.status !== 'SUCCESS' && !spot.modal_price_quintal) {
    return {
      status: 'FAILED', reason: `Unable to fetch spot mandi data for ${commodity}`, commodity, region: state,
      forex_usd_inr: FALLBACK_USD_INR, market_type: '—', local_spot_price_quintal_inr: 0, local_spot_price_ton_inr: 0,
      global_futures_usd_per_ton: 0, net_export_value_inr: 0, arbitrage_spread_inr_ton: 0, spread_percentage: 0,
      action_tag: '—', directive_message: 'No data',
    };
  }
  const key = coreCommodity(commodity);
  const usdTon = HORT_EXPORT_USD_TON[key] ?? 800;
  const localTon = spot.modal_price_ton || spot.modal_price_quintal * 10;
  const netExport = usdTon * FALLBACK_USD_INR - DEFAULT_FRICTION_INR_PER_TON;
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
    status: 'SUCCESS', commodity: key, region: `${(city || state).toUpperCase()}`, forex_usd_inr: FALLBACK_USD_INR,
    market_type: HORT_EXPORT_USD_TON[key] ? 'PHYSICAL_EXPORT_BENCHMARK' : 'ESTIMATED',
    local_spot_price_quintal_inr: spot.modal_price_quintal, local_spot_price_ton_inr: localTon,
    global_futures_usd_per_ton: usdTon, net_export_value_inr: Math.round(netExport * 100) / 100,
    arbitrage_spread_inr_ton: Math.round(spread * 100) / 100, spread_percentage: Math.round(pct * 100) / 100,
    action_tag, directive_message,
  };
}

/** 30-day synthetic price series scaled to current modal ₹/kg */
export function buildPriceTrendSeries(modalQtl: number, varieties: string[]): { name: string; color: string; values: number[] }[] {
  const colors = ['#a78bfa', '#4ade80', '#38bdf8', '#f97316', '#eab308', '#f472b6'];
  const baseKg = modalQtl / 100;
  return varieties.slice(0, 5).map((name, i) => {
    const offset = 1 + (i - 2) * 0.06;
    const values = [0, 1, 2, 3, 4].map((d) => +(baseKg * offset * (0.94 + d * 0.015 + (i % 3) * 0.004)).toFixed(1));
    return { name: name.slice(0, 12), color: colors[i % colors.length], values };
  });
}
