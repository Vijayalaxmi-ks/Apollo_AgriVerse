import { useMemo, useState, useCallback } from 'react';
import {
  AlertTriangle, ShieldAlert, Info, Bell, BellRing, CheckCircle2,
  Thermometer, Droplets, CloudRain, Wind, Leaf, FlaskConical,
  MapPin, Clock, Filter, X, Zap, Activity, Eye, ChevronRight,
  Sun, Cloud, Layers, Radio,
} from 'lucide-react';
import type { SimState, FieldInfo } from './simulation';
import { FIELDS } from './simulation';
import { useFarmOptional } from './context/FarmContext';
import { useSettingsOptional } from './context/SettingsContext';
import type { EvaluateReport } from './api/evaluate';
import type { LiveWeatherSummary } from './api/weather';
import type { AppSettings } from './context/SettingsContext';

type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

type AlertItem = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  field: string;
  fieldId?: string;
  category: 'weather' | 'soil' | 'crop' | 'irrigation' | 'system';
  age: string;
  metric?: string;
  action?: string;
  source: string;
};

const SEV_META: Record<
  Severity,
  { label: string; color: string; bg: string; border: string; glow: string; bar: string; soft: string; icon: typeof AlertTriangle }
> = {
  critical: {
    label: 'Critical',
    color: 'text-rose-300',
    bg: 'bg-rose-500/15',
    border: 'border-rose-500/45',
    glow: 'shadow-[0_0_24px_rgba(244,63,94,0.12)]',
    bar: 'bg-gradient-to-b from-rose-400 to-rose-600',
    soft: 'from-rose-500/20 via-rose-500/5 to-transparent',
    icon: ShieldAlert,
  },
  high: {
    label: 'High',
    color: 'text-orange-300',
    bg: 'bg-orange-500/12',
    border: 'border-orange-500/40',
    glow: 'shadow-[0_0_20px_rgba(249,115,22,0.1)]',
    bar: 'bg-gradient-to-b from-orange-400 to-orange-600',
    soft: 'from-orange-500/18 via-orange-500/5 to-transparent',
    icon: AlertTriangle,
  },
  medium: {
    label: 'Medium',
    color: 'text-amber-300',
    bg: 'bg-amber-500/12',
    border: 'border-amber-500/35',
    glow: 'shadow-[0_0_18px_rgba(245,158,11,0.08)]',
    bar: 'bg-gradient-to-b from-amber-400 to-amber-600',
    soft: 'from-amber-500/15 via-amber-500/5 to-transparent',
    icon: BellRing,
  },
  low: {
    label: 'Low',
    color: 'text-sky-300',
    bg: 'bg-sky-500/12',
    border: 'border-sky-500/35',
    glow: 'shadow-[0_0_16px_rgba(56,189,248,0.08)]',
    bar: 'bg-gradient-to-b from-sky-400 to-sky-600',
    soft: 'from-sky-500/15 via-sky-500/5 to-transparent',
    icon: Info,
  },
  info: {
    label: 'Info',
    color: 'text-violet-300',
    bg: 'bg-violet-500/12',
    border: 'border-violet-500/35',
    glow: 'shadow-[0_0_16px_rgba(167,139,250,0.08)]',
    bar: 'bg-gradient-to-b from-violet-400 to-violet-600',
    soft: 'from-violet-500/15 via-violet-500/5 to-transparent',
    icon: Bell,
  },
};

const CAT_META: Record<
  AlertItem['category'],
  { label: string; icon: typeof Thermometer; chip: string }
> = {
  weather: { label: 'Weather', icon: CloudRain, chip: 'text-sky-300 bg-sky-500/10 border-sky-500/30' },
  soil: { label: 'Soil', icon: Layers, chip: 'text-lime-300 bg-lime-500/10 border-lime-500/30' },
  crop: { label: 'Crop', icon: Leaf, chip: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
  irrigation: { label: 'Irrigation', icon: Droplets, chip: 'text-cyan-300 bg-cyan-500/10 border-cyan-500/30' },
  system: { label: 'System', icon: Activity, chip: 'text-violet-300 bg-violet-500/10 border-violet-500/30' },
};

function mapSimSeverity(s: string): Severity {
  if (s === 'high') return 'high';
  if (s === 'medium') return 'medium';
  if (s === 'low') return 'low';
  return 'info';
}

/** Always produce a full farm + per-field alert feed (never empty under normal filters). */
function buildRichAlerts(
  sim: SimState,
  opts?: {
    liveWeather?: LiveWeatherSummary | null;
    evaluateReport?: EvaluateReport | null;
    twinState?: any;
    mlTelemetry?: any;
    fields?: FieldInfo[];
    thresholds?: Pick<
      AppSettings,
      'heatAlertC' | 'humidityAlert' | 'moistureMin' | 'moistureMax' | 'diseaseThreshold' | 'notifyCritical' | 'notifyWeather' | 'notifyIrrigation'
    >;
  },
): AlertItem[] {
  const items: AlertItem[] = [];
  const env = sim.env;
  const wx = opts?.liveWeather;
  const report = opts?.evaluateReport;
  const twin = opts?.twinState;
  const mlTel = opts?.mlTelemetry;
  const fields = opts?.fields?.length ? opts.fields : FIELDS;
  const th = opts?.thresholds;
  const heatT = th?.heatAlertC ?? 34;
  const humT = th?.humidityAlert ?? 80;
  const moistMin = th?.moistureMin ?? 48;
  const moistMax = th?.moistureMax ?? 75;
  const temp = wx?.temperature ?? env.temperature;
  const humidity = wx?.humidity ?? env.humidity;
  const rainfall = wx?.rainfall ?? env.rainfall;
  const wind = wx?.windKmh ?? env.windSpeed;
  const wxSource = wx?.isBackend ? 'Backend /weather' : wx ? 'Weather fallback' : 'Weather twin';
  let n = 0;
  const id = () => `al-${++n}`;

  // ── Backend evaluate-driven alerts (highest priority) ──
  const focus = report?.focus_crop_assessment;
  if (focus && typeof focus.final_suitability_score === 'number') {
    if (focus.final_suitability_score < 70) {
      items.push({
        id: id(),
        severity: focus.final_suitability_score < 55 ? 'high' : 'medium',
        title: `${focus.crop_name} suitability ${focus.final_suitability_score.toFixed(1)}% (${focus.suitability_band || 'Marginal'})`,
        detail: (focus.cons || []).slice(0, 3).join(' · ') || 'Engine scored this crop below the preferred band for current region/soil/weather.',
        field: report?.location?.district || 'Farm-wide',
        category: 'crop',
        age: 'Just now',
        metric: `${focus.final_suitability_score.toFixed(1)}%`,
        action: 'Review Recommendations in Predictions · adjust water_availability or soil_id in Settings',
        source: 'Backend /api/evaluate',
      });
    }
    const soilScore = typeof focus.score_tree?.soil === 'object' ? Number(focus.score_tree?.soil?.score ?? 0) : 0;
    if (soilScore > 0 && soilScore < 65) {
      items.push({
        id: id(),
        severity: 'medium',
        title: `Soil score low (${soilScore.toFixed(0)}%) for ${focus.crop_name}`,
        detail: `Engine soil vector is weak. Profile: ${report?.soil_profile?.type || '—'} · pH ${report?.soil_profile?.ph ?? '—'} · N ${report?.soil_profile?.n ?? '—'}`,
        field: 'Farm-wide',
        category: 'soil',
        age: 'Just now',
        metric: `${soilScore.toFixed(0)}%`,
        action: 'Check Soil panel · consider soil amendment plan',
        source: 'Backend /api/evaluate',
      });
    }
  }
  const disq = report?.disqualified_crops || [];
  if (disq.length > 0) {
    items.push({
      id: id(),
      severity: 'info',
      title: `${disq.length} crop(s) disqualified by agronomic threshold`,
      detail: disq.slice(0, 4).map((d) => `${d.crop_name} (${d.agronomic_score ?? '—'})`).join(' · '),
      field: 'Farm-wide',
      category: 'crop',
      age: 'Just now',
      action: 'See Predictions → Disqualified list',
      source: 'Backend /api/evaluate',
    });
  }
  const sp = report?.soil_profile;
  if (sp?.moisture_pct != null && Number(sp.moisture_pct) < 18) {
    items.push({
      id: id(),
      severity: Number(sp.moisture_pct) < 14 ? 'high' : 'medium',
      title: `KnowledgeBase soil moisture ${sp.moisture_pct}%`,
      detail: `Backend soil row reports low moisture for ${sp.type || 'profile'} (id ${sp.soil_id || '—'}).`,
      field: 'Farm-wide',
      category: 'soil',
      age: 'Just now',
      metric: `${sp.moisture_pct}%`,
      action: 'Schedule irrigation · open Soil panel',
      source: 'Backend soil_profile',
    });
  }

  // ── Farm-wide weather (prefer live backend values; thresholds from Settings) ──
  if (temp >= heatT) {
    items.push({
      id: id(),
      severity: temp >= heatT + 4 ? 'critical' : 'high',
      title: 'Heat stress threshold exceeded',
      detail: `Air temperature ${temp}°C is above the alert threshold (${heatT}°C). Berry scorch and stomatal closure risk are elevated on west-facing rows.`,
      field: 'Farm-wide',
      category: 'weather',
      age: 'Just now',
      metric: `${temp}°C`,
      action: 'Deploy shade net · increase afternoon drip pulse on Fields A & C',
      source: wxSource,
    });
  } else if (temp >= heatT - 3) {
    items.push({
      id: id(),
      severity: 'medium',
      title: 'Warm conditions — watch heat buildup',
      detail: `Temperature ${temp}°C is approaching the heat alert (${heatT}°C). Peak afternoon hours may still stress fruiting vines.`,
      field: 'Farm-wide',
      category: 'weather',
      age: '4 min ago',
      metric: `${env.temperature}°C`,
      action: 'Monitor canopy temperature · prefer early-morning irrigation',
      source: 'Weather twin',
    });
  } else {
    items.push({
      id: id(),
      severity: 'info',
      title: 'Temperature within optimal band',
      detail: `Current ${env.temperature}°C supports healthy photosynthesis and berry development for Thompson / Flame blocks.`,
      field: 'Farm-wide',
      category: 'weather',
      age: '2 min ago',
      metric: `${env.temperature}°C`,
      action: 'Continue standard scouting cadence',
      source: 'Weather twin',
    });
  }

  if (env.humidity >= humT) {
    items.push({
      id: id(),
      severity: 'high',
      title: 'High humidity — disease window open',
      detail: `RH ${env.humidity}% favors downy mildew and botrytis. Dense canopy blocks need priority scouting.`,
      field: 'Farm-wide',
      category: 'crop',
      age: '8 min ago',
      metric: `${env.humidity}% RH`,
      action: 'Scout leaf undersides · consider protective spray on Field C',
      source: 'Disease model',
    });
  } else if (env.humidity >= 70) {
    items.push({
      id: id(),
      severity: 'medium',
      title: 'Elevated humidity — mildew watch',
      detail: `RH ${env.humidity}% is in the caution zone. Combined with leaf wetness, infection risk rises overnight.`,
      field: 'Farm-wide',
      category: 'crop',
      age: '11 min ago',
      metric: `${env.humidity}% RH`,
      action: 'Ensure airflow · avoid late evening irrigation',
      source: 'Disease model',
    });
  } else {
    items.push({
      id: id(),
      severity: 'low',
      title: 'Humidity favorable for vines',
      detail: `Relative humidity ${env.humidity}% is comfortable. Disease pressure from air moisture is currently low.`,
      field: 'Farm-wide',
      category: 'weather',
      age: '6 min ago',
      metric: `${env.humidity}% RH`,
      action: 'Maintain canopy management schedule',
      source: 'Weather twin',
    });
  }

  if (env.rainfall >= 12) {
    items.push({
      id: id(),
      severity: 'high',
      title: 'Heavy rainfall event',
      detail: `${env.rainfall.toFixed(1)} mm recorded. Dilution and berry cracking risk if fruit is near harvest stage.`,
      field: 'Farm-wide',
      category: 'weather',
      age: '5 min ago',
      metric: `${env.rainfall.toFixed(1)} mm`,
      action: 'Pause fertigation · clear drainage paths',
      source: 'Weather twin',
    });
  } else if (env.rainfall >= 3) {
    items.push({
      id: id(),
      severity: 'medium',
      title: 'Recent rainfall noted',
      detail: `${env.rainfall.toFixed(1)} mm rain. Soil moisture will rise; adjust next irrigation cycle downward.`,
      field: 'Farm-wide',
      category: 'weather',
      age: '15 min ago',
      metric: `${env.rainfall.toFixed(1)} mm`,
      action: 'Skip one drip cycle on clay fields',
      source: 'Weather twin',
    });
  } else {
    items.push({
      id: id(),
      severity: 'info',
      title: 'Dry weather — irrigation dependent',
      detail: `Rainfall ${env.rainfall.toFixed(1)} mm. Crop water demand must be met fully through drip + hydrogel buffer.`,
      field: 'Farm-wide',
      category: 'irrigation',
      age: '9 min ago',
      metric: `${env.rainfall.toFixed(1)} mm`,
      action: 'Confirm tonight’s irrigation schedule is active',
      source: 'Irrigation AI',
    });
  }

  if ((env.windSpeed ?? 0) >= 28) {
    items.push({
      id: id(),
      severity: 'medium',
      title: 'High wind advisory',
      detail: `Wind ${env.windSpeed} km/h may damage shoots and raise ET demand across exposed blocks.`,
      field: 'Farm-wide',
      category: 'weather',
      age: '20 min ago',
      metric: `${env.windSpeed} km/h`,
      action: 'Check trellis tension · delay foliar sprays',
      source: 'Weather twin',
    });
  } else {
    items.push({
      id: id(),
      severity: 'info',
      title: 'Wind within operating limits',
      detail: `Wind speed ${env.windSpeed ?? 18} km/h is acceptable for spray and harvest operations.`,
      field: 'Farm-wide',
      category: 'weather',
      age: '14 min ago',
      metric: `${env.windSpeed ?? 18} km/h`,
      action: 'No wind restriction on field work',
      source: 'Weather twin',
    });
  }

  // ── Farm soil / nutrients / hydrogel ──
  if (env.soilMoisture < moistMin) {
    items.push({
      id: id(),
      severity: env.soilMoisture < 40 ? 'critical' : 'high',
      title: 'Farm soil moisture low',
      detail: `Aggregate soil moisture ${env.soilMoisture.toFixed(0)}% is below the 50–70% target band.`,
      field: 'Farm-wide',
      category: 'soil',
      age: '7 min ago',
      metric: `${env.soilMoisture.toFixed(0)}%`,
      action: 'Priority irrigation across all fields',
      source: 'Soil network',
    });
  } else if (env.soilMoisture > moistMax) {
    items.push({
      id: id(),
      severity: 'medium',
      title: 'Farm soil moisture high',
      detail: `Aggregate moisture ${env.soilMoisture.toFixed(0)}% — risk of root hypoxia in heavier soils.`,
      field: 'Farm-wide',
      category: 'soil',
      age: '12 min ago',
      metric: `${env.soilMoisture.toFixed(0)}%`,
      action: 'Reduce cycle length · check drainage',
      source: 'Soil network',
    });
  } else {
    items.push({
      id: id(),
      severity: 'info',
      title: 'Farm soil moisture on target',
      detail: `Average moisture ${env.soilMoisture.toFixed(1)}% sits inside the optimal 50–70% band for grape roots.`,
      field: 'Farm-wide',
      category: 'soil',
      age: '3 min ago',
      metric: `${env.soilMoisture.toFixed(1)}%`,
      action: 'Keep current irrigation recipe',
      source: 'Soil network',
    });
  }

  if (env.nitrogen < 60) {
    items.push({
      id: id(),
      severity: env.nitrogen < 50 ? 'high' : 'medium',
      title: 'Nitrogen below target band',
      detail: `N index ${Math.round(env.nitrogen)}. Vegetative vigor may lag over the next 7–10 days if not corrected.`,
      field: 'Farm-wide',
      category: 'soil',
      age: '28 min ago',
      metric: `N ${Math.round(env.nitrogen)}`,
      action: 'Schedule fertigation top-up on Fields B & D',
      source: 'Nutrient model',
    });
  } else {
    items.push({
      id: id(),
      severity: 'low',
      title: 'Nitrogen levels adequate',
      detail: `N index ${Math.round(env.nitrogen)} is within the maintenance band for current phenology.`,
      field: 'Farm-wide',
      category: 'soil',
      age: '32 min ago',
      metric: `N ${Math.round(env.nitrogen)}`,
      action: 'Re-check after next fertigation cycle',
      source: 'Nutrient model',
    });
  }

  if (env.hydrogelSat < 50) {
    items.push({
      id: id(),
      severity: 'medium',
      title: 'Hydrogel buffer running low',
      detail: `Hydrogel saturation ${Math.round(env.hydrogelSat)}%. Water-holding capacity during peak heat will be reduced.`,
      field: 'Farm-wide',
      category: 'irrigation',
      age: '40 min ago',
      metric: `${Math.round(env.hydrogelSat)}%`,
      action: 'Longer pulse to recharge hydrogel beds',
      source: 'Hydrogel panel',
    });
  } else {
    items.push({
      id: id(),
      severity: 'info',
      title: 'Hydrogel saturation healthy',
      detail: `Hydrogel at ${Math.round(env.hydrogelSat)}% — good buffer for short dry spells and midday stress.`,
      field: 'Farm-wide',
      category: 'irrigation',
      age: '25 min ago',
      metric: `${Math.round(env.hydrogelSat)}%`,
      action: 'No recharge required today',
      source: 'Hydrogel panel',
    });
  }

  if (sim.stressHeat > 0.25) {
    items.push({
      id: id(),
      severity: sim.stressHeat > 0.45 ? 'high' : 'medium',
      title: 'Heat stress index elevated',
      detail: `Twin heat-stress ${(sim.stressHeat * 100).toFixed(0)}%. Afternoon canopy cooling recommended on exposed blocks.`,
      field: 'Farm-wide',
      category: 'weather',
      age: '6 min ago',
      metric: `${(sim.stressHeat * 100).toFixed(0)}%`,
      action: 'Mist / shade on west rows of Field D',
      source: 'Twin engine',
    });
  }
  if (sim.stressWater > 0.2) {
    items.push({
      id: id(),
      severity: sim.stressWater > 0.4 ? 'high' : 'medium',
      title: 'Water stress building',
      detail: `Water-stress index ${(sim.stressWater * 100).toFixed(0)}%. Growth rate will slow if not relieved.`,
      field: 'Farm-wide',
      category: 'irrigation',
      age: '9 min ago',
      metric: `${(sim.stressWater * 100).toFixed(0)}%`,
      action: 'Priority irrigation sequence A → C → B → D',
      source: 'Twin engine',
    });
  }
  if (sim.stressNutrient > 0.2) {
    items.push({
      id: id(),
      severity: 'medium',
      title: 'Nutrient stress signal',
      detail: `Nutrient stress ${(sim.stressNutrient * 100).toFixed(0)}%. Review N-P-K balance against stage demand.`,
      field: 'Farm-wide',
      category: 'soil',
      age: '45 min ago',
      metric: `${(sim.stressNutrient * 100).toFixed(0)}%`,
      action: `Pull leaf tissue sample from ${fields[0]?.name || 'Field A'}`,
      source: 'Twin engine',
    });
  }

  // ── Per-field alerts (always several each) — uses profile field count ──
  fields.forEach((f, i) => {
    const ages = [`${8 + i * 3} min ago`, `${18 + i * 4} min ago`, `${30 + i * 5} min ago`, `${42 + i * 2} min ago`];

    if (f.soilMoisture < 50) {
      items.push({
        id: id(),
        severity: f.soilMoisture < 42 ? 'critical' : 'high',
        title: `Low soil moisture — ${f.name}`,
        detail: `${f.soilType} at ${f.soilMoisture}%. ${f.variety} vines under water stress; yield and berry size at risk.`,
        field: f.name,
        fieldId: f.id,
        category: 'soil',
        age: ages[0],
        metric: `${f.soilMoisture}%`,
        action: 'Start drip cycle now · verify emitters',
        source: 'Field sensors',
      });
    } else if (f.soilMoisture > moistMax) {
      items.push({
        id: id(),
        severity: 'medium',
        title: `Excess moisture — ${f.name}`,
        detail: `Moisture ${f.soilMoisture}% on ${f.soilType}. Root zone saturation may invite disease.`,
        field: f.name,
        fieldId: f.id,
        category: 'soil',
        age: ages[0],
        metric: `${f.soilMoisture}%`,
        action: 'Skip next irrigation · improve row drainage',
        source: 'Field sensors',
      });
    } else {
      items.push({
        id: id(),
        severity: i % 2 === 0 ? 'info' : 'low',
        title: `Soil moisture stable — ${f.name}`,
        detail: `${f.soilType} holding ${f.soilMoisture}% — within the preferred band for ${f.variety}.`,
        field: f.name,
        fieldId: f.id,
        category: 'soil',
        age: ages[0],
        metric: `${f.soilMoisture}%`,
        action: 'Continue scheduled monitoring',
        source: 'Field sensors',
      });
    }

    if (f.health < 80) {
      items.push({
        id: id(),
        severity: f.health < 72 ? 'high' : 'medium',
        title: `Vine health attention — ${f.name}`,
        detail: `Health index ${f.health}/100 for ${f.variety}. Check nutrition, pests, and recent stress events.`,
        field: f.name,
        fieldId: f.id,
        category: 'crop',
        age: ages[1],
        metric: `${f.health}/100`,
        action: 'Walk block · note chlorosis or mite signs',
        source: 'Digital twin',
      });
    } else {
      items.push({
        id: id(),
        severity: 'info',
        title: `Vine health strong — ${f.name}`,
        detail: `${f.variety} at health ${f.health}/100. Canopy and fruit set indicators look solid.`,
        field: f.name,
        fieldId: f.id,
        category: 'crop',
        age: ages[1],
        metric: `${f.health}/100`,
        action: 'Maintain pruning / training plan',
        source: 'Digital twin',
      });
    }

    const needMm = Math.max(4, +(22 - f.soilMoisture * 0.22 + (f.soilType.toLowerCase().includes('sand') ? 3 : 0)).toFixed(1));
    items.push({
      id: id(),
      severity: needMm > 16 ? 'medium' : 'low',
      title: `Irrigation plan — ${f.name}`,
      detail: `Next cycle estimate ~${needMm} mm for ${f.acres} ac (${f.soilType}). Last irrigation: ${f.lastIrrigation}.`,
      field: f.name,
      fieldId: f.id,
      category: 'irrigation',
      age: ages[2],
      metric: `${needMm} mm`,
      action: f.soilMoisture < 55 ? 'Irrigate within 24 h' : 'Hold to scheduled slot',
      source: 'Irrigation AI',
    });

    const diseaseRisk = Math.max(
      8,
      Math.min(42, Math.round(22 - f.health * 0.12 + (env.humidity - 50) * 0.2 + (f.soilMoisture > 70 ? 6 : 0) + i * 2)),
    );
    items.push({
      id: id(),
      severity: diseaseRisk >= 30 ? 'high' : diseaseRisk >= 22 ? 'medium' : 'low',
      title: `Disease watch — ${f.name}`,
      detail: `Model risk ${diseaseRisk}% for mildew complex on ${f.variety}. Humidity ${env.humidity}% and local moisture drive the score.`,
      field: f.name,
      fieldId: f.id,
      category: 'crop',
      age: ages[3],
      metric: `${diseaseRisk}%`,
      action: diseaseRisk >= 25 ? 'Scout upper canopy tomorrow AM' : 'Routine weekly scouting',
      source: 'Disease model',
    });

    items.push({
      id: id(),
      severity: 'info',
      title: `Sensors online — ${f.name}`,
      detail: `Moisture, health, and yield estimators linked for ${f.plants} plants across ${f.acres} acres.`,
      field: f.name,
      fieldId: f.id,
      category: 'system',
      age: `${50 + i * 6} min ago`,
      metric: 'OK',
      action: 'No maintenance required',
      source: 'IoT gateway',
    });
  });

  for (const a of sim.alerts || []) {
    if (items.some((x) => x.title.toLowerCase().includes(a.title.toLowerCase().slice(0, 14)))) continue;
    items.push({
      id: a.id || id(),
      severity: mapSimSeverity(a.severity),
      title: a.title,
      detail: `Simulation engine flagged this event for ${a.field}. Cross-check with field walk notes.`,
      field: a.field,
      category: 'system',
      age: a.age,
      source: 'Simulation',
      action: 'Open twin timeline for context',
    });
  }


  // Backend twin + ML hydrogel / mulch intelligence
  const gelStorage =
    twin?.hydrogel?.hydrogel_water_storage_pct ??
    mlTel?.predicted_required_hydrogel_storage_pct ??
    env.hydrogelSat;
  const gelRelease = twin?.hydrogel?.hydrogel_release_rate_lhr;
  const mulchDeg = twin?.mulch?.mulch_degradation_pct ?? (100 - (sim.mulchCoverage || 85));
  const mulchCool = twin?.mulch?.effective_mulch_cooling_c;
  const soilMoistTwin = twin?.soil?.soil_moisture_pct ?? env.soilMoisture;

  if (typeof gelStorage === 'number') {
    if (gelStorage < 20) {
      items.push({
        id: id(),
        severity: gelStorage < 12 ? 'critical' : 'high',
        title: `Hydrogel storage low — ${gelStorage.toFixed(0)}%`,
        detail: gelRelease
          ? `Twin hydrogel release ${Number(gelRelease).toFixed(2)} L/hr. Refill / recharge polymers before next heat pulse.`
          : `Required storage from telemetry model is critically low. Align drip cycles with hydrogel recharge.`,
        field: 'Farm-wide',
        category: 'irrigation',
        age: 'Just now',
        metric: `${Number(gelStorage).toFixed(0)}%`,
        action: 'Open Intelligent Hydrogels · schedule recharge',
        source: twin ? 'Digital Twin /api/twin/state' : 'ML /api/ml/telemetry',
      });
    } else if (gelStorage < 35) {
      items.push({
        id: id(),
        severity: 'medium',
        title: `Hydrogel buffer ${gelStorage.toFixed(0)}%`,
        detail: 'Polymer water reserve is thinning. Monitor soil moisture against stage thresholds.',
        field: 'Farm-wide',
        category: 'irrigation',
        age: '4 min ago',
        metric: `${Number(gelStorage).toFixed(0)}%`,
        action: 'Review hydrogel formula & saturation map',
        source: twin ? 'Digital Twin' : 'ML telemetry',
      });
    }
  }

  if (typeof mulchDeg === 'number' && mulchDeg >= 55) {
    items.push({
      id: id(),
      severity: mulchDeg >= 70 ? 'high' : 'medium',
      title: `Mulch degradation ${mulchDeg.toFixed(0)}%`,
      detail: mulchCool != null
        ? `Effective cooling ${Number(mulchCool).toFixed(1)}°C. Replace or reinforce sheet before peak heat.`
        : 'Sensor film wear elevated — soil surface temperature suppression is declining.',
      field: 'Farm-wide',
      category: 'soil',
      age: '6 min ago',
      metric: `${Number(mulchDeg).toFixed(0)}%`,
      action: 'Open Smart Mulching · plan replacement',
      source: twin ? 'Digital Twin mulch model' : 'Simulation mulch coverage',
    });
  }

  if (twin?.intelligence?.soil_health_index) {
    const shi = String(twin.intelligence.soil_health_index);
    if (/poor|critical|low/i.test(shi)) {
      items.push({
        id: id(),
        severity: 'high',
        title: `Soil health index — ${shi}`,
        detail: `Twin substrate intelligence reports ${shi}. Moisture twin ${Number(soilMoistTwin).toFixed(0)}%.`,
        field: 'Farm-wide',
        category: 'soil',
        age: '2 min ago',
        metric: shi,
        action: 'Review Soil panel & fertigation plan',
        source: 'Substrate intelligence',
      });
    }
  }

  items.push({
    id: id(),
    severity: 'info',
    title: `Growth stage: ${sim.stage.replace(/_/g, ' ')}`,
    detail: `Day ${sim.day} · stage progress ${sim.stageProgress}%. Phenology-aligned irrigation and nutrition rules are active.`,
    field: 'Farm-wide',
    category: 'system',
    age: '1 min ago',
    metric: `D${sim.day}`,
    action: 'Review stage checklist in Predictions',
    source: 'Lifecycle engine',
  });

  const order: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  return items.sort((a, b) => order[a.severity] - order[b.severity] || a.field.localeCompare(b.field));
}

export default function AlertsPanel({ sim, fields: fieldsProp }: { sim: SimState; fields?: FieldInfo[] }) {
  const [filterSev, setFilterSev] = useState<'all' | Severity>('all');
  const [filterField, setFilterField] = useState<string>('all');
  const [filterCat, setFilterCat] = useState<'all' | AlertItem['category']>('all');
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [acked, setAcked] = useState<Set<string>>(new Set());

  const fields = fieldsProp?.length ? fieldsProp : FIELDS;
  const farmCtx = useFarmOptional();
  const settingsCtx = useSettingsOptional();
  const thresholds = settingsCtx?.settings;
  const allAlerts = useMemo(
    () =>
      buildRichAlerts(sim, {
        liveWeather: farmCtx?.liveWeather,
        evaluateReport: farmCtx?.evaluateReport,
        twinState: farmCtx?.twinState,
        mlTelemetry: farmCtx?.ml?.telemetry,
        fields,
        thresholds: thresholds
          ? {
              heatAlertC: thresholds.heatAlertC,
              humidityAlert: thresholds.humidityAlert,
              moistureMin: thresholds.moistureMin,
              moistureMax: thresholds.moistureMax,
              diseaseThreshold: thresholds.diseaseThreshold,
              notifyCritical: thresholds.notifyCritical,
              notifyWeather: thresholds.notifyWeather,
              notifyIrrigation: thresholds.notifyIrrigation,
            }
          : undefined,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      sim.env.temperature,
      sim.env.humidity,
      sim.env.rainfall,
      sim.env.soilMoisture,
      sim.env.windSpeed,
      sim.env.nitrogen,
      sim.env.hydrogelSat,
      sim.stressHeat,
      sim.stressWater,
      sim.stressNutrient,
      sim.alerts,
      sim.healthIndex,
      sim.day,
      sim.stage,
      sim.stageProgress,
      farmCtx?.liveWeather,
      farmCtx?.evaluateReport,
      farmCtx?.twinState,
      farmCtx?.ml?.telemetry,
      thresholds?.heatAlertC,
      thresholds?.humidityAlert,
      thresholds?.moistureMin,
      thresholds?.moistureMax,
      thresholds?.diseaseThreshold,
      fields,
    ],
  );

  const visible = useMemo(() => {
    return allAlerts.filter((a) => {
      if (dismissed.has(a.id)) return false;
      if (filterSev !== 'all' && a.severity !== filterSev) return false;
      if (filterField !== 'all') {
        if (filterField === 'farm') {
          if (a.fieldId) return false;
        } else if (a.fieldId !== filterField) return false;
      }
      if (filterCat !== 'all' && a.category !== filterCat) return false;
      return true;
    });
  }, [allAlerts, dismissed, filterSev, filterField, filterCat]);

  const counts = useMemo(() => {
    const base = allAlerts.filter((a) => !dismissed.has(a.id));
    return {
      total: base.length,
      critical: base.filter((a) => a.severity === 'critical').length,
      high: base.filter((a) => a.severity === 'high').length,
      medium: base.filter((a) => a.severity === 'medium').length,
      low: base.filter((a) => a.severity === 'low').length,
      info: base.filter((a) => a.severity === 'info').length,
      open: base.filter((a) => !acked.has(a.id)).length,
    };
  }, [allAlerts, dismissed, acked]);

  const fieldCounts = useMemo(() => {
    const map: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
    for (const a of allAlerts) {
      if (dismissed.has(a.id)) continue;
      if (a.fieldId && map[a.fieldId] !== undefined) map[a.fieldId] += 1;
    }
    return map;
  }, [allAlerts, dismissed]);

  const dismiss = useCallback((id: string) => {
    setDismissed((s) => new Set(s).add(id));
  }, []);

  const acknowledge = useCallback((id: string) => {
    setAcked((s) => new Set(s).add(id));
  }, []);

  const clearFilters = () => {
    setFilterSev('all');
    setFilterField('all');
    setFilterCat('all');
  };

  const panel = 'bg-[#121a27] rounded-xl border border-[#1e2d40]';

  return (
    <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden bg-[#0b131e]">
      <div className="p-3 space-y-3">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-[#1e2d40] bg-[#0f1622] p-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(244,63,94,0.12),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(139,92,246,0.1),transparent_45%)]" />
          <div className="pointer-events-none absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-400/40 to-transparent" />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/30 to-violet-600/20 border border-rose-400/30 shadow-lg shadow-rose-500/20">
                <BellRing className="text-rose-200" size={20} />
                <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white px-1">
                  {counts.open > 99 ? '99+' : counts.open}
                </span>
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-wide text-white">
                  ALERT <span className="bg-gradient-to-r from-rose-300 to-violet-300 bg-clip-text text-transparent">COMMAND</span>
                </h1>
                <p className="text-[10px] text-slate-400">
                  Backend weather + evaluate · twin field sensors · irrigation · system
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Backend-linked monitoring
              </span>
              <span className="rounded-full border border-[#1e2d40] bg-[#0b131e] px-2.5 py-1 text-[10px] text-slate-300 font-semibold">
                {counts.open} open · {counts.total} total
              </span>
            </div>
          </div>

          <div className="relative mt-4 grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { l: 'Total', v: counts.total, c: 'text-white', accent: 'border-slate-500/30', sev: 'all' as const },
              { l: 'Critical', v: counts.critical, c: 'text-rose-300', accent: 'border-rose-500/40', sev: 'critical' as const },
              { l: 'High', v: counts.high, c: 'text-orange-300', accent: 'border-orange-500/40', sev: 'high' as const },
              { l: 'Medium', v: counts.medium, c: 'text-amber-300', accent: 'border-amber-500/35', sev: 'medium' as const },
              { l: 'Low', v: counts.low, c: 'text-sky-300', accent: 'border-sky-500/35', sev: 'low' as const },
              { l: 'Info', v: counts.info, c: 'text-violet-300', accent: 'border-violet-500/35', sev: 'info' as const },
            ].map((k) => (
              <button
                key={k.l}
                type="button"
                onClick={() => setFilterSev(k.sev)}
                className={`rounded-xl border ${k.accent} bg-[#0b131e]/70 backdrop-blur px-2.5 py-2.5 text-left hover:bg-[#121a27] transition`}
              >
                <div className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">{k.l}</div>
                <div className={`text-xl font-bold tabular-nums leading-none mt-0.5 ${k.c}`}>{k.v}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className={`${panel} p-2.5 space-y-2`}>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1 mr-1">
              <Filter size={11} /> Severity
            </span>
            {(['all', 'critical', 'high', 'medium', 'low', 'info'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setFilterSev(s)}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                  filterSev === s
                    ? 'bg-violet-600/35 border-violet-400/50 text-violet-100'
                    : 'border-[#1e2d40] text-slate-400 hover:border-slate-500'
                }`}
              >
                {s === 'all' ? 'All' : SEV_META[s].label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1 mr-1">
              <MapPin size={11} /> Field
            </span>
            <button
              type="button"
              onClick={() => setFilterField('all')}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                filterField === 'all'
                  ? 'bg-emerald-600/25 border-emerald-400/45 text-emerald-100'
                  : 'border-[#1e2d40] text-slate-400 hover:border-slate-500'
              }`}
            >
              All fields
            </button>
            <button
              type="button"
              onClick={() => setFilterField('farm')}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                filterField === 'farm'
                  ? 'bg-emerald-600/25 border-emerald-400/45 text-emerald-100'
                  : 'border-[#1e2d40] text-slate-400 hover:border-slate-500'
              }`}
            >
              Farm-wide
            </button>
            {fields.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilterField(f.id)}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                  filterField === f.id
                    ? 'bg-emerald-600/25 border-emerald-400/45 text-emerald-100'
                    : 'border-[#1e2d40] text-slate-400 hover:border-slate-500'
                }`}
              >
                {f.name}
                <span className="ml-1 text-[9px] opacity-70">({fieldCounts[f.id] || 0})</span>
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-500 font-bold uppercase flex items-center gap-1 mr-1">
              <Radio size={11} /> Type
            </span>
            {(['all', 'weather', 'soil', 'crop', 'irrigation', 'system'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFilterCat(c)}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                  filterCat === c
                    ? 'bg-sky-600/25 border-sky-400/45 text-sky-100'
                    : 'border-[#1e2d40] text-slate-400 hover:border-slate-500'
                }`}
              >
                {c === 'all' ? 'All types' : CAT_META[c].label}
              </button>
            ))}
            {(filterSev !== 'all' || filterField !== 'all' || filterCat !== 'all') && (
              <button
                type="button"
                onClick={clearFilters}
                className="ml-auto text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Env pulse */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { icon: <Thermometer size={14} className="text-orange-400" />, l: 'Temp', v: `${sim.env.temperature}°C` },
            { icon: <Droplets size={14} className="text-cyan-400" />, l: 'Humidity', v: `${sim.env.humidity}%` },
            { icon: <CloudRain size={14} className="text-sky-400" />, l: 'Rain', v: `${sim.env.rainfall.toFixed(1)} mm` },
            { icon: <Wind size={14} className="text-slate-300" />, l: 'Wind', v: `${sim.env.windSpeed ?? 18} km/h` },
            { icon: <FlaskConical size={14} className="text-lime-400" />, l: 'Soil moist.', v: `${Number(sim.env.soilMoisture).toFixed(1)}%` },
            { icon: <Sun size={14} className="text-yellow-400" />, l: 'Sunlight', v: `${Math.round(sim.env.sunlight)}` },
          ].map((m) => (
            <div key={m.l} className={`${panel} px-2.5 py-2 flex items-center gap-2 bg-gradient-to-br from-[#141c2a] to-[#121a27]`}>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0b131e] border border-[#1e2d40]">
                {m.icon}
              </div>
              <div>
                <div className="text-[8px] uppercase text-slate-500 font-bold tracking-wide">{m.l}</div>
                <div className="text-[12px] font-bold text-white leading-tight">{m.v}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Alert feed */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-0.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
              Alert feed · {visible.length} shown
            </div>
          </div>

          {visible.length === 0 && (
            <div className={`${panel} p-10 text-center`}>
              <CheckCircle2 className="mx-auto text-emerald-400 mb-2" size={36} />
              <div className="text-sm font-bold text-white">No alerts in this filter</div>
              <div className="text-[11px] text-slate-500 mt-1 mb-3">Try clearing filters to see the full farm feed.</div>
              <button
                type="button"
                onClick={clearFilters}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500"
              >
                Clear filters
              </button>
            </div>
          )}

          {visible.map((a) => {
            const meta = SEV_META[a.severity];
            const Icon = meta.icon;
            const cat = CAT_META[a.category];
            const CatIcon = cat.icon;
            const isOpen = expanded === a.id;
            const isAck = acked.has(a.id);

            return (
              <div
                key={a.id}
                className={`relative overflow-hidden rounded-2xl border ${meta.border} ${meta.glow} transition-all ${
                  isAck ? 'opacity-65' : ''
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-r ${meta.soft}`} />
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${meta.bar}`} />
                <div className="relative p-3.5 pl-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${meta.border} bg-[#0b131e]/90`}
                    >
                      <Icon size={18} className={meta.color} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md border ${meta.bg} ${meta.color} ${meta.border}`}
                        >
                          {meta.label}
                        </span>
                        <span className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${cat.chip}`}>
                          <CatIcon size={10} /> {cat.label}
                        </span>
                        {a.metric && (
                          <span className="text-[9px] font-bold text-white bg-[#0b131e] border border-[#2a3a52] rounded-md px-1.5 py-0.5">
                            {a.metric}
                          </span>
                        )}
                        {isAck && (
                          <span className="text-[9px] text-emerald-400 flex items-center gap-0.5 font-semibold">
                            <CheckCircle2 size={10} /> Acked
                          </span>
                        )}
                      </div>
                      <div className="text-[13px] font-semibold text-white leading-snug">{a.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={10} className="text-violet-400" /> {a.field}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={10} /> {a.age}
                        </span>
                        <span className="text-slate-500">via {a.source}</span>
                      </div>

                      <div className={`mt-2 text-[11px] text-slate-300 leading-relaxed ${isOpen ? '' : 'line-clamp-2'}`}>
                        {a.detail}
                      </div>

                      {isOpen && a.action && (
                        <div className="mt-2.5 rounded-xl border border-violet-500/30 bg-violet-500/10 px-3 py-2 text-[10px]">
                          <div className="flex items-center gap-1 text-violet-200 font-bold mb-0.5">
                            <Zap size={12} /> Recommended action
                          </div>
                          <div className="text-slate-200">{a.action}</div>
                        </div>
                      )}

                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : a.id)}
                          className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-[#2a3a52] bg-[#0b131e]/50 text-slate-200 hover:border-slate-400 inline-flex items-center gap-1"
                        >
                          <Eye size={11} /> {isOpen ? 'Less' : 'Details'}
                        </button>
                        {!isAck && (
                          <button
                            type="button"
                            onClick={() => acknowledge(a.id)}
                            className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-emerald-500/35 text-emerald-200 bg-emerald-500/15 hover:bg-emerald-500/25 inline-flex items-center gap-1"
                          >
                            <CheckCircle2 size={11} /> Acknowledge
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => dismiss(a.id)}
                          className="text-[10px] font-semibold px-2.5 py-1 rounded-lg border border-[#1e2d40] text-slate-500 hover:text-rose-300 hover:border-rose-500/35 inline-flex items-center gap-1"
                        >
                          <X size={11} /> Dismiss
                        </button>
                        {a.fieldId && (
                          <button
                            type="button"
                            onClick={() => setFilterField(a.fieldId!)}
                            className="ml-auto text-[9px] text-slate-400 hover:text-violet-300 inline-flex items-center gap-0.5"
                          >
                            Focus field <ChevronRight size={10} /> {a.fieldId}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Field risk matrix */}
        <div className={`${panel} p-3`}>
          <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
            <Layers size={13} className="text-violet-400" /> Field risk snapshot
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {fields.map((f) => {
              const related = allAlerts.filter((a) => a.fieldId === f.id && !dismissed.has(a.id));
              const worst =
                related.find((a) => a.severity === 'critical' || a.severity === 'high' || a.severity === 'medium')
                  ?.severity ??
                related[0]?.severity ??
                'info';
              const meta = SEV_META[worst];
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilterField(filterField === f.id ? 'all' : f.id)}
                  className={`text-left rounded-2xl border p-3.5 transition hover:scale-[1.015] ${meta.border} bg-gradient-to-br ${meta.soft} from-[#121a27]`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-bold text-white">{f.name}</span>
                    <span className={`text-[10px] font-bold ${meta.color}`}>{related.length} alerts</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mb-2.5">{f.variety} · {f.soilType}</div>
                  <div className="flex flex-wrap gap-1.5 text-[9px]">
                    <span className="rounded-md bg-[#0b131e]/90 border border-[#1e2d40] px-1.5 py-0.5 text-slate-200">
                      Health {f.health}
                    </span>
                    <span className="rounded-md bg-[#0b131e]/90 border border-[#1e2d40] px-1.5 py-0.5 text-slate-200">
                      SM {f.soilMoisture}%
                    </span>
                    <span className="rounded-md bg-[#0b131e]/90 border border-[#1e2d40] px-1.5 py-0.5 text-slate-200">
                      {f.acres} ac
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-[9px] text-slate-500 flex flex-wrap items-center gap-2 px-1 pb-3">
          <Info size={11} />
          Feed covers weather, soil, crop disease, irrigation, nutrients, hydrogel, and system status for every field — updating with the twin.
          <span className="ml-auto inline-flex items-center gap-1 text-slate-400">
            <Cloud size={10} /> Twin-synced
          </span>
        </div>
      </div>
    </div>
  );
}
