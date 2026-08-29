import { useMemo, useState, useEffect } from 'react';
import {
  FileText, Download, CloudRain, Layers, Leaf, Beaker, Box,
  BrainCircuit, BarChart2, AlertTriangle, Activity, CheckCircle2,
  Thermometer, Droplets, Wind, Sun, TrendingUp, DollarSign,
  MapPin, Calendar, Sparkles, Shield, Gauge, Sprout, Server, RefreshCw,
} from 'lucide-react';
import type { SimState, FieldInfo } from './simulation';
import { FIELDS, STAGE_RANGES } from './simulation';
import {
  generateSeasonAnalytics,
  computeFieldConstraints,
  SEASONS,
} from './marketData';
import { useFarmOptional } from './context/FarmContext';
import { fetchMarketSpot } from './api/market';

function formatInr(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function scoreLabel(s: number): { text: string; color: string } {
  if (s >= 85) return { text: 'Excellent', color: 'text-emerald-300' };
  if (s >= 70) return { text: 'Good', color: 'text-sky-300' };
  if (s >= 55) return { text: 'Fair', color: 'text-amber-300' };
  return { text: 'Attention', color: 'text-rose-300' };
}

export default function ReportsPanel({ sim, fields: fieldsProp }: { sim: SimState; fields?: FieldInfo[] }) {
  const fields = fieldsProp?.length ? fieldsProp : FIELDS;
  const [season] = useState(SEASONS[1] || 'Rabi 2024-25');
  const farmCtx = useFarmOptional();
  const [marketModal, setMarketModal] = useState<number | null>(null);
  const [marketSource, setMarketSource] = useState<string>('');
  const farmAcres = fields.reduce((s, f) => s + f.acres, 0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const city = farmCtx?.farm.city || 'Nashik';
        const spot = await fetchMarketSpot('GRAPE', 'Maharashtra', city);
        if (!cancelled) {
          setMarketModal(spot.modal_price_per_qtl);
          setMarketSource(spot.is_live ? 'Live Agmarknet' : spot.source || 'Backend baseline');
        }
      } catch {
        if (!cancelled) {
          setMarketModal(null);
          setMarketSource('unavailable');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [farmCtx?.farm.city]);

  const report = useMemo(() => {
    const env = sim.env;
    const stageMeta = STAGE_RANGES.find((s) => s.id === sim.stage) || STAGE_RANGES[0];

    const fieldRows = fields.map((f) => {
      const healthIndex = Math.round(f.health * 0.55 + sim.healthIndex * 0.45);
      const constraints = computeFieldConstraints({
        temperature: env.temperature,
        humidity: env.humidity,
        rainfall: env.rainfall,
        sunlight: env.sunlight,
        windSpeed: env.windSpeed,
        soilMoisture: f.soilMoisture,
        soilType: f.soilType,
        stressHeat: sim.stressHeat,
        stressWater: sim.stressWater,
        stressNutrient: sim.stressNutrient,
        hydrogelSat: env.hydrogelSat,
        mulchCoverage: sim.mulchCoverage,
      });
      const a = generateSeasonAnalytics({
        season,
        crop: `Grape (${f.variety})`,
        state: 'Maharashtra',
        city: 'Pune',
        acres: f.acres,
        healthIndex,
        env: {
          temperature: env.temperature,
          humidity: env.humidity,
          rainfall: env.rainfall,
          sunlight: env.sunlight,
          windSpeed: env.windSpeed,
          soilMoisture: f.soilMoisture,
          soilType: f.soilType,
          stressHeat: sim.stressHeat,
          stressWater: sim.stressWater,
          stressNutrient: sim.stressNutrient,
          hydrogelSat: env.hydrogelSat,
          mulchCoverage: sim.mulchCoverage,
        },
      });
      return {
        ...f,
        constraints,
        yieldTons: a.totalYield,
        revenue: a.revenue,
        profit: a.profit,
        margin: a.margin,
        yearProfit: a.yearProfit,
        yearRevenue: a.yearRevenue,
      };
    });

    const totalYield = +fieldRows.reduce((s, f) => s + f.yieldTons, 0).toFixed(2);
    const totalRevenue = fieldRows.reduce((s, f) => s + f.revenue, 0);
    const totalProfit = fieldRows.reduce((s, f) => s + f.profit, 0);
    const yearRevenue = fieldRows.reduce((s, f) => s + f.yearRevenue, 0);
    const yearProfit = fieldRows.reduce((s, f) => s + f.yearProfit, 0);
    const margin = totalRevenue > 0 ? +((totalProfit / totalRevenue) * 100).toFixed(1) : 0;
    const hectares = farmAcres * 0.404686;

    // Module scores 0–100
    const weatherScore = Math.min(
      100,
      Math.max(
        20,
        Math.round(
          70 +
            (env.temperature >= 24 && env.temperature <= 32 ? 12 : -10) +
            (env.humidity >= 45 && env.humidity <= 75 ? 8 : -8) +
            (env.rainfall < 15 ? 5 : -8) +
            (1 - sim.stressHeat) * 10,
        ),
      ),
    );
    const soilScore = Math.min(
      100,
      Math.round(
        50 +
          (env.soilMoisture >= 50 && env.soilMoisture <= 70 ? 20 : 5) +
          env.nitrogen * 0.15 +
          env.phosphorus * 0.08 +
          env.potassium * 0.08,
      ),
    );
    const hydrogelScore = Math.min(100, Math.round(env.hydrogelSat * 0.9 + 10));
    const mulchScore = Math.min(100, Math.round(sim.mulchCoverage * 0.85 + 12));
    const cropScore = Math.min(100, Math.round(sim.healthIndex * 0.7 + sim.growthRate * 25));
    const predictScore = Math.min(98, Math.round(88 + sim.healthIndex * 0.05));
    const analyticsScore = Math.min(100, Math.round(sim.healthIndex * 0.45 + margin * 0.4 + 10));
    const alertPressure = Math.round(
      (sim.stressHeat + sim.stressWater + sim.stressNutrient) * 40 +
        (env.temperature >= 34 ? 15 : 0) +
        (env.humidity >= 80 ? 10 : 0),
    );
    const alertScore = Math.max(20, 100 - alertPressure);

    const overall = Math.round(
      (weatherScore + soilScore + hydrogelScore + mulchScore + cropScore + predictScore + analyticsScore + alertScore) /
        8,
    );

    // Conclusions per module
    const conclusions = [
      {
        id: 'weather',
        title: 'Weather Intelligence',
        icon: CloudRain,
        score: weatherScore,
        color: 'text-sky-300',
        border: 'border-sky-500/30',
        summary:
          env.temperature >= 34
            ? `Heat stress active at ${env.temperature}°C. Prioritize canopy cooling and afternoon irrigation.`
            : env.humidity >= 80
              ? `High humidity (${env.humidity}%) opens a disease window — tighten scouting.`
              : `Conditions are manageable at ${env.temperature}°C / ${env.humidity}% RH / ${env.rainfall.toFixed(1)} mm rain.`,
        points: [
          `Temperature ${env.temperature}°C · Humidity ${env.humidity}%`,
          `Rainfall ${env.rainfall.toFixed(1)} mm · Wind ${env.windSpeed ?? 18} km/h`,
          `Sunlight ${Math.round(env.sunlight)} W/m² · Mode ${sim.weather}`,
        ],
      },
      {
        id: 'soil',
        title: 'Intelligent Soil',
        icon: Layers,
        score: soilScore,
        color: 'text-lime-300',
        border: 'border-lime-500/30',
        summary:
          env.soilMoisture < 50
            ? `Soil moisture ${env.soilMoisture.toFixed(0)}% is below target — irrigation is the top priority.`
            : `Root-zone moisture ${env.soilMoisture.toFixed(1)}% with N ${Math.round(env.nitrogen)} / P ${Math.round(env.phosphorus)} / K ${Math.round(env.potassium)}.`,
        points: [
          `pH ${env.soilPh} · Moisture ${env.soilMoisture.toFixed(1)}%`,
          `NPK ${Math.round(env.nitrogen)}/${Math.round(env.phosphorus)}/${Math.round(env.potassium)}`,
          ...fields.map((f) => `${f.name}: ${f.soilType} · SM ${f.soilMoisture}%`),
        ],
      },
      {
        id: 'lifecycle',
        title: 'Grape Lifecycle',
        icon: Leaf,
        score: Math.min(100, Math.round(40 + sim.stageProgress * 0.4 + sim.healthIndex * 0.2)),
        color: 'text-emerald-300',
        border: 'border-emerald-500/30',
        summary: `Phenology at ${stageMeta.label} (day ${sim.day}, ${sim.stageProgress}% through stage). Align irrigation and nutrition to this phase.`,
        points: [
          `Stage: ${stageMeta.emoji} ${stageMeta.label}`,
          `Plant height ~${sim.plantHeightCm} cm · Canopy ${sim.canopySpreadM} m`,
          `Berry size ${sim.berrySizeMm} mm · Growth rate ${(sim.growthRate * 100).toFixed(0)}%`,
        ],
      },
      {
        id: 'hydrogel',
        title: 'Intelligent Hydrogels',
        icon: Beaker,
        score: hydrogelScore,
        color: 'text-cyan-300',
        border: 'border-cyan-500/30',
        summary:
          env.hydrogelSat < 50
            ? `Hydrogel buffer low (${Math.round(env.hydrogelSat)}%) — recharge with a longer pulse.`
            : `Hydrogel saturation ${Math.round(env.hydrogelSat)}% is supporting water efficiency at ${sim.hydrogelEfficiency}%.`,
        points: [
          `Saturation ${Math.round(env.hydrogelSat)}%`,
          `Efficiency ${sim.hydrogelEfficiency}%`,
          sim.irrigationNeed ? 'Irrigation currently flagged as needed' : 'Irrigation demand currently stable',
        ],
      },
      {
        id: 'mulching',
        title: 'Smart Mulching',
        icon: Box,
        score: mulchScore,
        color: 'text-amber-300',
        border: 'border-amber-500/30',
        summary: `Mulch coverage ${sim.mulchCoverage}% is ${sim.mulchCoverage >= 70 ? 'supporting' : 'limiting'} moisture retention and weed suppression.`,
        points: [
          `Coverage ${sim.mulchCoverage}%`,
          `Synergy with hydrogel: ${env.hydrogelSat >= 60 && sim.mulchCoverage >= 60 ? 'Strong' : 'Moderate'}`,
          'Maintain film integrity on sandy blocks (A/C)',
        ],
      },
      {
        id: 'predictions',
        title: 'AI Predictions',
        icon: BrainCircuit,
        score: predictScore,
        color: 'text-violet-300',
        border: 'border-violet-500/30',
        summary: `Yield trajectory ~${sim.yieldTons.toFixed(2)} t/ac farm signal with model confidence ~${predictScore}%. Field-level spread depends on health and soil moisture.`,
        points: fieldRows.map(
          (f) => `${f.name}: ${f.yieldTons} t · health ${f.health} · env ×${f.constraints.yieldFactor.toFixed(2)}`,
        ),
      },
      {
        id: 'analytics',
        title: 'Analytics & Economics',
        icon: BarChart2,
        score: analyticsScore,
        color: 'text-fuchsia-300',
        border: 'border-fuchsia-500/30',
        summary: `Season revenue ${formatInr(totalRevenue)} · profit ${formatInr(totalProfit)} (${margin}% margin). Year profit forecast ${formatInr(yearProfit)}.`,
        points: [
          `Farm yield ${totalYield} t across ${farmAcres.toFixed(2)} ac (${hectares.toFixed(2)} ha)`,
          `Revenue ${formatInr(totalRevenue)} · ${formatInr(Math.round(totalRevenue / hectares))}/ha`,
          `Profit ${formatInr(totalProfit)} · ${formatInr(Math.round(totalProfit / hectares))}/ha`,
          `Year forecast revenue ${formatInr(yearRevenue)} · profit ${formatInr(yearProfit)}`,
        ],
      },
      {
        id: 'alerts',
        title: 'Alert Command',
        icon: AlertTriangle,
        score: alertScore,
        color: 'text-rose-300',
        border: 'border-rose-500/30',
        summary:
          alertScore >= 80
            ? 'Risk posture is calm. Continue scheduled monitoring across weather, soil, and disease models.'
            : 'Elevated stress or weather risk is present — review Alert Command for field-priority actions.',
        points: [
          `Heat stress ${(sim.stressHeat * 100).toFixed(0)}% · Water ${(sim.stressWater * 100).toFixed(0)}% · Nutrient ${(sim.stressNutrient * 100).toFixed(0)}%`,
          `Engine alerts: ${sim.alerts?.length || 0} active`,
          ...fields.map((f) => `${f.name}: health ${f.health} · SM ${f.soilMoisture}%`),
        ],
      },
    ];

    // Executive conclusion bullets
    const executive: string[] = [];
    if (overall >= 80) {
      executive.push('Overall farm system health is strong; maintain current irrigation and nutrition recipes.');
    } else if (overall >= 65) {
      executive.push('Farm is performing adequately with selective stress — prioritize the lowest-scoring modules below.');
    } else {
      executive.push('Multiple systems need attention; treat irrigation, heat, and soil moisture as first-order actions.');
    }
    const weakest = [...conclusions].sort((a, b) => a.score - b.score)[0];
    const strongest = [...conclusions].sort((a, b) => b.score - a.score)[0];
    executive.push(`Strongest module: ${strongest.title} (${strongest.score}/100).`);
    executive.push(`Weakest module: ${weakest.title} (${weakest.score}/100) — focus resources here.`);
    executive.push(
      `Economics: season profit ${formatInr(totalProfit)} on ${totalYield} t; year profit outlook ${formatInr(yearProfit)}.`,
    );
    const bestField = [...fieldRows].sort((a, b) => b.profit - a.profit)[0];
    executive.push(
      `Top field by profit: ${bestField.name} (${bestField.variety}) — ${formatInr(bestField.profit)} at ${bestField.margin}% margin.`,
    );
    if (sim.irrigationNeed || env.soilMoisture < 52) {
      executive.push('Irrigation is a near-term priority based on twin demand and/or soil moisture.');
    }
    if (env.humidity >= 75 || env.temperature >= 34) {
      executive.push('Weather-linked disease or heat risk is elevated — align scouting and canopy measures this week.');
    }

    return {
      overall,
      conclusions,
      executive,
      fieldRows,
      totalYield,
      totalRevenue,
      totalProfit,
      yearProfit,
      yearRevenue,
      margin,
      hectares,
      stageMeta,
      weatherScore,
      soilScore,
      strongest,
      weakest,
    };
  }, [sim, season, farmAcres, fields]);

  const overallMeta = scoreLabel(report.overall);
  const panel = 'bg-[#121a27] rounded-xl border border-[#1e2d40]';
  const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

  function downloadFullReport() {
    const lines: string[] = [
      'APOLLO AGRIVERSE — OVERALL FARM REPORT',
      `Generated: ${stamp}`,
      `Season: ${season}`,
      `Overall score: ${report.overall}/100 (${overallMeta.text})`,
      '',
      '=== EXECUTIVE CONCLUSION ===',
      ...report.executive.map((e, i) => `${i + 1}. ${e}`),
      '',
      '=== MODULE SCORES ===',
      ...report.conclusions.map((c) => `${c.title}: ${c.score}/100 — ${c.summary}`),
      '',
      '=== FIELD ECONOMICS ===',
      'Field,Variety,Acres,Yield_t,Revenue,Profit,Margin%',
      ...report.fieldRows.map(
        (f) => `${f.name},${f.variety},${f.acres},${f.yieldTons},${f.revenue},${f.profit},${f.margin}`,
      ),
      `TOTAL,,${farmAcres.toFixed(2)},${report.totalYield},${report.totalRevenue},${report.totalProfit},${report.margin}`,
      '',
      '=== ENVIRONMENT ===',
      `Temp ${sim.env.temperature}°C · RH ${sim.env.humidity}% · Rain ${sim.env.rainfall} mm`,
      `Soil moisture ${sim.env.soilMoisture}% · NPK ${Math.round(sim.env.nitrogen)}/${Math.round(sim.env.phosphorus)}/${Math.round(sim.env.potassium)}`,
      `Stage ${sim.stage} day ${sim.day} · Health ${sim.healthIndex}`,
      '',
      '--- End of report ---',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agriverse-overall-report-${season.replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden bg-[#0b131e]">
      <div className="p-3 space-y-3">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl border border-[#1e2d40] bg-[#0f1622] p-4">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(139,92,246,0.14),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(16,185,129,0.1),transparent_45%)]" />
          <div className="relative flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-emerald-500/20 border border-violet-400/30">
                <FileText className="text-violet-200" size={20} />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-wide text-white">
                  OVERALL <span className="bg-gradient-to-r from-violet-300 to-emerald-300 bg-clip-text text-transparent">FARM REPORT</span>
                </h1>
                <p className="text-[10px] text-slate-400">
                  Conclusion across Digital Twin · Weather · Soil · Lifecycle · Hydrogel · Mulching · Predictions · Analytics · Alerts
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Calendar size={12} /> {season}
              </span>
              <button
                type="button"
                onClick={downloadFullReport}
                className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white flex items-center gap-1.5"
              >
                <Download size={13} /> Export report
              </button>
            </div>
          </div>

          {/* Backend live snapshot */}
          <div className="relative mt-4 rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-300 uppercase tracking-wide">
                <Server size={14} /> Backend snapshot
              </div>
              {farmCtx && (
                <button
                  type="button"
                  onClick={() => void farmCtx.refreshAll()}
                  className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-emerald-500/40 text-emerald-200"
                >
                  <RefreshCw size={10} className={farmCtx.evaluateLoading || farmCtx.weatherLoading ? 'animate-spin' : ''} />
                  Refresh APIs
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
              <div className="bg-[#0b131e] rounded-lg border border-[#1e2d40] p-2">
                <div className="text-[9px] text-slate-500">Weather</div>
                <div className="text-white font-semibold">
                  {farmCtx?.liveWeather
                    ? `${farmCtx.liveWeather.city} · ${farmCtx.liveWeather.temperature}°C · ${farmCtx.liveWeather.humidity}%`
                    : '—'}
                </div>
                <div className="text-[9px] text-slate-500">
                  {farmCtx?.liveWeather?.isBackend ? 'GET /weather' : farmCtx?.liveWeather ? 'fallback' : 'pending'}
                </div>
              </div>
              <div className="bg-[#0b131e] rounded-lg border border-[#1e2d40] p-2">
                <div className="text-[9px] text-slate-500">Suitability (evaluate)</div>
                <div className="text-white font-semibold">
                  {farmCtx?.evaluateReport?.focus_crop_assessment
                    ? `${farmCtx.evaluateReport.focus_crop_assessment.crop_name} · ${Number(farmCtx.evaluateReport.focus_crop_assessment.final_suitability_score).toFixed(1)}%`
                    : farmCtx?.evaluateError
                      ? 'Error'
                      : '—'}
                </div>
                <div className="text-[9px] text-slate-500">
                  {farmCtx?.evaluateReport?.location?.district || 'POST /api/evaluate'}
                </div>
              </div>
              <div className="bg-[#0b131e] rounded-lg border border-[#1e2d40] p-2">
                <div className="text-[9px] text-slate-500">Soil profile</div>
                <div className="text-white font-semibold truncate">
                  {farmCtx?.evaluateReport?.soil_profile
                    ? `${farmCtx.evaluateReport.soil_profile.type} · pH ${farmCtx.evaluateReport.soil_profile.ph ?? '—'}`
                    : '—'}
                </div>
                <div className="text-[9px] text-slate-500">
                  N {farmCtx?.evaluateReport?.soil_profile?.n ?? '—'} · moisture {farmCtx?.evaluateReport?.soil_profile?.moisture_pct ?? '—'}%
                </div>
              </div>
              <div className="bg-[#0b131e] rounded-lg border border-[#1e2d40] p-2">
                <div className="text-[9px] text-slate-500">Market (GRAPE)</div>
                <div className="text-white font-semibold">
                  {marketModal != null ? `₹${marketModal}/qtl` : '—'}
                </div>
                <div className="text-[9px] text-slate-500">{marketSource || 'GET /api/market/spot'}</div>
              </div>
            </div>
          </div>

          {/* Overall score + KPIs */}
          <div className="relative mt-4 grid grid-cols-1 lg:grid-cols-12 gap-3">
            <div className="lg:col-span-3 rounded-2xl border border-violet-500/30 bg-[#0b131e]/80 p-4 flex flex-col items-center justify-center">
              <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mb-1">Overall score</div>
              <div className="relative w-28 h-28">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="#1e2d40" strokeWidth="8" fill="none" />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="url(#repGrad)"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - report.overall / 100)}
                  />
                  <defs>
                    <linearGradient id="repGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#a78bfa" />
                      <stop offset="100%" stopColor="#34d399" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-white leading-none">{report.overall}</span>
                  <span className="text-[9px] text-slate-500">/100</span>
                </div>
              </div>
              <div className={`mt-1 text-sm font-bold ${overallMeta.color}`}>{overallMeta.text}</div>
            </div>

            <div className="lg:col-span-9 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
              {[
                { icon: <Leaf size={14} className="text-emerald-400" />, l: 'Health', v: `${sim.healthIndex}` },
                { icon: <Sprout size={14} className="text-lime-400" />, l: 'Stage', v: report.stageMeta.label.split(' ')[0] },
                { icon: <TrendingUp size={14} className="text-violet-400" />, l: 'Yield', v: `${report.totalYield} t` },
                { icon: <DollarSign size={14} className="text-emerald-300" />, l: 'Revenue', v: formatInr(report.totalRevenue) },
                { icon: <BarChart2 size={14} className="text-amber-300" />, l: 'Profit', v: formatInr(report.totalProfit) },
                { icon: <Gauge size={14} className="text-fuchsia-300" />, l: 'Margin', v: `${report.margin}%` },
                { icon: <Thermometer size={14} className="text-orange-400" />, l: 'Temp', v: `${sim.env.temperature}°C` },
                { icon: <Droplets size={14} className="text-cyan-400" />, l: 'Soil SM', v: `${Number(sim.env.soilMoisture).toFixed(0)}%` },
                { icon: <Beaker size={14} className="text-sky-300" />, l: 'Hydrogel', v: `${Math.round(sim.env.hydrogelSat)}%` },
                { icon: <Shield size={14} className="text-rose-300" />, l: 'Alert score', v: `${report.conclusions.find((c) => c.id === 'alerts')?.score ?? '—'}` },
              ].map((k) => (
                <div key={k.l} className="rounded-xl border border-[#1e2d40] bg-[#0b131e]/70 px-2.5 py-2">
                  <div className="flex items-center gap-1 text-[9px] text-slate-500 font-semibold uppercase">
                    {k.icon} {k.l}
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5 truncate">{k.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Executive conclusion */}
        <div className={`${panel} p-4 border-violet-500/20`}>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-violet-300" />
            <h2 className="text-xs font-bold text-white tracking-wide uppercase">Executive conclusion</h2>
          </div>
          <ul className="space-y-2">
            {report.executive.map((e, i) => (
              <li key={i} className="flex gap-2 text-[12px] text-slate-200 leading-relaxed">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>{e}</span>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
            <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-200">
              Strongest: {report.strongest.title} ({report.strongest.score})
            </span>
            <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-200">
              Focus: {report.weakest.title} ({report.weakest.score})
            </span>
            <span className="rounded-lg border border-[#1e2d40] bg-[#0b131e] px-2 py-1 text-slate-400">
              Year profit outlook {formatInr(report.yearProfit)}
            </span>
          </div>
        </div>

        {/* Module conclusions grid */}
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2 px-0.5">
            Module conclusions · all panels
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
            {report.conclusions.map((c) => {
              const Icon = c.icon;
              const lab = scoreLabel(c.score);
              return (
                <div key={c.id} className={`${panel} p-3 border ${c.border} bg-gradient-to-br from-[#141c2a] to-[#121a27]`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0b131e] border border-[#1e2d40]">
                        <Icon size={15} className={c.color} />
                      </div>
                      <div>
                        <div className="text-[11px] font-bold text-white leading-tight">{c.title}</div>
                        <div className={`text-[9px] font-semibold ${lab.color}`}>{lab.text}</div>
                      </div>
                    </div>
                    <div className={`text-lg font-bold tabular-nums ${c.color}`}>{c.score}</div>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed mb-2">{c.summary}</p>
                  <ul className="space-y-1">
                    {c.points.slice(0, 4).map((p) => (
                      <li key={p} className="text-[9px] text-slate-500 flex gap-1.5">
                        <span className="text-slate-600">•</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 h-1.5 rounded-full bg-[#0b131e] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400"
                      style={{ width: `${c.score}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Field summary table */}
        <div className={`${panel} p-3 overflow-x-auto`}>
          <div className="text-[10px] font-bold text-slate-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <MapPin size={12} className="text-violet-400" /> Field-level conclusion
          </div>
          <table className="w-full text-[10px] min-w-[560px]">
            <thead>
              <tr className="text-slate-500 border-b border-[#1e2d40]">
                <th className="text-left py-1.5">Field</th>
                <th className="text-left py-1.5">Variety</th>
                <th className="text-right py-1.5">Health</th>
                <th className="text-right py-1.5">SM%</th>
                <th className="text-right py-1.5">Yield</th>
                <th className="text-right py-1.5">Revenue</th>
                <th className="text-right py-1.5">Profit</th>
                <th className="text-right py-1.5">Env ×</th>
              </tr>
            </thead>
            <tbody>
              {report.fieldRows.map((f) => (
                <tr key={f.id} className="border-b border-[#1e2d40]/40">
                  <td className="py-1.5 text-white font-medium">{f.name}</td>
                  <td className="text-slate-400">{f.variety}</td>
                  <td className="text-right text-slate-200">{f.health}</td>
                  <td className="text-right text-slate-200">{f.soilMoisture}</td>
                  <td className="text-right text-violet-200 font-semibold">{f.yieldTons} t</td>
                  <td className="text-right text-slate-300">{formatInr(f.revenue)}</td>
                  <td className="text-right text-emerald-300 font-semibold">{formatInr(f.profit)}</td>
                  <td className="text-right text-slate-400">{f.constraints.yieldFactor.toFixed(2)}</td>
                </tr>
              ))}
              <tr className="font-semibold border-t border-[#1e2d40]">
                <td className="py-1.5 text-slate-300" colSpan={4}>Farm total</td>
                <td className="text-right text-violet-200">{report.totalYield} t</td>
                <td className="text-right text-slate-300">{formatInr(report.totalRevenue)}</td>
                <td className="text-right text-emerald-300">{formatInr(report.totalProfit)}</td>
                <td className="text-right text-slate-500">—</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Env snapshot */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { icon: <Thermometer size={14} className="text-orange-400" />, l: 'Temperature', v: `${sim.env.temperature}°C` },
            { icon: <Droplets size={14} className="text-cyan-400" />, l: 'Humidity', v: `${sim.env.humidity}%` },
            { icon: <CloudRain size={14} className="text-sky-400" />, l: 'Rainfall', v: `${sim.env.rainfall.toFixed(1)} mm` },
            { icon: <Wind size={14} className="text-slate-300" />, l: 'Wind', v: `${sim.env.windSpeed ?? 18} km/h` },
            { icon: <Sun size={14} className="text-yellow-400" />, l: 'Sunlight', v: `${Math.round(sim.env.sunlight)}` },
            { icon: <Activity size={14} className="text-violet-300" />, l: 'Twin health', v: `${sim.healthIndex}` },
          ].map((m) => (
            <div key={m.l} className={`${panel} px-2.5 py-2 flex items-center gap-2`}>
              {m.icon}
              <div>
                <div className="text-[8px] uppercase text-slate-500 font-bold">{m.l}</div>
                <div className="text-[12px] font-bold text-white">{m.v}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-[9px] text-slate-500 flex flex-wrap items-center gap-2 px-1 pb-3">
          <FileText size={11} />
          Report fuses live twin state with seasonal economics. Scores are decision aids — validate critical actions in the field.
          <span className="ml-auto text-slate-400">{stamp}</span>
        </div>
      </div>
    </div>
  );
}
