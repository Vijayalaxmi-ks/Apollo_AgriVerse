import { useMemo, useState, useEffect, useRef, lazy, Suspense } from 'react';
import {
  Thermometer, Droplets, Sun, Leaf, CloudRain, FlaskConical,
  CheckCircle2, ChevronRight, Calendar, Eye, EyeOff, Ruler,
} from 'lucide-react';
import type { SimState, LifecycleStage, GrapeVarietyId, SoilClassId } from './simulation';
import { STAGE_RANGES, getGrapeVariety, getSoilClass, FIELDS, type FieldInfo } from './simulation';
import type { VinePhase } from './VineScene';

/** Polished 3D vine from v0 — lazy so Three/R3F loads only on Lifecycle tab */
const VineScene = lazy(() => import('./VineScene'));

/** Educational phases matching the reference infographic (11 stages) */
type PhaseId =
  | 'dormant_bud'
  | 'bud_break'
  | 'vegetative'
  | 'flowering'
  | 'fruit_set'
  | 'berry'
  | 'veraison'
  | 'ripening'
  | 'harvest'
  | 'post_harvest'
  | 'dormancy';

type PhaseMeta = {
  id: PhaseId;
  num: number;
  label: string;
  days: string;
  shortDesc: string;
  longDesc: string;
  yieldImpact: number;
  simStage?: LifecycleStage;
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
};

const PHASES: PhaseMeta[] = [
  {
    id: 'dormant_bud',
    num: 1,
    label: 'Dormant Bud',
    days: 'Winter rest',
    shortDesc: 'Bud remains dormant during winter on the woody cane.',
    longDesc: 'After leaf fall the vine rests. Dormant buds are protected by scales until spring warmth and moisture trigger bud break.',
    yieldImpact: 10,
    requirements: {
      temp: '0 – 12 °C',
      moisture: 'Soil reserve',
      sunlight: 'Low demand',
      nutrients: 'Stored reserves',
      irrigation: 'Minimal',
      ph: '5.5 – 6.5',
    },
    risks: [
      { icon: 'heat', title: 'Frost injury', detail: 'Extreme cold can kill buds' },
      { icon: 'water', title: 'Waterlogging', detail: 'Root damage in wet soils' },
    ],
    recommendations: [
      'Avoid pruning in severe frost periods',
      'Protect young vines from cold injury',
      'Plan pruning before bud swell',
    ],
  },
  {
    id: 'bud_break',
    num: 2,
    label: 'Bud Break',
    days: 'Day 1 – 15',
    shortDesc: 'Bud swells and a new green shoot emerges in spring.',
    longDesc: 'Scales open, green tissue emerges, and the first shoot grows. Foundation of the new canopy and crop.',
    yieldImpact: 18,
    simStage: 'germination',
    requirements: {
      temp: '12 – 22 °C',
      moisture: '65 – 80%',
      sunlight: '4 – 6 hrs/day',
      nutrients: 'Starter N-P',
      irrigation: 'Light, frequent',
      ph: '5.5 – 6.5',
    },
    risks: [
      { icon: 'heat', title: 'Late frost', detail: 'Damages tender shoots' },
      { icon: 'water', title: 'Drought at break', detail: 'Uneven shoot growth' },
    ],
    recommendations: [
      'Monitor soil temperature and frost risk',
      'Keep moisture steady but not saturated',
      'Delay heavy nitrogen until shoots establish',
    ],
  },
  {
    id: 'vegetative',
    num: 3,
    label: 'Vegetative Growth',
    days: 'Day 15 – 45',
    shortDesc: 'Shoots grow, leaves develop and the canopy expands.',
    longDesc: 'Rapid shoot and leaf expansion builds photosynthetic capacity and sets the frame for flowering and fruit load.',
    yieldImpact: 35,
    simStage: 'vegetative',
    requirements: {
      temp: '22 – 28 °C',
      moisture: '60 – 75%',
      sunlight: '6 – 8 hrs/day',
      nutrients: 'N focus, balanced P-K',
      irrigation: 'Moderate',
      ph: '5.5 – 6.5',
    },
    risks: [
      { icon: 'nutrient', title: 'Nitrogen excess', detail: 'Too much canopy, poor fruit' },
      { icon: 'water', title: 'Drought stress', detail: 'Stunted shoots' },
    ],
    recommendations: [
      'Train shoots on the trellis early',
      'Split nitrogen applications',
      'Scout young leaves for pests',
    ],
  },
  {
    id: 'flowering',
    num: 4,
    label: 'Flowering & Pollination',
    days: 'Day 45 – 65',
    shortDesc:
      'Tiny flowers bloom in clusters. Entomophily (insect pollination) and wind move pollen from anther to stigma.',
    longDesc:
      'Inflorescences open. Pollen from anthers transfers to the stigma mainly by insects (entomophily — bees) and wind. Healthy pollination improves fruit set, berry number and yield.',
    yieldImpact: 92,
    simStage: 'flowering',
    requirements: {
      temp: '20 – 28 °C',
      moisture: '60 – 70%',
      sunlight: '6 – 8 hrs/day',
      nutrients: 'Boron, Zinc critical',
      irrigation: 'Moderate',
      ph: '5.5 – 6.5',
    },
    risks: [
      { icon: 'humidity', title: 'High humidity', detail: 'Downy mildew risk' },
      { icon: 'nutrient', title: 'Low boron', detail: 'Poor fruit set' },
      { icon: 'heat', title: 'Heat > 32°C', detail: 'Reduced set' },
    ],
    recommendations: [
      'Do not spray insecticides during bloom — protect bees',
      'Entomophily: insects transfer pollen to stigma',
      'Maintain even moisture; apply boron if deficient',
    ],
  },
  {
    id: 'fruit_set',
    num: 5,
    label: 'Fruit Set',
    days: 'Day 65 – 80',
    shortDesc: 'After fertilization, the ovary develops into small berries.',
    longDesc: 'Fertilized flowers become pinhead berries. Unfertilized flowers drop. Stress increases shatter and reduces cluster fill.',
    yieldImpact: 78,
    simStage: 'fruit_set',
    requirements: {
      temp: '22 – 30 °C',
      moisture: '55 – 70%',
      sunlight: '6 – 8 hrs/day',
      nutrients: 'Balanced NPK',
      irrigation: 'Steady',
      ph: '5.5 – 6.5',
    },
    risks: [
      { icon: 'water', title: 'Water stress', detail: 'Increased shatter' },
      { icon: 'heat', title: 'Heat spikes', detail: 'Poor set' },
    ],
    recommendations: [
      'Avoid moisture swings after bloom',
      'Light canopy management for air flow',
      'Monitor cluster fill',
    ],
  },
  {
    id: 'berry',
    num: 6,
    label: 'Berry Development',
    days: 'Day 80 – 110',
    shortDesc: 'Berries enlarge, accumulate sugars and begin to change color later.',
    longDesc: 'Berries expand in the green hard stage. Cell division then enlargement; sugar accumulation accelerates toward veraison.',
    yieldImpact: 70,
    simStage: 'berry',
    requirements: {
      temp: '24 – 32 °C',
      moisture: '50 – 65%',
      sunlight: 'Full exposure',
      nutrients: 'K emphasis',
      irrigation: 'Regulated deficit OK',
      ph: '5.5 – 6.5',
    },
    risks: [
      { icon: 'water', title: 'Excess water', detail: 'Diluted sugars / split' },
      { icon: 'nutrient', title: 'K deficiency', detail: 'Poor ripening' },
    ],
    recommendations: [
      'Maintain cluster exposure to light',
      'Avoid over-irrigation',
      'Support potassium nutrition',
    ],
  },
  {
    id: 'veraison',
    num: 7,
    label: 'Veraison',
    days: 'Day 110 – 125',
    shortDesc: 'Berries soften; sugars peak rise begins; color develops by variety.',
    longDesc: 'Veraison marks the shift from growth to ripening. White varieties turn translucent/amber; coloured varieties develop purple–black skin.',
    yieldImpact: 80,
    simStage: 'ripening',
    requirements: {
      temp: '22 – 30 °C',
      moisture: '45 – 60%',
      sunlight: 'Good cluster light',
      nutrients: 'Low N, adequate K',
      irrigation: 'Careful deficit',
      ph: '5.5 – 6.5',
    },
    risks: [
      { icon: 'humidity', title: 'Botrytis', detail: 'Soft berry infection' },
      { icon: 'heat', title: 'Sunburn', detail: 'Exposed clusters' },
    ],
    recommendations: [
      'Open canopy for even color',
      'Protect against birds as sugars rise',
      'Watch disease on softening berries',
    ],
  },
  {
    id: 'ripening',
    num: 8,
    label: 'Ripening',
    days: 'Day 125 – 140',
    shortDesc: 'Berries fully ripen; sugars and flavors reach optimal levels.',
    longDesc: 'Sugar, acid and flavor balance. Target Brix and berry size depend on variety and market (table, raisin, export).',
    yieldImpact: 75,
    simStage: 'ripening',
    requirements: {
      temp: '20 – 30 °C',
      moisture: '40 – 55%',
      sunlight: 'Full',
      nutrients: 'Minimal N',
      irrigation: 'Low',
      ph: '5.5 – 6.5',
    },
    risks: [
      { icon: 'humidity', title: 'Rain near harvest', detail: 'Split / rot' },
      { icon: 'heat', title: 'Heat waves', detail: 'Raisining on vine' },
    ],
    recommendations: [
      'Sample Brix and taste regularly',
      'Protect clusters from birds and wasps',
      'Plan harvest logistics early',
    ],
  },
  {
    id: 'harvest',
    num: 9,
    label: 'Harvesting',
    days: 'Day 140 – 150',
    shortDesc: 'Grapes are harvested at the right time for quality and yield.',
    longDesc: 'Pick in cool hours when possible. Handle gently for table grapes; timely harvest protects quality and market grade.',
    yieldImpact: 40,
    simStage: 'harvest',
    requirements: {
      temp: 'Cool morning preferred',
      moisture: 'Dry clusters best',
      sunlight: 'As available',
      nutrients: 'Post-harvest later',
      irrigation: 'Stop before pick',
      ph: '5.5 – 6.5',
    },
    risks: [
      { icon: 'humidity', title: 'Wet harvest', detail: 'Quality loss' },
      { icon: 'heat', title: 'Hot pick days', detail: 'Berry quality drop' },
    ],
    recommendations: [
      'Harvest in cool hours',
      'Sort and pack gently',
      'Irrigate lightly after harvest for recovery',
    ],
  },
  {
    id: 'post_harvest',
    num: 10,
    label: 'Post Harvest & Canopy',
    days: 'After pick',
    shortDesc: 'Canopy is managed, pruned and trained for sunlight, airflow and next season.',
    longDesc: 'Post-harvest nutrition and irrigation restore reserves. Later pruning and training shape next year’s canopy and crop potential.',
    yieldImpact: 30,
    requirements: {
      temp: 'Ambient',
      moisture: 'Recovery irrigation',
      sunlight: 'Canopy still active',
      nutrients: 'Post-harvest feed',
      irrigation: 'Light recovery',
      ph: '5.5 – 6.5',
    },
    risks: [
      { icon: 'nutrient', title: 'Skipped recovery', detail: 'Weak next bud' },
      { icon: 'water', title: 'Drought after pick', detail: 'Poor reserves' },
    ],
    recommendations: [
      'Apply post-harvest nutrition while leaves are active',
      'Plan pruning after leaf fall',
      'Repair trellis and irrigation',
    ],
  },
  {
    id: 'dormancy',
    num: 11,
    label: 'Dormancy',
    days: 'Winter',
    shortDesc: 'Leaves fall, vines rest and prepare for the next cycle.',
    longDesc: 'Vines enter dormancy. Pruning, soil care and planning set up the next bud break and a healthy full cycle (about 8–12 months by variety and climate).',
    yieldImpact: 12,
    requirements: {
      temp: 'Cool / cold',
      moisture: 'Soil storage',
      sunlight: 'Low demand',
      nutrients: 'Soil building',
      irrigation: 'Minimal',
      ph: 'Correct if needed',
    },
    risks: [
      { icon: 'heat', title: 'Severe frost', detail: 'Wood damage' },
      { icon: 'water', title: 'Standing water', detail: 'Root issues' },
    ],
    recommendations: [
      'Complete pruning in dormancy window',
      'Service drip lines and pumps',
      'Review variety × soil performance',
    ],
  },
];

function hexCss(n: number) {
  return `#${n.toString(16).padStart(6, '0')}`;
}

function RiskIcon({ type }: { type: PhaseMeta['risks'][0]['icon'] }) {
  if (type === 'humidity') return <Droplets size={14} className="text-blue-400" />;
  if (type === 'nutrient') return <FlaskConical size={14} className="text-amber-400" />;
  if (type === 'heat') return <Thermometer size={14} className="text-rose-400" />;
  return <CloudRain size={14} className="text-sky-400" />;
}

/**
 * One progressive whole-plant vine. From vegetative growth onward the full plant is shown;
 * each phase only adds/changes organs (flowers → set → berry → colour → harvest).
 * No external images. Berry colour follows selected variety.
 */
function StageArt({
  phase,
  ripeHex,
  midHex,
  wide = false,
}: {
  phase: PhaseId;
  ripeHex: number;
  midHex: number;
  wide?: boolean;
}) {
  const ripe = hexCss(ripeHex);
  const mid = hexCss(midHex);
  const w = wide ? 320 : 160;
  const h = wide ? 200 : 130;
  const uid = `${phase}-${wide ? 'w' : 's'}`;

  const order: PhaseId[] = [
    'dormant_bud', 'bud_break', 'vegetative', 'flowering', 'fruit_set',
    'berry', 'veraison', 'ripening', 'harvest', 'post_harvest', 'dormancy',
  ];
  const idx = order.indexOf(phase);

  const showTrunk = true;
  const showLeaves = idx >= 2 && idx !== 10; // vegetative+ except pure dormancy
  const leafFade = idx === 9 ? 0.55 : idx === 0 || idx === 10 ? 0 : 1;
  const showFlowers = phase === 'flowering';
  const showBee = phase === 'flowering';
  const showSet = phase === 'fruit_set';
  const showGreenBunch = phase === 'berry' || phase === 'fruit_set';
  const showMixedBunch = phase === 'veraison';
  const showRipeBunch = phase === 'ripening' || phase === 'harvest';
  const showBudOnly = phase === 'dormant_bud' || phase === 'bud_break';
  const sparseCanopy = phase === 'post_harvest';

  // Shared leaf path (lobed grape leaf)
  const leafPath = (sx: number, sy: number, sc: number, rot: number, dark = false) => (
    <g transform={`translate(${sx},${sy}) rotate(${rot}) scale(${sc})`}>
      <path
        d="M0,0 C-7,-1 -12,-6 -11,-14 C-10,-20 -5,-18 0,-12 C2,-18 7,-21 11,-15 C13,-8 8,-2 0,0 Z"
        fill={dark ? `url(#${uid}-leafD)` : `url(#${uid}-leaf)`}
        opacity={leafFade}
      />
      <path d="M0,0 L0,-13" stroke="#1b5e20" strokeWidth="0.55" fill="none" opacity={0.55 * leafFade} />
    </g>
  );

  const bunch = (
    bx: number,
    by: number,
    mode: 'green' | 'mixed' | 'ripe',
    scale = 1,
  ) => {
    const nodes = [];
    for (let row = 0; row < 6; row++) {
      const t = row / 5;
      const count = Math.max(1, 6 - Math.floor(t * 4));
      const ring = (11 - t * 6.5) * scale;
      for (let k = 0; k < count; k++) {
        const a = (k / count) * Math.PI * 2 + row * 0.35;
        let fill = `url(#${uid}-berryG)`;
        if (mode === 'ripe') fill = `url(#${uid}-berryR)`;
        if (mode === 'mixed') fill = (k + row) % 3 === 0 ? `url(#${uid}-berryG)` : `url(#${uid}-berryM)`;
        nodes.push(
          <ellipse
            key={`${bx}-${row}-${k}`}
            cx={bx + Math.cos(a) * ring}
            cy={by + row * 7.2 * scale}
            rx={(2.6 - t * 0.3) * scale}
            ry={(3.5 - t * 0.35) * scale}
            fill={fill}
            stroke="rgba(0,0,0,0.2)"
            strokeWidth="0.25"
          />,
        );
      }
    }
    return (
      <g>
        <line x1={bx} y1={by - 3} x2={bx} y2={by + 2} stroke="#5d4037" strokeWidth="1.4" />
        {nodes}
      </g>
    );
  };

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} className="block rounded-lg">
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#243d2e" />
          <stop offset="100%" stopColor="#0c1812" />
        </linearGradient>
        <radialGradient id={`${uid}-glow`} cx="50%" cy="40%" r="50%">
          <stop offset="0%" stopColor="#4a7c59" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0c1812" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-soil`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5d4037" />
          <stop offset="100%" stopColor="#3e2723" />
        </linearGradient>
        <linearGradient id={`${uid}-trunk`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4e342e" />
          <stop offset="45%" stopColor="#8d6e63" />
          <stop offset="100%" stopColor="#3e2723" />
        </linearGradient>
        <linearGradient id={`${uid}-leaf`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a5d6a7" />
          <stop offset="40%" stopColor="#66bb6a" />
          <stop offset="100%" stopColor="#2e7d32" />
        </linearGradient>
        <linearGradient id={`${uid}-leafD`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#81c784" />
          <stop offset="100%" stopColor="#1b5e20" />
        </linearGradient>
        <radialGradient id={`${uid}-berryG`} cx="30%" cy="28%" r="70%">
          <stop offset="0%" stopColor="#f0f4c3" />
          <stop offset="45%" stopColor="#c5e1a5" />
          <stop offset="100%" stopColor="#7cb342" />
        </radialGradient>
        <radialGradient id={`${uid}-berryM`} cx="30%" cy="28%" r="70%">
          <stop offset="0%" stopColor={mid} />
          <stop offset="100%" stopColor={ripe} />
        </radialGradient>
        <radialGradient id={`${uid}-berryR`} cx="30%" cy="28%" r="72%">
          <stop offset="0%" stopColor={mid} />
          <stop offset="40%" stopColor={ripe} />
          <stop offset="100%" stopColor="#12080f" />
        </radialGradient>
        <linearGradient id={`${uid}-mulch`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#546e7a" />
          <stop offset="100%" stopColor="#37474f" />
        </linearGradient>
      </defs>

      <rect width={w} height={h} rx="10" fill={`url(#${uid}-bg)`} />
      <rect width={w} height={h} rx="10" fill={`url(#${uid}-glow)`} />

      {/* soil + mulch bed */}
      <ellipse cx={w * 0.5} cy={h * 0.92} rx={w * 0.42} ry={h * 0.06} fill={`url(#${uid}-soil)`} opacity="0.85" />
      <rect x={w * 0.22} y={h * 0.88} width={w * 0.56} height={h * 0.035} rx="2" fill={`url(#${uid}-mulch)`} />

      {/* trellis post + wire */}
      <rect x={w * 0.48} y={h * 0.28} width={w * 0.035} height={h * 0.6} rx="1.5" fill={`url(#${uid}-trunk)`} />
      <line x1={w * 0.18} y1={h * 0.34} x2={w * 0.82} y2={h * 0.34} stroke="#90a4ae" strokeWidth="1.2" opacity="0.75" />
      <line x1={w * 0.2} y1={h * 0.42} x2={w * 0.8} y2={h * 0.42} stroke="#90a4ae" strokeWidth="1" opacity="0.55" />

      {/* trunk climbing post */}
      {showTrunk && (
        <path
          d={`M${w * 0.5} ${h * 0.88} C${w * 0.5} ${h * 0.7} ${w * 0.49} ${h * 0.5} ${w * 0.5} ${h * 0.36}`}
          stroke={`url(#${uid}-trunk)`}
          strokeWidth={wide ? 7 : 5}
          fill="none"
          strokeLinecap="round"
        />
      )}

      {/* dormant / bud break detail on cane */}
      {showBudOnly && (
        <g>
          <path
            d={`M${w * 0.5} ${h * 0.5} Q${w * 0.62} ${h * 0.42} ${w * 0.7} ${h * 0.36}`}
            stroke={`url(#${uid}-trunk)`}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />
          <ellipse
            cx={w * 0.72}
            cy={h * 0.34}
            rx={phase === 'bud_break' ? 7 : 6}
            ry={phase === 'bud_break' ? 9 : 8}
            fill="#a1887f"
            transform={`rotate(-20 ${w * 0.72} ${h * 0.34})`}
          />
          {phase === 'bud_break' && (
            <>
              <ellipse cx={w * 0.71} cy={h * 0.3} rx="4.5" ry="7" fill="#81c784" transform={`rotate(-28 ${w * 0.71} ${h * 0.3})`} />
              <ellipse cx={w * 0.7} cy={h * 0.27} rx="2.8" ry="4.5" fill="#c5e1a5" transform={`rotate(-32 ${w * 0.7} ${h * 0.27})`} />
            </>
          )}
        </g>
      )}

      {/* cordons */}
      {(showLeaves || showFlowers || showGreenBunch || showRipeBunch || showMixedBunch) && (
        <>
          <path d={`M${w * 0.5} ${h * 0.38} Q${w * 0.32} ${h * 0.36} ${w * 0.2} ${h * 0.4}`} stroke="#5d4037" strokeWidth="2.4" fill="none" />
          <path d={`M${w * 0.5} ${h * 0.38} Q${w * 0.68} ${h * 0.36} ${w * 0.8} ${h * 0.4}`} stroke="#5d4037" strokeWidth="2.4" fill="none" />
        </>
      )}

      {/* full canopy leaves — whole plant from vegetative onward */}
      {showLeaves && (
        <g opacity={sparseCanopy ? 0.5 : 1}>
          {leafPath(w * 0.22, h * 0.4, wide ? 1.35 : 1.05, -40)}
          {leafPath(w * 0.3, h * 0.36, wide ? 1.25 : 0.95, -15, true)}
          {leafPath(w * 0.38, h * 0.32, wide ? 1.2 : 0.9, 10)}
          {leafPath(w * 0.5, h * 0.28, wide ? 1.3 : 1.0, -5)}
          {leafPath(w * 0.62, h * 0.32, wide ? 1.2 : 0.9, -12, true)}
          {leafPath(w * 0.7, h * 0.36, wide ? 1.25 : 0.95, 20)}
          {leafPath(w * 0.78, h * 0.4, wide ? 1.3 : 1.0, 38)}
          {!sparseCanopy && (
            <>
              {leafPath(w * 0.26, h * 0.48, wide ? 1.1 : 0.85, -50, true)}
              {leafPath(w * 0.74, h * 0.48, wide ? 1.1 : 0.85, 48)}
              {leafPath(w * 0.44, h * 0.4, wide ? 1.0 : 0.8, 8)}
              {leafPath(w * 0.56, h * 0.4, wide ? 1.0 : 0.8, -8, true)}
            </>
          )}
        </g>
      )}

      {/* flowering — clusters under canopy + bee */}
      {showFlowers && (
        <g>
          {[
            [w * 0.34, h * 0.48],
            [w * 0.5, h * 0.46],
            [w * 0.66, h * 0.48],
          ].map(([cx, cy], i) => (
            <g key={i}>
              <line x1={cx} y1={cy - 8} x2={cx} y2={cy} stroke="#9ccc65" strokeWidth="1.2" />
              {Array.from({ length: 9 }).map((__, k) => {
                const a = (k / 9) * Math.PI * 2;
                const r = 5 + (k % 3);
                return (
                  <g key={k} transform={`translate(${cx + Math.cos(a) * r * 0.7},${cy + Math.sin(a) * r * 0.45})`}>
                    <circle r="2.1" fill="#f0f4c3" />
                    <circle r="0.85" fill="#fffde7" />
                    <circle cx="-0.9" cy="-1" r="0.45" fill="#ffe082" />
                    <circle cx="0.9" cy="-0.9" r="0.45" fill="#ffe082" />
                  </g>
                );
              })}
            </g>
          ))}
          {showBee && (
            <g transform={`translate(${w * 0.72},${h * 0.44})`}>
              <ellipse cx="0" cy="0" rx="7" ry="4.2" fill="#f9a825" />
              <path d="M-5 -1.2 H5 M-5 1.2 H5" stroke="#3e2723" strokeWidth="1.1" />
              <circle cx="-6.5" cy="0" r="2.4" fill="#212121" />
              <ellipse cx="-2" cy="-4.5" rx="3.5" ry="2" fill="#bbdefb" opacity="0.9" />
              <ellipse cx="2.5" cy="-4.2" rx="3.2" ry="1.8" fill="#bbdefb" opacity="0.85" />
            </g>
          )}
        </g>
      )}

      {/* fruit set / green / mixed / ripe bunches hanging on whole plant */}
      {showSet && (
        <g>
          {bunch(w * 0.36, h * 0.5, 'green', 0.55)}
          {bunch(w * 0.52, h * 0.48, 'green', 0.5)}
          {bunch(w * 0.66, h * 0.5, 'green', 0.55)}
        </g>
      )}
      {phase === 'berry' && (
        <g>
          {bunch(w * 0.34, h * 0.48, 'green', 0.85)}
          {bunch(w * 0.5, h * 0.46, 'green', 0.9)}
          {bunch(w * 0.66, h * 0.48, 'green', 0.8)}
        </g>
      )}
      {showMixedBunch && (
        <g>
          {bunch(w * 0.34, h * 0.47, 'mixed', 0.95)}
          {bunch(w * 0.5, h * 0.45, 'mixed', 1)}
          {bunch(w * 0.66, h * 0.47, 'mixed', 0.9)}
        </g>
      )}
      {showRipeBunch && (
        <g>
          {bunch(w * 0.33, h * 0.46, 'ripe', 1)}
          {bunch(w * 0.5, h * 0.44, 'ripe', 1.05)}
          {bunch(w * 0.67, h * 0.46, 'ripe', 0.95)}
        </g>
      )}

      {/* dormancy: bare structure only */}
      {phase === 'dormancy' && (
        <g opacity="0.9">
          <path d={`M${w * 0.5} ${h * 0.4} Q${w * 0.3} ${h * 0.38} ${w * 0.22} ${h * 0.45}`} stroke="#5d4037" strokeWidth="2.2" fill="none" />
          <path d={`M${w * 0.5} ${h * 0.4} Q${w * 0.7} ${h * 0.38} ${w * 0.78} ${h * 0.45}`} stroke="#5d4037" strokeWidth="2.2" fill="none" />
          {Array.from({ length: 8 }).map((_, i) => (
            <circle key={i} cx={(i * 19 + 11) % w} cy={(i * 11 + 8) % (h * 0.55)} r="1.1" fill="#eceff1" opacity="0.4" />
          ))}
        </g>
      )}

      {/* phase label chip */}
      <rect x="6" y="6" width={wide ? 120 : 86} height="16" rx="4" fill="rgba(0,0,0,0.45)" />
      <text x="12" y="17" fill="#a7f3d0" fontSize="9" fontWeight="600">
        {phase.replace(/_/g, ' ')}
      </text>
    </svg>
  );
}

function YieldImpactChart({ phases, activeId }: { phases: PhaseMeta[]; activeId: PhaseId }) {
  const max = 100;
  const w = 320;
  const h = 100;
  const pad = 8;
  const pts = phases.map((s, i) => {
    const x = pad + (i / (phases.length - 1)) * (w - pad * 2);
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
          r={p.s.id === activeId ? 5 : 2.5}
          fill={p.s.id === activeId ? '#34d399' : '#1e2d40'}
          stroke="#34d399"
          strokeWidth="1.2"
        />
      ))}
      {active && (
        <g>
          <rect x={active.x - 36} y={active.y - 22} width="72" height="16" rx="4" fill="#064e3b" stroke="#10b981" strokeWidth="0.8" />
          <text x={active.x} y={active.y - 11} textAnchor="middle" fill="#6ee7b7" fontSize="8" fontWeight="600">
            High impact
          </text>
        </g>
      )}
    </svg>
  );
}

function simToPhase(stage: LifecycleStage): PhaseId {
  const map: Partial<Record<LifecycleStage, PhaseId>> = {
    germination: 'bud_break',
    vegetative: 'vegetative',
    flowering: 'flowering',
    fruit_set: 'fruit_set',
    berry: 'berry',
    ripening: 'ripening',
    harvest: 'harvest',
  };
  return map[stage] || 'vegetative';
}





/** Twin-linked 3D vine (v0 VineScene) + phenology track */
function Stage3DView({
  phaseId,
  berryHex,
  midHex,
  progress,
  stageLabel,
}: {
  phaseId: PhaseId;
  berryHex: number;
  midHex: number;
  progress: number;
  stageLabel: string;
}) {
  const track: { id: PhaseId; label: string }[] = [
    { id: 'dormant_bud', label: 'Dormant Bud' },
    { id: 'bud_break', label: 'Bud Break' },
    { id: 'vegetative', label: 'Shoot Growth' },
    { id: 'flowering', label: 'Flowering' },
    { id: 'fruit_set', label: 'Fruit Set' },
    { id: 'berry', label: 'Berry Growth' },
    { id: 'veraison', label: 'Veraison' },
    { id: 'ripening', label: 'Ripening' },
    { id: 'harvest', label: 'Harvest' },
    { id: 'post_harvest', label: 'Post Harvest' },
    { id: 'dormancy', label: 'Dormancy' },
  ];
  const activeIdx = Math.max(0, track.findIndex((t) => t.id === phaseId));
  const pct = Math.round((progress || 0) * 100);

  return (
    <div className="relative w-full h-full min-h-[340px] rounded-2xl overflow-hidden border border-emerald-900/40 bg-[#0c1812] flex flex-col">
      <div className="relative flex-1 min-h-[280px]">
        <Suspense
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-[#0c1812]">
              <div className="flex flex-col items-center gap-2">
                <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-400/40 border-t-emerald-400" />
                <span className="text-[10px] uppercase tracking-wider text-emerald-300/70">Loading 3D vine</span>
              </div>
            </div>
          }
        >
          <VineScene phase={phaseId as VinePhase} ripeHex={berryHex} midHex={midHex} />
        </Suspense>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0c1812] via-transparent to-transparent" />

        <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-black/50 backdrop-blur px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">Live 3D · Twin stage</span>
        </div>
        <div className="pointer-events-none absolute top-3 right-3 rounded-full border border-white/10 bg-black/40 px-2.5 py-1 text-[9px] uppercase tracking-wider text-slate-300/80">
          Drag to rotate
        </div>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-end justify-between gap-2">
            <div>
              <div className="text-[9px] uppercase tracking-[0.2em] text-emerald-300/80">
                Stage {activeIdx + 1} / {track.length}
              </div>
              <div className="text-lg font-bold text-white drop-shadow-lg">{stageLabel}</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-wider text-slate-300/70">Progress</div>
              <div className="text-sm font-bold text-emerald-300">{pct}%</div>
            </div>
          </div>
          <div className="mt-1.5 h-1.5 rounded-full bg-black/50 overflow-hidden border border-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-lime-400 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Phenology track — current = Digital Twin sim.stage (not selectable) */}
      <div className="shrink-0 flex gap-1.5 overflow-x-auto p-2 bg-black/40 border-t border-emerald-900/40">
        {track.map((t, i) => (
          <div
            key={t.id}
            title={`${i + 1}. ${t.label}`}
            className={`flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 transition ${
              i === activeIdx
                ? 'border-emerald-400 bg-emerald-500/15 ring-1 ring-emerald-400/50'
                : 'border-white/10 opacity-60'
            }`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold ${
                i === activeIdx ? 'bg-emerald-400 text-emerald-950' : 'bg-white/15 text-slate-200'
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`text-[9px] font-semibold whitespace-nowrap ${
                i === activeIdx ? 'text-emerald-200' : 'text-slate-300'
              }`}
            >
              {t.label}
            </span>
            {i === activeIdx && (
              <span className="text-[8px] font-bold uppercase text-emerald-400">Live</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


type FieldMeasure = {
  areaHa?: string;
  yieldTPerHa?: string;
  densityPerHa?: string;
  irrigationMm?: string;
  canopyCm?: string;
  shootCount?: string;
  clusterCount?: string;
  brix?: string;
  notes?: string;
};

const emptyMeasure = (): FieldMeasure => ({
  areaHa: '',
  yieldTPerHa: '',
  densityPerHa: '',
  irrigationMm: '',
  notes: '',
});

export default function LifecyclePanel({
  sim,
  varietyId = 'thompson',
  soilId = 'alluvial',
  fieldId,
  fieldName,
  primaryCropId = 'grape',
  primaryCropLabel,
  fields: fieldsProp,
}: {
  sim: SimState;
  varietyId?: GrapeVarietyId | string;
  soilId?: SoilClassId | string;
  fieldId?: string;
  fieldName?: string;
  primaryCropId?: string;
  primaryCropLabel?: string;
  fields?: FieldInfo[];
}) {
  const fields = fieldsProp?.length ? fieldsProp : FIELDS;
  const isGrapeCrop =
    !primaryCropId ||
    primaryCropId === 'grape' ||
    /grape|vine|raisin/i.test(primaryCropId) ||
    /grape|vine|raisin/i.test(primaryCropLabel || '');

  const variety = getGrapeVariety(varietyId);
  const soil = getSoilClass(soilId);
  const fieldMeta = fieldId ? fields.find((f) => f.id === fieldId) : undefined;
  const displayField = fieldName || fieldMeta?.name || 'Selected field';
  const fieldKey = fieldId || displayField || 'default';

  const activePhaseId = simToPhase(sim.stage);
  const twinStageLabel = STAGE_RANGES.find((s) => s.id === sim.stage)?.label || sim.stage;

  const [showStageList, setShowStageList] = useState(true);
  const [measures, setMeasures] = useState<Record<string, FieldMeasure>>({});

  // Farmer enters measurements in Settings — Lifecycle only displays them
  const reloadMeasures = () => {
    try {
      const raw = localStorage.getItem('agriverse-lifecycle-measures-v1');
      if (raw) setMeasures(JSON.parse(raw));
      else setMeasures({});
    } catch {
      /* ignore */
    }
  };
  useEffect(() => {
    reloadMeasures();
    const onSaved = () => reloadMeasures();
    window.addEventListener('agriverse-field-measures-saved', onSaved);
    window.addEventListener('storage', onSaved);
    return () => {
      window.removeEventListener('agriverse-field-measures-saved', onSaved);
      window.removeEventListener('storage', onSaved);
    };
  }, []);

  const measure = measures[fieldKey] || emptyMeasure();

  if (!isGrapeCrop) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0b131e] flex items-center justify-center">
        <div className="max-w-md w-full rounded-3xl border border-amber-500/25 bg-[#0c121c] p-6 text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-2xl">
            🍇
          </div>
          <h2 className="text-lg font-bold text-white">Grape lifecycle only</h2>
          <p className="text-[12px] text-slate-400 leading-relaxed">
            Phenology is modelled for <span className="text-emerald-300 font-semibold">grape</span> varieties only.
            Set primary crop to Grape in Settings to view the live Digital Twin stage for this field.
          </p>
          <div className="text-[10px] text-slate-600 pt-1">
            Field {displayField} · soil {soil.shortLabel}
          </div>
        </div>
      </div>
    );
  }

  const soilFit = variety.soilScore[(soil.id as SoilClassId)] ?? 50;
  const yieldAdj = Math.round(variety.baseYieldTPerAc * (0.75 + (soilFit / 100) * 0.35) * 10) / 10;
  const forecast =
    typeof sim.yieldTons === 'number' && sim.yieldTons > 0
      ? Math.round(sim.yieldTons * (0.9 + (soilFit / 100) * 0.2) * 10) / 10
      : yieldAdj;

  const cycleScale = variety.cycleDays / 150;
  const phaseDaysLabel = (raw: string) => {
    if (!raw.startsWith('Day')) return raw;
    return raw.replace(/(\d+)/g, (m) => String(Math.round(Number(m) * cycleScale)));
  };

  const phase = useMemo(
    () => PHASES.find((s) => s.id === activePhaseId) ?? PHASES[3],
    [activePhaseId],
  );
  const nextPhase = PHASES.find((s) => s.num === phase.num + 1);

  const reqOverrides = useMemo(() => {
    const moistureNote =
      soil.waterHolding === 'Very high'
        ? 'Shorter cycles — soil holds well'
        : soil.waterHolding === 'Low to moderate'
          ? 'More frequent light irrigation'
          : phase.requirements.moisture;
    return {
      ...phase.requirements,
      moisture: moistureNote,
      ph: soil.phRange || phase.requirements.ph,
      irrigation: soil.drainage?.toLowerCase().includes('slow')
        ? 'Avoid over-irrigation; short drip pulses'
        : phase.requirements.irrigation,
    };
  }, [phase, soil]);

  const stageProgressPct = Math.round((sim.stageProgress || 0) * 100);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#0b131e]">
      <div className="p-3 md:p-4 space-y-3">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-emerald-300 tracking-wide">GRAPE LIFE CYCLE</h2>
            <p className="text-[11px] text-slate-400">
              Live twin stage · <span className="text-violet-300 font-semibold">{variety.label}</span>
              {' · '}{variety.color === 'coloured' ? 'Coloured' : 'White'} · {variety.market}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Field <span className="text-emerald-300 font-semibold">{displayField}</span>
              {' · '}Soil <span className="text-amber-200/90 font-semibold">{soil.shortLabel}</span>
              {' · '}Fit{' '}
              <span className={soilFit >= 75 ? 'text-emerald-400 font-semibold' : soilFit >= 55 ? 'text-amber-400 font-semibold' : 'text-rose-400 font-semibold'}>
                {soilFit}/100
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-emerald-200 font-semibold">{phase.label}</span>
              <span className="text-[10px] text-slate-500">Day {sim.day}</span>
              <span className="text-[10px] text-slate-500">{stageProgressPct}%</span>
            </div>
            <button
              type="button"
              onClick={() => setShowStageList((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1e2d40] bg-[#121a27] px-2.5 py-1.5 text-[11px] text-slate-300 hover:border-emerald-500/40 hover:text-emerald-200 transition"
              title={showStageList ? 'Hide stage list' : 'Show stage list'}
            >
              {showStageList ? <EyeOff size={14} /> : <Eye size={14} />}
              {showStageList ? 'Hide stages' : 'Show stages'}
            </button>
          </div>
        </div>

        {/* Metrics strip */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {[
            ['Field', displayField],
            ['Variety', variety.label],
            ['Cycle', `${variety.cycleDays} d`],
            ['Soil-adj. yield', `${yieldAdj} t/ac`],
            ['Brix target', variety.brixTarget],
            ['Forecast', `${forecast} t/ac`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-[#1e2d40] bg-[#0f1722] px-3 py-2">
              <div className="text-[9px] uppercase text-slate-500">{k}</div>
              <div className="text-[12px] font-semibold text-white truncate">{v}</div>
            </div>
          ))}
        </div>

        {/* Main: 3D + optional side stage list */}
        <div className={`grid gap-3 ${showStageList ? 'lg:grid-cols-12' : 'grid-cols-1'}`}>
          <div className={showStageList ? 'lg:col-span-8' : ''}>
            <div className="h-[420px] md:h-[480px]">
              <Stage3DView
                phaseId={phase.id}
                berryHex={variety.berryHex}
                midHex={variety.berryMidHex}
                progress={sim.stageProgress || 0}
                stageLabel={phase.label}
              />
            </div>
            <div className="mt-2 rounded-xl border border-[#1e2d40] bg-[#121a27] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <h3 className="text-base font-bold text-white">
                  {phase.num}. {phase.label}
                  <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">Live</span>
                </h3>
                <span className="text-[11px] text-slate-500">
                  Twin: {twinStageLabel} · {phaseDaysLabel(phase.days)}
                </span>
              </div>
              <p className="text-[12px] text-slate-300 leading-relaxed">{phase.longDesc}</p>
              {nextPhase && (
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  Next <ChevronRight size={12} className="text-emerald-400" />
                  <span className="text-emerald-300">{nextPhase.label}</span>
                </p>
              )}
              {/* Progress bar */}
              <div className="mt-2 h-1.5 rounded-full bg-[#0b131e] overflow-hidden border border-[#1e2d40]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-lime-400 transition-all"
                  style={{ width: `${stageProgressPct}%` }}
                />
              </div>
            </div>
          </div>

          {showStageList && (
            <div className="lg:col-span-4 rounded-2xl border border-[#1e2d40] bg-[#0f1722] flex flex-col max-h-[480px]">
              <div className="px-3 py-2 border-b border-[#1e2d40] flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Stages · overview
                </div>
                <button
                  type="button"
                  onClick={() => setShowStageList(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/5"
                  title="Hide panel"
                >
                  <EyeOff size={14} />
                </button>
              </div>
              <div className="overflow-y-auto flex-1 p-2 space-y-1">
                {PHASES.map((s) => {
                  const active = s.id === activePhaseId;
                  return (
                    <div
                      key={s.id}
                      className={`rounded-xl border px-2.5 py-2 transition ${
                        active
                          ? 'border-emerald-400/60 bg-emerald-500/10 shadow-[0_0_16px_rgba(16,185,129,0.12)]'
                          : 'border-transparent bg-[#121a27]/80 opacity-70'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold ${active ? 'text-emerald-300' : 'text-slate-600'}`}>
                          {s.num}
                        </span>
                        <span className={`text-[12px] font-semibold ${active ? 'text-white' : 'text-slate-400'}`}>
                          {s.label}
                        </span>
                        {active && (
                          <span className="ml-auto text-[8px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-emerald-500 text-white">
                            Live
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 leading-snug mt-0.5 pl-5">{s.shortDesc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Field measurements + requirements */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                    <div className="lg:col-span-5 rounded-2xl border border-[#1e2d40] bg-[#121a27] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                <Ruler size={12} className="text-sky-400" />
                Field measurements · {displayField}
              </div>
              <span className="text-[9px] text-slate-500">From Settings</span>
            </div>
            <p className="text-[10px] text-slate-500">
              Entered by the farmer in <span className="text-sky-300 font-semibold">Settings → Field measurements</span>. Values are per field and paired with the live twin stage.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['Area (ha)', measure.areaHa || measure.canopyCm],
                ['Yield (t/ha)', measure.yieldTPerHa || measure.shootCount],
                ['Density (/ha)', measure.densityPerHa || measure.clusterCount],
                ['Irrigation (mm)', measure.irrigationMm || measure.brix],
              ].map(([label, val]) => (
                <div key={label} className="rounded-lg border border-[#1e2d40] bg-[#0b131e] px-2 py-1.5">
                  <div className="text-[9px] uppercase text-slate-500">{label}</div>
                  <div className="text-[13px] font-semibold text-white">{val || '—'}</div>
                </div>
              ))}
            </div>
            <div className="rounded-lg border border-[#1e2d40] bg-[#0b131e] px-2 py-1.5">
              <div className="text-[9px] uppercase text-slate-500">Notes</div>
              <div className="text-[11px] text-slate-300 min-h-[2rem]">{measure.notes || 'No notes yet — add them in Settings.'}</div>
            </div>
            {(measure.areaHa || measure.yieldTPerHa || measure.densityPerHa || measure.irrigationMm) ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-2 py-1.5 text-[10px] text-emerald-100/90">
                {displayField} @ {phase.label}:
                {measure.areaHa ? ` ${measure.areaHa} ha` : ''}
                {measure.yieldTPerHa ? ` · ${measure.yieldTPerHa} t/ha` : ''}
                {measure.densityPerHa ? ` · ${measure.densityPerHa} plants/ha` : ''}
                {measure.irrigationMm ? ` · ${measure.irrigationMm} mm` : ''}
              </div>
            ) : (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-2 py-1.5 text-[10px] text-amber-100/80">
                No hectare measurements for this field yet. Enter them in Settings → Farm profile, then Save.
              </div>
            )}
          </div>

                    <div className="lg:col-span-4 rounded-2xl border border-[#1e2d40] bg-[#121a27] p-3 space-y-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1 font-bold">
              <Sun size={12} className="text-amber-400" /> Requirements · {soil.shortLabel}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {Object.entries(reqOverrides).map(([k, v]) => (
                <div key={k} className="rounded-lg bg-[#0f1722] border border-[#1e2d40] px-2 py-1.5">
                  <div className="text-[9px] text-slate-500 capitalize">{k}</div>
                  <div className="text-white font-medium">{v}</div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Risks</div>
              <div className="space-y-1">
                {phase.risks.map((r) => (
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
          </div>

          <div className="lg:col-span-3 rounded-2xl border border-[#1e2d40] bg-[#121a27] p-3 space-y-2 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5 text-slate-500 uppercase text-[10px] font-bold">
              <Calendar size={12} /> Twin linkage
            </div>
            <div className="flex justify-between"><span>Sim day</span><span className="text-white font-semibold">{sim.day}</span></div>
            <div className="flex justify-between"><span>Sim stage</span><span className="text-emerald-300 font-semibold">{twinStageLabel}</span></div>
            <div className="flex justify-between"><span>Variety</span><span className="text-violet-300 font-semibold">{variety.label}</span></div>
            <div className="flex justify-between">
              <span>Berry</span>
              <span className="font-semibold" style={{ color: hexCss(variety.berryHex) }}>{variety.color}</span>
            </div>
            <div className="pt-1">
              <div className="text-[10px] uppercase text-slate-500 mb-1">Recommendations</div>
              <ul className="space-y-1">
                {phase.recommendations.slice(0, 3).map((t) => (
                  <li key={t} className="flex gap-1.5 text-[10px] text-slate-300">
                    <CheckCircle2 size={11} className="text-emerald-400 shrink-0 mt-0.5" />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
