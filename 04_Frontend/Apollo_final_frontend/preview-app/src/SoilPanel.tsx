import { useState, useMemo } from 'react';
import {
  Droplets, Thermometer, FlaskConical, Zap, Leaf, Shield,
  RefreshCw, MapPin, Info,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts';
import type { SoilClassId, FieldInfo } from './simulation';
import { SOIL_CLASSES, getSoilClass, FIELDS } from './simulation';
import { useFarmOptional } from './context/FarmContext';

type SoilTab =
  | 'overview'
  | 'npk'
  | 'moisture'
  | 'ph'
  | 'health'
  | 'micro'
  | 'hydrogels'
  | 'history';

const SOIL_TABS: { id: SoilTab; label: string }[] = [
  { id: 'overview', label: 'Soil Overview' },
  { id: 'npk', label: 'NPK Analysis' },
  { id: 'moisture', label: 'Moisture & Water' },
  { id: 'ph', label: 'pH & EC' },
  { id: 'health', label: 'Soil Health' },
  { id: 'micro', label: 'Microbiology' },
  { id: 'hydrogels', label: 'Hydrogels' },
  { id: 'history', label: 'History' },
];

const TOOLTIP = {
  background: '#0f1722',
  border: '1px solid #1e2d40',
  borderRadius: 8,
  fontSize: 11,
};

/* Defaults only used if evaluate has not returned yet */
const FALLBACK_METRICS = {
  moisture: 22.4,
  temp: 24.6,
  ph: 6.5,
  ec: 1.25,
  organic: 2.35,
  health: 78,
};

const FALLBACK_NPK = {
  n: { value: 120, target: '90-120', status: 'Engine default' },
  p: { value: 25, target: '20-40', status: 'Engine default' },
  k: { value: 200, target: '150-250', status: 'Engine default' },
};

const MICRO = [
  { name: 'Bacteria', value: 72, status: 'Good', color: '#34d399' },
  { name: 'Fungi', value: 65, status: 'Moderate', color: '#a3e635' },
  { name: 'Actinomycetes', value: 58, status: 'Moderate', color: '#fbbf24' },
  { name: 'Enzymatic Activity', value: 74, status: 'Good', color: '#34d399' },
];

const TEXTURE = [
  { name: 'Sand', value: 32, color: '#f97316' },
  { name: 'Silt', value: 38, color: '#3b82f6' },
  { name: 'Clay', value: 30, color: '#14b8a6' },
];

const DEPTHS = [
  { range: '0 - 15', label: 'Top Soil', status: 'Moist', color: 'text-cyan-400' },
  { range: '15 - 30', label: 'Root Zone', status: 'Moist', color: 'text-cyan-400' },
  { range: '30 - 60', label: 'Sub Soil', status: 'Slightly Dry', color: 'text-amber-400' },
  { range: '60 - 100', label: 'Deep Soil', status: 'Dry', color: 'text-rose-400' },
];

const NUTRIENTS = [
  { key: 'N', name: 'Nitrogen (N)', product: 'Urea / Ammonium Sulphate', amount: '20 kg/acre', action: 'Apply' },
  { key: 'P', name: 'Phosphorus (P₂O₅)', product: 'DAP / SSP', amount: '15 kg/acre', action: 'Apply' },
  { key: 'K', name: 'Potassium (K₂O)', product: 'MOP / SOP', amount: '10 kg/acre', action: 'Apply' },
  { key: 'OM', name: 'Organic Matter', product: 'FYM / Compost', amount: '100 kg/acre', action: 'Recommended' },
];

const INSIGHTS = [
  { icon: '🌱', text: 'Soil moisture is optimal for vine growth.' },
  { icon: '🧪', text: 'pH is slightly acidic, ideal for nutrient availability.' },
  { icon: '🍃', text: 'Increase organic matter to improve soil structure.' },
  { icon: '💧', text: 'Hydrogel status: Active · Water retention: Good' },
  { icon: '🛡️', text: 'Overall soil condition is Good for current stage.' },
];

/* ─── NPK ring gauge ─── */
function NpkRing({
  label,
  value,
  max,
  color,
  status,
  target,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  status: string;
  target: string;
}) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / max);
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[88px] h-[88px]">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} stroke="#1e2d40" strokeWidth="9" fill="none" />
          <circle
            cx="50"
            cy="50"
            r={r}
            stroke={color}
            strokeWidth="9"
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] font-bold" style={{ color }}>
            {label}
          </span>
          <span className="text-lg font-bold text-white leading-none">{value}</span>
        </div>
      </div>
      <div className={`text-[11px] font-semibold mt-1 ${status === 'Optimal' ? 'text-emerald-400' : 'text-amber-400'}`}>
        {status}
      </div>
      <div className="text-[10px] text-slate-500">Target: {target}</div>
    </div>
  );
}

/* ─── Mini trend sparkline ─── */
function MiniTrend({
  title,
  value,
  dataKey,
  color,
  data,
}: {
  title: string;
  value: string;
  dataKey: string;
  color: string;
  data: typeof TREND_7;
}) {
  return (
    <div className="bg-[#0f1722] rounded-xl border border-[#1e2d40] p-3 flex flex-col min-h-[120px]">
      <div className="text-[10px] text-slate-400 mb-0.5">{title}</div>
      <div className="text-lg font-bold text-white mb-1">{value}</div>
      <div className="flex-1 min-h-[56px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
            <XAxis dataKey="d" hide />
            <YAxis hide domain={['auto', 'auto']} />
            <Tooltip contentStyle={TOOLTIP} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ─── Field moisture heatmap (CSS grid) ─── */
function MoistureMap() {
  // 8×6 cells with varied moisture bands
  const cells = useMemo(() => {
    const rows = 6;
    const cols = 10;
    const out: number[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // center-ish higher moisture
        const dist = Math.hypot(r - 2.5, c - 5) / 6;
        const base = 28 - dist * 18 + ((r * 7 + c * 3) % 5) - 2;
        out.push(Math.max(8, Math.min(38, base)));
      }
    }
    return out;
  }, []);

  const colorFor = (v: number) => {
    if (v >= 30) return '#1d4ed8';
    if (v >= 22) return '#22c55e';
    if (v >= 15) return '#eab308';
    return '#ef4444';
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-[#1e2d40] bg-[#0a1628] h-full min-h-[200px]">
      {/* faux field backdrop */}
      <div className="absolute inset-0 opacity-40 bg-gradient-to-br from-emerald-950 via-slate-900 to-amber-950" />
      <div className="relative p-3 h-full flex flex-col">
        <div
          className="flex-1 grid gap-0.5 rounded-lg overflow-hidden border border-dashed border-emerald-500/40"
          style={{ gridTemplateColumns: 'repeat(10, 1fr)', gridTemplateRows: 'repeat(6, 1fr)' }}
        >
          {cells.map((v, i) => (
            <div key={i} style={{ background: colorFor(v) }} className="opacity-80" />
          ))}
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="w-7 h-7 rounded-full bg-emerald-500/30 border-2 border-emerald-400 flex items-center justify-center">
            <MapPin size={14} className="text-emerald-300" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 3D soil profile illustration (CSS) — colors follow selected soil class ─── */
function SoilProfile3D({ soilClassId }: { soilClassId: SoilClassId }) {
  const sc = getSoilClass(soilClassId);
  const layers = [
    { top: 36, h: 32, bg: sc.light, label: '0-15' },
    { top: 68, h: 36, bg: sc.base, label: '15-30' },
    { top: 104, h: 40, bg: sc.dark, label: '30-60' },
    { top: 144, h: 44, bg: '#1a120c', label: '60-100' },
  ];
  return (
    <div className="relative rounded-xl border border-[#1e2d40] bg-gradient-to-b from-[#0f2744] to-[#0a1525] overflow-hidden p-3 h-[280px]">
      <div className="text-[11px] font-bold text-slate-300 mb-2">3D SOIL PROFILE · {sc.shortLabel}</div>
      <div className="relative mx-auto w-[200px] h-[200px]" style={{ perspective: '600px' }}>
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            transform: 'rotateX(18deg) rotateY(-28deg)',
            transformStyle: 'preserve-3d',
          }}
        >
          <div
            className="absolute inset-x-0 top-0 h-[36px] rounded-t-lg border border-emerald-700/50 flex items-end justify-center gap-6 pb-1"
            style={{ background: `linear-gradient(to bottom, #065f46, ${sc.base})` }}
          >
            <span className="text-2xl">🌿</span>
            <span className="text-2xl">🍇</span>
            <span className="text-2xl">🌿</span>
          </div>
          {layers.map((layer) => (
            <div
              key={layer.label}
              className="absolute inset-x-0 border-x border-b border-black/30"
              style={{ top: layer.top, height: layer.h, background: layer.bg }}
            >
              <div className="absolute left-3 top-2 flex flex-col gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400/80" />
                <span className="w-2 h-2 rounded-full bg-sky-400/60" />
              </div>
              <div className="absolute right-4 top-3 flex flex-col gap-1.5">
                <span className="w-2 h-2 rounded-full bg-lime-400/70" />
                <span className="w-2 h-2 rounded-full bg-violet-400/60" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-center gap-3 text-[9px] text-slate-400 mt-1">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400" /> Water</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-lime-400" /> Nutrients</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-violet-400" /> Hydrogels</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: sc.base }} /> Soil</span>
      </div>
    </div>
  );
}

/* ─── Main panel ─── */
export default function SoilPanel({
  soilClass = 'alluvial',
  setSoilClass,
  fieldSoilMap,
  setFieldSoil,
  selectedField = 'B',
  setSelectedField,
  fields: fieldsProp,
}: {
  soilClass?: SoilClassId;
  setSoilClass?: (id: SoilClassId) => void;
  fieldSoilMap?: Record<string, SoilClassId>;
  setFieldSoil?: (fieldId: string, soilId: SoilClassId) => void;
  selectedField?: string;
  setSelectedField?: (id: string) => void;
  fields?: FieldInfo[];
}) {
  const fields = fieldsProp?.length ? fieldsProp : FIELDS;
  const [tab, setTab] = useState<SoilTab>('overview');
  const [showIrrigation, setShowIrrigation] = useState(false);
  const [localSoil, setLocalSoil] = useState<SoilClassId>(soilClass);
  const farmCtx = useFarmOptional();
  const sp = farmCtx?.evaluateReport?.soil_profile;
  const focus = farmCtx?.evaluateReport?.focus_crop_assessment;
  const live = farmCtx?.liveWeather;
  const backendSoilReady = Boolean(sp);

  const soilScore =
    typeof focus?.score_tree?.soil === 'object'
      ? Number(focus?.score_tree?.soil?.score ?? 0)
      : 0;

  /** Prefer POST /api/evaluate soil_profile (KB NPK/moisture) + live weather + soil score */
  const METRICS = useMemo(() => {
    const ph = sp?.ph != null ? Number(sp.ph) : FALLBACK_METRICS.ph;
    const ec = sp?.ec != null ? Number(sp.ec) : FALLBACK_METRICS.ec;
    const organic = sp?.oc != null ? Number(sp.oc) : FALLBACK_METRICS.organic;
    const temp =
      sp?.temperature_c != null
        ? Number(sp.temperature_c)
        : live?.temperature ?? FALLBACK_METRICS.temp;
    const moisture =
      sp?.moisture_pct != null
        ? Number(sp.moisture_pct)
        : live?.humidity != null
          ? Math.round((22 * 0.6 + (live.humidity / 100) * 18) * 10) / 10
          : FALLBACK_METRICS.moisture;
    const health =
      sp?.health_score != null
        ? Math.round(Number(sp.health_score))
        : soilScore > 0
          ? Math.round(soilScore)
          : FALLBACK_METRICS.health;
    return { moisture, temp, ph, ec, organic, health };
  }, [sp, live, soilScore]);

  /** NPK from KnowledgeBase soil row via evaluate soil_profile */
  const NPK = useMemo(() => {
    const status = backendSoilReady ? 'From KnowledgeBase via evaluate' : 'Pending evaluate';
    const nVal = sp?.n != null ? Math.round(Number(sp.n)) : 120;
    const pVal = sp?.p != null ? Math.round(Number(sp.p)) : 25;
    const kVal = sp?.k != null ? Math.round(Number(sp.k)) : 200;
    return {
      n: { value: nVal, target: '90-300', status },
      p: { value: pVal, target: '15-40', status },
      k: { value: kVal, target: '150-600', status },
    };
  }, [sp, backendSoilReady]);

  const TREND_7 = useMemo(() => {
    const days = ['D-6', 'D-5', 'D-4', 'D-3', 'D-2', 'D-1', 'Today'];
    return days.map((d, i) => {
      const t = i / 6;
      return {
        d,
        moisture: Math.round((METRICS.moisture * (0.85 + t * 0.15)) * 10) / 10,
        ph: Math.round((METRICS.ph * (0.97 + t * 0.03)) * 100) / 100,
        ec: Math.round((METRICS.ec * (0.9 + t * 0.1)) * 100) / 100,
        temp: Math.round((METRICS.temp * (0.96 + t * 0.04)) * 10) / 10,
        organic: Math.round((METRICS.organic * (0.95 + t * 0.05)) * 100) / 100,
      };
    });
  }, [METRICS]);

  const updated = backendSoilReady
    ? `Evaluate · ${sp?.type || 'soil'} · ${farmCtx?.evaluateReport?.location?.district || ''}`
    : 'Loading suitability profile…';

  const activeSoilId = setSoilClass ? soilClass : localSoil;
  const setActiveSoil = (id: SoilClassId) => {
    if (setFieldSoil && selectedField) setFieldSoil(selectedField, id);
    else if (setSoilClass) setSoilClass(id);
    else setLocalSoil(id);
  };
  const soilInfo = getSoilClass(activeSoilId);

  const irrigationSchedule = [
    { day: 'Tomorrow', date: '21 May', time: '06:00 – 07:30', liters: 4500, method: 'Drip', zone: 'Zone 2', status: 'Scheduled' },
    { day: 'Thu', date: '22 May', time: '06:00 – 06:45', liters: 3200, method: 'Drip', zone: 'Zone 2', status: 'Planned' },
    { day: 'Sat', date: '24 May', time: '05:30 – 07:00', liters: 4800, method: 'Drip', zone: 'Zone 1–2', status: 'Planned' },
    { day: 'Mon', date: '26 May', time: '06:00 – 07:15', liters: 4000, method: 'Drip', zone: 'Zone 2', status: 'Planned' },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0b131e] overflow-hidden">
      <div
        className={`shrink-0 px-3 py-1.5 border-b text-[10px] flex flex-wrap items-center gap-2 ${
          backendSoilReady
            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200/90'
            : 'bg-amber-500/10 border-amber-500/25 text-amber-200/90'
        }`}
      >
        <span className="font-bold uppercase tracking-wider">
          {backendSoilReady ? 'Soil profile' : 'Loading soil profile'}
        </span>
        <span className="text-slate-500">·</span>
        <span>
          {backendSoilReady
            ? `type ${sp?.type || '—'} · pH ${sp?.ph ?? '—'} · N ${sp?.n ?? '—'} · P ${sp?.p ?? '—'} · K ${sp?.k ?? '—'} · moisture ${sp?.moisture_pct ?? '—'}% · health ${(sp?.health_score ?? soilScore) || '—'} · ${live?.city || ''}`
            : 'Suitability engine will populate NPK, moisture & health from the farm evaluate report'}
        </span>
        {farmCtx && (
          <button
            type="button"
            onClick={() => void farmCtx.refreshEvaluate()}
            className="ml-auto flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border border-emerald-500/40 text-emerald-300"
          >
            <RefreshCw size={10} className={farmCtx.evaluateLoading ? 'animate-spin' : ''} />
            Refresh evaluate
          </button>
        )}
      </div>
      {/* Sub-tabs */}
      <div className="shrink-0 border-b border-[#1e2d40] bg-[#0f1722] px-3 flex items-center gap-0.5 overflow-x-auto">
        {SOIL_TABS.map((tItem) => (
          <button
            key={tItem.id}
            type="button"
            onClick={() => { setTab(tItem.id); setShowIrrigation(false); }}
            className={`px-3 py-2.5 text-[11px] font-semibold whitespace-nowrap border-b-2 transition ${
              tab === tItem.id && !showIrrigation
                ? 'border-emerald-500 text-emerald-400 bg-emerald-900/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {tItem.label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* MAIN */}
        <div className="flex-1 overflow-y-auto p-4 min-w-0 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">
                {showIrrigation
                  ? 'IRRIGATION PLAN'
                  : tab === 'overview'
                    ? 'SOIL HEALTH OVERVIEW'
                    : SOIL_TABS.find((x) => x.id === tab)?.label.toUpperCase()}
              </h2>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Field {selectedField} &nbsp;•&nbsp; Block 3 &nbsp;•&nbsp; Zone 2
                {!showIrrigation && tab !== 'overview' && (
                  <span className="text-slate-500"> · Sensor data shared with overview</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-500">Last Updated: {updated}</span>
              <button
                type="button"
                className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border border-[#1e2d40] bg-[#16202d] text-slate-300 hover:text-emerald-300"
              >
                <RefreshCw size={12} /> Refresh Data
              </button>
            </div>
          </div>

          {/* ═══ IRRIGATION PLAN VIEW ═══ */}
          {showIrrigation && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowIrrigation(false)}
                  className="text-[11px] text-emerald-400 hover:underline"
                >
                  ← Back to soil overview
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Next irrigation', value: '1 Day', sub: '21 May, 06:00 IST' },
                  { label: 'Water required', value: '12,500 L', sub: 'Per acre (cycle)' },
                  { label: 'Method', value: 'Drip', sub: 'Pressure: 1.2 bar' },
                  { label: 'Soil moisture now', value: `${METRICS.moisture}%`, sub: 'Target: 25–30%' },
                ].map((c) => (
                  <div key={c.label} className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-3">
                    <div className="text-[10px] text-slate-400">{c.label}</div>
                    <div className="text-xl font-bold text-white mt-1">{c.value}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{c.sub}</div>
                  </div>
                ))}
              </div>

              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                <h3 className="text-xs font-bold text-white mb-3">Upcoming Schedule (Zone 2)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-[12px]">
                    <thead>
                      <tr className="text-slate-500 border-b border-[#1e2d40]">
                        <th className="text-left py-2 font-medium">Day</th>
                        <th className="text-left py-2 font-medium">Date</th>
                        <th className="text-left py-2 font-medium">Time window</th>
                        <th className="text-right py-2 font-medium">Volume</th>
                        <th className="text-left py-2 font-medium pl-3">Method</th>
                        <th className="text-left py-2 font-medium">Zone</th>
                        <th className="text-right py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {irrigationSchedule.map((row) => (
                        <tr key={row.date} className="border-b border-[#1e2d40]/50">
                          <td className="py-2.5 text-slate-300">{row.day}</td>
                          <td className="py-2.5 text-white font-medium">{row.date}</td>
                          <td className="py-2.5 text-slate-300 font-mono text-[11px]">{row.time}</td>
                          <td className="py-2.5 text-right text-sky-300 font-semibold">{row.liters.toLocaleString()} L</td>
                          <td className="py-2.5 text-slate-400 pl-3">{row.method}</td>
                          <td className="py-2.5 text-slate-400">{row.zone}</td>
                          <td className={`py-2.5 text-right font-semibold ${row.status === 'Scheduled' ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {row.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4 space-y-2 text-[12px]">
                  <h3 className="text-xs font-bold text-white mb-2">Why irrigate now?</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Root-zone moisture is trending toward the lower optimal band ({METRICS.moisture}%). Forecast shows limited rain in the next 48h.
                    A short drip cycle will restore 0–30 cm depth without waterlogging.
                  </p>
                  <ul className="text-slate-400 space-y-1 list-disc list-inside">
                    <li>Avoid irrigating during peak ET (11:00–15:00)</li>
                    <li>Maintain 1.0–1.4 bar at manifold</li>
                    <li>Flush laterals after fertigation</li>
                  </ul>
                </div>
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4 space-y-2 text-[12px]">
                  <h3 className="text-xs font-bold text-white mb-2">Fertigation window</h3>
                  <p className="text-slate-400 leading-relaxed">
                    Align N recommendation (20 kg/acre urea/AS) with the first scheduled drip on 21 May.
                    Inject during the middle third of the run for even distribution.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-[#0f1722] rounded-lg p-2 border border-[#1e2d40]">
                      <div className="text-[10px] text-slate-500">EC target (solution)</div>
                      <div className="text-white font-semibold">1.4–1.8 dS/m</div>
                    </div>
                    <div className="bg-[#0f1722] rounded-lg p-2 border border-[#1e2d40]">
                      <div className="text-[10px] text-slate-500">pH target (solution)</div>
                      <div className="text-white font-semibold">5.8–6.5</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ OVERVIEW ═══ */}
          {!showIrrigation && tab === 'overview' && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5">
                {[
                  { icon: <Droplets size={16} className="text-sky-400" />, label: 'Soil Moisture', value: `${METRICS.moisture}%`, status: 'Optimal', ok: true },
                  { icon: <Thermometer size={16} className="text-rose-400" />, label: 'Soil Temperature', value: `${METRICS.temp}°C`, status: 'Optimal', ok: true },
                  { icon: <FlaskConical size={16} className="text-lime-400" />, label: 'pH Level', value: String(METRICS.ph), status: 'Slightly Acidic', ok: true },
                  { icon: <Zap size={16} className="text-amber-400" />, label: 'EC (dS/m)', value: String(METRICS.ec), status: 'Optimal', ok: true },
                  { icon: <Leaf size={16} className="text-emerald-400" />, label: 'Organic Matter', value: `${METRICS.organic}%`, status: 'Good', ok: true },
                  { icon: <Shield size={16} className="text-teal-400" />, label: 'Soil Health Index', value: `${METRICS.health}/100`, status: 'Good', ok: true },
                ].map((m) => (
                  <div key={m.label} className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-3 flex flex-col gap-1 min-h-[96px]">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">{m.icon}{m.label}</div>
                    <div className="text-xl font-bold text-white">{m.value}</div>
                    <div className={`text-[11px] font-semibold mt-auto ${m.ok ? 'text-emerald-400' : 'text-amber-400'}`}>{m.status}</div>
                  </div>
                ))}
              </div>

              {/* Intelligent Soil — always near top so it is visible without scrolling */}
              <div className="bg-[#16202d] rounded-xl border border-emerald-500/30 p-4">
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <span
                      className="inline-block w-3.5 h-3.5 rounded-sm border border-white/20"
                      style={{ background: soilInfo.base }}
                    />
                    INTELLIGENT SOIL · Field {selectedField} · {soilInfo.label}
                  </h3>
                </div>
                {/* Field picker + soil type for that field */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {fields.map((f) => {
                    const sid = fieldSoilMap?.[f.id] || (f.id === selectedField ? activeSoilId : 'alluvial');
                    const sc = getSoilClass(sid);
                    const on = f.id === selectedField;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedField?.(f.id)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-semibold transition ${
                          on
                            ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                            : 'border-[#1e2d40] text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-sm border border-black/30" style={{ background: sc.base }} />
                        {f.name}
                        <span className="text-slate-500 font-normal">{sc.shortLabel}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {SOIL_CLASSES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setActiveSoil(s.id)}
                      className={`px-2 py-0.5 rounded text-[9px] font-semibold border ${
                        activeSoilId === s.id
                          ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                          : 'border-[#1e2d40] text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      {s.shortLabel}
                    </button>
                  ))}
                </div>
                <p className="text-[12px] text-slate-300 leading-relaxed mb-3">{soilInfo.description}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  {[
                    { l: 'Water holding', v: soilInfo.waterHolding },
                    { l: 'Drainage', v: soilInfo.drainage },
                    { l: 'pH range', v: soilInfo.phRange },
                    { l: 'Crop fit', v: soilInfo.cropFit },
                  ].map((c) => (
                    <div key={c.l} className="bg-[#0f1722] rounded-lg border border-[#1e2d40] p-2.5">
                      <div className="text-[10px] text-slate-500">{c.l}</div>
                      <div className="text-[11px] text-white font-semibold mt-0.5 leading-snug">{c.v}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-[#0f1722] rounded-lg border border-[#1e2d40] p-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Nutrient profile</div>
                    <p className="text-[11px] text-slate-300 leading-snug">{soilInfo.nutrientNote}</p>
                    <p className="text-[11px] text-slate-500 mt-1.5">{soilInfo.textureNote}</p>
                  </div>
                  <div className="bg-[#0f1722] rounded-lg border border-[#1e2d40] p-3">
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Management focus</div>
                    <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
                      {soilInfo.management.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-white">NPK STATUS (kg/acre)</h3>
                    <button type="button" onClick={() => setTab('npk')} className="text-[11px] text-emerald-400 hover:underline">
                      NPK Trend (7 Days) →
                    </button>
                  </div>
                  <div className="flex items-center justify-around gap-2 py-2">
                    <NpkRing label="N" value={NPK.n.value} max={140} color="#22c55e" status={NPK.n.status} target={NPK.n.target} />
                    <NpkRing label="P" value={NPK.p.value} max={120} color="#3b82f6" status={NPK.p.status} target={NPK.p.target} />
                    <NpkRing label="K" value={NPK.k.value} max={140} color="#f59e0b" status={NPK.k.status} target={NPK.k.target} />
                  </div>
                </div>
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-white">SOIL MOISTURE MAP (Field View)</h3>
                    <button type="button" onClick={() => setTab('moisture')} className="text-[11px] text-emerald-400 hover:underline">Expand →</button>
                  </div>
                  <div className="flex-1 flex gap-3 min-h-[200px]">
                    <div className="flex-1"><MoistureMap /></div>
                    <div className="w-28 shrink-0 text-[10px] text-slate-400 space-y-1.5 pt-1">
                      <div className="font-semibold text-slate-300 mb-1">Moisture (%)</div>
                      <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#1d4ed8]" /> High (30%+)</div>
                      <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#22c55e]" /> Optimal (20-30%)</div>
                      <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#eab308]" /> Moderate (10-20%)</div>
                      <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#ef4444]" /> Low (&lt;10%)</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                <h3 className="text-xs font-bold text-white mb-3">SOIL PARAMETERS TREND (7 DAYS)</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
                  <MiniTrend title="Soil Moisture (%)" value="22.4" dataKey="moisture" color="#38bdf8" data={TREND_7} />
                  <MiniTrend title="pH Level" value="6.5" dataKey="ph" color="#a3e635" data={TREND_7} />
                  <MiniTrend title="EC (dS/m)" value="1.25" dataKey="ec" color="#fbbf24" data={TREND_7} />
                  <MiniTrend title="Soil Temp (°C)" value="24.6" dataKey="temp" color="#c084fc" data={TREND_7} />
                  <MiniTrend title="Organic Matter (%)" value="2.35" dataKey="organic" color="#2dd4bf" data={TREND_7} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                  <h3 className="text-xs font-bold text-white mb-1">SOIL MICROBIOLOGY ACTIVITY</h3>
                  <div className="text-[10px] text-slate-500 mb-3">Microbial Biomass & Activity</div>
                  <div className="flex items-center gap-4">
                    <div className="relative w-24 h-24 shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="36" stroke="#1e2d40" strokeWidth="10" fill="none" />
                        <circle cx="50" cy="50" r="36" stroke="#34d399" strokeWidth="10" fill="none"
                          strokeDasharray={2 * Math.PI * 36} strokeDashoffset={2 * Math.PI * 36 * (1 - 0.68)} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-bold text-white">68%</span>
                        <span className="text-[9px] text-amber-400">Moderate</span>
                      </div>
                    </div>
                    <div className="flex-1 space-y-1.5 text-[11px]">
                      {MICRO.map((m) => (
                        <div key={m.name} className="flex items-center justify-between gap-2">
                          <span className="text-slate-400 truncate">{m.name}</span>
                          <span className="font-semibold text-white">{m.value}%</span>
                          <span className={m.status === 'Good' ? 'text-emerald-400' : 'text-amber-400'}>{m.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                  <h3 className="text-xs font-bold text-white mb-3">SOIL TEXTURE</h3>
                  <div className="h-[140px] flex items-center">
                    <ResponsiveContainer width="55%" height="100%">
                      <PieChart>
                        <Pie data={TEXTURE} dataKey="value" cx="50%" cy="50%" innerRadius={32} outerRadius={52} paddingAngle={2}>
                          {TEXTURE.map((e) => <Cell key={e.name} fill={e.color} />)}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5 text-[11px]">
                      {TEXTURE.map((e) => (
                        <div key={e.name} className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: e.color }} />
                          <span className="text-slate-400">{e.name}</span>
                          <span className="ml-auto font-semibold text-white">{e.value}%</span>
                        </div>
                      ))}
                      <div className="pt-2 text-[11px] text-emerald-400 font-semibold">Texture Class: Loam ✓</div>
                    </div>
                  </div>
                </div>
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4 flex flex-col items-center justify-center">
                  <h3 className="text-xs font-bold text-white mb-3 self-start">BULK DENSITY</h3>
                  <div className="text-4xl font-bold text-white">1.32</div>
                  <div className="text-sm text-slate-400 mb-2">g/cm³</div>
                  <div className="text-emerald-400 font-semibold text-sm">Optimal</div>
                  <div className="text-[11px] text-slate-500 mt-1">Target: 1.1 – 1.4</div>
                </div>
              </div>

              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                <h3 className="text-xs font-bold text-white mb-3">SOIL HEALTH INSIGHTS</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2">
                  {INSIGHTS.map((ins) => (
                    <div key={ins.text} className="flex gap-2 text-[11px] bg-[#0f1722] rounded-lg border border-[#1e2d40] p-2.5">
                      <span className="text-base shrink-0">{ins.icon}</span>
                      <span className="text-slate-300 leading-snug">{ins.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ═══ NPK ANALYSIS ═══ */}
          {!showIrrigation && tab === 'npk' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-5 flex flex-col items-center">
                  <NpkRing label="N" value={NPK.n.value} max={140} color="#22c55e" status={NPK.n.status} target={NPK.n.target} />
                  <p className="text-[11px] text-slate-400 mt-3 text-center">Nitrogen supports canopy growth and berry set. Current level is within target band.</p>
                </div>
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-5 flex flex-col items-center">
                  <NpkRing label="P" value={NPK.p.value} max={120} color="#3b82f6" status={NPK.p.status} target={NPK.p.target} />
                  <p className="text-[11px] text-slate-400 mt-3 text-center">Phosphorus is moderate — root development and energy transfer still adequate; top-up optional.</p>
                </div>
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-5 flex flex-col items-center">
                  <NpkRing label="K" value={NPK.k.value} max={140} color="#f59e0b" status={NPK.k.status} target={NPK.k.target} />
                  <p className="text-[11px] text-slate-400 mt-3 text-center">Potassium is optimal for sugar accumulation and stress tolerance at current phenology.</p>
                </div>
              </div>
              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                <h3 className="text-xs font-bold text-white mb-3">7-Day NPK Proxy Trend (from soil sensors)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <MiniTrend title="N index" value="96" dataKey="moisture" color="#22c55e" data={TREND_7} />
                  <MiniTrend title="P index" value="68" dataKey="ec" color="#3b82f6" data={TREND_7} />
                  <MiniTrend title="K index" value="82" dataKey="organic" color="#f59e0b" data={TREND_7} />
                </div>
              </div>
              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                <h3 className="text-xs font-bold text-white mb-3">Application guidance (next 15 days)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px]">
                  {NUTRIENTS.filter((n) => n.key !== 'OM').map((n) => (
                    <div key={n.key} className="bg-[#0f1722] rounded-lg border border-[#1e2d40] p-3">
                      <div className="font-semibold text-white">{n.name}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">{n.product}</div>
                      <div className="text-emerald-400 font-bold mt-2">{n.amount}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ MOISTURE & WATER ═══ */}
          {!showIrrigation && tab === 'moisture' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { l: 'Current moisture', v: `${METRICS.moisture}%`, s: 'Optimal band 20–30%' },
                  { l: 'Root zone (15–30 cm)', v: '24%', s: 'Moist' },
                  { l: 'Sub soil (30–60 cm)', v: '16%', s: 'Slightly dry' },
                  { l: 'Days to next irrigation', v: '1', s: 'Based on ET & sensors' },
                ].map((c) => (
                  <div key={c.l} className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-3">
                    <div className="text-[10px] text-slate-400">{c.l}</div>
                    <div className="text-xl font-bold text-white mt-1">{c.v}</div>
                    <div className="text-[10px] text-slate-500">{c.s}</div>
                  </div>
                ))}
              </div>
              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                <h3 className="text-xs font-bold text-white mb-3">Field moisture map</h3>
                <div className="h-[280px]"><MoistureMap /></div>
              </div>
              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                <h3 className="text-xs font-bold text-white mb-3">Moisture trend (7 days)</h3>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={TREND_7}>
                      <XAxis dataKey="d" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[10, 35]} />
                      <Tooltip contentStyle={TOOLTIP} />
                      <Line type="monotone" dataKey="moisture" name="Moisture %" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIrrigation(true)}
                className="w-full md:w-auto px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-bold"
              >
                View Irrigation Plan →
              </button>
            </div>
          )}

          {/* ═══ pH & EC ═══ */}
          {!showIrrigation && tab === 'ph' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { l: 'Current pH', v: String(METRICS.ph), s: 'Slightly acidic', c: 'text-lime-400' },
                  { l: 'EC (dS/m)', v: String(METRICS.ec), s: 'Non-saline', c: 'text-amber-400' },
                  { l: 'Ideal pH band', v: '6.0 – 7.0', s: 'For grapevines', c: 'text-emerald-400' },
                  { l: 'Salinity risk', v: 'Low', s: 'EC << 2.5 dS/m', c: 'text-emerald-400' },
                ].map((c) => (
                  <div key={c.l} className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-3">
                    <div className="text-[10px] text-slate-400">{c.l}</div>
                    <div className={`text-xl font-bold mt-1 ${c.c}`}>{c.v}</div>
                    <div className="text-[10px] text-slate-500">{c.s}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                  <h3 className="text-xs font-bold text-white mb-3">pH trend (7 days)</h3>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={TREND_7}>
                        <XAxis dataKey="d" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <YAxis domain={[5.5, 7.5]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Tooltip contentStyle={TOOLTIP} />
                        <Line type="monotone" dataKey="ph" name="pH" stroke="#a3e635" strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                  <h3 className="text-xs font-bold text-white mb-3">EC trend (7 days)</h3>
                  <div className="h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={TREND_7}>
                        <XAxis dataKey="d" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <YAxis domain={[0.8, 1.6]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Tooltip contentStyle={TOOLTIP} />
                        <Line type="monotone" dataKey="ec" name="EC" stroke="#fbbf24" strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                  <h3 className="text-xs font-bold text-white mb-3">pH zone interpretation</h3>
                  <div className="space-y-2 text-[12px]">
                    {[
                      { range: '< 5.5', label: 'Strongly acidic', note: 'Al toxicity risk · lime needed', active: false },
                      { range: '5.5 – 6.0', label: 'Moderately acidic', note: 'Watch Mn / Al', active: false },
                      { range: '6.0 – 7.0', label: 'Slightly acidic–neutral', note: 'Best nutrient availability', active: true },
                      { range: '7.0 – 7.5', label: 'Slightly alkaline', note: 'Fe / Zn may lock up', active: false },
                      { range: '> 7.5', label: 'Alkaline', note: 'Consider acidifying amendments', active: false },
                    ].map((r) => (
                      <div key={r.range} className={`flex gap-3 p-2 rounded-lg border ${r.active ? 'border-emerald-500/40 bg-emerald-900/20' : 'border-[#1e2d40] bg-[#0f1722]'}`}>
                        <span className="w-20 font-mono text-slate-400 shrink-0">{r.range}</span>
                        <span className={`font-semibold w-40 shrink-0 ${r.active ? 'text-emerald-300' : 'text-slate-300'}`}>{r.label}</span>
                        <span className="text-slate-500">{r.note}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                  <h3 className="text-xs font-bold text-white mb-3">EC / salinity guidance</h3>
                  <div className="space-y-2 text-[12px]">
                    {[
                      { range: '< 1.5', label: 'Non-saline', note: 'No restriction for vines', active: true },
                      { range: '1.5 – 2.5', label: 'Slightly saline', note: 'Monitor young vines', active: false },
                      { range: '2.5 – 4.0', label: 'Moderately saline', note: 'Yield impact possible', active: false },
                      { range: '> 4.0', label: 'Saline', note: 'Leaching + gypsum plan', active: false },
                    ].map((r) => (
                      <div key={r.range} className={`flex gap-3 p-2 rounded-lg border ${r.active ? 'border-emerald-500/40 bg-emerald-900/20' : 'border-[#1e2d40] bg-[#0f1722]'}`}>
                        <span className="w-20 font-mono text-slate-400 shrink-0">{r.range}</span>
                        <span className={`font-semibold w-36 shrink-0 ${r.active ? 'text-emerald-300' : 'text-slate-300'}`}>{r.label}</span>
                        <span className="text-slate-500">{r.note}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-3">
                    Current pH {METRICS.ph} and EC {METRICS.ec} dS/m are well placed for nutrient uptake. Avoid heavy liming unless pH trends below 6.0.
                  </p>
                </div>
              </div>

              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                <h3 className="text-xs font-bold text-white mb-3">Actions</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px]">
                  {[
                    { t: 'Maintain', d: 'No lime/sulfur needed this cycle' },
                    { t: 'Fertigation pH', d: 'Keep tank solution at 5.8–6.5' },
                    { t: 'Recheck', d: 'Sample again after next fertigation' },
                  ].map((a) => (
                    <div key={a.t} className="bg-[#0f1722] rounded-lg border border-[#1e2d40] p-3">
                      <div className="text-emerald-400 font-semibold">{a.t}</div>
                      <div className="text-slate-400 mt-1">{a.d}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ SOIL HEALTH ═══ */}
          {!showIrrigation && tab === 'health' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { l: 'Health Index', v: `${METRICS.health}/100`, s: 'Good', c: 'text-emerald-400' },
                  { l: 'Organic matter', v: `${METRICS.organic}%`, s: 'Target ≥ 2.5%', c: 'text-lime-400' },
                  { l: 'Bulk density', v: '1.32 g/cm³', s: 'Optimal 1.1–1.4', c: 'text-sky-400' },
                  { l: 'Texture class', v: 'Loam', s: 'Balanced water & air', c: 'text-amber-400' },
                ].map((c) => (
                  <div key={c.l} className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-3">
                    <div className="text-[10px] text-slate-400">{c.l}</div>
                    <div className={`text-xl font-bold mt-1 ${c.c}`}>{c.v}</div>
                    <div className="text-[10px] text-slate-500">{c.s}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                  <h3 className="text-xs font-bold text-white mb-3">Health score breakdown</h3>
                  <div className="space-y-3">
                    {[
                      { name: 'Physical (structure, BD)', score: 82 },
                      { name: 'Chemical (pH, EC, NPK)', score: 78 },
                      { name: 'Biological (microbes)', score: 68 },
                      { name: 'Organic matter', score: 74 },
                      { name: 'Moisture regime', score: 80 },
                    ].map((s) => (
                      <div key={s.name}>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400">{s.name}</span>
                          <span className="text-white font-semibold">{s.score}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#0f1722] overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400" style={{ width: `${s.score}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                  <h3 className="text-xs font-bold text-white mb-3">Soil texture</h3>
                  <div className="h-[160px] flex items-center">
                    <ResponsiveContainer width="50%" height="100%">
                      <PieChart>
                        <Pie data={TEXTURE} dataKey="value" cx="50%" cy="50%" innerRadius={36} outerRadius={58} paddingAngle={2}>
                          {TEXTURE.map((e) => <Cell key={e.name} fill={e.color} />)}
                        </Pie>
                        <Tooltip contentStyle={TOOLTIP} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2 text-[12px]">
                      {TEXTURE.map((e) => (
                        <div key={e.name} className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-sm" style={{ background: e.color }} />
                          <span className="text-slate-400">{e.name}</span>
                          <span className="ml-auto font-bold text-white">{e.value}%</span>
                        </div>
                      ))}
                      <div className="pt-2 text-emerald-400 font-semibold text-[12px]">Class: Loam ✓</div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">Loam supports good drainage with enough water-holding for drip-irrigated vines.</p>
                </div>
              </div>

              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                <h3 className="text-xs font-bold text-white mb-3">Organic matter trajectory</h3>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={TREND_7}>
                      <XAxis dataKey="d" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis domain={[1.8, 2.6]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip contentStyle={TOOLTIP} />
                      <Line type="monotone" dataKey="organic" name="OM %" stroke="#2dd4bf" strokeWidth={2.5} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                <h3 className="text-xs font-bold text-white mb-3">Recommendations to raise index toward 85+</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 text-[12px]">
                  {[
                    { t: 'Add OM', d: '100 kg/acre FYM or compost over 15 days' },
                    { t: 'Cover crop', d: 'Consider inter-row legumes after harvest' },
                    { t: 'Reduce compaction', d: 'Limit heavy traffic when soil is wet' },
                    { t: 'Microbial boost', d: 'Compost tea / biofertilizer trial' },
                  ].map((a) => (
                    <div key={a.t} className="bg-[#0f1722] rounded-lg border border-[#1e2d40] p-3">
                      <div className="text-emerald-400 font-semibold">{a.t}</div>
                      <div className="text-slate-400 mt-1">{a.d}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                <h3 className="text-xs font-bold text-white mb-3">Insights</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {INSIGHTS.map((ins) => (
                    <div key={ins.text} className="flex gap-2 text-[12px] bg-[#0f1722] rounded-lg border border-[#1e2d40] p-3">
                      <span>{ins.icon}</span>
                      <span className="text-slate-300">{ins.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ MICROBIOLOGY ═══ */}
          {!showIrrigation && tab === 'micro' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {MICRO.map((m) => (
                  <div key={m.name} className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-3">
                    <div className="text-[10px] text-slate-400">{m.name}</div>
                    <div className="text-2xl font-bold text-white mt-1">{m.value}%</div>
                    <div className={`text-[11px] font-semibold ${m.status === 'Good' ? 'text-emerald-400' : 'text-amber-400'}`}>{m.status}</div>
                    <div className="mt-2 h-1.5 rounded-full bg-[#0f1722] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${m.value}%`, background: m.color }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                  <h3 className="text-xs font-bold text-white mb-3">Activity index</h3>
                  <div className="flex items-center gap-6">
                    <div className="relative w-32 h-32 shrink-0">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="38" stroke="#1e2d40" strokeWidth="10" fill="none" />
                        <circle cx="50" cy="50" r="38" stroke="#34d399" strokeWidth="10" fill="none"
                          strokeDasharray={2 * Math.PI * 38} strokeDashoffset={2 * Math.PI * 38 * (1 - 0.68)} strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-white">68%</span>
                        <span className="text-[10px] text-amber-400">Moderate</span>
                      </div>
                    </div>
                    <div className="text-[12px] text-slate-400 space-y-2">
                      <p>Combined biomass & enzyme proxy from Zone 2 assays.</p>
                      <p><span className="text-emerald-400 font-semibold">Good:</span> Bacteria, enzymatic activity</p>
                      <p><span className="text-amber-400 font-semibold">Moderate:</span> Fungi, actinomycetes — room to improve</p>
                    </div>
                  </div>
                </div>
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                  <h3 className="text-xs font-bold text-white mb-3">Functional roles</h3>
                  <div className="space-y-2 text-[12px]">
                    {[
                      { n: 'Bacteria', r: 'N cycling, residue breakdown, rhizosphere support' },
                      { n: 'Fungi', r: 'Mycorrhizae, P uptake, aggregate stability' },
                      { n: 'Actinomycetes', r: 'Organic matter decomposition, disease suppression' },
                      { n: 'Enzymes', r: 'Nutrient release rate from OM and fertilizers' },
                    ].map((x) => (
                      <div key={x.n} className="bg-[#0f1722] rounded-lg border border-[#1e2d40] p-2.5 flex gap-2">
                        <span className="text-emerald-400 font-semibold w-28 shrink-0">{x.n}</span>
                        <span className="text-slate-400">{x.r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                <h3 className="text-xs font-bold text-white mb-3">Boost plan (next 30 days)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[12px]">
                  {[
                    { t: 'Organic input', d: 'FYM / compost 100 kg/acre + keep soil moist after application' },
                    { t: 'Biofertilizer', d: 'Trial mycorrhizal inoculant at root zone if planting gaps' },
                    { t: 'Avoid', d: 'Broad-spectrum soil fungicides unless disease pressure is high' },
                  ].map((a) => (
                    <div key={a.t} className="bg-[#0f1722] rounded-lg border border-[#1e2d40] p-3">
                      <div className="text-emerald-400 font-semibold">{a.t}</div>
                      <div className="text-slate-400 mt-1">{a.d}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ HYDROGELS ═══ */}
          {!showIrrigation && tab === 'hydrogels' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { l: 'Status', v: 'Active', s: 'Network hydrated', c: 'text-emerald-400' },
                  { l: 'Water retention', v: 'Good', s: 'Buffering ET peaks', c: 'text-sky-400' },
                  { l: 'Placement depth', v: '15–25 cm', s: 'Root zone band', c: 'text-amber-400' },
                  { l: 'Last recharge', v: '18 May', s: 'Via drip cycle', c: 'text-violet-400' },
                ].map((c) => (
                  <div key={c.l} className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-3">
                    <div className="text-[10px] text-slate-400">{c.l}</div>
                    <div className={`text-xl font-bold mt-1 ${c.c}`}>{c.v}</div>
                    <div className="text-[10px] text-slate-500">{c.s}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                  <h3 className="text-xs font-bold text-white mb-3">How hydrogels help Zone 2</h3>
                  <ul className="text-[12px] text-slate-400 space-y-2 list-disc list-inside">
                    <li>Store irrigation water and release it slowly to roots</li>
                    <li>Reduce deep percolation losses below 60 cm</li>
                    <li>Smooth moisture swings between drip cycles</li>
                    <li>Support consistent berry sizing in warm weeks</li>
                  </ul>
                </div>
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                  <h3 className="text-xs font-bold text-white mb-3">Operating rules</h3>
                  <div className="space-y-2 text-[12px]">
                    {[
                      { t: 'Do not over-irrigate', d: 'Polymers already hold extra water — short cycles preferred' },
                      { t: 'Recharge with drip', d: 'Align with scheduled irrigation (see plan)' },
                      { t: 'Watch salinity', d: 'Flush occasionally if EC trends up after fertigation' },
                    ].map((x) => (
                      <div key={x.t} className="bg-[#0f1722] rounded-lg border border-[#1e2d40] p-2.5">
                        <div className="text-emerald-400 font-semibold">{x.t}</div>
                        <div className="text-slate-400 mt-0.5">{x.d}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                <h3 className="text-xs font-bold text-white mb-3">Moisture vs hydrogel recharge (illustrative)</h3>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={TREND_7}>
                      <XAxis dataKey="d" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip contentStyle={TOOLTIP} />
                      <Line type="monotone" dataKey="moisture" name="Soil moisture %" stroke="#38bdf8" strokeWidth={2.5} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">Moisture held steadier after 18 May recharge event.</p>
              </div>

              <button type="button" onClick={() => setShowIrrigation(true)} className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-bold">
                Open Irrigation Plan →
              </button>
            </div>
          )}

          {/* ═══ HISTORY ═══ */}
          {!showIrrigation && tab === 'history' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {[
                  { l: 'Avg moisture', v: '20.8%' },
                  { l: 'Avg pH', v: '6.39' },
                  { l: 'Avg EC', v: '1.16' },
                  { l: 'Avg temp', v: '24.1°C' },
                  { l: 'OM change', v: '+0.25%' },
                ].map((c) => (
                  <div key={c.l} className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-3 text-center">
                    <div className="text-[10px] text-slate-400">{c.l}</div>
                    <div className="text-lg font-bold text-white mt-1">{c.v}</div>
                  </div>
                ))}
              </div>

              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                <h3 className="text-xs font-bold text-white mb-3">Multi-parameter history (Zone 2 sensors)</h3>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={TREND_7}>
                      <XAxis dataKey="d" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip contentStyle={TOOLTIP} />
                      <Line type="monotone" dataKey="moisture" name="Moisture %" stroke="#38bdf8" strokeWidth={2} />
                      <Line type="monotone" dataKey="temp" name="Temp °C" stroke="#c084fc" strokeWidth={2} />
                      <Line type="monotone" dataKey="ph" name="pH" stroke="#a3e635" strokeWidth={2} />
                      <Line type="monotone" dataKey="ec" name="EC" stroke="#fbbf24" strokeWidth={2} />
                      <Line type="monotone" dataKey="organic" name="OM %" stroke="#2dd4bf" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                  <h3 className="text-xs font-bold text-white mb-3">Moisture only</h3>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={TREND_7}>
                        <XAxis dataKey="d" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <YAxis domain={[10, 35]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Tooltip contentStyle={TOOLTIP} />
                        <Line type="monotone" dataKey="moisture" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
                  <h3 className="text-xs font-bold text-white mb-3">Temperature only</h3>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={TREND_7}>
                        <XAxis dataKey="d" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <YAxis domain={[20, 30]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                        <Tooltip contentStyle={TOOLTIP} />
                        <Line type="monotone" dataKey="temp" stroke="#c084fc" strokeWidth={2.5} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4 overflow-x-auto">
                <h3 className="text-xs font-bold text-white mb-3">Daily log</h3>
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="text-slate-500 border-b border-[#1e2d40]">
                      <th className="text-left py-2">Date</th>
                      <th className="text-right py-2">Moisture %</th>
                      <th className="text-right py-2">pH</th>
                      <th className="text-right py-2">EC</th>
                      <th className="text-right py-2">Temp °C</th>
                      <th className="text-right py-2">OM %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TREND_7.map((r) => (
                      <tr key={r.d} className="border-b border-[#1e2d40]/40">
                        <td className="py-2 text-slate-300">{r.d}</td>
                        <td className="py-2 text-right text-sky-300">{r.moisture}</td>
                        <td className="py-2 text-right text-lime-300">{r.ph}</td>
                        <td className="py-2 text-right text-amber-300">{r.ec}</td>
                        <td className="py-2 text-right text-violet-300">{r.temp}</td>
                        <td className="py-2 text-right text-teal-300">{r.organic}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-[11px] text-slate-500">Same Zone 2 probe stream as overview · refresh pulls latest sensor snapshot.</div>
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR — always visible */}
        <div className="w-[300px] shrink-0 border-l border-[#1e2d40] bg-[#0b131e] overflow-y-auto p-3 flex flex-col gap-3">
          <SoilProfile3D soilClassId={activeSoilId} />

          <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              Soil by field
            </div>
            <div className="space-y-2 mb-2">
              {fields.map((f) => {
                const sid = fieldSoilMap?.[f.id] || (f.id === selectedField ? activeSoilId : 'alluvial');
                const sc = getSoilClass(sid);
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedField?.(f.id)}
                    className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 border text-left transition ${
                      selectedField === f.id
                        ? 'border-emerald-500/50 bg-emerald-500/15'
                        : 'border-[#1e2d40] hover:border-slate-600'
                    }`}
                  >
                    <span className="w-3 h-3 rounded-sm border border-black/30" style={{ background: sc.base }} />
                    <span className="text-[10px] font-semibold text-white flex-1">{f.name}</span>
                    <span className="text-[9px] text-slate-400">{sc.shortLabel}</span>
                  </button>
                );
              })}
            </div>
            <div className="text-[9px] text-slate-500 mb-1.5">Set type for Field {selectedField}</div>
            <div className="space-y-1">
              {SOIL_CLASSES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSoil(s.id)}
                  className={`w-full flex items-center gap-2 rounded-lg px-2 py-1.5 border text-left transition ${
                    activeSoilId === s.id
                      ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200'
                      : 'border-[#1e2d40] text-slate-400 hover:border-slate-600'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-sm shrink-0 border border-black/30" style={{ background: s.base }} />
                  <span className="text-[10px] font-semibold">{s.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-3">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Depth (cm)</div>
            <div className="space-y-2">
              {DEPTHS.map((d) => (
                <div key={d.range} className="flex items-center gap-2 text-[11px]">
                  <span className="w-14 text-slate-500 font-mono">{d.range}</span>
                  <span className="flex-1 text-slate-300">{d.label}</span>
                  <span className={`font-semibold ${d.color}`}>{d.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nutrient Recommendation</h3>
            <div className="text-[10px] text-slate-500 mb-3">Recommended for Next 15 Days</div>
            <div className="space-y-2.5">
              {NUTRIENTS.map((n) => (
                <div key={n.key} className="flex items-start gap-2 text-[11px]">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    n.key === 'N' ? 'bg-emerald-900/50 text-emerald-400'
                      : n.key === 'P' ? 'bg-blue-900/50 text-blue-400'
                        : n.key === 'K' ? 'bg-amber-900/50 text-amber-400'
                          : 'bg-lime-900/50 text-lime-400'
                  }`}>
                    {n.key === 'OM' ? '🍃' : n.key}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-slate-200 font-medium">{n.name}</div>
                    <div className="text-[10px] text-slate-500">{n.product}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-white font-semibold">{n.amount}</div>
                    <button type="button" className={`text-[10px] font-semibold ${n.action === 'Apply' ? 'text-emerald-400' : 'text-sky-400'}`}>
                      {n.action}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-3">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Irrigation Advisory</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-sky-900/40 border border-sky-500/30 flex items-center justify-center">
                <Droplets size={18} className="text-sky-400" />
              </div>
              <div>
                <div className="text-[10px] text-slate-500">Next irrigation recommended in</div>
                <div className="text-xl font-bold text-white">1 Day</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 mb-3">
              Estimated Water Required: <span className="text-white font-semibold">12,500 L/acre</span>
            </div>
            <button
              type="button"
              onClick={() => setShowIrrigation(true)}
              className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-bold transition"
            >
              View Irrigation Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
