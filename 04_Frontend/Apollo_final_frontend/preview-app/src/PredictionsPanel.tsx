import { useMemo, useState, useRef, useEffect, type ReactNode } from 'react';
import {
  Brain, Shield, Droplets, Leaf, Hexagon, TrendingUp, Sun,
  Thermometer, CloudRain, Activity, CheckCircle2, Info,
  Sparkles, ArrowRight, RefreshCw, Server,
} from 'lucide-react';
import type { SimState, GrapeVarietyId } from './simulation';
import { STAGE_RANGES, FIELDS, getCropCatalogEntry, getGrapeVariety } from './simulation';
import { useFarmOptional } from './context/FarmContext';
import { useSettingsOptional } from './context/SettingsContext';


/** Interactive tooltip — hover / focus / touch */
function Tip({
  content,
  children,
  side = 'top',
  wide,
}: {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  wide?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || tipRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    };
  }, [open]);

  const pos =
    side === 'bottom'
      ? 'top-full left-1/2 -translate-x-1/2 mt-2'
      : side === 'left'
        ? 'right-full top-1/2 -translate-y-1/2 mr-2'
        : side === 'right'
          ? 'left-full top-1/2 -translate-y-1/2 ml-2'
          : 'bottom-full left-1/2 -translate-x-1/2 mb-2';

  return (
    <span
      ref={ref}
      className="relative inline-flex max-w-full"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={(e) => {
        e.stopPropagation();
        setOpen((v) => !v);
      }}
    >
      {children}
      {open && (
        <span
          ref={tipRef}
          role="tooltip"
          className={`absolute z-50 ${pos} ${wide ? 'w-56' : 'w-44'} pointer-events-auto`}
        >
          <span className="block rounded-lg border border-violet-500/40 bg-[#0f172a] px-2.5 py-1.5 text-[10px] text-slate-200 shadow-xl shadow-black/50 leading-snug">
            {content}
          </span>
        </span>
      )}
    </span>
  );
}

type ModuleId = 'yield' | 'disease' | 'irrigation' | 'soil' | 'growth';

const MODULES: {
  id: ModuleId;
  title: string;
  desc: string;
  icon: typeof Brain;
  color: string;
  ring: string;
}[] = [
  { id: 'yield', title: 'Crop Yield Prediction', desc: 'Predict grape yield based on environmental & soil factors', icon: TrendingUp, color: 'text-violet-300', ring: 'border-violet-500/50 bg-violet-500/10' },
  { id: 'disease', title: 'Disease Risk Prediction', desc: 'Predict probability of diseases & early detection', icon: Shield, color: 'text-emerald-300', ring: 'border-emerald-500/40 bg-emerald-500/5' },
  { id: 'irrigation', title: 'Irrigation Prediction', desc: 'Predict optimal irrigation need & water requirement', icon: Droplets, color: 'text-sky-300', ring: 'border-sky-500/40 bg-sky-500/5' },
  { id: 'soil', title: 'Soil Health Prediction', desc: 'Forecast soil health status & nutrient levels', icon: Leaf, color: 'text-lime-300', ring: 'border-lime-500/40 bg-lime-500/5' },
  { id: 'growth', title: 'Growth Stage Prediction', desc: 'Predict next growth stage & timeline', icon: Hexagon, color: 'text-fuchsia-300', ring: 'border-fuchsia-500/40 bg-fuchsia-500/5' },
];

function RingGauge({
  value,
  max = 100,
  label,
  sub,
  color = '#8b5cf6',
  size = 110,
  centerText,
}: {
  value: number;
  max?: number;
  label?: string;
  sub?: string;
  color?: string;
  size?: number;
  centerText?: string;
}) {
  const r = 38;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, value / max);
  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={r} stroke="#1e2d40" strokeWidth="8" fill="none" />
          <circle
            cx="50" cy="50" r={r}
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-white leading-none">{centerText ?? value}</span>
          {label && <span className="text-[9px] text-slate-400 mt-0.5">{label}</span>}
        </div>
      </div>
      {sub && <div className="text-[10px] text-slate-400 mt-1 text-center">{sub}</div>}
    </div>
  );
}

function YieldChart({ points }: { points: { label: string; pred: number; hist: number }[] }) {
  const w = 420;
  const h = 160;
  const pad = { l: 28, r: 12, t: 16, b: 28 };
  const maxY = 5;
  const n = points.length;
  const x = (i: number) => pad.l + (i / Math.max(1, n - 1)) * (w - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / maxY) * (h - pad.t - pad.b);
  const predPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.pred)}`).join(' ');
  const histPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.hist)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[160px]">
      {[1, 2, 3, 4, 5].map((v) => (
        <g key={v}>
          <line x1={pad.l} x2={w - pad.r} y1={y(v)} y2={y(v)} stroke="#1e2d40" strokeWidth="1" />
          <text x={pad.l - 4} y={y(v) + 3} textAnchor="end" fill="#64748b" fontSize="8">{v}</text>
        </g>
      ))}
      <path d={histPath} fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 3" />
      <path d={predPath} fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" />
      {/* area under pred */}
      <path
        d={`${predPath} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z`}
        fill="url(#yieldFill)"
        opacity="0.25"
      />
      <defs>
        <linearGradient id="yieldFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {points.map((p, i) => (
        <g key={p.label}>
          <circle cx={x(i)} cy={y(p.pred)} r="3.5" fill="#c4b5fd" stroke="#7c3aed" strokeWidth="1" />
          <text x={x(i)} y={y(p.pred) - 8} textAnchor="middle" fill="#e2e8f0" fontSize="8" fontWeight="600">
            {p.pred.toFixed(2)}
          </text>
          <text x={x(i)} y={h - 8} textAnchor="middle" fill="#64748b" fontSize="7">
            {p.label}
          </text>
        </g>
      ))}
      <text x={pad.l} y={12} fill="#64748b" fontSize="8">tons/acre</text>
    </svg>
  );
}

function Spark({ values, color = '#8b5cf6' }: { values: number[]; color?: string }) {
  const w = 120;
  const h = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const path = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * w;
      const y = h - 2 - ((v - min) / Math.max(0.01, max - min)) * (h - 4);
      return `${i === 0 ? 'M' : 'L'}${x},${y}`;
    })
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7">
      <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}


function RadarChart({ scores }: { scores: { label: string; value: number; color: string }[] }) {
  const cx = 90, cy = 90, r = 70;
  const n = scores.length;
  const pts = scores.map((s, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const rr = (s.value / 100) * r;
    return { x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr, lx: cx + Math.cos(a) * (r + 14), ly: cy + Math.sin(a) * (r + 14), a, s };
  });
  const poly = pts.map((p) => `${p.x},${p.y}`).join(' ');
  return (
    <svg viewBox="0 0 180 180" className="w-full max-w-[180px] mx-auto">
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <circle key={t} cx={cx} cy={cy} r={r * t} fill="none" stroke="#1e2d40" strokeWidth="1" />
      ))}
      {pts.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(p.a) * r} y2={cy + Math.sin(p.a) * r} stroke="#1e2d40" strokeWidth="1" />
      ))}
      <polygon points={poly} fill="rgba(139,92,246,0.25)" stroke="#a78bfa" strokeWidth="2" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill={p.s.color} />
          <text x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="middle" fill="#94a3b8" fontSize="7">{p.s.label}</text>
        </g>
      ))}
    </svg>
  );
}

function NeuralDecor() {
  const nodes = [
    [20, 20], [20, 50], [20, 80],
    [60, 15], [60, 40], [60, 65], [60, 90],
    [100, 30], [100, 55], [100, 80],
    [140, 50],
  ];
  return (
    <svg viewBox="0 0 160 110" className="w-full h-24 opacity-90">
      <defs>
        <linearGradient id="nnGlow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
      </defs>
      {nodes.slice(0, 3).map((a, i) =>
        nodes.slice(3, 7).map((b, j) => (
          <line key={`a${i}${j}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#6366f1" strokeWidth="0.6" opacity="0.35" />
        ))
      )}
      {nodes.slice(3, 7).map((a, i) =>
        nodes.slice(7, 10).map((b, j) => (
          <line key={`b${i}${j}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#06b6d4" strokeWidth="0.6" opacity="0.35" />
        ))
      )}
      {nodes.slice(7, 10).map((a, i) => (
        <line key={`c${i}`} x1={a[0]} y1={a[1]} x2={140} y2={50} stroke="#a78bfa" strokeWidth="0.7" opacity="0.5" />
      ))}
      {nodes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i === nodes.length - 1 ? 5 : 3.2} fill={i === nodes.length - 1 ? '#c4b5fd' : '#6366f1'} />
      ))}
    </svg>
  );
}

function StageTimeline({ currentId, day, stages }: { currentId: string; day: number; stages?: { id: string; label: string }[] }) {
  const track = stages && stages.length ? stages : STAGE_RANGES;
  return (
    <div className="w-full">
      <div className="flex items-center gap-0.5">
        {track.map((s, i) => {
          const active = s.id === currentId;
          const past = day >= s.end;
          return (
            <div key={s.id} className="flex-1 flex flex-col items-center relative">
              <div className={`text-base mb-0.5 ${active ? 'scale-125' : 'opacity-60'}`}>{s.emoji}</div>
              <div className={`w-full h-1.5 rounded-full ${past || active ? 'bg-fuchsia-500' : 'bg-[#1e2d40]'}`} />
              {i < track.length - 1 && (
                <div className="absolute top-[22px] right-0 w-1/2 h-1.5 translate-x-1/2 pointer-events-none" />
              )}
              <div className={`text-[7px] mt-1 text-center leading-tight ${active ? 'text-fuchsia-300 font-bold' : 'text-slate-500'}`}>
                {s.label.split(' ')[0]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FactorBars({ factors }: { factors: { label: string; value: number; max: number; color: string }[] }) {
  return (
    <div className="space-y-2">
      {factors.map((f) => (
        <div key={f.label}>
          <div className="flex justify-between text-[9px] mb-0.5">
            <span className="text-slate-400">{f.label}</span>
            <span className="text-white font-semibold">{typeof f.value === 'number' && f.value % 1 !== 0 ? f.value.toFixed(1) : f.value}{f.max === 100 ? '%' : ''}</span>
          </div>
          <div className="h-2 rounded-full bg-[#0b131e] overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, (f.value / f.max) * 100)}%`, background: f.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}


type StageDetail = {
  id: string;
  shortDesc: string;
  longDesc: string;
  yieldImpact: number;
  requirements: { temp: string; moisture: string; sunlight: string; nutrients: string; irrigation: string; ph: string };
  risks: { title: string; detail: string }[];
  recommendations: string[];
};

const STAGE_DETAILS: StageDetail[] = [
  {
    id: 'germination',
    shortDesc: 'Seed swells and radicle emerges. Foundation of the vine.',
    longDesc: 'Seed absorbs water, radicle breaks the seed coat and first shoot appears. Critical for stand establishment.',
    yieldImpact: 15,
    requirements: { temp: '18 – 25 °C', moisture: '70 – 80%', sunlight: '4 – 6 hrs/day', nutrients: 'Starter N-P', irrigation: 'Light, frequent', ph: '5.5 – 6.5' },
    risks: [
      { title: 'Waterlogging', detail: 'Seed rot risk' },
      { title: 'Cold soil', detail: 'Below 15°C slows emergence' },
      { title: 'Damping-off', detail: 'Fungal seedling death' },
    ],
    recommendations: ['Keep soil moist but not saturated', 'Ensure seedbed is fine and firm', 'Protect from birds and soil crusting', 'Monitor soil temperature daily'],
  },
  {
    id: 'vegetative',
    shortDesc: 'Rapid shoot and leaf expansion. Builds canopy and root system.',
    longDesc: 'Vines grow leaves and canes. Strong vegetative growth sets capacity for flowering and fruit load.',
    yieldImpact: 35,
    requirements: { temp: '22 – 28 °C', moisture: '60 – 75%', sunlight: '6 – 8 hrs/day', nutrients: 'N focus, balanced P-K', irrigation: 'Moderate', ph: '5.5 – 6.5' },
    risks: [
      { title: 'Nitrogen excess', detail: 'Too much canopy, poor fruit' },
      { title: 'Drought stress', detail: 'Stunted shoot growth' },
      { title: 'Heat waves', detail: 'Leaf scorch possible' },
    ],
    recommendations: ['Train shoots and manage canopy early', 'Apply nitrogen in split doses', 'Maintain consistent soil moisture', 'Scout for pests on young leaves'],
  },
  {
    id: 'flowering',
    shortDesc: 'Flower clusters open and pollination occurs. Critical for fruit set.',
    longDesc: 'Inflorescences bloom; successful pollination determines berry number. Highly sensitive to weather and nutrition.',
    yieldImpact: 85,
    requirements: { temp: '20 – 28 °C', moisture: '60 – 70%', sunlight: '6 – 8 hrs/day', nutrients: 'Boron, Zinc critical', irrigation: 'Moderate', ph: '5.5 – 6.5' },
    risks: [
      { title: 'High humidity', detail: 'Risk of downy mildew' },
      { title: 'Low boron', detail: 'Poor fruit set' },
      { title: 'Heat stress', detail: 'Above 32°C' },
      { title: 'Water stress', detail: 'Affects pollination' },
    ],
    recommendations: ['Maintain soil moisture 60–70%', 'Ensure adequate boron (1–1.5 kg/ha)', 'Apply zinc sulfate foliar spray (0.5%)', 'Monitor for downy mildew'],
  },
  {
    id: 'fruit_set',
    shortDesc: 'Fertilized flowers become berries. Cluster architecture forms.',
    longDesc: 'Berries begin to form after successful pollination. Drop of unfertilized flowers is normal; stress increases shatter.',
    yieldImpact: 70,
    requirements: { temp: '22 – 30 °C', moisture: '55 – 70%', sunlight: '7 – 9 hrs/day', nutrients: 'K & Ca important', irrigation: 'Steady', ph: '5.5 – 6.5' },
    risks: [
      { title: 'Irregular irrigation', detail: 'Berry shatter' },
      { title: 'Hot dry winds', detail: 'Poor set' },
      { title: 'Low calcium', detail: 'Weak berry attachment' },
    ],
    recommendations: ['Avoid drought or overwatering swings', 'Support with potassium and calcium', 'Protect clusters from extreme heat', 'Continue disease monitoring'],
  },
  {
    id: 'berry',
    shortDesc: 'Berries expand in size. Green hard stage before veraison.',
    longDesc: 'Cell division then expansion. Berry size and potential yield are largely set in this phase.',
    yieldImpact: 55,
    requirements: { temp: '24 – 32 °C', moisture: '50 – 65%', sunlight: '7 – 10 hrs/day', nutrients: 'K primary, Mg', irrigation: 'Moderate–High', ph: '5.5 – 6.5' },
    risks: [
      { title: 'Water deficit', detail: 'Small berries' },
      { title: 'Sunburn', detail: 'Exposed clusters' },
      { title: 'Bunch rot risk', detail: 'If canopy too dense' },
    ],
    recommendations: ['Balance irrigation for size without cracking', 'Leaf thinning for light and air', 'Potassium for berry firmness', 'Watch for birds as berries soften later'],
  },
  {
    id: 'ripening',
    shortDesc: 'Veraison to full color. Sugar rises, acids fall.',
    longDesc: 'Berries soften and change color. Sugar accumulation and aroma development define quality.',
    yieldImpact: 45,
    requirements: { temp: '22 – 30 °C', moisture: '45 – 60%', sunlight: '8 – 10 hrs/day', nutrients: 'K high, low N', irrigation: 'Reduced near harvest', ph: '5.5 – 6.5' },
    risks: [
      { title: 'Rain near harvest', detail: 'Dilution / rot' },
      { title: 'Extreme heat', detail: 'Raisined berries' },
      { title: 'Late irrigation', detail: 'Dilutes sugar' },
    ],
    recommendations: ['Reduce irrigation to concentrate sugars', 'Protect from rain if possible', 'Monitor Brix and taste regularly', 'Plan harvest windows by block'],
  },
  {
    id: 'harvest',
    shortDesc: 'Fruit reaches target maturity. Pick for quality and yield.',
    longDesc: 'Harvest timing balances sugar, acid, and flavor. Post-harvest vine recovery begins.',
    yieldImpact: 25,
    requirements: { temp: '18 – 28 °C', moisture: '40 – 55%', sunlight: '6 – 8 hrs/day', nutrients: 'Post-harvest N-K', irrigation: 'Light after pick', ph: '5.5 – 6.5' },
    risks: [
      { title: 'Overripe fruit', detail: 'Quality loss / birds' },
      { title: 'Labor delay', detail: 'Missed window' },
      { title: 'Rain at harvest', detail: 'Rot and dilution' },
    ],
    recommendations: ['Harvest in cool hours', 'Sort fruit in the field', 'Irrigate lightly after harvest for recovery', 'Plan pruning for next season'],
  },
];


/** Phenology stages by primary crop (profile). Grapes use full STAGE_RANGES. */
function stagesForCrop(cropId: string): { id: string; label: string; startDay: number; endDay: number }[] {
  const id = (cropId || 'grape').toLowerCase();
  if (id === 'grape' || /vine|raisin/.test(id)) {
    return STAGE_RANGES.map((s) => ({
      id: s.id,
      label: s.label,
      startDay: s.start ?? 0,
      endDay: s.end ?? 150,
    }));
  }
  // Generic agronomic tracks for other Maharashtra crops
  const tracks: Record<string, { id: string; label: string; startDay: number; endDay: number }[]> = {
    sugarcane: [
      { id: 'germination', label: 'Germination', startDay: 1, endDay: 30 },
      { id: 'vegetative', label: 'Tillering', startDay: 31, endDay: 100 },
      { id: 'flowering', label: 'Grand growth', startDay: 101, endDay: 200 },
      { id: 'fruit_set', label: 'Cane maturity', startDay: 201, endDay: 300 },
      { id: 'ripening', label: 'Ripening', startDay: 301, endDay: 360 },
      { id: 'harvest', label: 'Harvest', startDay: 361, endDay: 400 },
    ],
    cotton: [
      { id: 'germination', label: 'Emergence', startDay: 1, endDay: 20 },
      { id: 'vegetative', label: 'Square formation', startDay: 21, endDay: 55 },
      { id: 'flowering', label: 'Flowering', startDay: 56, endDay: 90 },
      { id: 'fruit_set', label: 'Boll development', startDay: 91, endDay: 130 },
      { id: 'ripening', label: 'Boll opening', startDay: 131, endDay: 160 },
      { id: 'harvest', label: 'Picking', startDay: 161, endDay: 180 },
    ],
    onion: [
      { id: 'germination', label: 'Transplant establish', startDay: 1, endDay: 20 },
      { id: 'vegetative', label: 'Leaf growth', startDay: 21, endDay: 55 },
      { id: 'fruit_set', label: 'Bulb initiation', startDay: 56, endDay: 90 },
      { id: 'ripening', label: 'Bulb swelling', startDay: 91, endDay: 120 },
      { id: 'harvest', label: 'Harvest & curing', startDay: 121, endDay: 140 },
    ],
    soybean: [
      { id: 'germination', label: 'Emergence', startDay: 1, endDay: 15 },
      { id: 'vegetative', label: 'Vegetative', startDay: 16, endDay: 40 },
      { id: 'flowering', label: 'Flowering', startDay: 41, endDay: 60 },
      { id: 'fruit_set', label: 'Pod set', startDay: 61, endDay: 85 },
      { id: 'ripening', label: 'Seed fill', startDay: 86, endDay: 110 },
      { id: 'harvest', label: 'Maturity', startDay: 111, endDay: 125 },
    ],
  };
  if (tracks[id]) return tracks[id];
  // Default field crop track
  return [
    { id: 'germination', label: 'Establishment', startDay: 1, endDay: 20 },
    { id: 'vegetative', label: 'Vegetative growth', startDay: 21, endDay: 55 },
    { id: 'flowering', label: 'Reproductive', startDay: 56, endDay: 85 },
    { id: 'fruit_set', label: 'Fruit / grain fill', startDay: 86, endDay: 115 },
    { id: 'ripening', label: 'Ripening', startDay: 116, endDay: 140 },
    { id: 'harvest', label: 'Harvest', startDay: 141, endDay: 160 },
  ];
}

function mapSimStageToCropStage(
  simStage: string,
  cropStages: { id: string; label: string; startDay: number; endDay: number }[],
  day: number,
): { id: string; label: string; startDay: number; endDay: number } {
  const byId = cropStages.find((s) => s.id === simStage);
  if (byId) return byId;
  const byDay = cropStages.find((s) => day >= s.startDay && day <= s.endDay);
  return byDay || cropStages[Math.min(cropStages.length - 1, 1)];
}

export default function PredictionsPanel({
  sim,
  fieldVarietyMap,
  selectedField: selectedFieldProp,
  primaryCropId,
  primaryCropLabel,
}: {
  sim: SimState;
  fieldVarietyMap?: Record<string, GrapeVarietyId>;
  selectedField?: string;
  primaryCropId?: string;
  primaryCropLabel?: string;
}) {
  const [module, setModule] = useState<ModuleId>('yield');
  const [selectedGrowthStage, setSelectedGrowthStage] = useState<string | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string>('all');
  const farmCtx = useFarmOptional();
  const settingsCtx = useSettingsOptional();
  const cropId = primaryCropId || settingsCtx?.settings?.primaryCrop || 'grape';
  const cropEntry = getCropCatalogEntry(cropId);
  const cropLabel = primaryCropLabel || cropEntry.label;
  const cropStages = useMemo(() => stagesForCrop(cropId), [cropId]);
  const activeFieldId = selectedFieldProp || 'B';
  const fieldVarietyId = fieldVarietyMap?.[activeFieldId] || 'thompson';
  const fieldVariety = getGrapeVariety(fieldVarietyId);
  const stageMetaCrop = useMemo(
    () => mapSimStageToCropStage(sim.stage, cropStages, sim.day),
    [sim.stage, sim.day, cropStages],
  );
  const nextStageCrop = useMemo(() => {
    const idx = cropStages.findIndex((s) => s.id === stageMetaCrop.id);
    return cropStages[Math.min(cropStages.length - 1, Math.max(0, idx) + 1)];
  }, [cropStages, stageMetaCrop.id]);

  const evaluateReport = farmCtx?.evaluateReport ?? null;
  const evaluateError = farmCtx?.evaluateError ?? null;
  const evaluateLoading = farmCtx?.evaluateLoading ?? false;
  const mlBundle = farmCtx?.ml;
  const twinState = farmCtx?.twinState ?? null;
  const twinError = farmCtx?.twinError ?? null;
  const twinLoading = farmCtx?.twinLoading ?? false;
  const focus = evaluateReport?.focus_crop_assessment;
  const recs = evaluateReport?.primary_recommendations ?? [];
  const panel = 'bg-[#121a27] rounded-xl border border-[#1e2d40]';

  /** Per-field prediction bundle for the 4 digital-twin fields (client simulation) */
  const fieldPredictions = useMemo(() => {
    const stageFactor =
      sim.day < 45 ? 0.55 : sim.day < 80 ? 0.75 : sim.day < 120 ? 0.92 : 1;
    const growth = Math.max(0.7, 1 - sim.stressHeat * 0.2 - sim.stressWater * 0.25);

    return FIELDS.map((f, i) => {
      const healthBlend = (f.health * 0.55 + sim.healthIndex * 0.45) / 100;
      const moistureBias = (f.soilMoisture - 58) / 40; // -1..1-ish
      // tons/acre predicted for this field
      const yieldPerAcre = +(
        f.yieldEst * healthBlend * growth * stageFactor * (0.96 + i * 0.015)
      ).toFixed(2);
      const totalTons = +(yieldPerAcre * f.acres).toFixed(2);
      const hectares = +(f.acres * 0.404686).toFixed(3);
      const yieldPerHa = +(totalTons / Math.max(0.01, hectares)).toFixed(2);

      const disease = Math.max(
        5,
        Math.min(
          48,
          Math.round(
            38 -
              f.health * 0.22 +
              (sim.env.humidity - 50) * 0.12 +
              (f.soilMoisture > 68 ? 4 : 0) +
              [ -3, 0, 4, 2 ][i],
          ),
        ),
      );
      const irrigMm = +(
        Math.max(6, 32 - f.soilMoisture * 0.28 + (f.soilMoisture < 55 ? 6 : 0) + sim.stressWater * 8)
      ).toFixed(1);
      const soilIdx = Math.min(
        96,
        Math.round(48 + f.soilMoisture * 0.28 + f.health * 0.18 + moistureBias * 6),
      );
      const conf = Math.min(97, Math.round(84 + f.health * 0.08 + healthBlend * 6));

      return {
        id: f.id,
        name: f.name,
        variety: f.variety,
        acres: f.acres,
        hectares,
        health: f.health,
        soilMoisture: f.soilMoisture,
        soilType: f.soilType,
        plants: f.plants,
        yieldPerAcre,
        totalTons,
        yieldPerHa,
        disease,
        irrigMm,
        soilIdx,
        conf,
        nextIrrig:
          f.soilMoisture < 52 ? 'Today' : f.soilMoisture < 58 ? 'Tomorrow' : 'In 2–3 days',
      };
    });
  }, [
    sim.day,
    sim.healthIndex,
    sim.stressHeat,
    sim.stressWater,
    sim.env.humidity,
  ]);

  const activeFields =
    selectedFieldId === 'all'
      ? fieldPredictions
      : fieldPredictions.filter((f) => f.id === selectedFieldId);

  const farmTotals = useMemo(() => {
    const totalAcres = fieldPredictions.reduce((s, f) => s + f.acres, 0);
    const totalTons = fieldPredictions.reduce((s, f) => s + f.totalTons, 0);
    const avgYieldPerAcre =
      totalAcres > 0
        ? +(fieldPredictions.reduce((s, f) => s + f.yieldPerAcre * f.acres, 0) / totalAcres).toFixed(2)
        : 0;
    const totalHa = +(totalAcres * 0.404686).toFixed(2);
    const avgDisease = Math.round(
      fieldPredictions.reduce((s, f) => s + f.disease, 0) / fieldPredictions.length,
    );
    const avgIrrig = +(
      fieldPredictions.reduce((s, f) => s + f.irrigMm, 0) / fieldPredictions.length
    ).toFixed(1);
    const avgSoil = Math.round(
      fieldPredictions.reduce((s, f) => s + f.soilIdx, 0) / fieldPredictions.length,
    );
    const best = [...fieldPredictions].sort((a, b) => b.yieldPerAcre - a.yieldPerAcre)[0];
    return { totalAcres, totalTons, avgYieldPerAcre, totalHa, avgDisease, avgIrrig, avgSoil, best };
  }, [fieldPredictions]);

  // Aggregate metrics (field-weighted) for gauges
  const yieldTons =
    selectedFieldId === 'all'
      ? farmTotals.avgYieldPerAcre
      : activeFields[0]?.yieldPerAcre ?? sim.yieldTons ?? 3.42;
  const confidence = Math.min(
    98,
    Math.round(
      selectedFieldId === 'all'
        ? 88 + sim.healthIndex * 0.05
        : activeFields[0]?.conf ?? 88,
    ),
  );
  const diseaseRisk =
    selectedFieldId === 'all' ? farmTotals.avgDisease : activeFields[0]?.disease ?? 15;
  const irrigationMm =
    selectedFieldId === 'all' ? farmTotals.avgIrrig : activeFields[0]?.irrigMm ?? 12;
  const soilHealth =
    selectedFieldId === 'all' ? farmTotals.avgSoil : activeFields[0]?.soilIdx ?? 75;
  const stageMeta = stageMetaCrop;
  const nextStage = nextStageCrop;
  // Prefer crop-track stages for timeline UI
  const displayStages = cropStages;

  const daysToNext = Math.max(3, (nextStage?.start ?? sim.day + 12) - sim.day);

  const forecastPoints = useMemo(() => {
    const labels = ['20 May', '9 Jun', '29 Jun', '19 Jul', '8 Aug', '28 Aug', '17 Sep'];
    const base = Math.max(0.8, yieldTons * 0.32);
    return labels.map((label, i) => {
      const t = i / (labels.length - 1);
      const pred = +(base + (yieldTons - base) * Math.pow(t, 0.85) + Math.sin(i) * 0.05).toFixed(2);
      const hist = +(pred * 0.88 - 0.15 + i * 0.02).toFixed(2);
      return { label, pred, hist };
    });
  }, [yieldTons]);

  const activeMod = MODULES.find((m) => m.id === module)!;

  return (
    <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden bg-[#0b131e]">
      <div className="p-3 space-y-2.5">
        {/* Title */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-base font-bold tracking-wide">
              <span className="text-violet-300">PREDICTIONS</span>
            </h1>
            <p className="text-[10px] text-slate-500">
              Backend suitability engine + ML yield · Field modules remain simulation-assisted
            </p>
          </div>
          {farmCtx && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => farmCtx.refreshEvaluate()}
                disabled={evaluateLoading}
                className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20 disabled:opacity-50"
              >
                <RefreshCw size={12} className={evaluateLoading ? 'animate-spin' : ''} />
                Run suitability
              </button>
              <button
                type="button"
                onClick={() => void farmCtx.refreshMl()}
                className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
              >
                <RefreshCw size={12} />
                Refresh ML
              </button>
              <button
                type="button"
                onClick={() => void farmCtx.stepTwinFromLive()}
                disabled={twinLoading}
                className="flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50"
              >
                <RefreshCw size={12} className={twinLoading ? 'animate-spin' : ''} />
                Twin step
              </button>
            </div>
          )}
        </div>

        {/* Backend evaluate (dynamic) */}
        <div className={`${panel} p-3 border-violet-500/20`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Server size={14} className="text-violet-300" />
              <span className="text-[11px] font-bold text-violet-200 uppercase tracking-wide">
                Crop suitability · Backend
              </span>
              {evaluateReport?.live_weather_applied && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Live weather applied
                </span>
              )}
            </div>
            {evaluateLoading && <span className="text-[10px] text-slate-400">Loading…</span>}
          </div>

          {evaluateError && (
            <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 mb-2">
              Suitability refresh pending: {evaluateError}. Field modules below continue on the digital-twin simulation engine.
            </div>
          )}

          {!evaluateError && !evaluateReport && !evaluateLoading && (
            <div className="text-[11px] text-slate-400 mb-2">Suitability report loading — click “Run suitability” or wait for auto-refresh.</div>
          )}

          {focus && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
              <div className="bg-[#0b131e] rounded-lg border border-[#1e2d40] p-2.5">
                <div className="text-[9px] text-slate-500">Focus crop</div>
                <div className="text-sm font-semibold text-white">{focus.crop_name}</div>
              </div>
              <div className="bg-[#0b131e] rounded-lg border border-[#1e2d40] p-2.5">
                <div className="text-[9px] text-slate-500">Suitability</div>
                <div className="text-sm font-semibold text-emerald-400">
                  {focus.final_suitability_score?.toFixed?.(1) ?? focus.final_suitability_score}%
                </div>
                <div className="text-[9px] text-slate-400">{focus.suitability_band}</div>
              </div>
              <div className="bg-[#0b131e] rounded-lg border border-[#1e2d40] p-2.5">
                <div className="text-[9px] text-slate-500">ML yield (t/ha)</div>
                <div className="text-sm font-semibold text-cyan-300">
                  {focus.expected_yield_tons_ha != null
                    ? Number(focus.expected_yield_tons_ha).toFixed(2)
                    : '—'}
                </div>
              </div>
              <div className="bg-[#0b131e] rounded-lg border border-[#1e2d40] p-2.5">
                <div className="text-[9px] text-slate-500">Location</div>
                <div className="text-sm font-semibold text-white truncate">
                  {evaluateReport?.location?.district || '—'}, {evaluateReport?.location?.state || ''}
                </div>
              </div>
            </div>
          )}

          {/* score_tree bars — climate / soil / water / market */}
          {focus?.score_tree && (
            <div className="mb-3 grid grid-cols-2 md:grid-cols-4 gap-2">
              {(
                [
                  { key: 'climate', label: 'Climate', color: 'bg-sky-500', score: focus.score_tree.climate?.score },
                  { key: 'soil', label: 'Soil', color: 'bg-amber-500', score: focus.score_tree.soil?.score },
                  { key: 'water', label: 'Water', color: 'bg-cyan-500', score: typeof focus.score_tree.water === 'object' ? focus.score_tree.water?.score : focus.score_tree.water },
                  { key: 'market', label: 'Market', color: 'bg-violet-500', score: focus.score_tree.market?.score },
                ] as const
              ).map((row) => {
                const s = Number(row.score ?? 0);
                return (
                  <div key={row.key} className="bg-[#0b131e] rounded-lg border border-[#1e2d40] p-2.5">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-slate-400">{row.label}</span>
                      <span className="text-white font-semibold">{Number.isFinite(s) ? s.toFixed(1) : '—'}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#1e2d40] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${row.color}`}
                        style={{ width: `${Math.min(100, Math.max(0, s))}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* pros / cons from focus assessment */}
          {focus && ((focus.pros && focus.pros.length > 0) || (focus.cons && focus.cons.length > 0)) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
              <div className="bg-emerald-500/5 border border-emerald-500/25 rounded-lg p-2.5">
                <div className="text-[10px] font-bold text-emerald-300 mb-1.5 uppercase">Pros (engine)</div>
                <ul className="space-y-1">
                  {(focus.pros || []).slice(0, 8).map((p, i) => (
                    <li key={i} className="text-[11px] text-slate-300 flex gap-1.5">
                      <span className="text-emerald-400 shrink-0">+</span>
                      <span>{p}</span>
                    </li>
                  ))}
                  {!(focus.pros && focus.pros.length) && (
                    <li className="text-[11px] text-slate-500">None listed</li>
                  )}
                </ul>
              </div>
              <div className="bg-rose-500/5 border border-rose-500/25 rounded-lg p-2.5">
                <div className="text-[10px] font-bold text-rose-300 mb-1.5 uppercase">Cons (engine)</div>
                <ul className="space-y-1">
                  {(focus.cons || []).slice(0, 8).map((c, i) => (
                    <li key={i} className="text-[11px] text-slate-300 flex gap-1.5">
                      <span className="text-rose-400 shrink-0">−</span>
                      <span>{c}</span>
                    </li>
                  ))}
                  {!(focus.cons && focus.cons.length) && (
                    <li className="text-[11px] text-slate-500">None listed</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          {/* Backend soil_profile snapshot */}
          {evaluateReport?.soil_profile && (
            <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
              <span className="px-2 py-1 rounded border border-[#1e2d40] bg-[#0b131e] text-slate-300">
                Soil: <strong className="text-white">{evaluateReport.soil_profile.type || '—'}</strong>
              </span>
              <span className="px-2 py-1 rounded border border-[#1e2d40] bg-[#0b131e] text-slate-300">
                pH: <strong className="text-white">{evaluateReport.soil_profile.ph ?? '—'}</strong>
              </span>
              <span className="px-2 py-1 rounded border border-[#1e2d40] bg-[#0b131e] text-slate-300">
                OC: <strong className="text-white">{evaluateReport.soil_profile.oc ?? '—'}</strong>
              </span>
              <span className="px-2 py-1 rounded border border-[#1e2d40] bg-[#0b131e] text-slate-300">
                EC: <strong className="text-white">{evaluateReport.soil_profile.ec ?? '—'}</strong>
              </span>
              {evaluateReport.soil_profile.n != null && (
                <span className="px-2 py-1 rounded border border-[#1e2d40] bg-[#0b131e] text-slate-300">
                  N: <strong className="text-white">{evaluateReport.soil_profile.n}</strong>
                </span>
              )}
              {evaluateReport.soil_profile.p != null && (
                <span className="px-2 py-1 rounded border border-[#1e2d40] bg-[#0b131e] text-slate-300">
                  P: <strong className="text-white">{evaluateReport.soil_profile.p}</strong>
                </span>
              )}
              {evaluateReport.soil_profile.k != null && (
                <span className="px-2 py-1 rounded border border-[#1e2d40] bg-[#0b131e] text-slate-300">
                  K: <strong className="text-white">{evaluateReport.soil_profile.k}</strong>
                </span>
              )}
              {evaluateReport.soil_profile.moisture_pct != null && (
                <span className="px-2 py-1 rounded border border-[#1e2d40] bg-[#0b131e] text-slate-300">
                  Moisture: <strong className="text-white">{evaluateReport.soil_profile.moisture_pct}%</strong>
                </span>
              )}
              <span className="px-2 py-1 rounded border border-[#1e2d40] bg-[#0b131e] text-slate-300">
                Water: <strong className="text-white">{evaluateReport.water_availability || '—'}</strong>
              </span>
            </div>
          )}

          {recs.length > 0 && (
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-slate-500 border-b border-[#1e2d40] text-left">
                    <th className="py-1.5 pr-2 font-medium">Crop</th>
                    <th className="py-1.5 pr-2 font-medium">Score</th>
                    <th className="py-1.5 pr-2 font-medium">Band</th>
                    <th className="py-1.5 pr-2 font-medium">Water</th>
                    <th className="py-1.5 font-medium">Market trend</th>
                  </tr>
                </thead>
                <tbody>
                  {recs.map((r) => (
                    <tr key={r.crop_name} className="border-b border-[#1e2d40]/60">
                      <td className="py-1.5 pr-2 text-white font-medium">
                        {r.crop_name}
                        {r.is_focus_crop && (
                          <span className="ml-1 text-[9px] text-violet-300">focus</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-2 text-emerald-400">
                        {r.final_suitability_score?.toFixed?.(1) ?? r.final_suitability_score}
                      </td>
                      <td className="py-1.5 pr-2 text-slate-300">{r.suitability_band || '—'}</td>
                      <td className="py-1.5 pr-2 text-slate-400">{r.water_requirement || '—'}</td>
                      <td className="py-1.5 text-slate-400">
                        {r.score_tree?.market?.trend || '—'}
                        {r.score_tree?.market?.modal_price != null &&
                          ` · ₹${r.score_tree.market.modal_price}/qtl`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Disqualified crops from engine */}
          {(evaluateReport?.disqualified_crops?.length ?? 0) > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5">
              <div className="text-[10px] font-bold text-amber-300 uppercase mb-1.5">
                Disqualified crops (below agronomic threshold)
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-slate-500 text-left border-b border-[#1e2d40]">
                      <th className="py-1 pr-2 font-medium">Crop</th>
                      <th className="py-1 pr-2 font-medium">Score</th>
                      <th className="py-1 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluateReport!.disqualified_crops!.map((d) => (
                      <tr key={d.crop_name} className="border-b border-[#1e2d40]/50">
                        <td className="py-1 pr-2 text-slate-200">{d.crop_name}</td>
                        <td className="py-1 pr-2 text-amber-300">
                          {d.agronomic_score != null ? Number(d.agronomic_score).toFixed(1) : '—'}
                        </td>
                        <td className="py-1 text-slate-400">{d.reason || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 06_ML models + digital twin (backend) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className={`${panel} p-3 border-cyan-500/20`}>
            <div className="flex items-center gap-2 mb-2">
              <Brain size={14} className="text-cyan-300" />
              <span className="text-[11px] font-bold text-cyan-200 uppercase tracking-wide">
                06_ML models · Backend
              </span>
            </div>
            {mlBundle?.error && (
              <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1.5 mb-2">
                {mlBundle.error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="bg-[#0b131e] rounded-lg border border-[#1e2d40] p-2">
                <div className="text-[9px] text-slate-500">Yield model</div>
                <div className={`text-[12px] font-semibold ${mlBundle?.status?.yield_model_loaded ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {mlBundle?.status?.yield_model_loaded ? 'Loaded' : '—'}
                </div>
              </div>
              <div className="bg-[#0b131e] rounded-lg border border-[#1e2d40] p-2">
                <div className="text-[9px] text-slate-500">Telemetry model</div>
                <div className={`text-[12px] font-semibold ${mlBundle?.status?.telemetry_model_loaded ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {mlBundle?.status?.telemetry_model_loaded ? 'Loaded' : '—'}
                </div>
              </div>
              <div className="bg-[#0b131e] rounded-lg border border-[#1e2d40] p-2">
                <div className="text-[9px] text-slate-500">Predicted yield</div>
                <div className="text-sm font-semibold text-cyan-300">
                  {mlBundle?.yield?.predicted_yield_tons_ha != null
                    ? `${Number(mlBundle.yield.predicted_yield_tons_ha).toFixed(2)} t/ha`
                    : focus?.expected_yield_tons_ha != null
                      ? `${Number(focus.expected_yield_tons_ha).toFixed(2)} t/ha`
                      : '—'}
                </div>
              </div>
              <div className="bg-[#0b131e] rounded-lg border border-[#1e2d40] p-2">
                <div className="text-[9px] text-slate-500">Hydrogel storage need</div>
                <div className="text-sm font-semibold text-sky-300">
                  {mlBundle?.telemetry?.predicted_required_hydrogel_storage_pct != null
                    ? `${Number(mlBundle.telemetry.predicted_required_hydrogel_storage_pct).toFixed(1)}%`
                    : '—'}
                </div>
              </div>
            </div>
            <p className="text-[9px] text-slate-500 leading-snug">
              Artifacts from <span className="text-slate-400">06_ML/models</span> via POST /api/ml/yield and /api/ml/telemetry.
            </p>
          </div>

          <div className={`${panel} p-3 border-emerald-500/20`}>
            <div className="flex items-center gap-2 mb-2">
              <Activity size={14} className="text-emerald-300" />
              <span className="text-[11px] font-bold text-emerald-200 uppercase tracking-wide">
                Digital twin · 06_ML/simulation
              </span>
            </div>
            {twinError && (
              <div className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-2 py-1.5 mb-2">
                {twinError}
              </div>
            )}
            {!twinState && !twinError && (
              <div className="text-[11px] text-slate-400 mb-2">
                No twin state yet — click <strong className="text-emerald-300">Twin step</strong> to run closed-loop physics.
              </div>
            )}
            {twinState && (
              <div className="grid grid-cols-2 gap-2 mb-2 text-[11px]">
                <div className="bg-[#0b131e] rounded-lg border border-[#1e2d40] p-2">
                  <div className="text-[9px] text-slate-500">Growth stage</div>
                  <div className="font-semibold text-white">{String(twinState.crop?.growth_stage ?? stageMeta.label)}</div>
                </div>
                <div className="bg-[#0b131e] rounded-lg border border-[#1e2d40] p-2">
                  <div className="text-[9px] text-slate-500">Soil moisture</div>
                  <div className="font-semibold text-sky-300">
                    {twinState.soil?.soil_moisture_pct != null
                      ? `${Number(twinState.soil.soil_moisture_pct).toFixed(1)}%`
                      : '—'}
                  </div>
                </div>
                <div className="bg-[#0b131e] rounded-lg border border-[#1e2d40] p-2">
                  <div className="text-[9px] text-slate-500">Hydrogel storage</div>
                  <div className="font-semibold text-cyan-300">
                    {twinState.hydrogel?.hydrogel_water_storage_pct != null
                      ? `${Number(twinState.hydrogel.hydrogel_water_storage_pct).toFixed(1)}%`
                      : '—'}
                  </div>
                </div>
                <div className="bg-[#0b131e] rounded-lg border border-[#1e2d40] p-2">
                  <div className="text-[9px] text-slate-500">ML yield (twin)</div>
                  <div className="font-semibold text-emerald-300">
                    {twinState.predictions?.predicted_grape_yield_tons_ha != null
                      ? `${Number(twinState.predictions.predicted_grape_yield_tons_ha).toFixed(2)} t/ha`
                      : '—'}
                  </div>
                </div>
              </div>
            )}
            <p className="text-[9px] text-slate-500 leading-snug">
              Closed-loop engine + SQLite via GET /api/twin/state · POST /api/twin/step.
            </p>
          </div>
        </div>

        {/* Module selector + summary (simulation-assisted) */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-2">
          <div className={`${panel} p-3 xl:col-span-9`}>
            <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wide">Select Prediction Module</div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {MODULES.map((m) => {
                const Icon = m.icon;
                const on = module === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModule(m.id)}
                    className={`text-left rounded-xl border p-2.5 transition ${
                      on ? m.ring + ' border-2' : 'border-[#1e2d40] bg-[#0b131e] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon size={14} className={m.color} />
                      <Tip content={m.desc} side="bottom" wide>
                        <span className={`text-[11px] font-bold ${on ? 'text-white' : 'text-slate-300'} cursor-help border-b border-dotted border-slate-600`}>
                          {m.title}
                        </span>
                      </Tip>
                    </div>
                    <p className="text-[9px] text-slate-500 leading-snug">{m.desc}</p>
                    <div className={`mt-1.5 text-[9px] flex items-center gap-0.5 ${m.color}`}>
                      Open <ArrowRight size={10} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`${panel} p-3 xl:col-span-3 flex flex-col items-center justify-center`}>
            <div className="text-[10px] font-bold text-slate-400 mb-2 self-start">PREDICTION SUMMARY</div>
            <div className="relative w-24 h-24 mb-2">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="36" stroke="#1e2d40" strokeWidth="6" fill="none" />
                <circle cx="50" cy="50" r="36" stroke="#8b5cf6" strokeWidth="6" fill="none"
                  strokeDasharray={2 * Math.PI * 36} strokeDashoffset={2 * Math.PI * 36 * 0.15} strokeLinecap="round" />
                <circle cx="50" cy="50" r="28" stroke="#06b6d4" strokeWidth="4" fill="none"
                  strokeDasharray={2 * Math.PI * 28} strokeDashoffset={2 * Math.PI * 28 * 0.25} strokeLinecap="round" />
              </svg>
              <Brain className="absolute inset-0 m-auto text-violet-300" size={22} />
            </div>
            <div className="w-full space-y-0.5 text-[10px]">
              {[
                ['Total Models', '5'],
                ['Active Models', '5'],
                ['Accuracy (Avg)', `${confidence}%`],
                ['Predictions Today', '28'],
                ['Last Updated', '10:30 AM'],
              ].map(([l, v]) => (
                <div key={l} className="flex justify-between">
                  <span className="text-slate-500">{l}</span>
                  <span className="text-white font-semibold">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Field selector — predictions by 4 digital-twin fields */}
        <div className={`${panel} p-2.5 flex flex-wrap items-center gap-2`}>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mr-1">Fields</div>
          <button
            type="button"
            onClick={() => setSelectedFieldId('all')}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition ${
              selectedFieldId === 'all'
                ? 'bg-violet-600/30 border-violet-500/60 text-violet-200'
                : 'border-[#1e2d40] text-slate-400 hover:border-slate-500'
            }`}
          >
            All 4 Fields · {farmTotals.totalAcres.toFixed(2)} ac
          </button>
          {fieldPredictions.map((f) => (
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
              <span className="ml-1 text-[9px] text-slate-500 font-normal">{f.acres} ac · {f.variety.split(' ')[0]}</span>
            </button>
          ))}
          <div className="ml-auto text-[9px] text-slate-500">
            Best yield: <span className="text-emerald-400 font-semibold">{farmTotals.best?.name}</span>
            {' · '}{farmTotals.best?.yieldPerAcre} t/ac
          </div>
        </div>

        {/* Main prediction content */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-2">
          {/* Left main */}
          <div className="xl:col-span-9 space-y-2">
            {/* Yield (or active module) hero */}
            <div className={`${panel} p-3`}>
              <div className="flex items-center gap-2 mb-3">
                <activeMod.icon size={14} className={activeMod.color} />
                <h2 className="text-xs font-bold text-white tracking-wide uppercase">{activeMod.title}</h2>
                <Tip content={activeMod.desc} side="right" wide>
                  <button type="button" className="text-slate-500 hover:text-violet-300" aria-label="About this module">
                    <Info size={12} />
                  </button>
                </Tip>
                <span className="ml-auto text-[9px] text-slate-500">
                  {selectedFieldId === 'all' ? 'Farm average across 4 fields' : `Scoped to Field ${selectedFieldId}`}
                </span>
              </div>

              {module === 'yield' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                    <div className="lg:col-span-4 flex flex-col items-center justify-center">
                      <RingGauge
                        value={yieldTons}
                        max={5}
                        centerText={yieldTons.toFixed(2)}
                        label="tons/acre"
                        sub={selectedFieldId === 'all' ? 'Farm avg yield' : `Field ${selectedFieldId} yield`}
                        color="#8b5cf6"
                        size={130}
                      />
                      <div className="mt-2 w-full space-y-1 text-[10px]">
                        {[
                          ['Confidence Level', `${confidence}%`],
                          ['Model Used', 'XGBoost Regressor'],
                          ['Fields modeled', 'A · B · C · D'],
                          ['Farm total yield', `${farmTotals.totalTons} tons`],
                          ['Farm area', `${farmTotals.totalAcres.toFixed(2)} ac · ${farmTotals.totalHa} ha`],
                          ['Prediction Horizon', 'Next 120 Days'],
                        ].map(([l, v]) => (
                          <div key={l} className="flex justify-between border-b border-[#1e2d40]/50 pb-0.5">
                            <span className="text-slate-500">{l}</span>
                            <span className="text-slate-200">{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="lg:col-span-8">
                      <div className="text-[10px] font-bold text-slate-400 mb-1">YIELD FORECAST (Next 120 Days)</div>
                      <div className="flex gap-3 text-[8px] text-slate-500 mb-1">
                        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-violet-400" /> Predicted Yield</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-slate-500 border-dashed" /> Historical Yield</span>
                      </div>
                      <YieldChart points={forecastPoints} />
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="rounded-xl bg-[#0b131e] border border-[#1e2d40] p-2">
                          <div className="text-[9px] font-bold text-slate-400 mb-1 text-center">FACTOR RADAR</div>
                          <RadarChart scores={[
                            { label: 'Moisture', value: Math.min(100, selectedFieldId === 'all' ? sim.env.soilMoisture : activeFields[0]?.soilMoisture ?? 60), color: '#38bdf8' },
                            { label: 'Temp', value: Math.min(100, sim.env.temperature * 2.2), color: '#f97316' },
                            { label: 'Sun', value: 72, color: '#eab308' },
                            { label: 'N', value: 68, color: '#a3e635' },
                            { label: 'Health', value: selectedFieldId === 'all' ? sim.healthIndex : activeFields[0]?.health ?? 85, color: '#22c55e' },
                            { label: 'Hydrogel', value: sim.env.hydrogelSat, color: '#a78bfa' },
                          ]} />
                        </div>
                        <div className="rounded-xl bg-[#0b131e] border border-[#1e2d40] p-2 flex flex-col">
                          <div className="text-[9px] font-bold text-slate-400 mb-1 text-center">AI MODEL GRAPH</div>
                          <NeuralDecor />
                          <div className="text-[8px] text-slate-500 text-center mt-auto">12 inputs × 4 fields → XGBoost → yield</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Per-field yield table */}
                  <div className="rounded-xl bg-[#0b131e] border border-[#1e2d40] p-2.5 overflow-x-auto">
                    <div className="text-[10px] font-bold text-slate-300 mb-1.5">YIELD PREDICTION BY FIELD</div>
                    <table className="w-full text-[10px] min-w-[520px]">
                      <thead>
                        <tr className="text-slate-500 border-b border-[#1e2d40]">
                          <th className="text-left py-1 font-medium">Field</th>
                          <th className="text-left py-1 font-medium">Variety</th>
                          <th className="text-right py-1 font-medium">Area</th>
                          <th className="text-right py-1 font-medium">t/acre</th>
                          <th className="text-right py-1 font-medium">t/ha</th>
                          <th className="text-right py-1 font-medium">Total tons</th>
                          <th className="text-right py-1 font-medium">Health</th>
                          <th className="text-right py-1 font-medium">Conf.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fieldPredictions.map((f) => {
                          const on = selectedFieldId === f.id || selectedFieldId === 'all';
                          const isBest = f.id === farmTotals.best?.id;
                          return (
                            <tr
                              key={f.id}
                              onClick={() => setSelectedFieldId(f.id)}
                              className={`border-b border-[#1e2d40]/40 cursor-pointer hover:bg-violet-500/5 ${
                                selectedFieldId === f.id ? 'bg-violet-500/10' : ''
                              } ${!on && selectedFieldId !== 'all' ? 'opacity-50' : ''}`}
                            >
                              <td className="py-1.5 text-white font-medium">
                                {f.name}
                                {isBest && <span className="ml-1 text-[8px] bg-emerald-500/20 text-emerald-300 px-1 rounded">Best</span>}
                              </td>
                              <td className="text-slate-400">{f.variety}</td>
                              <td className="text-right text-slate-300">{f.acres} ac</td>
                              <td className="text-right text-violet-200 font-semibold">{f.yieldPerAcre}</td>
                              <td className="text-right text-slate-300">{f.yieldPerHa}</td>
                              <td className="text-right text-white font-semibold">{f.totalTons}</td>
                              <td className="text-right text-slate-300">{f.health}</td>
                              <td className="text-right text-emerald-400">{f.conf}%</td>
                            </tr>
                          );
                        })}
                        <tr className="border-t border-[#1e2d40] font-semibold">
                          <td className="py-1.5 text-slate-300" colSpan={2}>Farm total / avg</td>
                          <td className="text-right text-slate-300">{farmTotals.totalAcres.toFixed(2)} ac</td>
                          <td className="text-right text-violet-200">{farmTotals.avgYieldPerAcre}</td>
                          <td className="text-right text-slate-300">{(farmTotals.totalTons / Math.max(0.01, farmTotals.totalHa)).toFixed(2)}</td>
                          <td className="text-right text-white">{farmTotals.totalTons}</td>
                          <td className="text-right text-slate-400">—</td>
                          <td className="text-right text-emerald-400">{confidence}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {module === 'disease' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-3 flex flex-col items-center">
                      <RingGauge value={diseaseRisk} centerText={`${diseaseRisk}%`} label="Risk" sub={diseaseRisk < 25 ? 'Low Risk' : 'Moderate Risk'} color={diseaseRisk < 25 ? '#22c55e' : '#f59e0b'} size={120} />
                    </div>
                    <div className="md:col-span-5 space-y-2">
                      {[
                        { name: 'Downy Mildew', risk: diseaseRisk },
                        { name: 'Powdery Mildew', risk: Math.min(50, diseaseRisk + 4) },
                        { name: 'Botrytis', risk: Math.max(5, diseaseRisk - 3) },
                      ].map((d) => (
                        <div key={d.name} className="rounded-lg bg-[#0b131e] border border-[#1e2d40] p-2">
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-slate-300">{d.name}</span>
                            <span className={d.risk < 25 ? 'text-emerald-400' : 'text-amber-400'}>{d.risk}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[#1e2d40] overflow-hidden">
                            <div className={`h-full rounded-full ${d.risk < 25 ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${d.risk}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="md:col-span-4 rounded-xl bg-[#0b131e] border border-[#1e2d40] p-2">
                      <div className="text-[9px] font-bold text-slate-400 mb-2">FIELD RISK HEAT (4 fields)</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {fieldPredictions.map((f) => {
                          const r = f.disease;
                          const bg = r < 20 ? 'from-emerald-600 to-emerald-800' : r < 30 ? 'from-amber-600 to-amber-800' : 'from-rose-600 to-rose-800';
                          return (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => setSelectedFieldId(f.id)}
                              className={`rounded-lg bg-gradient-to-br ${bg} p-2 text-center min-h-[52px] flex flex-col justify-center ${
                                selectedFieldId === f.id ? 'ring-2 ring-white/40' : ''
                              }`}
                            >
                              <div className="text-[10px] font-bold text-white">{f.name}</div>
                              <div className="text-lg font-bold text-white">{r}%</div>
                              <div className="text-[8px] text-white/70">{f.soilType}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#0b131e] border border-[#1e2d40] p-2.5 overflow-x-auto">
                    <div className="text-[10px] font-bold text-slate-300 mb-1">DISEASE RISK BY FIELD</div>
                    <table className="w-full text-[10px] min-w-[400px]">
                      <thead>
                        <tr className="text-slate-500 border-b border-[#1e2d40]">
                          <th className="text-left py-1">Field</th>
                          <th className="text-right py-1">Moisture</th>
                          <th className="text-right py-1">Health</th>
                          <th className="text-right py-1">Disease risk</th>
                          <th className="text-left py-1 pl-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fieldPredictions.map((f) => (
                          <tr key={f.id} className="border-b border-[#1e2d40]/40">
                            <td className="py-1 text-white font-medium">{f.name}</td>
                            <td className="text-right text-slate-300">{f.soilMoisture}%</td>
                            <td className="text-right text-slate-300">{f.health}</td>
                            <td className={`text-right font-semibold ${f.disease < 20 ? 'text-emerald-400' : f.disease < 30 ? 'text-amber-400' : 'text-rose-400'}`}>{f.disease}%</td>
                            <td className="pl-2 text-slate-400">{f.disease < 20 ? 'Low' : f.disease < 30 ? 'Watch' : 'Elevated'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {module === 'irrigation' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                    <RingGauge value={Number(irrigationMm)} max={40} centerText={`${irrigationMm}`} label="mm" sub={selectedFieldId === 'all' ? 'Avg water need' : `Field ${selectedFieldId}`} color="#38bdf8" size={120} />
                    <div className="md:col-span-2 grid grid-cols-2 gap-2 text-[11px]">
                      {[
                        ['Next Irrigation', selectedFieldId === 'all' ? (sim.irrigationNeed ? 'Today' : 'Tomorrow') : activeFields[0]?.nextIrrig ?? '—'],
                        ['Irrigation Duration', '45 min'],
                        ['Water Efficiency', `${sim.hydrogelEfficiency}%`],
                        ['Soil Moisture', selectedFieldId === 'all' ? `${sim.env.soilMoisture.toFixed(0)}%` : `${activeFields[0]?.soilMoisture ?? '—'}%`],
                        ['Status', Number(irrigationMm) > 18 ? 'Required' : 'Optimal'],
                        ['Method', 'Drip + Hydrogel assist'],
                      ].map(([l, v]) => (
                        <div key={l} className="rounded-lg bg-[#0b131e] border border-[#1e2d40] p-2">
                          <div className="text-[9px] text-slate-500">{l}</div>
                          <div className="font-semibold text-white">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#0b131e] border border-[#1e2d40] p-2.5 overflow-x-auto">
                    <div className="text-[10px] font-bold text-slate-300 mb-1">IRRIGATION PREDICTION BY FIELD</div>
                    <table className="w-full text-[10px] min-w-[440px]">
                      <thead>
                        <tr className="text-slate-500 border-b border-[#1e2d40]">
                          <th className="text-left py-1">Field</th>
                          <th className="text-right py-1">Moisture</th>
                          <th className="text-right py-1">Need (mm)</th>
                          <th className="text-left py-1 pl-2">Next irrig.</th>
                          <th className="text-left py-1">Soil type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fieldPredictions.map((f) => (
                          <tr key={f.id} onClick={() => setSelectedFieldId(f.id)} className="border-b border-[#1e2d40]/40 cursor-pointer hover:bg-sky-500/5">
                            <td className="py-1.5 text-white font-medium">{f.name}</td>
                            <td className="text-right text-slate-300">{f.soilMoisture}%</td>
                            <td className="text-right text-sky-300 font-semibold">{f.irrigMm}</td>
                            <td className="pl-2 text-slate-300">{f.nextIrrig}</td>
                            <td className="text-slate-500">{f.soilType}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {module === 'soil' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                    <RingGauge value={soilHealth} centerText={`${soilHealth}`} label="/100" sub={selectedFieldId === 'all' ? 'Farm soil index' : `Field ${selectedFieldId}`} color="#a3e635" size={120} />
                    <div className="md:col-span-2 grid grid-cols-2 gap-2 text-[11px]">
                      {[
                        ['Organic Matter', '2.3%'],
                        ['Soil pH', '6.8'],
                        ['Soil Health Index', `${soilHealth}/100`],
                        ['Nitrogen (N)', `${Math.round(28 + (selectedFieldId === 'all' ? sim.env.soilMoisture : activeFields[0]?.soilMoisture ?? 60) * 0.1)} ppm`],
                        ['Status', soilHealth >= 70 ? 'Good' : 'Monitor'],
                        ['Moisture', selectedFieldId === 'all' ? `${sim.env.soilMoisture.toFixed(0)}%` : `${activeFields[0]?.soilMoisture ?? '—'}%`],
                      ].map(([l, v]) => (
                        <div key={l} className="rounded-lg bg-[#0b131e] border border-[#1e2d40] p-2">
                          <div className="text-[9px] text-slate-500">{l}</div>
                          <div className="font-semibold text-white">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#0b131e] border border-[#1e2d40] p-2.5 overflow-x-auto">
                    <div className="text-[10px] font-bold text-slate-300 mb-1">SOIL HEALTH BY FIELD</div>
                    <table className="w-full text-[10px] min-w-[420px]">
                      <thead>
                        <tr className="text-slate-500 border-b border-[#1e2d40]">
                          <th className="text-left py-1">Field</th>
                          <th className="text-left py-1">Soil type</th>
                          <th className="text-right py-1">Moisture</th>
                          <th className="text-right py-1">Health idx</th>
                          <th className="text-left py-1 pl-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fieldPredictions.map((f) => (
                          <tr key={f.id} onClick={() => setSelectedFieldId(f.id)} className="border-b border-[#1e2d40]/40 cursor-pointer hover:bg-lime-500/5">
                            <td className="py-1.5 text-white font-medium">{f.name}</td>
                            <td className="text-slate-400">{f.soilType}</td>
                            <td className="text-right text-slate-300">{f.soilMoisture}%</td>
                            <td className="text-right text-lime-300 font-semibold">{f.soilIdx}</td>
                            <td className="pl-2 text-slate-400">{f.soilIdx >= 75 ? 'Good' : f.soilIdx >= 60 ? 'Fair' : 'Monitor'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {module === 'growth' && (
                <div className="space-y-3">
                  <StageTimeline currentId={stageMeta.id} day={sim.day} stages={displayStages} />

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {displayStages.map((s) => {
                      const start = (s as { startDay?: number; start?: number }).startDay ?? (s as { start?: number }).start ?? 0;
                      const end = (s as { endDay?: number; end?: number }).endDay ?? (s as { end?: number }).end ?? 150;
                      const isCurrent = s.id === stageMeta.id || s.id === sim.stage;
                      const isPast = sim.day >= end;
                      const isNext = nextStage?.id === s.id;
                      const isSelected = (selectedGrowthStage ?? stageMeta.id) === s.id;
                      const daysIn = Math.max(0, end - start);
                      const progress = isCurrent
                        ? Math.min(100, Math.round(((sim.day - start) / Math.max(1, daysIn)) * 100))
                        : isPast
                          ? 100
                          : 0;
                      const eta = isPast ? 'Completed' : isCurrent ? `Day ${sim.day - start + 1}/${daysIn}` : isNext ? `In ${daysToNext}d` : `Day ${start}–${end}`;
                      return (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => setSelectedGrowthStage(s.id)}
                          className={`rounded-xl border p-3 transition text-left w-full ${
                            isSelected
                              ? 'border-cyan-400/70 bg-cyan-500/10 ring-1 ring-cyan-400/40'
                              : isCurrent
                              ? 'border-fuchsia-400/60 bg-fuchsia-500/15'
                              : isNext
                                ? 'border-violet-500/40 bg-violet-500/10'
                                : isPast
                                  ? 'border-emerald-500/30 bg-emerald-500/5'
                                  : 'border-[#1e2d40] bg-[#0b131e] hover:border-slate-500'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <Tip
                              side="top"
                              content={
                                <span>
                                  <strong>{s.label}</strong> (Day {s.start}–{s.end}). Click to open full requirements, risks & recommendations.
                                </span>
                              }
                            >
                              <span className="text-2xl leading-none cursor-help">{s.emoji}</span>
                            </Tip>
                            <Tip
                              side="left"
                              content={
                                isCurrent
                                  ? 'This is the current simulation stage.'
                                  : isNext
                                    ? `Predicted next stage — about ${daysToNext} days away.`
                                    : isPast
                                      ? 'This stage is complete in the current cycle.'
                                      : 'Upcoming stage later in the season.'
                              }
                            >
                              <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded cursor-help ${
                                isCurrent ? 'bg-fuchsia-500/30 text-fuchsia-200' :
                                isNext ? 'bg-violet-500/30 text-violet-200' :
                                isPast ? 'bg-emerald-500/30 text-emerald-200' :
                                'bg-slate-700/50 text-slate-400'
                              }`}>
                                {isCurrent ? 'Current' : isNext ? 'Next' : isPast ? 'Done' : 'Upcoming'}
                              </span>
                            </Tip>
                          </div>
                          <div className={`text-[12px] font-bold leading-tight ${isCurrent ? 'text-fuchsia-200' : 'text-white'}`}>
                            {s.label}
                          </div>
                          <div className="text-[9px] text-slate-500 mt-0.5">{eta}</div>
                          <div className="mt-2 h-1.5 rounded-full bg-[#0b131e] overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isPast ? 'bg-emerald-500' : isCurrent ? 'bg-fuchsia-500' : isNext ? 'bg-violet-500/60' : 'bg-slate-700'
                              }`}
                              style={{ width: `${isNext && !isCurrent ? 8 : progress}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[8px] text-slate-500 mt-1">
                            <span>D{s.start}</span>
                            <span>{progress}%</span>
                            <span>D{s.end}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {(() => {
                    const sid = selectedGrowthStage ?? sim.stage;
                    const range = STAGE_RANGES.find((s) => s.id === sid) || stageMeta;
                    const detail = STAGE_DETAILS.find((d) => d.id === sid) || STAGE_DETAILS[0];
                    const isCurrent = sid === sim.stage;
                    const isPast = sim.day >= range.end;
                    const isNext = nextStage?.id === sid;
                    const daysIn = Math.max(1, range.end - range.start);
                    const progress = isCurrent
                      ? Math.min(100, Math.round(((sim.day - range.start) / daysIn) * 100))
                      : isPast ? 100 : 0;
                    return (
                      <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-[#121a27] to-[#0b131e] p-3 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-3xl">{range.emoji}</span>
                            <div>
                              <div className="text-sm font-bold text-white">{range.label}</div>
                              <div className="text-[10px] text-slate-400">Days {range.start} – {range.end} · {detail.shortDesc}</div>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                              isCurrent ? 'bg-fuchsia-500/30 text-fuchsia-200' :
                              isNext ? 'bg-violet-500/30 text-violet-200' :
                              isPast ? 'bg-emerald-500/30 text-emerald-200' : 'bg-slate-700 text-slate-300'
                            }`}>
                              {isCurrent ? 'Current Stage' : isNext ? 'Next Stage' : isPast ? 'Completed' : 'Upcoming'}
                            </span>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-200">
                              Yield impact {detail.yieldImpact}%
                            </span>
                            <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                              Progress {progress}%
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-slate-300 leading-relaxed">{detail.longDesc}</p>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                          <div className="rounded-lg bg-[#0b131e] border border-[#1e2d40] p-2.5">
                            <div className="text-[10px] font-bold text-cyan-300 mb-2">REQUIREMENTS</div>
                            <div className="space-y-1 text-[10px]">
                              {[
                                ['Temperature', detail.requirements.temp],
                                ['Moisture', detail.requirements.moisture],
                                ['Sunlight', detail.requirements.sunlight],
                                ['Nutrients', detail.requirements.nutrients],
                                ['Irrigation', detail.requirements.irrigation],
                                ['Soil pH', detail.requirements.ph],
                              ].map(([l, v]) => (
                                <div key={l} className="flex justify-between gap-2">
                                  <span className="text-slate-500">{l}</span>
                                  <span className="text-slate-200 text-right">{v}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-lg bg-[#0b131e] border border-[#1e2d40] p-2.5">
                            <div className="text-[10px] font-bold text-amber-300 mb-2">RISKS</div>
                            <div className="space-y-1.5">
                              {detail.risks.map((r) => (
                                <div key={r.title} className="flex gap-2 items-start">
                                  <span className="text-amber-400 text-[10px] mt-0.5">⚠</span>
                                  <div>
                                    <div className="text-[10px] font-semibold text-slate-200">{r.title}</div>
                                    <div className="text-[9px] text-slate-500">{r.detail}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-lg bg-[#0b131e] border border-[#1e2d40] p-2.5">
                            <div className="text-[10px] font-bold text-emerald-300 mb-2">RECOMMENDATIONS</div>
                            <ul className="space-y-1">
                              {detail.recommendations.map((rec) => (
                                <li key={rec} className="text-[10px] text-slate-300 flex gap-1.5">
                                  <span className="text-emerald-400 shrink-0">✓</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <div className="h-2 rounded-full bg-[#0b131e] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isPast ? 'bg-emerald-500' : isCurrent ? 'bg-fuchsia-500' : 'bg-violet-500/50'}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-[11px]">
                    {[
                      ['Crop', cropLabel],
                      ['Field variety', cropId === 'grape' || /grape|vine/.test(cropId) ? fieldVariety.label : '—'],
                      ['Current Stage', stageMeta.label],
                      ['Next Stage', nextStage?.label || '—'],
                      ['Expected In', `${daysToNext} Days`],
                      ['Day in Cycle', `${sim.day} / 150`],
                      ['Progress', 'On Track'],
                      ['Health Index', `${sim.healthIndex}%`],
                    ].map(([l, v]) => (
                      <div key={l} className="rounded-lg bg-[#0b131e] border border-[#1e2d40] p-2">
                        <div className="text-[9px] text-slate-500">{l}</div>
                        <div className="font-semibold text-white">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Key factors */}
            <div className={`${panel} p-3`}>
              <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase">Key Factors Impacting Yield</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {[
                  { icon: <Droplets size={16} className="text-cyan-400" />, l: 'Soil Moisture', v: `${sim.env.soilMoisture.toFixed(0)}%`, impact: 'High Impact', ic: 'text-emerald-400' },
                  { icon: <Thermometer size={16} className="text-orange-400" />, l: 'Temperature', v: `${sim.env.temperature}°C`, impact: 'Medium Impact', ic: 'text-amber-400' },
                  { icon: <Sun size={16} className="text-yellow-400" />, l: 'Sunlight (hrs)', v: '7.2 hrs', impact: 'High Impact', ic: 'text-emerald-400' },
                  { icon: <Activity size={16} className="text-lime-400" />, l: 'Nitrogen (N)', v: '34 ppm', impact: 'Medium Impact', ic: 'text-amber-400' },
                  { icon: <CloudRain size={16} className="text-sky-400" />, l: 'Rainfall', v: `${sim.env.rainfall.toFixed(1)} mm`, impact: 'Low Impact', ic: 'text-slate-400' },
                ].map((f) => (
                  <Tip
                    key={f.l}
                    side="top"
                    wide
                    content={
                      <span>
                        <strong className="text-white">{f.l}</strong>: {f.v}. Impact on yield model: {f.impact}.
                        Click modules above to see how this factor feeds each prediction.
                      </span>
                    }
                  >
                    <div className="rounded-xl bg-[#0b131e] border border-[#1e2d40] p-2.5 text-center cursor-help hover:border-violet-500/40 w-full">
                      <div className="flex justify-center mb-1">{f.icon}</div>
                      <div className="text-[9px] text-slate-500">{f.l}</div>
                      <div className="text-sm font-bold text-white">{f.v}</div>
                      <div className={`text-[9px] font-medium ${f.ic}`}>{f.impact}</div>
                    </div>
                  </Tip>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#0b131e] border border-[#1e2d40] p-2.5">
                  <div className="text-[9px] font-bold text-slate-400 mb-2">FACTOR STRENGTH</div>
                  <FactorBars factors={[
                    { label: 'Soil Moisture', value: sim.env.soilMoisture, max: 100, color: '#38bdf8' },
                    { label: 'Temperature fit', value: Math.max(20, 100 - Math.abs(sim.env.temperature - 28) * 4), max: 100, color: '#f97316' },
                    { label: 'Sunlight', value: 72, max: 100, color: '#eab308' },
                    { label: 'Nitrogen', value: 68, max: 100, color: '#a3e635' },
                    { label: 'Rainfall adequacy', value: Math.min(100, 40 + sim.env.rainfall * 3), max: 100, color: '#60a5fa' },
                  ]} />
                </div>
                <div className="rounded-xl bg-[#0b131e] border border-[#1e2d40] p-2.5 flex flex-col items-center justify-center">
                  <div className="text-[9px] font-bold text-slate-400 mb-1">MULTI-MODEL ENSEMBLE</div>
                  <NeuralDecor />
                  <div className="grid grid-cols-3 gap-2 w-full mt-2 text-center text-[9px]">
                    <div className="rounded bg-[#121a27] border border-[#1e2d40] p-1.5">
                      <div className="text-violet-300 font-bold">XGBoost</div>
                      <div className="text-slate-500">42% weight</div>
                    </div>
                    <div className="rounded bg-[#121a27] border border-[#1e2d40] p-1.5">
                      <div className="text-sky-300 font-bold">LSTM</div>
                      <div className="text-slate-500">33% weight</div>
                    </div>
                    <div className="rounded bg-[#121a27] border border-[#1e2d40] p-1.5">
                      <div className="text-emerald-300 font-bold">RF</div>
                      <div className="text-slate-500">25% weight</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Other predictions strip */}
            <div className={`${panel} p-3`}>
              <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase">Other Predictions</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <button type="button" onClick={() => setModule('disease')} className="rounded-xl bg-[#0b131e] border border-[#1e2d40] p-3 text-left hover:border-emerald-500/40">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield size={14} className="text-emerald-400" />
                    <span className="text-[10px] text-slate-400 font-semibold">DISEASE RISK</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{diseaseRisk}%</div>
                  <div className="text-[10px] text-emerald-400 mb-2">{diseaseRisk < 25 ? 'Low Risk' : 'Moderate'}</div>
                  <div className="space-y-0.5 text-[9px] text-slate-500">
                    <div className="flex justify-between"><span>Downy Mildew</span><span>{diseaseRisk}%</span></div>
                    <div className="flex justify-between"><span>Powdery Mildew</span><span>{Math.min(50, diseaseRisk + 4)}%</span></div>
                    <div className="flex justify-between"><span>Botrytis</span><span>{Math.max(5, diseaseRisk - 3)}%</span></div>
                  </div>
                </button>

                <button type="button" onClick={() => setModule('irrigation')} className="rounded-xl bg-[#0b131e] border border-[#1e2d40] p-3 text-left hover:border-sky-500/40">
                  <div className="flex items-center gap-2 mb-1">
                    <Droplets size={14} className="text-sky-400" />
                    <span className="text-[10px] text-slate-400 font-semibold">IRRIGATION</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{irrigationMm} <span className="text-sm font-medium text-slate-400">mm</span></div>
                  <div className="text-[10px] text-sky-400 mb-2">Water Required</div>
                  <div className="space-y-0.5 text-[9px] text-slate-500">
                    <div className="flex justify-between"><span>Next Irrigation</span><span className="text-slate-300">{sim.irrigationNeed ? 'Today' : 'Tomorrow'}</span></div>
                    <div className="flex justify-between"><span>Duration</span><span className="text-slate-300">45 min</span></div>
                    <div className="flex justify-between"><span>Efficiency</span><span className="text-slate-300">{sim.hydrogelEfficiency}%</span></div>
                  </div>
                </button>

                <button type="button" onClick={() => setModule('soil')} className="rounded-xl bg-[#0b131e] border border-[#1e2d40] p-3 text-left hover:border-lime-500/40">
                  <div className="flex items-center gap-2 mb-1">
                    <Leaf size={14} className="text-lime-400" />
                    <span className="text-[10px] text-slate-400 font-semibold">SOIL HEALTH</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{soilHealth}%</div>
                  <div className="text-[10px] text-lime-400 mb-2">{soilHealth >= 70 ? 'Good' : 'Monitor'}</div>
                  <div className="space-y-0.5 text-[9px] text-slate-500">
                    <div className="flex justify-between"><span>Organic Matter</span><span className="text-slate-300">2.3%</span></div>
                    <div className="flex justify-between"><span>Soil pH</span><span className="text-slate-300">6.8</span></div>
                    <div className="flex justify-between"><span>Index</span><span className="text-slate-300">{soilHealth}/100</span></div>
                  </div>
                </button>

                <button type="button" onClick={() => setModule('growth')} className="rounded-xl bg-[#0b131e] border border-[#1e2d40] p-3 text-left hover:border-fuchsia-500/40">
                  <div className="flex items-center gap-2 mb-1">
                    <Hexagon size={14} className="text-fuchsia-400" />
                    <span className="text-[10px] text-slate-400 font-semibold">GROWTH STAGE</span>
                  </div>
                  <div className="text-xl font-bold text-fuchsia-300">{nextStage?.label || '—'}</div>
                  <div className="text-[10px] text-slate-400 mb-2">Next Stage</div>
                  <div className="space-y-0.5 text-[9px] text-slate-500">
                    <div className="flex justify-between"><span>Current</span><span className="text-slate-300">{stageMeta.label}</span></div>
                    <div className="flex justify-between"><span>Expected In</span><span className="text-slate-300">{daysToNext} Days</span></div>
                    <div className="flex justify-between"><span>Progress</span><span className="text-emerald-400">On Track</span></div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="xl:col-span-3 space-y-2">
            <div className={`${panel} p-3`}>
              <div className="text-[10px] font-bold text-slate-400 mb-2">PREDICTION INSIGHTS</div>
              <div className="space-y-2 text-[10px]">
                <div className="flex gap-2 items-start rounded-lg bg-[#0b131e] border border-[#1e2d40] p-2">
                  <TrendingUp size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-emerald-300 font-semibold">Yield across 4 fields</div>
                    <div className="text-slate-500">
                      Farm {farmTotals.totalTons} t · avg {farmTotals.avgYieldPerAcre} t/ac · best {farmTotals.best?.name} ({farmTotals.best?.yieldPerAcre} t/ac)
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 items-start rounded-lg bg-[#0b131e] border border-[#1e2d40] p-2">
                  <Shield size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-emerald-300 font-semibold">Low disease risk</div>
                    <div className="text-slate-500">Good conditions, continue monitoring</div>
                  </div>
                </div>
                <div className="flex gap-2 items-start rounded-lg bg-[#0b131e] border border-[#1e2d40] p-2">
                  <Droplets size={14} className="text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sky-300 font-semibold">Irrigation optimal</div>
                    <div className="text-slate-500">Next irrigation recommended {sim.irrigationNeed ? 'today' : 'tomorrow'}</div>
                  </div>
                </div>
                <div className="flex gap-2 items-start rounded-lg bg-[#0b131e] border border-[#1e2d40] p-2">
                  <Leaf size={14} className="text-lime-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-lime-300 font-semibold">Soil health is good</div>
                    <div className="text-slate-500">Maintain organic matter levels</div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`${panel} p-3`}>
              <div className="text-[10px] font-bold text-slate-400 mb-2">MODEL PERFORMANCE</div>
              <div className="space-y-2">
                {[
                  { l: 'Yield Prediction', v: confidence, c: 'bg-violet-500', tip: 'Cross-validated accuracy of the XGBoost yield regressor on historical vineyard seasons.' },
                  { l: 'Disease Risk', v: 90, c: 'bg-emerald-500', tip: 'Accuracy detecting mildew/botrytis risk windows from humidity, canopy and weather.' },
                  { l: 'Irrigation Prediction', v: 93, c: 'bg-sky-500', tip: 'How well water-need forecasts match actual irrigation outcomes.' },
                  { l: 'Soil Health', v: 89, c: 'bg-amber-500', tip: 'Agreement between predicted soil index and lab / sensor samples.' },
                  { l: 'Growth Stage', v: 94, c: 'bg-fuchsia-500', tip: 'Phenology stage classification accuracy vs field observations.' },
                ].map((m) => (
                  <Tip key={m.l} content={m.tip} side="left" wide>
                    <div className="cursor-help w-full">
                      <div className="flex justify-between text-[9px] mb-0.5">
                        <span className="text-slate-400 border-b border-dotted border-slate-600">{m.l}</span>
                        <span className="text-white font-semibold">{m.v}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#0b131e] overflow-hidden">
                        <div className={`h-full rounded-full ${m.c}`} style={{ width: `${m.v}%` }} />
                      </div>
                    </div>
                  </Tip>
                ))}
              </div>
            </div>

            <div className={`${panel} p-3`}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[10px] font-bold text-slate-400">RECENT PREDICTIONS</div>
                <span className="text-[9px] text-violet-400">View All</span>
              </div>
              <div className="space-y-1.5 text-[10px]">
                {[
                  { icon: <TrendingUp size={12} className="text-violet-400" />, l: 'Crop Yield Prediction', t: '10:30 AM' },
                  { icon: <Shield size={12} className="text-emerald-400" />, l: 'Disease Risk Prediction', t: '10:15 AM' },
                  { icon: <Droplets size={12} className="text-sky-400" />, l: 'Irrigation Prediction', t: '10:00 AM' },
                  { icon: <Leaf size={12} className="text-lime-400" />, l: 'Soil Health Prediction', t: '09:45 AM' },
                  { icon: <Hexagon size={12} className="text-fuchsia-400" />, l: 'Growth Stage Prediction', t: '09:30 AM' },
                ].map((r) => (
                  <div key={r.l} className="flex items-center gap-2 py-0.5">
                    {r.icon}
                    <span className="text-slate-300 flex-1 truncate">{r.l}</span>
                    <span className="text-slate-500 text-[9px]">{r.t}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={`${panel} p-3 flex flex-col items-center`}>
              <Tip content="Rolling 7-day average accuracy across all five prediction models. Hover model bars above for per-model detail." side="top" wide>
                <div className="text-[10px] font-bold text-slate-400 mb-1 cursor-help border-b border-dotted border-slate-600">PREDICTION ACCURACY</div>
              </Tip>
              <RingGauge value={confidence} centerText={`${confidence}%`} sub="High Accuracy · Excellent" color="#8b5cf6" size={100} />
              <div className="w-full mt-2">
                <Spark values={[82, 84, 86, 85, 88, 90, confidence]} color="#a78bfa" />
                <div className="text-[9px] text-emerald-400 text-center mt-0.5">↑ 6% vs last 7 days</div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-[9px] text-slate-500 flex flex-wrap items-center gap-2 px-1">
          <Info size={11} />
          Predictions are AI-generated using real-time data and historical patterns. Results may vary based on weather and other external factors.
          <span className="ml-auto">Last Updated: 20 May 2025, 10:30 AM</span>
        </div>
      </div>
    </div>
  );
}
