import { useMemo, useState, useEffect } from 'react';
import {
  MapPin, Calendar, Download, TrendingUp, DollarSign,
  PieChart, BarChart2, Leaf, Cloud, Sun, Wind, Thermometer,
  Droplets, Zap, FileText, Activity, AlertTriangle,
} from 'lucide-react';
import type { SimState } from './simulation';
import { FIELDS } from './simulation';
import {
  getCities, getAllCropsFlat, SEASONS, getAllStates,
  evaluateMarketArbitrage, getMarketTableForCrop,
  buildPriceTrendSeries, coreCommodity,
  generateSeasonAnalytics, seasonAfterHarvest, computeFieldConstraints,
} from './marketData';

function formatInr(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function LineAreaChart({
  actual,
  estimated,
  labels,
}: {
  actual: number[];
  estimated: number[];
  labels: string[];
}) {
  const w = 360;
  const h = 140;
  const pad = { l: 28, r: 10, t: 14, b: 22 };
  const maxY = Math.max(...actual, ...estimated, 1) * 1.15;
  const n = labels.length;
  const x = (i: number) => pad.l + (i / Math.max(1, n - 1)) * (w - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / maxY) * (h - pad.t - pad.b);
  const path = (arr: number[]) => arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[140px]">
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1={pad.l} x2={w - pad.r} y1={pad.t + (1 - t) * (h - pad.t - pad.b)} y2={pad.t + (1 - t) * (h - pad.t - pad.b)} stroke="#1e2d40" />
      ))}
      <path d={`${path(actual)} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill="url(#ya)" opacity="0.2" />
      <defs>
        <linearGradient id="ya" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" /><stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={path(actual)} fill="none" stroke="#a78bfa" strokeWidth="2.5" />
      <path d={path(estimated)} fill="none" stroke="#34d399" strokeWidth="2" strokeDasharray="5 3" />
      {actual.map((v, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(v)} r="3.5" fill="#c4b5fd" stroke="#7c3aed" strokeWidth="1" />
          <text x={x(i)} y={y(v) - 7} textAnchor="middle" fill="#e2e8f0" fontSize="8" fontWeight="600">{v}</text>
          <text x={x(i)} y={h - 6} textAnchor="middle" fill="#64748b" fontSize="8">{labels[i]}</text>
        </g>
      ))}
      <text x={pad.l} y={10} fill="#64748b" fontSize="8">Tons</text>
    </svg>
  );
}

function BarPairChart({ revenue, profit, labels }: { revenue: number[]; profit: number[]; labels: string[] }) {
  const w = 360;
  const h = 140;
  const pad = { l: 28, r: 10, t: 12, b: 22 };
  const maxY = Math.max(...revenue, ...profit, 1) * 1.15;
  const n = labels.length;
  const slot = (w - pad.l - pad.r) / n;
  const y = (v: number) => pad.t + (1 - v / maxY) * (h - pad.t - pad.b);
  const barH = (v: number) => (v / maxY) * (h - pad.t - pad.b);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[140px]">
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1={pad.l} x2={w - pad.r} y1={pad.t + (1 - t) * (h - pad.t - pad.b)} y2={pad.t + (1 - t) * (h - pad.t - pad.b)} stroke="#1e2d40" />
      ))}
      {labels.map((lab, i) => {
        const cx = pad.l + i * slot + slot / 2;
        const bw = slot * 0.28;
        return (
          <g key={lab}>
            <rect x={cx - bw - 2} y={y(revenue[i])} width={bw} height={barH(revenue[i])} fill="#7c3aed" rx="2" />
            <rect x={cx + 2} y={y(profit[i])} width={bw} height={barH(profit[i])} fill="#22c55e" rx="2" />
            <text x={cx} y={h - 6} textAnchor="middle" fill="#64748b" fontSize="8">{lab}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Donut({
  segments,
  center,
  sub,
}: {
  segments: { pct: number; color: string; label: string; value: string }[];
  center: string;
  sub?: string;
}) {
  let ang = -Math.PI / 2;
  const r = 36;
  const cx = 50;
  const cy = 50;
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 100 100" className="w-24 h-24 shrink-0">
        {segments.map((s) => {
          const slice = (s.pct / 100) * Math.PI * 2;
          const x1 = cx + Math.cos(ang) * r;
          const y1 = cy + Math.sin(ang) * r;
          ang += slice;
          const x2 = cx + Math.cos(ang) * r;
          const y2 = cy + Math.sin(ang) * r;
          const large = slice > Math.PI ? 1 : 0;
          return <path key={s.label} d={`M${cx} ${cy} L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={s.color} />;
        })}
        <circle cx={cx} cy={cy} r="22" fill="#121a27" />
        <text x={cx} y={cy - 2} textAnchor="middle" fill="#fff" fontSize="9" fontWeight="700">{center}</text>
        {sub && <text x={cx} y={cy + 10} textAnchor="middle" fill="#94a3b8" fontSize="6">{sub}</text>}
      </svg>
      <div className="space-y-1 text-[9px] min-w-0">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
            <span className="text-slate-400 truncate flex-1">{s.label}</span>
            <span className="text-slate-200">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MultiLinePrices({ series }: { series: { name: string; color: string; values: number[] }[] }) {
  const w = 300;
  const h = 110;
  const pad = { l: 24, r: 8, t: 10, b: 18 };
  const all = series.flatMap((s) => s.values);
  const min = Math.min(...all) * 0.92;
  const max = Math.max(...all) * 1.05;
  const n = series[0]?.values.length || 1;
  const x = (i: number) => pad.l + (i / Math.max(1, n - 1)) * (w - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / Math.max(0.01, max - min)) * (h - pad.t - pad.b);
  const labels = ['20 Apr', '27 Apr', '4 May', '11 May', '18 May'];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[110px]">
      {series.map((s) => {
        const d = s.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ');
        return <path key={s.name} d={d} fill="none" stroke={s.color} strokeWidth="1.8" strokeLinecap="round" />;
      })}
      {labels.map((lab, i) => (
        <text key={lab} x={x(i)} y={h - 4} textAnchor="middle" fill="#64748b" fontSize="7">{lab}</text>
      ))}
    </svg>
  );
}


function SafeAnalyticsPanel({ sim }: { sim: SimState }) {
  try {
    return <AnalyticsPanelInner sim={sim} />;
  } catch (err) {
    console.error('AnalyticsPanel error', err);
    return (
      <div className="h-full flex items-center justify-center bg-[#0b131e] text-slate-300 p-6">
        <div className="max-w-md text-center space-y-2">
          <AlertTriangle className="mx-auto text-amber-400" size={32} />
          <div className="text-sm font-bold text-white">Analytics failed to load</div>
          <div className="text-[11px] text-slate-500">{String(err)}</div>
        </div>
      </div>
    );
  }
}

function AnalyticsPanelInner({ sim }: { sim: SimState }) {

  const states = getAllStates();
  const [state, setState] = useState('Maharashtra');
  const [city, setCity] = useState('Pune');
  const [crop, setCrop] = useState('Grape (Thompson Seedless)');
  const [season, setSeason] = useState(SEASONS[1]); // Rabi default
  const [selectedFieldId, setSelectedFieldId] = useState<string>('all');
  const [harvestNotice, setHarvestNotice] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);
  const cities = getCities(state);
  const crops = getAllCropsFlat();

  const farmAcres = FIELDS.reduce((s, f) => s + f.acres, 0);

  // Auto-advance season panel when simulation reaches harvest stage
  useEffect(() => {
    if (sim.stage === 'harvest' && sim.stageProgress >= 60) {
      setSeason((prev) => {
        const next = seasonAfterHarvest(prev.startsWith('Annual') ? 'Rabi 2024-25' : prev);
        if (next !== prev) {
          setHarvestNotice(`Harvest complete — season advanced to ${next}`);
          return next;
        }
        return prev;
      });
    }
  }, [sim.stage, sim.stageProgress]);

  // Clear harvest banner after a few seconds of display (UI-only)
  useEffect(() => {
    if (!harvestNotice) return;
    const t = setTimeout(() => setHarvestNotice(null), 8000);
    return () => clearTimeout(t);
  }, [harvestNotice]);

  // Per-field season analytics — driven by live weather + field constraints
  const fieldAnalytics = useMemo(() => {
    return FIELDS.map((f) => {
      const healthIndex = Math.round(f.health * 0.55 + sim.healthIndex * 0.45);
      const env = {
        temperature: sim.env.temperature,
        humidity: sim.env.humidity,
        rainfall: sim.env.rainfall,
        sunlight: sim.env.sunlight,
        windSpeed: sim.env.windSpeed,
        soilMoisture: f.soilMoisture,
        soilType: f.soilType,
        stressHeat: sim.stressHeat,
        stressWater: sim.stressWater,
        stressNutrient: sim.stressNutrient,
        weatherMode: sim.weather,
        hydrogelSat: sim.env.hydrogelSat,
        mulchCoverage: sim.mulchCoverage,
      };
      const a = generateSeasonAnalytics({
        season,
        crop,
        state,
        city,
        acres: f.acres,
        healthIndex,
        env,
      });
      const ha = Math.max(0.01, f.acres * 0.404686);
      const c = a.constraints || computeFieldConstraints(env);
      return {
        id: f.id,
        name: f.name,
        variety: f.variety,
        acres: f.acres,
        hectares: +ha.toFixed(3),
        health: f.health,
        soilType: f.soilType,
        soilMoisture: f.soilMoisture,
        totalYield: a.totalYield,
        revenue: a.revenue,
        profit: a.profit,
        productionCost: a.productionCost,
        margin: a.margin,
        yearRevenue: a.yearRevenue,
        yearProfit: a.yearProfit,
        yearYield: a.yearYield,
        revenuePerHa: Math.round(a.revenue / ha),
        profitPerHa: Math.round(a.profit / ha),
        yearRevenuePerHa: Math.round(a.yearRevenue / ha),
        yearProfitPerHa: Math.round(a.yearProfit / ha),
        yieldPerHa: +(a.totalYield / ha).toFixed(2),
        pricePerTon: a.pricePerTon,
        yieldActual: a.yieldActual,
        yieldEst: a.yieldEst,
        revBars: a.revBars,
        profitBars: a.profitBars,
        priceSummary: a.priceSummary,
        profile: a.profile,
        months: a.months,
        dateRange: a.dateRange,
        vsYield: a.vsYield,
        vsRevenue: a.vsRevenue,
        vsProfit: a.vsProfit,
        vsCost: a.vsCost,
        yearMargin: a.yearMargin,
        weatherScore: c.weatherScore,
        constraints: c.constraints,
        tempImpact: c.tempImpact,
        rainImpact: c.rainImpact,
        moistureImpact: c.moistureImpact,
        yieldFactor: c.yieldFactor,
      };
    });
  }, [
    season,
    crop,
    state,
    city,
    sim.healthIndex,
    sim.env.temperature,
    sim.env.humidity,
    sim.env.rainfall,
    sim.env.sunlight,
    sim.env.windSpeed,
    sim.env.hydrogelSat,
    sim.stressHeat,
    sim.stressWater,
    sim.stressNutrient,
    sim.weather,
    sim.mulchCoverage,
  ]);

  // Farm totals across all 4 fields
  const farmTotals = useMemo(() => {
    const totalYield = +fieldAnalytics.reduce((s, f) => s + f.totalYield, 0).toFixed(2);
    const revenue = fieldAnalytics.reduce((s, f) => s + f.revenue, 0);
    const profit = fieldAnalytics.reduce((s, f) => s + f.profit, 0);
    const productionCost = fieldAnalytics.reduce((s, f) => s + f.productionCost, 0);
    const yearRevenue = fieldAnalytics.reduce((s, f) => s + f.yearRevenue, 0);
    const yearProfit = fieldAnalytics.reduce((s, f) => s + f.yearProfit, 0);
    const yearYield = +fieldAnalytics.reduce((s, f) => s + f.yearYield, 0).toFixed(2);
    const margin = revenue > 0 ? +((profit / revenue) * 100).toFixed(1) : 0;
    const yearMargin = yearRevenue > 0 ? +((yearProfit / yearRevenue) * 100).toFixed(1) : 0;
    const hectares = Math.max(0.01, farmAcres * 0.404686);
    const best = [...fieldAnalytics].sort((a, b) => b.profit - a.profit)[0];
    // area-weighted average curves for charts
    const weight = fieldAnalytics.map((f) => f.acres / farmAcres);
    const avgCurve = (key: 'yieldActual' | 'yieldEst' | 'revBars' | 'profitBars') =>
      fieldAnalytics[0][key].map((_, i) =>
        +fieldAnalytics.reduce((s, f, fi) => s + f[key][i] * weight[fi], 0).toFixed(1),
      );
    return {
      totalYield,
      revenue,
      profit,
      productionCost,
      yearRevenue,
      yearProfit,
      yearYield,
      margin,
      yearMargin,
      hectares,
      acres: farmAcres,
      best,
      yieldActual: avgCurve('yieldActual'),
      yieldEst: avgCurve('yieldEst'),
      revBars: avgCurve('revBars'),
      profitBars: avgCurve('profitBars'),
      revenuePerHa: Math.round(revenue / hectares),
      profitPerHa: Math.round(profit / hectares),
      costPerHa: Math.round(productionCost / hectares),
      yearRevenuePerHa: Math.round(yearRevenue / hectares),
      yearProfitPerHa: Math.round(yearProfit / hectares),
      yieldPerHa: +(totalYield / hectares).toFixed(2),
    };
  }, [fieldAnalytics, farmAcres]);

  const activeField = selectedFieldId === 'all' ? null : fieldAnalytics.find((f) => f.id === selectedFieldId) || null;

  // Scoped KPIs: selected field or whole farm
  const totalYield = activeField ? activeField.totalYield : farmTotals.totalYield;
  const revenue = activeField ? activeField.revenue : farmTotals.revenue;
  const profit = activeField ? activeField.profit : farmTotals.profit;
  const productionCost = activeField ? activeField.productionCost : farmTotals.productionCost;
  const margin = activeField ? activeField.margin : farmTotals.margin;
  const yearYield = activeField ? activeField.yearYield : farmTotals.yearYield;
  const yearRevenue = activeField ? activeField.yearRevenue : farmTotals.yearRevenue;
  const yearProfit = activeField ? activeField.yearProfit : farmTotals.yearProfit;
  const yearMargin = activeField ? activeField.yearMargin : farmTotals.yearMargin;
  const hectares = activeField ? activeField.hectares : farmTotals.hectares;
  const acres = activeField ? activeField.acres : farmTotals.acres;
  const revenuePerHa = activeField ? activeField.revenuePerHa : farmTotals.revenuePerHa;
  const profitPerHa = activeField ? activeField.profitPerHa : farmTotals.profitPerHa;
  const costPerHa = activeField
    ? Math.round(activeField.productionCost / activeField.hectares)
    : farmTotals.costPerHa;
  const yearRevenuePerHa = activeField ? activeField.yearRevenuePerHa : farmTotals.yearRevenuePerHa;
  const yearProfitPerHa = activeField ? activeField.yearProfitPerHa : farmTotals.yearProfitPerHa;
  const yieldPerHa = activeField ? activeField.yieldPerHa : farmTotals.yieldPerHa;
  const pricePerTon = activeField?.pricePerTon ?? fieldAnalytics[0]?.pricePerTon ?? 30000;
  const yieldActual = activeField ? activeField.yieldActual : farmTotals.yieldActual;
  const yieldEst = activeField ? activeField.yieldEst : farmTotals.yieldEst;
  const revBars = activeField ? activeField.revBars : farmTotals.revBars;
  const profitBars = activeField ? activeField.profitBars : farmTotals.profitBars;
  const priceSummary = activeField?.priceSummary ?? fieldAnalytics[0]?.priceSummary;
  const profile = fieldAnalytics[0]?.profile;
  const months = fieldAnalytics[0]?.months ?? ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
  const dateRange = fieldAnalytics[0]?.dateRange ?? '';
  const vsYield = activeField?.vsYield ?? fieldAnalytics[0]?.vsYield ?? 0;
  const vsRevenue = activeField?.vsRevenue ?? fieldAnalytics[0]?.vsRevenue ?? 0;
  const vsProfit = activeField?.vsProfit ?? fieldAnalytics[0]?.vsProfit ?? 0;
  const vsCost = activeField?.vsCost ?? fieldAnalytics[0]?.vsCost ?? 0;

  const arbitrage = useMemo(() => evaluateMarketArbitrage(crop, state, city), [crop, state, city]);
  const marketRows = useMemo(() => getMarketTableForCrop(crop, state, city), [crop, state, city]);

  const gradeA = +(totalYield * 0.6).toFixed(2);
  const gradeB = +(totalYield * 0.3).toFixed(2);
  const gradeC = +(totalYield * 0.1).toFixed(2);

  // Irrigation share rises in Summer; labor higher in Kharif
  const costParts = useMemo(() => {
    const irrigBoost = season.includes('Summer') ? 4 : 0;
    const laborBoost = season.includes('Kharif') ? 3 : 0;
    const labor = 28 + laborBoost;
    const irrig = 14 + irrigBoost;
    const fert = 22;
    const mulch = 16;
    const pest = 10;
    const others = Math.max(6, 100 - labor - fert - mulch - irrig - pest);
    return [
      { label: 'Labor', pct: labor, color: '#8b5cf6', value: formatInr(productionCost * (labor / 100)) },
      { label: 'Fertilizers', pct: fert, color: '#3b82f6', value: formatInr(productionCost * (fert / 100)) },
      { label: 'Mulching Paper', pct: mulch, color: '#eab308', value: formatInr(productionCost * (mulch / 100)) },
      { label: 'Irrigation', pct: irrig, color: '#f97316', value: formatInr(productionCost * (irrig / 100)) },
      { label: 'Pesticides', pct: pest, color: '#ef4444', value: formatInr(productionCost * (pest / 100)) },
      { label: 'Others', pct: others, color: '#06b6d4', value: formatInr(productionCost * (others / 100)) },
    ];
  }, [season, productionCost]);

  // Zones = full field economics, sorted by profit
  const zones = [...fieldAnalytics]
    .map((f) => ({
      id: f.id,
      name: f.name,
      variety: f.variety,
      acres: f.acres,
      hectares: f.hectares,
      yield: f.totalYield,
      revenue: f.revenue,
      profit: f.profit,
      margin: f.margin,
      revenuePerHa: f.revenuePerHa,
      profitPerHa: f.profitPerHa,
      yearRevenue: f.yearRevenue,
      yearProfit: f.yearProfit,
    }))
    .sort((a, b) => b.profit - a.profit);

  const perfScore = Math.min(
    100,
    Math.round((activeField?.health ?? sim.healthIndex) * 0.5 + margin * 0.4 + 12),
  );

  const priceSeries = useMemo(() => {
    const names = marketRows.map((r) => r.variety).slice(0, 5);
    const fallback = [crop.split('(')[0].trim() || 'Crop'];
    const modal = priceSummary?.modal_price_quintal || 4000;
    return buildPriceTrendSeries(modal, names.length ? names : fallback);
  }, [marketRows, priceSummary?.modal_price_quintal, crop]);

  const panel = 'bg-[#121a27] rounded-xl border border-[#1e2d40]';
  const selectCls = 'bg-[#0b131e] border border-[#1e2d40] rounded-lg text-[11px] text-slate-200 px-2 py-1.5 outline-none focus:border-violet-500/50';

  const reportScopeLabel =
    selectedFieldId === 'all' ? 'All 4 Fields (Farm)' : `Field ${selectedFieldId}`;

  function buildReportText(): string {
    const lines: string[] = [];
    const stamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
    lines.push('APOLLO AGRIVERSE — DETAILED FIELD ANALYTICS REPORT');
    lines.push(`Generated: ${stamp}`);
    lines.push(`Scope: ${reportScopeLabel}`);
    lines.push(`Season: ${season} · ${dateRange}`);
    lines.push(`Crop: ${crop}`);
    lines.push(`Location: ${city}, ${state}`);
    lines.push('');
    lines.push('=== SUMMARY ===');
    lines.push(`Yield: ${totalYield} tons (${yieldPerHa} t/ha)`);
    lines.push(`Money earned (revenue): ${formatInr(revenue)} (${formatInr(revenuePerHa)}/ha)`);
    lines.push(`Profit: ${formatInr(profit)} (${formatInr(profitPerHa)}/ha)`);
    lines.push(`Production cost: ${formatInr(productionCost)} (${formatInr(costPerHa)}/ha)`);
    lines.push(`Profit margin: ${margin}%`);
    lines.push(`Area: ${acres.toFixed(2)} acres · ${hectares.toFixed(2)} ha`);
    lines.push('');
    lines.push('=== THIS YEAR FORECAST ===');
    lines.push(`Year yield: ${yearYield} tons`);
    lines.push(`Year revenue: ${formatInr(yearRevenue)} (${formatInr(yearRevenuePerHa)}/ha)`);
    lines.push(`Year profit: ${formatInr(yearProfit)} (${formatInr(yearProfitPerHa)}/ha)`);
    lines.push(`Year margin: ${yearMargin}%`);
    lines.push('');
    lines.push('=== WEATHER & CONSTRAINTS ===');
    lines.push(`Temperature: ${sim.env.temperature}°C`);
    lines.push(`Rainfall: ${sim.env.rainfall.toFixed(1)} mm`);
    lines.push(`Humidity: ${sim.env.humidity}%`);
    lines.push(`Sunlight: ${Math.round(sim.env.sunlight)} W/m²`);
    lines.push(`Wind: ${sim.env.windSpeed ?? 18} km/h`);
    if (activeField) {
      lines.push(`Field moisture: ${activeField.soilMoisture}%`);
      lines.push(`Soil type: ${activeField.soilType}`);
      lines.push(`Variety: ${activeField.variety}`);
      lines.push(`Constraints: ${(activeField.constraints || []).join('; ')}`);
      lines.push(`Env yield factor: ×${(activeField.yieldFactor ?? 1).toFixed(2)}`);
      lines.push(`Weather score: ${activeField.weatherScore}`);
    } else {
      lines.push('Constraints: farm-wide (see per-field table)');
    }
    lines.push('');
    lines.push('=== EARNINGS BY FIELD ===');
    lines.push('Field,Variety,Acres,Yield_t,Revenue_INR,Profit_INR,Profit_per_ha,Margin_%');
    for (const z of zones) {
      lines.push(
        `${z.name},${z.variety},${z.acres},${z.yield},${z.revenue},${z.profit},${z.profitPerHa},${z.margin}`,
      );
    }
    lines.push(
      `Farm total,,${farmTotals.acres.toFixed(2)},${farmTotals.totalYield},${farmTotals.revenue},${farmTotals.profit},${farmTotals.profitPerHa},${farmTotals.margin}`,
    );
    lines.push('');
    lines.push('=== MARKET / ARBITRAGE ===');
    lines.push(`Commodity: ${arbitrage.commodity}`);
    lines.push(`Local spot: ₹${arbitrage.local_spot_price_quintal_inr}/qtl`);
    lines.push(`Net export parity: ₹${Math.round(arbitrage.net_export_value_inr)}/t`);
    lines.push(`Spread: ${arbitrage.spread_percentage}% · ${arbitrage.action_tag}`);
    lines.push(arbitrage.directive_message);
    lines.push('');
    lines.push('--- End of report ---');
    return lines.join('\n');
  }

  function downloadReport() {
    const text = buildReportText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const scope = selectedFieldId === 'all' ? 'farm' : `field-${selectedFieldId}`;
    a.href = url;
    a.download = `agriverse-report-${scope}-${season.replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden bg-[#0b131e]">
      <div className="p-3 space-y-2.5">
        <div>
          <h1 className="text-base font-bold tracking-wide">
            <span className="text-violet-300">ANALYTICS & INSIGHTS</span>
          </h1>
          <p className="text-[10px] text-slate-500">Real-time Data · Smart Analytics · Profitable Decisions · Agmarknet integrated</p>
        </div>

        {/* Filters */}
        <div className={`${panel} p-2.5 flex flex-wrap items-end gap-2`}>
          <div>
            <div className="text-[9px] text-slate-500 mb-0.5 flex items-center gap-1"><MapPin size={10} /> State / City</div>
            <div className="flex gap-1">
              <select className={selectCls} value={state} onChange={(e) => { setState(e.target.value); setCity(getCities(e.target.value)[0] || ''); }}>
                {states.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select className={selectCls} value={city} onChange={(e) => setCity(e.target.value)}>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div className="text-[9px] text-slate-500 mb-0.5 flex items-center gap-1"><Leaf size={10} /> Crop</div>
            <select className={selectCls + ' max-w-[200px]'} value={crop} onChange={(e) => setCrop(e.target.value)}>
              {crops.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <div className="text-[9px] text-slate-500 mb-0.5 flex items-center gap-1"><Calendar size={10} /> Season</div>
            <select className={selectCls} value={season} onChange={(e) => setSeason(e.target.value)}>
              {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="text-[10px] text-slate-400 px-2 py-1.5 rounded-lg border border-[#1e2d40] bg-[#0b131e]">
            {dateRange}
          </div>
          {sim.stage === 'harvest' && (
            <div className="text-[10px] text-amber-300 px-2 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10">
              🧺 Harvest stage · {sim.stageProgress}%
            </div>
          )}
          <button type="button" className="ml-auto text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500">
            Apply
          </button>
          <button
            type="button"
            onClick={downloadReport}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-[#1e2d40] text-slate-300 hover:border-slate-500 flex items-center gap-1"
          >
            <Download size={12} /> Export Report
          </button>
        </div>

        {harvestNotice && (
          <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200 flex items-center gap-2">
            <Activity size={14} className="shrink-0" />
            {harvestNotice}
          </div>
        )}

        {/* Field / farm selector — analytics scoped to 4 digital-twin fields */}
        <div className={`${panel} p-2.5 flex flex-wrap items-center gap-2`}>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mr-1">Farm / Fields</div>
          <button
            type="button"
            onClick={() => setSelectedFieldId('all')}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
              selectedFieldId === 'all'
                ? 'bg-violet-600/30 border-violet-500/60 text-violet-200'
                : 'border-[#1e2d40] text-slate-400 hover:border-slate-500'
            }`}
          >
            All 4 Fields · {farmTotals.acres.toFixed(2)} ac · {formatInr(farmTotals.revenue)}
          </button>
          {fieldAnalytics.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedFieldId(f.id)}
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
                selectedFieldId === f.id
                  ? 'bg-violet-600/30 border-violet-500/60 text-violet-200'
                  : 'border-[#1e2d40] text-slate-400 hover:border-slate-500'
              }`}
            >
              {f.name}
              <span className="ml-1 text-[9px] text-slate-500 font-normal">
                {f.acres} ac · {formatInr(f.profit)} profit
              </span>
            </button>
          ))}
          <div className="ml-auto text-[9px] text-slate-500">
            Top profit: <span className="text-emerald-400 font-semibold">{farmTotals.best?.name}</span>
            {' · '}{formatInr(farmTotals.best?.profit ?? 0)}
          </div>
        </div>

        {/* Season KPI strip — changes with field + season */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
          {[
            { icon: <Leaf size={16} className="text-violet-400" />, t: 'TOTAL YIELD', v: `${totalYield} tons`, s: `${yieldPerHa} t/ha · ${selectedFieldId === 'all' ? '4 fields' : `Field ${selectedFieldId}`}`, sc: 'text-violet-300' },
            { icon: <DollarSign size={16} className="text-emerald-400" />, t: 'MONEY EARNED', v: formatInr(revenue), s: `${formatInr(revenuePerHa)}/ha · ${vsRevenue >= 0 ? '↑' : '↓'} ${Math.abs(vsRevenue)}%`, sc: vsRevenue >= 0 ? 'text-emerald-400' : 'text-rose-400' },
            { icon: <TrendingUp size={16} className="text-amber-400" />, t: 'ESTIMATED PROFIT', v: formatInr(profit), s: `${formatInr(profitPerHa)}/ha · ${vsProfit >= 0 ? '↑' : '↓'} ${Math.abs(vsProfit)}%`, sc: vsProfit >= 0 ? 'text-emerald-400' : 'text-rose-400' },
            { icon: <PieChart size={16} className="text-sky-400" />, t: 'PRODUCTION COST', v: formatInr(productionCost), s: `${formatInr(costPerHa)}/ha · ${vsCost >= 0 ? '↑' : '↓'} ${Math.abs(vsCost)}%`, sc: vsCost <= 0 ? 'text-emerald-400' : 'text-amber-400' },
            { icon: <BarChart2 size={16} className="text-fuchsia-400" />, t: 'PROFIT MARGIN', v: `${margin}%`, s: `${acres.toFixed(2)} ac · ${hectares.toFixed(2)} ha`, sc: 'text-emerald-400' },
          ].map((k) => (
            <div key={k.t} className={`${panel} px-2.5 py-2`}>
              <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-semibold uppercase">{k.icon}{k.t}</div>
              <div className="text-lg font-bold text-white mt-0.5">{k.v}</div>
              <div className={`text-[10px] ${k.sc}`}>{k.s}</div>
            </div>
          ))}
        </div>

        {/* This year forecast — total money earning & profit */}
        <div className={`${panel} p-3 border border-violet-500/20`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <div className="text-[11px] font-bold text-violet-200">THIS YEAR FORECAST · Total Earnings & Profit</div>
              <div className="text-[9px] text-slate-500">
                {selectedFieldId === 'all' ? 'Sum of 4 fields' : `Field ${selectedFieldId} only`}
                {' · '}seasonal market models + live farm health
                {profile?.harvestMonths ? ` · ${profile.harvestMonths} harvest` : ''}
              </div>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">API data · Agmarknet scaled</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2">
            <div className="rounded-lg bg-[#0b131e] border border-[#1e2d40] px-2.5 py-2">
              <div className="text-[9px] text-slate-500 uppercase font-semibold">Year Yield</div>
              <div className="text-base font-bold text-white">{yearYield} tons</div>
            </div>
            <div className="rounded-lg bg-[#0b131e] border border-[#1e2d40] px-2.5 py-2">
              <div className="text-[9px] text-slate-500 uppercase font-semibold">Year Revenue</div>
              <div className="text-base font-bold text-emerald-300">{formatInr(yearRevenue)}</div>
            </div>
            <div className="rounded-lg bg-[#0b131e] border border-[#1e2d40] px-2.5 py-2">
              <div className="text-[9px] text-slate-500 uppercase font-semibold">Year Profit</div>
              <div className="text-base font-bold text-amber-300">{formatInr(yearProfit)}</div>
            </div>
            <div className="rounded-lg bg-[#0b131e] border border-[#1e2d40] px-2.5 py-2">
              <div className="text-[9px] text-slate-500 uppercase font-semibold">Revenue / ha</div>
              <div className="text-base font-bold text-emerald-200">{formatInr(yearRevenuePerHa)}</div>
            </div>
            <div className="rounded-lg bg-[#0b131e] border border-[#1e2d40] px-2.5 py-2">
              <div className="text-[9px] text-slate-500 uppercase font-semibold">Profit / ha</div>
              <div className="text-base font-bold text-amber-200">{formatInr(yearProfitPerHa)}</div>
            </div>
            <div className="rounded-lg bg-[#0b131e] border border-[#1e2d40] px-2.5 py-2">
              <div className="text-[9px] text-slate-500 uppercase font-semibold">Year Margin</div>
              <div className="text-base font-bold text-fuchsia-300">{yearMargin}%</div>
              <div className="text-[9px] text-slate-500">{hectares.toFixed(2)} ha farm</div>
            </div>
          </div>
          <div className="mt-2 text-[9px] text-slate-500 leading-snug">{profile?.insight}</div>
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
          <div className={`${panel} p-3 lg:col-span-5`}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] font-bold text-slate-300">YIELD TREND</div>
              <span className="text-[9px] text-slate-500 border border-[#1e2d40] rounded px-1.5 py-0.5">Monthly</span>
            </div>
            <div className="flex gap-3 text-[8px] text-slate-500 mb-1">
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-violet-400" /> Actual Yield</span>
              <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-400 border-dashed" /> Estimated</span>
            </div>
            <LineAreaChart actual={yieldActual.slice(0, 6)} estimated={yieldEst.slice(0, 6)} labels={months.slice(0, 6)} />
          </div>

          <div className={`${panel} p-3 lg:col-span-3`}>
            <div className="text-[10px] font-bold text-slate-300 mb-2">YIELD DISTRIBUTION</div>
            <Donut
              center={`${totalYield}`}
              sub="tons"
              segments={[
                { pct: 60, color: '#8b5cf6', label: 'Grade A (Premium)', value: `${gradeA} t · 60%` },
                { pct: 30, color: '#22c55e', label: 'Grade B (Standard)', value: `${gradeB} t · 30%` },
                { pct: 10, color: '#eab308', label: 'Grade C (Others)', value: `${gradeC} t · 10%` },
              ]}
            />
          </div>

          <div className={`${panel} p-3 lg:col-span-4`}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[10px] font-bold text-slate-300">MARKET PRICES (Live · Agmarknet)</div>
              <span className="text-[9px] text-violet-400">View Market</span>
            </div>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="text-slate-500 border-b border-[#1e2d40]">
                  <th className="text-left py-1 font-medium">Variety / Market</th>
                  <th className="text-right py-1 font-medium">₹/qtl</th>
                  <th className="text-right py-1 font-medium">₹/kg</th>
                  <th className="text-right py-1 font-medium">7D</th>
                </tr>
              </thead>
              <tbody>
                {marketRows.map((r) => (
                  <tr key={`${r.variety}-${r.market}`} className="border-b border-[#1e2d40]/40">
                    <td className="py-1 text-slate-200">
                      <div className="font-medium">{r.variety}</div>
                      <div className="text-[8px] text-slate-500">{r.market} · {r.district}</div>
                    </td>
                    <td className="text-right text-white font-semibold">{r.priceQtl.toLocaleString('en-IN')}</td>
                    <td className="text-right text-slate-300">₹{r.priceKg.toFixed(2)}</td>
                    <td className={`text-right font-semibold ${r.trend7d >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {r.trend7d >= 0 ? '↑' : '↓'} {Math.abs(r.trend7d).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 text-[9px] text-slate-500">
              {city}, {state} · {coreCommodity(crop)} modal ₹{priceSummary?.modal_price_quintal || '—'}/qtl
              · min ₹{priceSummary?.min_price_quintal || '—'} · max ₹{priceSummary?.max_price_quintal || '—'}
              · {priceSummary?.reporting_markets_count || 0} markets (Agmarknet)
            </div>
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
          <div className={`${panel} p-3 lg:col-span-5`}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[10px] font-bold text-slate-300">REVENUE & PROFIT TREND</div>
              <span className="text-[9px] text-slate-500 border border-[#1e2d40] rounded px-1.5 py-0.5">Monthly · ₹ Lakhs</span>
            </div>
            <div className="flex gap-3 text-[8px] text-slate-500 mb-1">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-violet-600" /> Revenue</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" /> Profit</span>
            </div>
            <BarPairChart revenue={revBars.slice(0, 6)} profit={profitBars.slice(0, 6)} labels={months.slice(0, 6)} />
          </div>

          <div className={`${panel} p-3 lg:col-span-3`}>
            <div className="text-[10px] font-bold text-slate-300 mb-2">COST BREAKDOWN</div>
            <Donut center={formatInr(productionCost).replace('₹', '')} sub="cost" segments={costParts.map((c) => ({ pct: c.pct, color: c.color, label: c.label, value: `${c.pct}%` }))} />
          </div>

          <div className={`${panel} p-3 lg:col-span-4`}>
            <div className="text-[10px] font-bold text-slate-300 mb-1">PRICE TREND (Last 30 Days)</div>
            <div className="flex flex-wrap gap-2 text-[8px] text-slate-500 mb-1">
              {priceSeries.map((s) => (
                <span key={s.name} className="inline-flex items-center gap-1">
                  <span className="w-2 h-0.5" style={{ background: s.color }} />{s.name}
                </span>
              ))}
            </div>
            <MultiLinePrices series={priceSeries} />
          </div>
        </div>

        {/* Bottom — items-start avoids empty stretch space in shorter panels */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-2 items-start">
          <div className={`${panel} p-3 xl:col-span-2 flex flex-col items-center self-start`}>
            <div className="text-[9px] text-slate-500 font-semibold uppercase mb-1">Farm Performance</div>
            <div className="relative w-24 h-24">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="36" stroke="#1e2d40" strokeWidth="8" fill="none" />
                <circle cx="50" cy="50" r="36" stroke="#8b5cf6" strokeWidth="8" fill="none"
                  strokeDasharray={2 * Math.PI * 36}
                  strokeDashoffset={2 * Math.PI * 36 * (1 - perfScore / 100)}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white leading-none">{perfScore}</span>
                <span className="text-[8px] text-slate-500">/100</span>
              </div>
            </div>
            <div className="text-emerald-400 text-[11px] font-bold mt-1">{perfScore >= 80 ? 'Excellent' : 'Good'}</div>
            <div className="text-[8px] text-emerald-400/80">↑ 8% vs last 7 days</div>
          </div>

          <div className={`${panel} p-2.5 xl:col-span-4 overflow-x-auto self-start h-fit`}>
            <div className="text-[10px] font-bold text-slate-300 mb-1">EARNINGS & PROFIT BY FIELD (4 fields)</div>
            <table className="w-full text-[10px] min-w-[420px]">
              <thead>
                <tr className="text-slate-500 border-b border-[#1e2d40]">
                  <th className="text-left py-1">Field</th>
                  <th className="text-right py-1">Yield (t)</th>
                  <th className="text-right py-1">Revenue</th>
                  <th className="text-right py-1">Profit</th>
                  <th className="text-right py-1">₹/ha</th>
                  <th className="text-right py-1">Margin</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((z, i) => (
                  <tr
                    key={z.id}
                    onClick={() => setSelectedFieldId(z.id)}
                    className={`border-b border-[#1e2d40]/40 cursor-pointer hover:bg-violet-500/5 ${
                      selectedFieldId === z.id ? 'bg-violet-500/10' : ''
                    }`}
                  >
                    <td className="py-1 text-white font-medium">
                      {z.name}
                      {i === 0 && <span className="ml-1 text-[8px] bg-emerald-500/20 text-emerald-300 px-1 rounded">Best</span>}
                      <div className="text-[8px] text-slate-500 font-normal">{z.variety} · {z.acres} ac</div>
                    </td>
                    <td className="text-right text-slate-200">{z.yield}</td>
                    <td className="text-right text-slate-300">{formatInr(z.revenue)}</td>
                    <td className="text-right text-emerald-300 font-semibold">{formatInr(z.profit)}</td>
                    <td className="text-right text-slate-400">{formatInr(z.profitPerHa)}</td>
                    <td className="text-right text-emerald-400">{z.margin}%</td>
                  </tr>
                ))}
                <tr className="border-t border-[#1e2d40] font-semibold">
                  <td className="py-1.5 text-slate-300">Farm total</td>
                  <td className="text-right text-slate-200">{farmTotals.totalYield}</td>
                  <td className="text-right text-slate-300">{formatInr(farmTotals.revenue)}</td>
                  <td className="text-right text-emerald-300">{formatInr(farmTotals.profit)}</td>
                  <td className="text-right text-slate-400">{formatInr(farmTotals.profitPerHa)}</td>
                  <td className="text-right text-emerald-400">{farmTotals.margin}%</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={`${panel} p-2.5 xl:col-span-3 self-start h-fit`}>
            <div className="text-[10px] font-bold text-slate-300 mb-2">
              WEATHER & CONSTRAINTS
              <span className="ml-1 text-slate-500 font-normal">
                {selectedFieldId === 'all' ? '· farm' : `· Field ${selectedFieldId}`}
              </span>
            </div>
            <div className="space-y-1.5 text-[10px]">
              {[
                {
                  icon: <Thermometer size={12} className="text-orange-400" />,
                  f: 'Temperature',
                  v: `${sim.env.temperature}°C`,
                  st: activeField?.tempImpact ?? fieldAnalytics[0]?.tempImpact ?? '—',
                },
                {
                  icon: <Cloud size={12} className="text-sky-400" />,
                  f: 'Rainfall',
                  v: `${sim.env.rainfall.toFixed(1)} mm`,
                  st: activeField?.rainImpact ?? fieldAnalytics[0]?.rainImpact ?? '—',
                },
                {
                  icon: <Droplets size={12} className="text-cyan-400" />,
                  f: 'Field moisture',
                  v: `${activeField?.soilMoisture ?? Math.round(fieldAnalytics.reduce((s, x) => s + x.soilMoisture, 0) / Math.max(1, fieldAnalytics.length))}%`,
                  st: activeField?.moistureImpact ?? fieldAnalytics[0]?.moistureImpact ?? '—',
                },
                {
                  icon: <Sun size={12} className="text-yellow-400" />,
                  f: 'Sunlight',
                  v: `${Math.round(sim.env.sunlight)} W/m²`,
                  st: sim.env.sunlight >= 500 ? 'Positive ↑' : 'Low light ↓',
                },
                {
                  icon: <Wind size={12} className="text-slate-400" />,
                  f: 'Wind Speed',
                  v: `${sim.env.windSpeed ?? 18} km/h`,
                  st: (sim.env.windSpeed ?? 18) > 28 ? 'High wind ↓' : 'Neutral →',
                },
              ].map((r) => {
                const sc = r.st.includes('↓') || r.st.includes('risk') || r.st.includes('Deficit') || r.st.includes('Excess')
                  ? 'text-amber-400'
                  : r.st.includes('↑') || r.st.includes('Optimal') || r.st.includes('Favorable')
                    ? 'text-emerald-400'
                    : 'text-slate-400';
                return (
                  <div key={r.f} className="flex items-center gap-2 py-0.5 border-b border-[#1e2d40]/40 last:border-0">
                    {r.icon}
                    <span className="text-slate-400 flex-1">{r.f}</span>
                    <span className="text-slate-200">{r.v}</span>
                    <span className={`w-[4.5rem] text-right font-semibold ${sc}`}>{r.st}</span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {(activeField?.constraints ?? fieldAnalytics[0]?.constraints ?? []).slice(0, 4).map((c) => (
                <span
                  key={c}
                  className={`text-[8px] px-1.5 py-0.5 rounded border ${
                    c.includes('optimal') || c.includes('Within')
                      ? 'border-emerald-500/30 text-emerald-300 bg-emerald-500/10'
                      : 'border-amber-500/30 text-amber-200 bg-amber-500/10'
                  }`}
                >
                  {c}
                </span>
              ))}
            </div>
            <div className="mt-1.5 text-[9px] text-slate-500">
              Env yield factor{' '}
              <span className="text-violet-300 font-semibold">
                ×{(activeField?.yieldFactor ?? fieldAnalytics[0]?.yieldFactor ?? 1).toFixed(2)}
              </span>
              {' · '}weather score{' '}
              <span className="text-white font-semibold">
                {activeField?.weatherScore ?? fieldAnalytics[0]?.weatherScore ?? '—'}
              </span>
            </div>
          </div>

          <div className={`${panel} p-2.5 xl:col-span-3 space-y-2 self-start h-fit`}>
            <div className="text-[10px] font-bold text-slate-300">KEY INSIGHTS</div>
            <div className="space-y-1.5 text-[9px]">
              <div className="flex gap-2 items-start rounded-lg bg-[#0b131e] border border-[#1e2d40] p-2">
                <Activity size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-emerald-300 font-semibold">{vsYield >= 0 ? 'Strong Yield' : 'Yield Pressure'}</div>
                  <div className="text-slate-500">
                    {season}: yield {vsYield >= 0 ? 'up' : 'down'} {Math.abs(vsYield)}% vs prior season · harvest {profile?.harvestMonths ?? '—'}.
                  </div>
                </div>
              </div>
              <div className="flex gap-2 items-start rounded-lg bg-[#0b131e] border border-[#1e2d40] p-2">
                <TrendingUp size={12} className="text-violet-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-violet-300 font-semibold">Season Profitability</div>
                  <div className="text-slate-500">Margin {margin}% · year profit forecast {formatInr(yearProfit)} ({yearMargin}%).</div>
                </div>
              </div>
              <div className="flex gap-2 items-start rounded-lg bg-[#0b131e] border border-[#1e2d40] p-2">
                <Leaf size={12} className="text-sky-400 shrink-0 mt-0.5" />
                <div><div className="text-sky-300 font-semibold">Market Opportunity</div><div className="text-slate-500">{arbitrage.action_tag}</div></div>
              </div>
              <div className="flex gap-2 items-start rounded-lg bg-[#0b131e] border border-[#1e2d40] p-2">
                <Zap size={12} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-amber-300 font-semibold">Cost Profile</div>
                  <div className="text-slate-500">
                    {season.includes('Summer') ? 'Irrigation-heavy cost mix this season.' : season.includes('Kharif') ? 'Labor share elevated in Kharif.' : 'Balanced cost structure.'}
                    {' '}Cost {vsCost >= 0 ? 'up' : 'down'} {Math.abs(vsCost)}% vs last season.
                  </div>
                </div>
              </div>
            </div>

            {/* Arbitrage card from market engine */}
            <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-2 text-[9px]">
              <div className="font-bold text-violet-200 mb-1">EXPORT / ARBITRAGE · {arbitrage.commodity}</div>
              <div className="space-y-0.5 text-slate-400">
                <div className="flex justify-between"><span>Local spot</span><span className="text-white">₹{arbitrage.local_spot_price_quintal_inr}/qtl</span></div>
                <div className="flex justify-between"><span>Net export parity</span><span className="text-white">₹{Math.round(arbitrage.net_export_value_inr).toLocaleString('en-IN')}/t</span></div>
                <div className="flex justify-between"><span>Spread</span><span className={arbitrage.spread_percentage > 0 ? 'text-emerald-400' : 'text-rose-400'}>{arbitrage.spread_percentage > 0 ? '+' : ''}{arbitrage.spread_percentage}%</span></div>
              </div>
              <div className="text-slate-500 mt-1 leading-snug">{arbitrage.directive_message}</div>
            </div>

            <button
              type="button"
              onClick={() => setShowReport(true)}
              className="w-full text-[11px] font-semibold py-2 rounded-lg bg-violet-600/80 hover:bg-violet-600 text-white flex items-center justify-center gap-1.5"
            >
              <FileText size={13} /> Generate Detailed Report
            </button>
          </div>
        </div>

        {/* Detailed report modal — scoped to selected field / farm */}
        {showReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setShowReport(false)}>
            <div
              className={`${panel} max-w-2xl w-full max-h-[85vh] overflow-y-auto p-4 shadow-2xl`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <div className="text-sm font-bold text-white">Detailed Analytics Report</div>
                  <div className="text-[10px] text-slate-500">
                    {reportScopeLabel} · {season} · {crop.split('(')[0].trim()} · {city}, {state}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowReport(false)}
                  className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded border border-[#1e2d40]"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {[
                  { l: 'Yield', v: `${totalYield} t` },
                  { l: 'Money earned', v: formatInr(revenue) },
                  { l: 'Profit', v: formatInr(profit) },
                  { l: 'Margin', v: `${margin}%` },
                ].map((k) => (
                  <div key={k.l} className="rounded-lg bg-[#0b131e] border border-[#1e2d40] px-2 py-1.5">
                    <div className="text-[9px] text-slate-500 uppercase">{k.l}</div>
                    <div className="text-sm font-bold text-white">{k.v}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3 text-[10px]">
                <div className="rounded-lg bg-[#0b131e] border border-[#1e2d40] p-2 space-y-1">
                  <div className="font-bold text-slate-300 mb-1">Economics</div>
                  <div className="flex justify-between"><span className="text-slate-500">Revenue / ha</span><span className="text-white">{formatInr(revenuePerHa)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Profit / ha</span><span className="text-emerald-300">{formatInr(profitPerHa)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Cost / ha</span><span className="text-slate-200">{formatInr(costPerHa)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Area</span><span className="text-slate-200">{acres.toFixed(2)} ac · {hectares.toFixed(2)} ha</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Year profit</span><span className="text-amber-300">{formatInr(yearProfit)}</span></div>
                </div>
                <div className="rounded-lg bg-[#0b131e] border border-[#1e2d40] p-2 space-y-1">
                  <div className="font-bold text-slate-300 mb-1">Environment</div>
                  <div className="flex justify-between"><span className="text-slate-500">Temp</span><span className="text-white">{sim.env.temperature}°C</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Rain</span><span className="text-white">{sim.env.rainfall.toFixed(1)} mm</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Humidity</span><span className="text-white">{sim.env.humidity}%</span></div>
                  {activeField && (
                    <>
                      <div className="flex justify-between"><span className="text-slate-500">Soil</span><span className="text-white">{activeField.soilType}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Moisture</span><span className="text-white">{activeField.soilMoisture}%</span></div>
                      <div className="flex justify-between"><span className="text-slate-500">Env factor</span><span className="text-violet-300">×{(activeField.yieldFactor ?? 1).toFixed(2)}</span></div>
                    </>
                  )}
                  {!activeField && (
                    <div className="text-slate-500">Select a field for soil-specific detail.</div>
                  )}
                </div>
              </div>

              {activeField && (
                <div className="mb-3 flex flex-wrap gap-1">
                  {(activeField.constraints || []).map((c) => (
                    <span key={c} className="text-[9px] px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-200 bg-amber-500/10">
                      {c}
                    </span>
                  ))}
                </div>
              )}

              <div className="rounded-lg bg-[#0b131e] border border-[#1e2d40] p-2 mb-3 overflow-x-auto">
                <div className="text-[10px] font-bold text-slate-300 mb-1">Field breakdown</div>
                <table className="w-full text-[9px] min-w-[360px]">
                  <thead>
                    <tr className="text-slate-500 border-b border-[#1e2d40]">
                      <th className="text-left py-1">Field</th>
                      <th className="text-right py-1">Yield</th>
                      <th className="text-right py-1">Revenue</th>
                      <th className="text-right py-1">Profit</th>
                      <th className="text-right py-1">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {zones.map((z) => (
                      <tr
                        key={z.id}
                        className={`border-b border-[#1e2d40]/40 ${selectedFieldId === z.id ? 'bg-violet-500/10' : ''}`}
                      >
                        <td className="py-1 text-white">{z.name}</td>
                        <td className="text-right text-slate-300">{z.yield} t</td>
                        <td className="text-right text-slate-300">{formatInr(z.revenue)}</td>
                        <td className="text-right text-emerald-300">{formatInr(z.profit)}</td>
                        <td className="text-right text-emerald-400">{z.margin}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={downloadReport}
                  className="flex-1 text-[11px] font-semibold py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center gap-1.5"
                >
                  <Download size={13} /> Download report (.txt)
                </button>
                <button
                  type="button"
                  onClick={() => setShowReport(false)}
                  className="text-[11px] font-semibold px-4 py-2 rounded-lg border border-[#1e2d40] text-slate-300 hover:border-slate-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SafeAnalyticsPanel;
