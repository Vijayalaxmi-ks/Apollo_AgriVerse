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

export const STAGE_RANGES: { id: LifecycleStage; label: string; start: number; end: number; emoji: string }[] = [
  { id: 'germination', label: 'Germination', start: 0, end: 15, emoji: '🌱' },
  { id: 'vegetative', label: 'Vegetative Growth', start: 15, end: 45, emoji: '🌿' },
  { id: 'flowering', label: 'Flowering', start: 45, end: 65, emoji: '🌼' },
  { id: 'fruit_set', label: 'Fruit Set', start: 65, end: 80, emoji: '🍇' },
  { id: 'berry', label: 'Berry Development', start: 80, end: 110, emoji: '🍇' },
  { id: 'ripening', label: 'Ripening', start: 110, end: 140, emoji: '🍇' },
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

export function plantMetrics(day: number, growth: number) {
  const t = Math.min(1, day / 150);
  const height = Math.round((8 + t * 140) * growth);
  const canopy = +(0.2 + t * 1.5 * growth).toFixed(2);
  let berry = 0;
  if (day >= 65) berry = +((day - 65) / 85 * 14 * growth).toFixed(1);
  if (day >= 140) berry = +(12 * growth).toFixed(1);
  return { height, canopy, berry };
}

export function yieldPrediction(day: number, health: number, growth: number): number {
  const base = 4.8;
  const stageFactor = day < 45 ? 0.15 : day < 80 ? 0.45 : day < 120 ? 0.85 : 1;
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
  forceWeather?: WeatherMode
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
  const metrics = plantMetrics(day, growth);
  const health = Math.round(Math.max(40, Math.min(98, 92 - stress.heat * 25 - stress.water * 22 - stress.nutrient * 18)));
  const yieldTons = yieldPrediction(day, health, growth);
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

export function createInitialState(day = 95): SimState {
  const weather: WeatherMode = 'sun';
  const env = applyWeatherToEnv({ ...DEFAULT_ENV }, weather);
  const stress = computeStress(env);
  const growth = stress.growth * weatherGrowthModifier(weather);
  const metrics = plantMetrics(day, growth);
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
    yieldTons: yieldPrediction(day, health, growth),
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