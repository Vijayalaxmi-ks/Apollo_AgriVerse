import { useMemo, useState } from 'react';
import {
  Thermometer, Droplets, Sun, Leaf, CloudRain, FlaskConical,
  AlertTriangle, CheckCircle2, ChevronRight, Calendar,
} from 'lucide-react';
import type { SimState, LifecycleStage } from './simulation';
import { STAGE_RANGES } from './simulation';

/* ── Stage content (matches reference UI day ranges) ── */
type StageMeta = {
  id: LifecycleStage;
  num: number;
  label: string;
  days: string;
  dayStart: number;
  dayEnd: number;
  shortDesc: string;
  longDesc: string;
  yieldImpact: number; // 0–100 relative importance
  requirements: {
    temp: string;
    moisture: string;
    sunlight: string;
    nutrients: string;
    irrigation: string;
    ph: string;
  };
  risks: { icon: 'humidity' | 'nutrient' | 'heat' | 'water'; title: string; detail: string }[];
  recommendations: string[];
  historyPct: number;
};

const STAGES: StageMeta[] = [
  {
    id: 'germination',
    num: 1,
    label: 'Germination',
    days: '1 – 15 days',
    dayStart: 1,
    dayEnd: 15,
    shortDesc: 'Seed swells and radicle emerges. Foundation of the vine.',
    longDesc: 'Seed absorbs water, radicle breaks the seed coat and first shoot appears. Critical for stand establishment.',
    yieldImpact: 15,
    requirements: {
      temp: '18 – 25 °C',
      moisture: '70 – 80% Optimal',
      sunlight: '4 – 6 hrs/day',
      nutrients: 'Starter N-P',
      irrigation: 'Light, frequent',
      ph: '5.5 – 6.5',
    },
    risks: [
      { icon: 'water', title: 'Waterlogging', detail: 'Seed rot risk' },
      { icon: 'heat', title: 'Cold soil', detail: 'Below 15°C slows emergence' },
      { icon: 'humidity', title: 'Damping-off', detail: 'Fungal seedling death' },
    ],
    recommendations: [
      'Keep soil moist but not saturated',
      'Ensure seedbed is fine and firm',
      'Protect from birds and soil crusting',
      'Monitor soil temperature daily',
    ],
    historyPct: 100,
  },
  {
    id: 'vegetative',
    num: 2,
    label: 'Vegetative Growth',
    days: '16 – 60 days',
    dayStart: 16,
    dayEnd: 60,
    shortDesc: 'Rapid shoot and leaf expansion. Builds canopy and root system.',
    longDesc: 'Vines grow leaves and canes. Strong vegetative growth sets the capacity for flowering and fruit load.',
    yieldImpact: 35,
    requirements: {
      temp: '22 – 28 °C',
      moisture: '60 – 75% Optimal',
      sunlight: '6 – 8 hrs/day',
      nutrients: 'N focus, balanced P-K',
      irrigation: 'Moderate',
      ph: '5.5 – 6.5',
    },
    risks: [
      { icon: 'nutrient', title: 'Nitrogen excess', detail: 'Too much canopy, poor fruit' },
      { icon: 'water', title: 'Drought stress', detail: 'Stunted shoot growth' },
      { icon: 'heat', title: 'Heat waves', detail: 'Leaf scorch possible' },
    ],
    recommendations: [
      'Train shoots and manage canopy early',
      'Apply nitrogen in split doses',
      'Maintain consistent soil moisture',
      'Scout for pests on young leaves',
    ],
    historyPct: 95,
  },
  {
    id: 'flowering',
    num: 3,
    label: 'Flowering',
    days: '61 – 90 days',
    dayStart: 61,
    dayEnd: 90,
    shortDesc: 'Flower clusters open and pollination occurs. Critical for fruit set.',
    longDesc: 'Inflorescences bloom; successful pollination determines berry number. Highly sensitive to weather and nutrition.',
    yieldImpact: 85,
    requirements: {
      temp: '20 – 28 °C Optimal',
      moisture: '60 – 70% Optimal',
      sunlight: '6 – 8 hrs/day Optimal',
      nutrients: 'Boron, Zinc Critical',
      irrigation: 'Moderate Need',
      ph: '5.5 – 6.5 Optimal',
    },
    risks: [
      { icon: 'humidity', title: 'High Humidity', detail: 'Risk of downy mildew' },
      { icon: 'nutrient', title: 'Low Boron', detail: 'Poor fruit set' },
      { icon: 'heat', title: 'Heat Stress', detail: 'Above 32°C' },
      { icon: 'water', title: 'Water Stress', detail: 'Affects pollination' },
    ],
    recommendations: [
      'Maintain soil moisture between 60–70%',
      'Ensure adequate boron (1–1.5 kg/ha)',
      'Apply zinc sulfate foliar spray (0.5%)',
      'Avoid excessive nitrogen application',
      'Monitor for downy mildew',
    ],
    historyPct: 92,
  },
  {
    id: 'fruit_set',
    num: 4,
    label: 'Fruit Set',
    days: '91 – 115 days',
    dayStart: 91,
    dayEnd: 115,
    shortDesc: 'Fertilized flowers become berries. Cluster architecture forms.',
    longDesc: 'Berries begin to form after successful pollination. Drop of unfertilized flowers is normal; stress increases shatter.',
    yieldImpact: 70,
    requirements: {
      temp: '22 – 30 °C',
      moisture: '55 – 70% Optimal',
      sunlight: '7 – 9 hrs/day',
      nutrients: 'K & Ca important',
      irrigation: 'Steady',
      ph: '5.5 – 6.5',
    },
    risks: [
      { icon: 'water', title: 'Irregular irrigation', detail: 'Berry shatter' },
      { icon: 'heat', title: 'Hot dry winds', detail: 'Poor set' },
      { icon: 'nutrient', title: 'Low calcium', detail: 'Weak berry attachment' },
    ],
    recommendations: [
      'Avoid drought or overwatering swings',
      'Support with potassium and calcium',
      'Protect clusters from extreme heat',
      'Continue disease monitoring',
    ],
    historyPct: 90,
  },
  {
    id: 'berry',
    num: 5,
    label: 'Berry Development',
    days: '116 – 160 days',
    dayStart: 116,
    dayEnd: 160,
    shortDesc: 'Berries expand in size. Green hard stage before veraison.',
    longDesc: 'Cell division then expansion. Berry size and potential yield are largely set in this phase.',
    yieldImpact: 55,
    requirements: {
      temp: '24 – 32 °C',
      moisture: '50 – 65% Optimal',
      sunlight: '7 – 10 hrs/day',
      nutrients: 'K primary, Mg',
      irrigation: 'Moderate–High',
      ph: '5.5 – 6.5',
    },
    risks: [
      { icon: 'water', title: 'Water deficit', detail: 'Small berries' },
      { icon: 'heat', title: 'Sunburn', detail: 'Exposed clusters' },
      { icon: 'humidity', title: 'Bunch rot risk', detail: 'If canopy too dense' },
    ],
    recommendations: [
      'Balance irrigation for size without cracking',
      'Leaf thinning for light and air',
      'Potassium for berry firmness',
      'Watch for birds as berries soften later',
    ],
    historyPct: 88,
  },
  {
    id: 'ripening',
    num: 6,
    label: 'Ripening',
    days: '161 – 230 days',
    dayStart: 161,
    dayEnd: 230,
    shortDesc: 'Veraison to full color. Sugar rises, acids fall.',
    longDesc: 'Berries soften and change color. Sugar accumulation and aroma development define quality.',
    yieldImpact: 45,
    requirements: {
      temp: '22 – 30 °C',
      moisture: '45 – 60% Optimal',
      sunlight: '8 – 10 hrs/day',
      nutrients: 'K high, low N',
      irrigation: 'Reduced near harvest',
      ph: '5.5 – 6.5',
    },
    risks: [
      { icon: 'humidity', title: 'Rain near harvest', detail: 'Dilution / rot' },
      { icon: 'heat', title: 'Extreme heat', detail: 'Raisined berries' },
      { icon: 'water', title: 'Late irrigation', detail: 'Dilutes sugar' },
    ],
    recommendations: [
      'Reduce irrigation to concentrate sugars',
      'Protect from rain if possible',
      'Monitor Brix and taste regularly',
      'Plan harvest windows by block',
    ],
    historyPct: 85,
  },
  {
    id: 'harvest',
    num: 7,
    label: 'Harvesting',
    days: '231 – 280 days',
    dayStart: 231,
    dayEnd: 280,
    shortDesc: 'Fruit reaches target maturity. Pick for quality and yield.',
    longDesc: 'Harvest timing balances sugar, acid, and flavor. Post-harvest vine recovery begins.',
    yieldImpact: 25,
    requirements: {
      temp: '18 – 28 °C',
      moisture: '40 – 55%',
      sunlight: 'As available',
      nutrients: 'Post-harvest feed',
      irrigation: 'Minimal',
      ph: '5.5 – 6.5',
    },
    risks: [
      { icon: 'humidity', title: 'Wet harvest', detail: 'Quality loss' },
      { icon: 'heat', title: 'Hot pick days', detail: 'Berry quality drop' },
      { icon: 'water', title: 'Overripe delay', detail: 'Raisining / birds' },
    ],
    recommendations: [
      'Harvest in cool hours when possible',
      'Sort and handle gently',
      'Irrigate lightly after harvest for recovery',
      'Plan pruning after leaf fall',
    ],
    historyPct: 93,
  },
];

/* ── Simple SVG plant illustrations per stage ── */
function PlantVisual({ stage, size = 88 }: { stage: LifecycleStage; size?: number }) {
  const common = { width: size, height: size + 28, viewBox: '0 0 80 100' };
  if (stage === 'germination') {
    return (
      <svg {...common}>
        <ellipse cx="40" cy="88" rx="28" ry="6" fill="#3d2b1a" opacity="0.9" />
        <path d="M40 88 Q38 70 36 55" stroke="#8B6914" strokeWidth="2.5" fill="none" />
        <ellipse cx="36" cy="48" rx="8" ry="5" fill="#7CB342" transform="rotate(-25 36 48)" />
        <circle cx="32" cy="52" r="3.5" fill="#C4A35A" />
        {/* roots */}
        <path d="M40 88 Q30 95 22 98 M40 88 Q50 96 58 99 M40 88 Q35 97 28 100" stroke="#5D4037" strokeWidth="1.2" fill="none" opacity="0.7" />
      </svg>
    );
  }
  if (stage === 'vegetative') {
    return (
      <svg {...common}>
        <ellipse cx="40" cy="88" rx="30" ry="6" fill="#3d2b1a" />
        <path d="M40 88 L40 45" stroke="#5D4037" strokeWidth="3.5" />
        <ellipse cx="28" cy="50" rx="12" ry="8" fill="#66BB6A" transform="rotate(-30 28 50)" />
        <ellipse cx="52" cy="48" rx="12" ry="8" fill="#43A047" transform="rotate(25 52 48)" />
        <ellipse cx="34" cy="38" rx="10" ry="7" fill="#81C784" transform="rotate(-10 34 38)" />
        <ellipse cx="48" cy="36" rx="9" ry="6" fill="#66BB6A" transform="rotate(15 48 36)" />
        <path d="M40 88 Q28 96 18 100 M40 88 Q52 97 62 100 M40 88 Q40 98 40 102 M40 88 Q32 99 25 103" stroke="#5D4037" strokeWidth="1.2" fill="none" opacity="0.75" />
      </svg>
    );
  }
  if (stage === 'flowering') {
    return (
      <svg {...common}>
        <ellipse cx="40" cy="88" rx="30" ry="6" fill="#3d2b1a" />
        <path d="M40 88 L40 42" stroke="#5D4037" strokeWidth="3.5" />
        <ellipse cx="26" cy="52" rx="11" ry="7" fill="#66BB6A" transform="rotate(-35 26 52)" />
        <ellipse cx="54" cy="50" rx="11" ry="7" fill="#43A047" transform="rotate(30 54 50)" />
        <ellipse cx="32" cy="38" rx="9" ry="6" fill="#81C784" />
        <ellipse cx="50" cy="36" rx="9" ry="6" fill="#66BB6A" />
        {/* flower clusters */}
        <circle cx="30" cy="28" r="2.2" fill="#F5E6A8" />
        <circle cx="35" cy="24" r="2.2" fill="#FFF8DC" />
        <circle cx="40" cy="26" r="2.2" fill="#F5E6A8" />
        <circle cx="45" cy="23" r="2.2" fill="#FFF8DC" />
        <circle cx="50" cy="27" r="2.2" fill="#F5E6A8" />
        <circle cx="33" cy="32" r="1.8" fill="#E8D48B" />
        <circle cx="48" cy="31" r="1.8" fill="#E8D48B" />
        <path d="M40 88 Q28 96 16 100 M40 88 Q52 97 64 100 M40 88 Q40 99 40 103 M40 88 Q33 99 26 103" stroke="#5D4037" strokeWidth="1.2" fill="none" opacity="0.75" />
      </svg>
    );
  }
  if (stage === 'fruit_set') {
    return (
      <svg {...common}>
        <ellipse cx="40" cy="88" rx="30" ry="6" fill="#3d2b1a" />
        <path d="M40 88 L40 40" stroke="#5D4037" strokeWidth="3.5" />
        <ellipse cx="25" cy="50" rx="11" ry="7" fill="#66BB6A" transform="rotate(-30 25 50)" />
        <ellipse cx="55" cy="48" rx="11" ry="7" fill="#43A047" transform="rotate(28 55 48)" />
        <ellipse cx="32" cy="36" rx="9" ry="6" fill="#81C784" />
        <ellipse cx="50" cy="34" rx="9" ry="6" fill="#66BB6A" />
        {/* small green berries */}
        {[
          [32, 28], [36, 25], [40, 27], [44, 24], [48, 28],
          [34, 32], [42, 31], [46, 33],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="2.4" fill="#8BC34A" />
        ))}
        <path d="M40 88 Q28 96 16 100 M40 88 Q52 97 64 100 M40 88 Q40 99 40 103 M40 88 Q33 99 26 103" stroke="#5D4037" strokeWidth="1.2" fill="none" opacity="0.75" />
      </svg>
    );
  }
  if (stage === 'berry') {
    return (
      <svg {...common}>
        <ellipse cx="40" cy="88" rx="30" ry="6" fill="#3d2b1a" />
        <path d="M40 88 L40 38" stroke="#5D4037" strokeWidth="3.5" />
        <ellipse cx="24" cy="48" rx="12" ry="8" fill="#66BB6A" transform="rotate(-28 24 48)" />
        <ellipse cx="56" cy="46" rx="12" ry="8" fill="#43A047" transform="rotate(25 56 46)" />
        <ellipse cx="30" cy="34" rx="10" ry="6" fill="#81C784" />
        <ellipse cx="52" cy="32" rx="10" ry="6" fill="#66BB6A" />
        {[
          [30, 26], [35, 22], [40, 24], [45, 21], [50, 25],
          [32, 30], [38, 28], [44, 29], [48, 31],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3" fill="#7CB342" />
        ))}
        <path d="M40 88 Q28 96 16 100 M40 88 Q52 97 64 100 M40 88 Q40 99 40 103 M40 88 Q33 99 26 103" stroke="#5D4037" strokeWidth="1.2" fill="none" opacity="0.75" />
      </svg>
    );
  }
  if (stage === 'ripening') {
    return (
      <svg {...common}>
        <ellipse cx="40" cy="88" rx="30" ry="6" fill="#3d2b1a" />
        <path d="M40 88 L40 36" stroke="#5D4037" strokeWidth="3.5" />
        <ellipse cx="24" cy="46" rx="12" ry="8" fill="#66BB6A" transform="rotate(-28 24 46)" />
        <ellipse cx="56" cy="44" rx="12" ry="8" fill="#43A047" transform="rotate(25 56 44)" />
        <ellipse cx="30" cy="32" rx="10" ry="6" fill="#81C784" />
        <ellipse cx="52" cy="30" rx="10" ry="6" fill="#66BB6A" />
        {[
          [30, 24], [35, 20], [40, 22], [45, 19], [50, 23],
          [32, 28], [38, 26], [44, 27], [48, 29],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3.2" fill={i % 2 === 0 ? '#7B1FA2' : '#9C27B0'} />
        ))}
        <path d="M40 88 Q28 96 16 100 M40 88 Q52 97 64 100 M40 88 Q40 99 40 103 M40 88 Q33 99 26 103" stroke="#5D4037" strokeWidth="1.2" fill="none" opacity="0.75" />
      </svg>
    );
  }
  // harvest
  return (
    <svg {...common}>
      <ellipse cx="40" cy="88" rx="30" ry="6" fill="#3d2b1a" />
      <path d="M40 88 L40 36" stroke="#5D4037" strokeWidth="3.5" />
      <ellipse cx="24" cy="46" rx="12" ry="8" fill="#66BB6A" transform="rotate(-28 24 46)" />
      <ellipse cx="56" cy="44" rx="12" ry="8" fill="#43A047" transform="rotate(25 56 44)" />
      <ellipse cx="30" cy="32" rx="10" ry="6" fill="#81C784" />
      <ellipse cx="52" cy="30" rx="10" ry="6" fill="#66BB6A" />
      {[
        [30, 24], [35, 20], [40, 22], [45, 19], [50, 23],
        [32, 28], [38, 26], [44, 27], [48, 29], [36, 31],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3.4" fill={i % 3 === 0 ? '#4A148C' : '#6A1B9A'} />
      ))}
      <path d="M40 88 Q28 96 16 100 M40 88 Q52 97 64 100 M40 88 Q40 99 40 103 M40 88 Q33 99 26 103" stroke="#5D4037" strokeWidth="1.2" fill="none" opacity="0.75" />
    </svg>
  );
}

function RiskIcon({ type }: { type: StageMeta['risks'][0]['icon'] }) {
  if (type === 'humidity') return <Droplets size={14} className="text-blue-400" />;
  if (type === 'nutrient') return <FlaskConical size={14} className="text-amber-400" />;
  if (type === 'heat') return <Thermometer size={14} className="text-rose-400" />;
  return <CloudRain size={14} className="text-sky-400" />;
}

function YieldImpactChart({ stages, activeId }: { stages: StageMeta[]; activeId: LifecycleStage }) {
  const max = 100;
  const w = 320;
  const h = 100;
  const pad = 8;
  const pts = stages.map((s, i) => {
    const x = pad + (i / (stages.length - 1)) * (w - pad * 2);
    const y = h - pad - (s.yieldImpact / max) * (h - pad * 2);
    return { x, y, s };
  });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const active = pts.find((p) => p.s.id === activeId);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-28">
      <defs>
        <linearGradient id="yiFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${path} L ${pts[pts.length - 1].x} ${h - pad} L ${pts[0].x} ${h - pad} Z`}
        fill="url(#yiFill)"
      />
      <path d={path} fill="none" stroke="#34d399" strokeWidth="2" />
      {pts.map((p) => (
        <circle
          key={p.s.id}
          cx={p.x}
          cy={p.y}
          r={p.s.id === activeId ? 5 : 3}
          fill={p.s.id === activeId ? '#34d399' : '#1e2d40'}
          stroke="#34d399"
          strokeWidth="1.5"
        />
      ))}
      {active && (
        <g>
          <rect x={active.x - 36} y={active.y - 22} width="72" height="16" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="0.8" />
          <text x={active.x} y={active.y - 11} textAnchor="middle" fill="#6ee7b7" fontSize="8" fontWeight="600">
            High Impact Stage
          </text>
        </g>
      )}
      {stages.map((s, i) => (
        <text
          key={s.id}
          x={pts[i].x}
          y={h - 1}
          textAnchor="middle"
          fill="#64748b"
          fontSize="7"
        >
          {s.label.split(' ')[0].slice(0, 6)}
        </text>
      ))}
    </svg>
  );
}

export default function LifecyclePanel({ sim }: { sim: SimState }) {
  const currentFromSim = STAGE_RANGES.find((s) => s.id === sim.stage)?.id ?? 'flowering';
  const [selectedId, setSelectedId] = useState<LifecycleStage>(currentFromSim);

  const stage = useMemo(
    () => STAGES.find((s) => s.id === selectedId) ?? STAGES[2],
    [selectedId],
  );

  const nextStage = STAGES.find((s) => s.num === stage.num + 1);
  const daysInStage = Math.max(1, stage.dayEnd - stage.dayStart + 1);
  // approximate progress within selected stage using sim day when it matches, else mid
  const dayInStage =
    sim.stage === stage.id
      ? Math.min(daysInStage, Math.max(1, sim.day - stage.dayStart + 1))
      : Math.round(daysInStage * 0.4);
  const progressPct = Math.round((dayInStage / daysInStage) * 100);

  const months = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0b131e] space-y-4">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">GRAPE PLANT LIFECYCLE</h2>
        <p className="text-[11px] text-slate-400">Complete lifecycle from germination to harvesting</p>
      </div>

      {/* ── Stage timeline with plant visuals ── */}
      <div className="bg-[#0f1722] rounded-2xl border border-[#1e2d40] overflow-hidden">
        {/* Step numbers */}
        <div className="px-3 pt-4 pb-1 flex items-center justify-between gap-1">
          {STAGES.map((s, i) => {
            const active = s.id === selectedId;
            return (
              <div key={s.id} className="flex-1 flex items-center min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className="flex flex-col items-center w-full group"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition border-2 ${
                      active
                        ? 'bg-emerald-500 text-white border-emerald-400 shadow-lg shadow-emerald-500/30'
                        : 'bg-[#16202d] text-slate-400 border-[#1e2d40] group-hover:border-emerald-500/40'
                    }`}
                  >
                    {s.num}
                  </div>
                  <div
                    className={`mt-1.5 text-[10px] font-semibold text-center leading-tight ${
                      active ? 'text-emerald-300' : 'text-slate-400'
                    }`}
                  >
                    {s.label}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">{s.days}</div>
                </button>
                {i < STAGES.length - 1 && (
                  <div className="hidden sm:block w-4 shrink-0 h-px bg-[#1e2d40] -mt-8" />
                )}
              </div>
            );
          })}
        </div>

        {/* Plant row */}
        <div className="relative px-2 pb-4 pt-2">
          <div className="flex items-end justify-between gap-1">
            {STAGES.map((s) => {
              const active = s.id === selectedId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className={`flex-1 flex flex-col items-center rounded-xl transition relative ${
                    active
                      ? 'bg-emerald-900/25 ring-2 ring-emerald-500/60 shadow-lg shadow-emerald-900/20'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className={`transition ${active ? 'scale-105' : 'opacity-80'}`}>
                    <PlantVisual stage={s.id} size={active ? 96 : 80} />
                  </div>
                </button>
              );
            })}
          </div>
          {/* progress bar under plants */}
          <div className="mt-1 mx-4 h-1.5 rounded-full bg-[#1e2d40] relative">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500"
              style={{ width: `${((stage.num - 0.5) / STAGES.length) * 100}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[8px] border-l-transparent border-r-transparent border-b-emerald-400 transition-all duration-500"
              style={{ left: `calc(${((stage.num - 0.5) / STAGES.length) * 100}% - 6px)` }}
            />
          </div>
        </div>
      </div>

      {/* ── Detail row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Current stage details */}
        <div className="lg:col-span-3 bg-[#16202d] rounded-2xl border border-[#1e2d40] p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Current stage details</div>
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 rounded-xl bg-[#0f1722] border border-[#1e2d40] flex items-center justify-center shrink-0 overflow-hidden">
              <PlantVisual stage={stage.id} size={56} />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white">{stage.label}</h3>
              <div className="text-[10px] text-slate-400">(Stage {stage.num} of 7)</div>
              <p className="text-[11px] text-slate-300 mt-1.5 leading-snug">{stage.shortDesc}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Duration</span>
              <span className="text-white font-medium">{stage.days}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Days in Stage</span>
              <span className="text-white font-medium tabular-nums">
                {dayInStage} / {daysInStage}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Next Stage</span>
              <span className="text-emerald-300 font-medium flex items-center gap-0.5">
                {nextStage ? nextStage.label : 'Complete'}
                {nextStage && <ChevronRight size={12} />}
              </span>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-500">Stage Progress</span>
                <span className="text-emerald-400 font-semibold">{progressPct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#0f1722] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="lg:col-span-5 bg-[#16202d] rounded-2xl border border-[#1e2d40] p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-3">Requirements for this stage</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { icon: <Thermometer size={14} className="text-rose-400" />, label: 'Temperature', value: stage.requirements.temp },
              { icon: <Droplets size={14} className="text-cyan-400" />, label: 'Soil Moisture', value: stage.requirements.moisture },
              { icon: <Sun size={14} className="text-amber-400" />, label: 'Sunlight', value: stage.requirements.sunlight },
              { icon: <Leaf size={14} className="text-emerald-400" />, label: 'Nutrients', value: stage.requirements.nutrients },
              { icon: <CloudRain size={14} className="text-sky-400" />, label: 'Irrigation', value: stage.requirements.irrigation },
              { icon: <span className="text-[10px] font-bold text-violet-300">pH</span>, label: 'pH', value: stage.requirements.ph },
            ].map((r) => (
              <div key={r.label} className="bg-[#0f1722] rounded-xl border border-[#1e2d40] p-2.5">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1">
                  {r.icon}
                  {r.label}
                </div>
                <div className="text-[12px] text-white font-semibold leading-tight">{r.value}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Risks & stress factors</div>
              <div className="space-y-1.5">
                {stage.risks.map((r) => (
                  <div key={r.title} className="flex items-start gap-2 text-[11px]">
                    <RiskIcon type={r.icon} />
                    <div>
                      <span className="text-white font-medium">{r.title}</span>
                      <span className="text-slate-500"> · {r.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                <span className="text-violet-400">AI</span> Recommendations
              </div>
              <ul className="space-y-1">
                {stage.recommendations.slice(0, 5).map((t) => (
                  <li key={t} className="flex gap-1.5 text-[11px] text-slate-300">
                    <CheckCircle2 size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="mt-2 text-[10px] text-violet-300 font-semibold hover:text-violet-200"
              >
                View Full Recommendations
              </button>
            </div>
          </div>
        </div>

        {/* Right mini: yield impact + calendar + history stacked on large */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#16202d] rounded-2xl border border-[#1e2d40] p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Stage impact on yield</div>
            <div className="text-[10px] text-slate-500 mb-1">Yield impact (%)</div>
            <YieldImpactChart stages={STAGES} activeId={stage.id} />
          </div>
        </div>
      </div>

      {/* Bottom row: timeline calendar + historical */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#16202d] rounded-2xl border border-[#1e2d40] p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
            <Calendar size={12} /> Stage timeline calendar
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-[420px]">
              <div className="flex text-[9px] text-slate-500 mb-1 pl-28">
                {months.map((m) => (
                  <div key={m} className="flex-1 text-center">{m}</div>
                ))}
              </div>
              <div className="space-y-1.5">
                {STAGES.map((s) => {
                  // map day ranges roughly onto Mar–Oct (8 months ≈ 240 days from ~day 1)
                  const startPct = ((s.dayStart - 1) / 280) * 100;
                  const widthPct = ((s.dayEnd - s.dayStart + 1) / 280) * 100;
                  const active = s.id === selectedId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      className="w-full flex items-center gap-2 text-left"
                    >
                      <div className={`w-28 shrink-0 text-[10px] truncate ${active ? 'text-emerald-300 font-semibold' : 'text-slate-400'}`}>
                        {s.label}
                      </div>
                      <div className="flex-1 h-4 rounded bg-[#0f1722] relative border border-[#1e2d40]/60">
                        <div
                          className={`absolute top-0.5 bottom-0.5 rounded transition ${
                            active ? 'bg-emerald-500' : 'bg-emerald-700/60'
                          }`}
                          style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#16202d] rounded-2xl border border-[#1e2d40] p-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-3">Historical performance (this variety)</div>
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[
              { l: 'Avg. Duration (days)', v: String(daysInStage) },
              { l: 'Avg. Yield (t/plant)', v: '4.6' },
              { l: 'Success Rate', v: '92%' },
              { l: 'Stress Impact', v: stage.num <= 3 ? 'Low' : stage.num <= 5 ? 'Med' : 'Low' },
            ].map((x) => (
              <div key={x.l} className="bg-[#0f1722] rounded-xl border border-[#1e2d40] p-2 text-center">
                <div className="text-[9px] text-slate-500 leading-tight mb-1">{x.l}</div>
                <div className="text-sm font-bold text-white">{x.v}</div>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-slate-500 mb-2">Stage completion history</div>
          <div className="flex items-end gap-2 h-24">
            {STAGES.map((s) => {
              const active = s.id === selectedId;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSelectedId(s.id)}
                  className="flex-1 flex flex-col items-center gap-1 h-full justify-end"
                >
                  <span className={`text-[10px] font-semibold ${active ? 'text-emerald-300' : 'text-slate-400'}`}>
                    {s.historyPct}%
                  </span>
                  <div
                    className={`w-full max-w-[36px] rounded-t-md transition ${
                      active ? 'bg-emerald-500' : 'bg-emerald-800/70'
                    }`}
                    style={{ height: `${s.historyPct * 0.7}%` }}
                  />
                  <span className="text-[8px] text-slate-500 text-center leading-tight">
                    {s.label.split(' ')[0].slice(0, 6)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
