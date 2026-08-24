import { useMemo, useState } from 'react';
import {
  Thermometer, Droplets, Sun, Leaf, CloudRain, FlaskConical,
  CheckCircle2, ChevronRight, Calendar,
} from 'lucide-react';
import type { SimState, LifecycleStage, GrapeVarietyId } from './simulation';
import { STAGE_RANGES, getGrapeVariety } from './simulation';

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

export default function LifecyclePanel({
  sim,
  varietyId = 'thompson',
}: {
  sim: SimState;
  varietyId?: GrapeVarietyId | string;
}) {
  const variety = getGrapeVariety(varietyId);
  const fromSim = simToPhase(sim.stage);
  const [selectedId, setSelectedId] = useState<PhaseId>(fromSim);

  const phase = useMemo(
    () => PHASES.find((s) => s.id === selectedId) ?? PHASES[3],
    [selectedId],
  );

  const nextPhase = PHASES.find((s) => s.num === phase.num + 1);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#0b131e] space-y-4">
      <div className="text-center">
        <h2 className="text-xl font-bold text-emerald-300 tracking-wide">GRAPE LIFE CYCLE</h2>
        <p className="text-[12px] text-slate-400">
          From Bud to Bunch · <span className="text-violet-300 font-semibold">{variety.label}</span>
          {' · '}{variety.color === 'coloured' ? 'Coloured' : 'White'} · {variety.market}
        </p>
      </div>

      {/* Variety metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        {[
          ['Cycle', `${variety.cycleDays} days`],
          ['Base yield', `${variety.baseYieldTPerAc} t/ac`],
          ['Brix target', variety.brixTarget],
          ['Berry size', `≤ ${variety.maxBerryMm} mm`],
          ['Forecast', `${sim.yieldTons} t/ac`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-xl border border-[#1e2d40] bg-[#0f1722] px-3 py-2">
            <div className="text-[9px] uppercase text-slate-500">{k}</div>
            <div className="text-[12px] font-semibold text-white">{v}</div>
          </div>
        ))}
      </div>

      {/* 11-phase grid like reference */}
      <div className="bg-[#0a1410] rounded-2xl border border-emerald-900/40 p-3 md:p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {PHASES.slice(0, 6).map((s) => {
            const active = s.id === selectedId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={`text-left rounded-xl border overflow-hidden transition ${
                  active
                    ? 'border-emerald-400 ring-2 ring-emerald-500/40'
                    : 'border-[#1e2d40] hover:border-emerald-700/50'
                }`}
              >
                <div className="h-[112px] bg-black/40">
                  <StageArt phase={s.id} ripeHex={variety.berryHex} midHex={variety.berryMidHex} />
                </div>
                <div className="px-2 py-1.5 bg-[#0f1a14]">
                  <div className="text-[10px] font-bold text-emerald-300">
                    {s.num}. {s.label}
                  </div>
                  <p className="text-[9px] text-slate-400 leading-snug mt-0.5 line-clamp-2">{s.shortDesc}</p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-2.5">
          {PHASES.slice(6).map((s) => {
            const active = s.id === selectedId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                className={`text-left rounded-xl border overflow-hidden transition ${
                  active
                    ? 'border-emerald-400 ring-2 ring-emerald-500/40'
                    : 'border-[#1e2d40] hover:border-emerald-700/50'
                }`}
              >
                <div className="h-[112px] bg-black/40">
                  <StageArt phase={s.id} ripeHex={variety.berryHex} midHex={variety.berryMidHex} />
                </div>
                <div className="px-2 py-1.5 bg-[#0f1a14]">
                  <div className="text-[10px] font-bold text-emerald-300">
                    {s.num}. {s.label}
                  </div>
                  <p className="text-[9px] text-slate-400 leading-snug mt-0.5 line-clamp-2">{s.shortDesc}</p>
                </div>
              </button>
            );
          })}
          {/* Key highlights card */}
          <div className="rounded-xl border border-[#1e2d40] bg-[#0f1a14] p-3 text-[10px] text-slate-300 space-y-1.5">
            <div className="text-emerald-300 font-bold text-[11px]">Key Highlights</div>
            <p>Full cycle ~8–12 months (varies with variety & climate).</p>
            <p>Pollination is mainly by insects (bees) and wind — <span className="text-amber-200 font-semibold">entomophily</span>.</p>
            <p>Healthy pollination → better set, bigger berries, higher yield.</p>
            <p className="text-violet-300">Now viewing: {variety.label}</p>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4 bg-[#16202d] rounded-2xl border border-[#1e2d40] p-4 space-y-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500">Selected phase</div>
          <div className="rounded-xl overflow-hidden border border-[#1e2d40] h-[168px]">
            <StageArt phase={phase.id} ripeHex={variety.berryHex} midHex={variety.berryMidHex} wide />
          </div>
          <h3 className="text-lg font-bold text-white">
            {phase.num}. {phase.label}
          </h3>
          <p className="text-[12px] text-slate-300 leading-relaxed">{phase.longDesc}</p>
          {phase.id === 'flowering' && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100 leading-snug">
              <span className="font-bold text-amber-300">Entomophily</span> — pollination through insects
              (especially bees). Pollen moves from <strong>anther</strong> (male) to <strong>stigma</strong> (female);
              wind also helps.
            </div>
          )}
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-500">Timing</span>
            <span className="text-white font-medium">{phase.days}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-slate-500">Next</span>
            <span className="text-emerald-300 font-medium flex items-center gap-0.5">
              {nextPhase ? nextPhase.label : 'Cycle complete'} <ChevronRight size={12} />
            </span>
          </div>
        </div>

        <div className="lg:col-span-5 bg-[#16202d] rounded-2xl border border-[#1e2d40] p-4 space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
              <Sun size={12} className="text-amber-400" /> Requirements
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {Object.entries(phase.requirements).map(([k, v]) => (
                <div key={k} className="rounded-lg bg-[#0f1722] border border-[#1e2d40] px-2 py-1.5">
                  <div className="text-[9px] text-slate-500 capitalize">{k}</div>
                  <div className="text-white font-medium">{v}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Risks</div>
            <div className="space-y-1.5">
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
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Recommendations</div>
            <ul className="space-y-1">
              {phase.recommendations.map((t) => (
                <li key={t} className="flex gap-1.5 text-[11px] text-slate-300">
                  <CheckCircle2 size={12} className="text-emerald-400 shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-4">
          <div className="bg-[#16202d] rounded-2xl border border-[#1e2d40] p-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Stage impact on yield</div>
            <YieldImpactChart phases={PHASES} activeId={phase.id} />
          </div>
          <div className="bg-[#16202d] rounded-2xl border border-[#1e2d40] p-4 text-[11px] text-slate-300 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-500 uppercase text-[10px]">
              <Calendar size={12} /> Live simulation
            </div>
            <div className="flex justify-between">
              <span>Sim day</span>
              <span className="text-white font-semibold">{sim.day}</span>
            </div>
            <div className="flex justify-between">
              <span>Sim stage</span>
              <span className="text-emerald-300 font-semibold">
                {STAGE_RANGES.find((s) => s.id === sim.stage)?.label}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Variety</span>
              <span className="text-violet-300 font-semibold">{variety.label}</span>
            </div>
            <div className="flex justify-between">
              <span>Berry colour</span>
              <span className="font-semibold" style={{ color: hexCss(variety.berryHex) }}>
                {variety.color}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer summary like reference */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 rounded-2xl border border-[#1e2d40] bg-[#0f1722] p-3">
        {[
          ['Total cycle', '8 – 12 months'],
          ['Critical factor', 'Pollination & fruit set'],
          ['Needs', 'Sunlight · Water · Nutrients'],
          ['Outcome', 'Healthy vines · Quality grapes'],
        ].map(([k, v]) => (
          <div key={k}>
            <div className="text-[9px] uppercase text-slate-500">{k}</div>
            <div className="text-[12px] font-semibold text-emerald-200">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
