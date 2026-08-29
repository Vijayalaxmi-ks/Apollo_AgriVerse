import { useMemo, useState, useEffect } from 'react';
import {
  Droplets, Leaf, AlertTriangle, Info, Thermometer, Shield,
  Sprout, CheckCircle2, Activity,
} from 'lucide-react';
import type { SimState, FieldInfo } from './simulation';
import { useFarmOptional } from './context/FarmContext';
import { FIELDS } from './simulation';

type ZoneRow = {
  id: string;
  name: string;
  coverage: number;
  moisture: number;
  weedControl: number;
  degradation: number;
  health: 'Excellent' | 'Good' | 'Fair';
};

function buildZones(sim: SimState, fields: FieldInfo[] = FIELDS): ZoneRow[] {
  const baseCov = sim.mulchCoverage;
  const baseMoist = sim.env.soilMoisture;
  return fields.map((f, i) => {
    const off = [2, 4, -1, -5][i] ?? 0;
    const coverage = Math.max(70, Math.min(98, Math.round(baseCov + off + (f.health - 85) * 0.15)));
    const moisture = Math.max(45, Math.min(85, Math.round(baseMoist + off * 0.8 + (f.soilMoisture - 60) * 0.2)));
    const weedControl = Math.max(60, Math.min(95, Math.round(78 + off + coverage * 0.08)));
    const degradation = Math.max(10, Math.min(35, Math.round(14 + (100 - coverage) * 0.25 + i * 2)));
    const health: ZoneRow['health'] =
      coverage >= 90 && degradation <= 18 ? 'Excellent' : coverage >= 82 ? 'Good' : 'Fair';
    return { id: f.id, name: f.name, coverage, moisture, weedControl, degradation, health };
  });
}

const DAYS = ['14', '15', '16', '17', '18', '19', '20'];

function LineChart({
  series,
  height = 64,
}: {
  series: { label: string; color: string; values: number[]; highlight?: boolean }[];
  height?: number;
}) {
  const w = 300;
  const h = height;
  const padX = 4;
  const padY = 6;
  const all = series.flatMap((s) => s.values);
  const min = Math.min(...all) * 0.9;
  const max = Math.max(...all) * 1.05;
  const n = series[0]?.values.length || 1;
  const x = (i: number) => padX + (i / Math.max(1, n - 1)) * (w - padX * 2);
  const y = (v: number) => h - padY - ((v - min) / Math.max(0.01, max - min)) * (h - padY * 2);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full block" style={{ height }} preserveAspectRatio="none">
      {[0.33, 0.66].map((t) => (
        <line key={t} x1={padX} x2={w - padX} y1={padY + t * (h - padY * 2)} y2={padY + t * (h - padY * 2)} stroke="#1e2d40" strokeWidth="1" />
      ))}
      {series.map((s) => {
        const d = s.values.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ');
        return (
          <path
            key={s.label}
            d={d}
            fill="none"
            stroke={s.color}
            strokeWidth={s.highlight ? 2.5 : 1.5}
            strokeLinecap="round"
            opacity={s.highlight === false ? 0.5 : 1}
          />
        );
      })}
    </svg>
  );
}

function MiniGauge({ value, label, color = '#22c55e', size = 56 }: { value: number; label: string; color?: string; size?: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox="0 0 48 48" className="-rotate-90">
        <circle cx="24" cy="24" r={r} stroke="#1e2d40" strokeWidth="5" fill="none" />
        <circle
          cx="24" cy="24" r={r} stroke={color} strokeWidth="5" fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(100, value) / 100)}
          strokeLinecap="round"
        />
      </svg>
      <div className="text-[11px] font-bold text-white -mt-8 mb-3">{Math.round(value)}%</div>
      <div className="text-[8px] text-slate-400 text-center leading-tight">{label}</div>
    </div>
  );
}

/** Rich vineyard coverage map with perspective rows + plants */
function CoverageMap({ zones, selected, onSelect }: { zones: ZoneRow[]; selected: string; onSelect: (id: string) => void }) {
  const rowColor = (cov: number) => {
    if (cov >= 90) return ['#1a1a1a', '#3f3f46', '#27272a'];
    if (cov >= 75) return ['#1c1917', '#44403c', '#292524'];
    return ['#292524', '#57534e', '#3f3f46'];
  };

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-[#1e2d40] min-h-[260px] h-full">
      {/* Sky gradient + sun */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0c4a6e]/50 via-[#0f172a] to-[#1c1917]" />
      <div className="absolute top-3 right-10 w-8 h-8 rounded-full bg-amber-300/80 blur-[1px] shadow-[0_0_24px_rgba(252,211,77,0.5)]" />
      <div className="absolute top-6 left-[15%] w-16 h-4 rounded-full bg-white/10 blur-sm" />
      <div className="absolute top-10 left-[40%] w-20 h-5 rounded-full bg-white/10 blur-sm" />

      {/* Perspective field SVG */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="soilGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#78716c" />
            <stop offset="100%" stopColor="#292524" />
          </linearGradient>
          <linearGradient id="mulchShine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#18181b" />
            <stop offset="40%" stopColor="#52525b" />
            <stop offset="60%" stopColor="#18181b" />
            <stop offset="100%" stopColor="#3f3f46" />
          </linearGradient>
        </defs>
        {/* distant hills */}
        <ellipse cx="200" cy="70" rx="220" ry="28" fill="#14532d" opacity="0.35" />
        {/* soil base */}
        <path d="M0 90 L400 90 L400 220 L0 220 Z" fill="url(#soilGrad)" />
      </svg>

      {/* Interactive mulch rows */}
      <div className="absolute inset-x-0 bottom-0 top-12 flex flex-col justify-end px-4 pb-3 gap-1.5">
        {zones.map((z, i) => {
          const colors = rowColor(z.coverage);
          const scale = 1 - i * 0.04;
          return (
            <button
              key={z.id}
              type="button"
              onClick={() => onSelect(z.id)}
              className={`relative mx-auto transition-all ${
                selected === z.id ? 'ring-2 ring-emerald-400/60 scale-[1.02] z-10' : 'hover:brightness-110'
              }`}
              style={{
                width: `${88 - i * 4}%`,
                height: 36 + (zones.length - i) * 2,
              }}
            >
              {/* mulch film */}
              <div
                className="absolute inset-0 rounded-md overflow-hidden shadow-lg"
                style={{
                  background: `linear-gradient(105deg, ${colors[0]} 0%, ${colors[1]} 35%, ${colors[0]} 55%, ${colors[2]} 100%)`,
                  transform: `perspective(400px) rotateX(${6 - i}deg)`,
                }}
              >
                {/* shine lines */}
                <div className="absolute inset-0 opacity-30"
                  style={{ background: 'repeating-linear-gradient(90deg, transparent, transparent 28px, rgba(255,255,255,0.08) 28px, rgba(255,255,255,0.08) 30px)' }}
                />
                {/* plants */}
                <div className="absolute inset-0 flex items-end justify-around px-3 pb-1">
                  {Array.from({ length: 7 - i }).map((_, j) => (
                    <div key={j} className="flex flex-col items-center" style={{ transform: `scale(${scale})` }}>
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/90 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
                      <div className="w-0.5 h-3 bg-emerald-700/80 -mt-0.5" />
                      <div className="flex -mt-1">
                        <div className="w-2 h-1.5 rounded-full bg-emerald-500/80 -rotate-12" />
                        <div className="w-2 h-1.5 rounded-full bg-lime-400/80 rotate-12 -ml-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* coverage badge */}
              <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-[11px] font-bold px-1.5 py-0.5 rounded-md shadow ${
                z.coverage >= 90 ? 'bg-emerald-500/90 text-white' :
                z.coverage >= 75 ? 'bg-lime-500/90 text-slate-900' :
                'bg-amber-500/90 text-slate-900'
              }`}>
                {z.name.replace('Field ', 'F')} · {z.coverage}%
              </span>
            </button>
          );
        })}
      </div>

      <div className="absolute top-2 left-3 text-[10px] font-bold text-white/90 tracking-wide drop-shadow">
        SMART MULCHING COVERAGE MAP
      </div>
      <div className="absolute top-2 right-3 flex flex-col gap-0.5 text-[8px] text-slate-300 bg-black/30 rounded-lg px-1.5 py-1 backdrop-blur-sm">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Optimal (&gt;90%)</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-lime-400" /> Good (70–90%)</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Moderate (50–70%)</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-400" /> Low (&lt;50%)</span>
      </div>
    </div>
  );
}

/** Cross-section of soil + mulch paper layers */
function MulchCrossSection({ moisture, coverage }: { moisture: number; coverage: number }) {
  return (
    <div className="w-full rounded-xl border border-[#1e2d40] bg-[#0b131e] p-2 overflow-hidden">
      <div className="text-[9px] font-bold text-slate-300 mb-1">SOIL × MULCH CROSS-SECTION</div>
      <svg viewBox="0 0 280 110" className="w-full h-[100px]">
        {/* sky */}
        <rect x="0" y="0" width="280" height="28" fill="#0c4a6e" opacity="0.35" />
        {/* plant */}
        <line x1="140" y1="28" x2="140" y2="8" stroke="#4ade80" strokeWidth="2" />
        <ellipse cx="132" cy="10" rx="8" ry="4" fill="#4ade80" transform="rotate(-25 132 10)" />
        <ellipse cx="148" cy="9" rx="8" ry="4" fill="#86efac" transform="rotate(20 148 9)" />
        {/* mulch paper layer */}
        <rect x="10" y="28" width="260" height="8" rx="1" fill="#27272a" stroke="#52525b" strokeWidth="0.5" />
        <text x="20" y="34" fill="#a1a1aa" fontSize="6">Mulch film ({coverage}%)</text>
        {/* soil layers */}
        <rect x="10" y="36" width="260" height="22" fill="#a67c52" />
        <rect x="10" y="58" width="260" height="24" fill="#8b6914" />
        <rect x="10" y="82" width="260" height="24" fill="#5c4033" />
        <text x="18" y="50" fill="#fef3c7" fontSize="6">Topsoil · moisture {moisture}%</text>
        <text x="18" y="72" fill="#fde68a" fontSize="6">Root zone</text>
        <text x="18" y="96" fill="#d6d3d1" fontSize="6">Subsoil</text>
        {/* moisture droplets */}
        {Array.from({ length: Math.max(3, Math.round(moisture / 15)) }).map((_, i) => (
          <circle key={i} cx={60 + i * 35} cy={48 + (i % 2) * 8} r="2.5" fill="#38bdf8" opacity="0.7" />
        ))}
        {/* roots */}
        <path d="M140 36 Q130 55 120 78 M140 36 Q150 55 160 78 M140 36 Q140 60 140 90" stroke="#c4a574" strokeWidth="1.2" fill="none" opacity="0.8" />
      </svg>
    </div>
  );
}

export default function MulchingPanel({ sim, fields: fieldsProp }: { sim: SimState; fields?: FieldInfo[] }) {
  const fields = fieldsProp?.length ? fieldsProp : FIELDS;
  const farmCtx = useFarmOptional();
  const twinMulch = farmCtx?.twinState?.mulch;
  const backendDeg = twinMulch?.mulch_degradation_pct;
  const backendCool = twinMulch?.effective_mulch_cooling_c;

  const [selectedZone, setSelectedZone] = useState(fields[0]?.id || 'A');
  const zones = useMemo(() => buildZones(sim, fields), [sim, fields]);
  useEffect(() => {
    const ids = fields.map((f) => f.id);
    if (!ids.includes(selectedZone)) setSelectedZone(ids[0] || 'A');
  }, [fields, selectedZone]);
  const liveDeg = backendDeg != null ? Number(backendDeg) : null;
  const liveCool = backendCool != null ? Number(backendCool) : null;
  const active = zones.find((z) => z.id === selectedZone) || zones[0];
  const fieldMeta = fields.find((f) => f.id === selectedZone) || fields[0];

  const avgCoverage = Math.round(zones.reduce((s, z) => s + z.coverage, 0) / zones.length);
  const avgMoisture = Math.round(zones.reduce((s, z) => s + z.moisture, 0) / zones.length);
  const avgWeed = Math.round(zones.reduce((s, z) => s + z.weedControl, 0) / zones.length);
  const avgDeg = Math.round(zones.reduce((s, z) => s + z.degradation, 0) / zones.length);

  // Field-selected metrics
  const cov = active.coverage;
  const moist = active.moisture;
  const weed = active.weedControl;
  const deg = active.degradation;
  const soilTemp = +(25.8 - (cov - 85) * 0.04 - (sim.env.temperature - 28) * -0.05).toFixed(1);
  const tempDrop = +(2.0 + (cov - 80) * 0.02).toFixed(1);
  const daysRemaining = Math.max(20, Math.round(120 - deg * 2.2 - 40));
  const daysElapsed = 40;
  const ecoSavings = +(18 + (cov - 80) * 0.35 + weed * 0.05).toFixed(1);
  const waterSaved = Math.round(32000 + moist * 180 + fieldMeta.acres * 2500);
  const healthScore = Math.min(100, Math.round(cov * 0.45 + weed * 0.3 + (100 - deg) * 0.25));
  const yieldBoost = +(12 + (cov - 85) * 0.4 + moist * 0.05).toFixed(1);
  const erosionControl = Math.min(98, Math.round(80 + cov * 0.12));

  const moistureTrend = [
    { label: 'With Mulch', color: '#22c55e', highlight: true, values: DAYS.map((_, i) => Math.min(95, moist - 8 + i * 1.2 + Math.sin(i) * 2)) },
    { label: 'Without Mulch', color: '#a78bfa', highlight: false, values: DAYS.map((_, i) => Math.min(80, moist - 22 + i * 0.6 + Math.sin(i + 1) * 3)) },
    { label: 'Field Avg', color: '#06b6d4', highlight: false, values: DAYS.map((_, i) => Math.min(90, avgMoisture - 12 + i * 0.9 + Math.cos(i) * 2)) },
  ];
  const tempTrend = [
    { label: 'With Mulch', color: '#22c55e', highlight: true, values: DAYS.map((_, i) => soilTemp - 1 + i * 0.15 + Math.sin(i) * 0.8) },
    { label: 'Without Mulch', color: '#a78bfa', highlight: false, values: DAYS.map((_, i) => soilTemp + 6 + i * 0.2 + Math.sin(i) * 1.2) },
    { label: 'Field Avg', color: '#06b6d4', highlight: false, values: DAYS.map((_, i) => soilTemp + 2 + i * 0.1 + Math.cos(i) * 0.6) },
  ];
  const weedTrend = [
    { label: 'With Mulch', color: '#22c55e', highlight: true, values: DAYS.map((_, i) => Math.min(98, weed - 10 + i * 1.5 + Math.sin(i) * 2)) },
    { label: 'Without Mulch', color: '#a78bfa', highlight: false, values: DAYS.map((_, i) => Math.min(70, weed - 35 + i * 0.8 + Math.sin(i) * 3)) },
    { label: 'Field Avg', color: '#06b6d4', highlight: false, values: DAYS.map((_, i) => Math.min(90, avgWeed - 18 + i * 1.1 + Math.cos(i) * 2)) },
  ];

  const composition = [
    { name: 'Cellulose Fiber', pct: 45, color: '#3b82f6' },
    { name: 'PLA (Polylactic Acid)', pct: 25, color: '#06b6d4' },
    { name: 'Natural Additives', pct: 15, color: '#eab308' },
    { name: 'Strength Enhancers', pct: 10, color: '#f97316' },
    { name: 'Others', pct: 5, color: '#8b5cf6' },
  ];

  const panel = 'bg-[#121a27] rounded-xl border border-[#1e2d40]';

  return (
    <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden bg-[#0b131e]">
      <div className="p-3 space-y-2.5">
        {/* Header + field switcher */}
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-base font-bold tracking-wide leading-tight">
              <span className="text-white">SMART </span>
              <span className="text-violet-300">MULCHING PAPER</span>
            </h1>
            <p className="text-[10px] text-slate-500">
              Intelligent Coverage · Soil Protection · Moisture Optimization ·{' '}
              <span className="text-violet-300 font-semibold">{active.name}</span>
            </p>
            {(liveDeg != null || liveCool != null) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-amber-100/90">
                <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-semibold text-amber-200">
                  Backend twin
                </span>
                {liveDeg != null && <span>Degradation <strong>{liveDeg.toFixed(0)}%</strong></span>}
                {liveCool != null && <span>Cooling <strong>{liveCool.toFixed(1)}°C</strong></span>}
                <button
                  type="button"
                  className="underline text-amber-300 hover:text-amber-100"
                  onClick={() => void farmCtx?.stepTwinFromLive?.()}
                >
                  Step twin → apollo_twin.db
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {zones.map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => setSelectedZone(z.id)}
                className={`text-[10px] px-2.5 py-1 rounded-lg border font-semibold transition ${
                  selectedZone === z.id
                    ? 'bg-violet-600/30 border-violet-400/50 text-violet-100'
                    : 'bg-[#121a27] border-[#1e2d40] text-slate-400 hover:border-slate-500'
                }`}
              >
                {z.name}
              </button>
            ))}
          </div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { icon: <Activity size={14} className="text-emerald-400" />, t: 'FIELD COVERAGE', v: `${cov}%`, s: cov >= 90 ? 'Optimal' : cov >= 75 ? 'Good' : 'Fair', sc: cov >= 90 ? 'text-emerald-400' : 'text-amber-400' },
            { icon: <Thermometer size={14} className="text-sky-400" />, t: 'SOIL TEMPERATURE', v: `${soilTemp}°C`, s: `↓ ${tempDrop}°C`, sc: 'text-sky-400' },
            { icon: <Droplets size={14} className="text-cyan-400" />, t: 'SOIL MOISTURE', v: `${moist}%`, s: moist >= 55 && moist <= 75 ? 'Optimal' : 'Watch', sc: moist >= 55 && moist <= 75 ? 'text-emerald-400' : 'text-amber-400' },
            { icon: <Sprout size={14} className="text-lime-400" />, t: 'WEED SUPPRESSION', v: `${weed}%`, s: weed >= 80 ? 'High' : 'Moderate', sc: weed >= 80 ? 'text-emerald-400' : 'text-amber-400' },
            { icon: <Shield size={14} className="text-blue-400" />, t: 'MULCH DURABILITY', v: `${daysRemaining} Days`, s: 'Remaining', sc: 'text-slate-400' },
            { icon: <Leaf size={14} className="text-emerald-400" />, t: 'ECO SAVINGS', v: `${ecoSavings}%`, s: 'vs. Traditional', sc: 'text-emerald-400' },
          ].map((k) => (
            <div key={k.t} className={`${panel} px-2.5 py-2`}>
              <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-semibold uppercase tracking-wide">
                {k.icon}{k.t}
              </div>
              <div className="text-lg font-bold text-white leading-tight mt-0.5">{k.v}</div>
              <div className={`text-[10px] ${k.sc}`}>{k.s}</div>
            </div>
          ))}
        </div>

        {/* Main band: map fills left; status + benefits fill right — same visual weight */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 items-stretch">
          {/* LEFT: map + specs + 2 trend charts stacked under map (fills height) */}
          <div className="lg:col-span-7 flex flex-col gap-2">
            <div className={`${panel} p-2 flex-1`}>
              <CoverageMap zones={zones} selected={selectedZone} onSelect={setSelectedZone} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5">
              {[
                ['Mulch Type', 'Biodegradable Paper'],
                ['Roll Width', '1.2 m'],
                ['Thickness', '120 GSM'],
                ['Installation Date', '10 Apr 2025'],
                ['Expected Life', '90 – 120 Days'],
                ['Degradation Status', `Normal (${deg}%)`],
              ].map(([l, v]) => (
                <div key={l} className={`${panel} px-2 py-1.5 text-center`}>
                  <div className="text-[8px] text-slate-500">{l}</div>
                  <div className="text-[10px] font-semibold text-white leading-snug">{v}</div>
                </div>
              ))}
            </div>

            {/* Visual gauges + cross-section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className={`${panel} p-2 flex items-center justify-around gap-1`}>
                <MiniGauge value={cov} label="Coverage" color="#22c55e" />
                <MiniGauge value={moist} label="Moisture" color="#38bdf8" />
                <MiniGauge value={weed} label="Weed Ctrl" color="#a3e635" />
                <MiniGauge value={100 - deg} label="Integrity" color="#c084fc" />
              </div>
              <MulchCrossSection moisture={moist} coverage={cov} />
            </div>

            {/* Trends sit under map */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { title: 'SOIL MOISTURE (7D)', series: moistureTrend },
                { title: 'SOIL TEMPERATURE (7D)', series: tempTrend },
                { title: 'WEED SUPPRESSION (7D)', series: weedTrend },
              ].map((c) => (
                <div key={c.title} className={`${panel} p-2`}>
                  <div className="text-[9px] font-bold text-slate-300 mb-0.5">{c.title}</div>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mb-0.5 text-[7px] text-slate-500">
                    {c.series.map((s) => (
                      <span key={s.label} className="inline-flex items-center gap-0.5">
                        <span className="w-1.5 h-0.5 rounded-full" style={{ background: s.color }} />
                        {s.label}
                      </span>
                    ))}
                  </div>
                  <LineChart series={c.series} height={56} />
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: status + benefits stacked full height */}
          <div className="lg:col-span-5 flex flex-col gap-2">
            <div className={`${panel} p-3 flex-1`}>
              <h2 className="text-[11px] font-bold text-white tracking-wide mb-2">CURRENT MULCH STATUS</h2>
              <div className="space-y-1 text-[10px]">
                {[
                  ['Mulch Type', 'Biodegradable Paper'],
                  ['Material Composition', 'Cellulose + PLA'],
                  ['Roll Width', '1.2 m'],
                  ['Thickness', '120 GSM'],
                  ['Field Coverage', `${cov}%`],
                  ['Days Since Installation', `${daysElapsed} Days`],
                  ['Degradation Status', `Normal (${deg}%)`],
                  ['Remaining Life', `${daysRemaining} Days`],
                  ['Next Replacement', '07 Aug 2025'],
                  ['Field', `${active.name} · ${fieldMeta.soilType}`],
                  ['Soil Moisture', `${moist}%`],
                  ['Weed Suppression', `${weed}%`],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between gap-2 border-b border-[#1e2d40]/50 py-0.5 last:border-0">
                    <span className="text-slate-500">{l}</span>
                    <span className="text-slate-200 text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${panel} p-3`}>
              <h2 className="text-[11px] font-bold text-white tracking-wide mb-2">BENEFITS & IMPACT</h2>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: <Droplets size={14} className="mx-auto text-cyan-400 mb-0.5" />, l: 'Water Saved', v: `${waterSaved.toLocaleString()} L`, s: '↑ vs traditional', sc: 'text-emerald-400' },
                  { icon: <Sprout size={14} className="mx-auto text-lime-400 mb-0.5" />, l: 'Weed Control', v: `${weed}%`, s: 'High Efficiency', sc: 'text-emerald-400' },
                  { icon: <Droplets size={14} className="mx-auto text-sky-400 mb-0.5" />, l: 'Soil Moisture', v: `${moist}%`, s: 'Retention', sc: 'text-emerald-400' },
                  { icon: <Thermometer size={14} className="mx-auto text-sky-400 mb-0.5" />, l: 'Soil Temp', v: `↓ ${tempDrop}°C`, s: 'Cooler Soil', sc: 'text-sky-400' },
                  { icon: <Shield size={14} className="mx-auto text-amber-400 mb-0.5" />, l: 'Erosion Control', v: `${erosionControl}%`, s: 'High Protection', sc: 'text-amber-400' },
                  { icon: <Leaf size={14} className="mx-auto text-emerald-400 mb-0.5" />, l: 'Yield Improve', v: `↑ ${yieldBoost}%`, s: 'Better Productivity', sc: 'text-emerald-400' },
                ].map((b) => (
                  <div key={b.l} className="rounded-lg bg-[#0b131e] border border-[#1e2d40] p-2 text-center">
                    {b.icon}
                    <div className="text-[8px] text-slate-500">{b.l}</div>
                    <div className="text-sm font-bold text-white leading-tight">{b.v}</div>
                    <div className={`text-[8px] ${b.sc}`}>{b.s}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom analytics — dense, no empty gaps */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-2">
          {/* Health score */}
          <div className={`${panel} p-3 xl:col-span-2 flex flex-col items-center justify-center min-h-[160px]`}>
            <div className="text-[9px] text-slate-500 font-semibold uppercase mb-1 text-center">Mulch Health Score</div>
            <div className="relative w-20 h-20">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="36" stroke="#1e2d40" strokeWidth="8" fill="none" />
                <circle
                  cx="50" cy="50" r="36" stroke="#22c55e" strokeWidth="8" fill="none"
                  strokeDasharray={2 * Math.PI * 36}
                  strokeDashoffset={2 * Math.PI * 36 * (1 - healthScore / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-white leading-none">{healthScore}</span>
                <span className="text-[8px] text-slate-500">/100</span>
              </div>
            </div>
            <div className="text-emerald-400 text-[11px] font-bold mt-1">
              {healthScore >= 85 ? 'Excellent' : healthScore >= 70 ? 'Good' : 'Fair'}
            </div>
            <div className="text-[8px] text-slate-500 text-center">Overall · {active.name}</div>
            <div className="w-full mt-2 space-y-1">
              {[
                { l: 'Coverage', v: cov },
                { l: 'Weed ctrl', v: weed },
                { l: 'Integrity', v: 100 - deg },
              ].map((b) => (
                <div key={b.l} className="flex items-center gap-1.5 text-[8px]">
                  <span className="w-12 text-slate-500">{b.l}</span>
                  <div className="flex-1 h-1 rounded-full bg-[#0b131e] overflow-hidden">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${b.v}%` }} />
                  </div>
                  <span className="text-slate-400 w-6 text-right">{b.v}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Zone table */}
          <div className={`${panel} p-2.5 xl:col-span-4 overflow-x-auto min-h-[160px]`}>
            <div className="text-[10px] font-bold text-slate-300 mb-1">ZONE-WISE MULCH PERFORMANCE</div>
            <table className="w-full text-[10px] min-w-[360px]">
              <thead>
                <tr className="text-slate-500 border-b border-[#1e2d40]">
                  <th className="text-left py-1 font-medium">Zone</th>
                  <th className="text-right py-1 font-medium">Coverage</th>
                  <th className="text-right py-1 font-medium">Moisture</th>
                  <th className="text-right py-1 font-medium">Weed Ctrl</th>
                  <th className="text-right py-1 font-medium">Degrad.</th>
                  <th className="text-right py-1 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((z) => (
                  <tr
                    key={z.id}
                    onClick={() => setSelectedZone(z.id)}
                    className={`border-b border-[#1e2d40]/40 cursor-pointer hover:bg-white/[0.03] ${selectedZone === z.id ? 'bg-violet-500/10' : ''}`}
                  >
                    <td className="py-1.5 text-white font-medium">{z.name}</td>
                    <td className="text-right text-slate-200">{z.coverage}%</td>
                    <td className="text-right text-slate-200">{z.moisture}%</td>
                    <td className="text-right text-slate-200">{z.weedControl}%</td>
                    <td className={`text-right ${z.degradation > 20 ? 'text-amber-400' : 'text-slate-300'}`}>{z.degradation}%</td>
                    <td className={`text-right font-semibold ${
                      z.health === 'Excellent' ? 'text-emerald-400' : z.health === 'Good' ? 'text-lime-400' : 'text-amber-400'
                    }`}>{z.health}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Composition + material props */}
          <div className={`${panel} p-2.5 xl:col-span-3 min-h-[160px]`}>
            <div className="text-[10px] font-bold text-slate-300 mb-2">MULCH COMPOSITION & SPECS</div>
            <div className="flex gap-3 items-start">
              <svg viewBox="0 0 80 80" className="w-16 h-16 shrink-0">
                {(() => {
                  let ang = -Math.PI / 2;
                  return composition.map((c) => {
                    const slice = (c.pct / 100) * Math.PI * 2;
                    const x1 = 40 + Math.cos(ang) * 32;
                    const y1 = 40 + Math.sin(ang) * 32;
                    ang += slice;
                    const x2 = 40 + Math.cos(ang) * 32;
                    const y2 = 40 + Math.sin(ang) * 32;
                    const large = slice > Math.PI ? 1 : 0;
                    return <path key={c.name} d={`M40 40 L${x1} ${y1} A32 32 0 ${large} 1 ${x2} ${y2} Z`} fill={c.color} />;
                  });
                })()}
                <circle cx="40" cy="40" r="14" fill="#121a27" />
                <text x="40" y="43" textAnchor="middle" fill="#e2e8f0" fontSize="8" fontWeight="700">100%</text>
              </svg>
              <div className="flex-1 space-y-0.5 text-[9px] min-w-0">
                {composition.map((c) => (
                  <div key={c.name} className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.color }} />
                    <span className="text-slate-400 truncate flex-1">{c.name}</span>
                    <span className="text-slate-300">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-2">
              {[
                ['UV Resistance', 'High'],
                ['Tensile Strength', '18 MPa'],
                ['Water Permeability', 'Low'],
                ['Biodegrade window', '90–120 d'],
                ['Color / side', 'Black / Silver'],
                ['Certifications', 'ISO · OK Biodeg.'],
              ].map(([l, v]) => (
                <div key={l} className="rounded bg-[#0b131e] border border-[#1e2d40] px-1.5 py-1">
                  <div className="text-[7px] text-slate-500 leading-none">{l}</div>
                  <div className="text-[10px] font-semibold text-white">{v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Degradation + timeline */}
          <div className={`${panel} p-2.5 xl:col-span-3 min-h-[160px]`}>
            <div className="text-[10px] font-bold text-slate-300 mb-2">DEGRADATION & LIFECYCLE</div>
            <div className="flex items-center gap-3">
              <div className="relative w-16 h-16 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="36" stroke="#1e2d40" strokeWidth="9" fill="none" />
                  <circle
                    cx="50" cy="50" r="36" stroke="#22c55e" strokeWidth="9" fill="none"
                    strokeDasharray={2 * Math.PI * 36}
                    strokeDashoffset={2 * Math.PI * 36 * (1 - deg / 100)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{deg}%</div>
              </div>
              <div className="flex-1 space-y-1 text-[9px]">
                <div className="flex justify-between"><span className="text-slate-500">Total degradation</span><span className="text-white font-semibold">{deg}%</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Days elapsed</span><span className="text-white">{daysElapsed} d</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Days remaining</span><span className="text-emerald-400 font-semibold">{daysRemaining} d</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Next replacement</span><span className="text-white">07 Aug 2025</span></div>
              </div>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#0b131e] mt-2 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-lime-400 rounded-full" style={{ width: `${deg}%` }} />
            </div>
            {/* Mini timeline */}
            <div className="mt-2 flex items-center gap-1 text-[8px]">
              {[
                { l: 'Install', d: '10 Apr', on: true },
                { l: 'Mid-life', d: '10 Jun', on: daysElapsed >= 60 },
                { l: 'Inspect', d: '20 Jul', on: false },
                { l: 'Replace', d: '07 Aug', on: false },
              ].map((t, i, arr) => (
                <div key={t.l} className="flex-1 flex flex-col items-center relative">
                  <div className={`w-2 h-2 rounded-full z-10 ${t.on ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                  {i < arr.length - 1 && (
                    <div className="absolute top-1 left-1/2 w-full h-px bg-[#1e2d40]" />
                  )}
                  <div className="text-slate-400 mt-1">{t.l}</div>
                  <div className="text-slate-500">{t.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Extra feature row — fills remaining space */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
          {/* With vs without comparison */}
          <div className={`${panel} p-2.5`}>
            <div className="text-[10px] font-bold text-slate-300 mb-2">WITH vs WITHOUT MULCH · {active.name}</div>
            <div className="space-y-1.5 text-[10px]">
              {[
                { l: 'Soil moisture', w: moist, wo: Math.max(30, moist - 18) },
                { l: 'Weed pressure', w: Math.max(5, 100 - weed), wo: Math.min(95, 100 - weed + 35) },
                { l: 'Soil temp (°C)', w: soilTemp, wo: +(soilTemp + tempDrop).toFixed(1) },
                { l: 'Irrigation need', w: 55, wo: 85 },
              ].map((r) => (
                <div key={r.l}>
                  <div className="flex justify-between text-slate-500 mb-0.5">
                    <span>{r.l}</span>
                    <span className="text-slate-400">W {r.w} · WO {r.wo}</span>
                  </div>
                  <div className="flex gap-1 h-1.5">
                    <div className="flex-1 rounded-full bg-[#0b131e] overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, Number(r.w))}%` }} />
                    </div>
                    <div className="flex-1 rounded-full bg-[#0b131e] overflow-hidden">
                      <div className="h-full bg-violet-500/70 rounded-full" style={{ width: `${Math.min(100, Number(r.wo))}%` }} />
                    </div>
                  </div>
                </div>
              ))}
              <div className="flex gap-3 text-[8px] text-slate-500 pt-0.5">
                <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-emerald-500" /> With mulch</span>
                <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-violet-500" /> Without</span>
              </div>
            </div>
          </div>

          {/* Cost & savings */}
          <div className={`${panel} p-2.5`}>
            <div className="text-[10px] font-bold text-slate-300 mb-2">COST & RESOURCE SAVINGS</div>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { l: 'Water cost saved', v: `₹${Math.round(waterSaved * 0.04).toLocaleString()}` },
                { l: 'Labor hours saved', v: `${Math.round(12 + fieldMeta.acres * 3.5)} h` },
                { l: 'Herbicide reduction', v: `${Math.min(70, Math.round(weed * 0.55))}%` },
                { l: 'Est. ROI cycle', v: `${(1.4 + cov / 100).toFixed(1)}×` },
                { l: 'Plastic avoided', v: `${(fieldMeta.acres * 28).toFixed(0)} kg` },
                { l: 'CO₂e reduction', v: `${(fieldMeta.acres * 9.2).toFixed(0)} kg` },
              ].map((c) => (
                <div key={c.l} className="rounded-lg bg-[#0b131e] border border-[#1e2d40] px-2 py-1.5">
                  <div className="text-[8px] text-slate-500">{c.l}</div>
                  <div className="text-sm font-bold text-emerald-300">{c.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI recommendations expanded */}
          <div className={`${panel} p-2.5`}>
            <div className="text-[10px] font-bold text-slate-300 mb-2">AI RECOMMENDATIONS · {active.name}</div>
            <div className="space-y-1.5 text-[9px]">
              {cov >= 90 ? (
                <div className="flex gap-1.5 items-start rounded bg-[#0b131e] border border-[#1e2d40] p-1.5">
                  <CheckCircle2 size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">Mulch performing optimally — continue current strategy</span>
                </div>
              ) : (
                <div className="flex gap-1.5 items-start rounded bg-[#0b131e] border border-[#1e2d40] p-1.5">
                  <AlertTriangle size={12} className="text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">Coverage {cov}% — inspect row gaps and wind lift on {active.name}</span>
                </div>
              )}
              <div className="flex gap-1.5 items-start rounded bg-[#0b131e] border border-[#1e2d40] p-1.5">
                <Droplets size={12} className="text-sky-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">Irrigation can be reduced ~15% while soil moisture stays in range</span>
              </div>
              {deg > 20 ? (
                <div className="flex gap-1.5 items-start rounded bg-[#0b131e] border border-[#1e2d40] p-1.5">
                  <AlertTriangle size={12} className="text-orange-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">Early degradation ({deg}%) — schedule inspection within 7 days</span>
                </div>
              ) : (
                <div className="flex gap-1.5 items-start rounded bg-[#0b131e] border border-[#1e2d40] p-1.5">
                  <Shield size={12} className="text-lime-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">Integrity good — no early replacement needed</span>
                </div>
              )}
              <div className="flex gap-1.5 items-start rounded bg-[#0b131e] border border-[#1e2d40] p-1.5">
                <Sprout size={12} className="text-violet-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">Plan organic / higher-GSM mulch for next season on {fieldMeta.soilType}</span>
              </div>
            </div>
          </div>

          {/* Alerts + install checklist */}
          <div className={`${panel} p-2.5`}>
            <div className="text-[10px] font-bold text-slate-300 mb-2">MULCH ALERTS & CHECKLIST</div>
            <div className="space-y-1 text-[9px] mb-2">
              <div className="flex gap-1.5 items-start">
                <CheckCircle2 size={11} className="text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">System normal · parameters optimal</span>
              </div>
              {zones.filter((z) => z.degradation > 20).map((z) => (
                <div key={z.id} className="flex gap-1.5 items-start">
                  <AlertTriangle size={11} className="text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">{z.name} degradation elevated ({z.degradation}%)</span>
                </div>
              ))}
              <div className="flex gap-1.5 items-start">
                <Info size={11} className="text-sky-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">Irrigation optimized · schedule updated</span>
              </div>
            </div>
            <div className="border-t border-[#1e2d40] pt-1.5">
              <div className="text-[9px] font-bold text-slate-400 mb-1">Field checklist</div>
              {[
                { t: 'Edges anchored', ok: true },
                { t: 'Plant holes clear', ok: true },
                { t: 'No major tears', ok: cov >= 85 },
                { t: 'Drainage paths open', ok: moist < 80 },
                { t: 'Weed breakthrough low', ok: weed >= 75 },
              ].map((c) => (
                <div key={c.t} className="flex items-center gap-1.5 text-[9px] py-0.5">
                  <span className={c.ok ? 'text-emerald-400' : 'text-amber-400'}>{c.ok ? '✓' : '!'}</span>
                  <span className="text-slate-300">{c.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
