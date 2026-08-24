/** Shared synthetic simulation engine for Apollo AgriVerse Digital Twin */

export type LifecycleStage =
  | 'germination'
  | 'vegetative'
  | 'flowering'
  | 'fruit_set'
  | 'berry'
  | 'ripening'
  | 'harvest';

export type TwinLevel = 'farm' | 'field' | 'plant' | 'soil';
export type WeatherMode = 'sun' | 'cloudy' | 'rain' | 'night';
export type TimeOfDay = 'morning' | 'noon' | 'afternoon' | 'night';

export interface EnvParams {
  temperature: number;
  humidity: number;
  rainfall: number;
  soilMoisture: number;
  sunlight: number;
  windSpeed: number;
  soilPh: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  hydrogelSat: number;
  irrigationMm: number;
}

export interface SimState {
  day: number;
  stage: LifecycleStage;
  stageProgress: number;
  env: EnvParams;
  stressHeat: number;
  stressWater: number;
  stressNutrient: number;
  growthRate: number;
  plantHeightCm: number;
  canopySpreadM: number;
  berrySizeMm: number;
  healthIndex: number;
  yieldTons: number;
  irrigationNeed: boolean;
  hydrogelEfficiency: number;
  mulchCoverage: number;
  weather: WeatherMode;
  timeOfDay: TimeOfDay;
  alerts: { id: string; severity: 'high' | 'medium' | 'low'; title: string; field: string; age: string }[];
}

export interface FieldInfo {
  id: string;
  name: string;
  acres: number;
  health: number;
  plants: number;
  variety: string;
  rowSpacing: string;
  plantSpacing: string;
  soilType: string;
  soilMoisture: number;
  lastIrrigation: string;
  yieldEst: number;
  x: number;
  z: number;
  w: number;
  d: number;
}

/** Indian soil classes for Digital Twin / Soil / Hydrogel panels */
export type SoilClassId =
  | 'black'
  | 'alluvial'
  | 'red'
  | 'lateritic'
  | 'alkaline';

export interface SoilClassInfo {
  id: SoilClassId;
  label: string;
  shortLabel: string;
  /** Hex colors for procedural 3D texture */
  base: string;
  dark: string;
  light: string;
  /** Tint applied on materials (hex number) */
  tint: number;
  description: string;
  textureNote: string;
  waterHolding: string;
  drainage: string;
  phRange: string;
  nutrientNote: string;
  hydrogelTip: string;
  cropFit: string;
  management: string[];
}

export const SOIL_CLASSES: SoilClassInfo[] = [
  {
    id: 'black',
    label: 'Black Soil (Regur)',
    shortLabel: 'Black',
    base: '#3d2b1f',
    dark: '#1f1610',
    light: '#5c4033',
    tint: 0x4a3428,
    description:
      'Deep black cotton soils rich in clay (montmorillonite). High shrink–swell, excellent moisture retention for dry spells.',
    textureNote: 'Clayey to clay loam; sticky when wet, cracks when dry',
    waterHolding: 'Very high',
    drainage: 'Slow (risk of waterlogging)',
    phRange: '7.5 – 8.5 (slightly alkaline)',
    nutrientNote: 'Good K & Ca; often low available N and P; self-mulching surface',
    hydrogelTip:
      'Use moderate hydrogel dose — soil already holds water. Prefer formulations that improve aeration and reduce surface sealing after irrigation.',
    cropFit: 'Cotton, sorghum, soybean, wheat; grapes need careful drainage design',
    management: [
      'Avoid over-irrigation; schedule short drip cycles',
      'Gypsum if sodicity rises',
      'Deep ripping where hardpan forms',
      'Maintain organic matter to improve structure',
    ],
  },
  {
    id: 'alluvial',
    label: 'Alluvial Soil',
    shortLabel: 'Alluvial',
    base: '#c4a574',
    dark: '#8b6914',
    light: '#e0c9a0',
    tint: 0xc4a574,
    description:
      'River-deposited soils — fertile, deep, and variable in texture from sandy to silty clay. Widely used for intensive horticulture.',
    textureNote: 'Loam to silty loam; workable and deep',
    waterHolding: 'Moderate to good',
    drainage: 'Good to moderate',
    phRange: '6.5 – 7.5 (near neutral)',
    nutrientNote: 'Generally fertile; N often limiting; respond well to balanced fertigation',
    hydrogelTip:
      'Balanced hydrogel works well. Supports even moisture between drip cycles without waterlogging risk in most loams.',
    cropFit: 'Grapes, vegetables, cereals, sugarcane — highly versatile',
    management: [
      'Match irrigation to texture band (sandier vs siltier patches)',
      'Regular OM / compost to sustain fertility',
      'Watch for nutrient leaching on sandier alluvium',
      'Mulch to cut evaporation in summer',
    ],
  },
  {
    id: 'red',
    label: 'Red Soil',
    shortLabel: 'Red',
    base: '#a0522d',
    dark: '#6b2e1a',
    light: '#c4784a',
    tint: 0xa0522d,
    description:
      'Iron-oxide rich red soils, often lighter textured. Lower natural fertility and water holding than black soils; respond strongly to irrigation + nutrition.',
    textureNote: 'Sandy loam to loam; porous',
    waterHolding: 'Low to moderate',
    drainage: 'Good to rapid',
    phRange: '5.5 – 6.8 (slightly acidic)',
    nutrientNote: 'Often deficient in N, P, organic matter; Fe / Al oxides can fix P',
    hydrogelTip:
      'High value from hydrogels — boost root-zone storage, cut deep percolation, and stabilize moisture on lighter red soils.',
    cropFit: 'Millets, groundnut, pulses, grapes with drip + hydrogel',
    management: [
      'Frequent light irrigation preferred over heavy cycles',
      'Band P fertilizer; consider rock phosphate / SSP strategy',
      'Build OM aggressively (FYM, compost, cover crops)',
      'Lime only if pH drops below ~5.8',
    ],
  },
  {
    id: 'lateritic',
    label: 'Lateritic Soil',
    shortLabel: 'Lateritic',
    base: '#b35c2e',
    dark: '#7a3a18',
    light: '#d4844a',
    tint: 0xb35c2e,
    description:
      'Highly weathered, iron/aluminium-rich soils. Often acidic, low base status, and low available P. Structure can be gravelly or hard when dry.',
    textureNote: 'Clay to gravelly clay; may have laterite nodules',
    waterHolding: 'Moderate (surface can crust)',
    drainage: 'Variable — surface runoff common on slopes',
    phRange: '4.5 – 6.0 (acidic)',
    nutrientNote: 'Low bases (Ca, Mg, K); strong P fixation; OM critical',
    hydrogelTip:
      'Hydrogels help buffer dry spells and improve plant-available water. Pair with lime/OM programs and avoid high-salt fertigation mixes.',
    cropFit: 'Cashew, pineapple, rubber in humid zones; grapes only with strong amendment plan',
    management: [
      'Liming to raise pH toward 6.0–6.5 for vines',
      'High OM and mulch to protect structure',
      'Split P applications near roots',
      'Contour / cover to limit erosion on slopes',
    ],
  },
  {
    id: 'alkaline',
    label: 'Alkaline / Saline Soil',
    shortLabel: 'Alk./Saline',
    base: '#c9b896',
    dark: '#9a8a6a',
    light: '#e8dcc4',
    tint: 0xc9b896,
    description:
      'High pH and/or soluble salts. White crusting possible. Restricts water uptake and nutrient balance; needs reclamation + careful irrigation.',
    textureNote: 'Variable; often poor structure when sodic',
    waterHolding: 'Can be high but plant-available water reduced by salts',
    drainage: 'Often impaired (sodic) — leaching needed',
    phRange: '8.0 – 9.5+ (alkaline) · EC elevated if saline',
    nutrientNote: 'Na / HCO₃ dominance; Fe, Zn, P availability poor; gypsum + drainage key',
    hydrogelTip:
      'Choose salt-tolerant hydrogel grades. Combine with leaching fraction in irrigation and gypsum where sodicity is confirmed. Do not rely on gels alone for reclamation.',
    cropFit: 'Salt-tolerant crops first; grapes only after EC/pH are brought into range',
    management: [
      'Test EC & ESP; apply gypsum if sodic',
      'Ensure drainage / leaching fraction on drip',
      'Avoid high-bicarbonate irrigation water',
      'Foliar Fe/Zn if chlorosis appears',
    ],
  },
];

export function getSoilClass(id: SoilClassId | string): SoilClassInfo {
  return SOIL_CLASSES.find((s) => s.id === id) || SOIL_CLASSES[1];
}

/** Commercial grape varieties (Maharashtra / India focus) */
export type GrapeVarietyId =
  | 'thompson'
  | 'tas_a_ganesh'
  | 'sharad'
  | 'manjari_naveen'
  | 'manjari_shyama';

export interface GrapeVarietyInfo {
  id: GrapeVarietyId;
  label: string;
  color: 'white' | 'coloured';
  /** Ripe berry hex for 3D fruit colour */
  berryHex: number;
  /** Mid-ripening hex */
  berryMidHex: number;
  market: string;
  /** Suitability 0–100 by soil class */
  soilScore: Record<SoilClassId, number>;
  notes: string;
  preferSoils: SoilClassId[];
  avoidSoils: SoilClassId[];
  /** Agronomy used by lifecycle + yield models */
  baseYieldTPerAc: number;
  vigor: number; // relative canopy/height growth 0.85–1.15
  cycleDays: number; // typical days to harvest
  maxBerryMm: number;
  brixTarget: string;
  harvestWindow: string;
  clusterNote: string;
}

export const GRAPE_VARIETIES: GrapeVarietyInfo[] = [
  {
    id: 'thompson',
    label: 'Thompson Seedless',
    color: 'white',
    berryHex: 0xd4ee6f,
    berryMidHex: 0xc8e050,
    market: 'Raisin / table / export',
    soilScore: { black: 72, alluvial: 92, red: 78, lateritic: 55, alkaline: 40 },
    notes: 'Needs good drainage and moderate fertility; performs best on deep alluvial / well-managed red loams.',
    preferSoils: ['alluvial', 'red', 'black'],
    avoidSoils: ['alkaline', 'lateritic'],
    baseYieldTPerAc: 4.8,
    vigor: 1.0,
    cycleDays: 150,
    maxBerryMm: 16,
    brixTarget: '18 – 22°',
    harvestWindow: 'Day 140 – 155',
    clusterNote: 'Long conical clusters; berries oval, seedless, amber-green when ripe.',
  },
  {
    id: 'tas_a_ganesh',
    label: 'Tas-A-Ganesh',
    color: 'white',
    berryHex: 0xe0f07a,
    berryMidHex: 0xd0e868,
    market: 'Raisin / table (clone of Thompson)',
    soilScore: { black: 80, alluvial: 90, red: 82, lateritic: 58, alkaline: 42 },
    notes: 'Slightly more vigorous than Thompson; handles black soils well if drainage is managed.',
    preferSoils: ['alluvial', 'black', 'red'],
    avoidSoils: ['alkaline'],
    baseYieldTPerAc: 5.2,
    vigor: 1.08,
    cycleDays: 148,
    maxBerryMm: 17,
    brixTarget: '18 – 21°',
    harvestWindow: 'Day 138 – 152',
    clusterNote: 'Slightly larger berries than Thompson; vigorous canopy needs timely shoot thinning.',
  },
  {
    id: 'sharad',
    label: 'Sharad Seedless',
    color: 'coloured',
    berryHex: 0x4a148c,
    berryMidHex: 0x9c27b0,
    market: 'Table grape / export',
    soilScore: { black: 70, alluvial: 88, red: 85, lateritic: 60, alkaline: 38 },
    notes: 'Coloured seedless; prefers free-draining soils with balanced nutrition and good canopy management.',
    preferSoils: ['alluvial', 'red'],
    avoidSoils: ['alkaline', 'lateritic'],
    baseYieldTPerAc: 4.5,
    vigor: 0.98,
    cycleDays: 155,
    maxBerryMm: 18,
    brixTarget: '17 – 20°',
    harvestWindow: 'Day 145 – 160',
    clusterNote: 'Attractive purple-black clusters; colour development needs good light in canopy.',
  },
  {
    id: 'manjari_naveen',
    label: 'Manjari Naveen',
    color: 'white',
    berryHex: 0xc6e377,
    berryMidHex: 0xb8d96a,
    market: 'Table / early harvest',
    soilScore: { black: 75, alluvial: 90, red: 80, lateritic: 62, alkaline: 45 },
    notes: 'Early, productive white variety; responsive on alluvial and improved red soils with drip + nutrition.',
    preferSoils: ['alluvial', 'red', 'black'],
    avoidSoils: ['alkaline'],
    baseYieldTPerAc: 5.0,
    vigor: 1.05,
    cycleDays: 140,
    maxBerryMm: 15,
    brixTarget: '17 – 20°',
    harvestWindow: 'Day 132 – 145',
    clusterNote: 'Early maturity white table grape; compact-medium clusters, good for staggered harvest.',
  },
  {
    id: 'manjari_shyama',
    label: 'Manjari Shyama',
    color: 'coloured',
    berryHex: 0x1a0a2e,
    berryMidHex: 0x6a1b9a,
    market: 'Table / coloured export',
    soilScore: { black: 68, alluvial: 86, red: 84, lateritic: 58, alkaline: 36 },
    notes: 'Coloured seedless; best on well-drained alluvial/red soils; sensitive to salinity and waterlogging.',
    preferSoils: ['alluvial', 'red'],
    avoidSoils: ['alkaline', 'lateritic'],
    baseYieldTPerAc: 4.3,
    vigor: 0.95,
    cycleDays: 158,
    maxBerryMm: 17,
    brixTarget: '18 – 21°',
    harvestWindow: 'Day 148 – 165',
    clusterNote: 'Dark coloured export clusters; avoid excess vigor that shades berries and delays colour.',
  },
];

export function getGrapeVariety(id: GrapeVarietyId | string): GrapeVarietyInfo {
  return GRAPE_VARIETIES.find((v) => v.id === id) || GRAPE_VARIETIES[0];
}

export type FitLevel = 'Best' | 'Good' | 'Fair' | 'Poor';

export function varietyFitLevel(score: number): FitLevel {
  if (score >= 85) return 'Best';
  if (score >= 70) return 'Good';
  if (score >= 55) return 'Fair';
  return 'Poor';
}

/** Rank varieties for a soil class (highest score first) */
export function recommendVarietiesForSoil(soilId: SoilClassId | string): {
  variety: GrapeVarietyInfo;
  score: number;
  fit: FitLevel;
}[] {
  const sid = (SOIL_CLASSES.some((s) => s.id === soilId) ? soilId : 'alluvial') as SoilClassId;
  return GRAPE_VARIETIES
    .map((v) => {
      const score = v.soilScore[sid] ?? 50;
      return { variety: v, score, fit: varietyFitLevel(score) };
    })
    .sort((a, b) => b.score - a.score);
}

export const STAGE_RANGES: { id: LifecycleStage; label: string; start: number; end: number; emoji: string }[] = [
  { id: 'germination', label: 'Bud Break', start: 0, end: 15, emoji: '🌱' },
  { id: 'vegetative', label: 'Vegetative Growth', start: 15, end: 45, emoji: '🌿' },
  { id: 'flowering', label: 'Flowering & Pollination', start: 45, end: 65, emoji: '🐝' },
  { id: 'fruit_set', label: 'Fruit Set', start: 65, end: 80, emoji: '🍇' },
  { id: 'berry', label: 'Berry Development', start: 80, end: 110, emoji: '🍇' },
  { id: 'ripening', label: 'Veraison & Ripening', start: 110, end: 140, emoji: '🍇' },
  { id: 'harvest', label: 'Harvesting', start: 140, end: 150, emoji: '🧺' },
];

export const DEFAULT_ENV: EnvParams = {
  temperature: 28,
  humidity: 65,
  rainfall: 2,
  soilMoisture: 62,
  sunlight: 620,
  windSpeed: 18,
  soilPh: 6.5,
  nitrogen: 70,
  phosphorus: 65,
  potassium: 80,
  hydrogelSat: 78,
  irrigationMm: 0,
};

export function weatherGrowthModifier(w: WeatherMode): number {
  switch (w) {
    case 'sun': return 1.15;
    case 'cloudy': return 0.95;
    case 'rain': return 1.05;
    case 'night': return 0.55;
    default: return 1;
  }
}

export function stageFromDay(day: number): LifecycleStage {
  if (day < 15) return 'germination';
  if (day < 45) return 'vegetative';
  if (day < 65) return 'flowering';
  if (day < 80) return 'fruit_set';
  if (day < 110) return 'berry';
  if (day < 140) return 'ripening';
  return 'harvest';
}

export function stageProgress(day: number): number {
  const s = STAGE_RANGES.find((r) => day >= r.start && day < r.end) || STAGE_RANGES[STAGE_RANGES.length - 1];
  const span = s.end - s.start;
  return Math.min(100, Math.round(((day - s.start) / span) * 100));
}

export function computeStress(env: EnvParams): { heat: number; water: number; nutrient: number; growth: number } {
  const heat = Math.max(0, Math.min(1, (env.temperature - 32) / 12 + (env.temperature < 18 ? (18 - env.temperature) / 10 : 0)));
  const water = Math.max(0, Math.min(1, (45 - env.soilMoisture) / 35));
  const nutrient = Math.max(0, Math.min(1, (55 - Math.min(env.nitrogen, env.phosphorus, env.potassium)) / 40));
  const growth = Math.max(0.25, 1 - heat * 0.45 - water * 0.4 - nutrient * 0.25);
  return { heat, water, nutrient, growth };
}

export function plantMetrics(day: number, growth: number, varietyId?: GrapeVarietyId | string) {
  const v = getGrapeVariety(varietyId || 'thompson');
  const cycle = v.cycleDays || 150;
  const t = Math.min(1, day / cycle);
  const height = Math.round((8 + t * 140 * v.vigor) * growth);
  const canopy = +(0.2 + t * 1.5 * v.vigor * growth).toFixed(2);
  let berry = 0;
  if (day >= 65) {
    const span = Math.max(40, cycle - 65);
    berry = +((day - 65) / span * v.maxBerryMm * growth).toFixed(1);
  }
  if (day >= cycle - 10) berry = +(v.maxBerryMm * 0.92 * growth).toFixed(1);
  return { height, canopy, berry };
}

export function yieldPrediction(
  day: number,
  health: number,
  growth: number,
  varietyId?: GrapeVarietyId | string
): number {
  const v = getGrapeVariety(varietyId || 'thompson');
  const base = v.baseYieldTPerAc;
  const cycle = v.cycleDays || 150;
  const stageFactor =
    day < 45 ? 0.15 : day < 80 ? 0.45 : day < cycle * 0.8 ? 0.85 : 1;
  return +((base * (health / 100) * growth * stageFactor)).toFixed(2);
}

export function buildAlerts(env: EnvParams, stress: { heat: number; water: number; nutrient: number }) {
  const alerts: SimState['alerts'] = [];
  if (stress.heat > 0.35) {
    alerts.push({ id: 'a1', severity: 'high', title: 'High temperature expected', field: 'Field B', age: '10 min ago' });
  }
  if (env.nitrogen < 55) {
    alerts.push({ id: 'a2', severity: 'medium', title: 'Low nitrogen in Zone B2', field: 'Field B', age: '35 min ago' });
  }
  if (env.rainfall > 8 || env.humidity > 80) {
    alerts.push({ id: 'a3', severity: 'low', title: 'Rainfall expected in 18 hrs', field: 'Farm', age: '1 hr ago' });
  }
  if (stress.water > 0.4) {
    alerts.push({ id: 'a4', severity: 'high', title: 'Soil moisture below optimal', field: 'Field C', age: '20 min ago' });
  }
  return alerts;
}

function applyWeatherToEnv(env: EnvParams, weather: WeatherMode): EnvParams {
  const next = { ...env };
  if (weather === 'sun') {
    next.temperature = 30;
    next.humidity = 55;
    next.rainfall = 0;
    next.sunlight = 780;
    next.hydrogelSat = Math.max(25, next.hydrogelSat - 2.5);
    next.soilMoisture = Math.max(30, next.soilMoisture - 1.5);
  } else if (weather === 'cloudy') {
    next.temperature = 26;
    next.humidity = 70;
    next.rainfall = 1;
    next.sunlight = 380;
  } else if (weather === 'rain') {
    next.temperature = 24;
    next.humidity = 88;
    next.rainfall = 12;
    next.sunlight = 180;
    next.hydrogelSat = Math.min(100, next.hydrogelSat + 8);
    next.soilMoisture = Math.min(95, next.soilMoisture + 6);
  } else if (weather === 'night') {
    next.temperature = 21;
    next.humidity = 75;
    next.rainfall = 0;
    next.sunlight = 0;
  }
  return next;
}

function weatherToTimeOfDay(w: WeatherMode): TimeOfDay {
  if (w === 'night') return 'night';
  return 'noon';
}

export function stepSimulation(
  prev: SimState,
  manualEnv?: Partial<EnvParams>,
  forceWeather?: WeatherMode,
  varietyId?: GrapeVarietyId | string
): SimState {
  const weather = forceWeather ?? prev.weather ?? 'sun';
  let env = applyWeatherToEnv({ ...prev.env, ...manualEnv }, weather);
  const waterIn = env.rainfall * 0.6 + env.irrigationMm * 0.9;
  env.hydrogelSat = Math.min(100, Math.max(20, env.hydrogelSat + waterIn * 1.2 - (weather === 'sun' ? 2.2 : 1.2)));
  env.soilMoisture = Math.min(
    95,
    Math.max(25, env.soilMoisture + waterIn * 0.8 + env.hydrogelSat * 0.02 - env.temperature * 0.08 - env.sunlight * 0.004)
  );

  const stress = computeStress(env);
  const wMod = weatherGrowthModifier(weather);
  const growth = Math.max(0.2, stress.growth * wMod);
  const day = Math.min(150, prev.day + 1);
  const stage = stageFromDay(day);
  const metrics = plantMetrics(day, growth, varietyId);
  const health = Math.round(Math.max(40, Math.min(98, 92 - stress.heat * 25 - stress.water * 22 - stress.nutrient * 18)));
  const yieldTons = yieldPrediction(day, health, growth, varietyId);
  const irrigationNeed = env.soilMoisture < 50 || env.hydrogelSat < 45;

  return {
    day,
    stage,
    stageProgress: stageProgress(day),
    env,
    stressHeat: stress.heat,
    stressWater: stress.water,
    stressNutrient: stress.nutrient,
    growthRate: growth,
    plantHeightCm: metrics.height,
    canopySpreadM: metrics.canopy,
    berrySizeMm: metrics.berry,
    healthIndex: health,
    yieldTons,
    irrigationNeed,
    hydrogelEfficiency: Math.round(70 + env.hydrogelSat * 0.2 - stress.heat * 10),
    mulchCoverage: 85,
    weather,
    timeOfDay: forceWeather ? weatherToTimeOfDay(forceWeather) : prev.timeOfDay ?? weatherToTimeOfDay(weather),
    alerts: buildAlerts(env, stress),
  };
}

export function createInitialState(day = 95, varietyId?: GrapeVarietyId | string): SimState {
  const weather: WeatherMode = 'sun';
  const env = applyWeatherToEnv({ ...DEFAULT_ENV }, weather);
  const stress = computeStress(env);
  const growth = stress.growth * weatherGrowthModifier(weather);
  const metrics = plantMetrics(day, growth, varietyId);
  const health = 87;
  return {
    day,
    stage: stageFromDay(day),
    stageProgress: stageProgress(day),
    env,
    stressHeat: stress.heat,
    stressWater: stress.water,
    stressNutrient: stress.nutrient,
    growthRate: growth,
    plantHeightCm: metrics.height,
    canopySpreadM: metrics.canopy,
    berrySizeMm: metrics.berry,
    healthIndex: health,
    yieldTons: yieldPrediction(day, health, growth, varietyId),
    irrigationNeed: false,
    hydrogelEfficiency: 73,
    mulchCoverage: 85,
    weather,
    timeOfDay: 'noon',
    alerts: buildAlerts(env, stress),
  };
}

export const FIELDS: FieldInfo[] = [
  {
    id: 'A',
    name: 'Field A',
    acres: 2.3,
    health: 89,
    plants: 1080,
    variety: 'Thompson Seedless',
    rowSpacing: '2.5 m',
    plantSpacing: '1.5 m',
    soilType: 'Sandy Loam',
    soilMoisture: 64,
    lastIrrigation: '2 days ago',
    yieldEst: 4.9,
    x: -14,
    z: -12,
    w: 18,
    d: 14,
  },
  {
    id: 'B',
    name: 'Field B',
    acres: 2.45,
    health: 85,
    plants: 1200,
    variety: 'Thompson Seedless',
    rowSpacing: '2.5 m',
    plantSpacing: '1.5 m',
    soilType: 'Clay Loam',
    soilMoisture: 58,
    lastIrrigation: '1 day ago',
    yieldEst: 4.6,
    x: 14,
    z: -12,
    w: 18,
    d: 14,
  },
  {
    id: 'C',
    name: 'Field C',
    acres: 2.15,
    health: 82,
    plants: 980,
    variety: 'Flame Seedless',
    rowSpacing: '2.4 m',
    plantSpacing: '1.4 m',
    soilType: 'Loamy Sand',
    soilMoisture: 55,
    lastIrrigation: '3 days ago',
    yieldEst: 4.2,
    x: -14,
    z: 12,
    w: 18,
    d: 14,
  },
  {
    id: 'D',
    name: 'Field D',
    acres: 2.6,
    health: 82,
    plants: 1060,
    variety: 'Thompson Seedless',
    rowSpacing: '2.6 m',
    plantSpacing: '1.6 m',
    soilType: 'Sandy Clay',
    soilMoisture: 60,
    lastIrrigation: '2 days ago',
    yieldEst: 4.5,
    x: 14,
    z: 12,
    w: 18,
    d: 14,
  },
];