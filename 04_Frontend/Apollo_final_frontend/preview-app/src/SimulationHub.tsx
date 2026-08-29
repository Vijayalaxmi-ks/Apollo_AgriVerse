import { useState, useMemo, useEffect, useRef, type Dispatch, type SetStateAction, type ReactNode } from 'react';
import {
  PlayCircle, PauseCircle, RotateCcw, Thermometer, Droplets, CloudRain, Sun, Wind,
  Leaf, AlertTriangle, CheckCircle2, Save,
} from 'lucide-react';
import type { SimState, EnvParams } from './simulation';
import { stepSimulation, DEFAULT_ENV, STAGE_RANGES } from './simulation';
import { useSettingsOptional } from './context/SettingsContext';

type SimNav =
  | 'control'
  | 'environment'
  | 'soil'
  | 'scenarios'
  | 'lifecycle'
  | 'results';

const NAV: { id: SimNav; label: string }[] = [
  { id: 'control', label: 'Control Panel' },
  { id: 'environment', label: 'Environment' },
  { id: 'soil', label: 'Soil & Nutrients' },
  { id: 'scenarios', label: 'Scenarios' },
  { id: 'lifecycle', label: 'Lifecycle Compare' },
  { id: 'results', label: 'Results' },
];

type ScenarioId = 'ideal' | 'stress' | 'danger';

const SCENARIOS: Record<
  ScenarioId,
  {
    title: string;
    badge: string;
    badgeClass: string;
    status: string;
    statusClass: string;
    env: Partial<EnvParams>;
    imageGrad: string;
    lifecycle: { stage: string; status: string; ok: boolean }[];
    health: number;
    growth: string;
    waterStress: string;
    nutrientStress: string;
    disease: string;
    yield: string;
    harvest: string;
    quality: string;
    actions: { text: string; urgent?: boolean }[];
    outcomeNote: string;
  }
> = {
  ideal: {
    title: 'IDEAL ENVIRONMENT',
    badge: 'Optimal Conditions',
    badgeClass: 'bg-emerald-900/40 text-emerald-300 border-emerald-500/40',
    status: 'IDEAL',
    statusClass: 'bg-emerald-600 text-white',
    env: { temperature: 26, humidity: 60, rainfall: 8, sunlight: 650, windSpeed: 12, soilMoisture: 65, nitrogen: 75, phosphorus: 70, potassium: 80 },
    imageGrad: 'from-emerald-900/80 via-lime-900/40 to-sky-950',
    lifecycle: [
      { stage: 'Germination', status: 'Optimal', ok: true },
      { stage: 'Vegetative Growth', status: 'Excellent', ok: true },
      { stage: 'Flowering', status: 'Excellent', ok: true },
      { stage: 'Fruit Set', status: 'Excellent', ok: true },
      { stage: 'Berry Development', status: 'Excellent', ok: true },
      { stage: 'Ripening', status: 'On Track', ok: true },
      { stage: 'Harvesting', status: 'On Track', ok: true },
    ],
    health: 92,
    growth: 'High',
    waterStress: 'None',
    nutrientStress: 'None',
    disease: 'Low',
    yield: '6.2',
    harvest: '22 Aug 2025',
    quality: 'Excellent',
    actions: [{ text: 'No action required. Continue current management.' }],
    outcomeNote: 'Expected high yield with premium quality under sustained ideal conditions.',
  },
  stress: {
    title: 'RECURSION REQUIRED',
    badge: 'Attention Required',
    badgeClass: 'bg-amber-900/40 text-amber-300 border-amber-500/40',
    status: 'STRESS',
    statusClass: 'bg-amber-500 text-black',
    env: { temperature: 33, humidity: 38, rainfall: 2, sunlight: 850, windSpeed: 28, soilMoisture: 35, nitrogen: 45, phosphorus: 50, potassium: 55 },
    imageGrad: 'from-amber-900/70 via-orange-950/50 to-stone-950',
    lifecycle: [
      { stage: 'Germination', status: 'Good', ok: true },
      { stage: 'Vegetative Growth', status: 'Slow', ok: false },
      { stage: 'Flowering', status: 'Delayed', ok: false },
      { stage: 'Fruit Set', status: 'Reduced', ok: false },
      { stage: 'Berry Development', status: 'Moderate', ok: false },
      { stage: 'Ripening', status: 'Delayed', ok: false },
      { stage: 'Harvesting', status: 'At Risk', ok: false },
    ],
    health: 58,
    growth: 'Moderate',
    waterStress: 'Moderate',
    nutrientStress: 'Nitrogen Low',
    disease: 'Moderate',
    yield: '3.8',
    harvest: '05 Sep 2025',
    quality: 'Average',
    actions: [
      { text: 'Increase irrigation by 20%', urgent: true },
      { text: 'Apply nitrogen fertilizer (20 kg/ha)', urgent: true },
      { text: 'Monitor soil moisture daily' },
      { text: 'Mulch maintenance recommended' },
    ],
    outcomeNote: 'Timely actions can improve yield and quality.',
  },
  danger: {
    title: 'DANGEROUS ENVIRONMENT',
    badge: 'Critical',
    badgeClass: 'bg-rose-900/50 text-rose-300 border-rose-500/40',
    status: 'DANGEROUS',
    statusClass: 'bg-rose-600 text-white',
    env: { temperature: 41, humidity: 22, rainfall: 0, sunlight: 1050, windSpeed: 35, soilMoisture: 15, nitrogen: 30, phosphorus: 28, potassium: 35 },
    imageGrad: 'from-rose-950/80 via-orange-950/60 to-stone-950',
    lifecycle: [
      { stage: 'Germination', status: 'Poor', ok: false },
      { stage: 'Vegetative Growth', status: 'Severely Affected', ok: false },
      { stage: 'Flowering', status: 'Poor', ok: false },
      { stage: 'Fruit Set', status: 'Poor', ok: false },
      { stage: 'Berry Development', status: 'Poor', ok: false },
      { stage: 'Ripening', status: 'Failed / Poor', ok: false },
      { stage: 'Harvesting', status: 'High Risk', ok: false },
    ],
    health: 22,
    growth: 'Low',
    waterStress: 'Severe',
    nutrientStress: 'Severe',
    disease: 'High',
    yield: '1.2',
    harvest: 'Unknown',
    quality: 'Poor',
    actions: [
      { text: 'Irrigate immediately', urgent: true },
      { text: 'Apply complete NPK fertilizer', urgent: true },
      { text: 'Use mulch to reduce evaporation', urgent: true },
      { text: 'Monitor for heat stress & pests', urgent: true },
    ],
    outcomeNote: 'High risk of yield loss. Immediate intervention critical.',
  },
};

const LIFECYCLE_COMPARE = [
  { name: 'Germination', days: '0–15 Days', emoji: '🌱' },
  { name: 'Vegetative Growth', days: '15–60 Days', emoji: '🌿' },
  { name: 'Flowering', days: '60–90 Days', emoji: '🌼' },
  { name: 'Fruit Set', days: '90–110 Days', emoji: '🍇' },
  { name: 'Berry Development', days: '110–140 Days', emoji: '🍇' },
  { name: 'Ripening', days: '140–170 Days', emoji: '🍇' },
  { name: 'Harvesting', days: '170+ Days', emoji: '🧺' },
];

const COMPARE_ROWS: { label: string; color: string; cells: string[] }[] = [
  {
    label: 'Ideal Environment',
    color: 'text-emerald-400',
    cells: ['Excellent', 'Excellent', 'Excellent', 'Excellent', 'Excellent', 'On Track', 'On Time, High Yield'],
  },
  {
    label: 'Recursion Required (Stress)',
    color: 'text-amber-400',
    cells: ['Good', 'Slow', 'Delayed', 'Reduced', 'Moderate', 'Delayed', 'Delayed, Low Yield'],
  },
  {
    label: 'Dangerous Environment',
    color: 'text-rose-400',
    cells: ['Poor', 'Severely Affected', 'Poor', 'Poor', 'Poor', 'Failed / Poor', 'High Risk, Very Low Yield'],
  },
];

/** Plant visual that changes by lifecycle stage + scenario health */
function TwinPlantVisual({
  stage,
  scenario,
  size = 120,
}: {
  stage: string;
  scenario: ScenarioId | 'custom';
  size?: number;
}) {
  // Colors by scenario
  const leaf =
    scenario === 'danger'
      ? { main: '#A1887F', mid: '#8D6E63', light: '#BCAAA4', wilt: true }
      : scenario === 'stress'
        ? { main: '#C0A145', mid: '#A6892D', light: '#D4B95E', wilt: true }
        : { main: '#66BB6A', mid: '#43A047', light: '#81C784', wilt: false };

  const berry =
    scenario === 'danger'
      ? '#5D4037'
      : scenario === 'stress'
        ? '#7B1FA2'
        : '#6A1B9A';

  const berryGreen =
    scenario === 'danger' ? '#8D6E63' : scenario === 'stress' ? '#9CCC65' : '#7CB342';

  const flower =
    scenario === 'danger' ? '#BCAAA4' : scenario === 'stress' ? '#FFE082' : '#FFF8DC';

  const soil = scenario === 'danger' ? '#3E2723' : scenario === 'stress' ? '#5D4037' : '#4E342E';
  const stem = scenario === 'danger' ? '#6D4C41' : '#5D4037';

  const h = size + 36;
  const w = size;

  // Growth scale by stage
  const stageScale =
    stage === 'germination' ? 0.35 :
    stage === 'vegetative' ? 0.55 :
    stage === 'flowering' ? 0.7 :
    stage === 'fruit_set' ? 0.8 :
    stage === 'berry' ? 0.9 :
    stage === 'ripening' ? 1 :
    1;

  const showFlowers = ['flowering', 'fruit_set'].includes(stage);
  const showGreenBerries = ['fruit_set', 'berry'].includes(stage);
  const showRipeBerries = ['ripening', 'harvest'].includes(stage);
  const isSprout = stage === 'germination';

  return (
    <svg width={w} height={h} viewBox="0 0 100 130" className="drop-shadow-lg transition-all duration-500">
      {/* soil mound */}
      <ellipse cx="50" cy="118" rx="38" ry="8" fill={soil} opacity="0.95" />
      <ellipse cx="50" cy="116" rx="30" ry="5" fill="#3E2723" opacity="0.5" />

      {/* roots */}
      <g stroke={stem} strokeWidth="1.4" fill="none" opacity={scenario === 'danger' ? 0.35 : 0.7}>
        <path d="M50 116 Q38 124 28 128" />
        <path d="M50 116 Q62 125 72 129" />
        <path d="M50 116 Q50 126 50 130" />
        <path d="M50 116 Q42 127 34 131" />
        <path d="M50 116 Q58 127 66 131" />
      </g>

      {isSprout ? (
        <g>
          <path d="M50 116 Q48 95 46 78" stroke={stem} strokeWidth="2.5" fill="none" />
          <ellipse
            cx="42"
            cy="72"
            rx="10"
            ry="6"
            fill={leaf.main}
            transform={leaf.wilt ? 'rotate(-40 42 72)' : 'rotate(-25 42 72)'}
          />
          <circle cx="48" cy="78" r="4" fill={scenario === 'danger' ? '#8D6E63' : '#C4A35A'} />
        </g>
      ) : (
        <g transform={`translate(50 116) scale(${stageScale}) translate(-50 -116)`}>
          {/* trunk */}
          <path
            d={leaf.wilt ? 'M50 116 Q46 80 48 48' : 'M50 116 L50 48'}
            stroke={stem}
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
          />

          {/* leaves — wilted angles when stressed */}
          <ellipse
            cx={leaf.wilt ? 28 : 26}
            cy={leaf.wilt ? 78 : 72}
            rx="14"
            ry="9"
            fill={leaf.main}
            transform={leaf.wilt ? 'rotate(-55 28 78)' : 'rotate(-32 26 72)'}
          />
          <ellipse
            cx={leaf.wilt ? 70 : 74}
            cy={leaf.wilt ? 76 : 70}
            rx="14"
            ry="9"
            fill={leaf.mid}
            transform={leaf.wilt ? 'rotate(50 70 76)' : 'rotate(28 74 70)'}
          />
          <ellipse
            cx={leaf.wilt ? 32 : 34}
            cy={leaf.wilt ? 58 : 54}
            rx="12"
            ry="7"
            fill={leaf.light}
            transform={leaf.wilt ? 'rotate(-40 32 58)' : 'rotate(-18 34 54)'}
          />
          <ellipse
            cx={leaf.wilt ? 66 : 66}
            cy={leaf.wilt ? 56 : 52}
            rx="12"
            ry="7"
            fill={leaf.main}
            transform={leaf.wilt ? 'rotate(38 66 56)' : 'rotate(16 66 52)'}
          />
          {!leaf.wilt && (
            <>
              <ellipse cx="42" cy="42" rx="10" ry="6" fill={leaf.light} transform="rotate(-8 42 42)" />
              <ellipse cx="58" cy="40" rx="10" ry="6" fill={leaf.mid} transform="rotate(10 58 40)" />
            </>
          )}
          {leaf.wilt && scenario === 'danger' && (
            <>
              {/* brown dry leaf tips */}
              <ellipse cx="22" cy="88" rx="8" ry="4" fill="#5D4037" transform="rotate(-70 22 88)" opacity="0.8" />
              <ellipse cx="78" cy="86" rx="8" ry="4" fill="#5D4037" transform="rotate(65 78 86)" opacity="0.8" />
            </>
          )}

          {/* flowers */}
          {showFlowers && (
            <g>
              {[
                [38, 36], [46, 30], [54, 34], [42, 42], [58, 40],
              ].map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={scenario === 'danger' ? 1.6 : 2.4} fill={flower} opacity={scenario === 'danger' ? 0.5 : 1} />
              ))}
            </g>
          )}

          {/* green berries */}
          {showGreenBerries && !showRipeBerries && (
            <g>
              {[
                [36, 34], [44, 28], [52, 32], [40, 40], [56, 38], [48, 36],
              ].map(([x, y], i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={scenario === 'danger' ? 2 : 3}
                  fill={berryGreen}
                  opacity={scenario === 'danger' ? 0.55 : 1}
                />
              ))}
            </g>
          )}

          {/* ripe berries */}
          {showRipeBerries && (
            <g>
              {[
                [34, 32], [42, 26], [50, 30], [38, 38], [54, 36], [46, 34], [58, 28], [40, 30],
              ].map(([x, y], i) => (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r={scenario === 'danger' ? 2.2 : scenario === 'stress' ? 2.8 : 3.4}
                  fill={i % 2 === 0 ? berry : scenario === 'danger' ? '#4E342E' : '#4A148C'}
                  opacity={scenario === 'danger' ? 0.5 : 1}
                />
              ))}
            </g>
          )}
        </g>
      )}

      {/* heat/water stress indicators */}
      {scenario === 'danger' && (
        <g opacity="0.85">
          <text x="78" y="42" fontSize="14">🔥</text>
          <text x="12" y="50" fontSize="12">💧</text>
        </g>
      )}
      {scenario === 'stress' && (
        <g opacity="0.8">
          <text x="78" y="44" fontSize="12">☀️</text>
        </g>
      )}
      {scenario === 'ideal' && stage !== 'germination' && (
        <g opacity="0.7">
          <text x="78" y="40" fontSize="11">✨</text>
        </g>
      )}
    </svg>
  );
}

function SliderRow({
  label,
  icon,
  min,
  max,
  step,
  value,
  unit,
  onChange,
}: {
  label: string;
  icon: ReactNode;
  min: number;
  max: number;
  step: number;
  value: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="bg-[#0f1722] rounded-lg border border-[#1e2d40] p-3">
      <div className="flex items-center justify-between text-[11px] mb-2">
        <span className="flex items-center gap-1.5 text-slate-300">
          {icon}
          {label}
        </span>
        <span className="font-mono font-bold text-white">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 accent-emerald-500 cursor-pointer"
      />
      <div className="flex justify-between text-[9px] text-slate-600 mt-1 font-mono">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
}

function ScenarioCard({ id, onApply }: { id: ScenarioId; onApply: () => void }) {
  const s = SCENARIOS[id];
  return (
    <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] overflow-hidden flex flex-col">
      <div className="p-3 border-b border-[#1e2d40] flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Scenario</div>
          <div className="text-sm font-bold text-white">{s.title}</div>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-1 rounded-md border ${s.badgeClass}`}>{s.badge}</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-b border-[#1e2d40]">
        <div className="p-3 space-y-1.5 text-[11px] border-b sm:border-b-0 sm:border-r border-[#1e2d40]">
          <div className="text-[10px] font-bold text-slate-400 mb-2">ENVIRONMENT SUMMARY</div>
          {[
            ['Temperature', `${s.env.temperature}°C`],
            ['Humidity', `${s.env.humidity}%`],
            ['Rainfall (24h)', `${s.env.rainfall} mm`],
            ['Solar Radiation', `${s.env.sunlight} W/m²`],
            ['Wind Speed', `${s.env.windSpeed} km/h`],
            ['Soil Moisture', `${s.env.soilMoisture}%`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-slate-500">{k}</span>
              <span className="text-slate-200 font-medium">{v}</span>
            </div>
          ))}
        </div>
        <div className={`relative min-h-[160px] bg-gradient-to-br ${s.imageGrad} flex items-end justify-center p-3`}>
          <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-40">🍇</div>
          <div className={`relative z-10 px-4 py-2 rounded-lg font-bold text-sm ${s.statusClass} shadow-lg`}>
            ENVIRONMENT STATUS · {s.status}{' '}
            {id === 'ideal' ? '😊' : id === 'stress' ? '😐' : '😟'}
          </div>
        </div>
      </div>

      <div className="p-3 border-b border-[#1e2d40]">
        <div className="text-[10px] font-bold text-slate-400 mb-2">EFFECT ON PLANT LIFECYCLE</div>
        <div className="grid grid-cols-1 gap-1">
          {s.lifecycle.map((l) => (
            <div key={l.stage} className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">{l.stage}</span>
              <span className={`font-semibold ${l.ok ? 'text-emerald-400' : id === 'stress' ? 'text-amber-400' : 'text-rose-400'}`}>
                {l.ok ? '●' : '▲'} {l.status}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="p-3 grid grid-cols-2 gap-3 border-b border-[#1e2d40] text-[11px]">
        <div>
          <div className="text-[10px] font-bold text-slate-400 mb-1">PLANT HEALTH & GROWTH</div>
          <div className="space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">Health Index</span><span className="text-white font-semibold">{s.health}%</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Growth Rate</span><span className="text-white">{s.growth}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Water Stress</span><span className="text-white">{s.waterStress}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Nutrient Stress</span><span className="text-white">{s.nutrientStress}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Disease Risk</span><span className="text-white">{s.disease}</span></div>
          </div>
        </div>
        <div>
          <div className="text-[10px] font-bold text-slate-400 mb-1">PREDICTED OUTCOME</div>
          <div className="grid grid-cols-1 gap-1.5">
            <div className="bg-[#0f1722] rounded-lg p-2 border border-[#1e2d40]">
              <div className="text-[9px] text-slate-500">Expected Yield</div>
              <div className="text-lg font-bold text-white">{s.yield} <span className="text-xs text-slate-400">tons/acre</span></div>
            </div>
            <div className="bg-[#0f1722] rounded-lg p-2 border border-[#1e2d40]">
              <div className="text-[9px] text-slate-500">Harvest Date</div>
              <div className="text-sm font-bold text-white">{s.harvest}</div>
            </div>
            <div className="bg-[#0f1722] rounded-lg p-2 border border-[#1e2d40]">
              <div className="text-[9px] text-slate-500">Quality</div>
              <div className={`text-sm font-bold ${id === 'ideal' ? 'text-emerald-400' : id === 'stress' ? 'text-amber-400' : 'text-rose-400'}`}>{s.quality}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 flex-1">
        <div className="text-[10px] font-bold text-slate-400 mb-2">
          {id === 'ideal' ? 'STATUS' : id === 'stress' ? 'RECOMMENDED ACTIONS' : 'URGENT ACTIONS REQUIRED'}
        </div>
        <div className="space-y-1.5 text-[11px]">
          {s.actions.map((a) => (
            <div key={a.text} className={`flex gap-2 ${a.urgent ? 'text-amber-300' : 'text-slate-400'}`}>
              {a.urgent ? <AlertTriangle size={14} className="shrink-0 mt-0.5" /> : <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-emerald-400" />}
              {a.text}
            </div>
          ))}
        </div>
        <p className={`text-[11px] mt-3 font-medium ${id === 'danger' ? 'text-rose-300' : id === 'stress' ? 'text-amber-300' : 'text-emerald-300'}`}>
          {s.outcomeNote}
        </p>
        <button
          type="button"
          onClick={onApply}
          className="mt-3 w-full py-2 rounded-lg border border-emerald-500/40 bg-emerald-600/20 text-emerald-300 text-[11px] font-bold hover:bg-emerald-600/30"
        >
          Load this scenario into control panel
        </button>
      </div>
    </div>
  );
}

export default function SimulationHub({
  sim,
  setSim,
  isPlaying,
  setIsPlaying,
}: {
  sim: SimState;
  setSim: Dispatch<SetStateAction<SimState>>;
  isPlaying: boolean;
  setIsPlaying: (v: boolean) => void;
}) {
  const settingsCtx = useSettingsOptional();
  const fieldCount = Math.max(1, Math.min(8, settingsCtx?.settings?.fieldCount || 4));
  const fieldApplyOptions = [
    'All Fields',
    ...Array.from({ length: fieldCount }, (_, i) => `Field ${'ABCDEFGH'[i]}`),
  ];
  const [nav, setNav] = useState<SimNav>('control');
  const [scenarioName, setScenarioName] = useState('Custom Scenario');
  const [localEnv, setLocalEnv] = useState<EnvParams>({ ...sim.env });
  const [soilExtra, setSoilExtra] = useState({ ec: 1.2, om: 2.8, ca: 540, mg: 120, applyTo: 'All Fields' });

  // Keep latest env in a ref so the playback interval always uses current conditions
  const localEnvRef = useRef(localEnv);
  localEnvRef.current = localEnv;
  const setIsPlayingRef = useRef(setIsPlaying);
  setIsPlayingRef.current = setIsPlaying;

  // Dedicated playback loop for this panel — advances 1 day every 600ms while playing
  useEffect(() => {
    if (!isPlaying) return;

    const timer = window.setInterval(() => {
      setSim((prev) => {
        if (prev.day >= 150) {
          setIsPlayingRef.current(false);
          return prev;
        }
        return stepSimulation(prev, localEnvRef.current);
      });
    }, 600);

    return () => window.clearInterval(timer);
  }, [isPlaying, setSim]);

  const updateLocal = (key: keyof EnvParams, value: number) => {
    setLocalEnv((prev) => ({ ...prev, [key]: value }));
  };

  const applyEnv = () => {
    setSim((prev) => {
      const env = { ...localEnv };
      return stepSimulation({ ...prev, day: Math.max(0, prev.day - 1), env }, env);
    });
  };

  const applyScenario = (id: ScenarioId) => {
    const env = { ...DEFAULT_ENV, ...SCENARIOS[id].env };
    setLocalEnv(env);
    setScenarioName(SCENARIOS[id].title);
    setSim((prev) => stepSimulation({ ...prev, day: Math.max(0, prev.day - 1), env }, env));
    setNav('control');
  };

  const resetEnv = () => {
    setLocalEnv({ ...DEFAULT_ENV });
    setScenarioName('Custom Scenario');
  };

  const stageLabel = STAGE_RANGES.find((s) => s.id === sim.stage)?.label || sim.stage;

  // Resolve which scenario theme to show in the twin visual
  const activeScenarioId: ScenarioId | 'custom' = useMemo(() => {
    if (scenarioName === 'IDEAL ENVIRONMENT' || scenarioName === SCENARIOS.ideal.title) return 'ideal';
    if (scenarioName === 'RECURSION REQUIRED' || scenarioName === 'Stress Conditions' || scenarioName === SCENARIOS.stress.title) return 'stress';
    if (scenarioName === 'DANGEROUS ENVIRONMENT' || scenarioName === SCENARIOS.danger.title) return 'danger';
    // Infer from live stress if custom
    if (sim.stressHeat > 0.55 || sim.stressWater > 0.55 || sim.healthIndex < 40) return 'danger';
    if (sim.stressHeat > 0.25 || sim.stressWater > 0.25 || sim.healthIndex < 70) return 'stress';
    return 'custom';
  }, [scenarioName, sim.stressHeat, sim.stressWater, sim.healthIndex]);

  const sceneTheme = useMemo(() => {
    if (activeScenarioId === 'ideal') {
      return {
        sceneBg: 'bg-gradient-to-b from-sky-900/50 via-emerald-950/60 to-lime-950/40',
        orb1: 'bg-emerald-400/20',
        orb2: 'bg-sky-400/15',
        tile: 'from-emerald-700/90 to-sky-900/80 border-emerald-400/30 shadow-emerald-900/50',
        glow: 'bg-emerald-400/20',
        status: 'IDEAL',
        statusClass: 'bg-emerald-600 text-white',
        emoji: '😊',
        plantFilter: '',
        badge: 'Optimal conditions',
        badgeClass: 'bg-emerald-900/40 text-emerald-300 border-emerald-500/30',
        barColor: 'from-emerald-700 to-emerald-400/80',
      };
    }
    if (activeScenarioId === 'stress') {
      return {
        sceneBg: 'bg-gradient-to-b from-amber-950/70 via-orange-950/50 to-stone-950',
        orb1: 'bg-amber-500/20',
        orb2: 'bg-orange-600/15',
        tile: 'from-amber-800/80 to-stone-900/80 border-amber-500/30 shadow-amber-900/40',
        glow: 'bg-amber-400/15',
        status: 'STRESS',
        statusClass: 'bg-amber-500 text-black',
        emoji: '😐',
        plantFilter: 'brightness-90 saturate-75',
        badge: 'Attention required',
        badgeClass: 'bg-amber-900/40 text-amber-300 border-amber-500/30',
        barColor: 'from-amber-700 to-amber-400/80',
      };
    }
    if (activeScenarioId === 'danger') {
      return {
        sceneBg: 'bg-gradient-to-b from-rose-950/80 via-orange-950/50 to-stone-950',
        orb1: 'bg-rose-500/25',
        orb2: 'bg-orange-600/20',
        tile: 'from-rose-900/80 to-stone-950 border-rose-500/40 shadow-rose-900/50',
        glow: 'bg-rose-500/20',
        status: 'DANGEROUS',
        statusClass: 'bg-rose-600 text-white',
        emoji: '😟',
        plantFilter: 'brightness-75 saturate-50 grayscale-[30%]',
        badge: 'Critical environment',
        badgeClass: 'bg-rose-900/50 text-rose-300 border-rose-500/40',
        barColor: 'from-rose-800 to-rose-500/80',
      };
    }
    return {
      sceneBg: 'bg-gradient-to-b from-[#0c1a2e] via-[#0f2a22] to-[#1a1810]',
      orb1: 'bg-sky-500/10',
      orb2: 'bg-emerald-500/10',
      tile: 'from-emerald-800/80 to-sky-900/80 border-white/10 shadow-emerald-900/40',
      glow: 'bg-emerald-400/10',
      status: 'CUSTOM',
      statusClass: 'bg-violet-600 text-white',
      emoji: '🍇',
      plantFilter: '',
      badge: 'Custom scenario',
      badgeClass: 'bg-violet-900/40 text-violet-200 border-violet-500/30',
      barColor: 'from-emerald-700 to-emerald-400/80',
    };
  }, [activeScenarioId]);

  // While running, show live sim env; otherwise show the values you're about to apply
  const displayEnv = isPlaying ? sim.env : localEnv;
  const topMetrics = useMemo(
    () => [
      { icon: <Thermometer size={14} className="text-rose-400" />, label: 'Temperature', value: `${displayEnv.temperature}°C` },
      { icon: <Droplets size={14} className="text-cyan-400" />, label: 'Humidity', value: `${displayEnv.humidity}%` },
      { icon: <CloudRain size={14} className="text-blue-400" />, label: 'Rainfall (24h)', value: `${displayEnv.rainfall} mm` },
      { icon: <Sun size={14} className="text-amber-400" />, label: 'Solar (W/m²)', value: `${displayEnv.sunlight}` },
      { icon: <Wind size={14} className="text-slate-300" />, label: 'Wind Speed', value: `${displayEnv.windSpeed} km/h` },
    ],
    [displayEnv],
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0b131e] overflow-hidden">
      {/* Sub nav */}
      <div className="shrink-0 border-b border-[#1e2d40] bg-[#0f1722] px-3 flex items-center gap-0.5 overflow-x-auto">
        {NAV.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => setNav(n.id)}
            className={`px-3 py-2.5 text-[11px] font-semibold whitespace-nowrap border-b-2 transition ${
              nav === n.id
                ? 'border-violet-500 text-violet-300 bg-violet-900/20'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {n.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ═══ CONTROL PANEL ═══ */}
        {nav === 'control' && (
          <>
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/40 flex items-center justify-center">
                    <PlayCircle size={16} className="text-violet-300" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white tracking-tight">Simulation Control</h2>
                    <p className="text-[11px] text-slate-400">Set conditions → run the twin → see impact on vines</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-slate-500">Active scenario</span>
                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${sceneTheme.badgeClass}`}>
                  {sceneTheme.badge}
                </span>
              </div>
            </div>

            {/* How it works strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { step: '1', title: 'Set conditions', desc: 'Weather, soil & nutrients' },
                { step: '2', title: 'Run simulation', desc: 'Advance time hour by hour' },
                { step: '3', title: 'Review impact', desc: 'Health, stress & yield' },
              ].map((s) => (
                <div key={s.step} className="flex items-center gap-3 rounded-xl bg-[#16202d]/80 border border-[#1e2d40] px-3 py-2.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-600/20 text-emerald-300 text-xs font-bold flex items-center justify-center border border-emerald-500/30">
                    {s.step}
                  </div>
                  <div>
                    <div className="text-[12px] font-semibold text-white">{s.title}</div>
                    <div className="text-[10px] text-slate-500">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Main twin card */}
              <div className="xl:col-span-2 bg-[#16202d] rounded-2xl border border-[#1e2d40] overflow-hidden shadow-lg shadow-black/20">
                <div className="px-4 py-3 border-b border-[#1e2d40] flex items-center justify-between bg-[#0f1722]/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Vineyard Digital Twin</span>
                    <span className="text-[10px] text-slate-500">· live model</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-400 bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Live preview
                  </span>
                </div>

                {/* Scene — theme follows Ideal / Stress / Dangerous */}
                <div className={`relative h-[300px] overflow-hidden transition-all duration-500 ${sceneTheme.sceneBg}`}>
                  <div className={`absolute -top-10 left-1/4 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${sceneTheme.orb1}`} />
                  <div className={`absolute bottom-0 right-1/4 w-48 h-48 rounded-full blur-3xl pointer-events-none transition-colors duration-500 ${sceneTheme.orb2}`} />

                  {/* metric chips */}
                  <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-1.5 z-10">
                    {topMetrics.map((m) => (
                      <div
                        key={m.label}
                        className="flex items-center gap-1.5 bg-black/55 backdrop-blur-md px-2.5 py-1.5 rounded-xl text-[10px] border border-white/10 shadow-sm"
                      >
                        {m.icon}
                        <span className="text-slate-400 hidden sm:inline">{m.label}</span>
                        <span className="text-white font-bold tabular-nums">{m.value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Environment status banner */}
                  <div className="absolute top-14 left-1/2 -translate-x-1/2 z-10">
                    <div className={`px-4 py-1.5 rounded-lg text-[11px] font-bold tracking-wide shadow-lg ${sceneTheme.statusClass}`}>
                      ENVIRONMENT · {sceneTheme.status} {sceneTheme.emoji}
                    </div>
                  </div>

                  {/* Center plant visual — changes with scenario + lifecycle stage */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
                    <div className="relative flex items-center justify-center">
                      <div className={`absolute inset-0 rounded-full blur-2xl scale-110 transition-colors duration-500 ${sceneTheme.glow}`} />
                      <div
                        key={`${activeScenarioId}-${sim.stage}`}
                        className="relative transition-all duration-500 animate-[fadeIn_0.4s_ease]"
                      >
                        <TwinPlantVisual
                          stage={sim.stage}
                          scenario={activeScenarioId === 'custom' ? (sim.healthIndex >= 75 ? 'ideal' : sim.healthIndex >= 50 ? 'stress' : 'danger') : activeScenarioId}
                          size={130}
                        />
                      </div>
                    </div>
                    <div className="mt-1 text-center relative z-10">
                      <div className="text-sm font-semibold text-white">Vineyard Digital Twin</div>
                      <div className="mt-1.5 flex items-center justify-center gap-2 text-[11px] flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-black/40 text-slate-200 border border-white/10">
                          Day {sim.day}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-black/40 text-slate-100 border border-white/10">
                          {stageLabel}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md border ${
                            sim.healthIndex >= 75
                              ? 'bg-emerald-900/50 text-emerald-300 border-emerald-500/30'
                              : sim.healthIndex >= 50
                                ? 'bg-amber-900/50 text-amber-300 border-amber-500/30'
                                : 'bg-rose-900/50 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          Health {sim.healthIndex}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Controls bar */}
                <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#1e2d40] bg-[#0f1722]/40">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">Simulation clock</div>
                    <div className="text-[13px] text-white font-medium">
                      Day {sim.day} of 150 · {stageLabel}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {isPlaying ? 'Advancing ~1 day / 0.7s' : 'Paused · press Start to run'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (isPlaying) {
                          setIsPlaying(false);
                          return;
                        }
                        // Apply current scenario env, then start continuous playback
                        setSim((p) => stepSimulation({ ...p, env: { ...localEnv } }, localEnv));
                        setIsPlaying(true);
                      }}
                      className={`flex-1 h-10 rounded-xl text-white text-[12px] font-bold flex items-center justify-center gap-1.5 shadow-lg transition ${
                        isPlaying
                          ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/30'
                          : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <PauseCircle size={16} /> Pause
                        </>
                      ) : (
                        <>
                          <PlayCircle size={16} /> Start Simulation
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPlaying(false)}
                      title="Pause"
                      className="h-10 w-10 rounded-xl border border-[#1e2d40] text-slate-300 hover:border-amber-500/50 hover:text-amber-300 flex items-center justify-center transition"
                    >
                      <PauseCircle size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsPlaying(false);
                        resetEnv();
                        setSim((p) => stepSimulation({ ...p, day: 0, env: { ...DEFAULT_ENV } }, DEFAULT_ENV));
                      }}
                      title="Reset to day 0"
                      className="h-10 w-10 rounded-xl border border-[#1e2d40] text-slate-300 hover:border-slate-400 flex items-center justify-center transition"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1.5">Growth this run</div>
                    <div className="text-[13px] text-emerald-400 font-semibold tabular-nums">
                      Day {Math.max(1, sim.day)} · {(sim.growthRate * 100).toFixed(0)}% growth rate
                    </div>
                    <div className="h-9 mt-1.5 rounded-lg bg-[#0b131e] border border-[#1e2d40] flex items-end gap-0.5 px-1.5 pb-1.5">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div
                          key={i}
                          className={`flex-1 rounded-sm bg-gradient-to-t transition-colors duration-500 ${sceneTheme.barColor}`}
                          style={{ height: `${18 + ((i * 17 + sim.day * 3) % 72)}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column: scenario + outcomes */}
              <div className="flex flex-col gap-4">
                {/* Scenario picker */}
                <div className="bg-[#16202d] rounded-2xl border border-[#1e2d40] p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-white">Choose scenario</div>
                    <span className="text-[10px] text-slate-500">presets or custom</span>
                  </div>
                  <select
                    value={
                      scenarioName === SCENARIOS.ideal.title || scenarioName === 'IDEAL ENVIRONMENT'
                        ? 'ideal'
                        : scenarioName === SCENARIOS.stress.title || scenarioName === 'RECURSION REQUIRED' || scenarioName === 'Stress Conditions'
                          ? 'stress'
                          : scenarioName === SCENARIOS.danger.title || scenarioName === 'DANGEROUS ENVIRONMENT'
                            ? 'danger'
                            : 'custom'
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === 'ideal') applyScenario('ideal');
                      else if (v === 'stress') applyScenario('stress');
                      else if (v === 'danger') applyScenario('danger');
                      else {
                        setScenarioName('Custom Scenario');
                      }
                    }}
                    className="w-full text-[12px] bg-[#0f1722] border border-[#1e2d40] rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:border-violet-500/50"
                  >
                    <option value="custom">Custom Scenario</option>
                    <option value="ideal">Ideal Environment</option>
                    <option value="stress">Stress Conditions</option>
                    <option value="danger">Dangerous Environment</option>
                  </select>
                  <button
                    type="button"
                    onClick={applyEnv}
                    className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-900/20 transition"
                  >
                    <Save size={14} /> Apply to twin
                  </button>
                  <button
                    type="button"
                    onClick={() => setNav('scenarios')}
                    className="w-full h-9 rounded-xl border border-[#1e2d40] text-slate-300 text-[11px] font-semibold hover:border-violet-500/40 hover:text-violet-200 transition"
                  >
                    Browse all scenarios →
                  </button>
                </div>

                {/* Live outcomes */}
                <div className="bg-[#16202d] rounded-2xl border border-[#1e2d40] p-4 flex-1">
                  <div className="text-xs font-bold text-white mb-3">Live plant outcomes</div>

                  {/* Yield highlight */}
                  <div className="rounded-xl bg-gradient-to-br from-emerald-900/40 to-[#0f1722] border border-emerald-500/20 p-3 mb-3">
                    <div className="text-[10px] text-emerald-400/80 uppercase tracking-wider">Estimated yield</div>
                    <div className="text-2xl font-bold text-white tabular-nums mt-0.5">
                      {sim.yieldTons} <span className="text-sm font-medium text-slate-400">t/ac</span>
                    </div>
                  </div>

                  {/* Stress bars */}
                  <div className="space-y-3">
                    {[
                      { label: 'Heat stress', value: sim.stressHeat, color: 'bg-rose-500' },
                      { label: 'Water stress', value: sim.stressWater, color: 'bg-sky-500' },
                      { label: 'Nutrient stress', value: sim.stressNutrient, color: 'bg-amber-500' },
                    ].map((s) => {
                      const pct = Math.min(100, Math.round(s.value * 100));
                      return (
                        <div key={s.label}>
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="text-slate-400">{s.label}</span>
                            <span className={`font-semibold tabular-nums ${pct > 40 ? 'text-amber-300' : 'text-white'}`}>
                              {pct}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[#0f1722] overflow-hidden border border-[#1e2d40]/60">
                            <div
                              className={`h-full rounded-full ${s.color} transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[10px] text-slate-500 mt-4 leading-relaxed">
                    Stress rises when temperature, moisture or nutrients leave the ideal range. Lower stress → better yield and berry quality.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══ ENVIRONMENT ═══ */}
        {nav === 'environment' && (
          <>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">2. SIMULATION CONTROL – ENVIRONMENT ADJUSTMENT</h2>
              <p className="text-[11px] text-slate-400">Adjust environmental conditions for simulation</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SliderRow label="Temperature" icon={<Thermometer size={14} className="text-rose-400" />} min={10} max={45} step={0.5} value={localEnv.temperature} unit="°C" onChange={(v) => updateLocal('temperature', v)} />
              <SliderRow label="Humidity" icon={<Droplets size={14} className="text-cyan-400" />} min={10} max={100} step={1} value={localEnv.humidity} unit="%" onChange={(v) => updateLocal('humidity', v)} />
              <SliderRow label="Rainfall" icon={<CloudRain size={14} className="text-blue-400" />} min={0} max={200} step={1} value={localEnv.rainfall} unit=" mm" onChange={(v) => updateLocal('rainfall', v)} />
              <SliderRow label="Solar Radiation" icon={<Sun size={14} className="text-amber-400" />} min={100} max={1200} step={10} value={localEnv.sunlight} unit=" W/m²" onChange={(v) => updateLocal('sunlight', v)} />
              <SliderRow label="Wind Speed" icon={<Wind size={14} className="text-slate-300" />} min={0} max={60} step={1} value={localEnv.windSpeed} unit=" km/h" onChange={(v) => updateLocal('windSpeed', v)} />
              <SliderRow label="Soil Moisture (Root Zone)" icon={<Droplets size={14} className="text-sky-400" />} min={5} max={100} step={1} value={localEnv.soilMoisture} unit="%" onChange={(v) => updateLocal('soilMoisture', v)} />
            </div>
            <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
              <div className="text-[10px] font-bold text-slate-400 mb-2">QUICK PRESETS</div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['Ideal Conditions', 'ideal'],
                    ['Water Stress', 'stress'],
                    ['Heat Stress', 'stress'],
                    ['Heavy Rainfall', 'ideal'],
                    ['Cold Stress', 'stress'],
                    ['Dangerous', 'danger'],
                  ] as [string, ScenarioId][]
                ).map(([label, id]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => applyScenario(id)}
                    className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-[#1e2d40] bg-[#0f1722] text-slate-300 hover:border-violet-500/50 hover:text-violet-300"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" onClick={applyEnv} className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-bold">
              Apply Environment to Simulation
            </button>
          </>
        )}

        {/* ═══ SOIL ═══ */}
        {nav === 'soil' && (
          <>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">3. SIMULATION CONTROL – SOIL & NUTRIENT SETTINGS</h2>
              <p className="text-[11px] text-slate-400">Soil profile and nutrient levels for the run</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4 space-y-3">
                <div className="text-xs font-bold text-white">SOIL SETTINGS</div>
                <div className="h-28 rounded-lg bg-gradient-to-b from-amber-800 via-yellow-950 to-stone-950 border border-[#1e2d40] relative overflow-hidden">
                  <div className="absolute left-2 top-2 text-[9px] text-slate-300 space-y-1">
                    <div>0 – 15 cm</div>
                    <div>15 – 30 cm</div>
                    <div>30 – 60 cm</div>
                    <div>60 – 100 cm</div>
                  </div>
                </div>
                <SliderRow label="Soil pH" icon={<Leaf size={14} className="text-lime-400" />} min={4} max={9} step={0.1} value={localEnv.soilPh} unit="" onChange={(v) => updateLocal('soilPh', v)} />
                <SliderRow label="Electrical Conductivity (EC)" icon={<span className="text-amber-400 text-[10px]">EC</span>} min={0} max={5} step={0.1} value={soilExtra.ec} unit=" dS/m" onChange={(v) => setSoilExtra((s) => ({ ...s, ec: v }))} />
                <SliderRow label="Organic Matter" icon={<Leaf size={14} className="text-emerald-400" />} min={0.5} max={8} step={0.1} value={soilExtra.om} unit="%" onChange={(v) => setSoilExtra((s) => ({ ...s, om: v }))} />
              </div>
              <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4 space-y-3">
                <div className="text-xs font-bold text-white">NUTRIENT LEVELS (kg/ha)</div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {[
                    { l: 'N', v: localEnv.nitrogen, c: 'text-emerald-400' },
                    { l: 'P', v: localEnv.phosphorus, c: 'text-blue-400' },
                    { l: 'K', v: localEnv.potassium, c: 'text-amber-400' },
                  ].map((x) => (
                    <div key={x.l} className="bg-[#0f1722] rounded-lg border border-[#1e2d40] p-2 text-center">
                      <div className={`text-lg font-bold ${x.c}`}>{x.v}</div>
                      <div className="text-[10px] text-slate-500">{x.l}</div>
                    </div>
                  ))}
                </div>
                <SliderRow label="Nitrogen (N)" icon={<span className="text-emerald-400 text-[10px] font-bold">N</span>} min={0} max={200} step={1} value={localEnv.nitrogen} unit=" kg/ha" onChange={(v) => updateLocal('nitrogen', v)} />
                <SliderRow label="Phosphorus (P₂O₅)" icon={<span className="text-blue-400 text-[10px] font-bold">P</span>} min={0} max={200} step={1} value={localEnv.phosphorus} unit=" kg/ha" onChange={(v) => updateLocal('phosphorus', v)} />
                <SliderRow label="Potassium (K₂O)" icon={<span className="text-amber-400 text-[10px] font-bold">K</span>} min={0} max={200} step={1} value={localEnv.potassium} unit=" kg/ha" onChange={(v) => updateLocal('potassium', v)} />
                <div className="flex flex-wrap gap-2 pt-2">
                  {fieldApplyOptions.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setSoilExtra((s) => ({ ...s, applyTo: f }))}
                      className={`px-3 py-1 rounded-lg text-[10px] font-semibold border ${
                        soilExtra.applyTo === f ? 'border-emerald-500/50 bg-emerald-900/30 text-emerald-300' : 'border-[#1e2d40] text-slate-400'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <button type="button" onClick={applyEnv} className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[12px] font-bold">
                  Apply Changes
                </button>
              </div>
            </div>
          </>
        )}

        {/* ═══ SCENARIOS ═══ */}
        {nav === 'scenarios' && (
          <>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">SIMULATION SCENARIOS</h2>
              <p className="text-[11px] text-slate-400">Ideal · Stress · Dangerous — load into the control panel</p>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <ScenarioCard id="ideal" onApply={() => applyScenario('ideal')} />
              <ScenarioCard id="stress" onApply={() => applyScenario('stress')} />
              <ScenarioCard id="danger" onApply={() => applyScenario('danger')} />
            </div>
          </>
        )}

        {/* ═══ LIFECYCLE COMPARE ═══ */}
        {nav === 'lifecycle' && (
          <>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">7. ENVIRONMENT EFFECT ON PLANT LIFECYCLE – COMPARISON VIEW</h2>
              <p className="text-[11px] text-slate-400">Environment directly influences each stage of the lifecycle</p>
            </div>
            <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] overflow-x-auto">
              <table className="w-full text-[11px] min-w-[900px]">
                <thead>
                  <tr className="border-b border-[#1e2d40]">
                    <th className="text-left p-3 text-slate-500 font-medium w-48">ENVIRONMENT CONDITION</th>
                    {LIFECYCLE_COMPARE.map((c) => (
                      <th key={c.name} className="p-3 text-center text-slate-400 font-medium">
                        <div className="text-lg mb-1">{c.emoji}</div>
                        <div className="text-white text-[11px]">{c.name}</div>
                        <div className="text-[9px] text-slate-500">{c.days}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARE_ROWS.map((row) => (
                    <tr key={row.label} className="border-b border-[#1e2d40]/50">
                      <td className={`p-3 font-semibold ${row.color}`}>
                        <span className="inline-block w-2 h-2 rounded-full mr-2 align-middle" style={{ background: row.color.includes('emerald') ? '#34d399' : row.color.includes('amber') ? '#fbbf24' : '#f87171' }} />
                        {row.label}
                      </td>
                      {row.cells.map((cell, i) => (
                        <td key={i} className={`p-3 text-center ${row.color}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-slate-500 text-center">
              Maintaining optimal conditions ensures higher yield and better quality across all phenology stages.
            </p>
          </>
        )}

        {/* ═══ RESULTS ═══ */}
        {nav === 'results' && (
          <>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide">SIMULATION RESULTS</h2>
              <p className="text-[11px] text-slate-400">Current run driven by control-panel environment</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { l: 'Day', v: String(sim.day) },
                { l: 'Stage', v: stageLabel },
                { l: 'Health', v: `${sim.healthIndex}%` },
                { l: 'Yield est.', v: `${sim.yieldTons} t/ac` },
                { l: 'Growth rate', v: `${(sim.growthRate * 100).toFixed(0)}%` },
                { l: 'Heat stress', v: `${(sim.stressHeat * 100).toFixed(0)}%` },
                { l: 'Water stress', v: `${(sim.stressWater * 100).toFixed(0)}%` },
                { l: 'Berry size', v: `${sim.berrySizeMm} mm` },
              ].map((c) => (
                <div key={c.l} className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-3">
                  <div className="text-[10px] text-slate-400">{c.l}</div>
                  <div className="text-lg font-bold text-white mt-1">{c.v}</div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSim((p) => stepSimulation(p, localEnv))}
              className="px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-[12px] font-bold"
            >
              Step simulation +1 day
            </button>
          </>
        )}
      </div>
    </div>
  );
}
