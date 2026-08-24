import { useMemo, useState, useCallback } from 'react';
import {
  Droplets, Beaker, Activity, Waves, Hexagon, Leaf, AlertTriangle,
  Info, Thermometer, FlaskConical, Sparkles, RotateCcw, Check,
} from 'lucide-react';
import type { SimState, SoilClassId } from './simulation';
import { FIELDS, SOIL_CLASSES, getSoilClass } from './simulation';

type FormulaKey = 'pam' | 'cellulose' | 'kpa' | 'crosslink' | 'other';
type Formula = Record<FormulaKey, number>;

const DEFAULT_FORMULA: Formula = {
  pam: 45,
  cellulose: 25,
  kpa: 15,
  crosslink: 10,
  other: 5,
};

const FORMULA_LABELS: Record<FormulaKey, { name: string; color: string; tip: string }> = {
  pam: { name: 'Polyacrylamide (PAM)', color: '#8b5cf6', tip: 'Boosts water holding & gel strength' },
  cellulose: { name: 'Cellulose', color: '#06b6d4', tip: 'Improves biodegradability & soil safety' },
  kpa: { name: 'K-Polyacrylate', color: '#3b82f6', tip: 'Faster swell / release response' },
  crosslink: { name: 'Cross-linking Agent', color: '#f59e0b', tip: 'Slows degradation, denser network' },
  other: { name: 'Others / Additives', color: '#64748b', tip: 'Nutrient carriers, stabilizers' },
};

const PRESETS: { id: string; label: string; need: string; formula: Formula }[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    need: 'Default all-round performance',
    formula: { pam: 45, cellulose: 25, kpa: 15, crosslink: 10, other: 5 },
  },
  {
    id: 'drought',
    label: 'Drought Hold',
    need: 'Max water storage in dry spells',
    formula: { pam: 55, cellulose: 18, kpa: 10, crosslink: 12, other: 5 },
  },
  {
    id: 'heat',
    label: 'Heat Stable',
    need: 'Slower release under high temp',
    formula: { pam: 40, cellulose: 22, kpa: 12, crosslink: 18, other: 8 },
  },
  {
    id: 'fast',
    label: 'Fast Release',
    need: 'Quicker root-zone delivery',
    formula: { pam: 35, cellulose: 20, kpa: 28, crosslink: 8, other: 9 },
  },
  {
    id: 'eco',
    label: 'Eco / Bio',
    need: 'Higher biodegradability',
    formula: { pam: 30, cellulose: 40, kpa: 12, crosslink: 8, other: 10 },
  },
];

function normalizeFormula(f: Formula): Formula {
  const sum = f.pam + f.cellulose + f.kpa + f.crosslink + f.other;
  if (sum <= 0) return { ...DEFAULT_FORMULA };
  if (Math.abs(sum - 100) < 0.5) return f;
  const scale = 100 / sum;
  return {
    pam: Math.round(f.pam * scale),
    cellulose: Math.round(f.cellulose * scale),
    kpa: Math.round(f.kpa * scale),
    crosslink: Math.round(f.crosslink * scale),
    other: Math.max(0, 100 - Math.round(f.pam * scale) - Math.round(f.cellulose * scale) - Math.round(f.kpa * scale) - Math.round(f.crosslink * scale)),
  };
}

/** Projected impact of formula on hydrogel performance */
function formulaImpact(f: Formula, baseHolding: number, baseEff: number, baseRelease: number, baseDeg: number) {
  const holdMod = 1 + (f.pam - 45) * 0.006 + (f.crosslink - 10) * 0.003 - (f.cellulose - 25) * 0.002;
  const effMod = 1 + (f.pam - 45) * 0.003 + (f.cellulose - 25) * 0.002 + (f.crosslink - 10) * 0.004 - Math.abs(f.kpa - 15) * 0.002;
  const releaseMod = 1 + (f.kpa - 15) * 0.012 - (f.crosslink - 10) * 0.008 - (f.pam - 45) * 0.003;
  const degMod = 1 - (f.crosslink - 10) * 0.015 + (f.cellulose - 25) * 0.01 + (f.other - 5) * 0.004;
  return {
    holding: Math.round(Math.max(280, Math.min(520, baseHolding * holdMod))),
    efficiency: Math.round(Math.max(35, Math.min(98, baseEff * effMod))),
    release: +(Math.max(4, Math.min(28, baseRelease * releaseMod))).toFixed(1),
    degradation: Math.round(Math.max(6, Math.min(50, baseDeg * degMod))),
    bioScore: Math.round(Math.max(20, Math.min(100, 40 + f.cellulose * 1.1 - f.pam * 0.25))),
    strength: Math.round(Math.max(30, Math.min(100, 50 + f.pam * 0.5 + f.crosslink * 1.2))),
  };
}

type ZoneRow = {
  id: string;
  name: string;
  sat: number;
  efficiency: number;
  waterStored: number;
  releaseRate: number;
  health: 'Good' | 'Moderate' | 'Low';
};

function buildZones(sim: SimState): ZoneRow[] {
  const base = sim.env.hydrogelSat;
  const eff = sim.hydrogelEfficiency;
  return FIELDS.map((f, i) => {
    const offset = [6, 10, -4, -16][i] ?? 0;
    const sat = Math.max(22, Math.min(92, Math.round(base + offset + (f.soilMoisture - 60) * 0.12)));
    const efficiency = Math.max(38, Math.min(92, Math.round(eff + offset * 0.35)));
    const waterStored = Math.round(28000 + sat * 280 + f.acres * 1200);
    const releaseRate = +(8 + sat * 0.08 + (100 - efficiency) * 0.04).toFixed(1);
    const health: ZoneRow['health'] =
      sat >= 55 && efficiency >= 65 ? 'Good' : sat >= 40 ? 'Moderate' : 'Low';
    return { id: f.id, name: f.name, sat, efficiency, waterStored, releaseRate, health };
  });
}

const DAYS = ['14', '15', '16', '17', '18', '19', '20'];
const ZONE_COLORS = ['#22c55e', '#eab308', '#06b6d4', '#f97316'];

function LineChart({
  series,
  height = 70,
}: {
  series: { label: string; color: string; values: number[] }[];
  height?: number;
}) {
  const w = 300;
  const h = height;
  const padX = 4;
  const padY = 6;
  const all = series.flatMap((s) => s.values);
  const min = Math.min(...all) * 0.92;
  const max = Math.max(...all) * 1.04;
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
        const thick = (s as { highlight?: boolean }).highlight;
        return (
          <path
            key={s.label}
            d={d}
            fill="none"
            stroke={s.color}
            strokeWidth={thick ? 3 : 1.5}
            strokeLinecap="round"
            opacity={thick ? 1 : 0.45}
          />
        );
      })}
    </svg>
  );
}

function HydrogelSphere({ sat }: { sat: number }) {
  return (
    <div className="relative mx-auto w-[160px] h-[160px] lg:w-[180px] lg:h-[180px]">
      <div className="absolute inset-4 rounded-full bg-violet-600/20 blur-xl pointer-events-none" />
      <svg viewBox="0 0 200 200" className="w-full h-full relative z-10">
        <defs>
          <radialGradient id="hgOrb" cx="38%" cy="32%" r="62%">
            <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.45" />
            <stop offset="50%" stopColor="#6366f1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.12" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="108" r="70" fill="url(#hgOrb)" stroke="#8b5cf6" strokeWidth="1.5" />
        {[
          [100, 45], [58, 72], [142, 72], [48, 115], [152, 115], [72, 152], [128, 152], [100, 108],
          [78, 58], [122, 58], [65, 100], [135, 100], [88, 135], [112, 135],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={i === 7 ? 5 : 3} fill={i === 7 ? '#22d3ee' : '#a78bfa'} />
        ))}
        <g stroke="#67e8f9" strokeWidth="0.9" opacity="0.55">
          <line x1="100" y1="45" x2="58" y2="72" /><line x1="100" y1="45" x2="142" y2="72" />
          <line x1="58" y1="72" x2="48" y2="115" /><line x1="142" y1="72" x2="152" y2="115" />
          <line x1="48" y1="115" x2="72" y2="152" /><line x1="152" y1="115" x2="128" y2="152" />
          <line x1="72" y1="152" x2="128" y2="152" />
          <line x1="100" y1="45" x2="100" y2="108" /><line x1="58" y1="72" x2="100" y2="108" />
          <line x1="142" y1="72" x2="100" y2="108" /><line x1="48" y1="115" x2="100" y2="108" />
          <line x1="152" y1="115" x2="100" y2="108" />
        </g>
        <path d="M100 42 Q97 28 94 20" stroke="#4ade80" strokeWidth="2.2" fill="none" />
        <ellipse cx="87" cy="20" rx="10" ry="5" fill="#4ade80" transform="rotate(-28 87 20)" />
        <ellipse cx="110" cy="18" rx="10" ry="5" fill="#86efac" transform="rotate(22 110 18)" />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 text-center text-[9px] text-cyan-300/90 leading-tight">
        Controlled Release to Root Zone · {sat}%
      </div>
    </div>
  );
}

export default function HydrogelPanel({
  sim,
  soilClass = 'alluvial',
  setSoilClass,
  fieldSoilMap,
  setFieldSoil,
  selectedField,
  setSelectedField,
}: {
  sim: SimState;
  soilClass?: SoilClassId;
  setSoilClass?: (id: SoilClassId) => void;
  fieldSoilMap?: Record<string, SoilClassId>;
  setFieldSoil?: (fieldId: string, soilId: SoilClassId) => void;
  selectedField?: string;
  setSelectedField?: (id: string) => void;
}) {
  const [selectedZone, setSelectedZone] = useState(selectedField || FIELDS[0]?.id || 'A');
  const [formula, setFormula] = useState<Formula>({ ...DEFAULT_FORMULA });
  const [appliedPreset, setAppliedPreset] = useState('balanced');
  const [formulaOpen, setFormulaOpen] = useState(true);
  const [savedFlash, setSavedFlash] = useState(false);
  const [localSoil, setLocalSoil] = useState<SoilClassId>(soilClass);

  const zones = useMemo(() => buildZones(sim), [sim]);
  const active = zones.find((z) => z.id === selectedZone) || zones[0];
  const fieldMeta = FIELDS.find((f) => f.id === selectedZone) || FIELDS[0];

  // Soil type follows the selected zone/field map when available
  const activeSoilId =
    fieldSoilMap?.[selectedZone] ||
    (setSoilClass ? soilClass : localSoil) ||
    'alluvial';
  const setActiveSoil = (id: SoilClassId) => {
    if (setFieldSoil) setFieldSoil(selectedZone, id);
    else if (setSoilClass) setSoilClass(id);
    else setLocalSoil(id);
  };
  const soilInfo = getSoilClass(activeSoilId);

  const pickZone = (id: string) => {
    setSelectedZone(id);
    setSelectedField?.(id);
  };

  const setComponent = useCallback((key: FormulaKey, value: number) => {
    setFormula((prev) => {
      const next = { ...prev, [key]: Math.max(0, Math.min(80, value)) };
      return normalizeFormula(next);
    });
    setAppliedPreset('custom');
  }, []);

  const applyPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    setFormula({ ...p.formula });
    setAppliedPreset(id);
  };

  const resetFormula = () => {
    setFormula({ ...DEFAULT_FORMULA });
    setAppliedPreset('balanced');
  };

  const saveFormula = () => {
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 1600);
  };

  // Farm-wide averages (for context)
  const farmAvgSat = Math.round(zones.reduce((s, z) => s + z.sat, 0) / Math.max(1, zones.length));

  // Selected-field metrics — all detail panels follow this field
  const fieldSat = active.sat;
  const fieldEff = active.efficiency;
  const fieldStored = active.waterStored;
  const fieldRelease = active.releaseRate;
  const fieldAbsorbed = +(fieldRelease * 1.45).toFixed(1);
  const fieldPlants = fieldMeta.plants;
  const fieldAcres = fieldMeta.acres;
  // Active gels scale with field size
  const fieldActiveGels = Math.round(280 + fieldAcres * 95 + fieldSat * 2.2);
  const baseHolding = Math.round(380 + (fieldSat - 50) * 1.2 + fieldEff * 0.4);
  const baseDeg = Math.max(8, Math.min(42, Math.round(12 + (100 - fieldSat) * 0.18 + (fieldMeta.id.charCodeAt(0) % 5))));
  const impact = formulaImpact(formula, baseHolding, fieldEff, fieldRelease, baseDeg);
  const fieldHolding = impact.holding;
  const projectedEff = impact.efficiency;
  const projectedRelease = impact.release;
  const degradation = impact.degradation;
  const performanceIndex = Math.min(100, Math.round(projectedEff * 0.55 + fieldSat * 0.35 + 8));
  const fieldHealthLabel =
    active.health === 'Good' ? 'Good' : active.health === 'Moderate' ? 'Fair' : 'Low';

  const composition = (Object.keys(FORMULA_LABELS) as FormulaKey[]).map((key) => ({
    key,
    name: FORMULA_LABELS[key].name,
    pct: formula[key],
    color: FORMULA_LABELS[key].color,
  }));

  const moistureSeries = zones.map((z, i) => ({
    label: z.name,
    color: ZONE_COLORS[i],
    highlight: z.id === selectedZone,
    values: DAYS.map((_, di) => Math.max(18, Math.min(95, z.sat - 6 + di * 1.1 + Math.sin(di + i) * 3))),
  }));
  const releaseSeries = zones.map((z, i) => ({
    label: z.name,
    color: ZONE_COLORS[i],
    highlight: z.id === selectedZone,
    values: DAYS.map((_, di) => Math.max(5, Math.min(26, z.releaseRate - 1.5 + di * 0.35 + Math.sin(di) * 1.2))),
  }));
  const effSeries = zones.map((z, i) => ({
    label: z.name,
    color: ZONE_COLORS[i],
    highlight: z.id === selectedZone,
    values: DAYS.map((_, di) => Math.max(32, Math.min(98, z.efficiency - 4 + di * 0.7 + Math.cos(di + i) * 2.5))),
  }));

  const satColor = (sat: number) => {
    if (sat >= 70) return 'from-emerald-500 to-lime-400';
    if (sat >= 55) return 'from-lime-500 to-yellow-400';
    if (sat >= 40) return 'from-amber-500 to-orange-400';
    return 'from-orange-600 to-rose-500';
  };

  const panel = 'bg-[#121a27] rounded-xl border border-[#1e2d40]';

  return (
    <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden bg-[#0b131e]">
      <div className="p-3 space-y-2.5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-base font-bold tracking-wide leading-tight">
              <span className="text-cyan-300">INTELLIGENT</span>{' '}
              <span className="text-violet-300">HYDROGELS</span>
            </h1>
            <p className="text-[10px] text-slate-500">
              Polymer Dynamics · Showing data for{' '}
              <span className="text-violet-300 font-semibold">{active.name}</span>
              {' '}· Farm avg sat {farmAvgSat}%
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {zones.map((z) => (
              <button
                key={z.id}
                type="button"
                onClick={() => pickZone(z.id)}
                className={`text-[10px] px-2.5 py-1 rounded-lg border font-semibold transition ${
                  selectedZone === z.id
                    ? 'bg-violet-600/30 border-violet-400/50 text-violet-100'
                    : 'bg-[#121a27] border-[#1e2d40] text-slate-400 hover:border-slate-500'
                }`}
              >
                {z.name}
                {fieldSoilMap?.[z.id] && (
                  <span
                    className="ml-1 inline-block w-2 h-2 rounded-sm align-middle"
                    style={{ background: getSoilClass(fieldSoilMap[z.id]).base }}
                    title={getSoilClass(fieldSoilMap[z.id]).shortLabel}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {[
            {
              icon: <Droplets size={14} className="text-cyan-400" />,
              t: `${active.name.toUpperCase()} SATURATION`,
              v: `${fieldSat}%`,
              s: fieldSat >= 50 && fieldSat <= 70 ? 'Optimal 50–70%' : fieldSat > 70 ? 'Above optimal' : 'Below optimal',
              sc: fieldSat >= 50 && fieldSat <= 70 ? 'text-emerald-400' : 'text-amber-400',
            },
            {
              icon: <FlaskConical size={14} className="text-violet-400" />,
              t: 'HOLDING CAPACITY',
              v: `${fieldHolding} ml/kg`,
              s: fieldHolding >= 400 ? 'High · formula tuned' : 'Moderate · formula tuned',
              sc: fieldHolding >= 400 ? 'text-emerald-400' : 'text-amber-400',
            },
            {
              icon: <Activity size={14} className="text-sky-400" />,
              t: 'EFFICIENCY',
              v: `${projectedEff}%`,
              s: fieldHealthLabel,
              sc: projectedEff >= 70 ? 'text-emerald-400' : projectedEff >= 55 ? 'text-amber-400' : 'text-rose-400',
            },
            {
              icon: <Waves size={14} className="text-blue-400" />,
              t: 'RELEASE RATE',
              v: `${projectedRelease} ml/day`,
              s: projectedRelease >= 10 && projectedRelease <= 16 ? 'Optimal' : 'Check zone',
              sc: projectedRelease >= 10 && projectedRelease <= 16 ? 'text-amber-400' : 'text-rose-400',
            },
            {
              icon: <Hexagon size={14} className="text-orange-400" />,
              t: 'ACTIVE HYDROGELS',
              v: fieldActiveGels.toLocaleString(),
              s: `${fieldAcres} ac · ${fieldPlants} plants`,
              sc: 'text-orange-300',
            },
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

        <div className={`${panel} p-3 border-violet-500/40`}>
          <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
            <h2 className="text-[11px] font-bold text-white tracking-wide flex items-center gap-2">
              <span
                className="inline-block w-3.5 h-3.5 rounded-sm border border-white/20"
                style={{ background: soilInfo.base }}
              />
              INTELLIGENT HYDROGELS · MATCHED TO {soilInfo.label.toUpperCase()}
            </h2>
            <div className="flex flex-wrap gap-1">
              {SOIL_CLASSES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActiveSoil(s.id)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold border transition ${
                    activeSoilId === s.id
                      ? 'border-violet-400/50 bg-violet-500/20 text-violet-100'
                      : 'border-[#1e2d40] text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.base }} />
                  {s.shortLabel}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-slate-500 mb-1">
            Guidance for <span className="text-violet-300 font-semibold">{active.name}</span>
            {' '}({soilInfo.shortLabel}). Change zone chips above to edit another field.
          </p>
          <p className="text-[11px] text-slate-300 leading-relaxed mb-2">{soilInfo.hydrogelTip}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="rounded-lg bg-[#0b131e] border border-[#1e2d40] p-2.5">
              <div className="text-[9px] text-slate-500 uppercase font-semibold">Soil water behaviour</div>
              <div className="text-sky-300 font-semibold mt-0.5">{soilInfo.waterHolding}</div>
              <div className="text-slate-500 text-[10px] mt-0.5">Drainage: {soilInfo.drainage}</div>
            </div>
            <div className="rounded-lg bg-[#0b131e] border border-[#1e2d40] p-2.5">
              <div className="text-[9px] text-slate-500 uppercase font-semibold">pH / chemistry</div>
              <div className="text-lime-300 font-semibold mt-0.5">{soilInfo.phRange}</div>
              <div className="text-slate-500 text-[10px] mt-0.5 leading-snug">{soilInfo.nutrientNote}</div>
            </div>
            <div className="rounded-lg bg-[#0b131e] border border-[#1e2d40] p-2.5">
              <div className="text-[9px] text-slate-500 uppercase font-semibold">Formula guidance</div>
              <div className="text-violet-300 font-semibold mt-0.5">
                {activeSoilId === 'red' || activeSoilId === 'lateritic'
                  ? 'Drought Hold / higher PAM'
                  : activeSoilId === 'black'
                    ? 'Balanced · watch over-wet'
                    : activeSoilId === 'alkaline'
                      ? 'Salt-tolerant grade + leach'
                      : 'Balanced all-round'}
              </div>
              <div className="text-slate-500 text-[10px] mt-0.5 leading-snug">
                {activeSoilId === 'alkaline'
                  ? 'Pair gels with gypsum & drainage plan'
                  : activeSoilId === 'black'
                    ? 'Short drip cycles; gels as buffer only'
                    : 'Align recharge with scheduled irrigation'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
          <div className={`${panel} lg:col-span-4 p-3`}>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
              <div className="space-y-1.5">
                {[
                  { l: 'Water Absorbed', v: `${fieldAbsorbed} mm` },
                  { l: 'Water Stored', v: `${fieldStored.toLocaleString()} L` },
                  { l: 'Water Released', v: `${projectedRelease} mm` },
                  { l: 'Use Efficiency', v: `${projectedEff}%` },
                ].map((m) => (
                  <div key={m.l} className="rounded-lg bg-[#0b131e] border border-[#1e2d40] px-2 py-1.5">
                    <div className="text-[8px] text-slate-500 leading-none">{m.l}</div>
                    <div className="text-xs font-semibold text-cyan-300 mt-0.5">{m.v}</div>
                  </div>
                ))}
              </div>
              <HydrogelSphere sat={fieldSat} />
              <div className="space-y-1.5">
                {[
                  { l: 'Field', v: active.name },
                  { l: 'Soil Type', v: soilInfo.shortLabel },
                  { l: 'Soil Moisture', v: `${fieldMeta.soilMoisture}%` },
                  { l: 'Degradation', v: `${active.health === 'Low' ? 'Elevated' : 'Normal'} (${degradation}%)` },
                ].map((m) => (
                  <div key={m.l} className="rounded-lg bg-[#0b131e] border border-[#1e2d40] px-2 py-1.5">
                    <div className="text-[8px] text-slate-500 leading-none">{m.l}</div>
                    <div className="text-[10px] font-semibold text-white mt-0.5 leading-snug">{m.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`${panel} lg:col-span-4 p-3`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-[11px] font-bold text-white tracking-wide">FIELD HYDROGEL SATURATION MAP</h2>
              <span className="text-[9px] text-slate-500">4 Fields</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {zones.map((z) => (
                <button
                  key={z.id}
                  type="button"
                  onClick={() => setSelectedZone(z.id)}
                  className={`rounded-xl bg-gradient-to-br ${satColor(z.sat)} min-h-[72px] flex flex-col items-center justify-center border-2 transition ${
                    selectedZone === z.id ? 'border-white shadow-md' : 'border-transparent'
                  }`}
                >
                  <span className="text-[11px] font-bold text-white drop-shadow">{z.name}</span>
                  <span className="text-2xl font-bold text-white drop-shadow-md leading-none">{z.sat}%</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-2 text-[9px] text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> ≥70%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> 40–70%</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400" /> &lt;40%</span>
            </div>
          </div>

          <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
            <div className={`${panel} p-3`}>
              <h2 className="text-[11px] font-bold text-white tracking-wide mb-2">CURRENT HYDROGEL STATUS</h2>
              <div className="flex gap-3 items-start">
                <div className="relative w-12 h-12 shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="38" stroke="#1e2d40" strokeWidth="9" fill="none" />
                    <circle cx="50" cy="50" r="38" stroke="#8b5cf6" strokeWidth="9" fill="none"
                      strokeDasharray={2 * Math.PI * 38}
                      strokeDashoffset={2 * Math.PI * 38 * (1 - active.sat / 100)}
                      strokeLinecap="round" />
                  </svg>
                  <Droplets className="absolute inset-0 m-auto text-violet-400" size={16} />
                </div>
                <div className="flex-1 space-y-0.5 text-[10px] min-w-0">
                  {[
                    ['Polymer Type', 'Super Absorbent Polymer'],
                    ['Composition', 'PAM + Cellulose'],
                    ['Particle Size', '1 – 4 mm'],
                    ['App. Rate', '15 kg/acre'],
                    ['Holding Cap.', `${fieldHolding} ml/kg`],
                    ['Degradation', `${active.health === 'Low' ? 'Elevated' : 'Normal'} (${degradation}%)`],
                    ['Life Remaining', '10 – 12 Months'],
                    ['Next Reapp.', '20 Jun 2025'],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between gap-1">
                      <span className="text-slate-500 truncate">{l}</span>
                      <span className="text-slate-200 text-right shrink-0">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className={`${panel} p-3`}>
              <h2 className="text-[11px] font-bold text-white tracking-wide mb-1">HYDROGEL NETWORK ({active.name.toUpperCase()})</h2>
              <svg viewBox="0 0 140 48" className="w-full h-10 mb-1">
                {[[18, 24], [40, 12], [62, 28], [84, 10], [110, 22], [52, 40], [78, 38]].map(([cx, cy], i) => (
                  <circle key={i} cx={cx} cy={cy} r="3.2" fill="#22d3ee" />
                ))}
                <path d="M18 24 L40 12 L62 28 L84 10 L110 22 M40 12 L52 40 L78 38 L110 22 M62 28 L52 40" stroke="#6366f1" strokeWidth="1.2" fill="none" opacity="0.85" />
              </svg>
              <div className="space-y-0.5 text-[10px]">
                <div className="flex justify-between"><span className="text-slate-500">Network Density</span><span className="text-emerald-400 font-semibold">High ({active.efficiency}%)</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Connectivity Index</span><span className="text-white font-semibold">0.{Math.round(72 + active.efficiency / 12)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Distribution Uniformity</span><span className="text-emerald-400 font-semibold">Good ({Math.min(95, active.sat + 8)}%)</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Formula improver — adjust polymer mix for field needs */}
        <div className={`${panel} p-3`}>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-violet-400" />
              <h2 className="text-[11px] font-bold text-white tracking-wide">
                IMPROVE FORMULA · {active.name}
              </h2>
              {appliedPreset !== 'custom' && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  {PRESETS.find((p) => p.id === appliedPreset)?.label || appliedPreset}
                </span>
              )}
              {appliedPreset === 'custom' && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Custom mix
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFormulaOpen((v) => !v)}
                className="text-[10px] text-slate-400 hover:text-white px-2 py-1 rounded border border-[#1e2d40]"
              >
                {formulaOpen ? 'Hide' : 'Show'} editor
              </button>
              <button
                type="button"
                onClick={resetFormula}
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white px-2 py-1 rounded border border-[#1e2d40]"
              >
                <RotateCcw size={11} /> Reset
              </button>
              <button
                type="button"
                onClick={saveFormula}
                className="flex items-center gap-1 text-[10px] font-semibold text-violet-100 bg-violet-600/40 hover:bg-violet-600/60 px-2.5 py-1 rounded border border-violet-500/40"
              >
                {savedFlash ? <Check size={11} /> : <Beaker size={11} />}
                {savedFlash ? 'Applied' : 'Apply to field'}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                title={p.need}
                className={`text-[10px] px-2.5 py-1 rounded-lg border transition ${
                  appliedPreset === p.id
                    ? 'bg-cyan-600/25 border-cyan-400/40 text-cyan-200'
                    : 'bg-[#0b131e] border-[#1e2d40] text-slate-400 hover:border-slate-500'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {formulaOpen && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-7 space-y-2">
                {(Object.keys(FORMULA_LABELS) as FormulaKey[]).map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <div className="w-28 sm:w-36 shrink-0">
                      <div className="text-[10px] text-slate-300 font-medium truncate">{FORMULA_LABELS[key].name}</div>
                      <div className="text-[8px] text-slate-500 truncate">{FORMULA_LABELS[key].tip}</div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={70}
                      value={formula[key]}
                      onChange={(e) => setComponent(key, Number(e.target.value))}
                      className="flex-1 h-1.5 accent-violet-500"
                    />
                    <div className="w-10 text-right text-[11px] font-bold text-white tabular-nums">
                      {formula[key]}%
                    </div>
                  </div>
                ))}
                <div className="text-[9px] text-slate-500 pt-1">
                  Sliders auto-normalize to 100%. Choose a preset for your need, or fine-tune each polymer.
                </div>
              </div>

              <div className="lg:col-span-5 grid grid-cols-2 gap-2">
                {[
                  { l: 'Projected holding', v: `${impact.holding} ml/kg`, d: impact.holding - baseHolding },
                  { l: 'Projected efficiency', v: `${impact.efficiency}%`, d: impact.efficiency - fieldEff },
                  { l: 'Projected release', v: `${impact.release} ml/day`, d: +(impact.release - fieldRelease).toFixed(1) },
                  { l: 'Degradation', v: `${impact.degradation}%`, d: impact.degradation - baseDeg },
                  { l: 'Bio score', v: `${impact.bioScore}/100`, d: null as number | null },
                  { l: 'Gel strength', v: `${impact.strength}/100`, d: null as number | null },
                ].map((m) => (
                  <div key={m.l} className="rounded-lg bg-[#0b131e] border border-[#1e2d40] px-2 py-1.5">
                    <div className="text-[8px] text-slate-500">{m.l}</div>
                    <div className="text-sm font-bold text-white leading-tight">{m.v}</div>
                    {m.d !== null && m.d !== 0 && (
                      <div className={`text-[9px] font-semibold ${m.d > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {m.d > 0 ? '+' : ''}{m.d} vs base
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {[
            { title: 'MOISTURE RETENTION TREND (7 DAYS)', series: moistureSeries },
            { title: 'WATER RELEASE TREND (7 DAYS)', series: releaseSeries },
            { title: 'EFFICIENCY TREND (7 DAYS)', series: effSeries },
          ].map((c) => (
            <div key={c.title} className={`${panel} p-2.5`}>
              <div className="text-[10px] font-bold text-slate-300 mb-1">{c.title}</div>
              <div className="flex flex-wrap gap-x-2 gap-y-0.5 mb-1 text-[8px] text-slate-500">
                {c.series.map((s) => (
                  <span key={s.label} className="inline-flex items-center gap-1">
                    <span className="w-2 h-0.5 rounded-full" style={{ background: s.color }} />
                    {s.label.replace('Field ', 'F')}
                  </span>
                ))}
              </div>
              <LineChart series={c.series} height={64} />
              <div className="flex justify-between text-[8px] text-slate-600 px-0.5">
                {DAYS.map((d) => <span key={d}>{d}</span>)}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-12 gap-2">
          <div className={`${panel} p-3 xl:col-span-2 flex flex-col items-center justify-center`}>
            <div className="text-[9px] text-slate-500 font-semibold uppercase mb-1 text-center">Performance Index</div>
            <div className="relative w-20 h-20">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="36" stroke="#1e2d40" strokeWidth="8" fill="none" />
                <circle cx="50" cy="50" r="36" stroke="#8b5cf6" strokeWidth="8" fill="none"
                  strokeDasharray={2 * Math.PI * 36}
                  strokeDashoffset={2 * Math.PI * 36 * (1 - performanceIndex / 100)}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-white leading-none">{performanceIndex}</span>
                <span className="text-[8px] text-slate-500">/100</span>
              </div>
            </div>
            <div className="text-emerald-400 text-[11px] font-bold mt-1">
              {performanceIndex >= 80 ? 'EXCELLENT' : performanceIndex >= 60 ? 'GOOD' : 'FAIR'}
            </div>
          </div>

          <div className={`${panel} p-2.5 xl:col-span-4 overflow-x-auto col-span-2 md:col-span-2`}>
            <div className="text-[10px] font-bold text-slate-300 mb-1">ZONE-WISE HYDROGEL SUMMARY</div>
            <table className="w-full text-[10px] min-w-[340px]">
              <thead>
                <tr className="text-slate-500 border-b border-[#1e2d40]">
                  <th className="text-left py-1 font-medium">Zone</th>
                  <th className="text-right py-1 font-medium">Sat</th>
                  <th className="text-right py-1 font-medium">Eff</th>
                  <th className="text-right py-1 font-medium">Stored</th>
                  <th className="text-right py-1 font-medium">Release</th>
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
                    <td className="py-1 text-white font-medium">{z.name}</td>
                    <td className={`text-right ${z.sat < 40 ? 'text-rose-400' : 'text-slate-200'}`}>{z.sat}%</td>
                    <td className="text-right text-slate-200">{z.efficiency}%</td>
                    <td className="text-right text-slate-300">{z.waterStored.toLocaleString()}</td>
                    <td className="text-right text-slate-300">{z.releaseRate}</td>
                    <td className={`text-right font-semibold ${
                      z.health === 'Good' ? 'text-emerald-400' : z.health === 'Moderate' ? 'text-amber-400' : 'text-rose-400'
                    }`}>{z.health}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={`${panel} p-2.5 xl:col-span-2`}>
            <div className="text-[10px] font-bold text-slate-300 mb-1">COMPOSITION</div>
            <div className="flex items-center gap-2">
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
                <text x="40" y="43" textAnchor="middle" fill="#e2e8f0" fontSize="8" fontWeight="700">98%</text>
              </svg>
              <div className="space-y-0.5 text-[8px] flex-1 min-w-0">
                {composition.map((c) => (
                  <div key={c.name} className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c.color }} />
                    <span className="text-slate-400 truncate flex-1">{c.name}</span>
                    <span className="text-slate-300">{c.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className={`${panel} p-2.5 xl:col-span-2 flex flex-col items-center`}>
            <div className="text-[10px] font-bold text-slate-300 mb-1 self-start">DEGRADATION</div>
            <div className="relative w-16 h-16">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="36" stroke="#1e2d40" strokeWidth="9" fill="none" />
                <circle cx="50" cy="50" r="36" stroke="#a78bfa" strokeWidth="9" fill="none"
                  strokeDasharray={2 * Math.PI * 36}
                  strokeDashoffset={2 * Math.PI * 36 * (1 - degradation / 100)}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">{degradation}%</div>
            </div>
            <div className="w-full h-1 rounded-full bg-[#0b131e] mt-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full" style={{ width: `${degradation}%` }} />
            </div>
            <div className="text-[8px] text-slate-500 mt-1 text-center">Life 10–12 mo · Next 20 Jun 2025</div>
          </div>

          <div className={`${panel} p-2.5 xl:col-span-2 col-span-2 md:col-span-1`}>
            <div className="text-[10px] font-bold text-slate-300 mb-1">AI & ALERTS · {active.name}</div>
            <div className="space-y-1.5 text-[9px]">
              {fieldSat < 45 ? (
                <div className="flex gap-1.5 items-start">
                  <Droplets size={11} className="text-sky-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">Irrigate {active.name} — sat {fieldSat}%</span>
                </div>
              ) : fieldSat > 78 ? (
                <div className="flex gap-1.5 items-start">
                  <Droplets size={11} className="text-cyan-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">{active.name} well saturated — hold irrigation</span>
                </div>
              ) : (
                <div className="flex gap-1.5 items-start">
                  <Leaf size={11} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">{active.name} moisture in good range</span>
                </div>
              )}
              <div className="flex gap-1.5 items-start">
                <Beaker size={11} className="text-violet-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">
                  Eff {fieldEff}% · Release {fieldRelease} ml/day · {soilInfo.shortLabel}
                </span>
              </div>
              {active.health === 'Low' && (
                <div className="flex gap-1.5 items-start">
                  <AlertTriangle size={11} className="text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">Low performance on {active.name}</span>
                </div>
              )}
              {sim.env.temperature > 34 && (
                <div className="flex gap-1.5 items-start">
                  <Thermometer size={11} className="text-rose-400 shrink-0 mt-0.5" />
                  <span className="text-slate-300">High temp may raise release on {active.name}</span>
                </div>
              )}
              <div className="flex gap-1.5 items-start">
                <Info size={11} className="text-sky-400 shrink-0 mt-0.5" />
                <span className="text-slate-300">{fieldPlants} plants · {fieldAcres} acres monitored</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
