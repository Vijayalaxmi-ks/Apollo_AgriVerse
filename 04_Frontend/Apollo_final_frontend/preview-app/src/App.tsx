import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Home, CloudRain, Layers, Leaf, Beaker, Box, BrainCircuit, CheckCircle2,
  PlayCircle, BarChart2, AlertTriangle, FileText, Settings, Heart,
  Droplets, Wind, Sun, Calendar, PanelLeft, Thermometer, Activity, Bell,
} from 'lucide-react';
import DigitalTwinMap from './DigitalTwinMap';
import WeatherPanel, { type LiveWeatherSummary } from './WeatherPanel';
import SimulationHub from './SimulationHub';
import SoilPanel from './SoilPanel';
import LifecyclePanel from './LifecyclePanel';
import HydrogelPanel from './HydrogelPanel';
import MulchingPanel from './MulchingPanel';
import AnalyticsPanel from './AnalyticsPanel';
import PredictionsPanel from './PredictionsPanel';
import AlertsPanel from './AlertsPanel';
import ReportsPanel from './ReportsPanel';
import SettingsPanel from './SettingsPanel';
import type { SimState, TwinLevel } from './simulation';
import {
  createInitialState, FIELDS, stepSimulation
} from './simulation';

/** Bootstrap live weather for Weather Summary (same source as Weather Intelligence) */
async function fetchSummaryWeather(
  lat = 17.66,
  lon = 75.91,
  city = 'Solapur'
): Promise<LiveWeatherSummary | null> {
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set(
      'current',
      'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,cloud_cover'
    );
    url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min');
    url.searchParams.set('timezone', 'Asia/Kolkata');
    url.searchParams.set('forecast_days', '1');
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = await res.json();
    const c = data.current || {};
    const d = data.daily || {};
    const temp = Number(c.temperature_2m ?? 0);
    const rain = Number(c.precipitation ?? 0);
    const cloud = Number(c.cloud_cover ?? 0);
    let condition = 'Clear Sky';
    if (rain > 2) condition = 'Light Rain';
    else if (cloud > 70) condition = 'Cloudy';
    else if (cloud > 35) condition = 'Partly Cloudy';
    return {
      city,
      temperature: Math.round(temp),
      humidity: Math.round(Number(c.relative_humidity_2m ?? 0)),
      rainfall: Math.round(rain * 10) / 10,
      windKmh: Math.round(Number(c.wind_speed_10m ?? 0) * 3.6),
      condition,
      minTemp: d.temperature_2m_min ? Math.round(Number(d.temperature_2m_min[0])) : undefined,
      maxTemp: d.temperature_2m_max ? Math.round(Number(d.temperature_2m_max[0])) : undefined,
    };
  } catch {
    return null;
  }
}

const SIDEBAR = [
  { id: 'twin', icon: Home, label: 'Digital Twin', sub: 'Farm Overview' },
  { id: 'weather', icon: CloudRain, label: 'Weather Intelligence', sub: 'Live Weather Data' },
  { id: 'soil', icon: Layers, label: 'Intelligent Soil', sub: 'NPK & Moisture' },
  { id: 'lifecycle', icon: Leaf, label: 'Grape Lifecycle', sub: 'Phenology' },
  { id: 'hydrogels', icon: Beaker, label: 'Intelligent Hydrogels', sub: 'Polymer Dynamics' },
  { id: 'mulching', icon: Box, label: 'Smart Mulching', sub: 'Sensor Films' },
  { id: 'simulation', icon: PlayCircle, label: 'Simulation', sub: 'Scenario Analysis' },
  { id: 'predictions', icon: BrainCircuit, label: 'Predictions', sub: 'AI Forecasts' },
  { id: 'analytics', icon: BarChart2, label: 'Analytics', sub: 'Farm Data' },
  { id: 'alerts', icon: AlertTriangle, label: 'Alerts', sub: 'Active Warnings' },
  { id: 'reports', icon: FileText, label: 'Reports', sub: 'Generated Logs' },
  { id: 'settings', icon: Settings, label: 'Settings', sub: 'System Config' },
];

const RAIN_7 = [
  { d: 'Tue', v: 5 }, { d: 'Wed', v: 12 }, { d: 'Thu', v: 8 },
  { d: 'Fri', v: 10 }, { d: 'Sat', v: 15 }, { d: 'Sun', v: 6 }, { d: 'Mon', v: 4 },
];

function Gauge({ value }: { value: number }) {
  const r = 34, c = 2 * Math.PI * r;
  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} stroke="#1e2d40" strokeWidth="8" fill="none" />
        <circle cx="50" cy="50" r={r} stroke="#10b981" strokeWidth="8" fill="none"
          strokeDasharray={c} strokeDashoffset={c - (value / 100) * c} strokeLinecap="round" />
      </svg>
      <span className="absolute text-lg font-bold">{value}%</span>
    </div>
  );
}

function MetricCard({ label, value, sub, good }: { label: string; value: string; sub?: string; good?: boolean }) {
  return (
    <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-3 text-center">
      <div className="text-[10px] text-slate-400 mb-1">{label}</div>
      <div className={`text-lg font-semibold ${good ? 'text-emerald-400' : 'text-white'}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

/* ─── Right column – Farm or Field summary (updates on field click) ─── */
function RightColumn({
  sim,
  selectedField,
  level,
  liveWeather,
}: {
  sim: SimState;
  selectedField: string;
  level: TwinLevel;
  liveWeather: LiveWeatherSummary | null;
}) {
  const field = FIELDS.find((f) => f.id === selectedField) || FIELDS[1];
  const showField = level !== 'farm';
  // Prefer live Weather Intelligence data for summary
  const wxTemp = liveWeather?.temperature ?? sim.env.temperature;
  const wxHum = liveWeather?.humidity ?? sim.env.humidity;
  const wxRain = liveWeather?.rainfall ?? sim.env.rainfall;
  const wxWind = liveWeather?.windKmh ?? sim.env.windSpeed;
  const wxCondition =
    liveWeather?.condition ??
    (sim.weather === 'sun'
      ? 'Clear Sky'
      : sim.weather === 'rain'
        ? 'Rainy'
        : sim.weather === 'night'
          ? 'Clear Night'
          : 'Partly Cloudy');
  const wxMin = liveWeather?.minTemp ?? 21;
  const wxMax = liveWeather?.maxTemp ?? 31;

  return (
    <div className="w-[290px] shrink-0 border-l border-[#1e2d40] bg-[#0b131e] overflow-y-auto p-3 flex flex-col gap-3">
      <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
        <h3 className="text-white text-xs font-bold tracking-wide mb-3 uppercase">
          {showField ? `${field.name} Summary` : 'Farm Summary'}
        </h3>
        <div className="space-y-2.5 text-[11px]">
          {(showField
            ? [
                ['Field', field.name],
                ['Area', `${field.acres} Acres`],
                ['Plant Population', field.plants.toLocaleString()],
                ['Grape Variety', field.variety],
                ['Row Spacing', field.rowSpacing],
                ['Plant Spacing', field.plantSpacing],
                ['Soil Type', field.soilType],
                ['Soil Moisture', `${field.soilMoisture}%`],
                ['Health Index', `${field.health}%`],
                ['Last Irrigation', field.lastIrrigation],
                ['Est. Yield', `${field.yieldEst} t/ac`],
                ['Next Irrigation', sim.irrigationNeed ? 'Required' : 'Not Required'],
              ]
            : [
                ['Total Area', '9.50 Acres'],
                ['Total Plants', '4,320'],
                ['Active Fields', '4'],
                ['Grape Variety', 'Thompson Seedless'],
                ['Average Soil Moisture', `${sim.env.soilMoisture.toFixed(0)}%`],
                ['Crop Health Index', `${sim.healthIndex}%`],
                ['Water Availability', 'Good'],
                ['Next Irrigation', sim.irrigationNeed ? 'Required' : 'Not Required'],
                ['Rainfall Forecast (3 Days)', '18 mm'],
              ]
          ).map(([l, v]) => (
            <div key={l} className="flex justify-between border-b border-[#1e2d40] pb-1.5">
              <span className="text-slate-400">{l}</span>
              <span className={String(v) === 'Good' || String(v) === 'Not Required' ? 'text-emerald-400 font-medium' : String(v) === 'Required' ? 'text-amber-400' : 'text-white'}>{v}</span>
            </div>
          ))}
        </div>
        <button type="button" className="w-full mt-3 py-2 bg-[#0f1722] rounded border border-[#1e2d40] text-slate-300 text-xs hover:bg-[#1c293a]">
          {showField ? 'View Field Report' : 'View Full Summary'}
        </button>
      </div>

      {/* Weather Summary – mirrors Weather Intelligence live data */}
      <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
        <h3 className="text-white text-xs font-bold tracking-wide mb-3 uppercase">Weather Summary</h3>
        {liveWeather?.city && (
          <div className="text-[10px] text-slate-500 mb-2">{liveWeather.city}</div>
        )}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            {/rain/i.test(wxCondition) ? (
              <CloudRain size={32} className="text-blue-400" />
            ) : /cloud/i.test(wxCondition) ? (
              <CloudRain size={32} className="text-slate-300" />
            ) : /night/i.test(wxCondition) ? (
              <Calendar size={32} className="text-indigo-300" />
            ) : (
              <Sun size={32} className="text-amber-400" />
            )}
            <div>
              <div className="text-2xl font-light text-white">{wxTemp}°C</div>
              <div className="text-[10px] text-slate-400 capitalize">{wxCondition}</div>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 text-right space-y-0.5">
            <div>Min <strong className="text-white">{wxMin}°C</strong></div>
            <div>Max <strong className="text-white">{wxMax}°C</strong></div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <div className="bg-[#0f1722] p-2 rounded text-center border border-[#1e2d40]">
            <div className="text-[9px] text-blue-400 mb-0.5">Rainfall (24h)</div>
            <span className="text-xs text-white">{wxRain} mm</span>
          </div>
          <div className="bg-[#0f1722] p-2 rounded text-center border border-[#1e2d40]">
            <div className="text-[9px] text-cyan-400 mb-0.5">Humidity</div>
            <span className="text-xs text-white">{wxHum}%</span>
          </div>
          <div className="bg-[#0f1722] p-2 rounded text-center border border-[#1e2d40]">
            <div className="text-[9px] text-slate-300 mb-0.5">Wind</div>
            <span className="text-xs text-white">{wxWind} km/h</span>
          </div>
        </div>
        <div className="border-t border-[#1e2d40] pt-3">
          <div className="text-[10px] text-slate-400 mb-2">Rainfall Forecast (7 Days) <span className="float-right">(mm)</span></div>
          <div className="flex justify-between items-end h-14">
            {RAIN_7.map((d) => (
              <div key={d.d} className="flex flex-col items-center gap-0.5 w-6">
                <span className="text-[9px] text-white">{d.v}</span>
                <div className="w-full bg-blue-500 rounded-t" style={{ height: `${d.v * 2}px` }} />
                <span className="text-[8px] text-slate-500">{d.d}</span>
              </div>
            ))}
          </div>
        </div>
        <button type="button" className="w-full mt-3 py-2 bg-[#0f1722] rounded border border-[#1e2d40] text-slate-300 text-xs hover:bg-[#1c293a]">
          View Weather Intelligence
        </button>
      </div>

      {/* Recent Alerts */}
      <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-white text-xs font-bold tracking-wide uppercase">Recent Alerts</h3>
          <span className="text-[10px] text-emerald-400 cursor-pointer">View All</span>
        </div>
        <div className="space-y-3">
          {(sim.alerts.length ? sim.alerts : [
            { id: '1', severity: 'high' as const, title: 'High temperature expected', field: 'Field B', age: '10 min ago' },
            { id: '2', severity: 'medium' as const, title: 'Low nitrogen in Zone B2', field: 'Field B', age: '35 min ago' },
            { id: '3', severity: 'low' as const, title: 'Rainfall expected in 18 hrs', field: 'Farm', age: '1 hr ago' },
          ]).slice(0, 3).map((a) => (
            <div key={a.id} className="flex gap-2">
              <AlertTriangle size={14} className={
                a.severity === 'high' ? 'text-rose-500' : a.severity === 'medium' ? 'text-amber-500' : 'text-blue-400'
              } />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between gap-2">
                  <span className="text-[11px] text-white truncate">{a.title}</span>
                  <span className="text-[9px] text-slate-500 shrink-0">{a.age}</span>
                </div>
                <div className="text-[10px] text-slate-400">{a.field}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Separate pages ─── */

function SimulationPage({ sim, setSim, isPlaying, setIsPlaying }: {
  sim: SimState; setSim: any; mode?: 'auto' | 'manual'; setMode?: any; isPlaying: boolean; setIsPlaying: any;
}) {
  return (
    <SimulationHub
      sim={sim}
      setSim={setSim}
      isPlaying={isPlaying}
      setIsPlaying={setIsPlaying}
    />
  );
}

function PredictionsPage({ sim }: { sim: SimState }) {
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0b131e]">
      <h2 className="text-xl font-bold mb-1 flex items-center gap-2"><BrainCircuit className="text-violet-400" /> Predictions & Insights</h2>
      <p className="text-xs text-slate-400 mb-6">AI forecasts driven by current simulation state</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-5 space-y-3">
          <h3 className="text-sm font-bold text-violet-300">AI Predictions</h3>
          {[
            ['Final Yield Prediction', `${sim.yieldTons} tons/acre`, 'High Confidence'],
            ['Harvest Date (Est.)', '18 Aug 2025', '± 5 Days'],
            ['Disease Risk', sim.env.humidity > 75 ? 'Moderate' : 'Low', ''],
            ['Irrigation Need', sim.irrigationNeed ? 'Required' : 'Not Required', sim.irrigationNeed ? '20 mm' : ''],
            ['Nutrient Recommendation', sim.env.potassium < 70 ? 'High Potassium' : 'Balanced', ''],
          ].map(([l, v, s]) => (
            <div key={l} className="flex justify-between items-start border-b border-[#1e2d40] pb-2">
              <span className="text-[11px] text-slate-400">{l}</span>
              <div className="text-right">
                <div className="text-[12px] text-white font-medium">{v}</div>
                {s && <div className="text-[10px] text-emerald-400">{s}</div>}
              </div>
            </div>
          ))}
        </div>
        <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-5 space-y-3">
          <h3 className="text-sm font-bold text-emerald-300">AI Insights & Recommendations</h3>
          <ul className="space-y-2 text-[12px] text-slate-300">
            <li className="flex gap-2"><span className="text-emerald-400">●</span> Maintain soil moisture between 50–70% for optimal berry size.</li>
            <li className="flex gap-2"><span className="text-emerald-400">●</span> Apply Potassium (K) in next 2–3 days to improve sugar content.</li>
            <li className="flex gap-2"><span className="text-emerald-400">●</span> Hydrogel efficiency is optimal. No change required.</li>
            <li className="flex gap-2"><span className="text-emerald-400">●</span> Mulch coverage is good. Maintain around 80%.</li>
            <li className="flex gap-2"><span className="text-amber-400">●</span> Monitor for Powdery Mildew during ripening stage.</li>
            <li className="flex gap-2"><span className="text-emerald-400">●</span> Pruning recommended after harvest for better yield.</li>
          </ul>
          <div className="grid grid-cols-2 gap-2 pt-3">
            {['Irrigation Plan', 'Nutrient Plan', 'Hydrogel Plan', 'View Reports'].map((b) => (
              <button key={b} type="button" className="py-2 rounded-lg border border-[#1e2d40] text-[11px] text-slate-300 hover:bg-[#1c293a]">
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GenericPage({ title, icon: Icon, sub, sim }: { title: string; icon: any; sub: string; sim: SimState }) {
  return (
    <div className="flex-1 overflow-y-auto p-6 bg-[#0b131e]">
      <h2 className="text-xl font-bold mb-1 flex items-center gap-2"><Icon className="text-emerald-400" /> {title}</h2>
      <p className="text-xs text-slate-400 mb-6">{sub} · Linked to shared simulation state (Day {sim.day})</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricCard label="Soil Moisture" value={`${sim.env.soilMoisture.toFixed(0)}%`} />
        <MetricCard label="Hydrogel Sat." value={`${sim.env.hydrogelSat.toFixed(0)}%`} />
        <MetricCard label="Health Index" value={`${sim.healthIndex}%`} good />
        <MetricCard label="Yield Forecast" value={`${sim.yieldTons} t/ac`} good />
      </div>
      <div className="bg-[#16202d] rounded-xl border border-[#1e2d40] p-8 text-center text-slate-500">
        <Icon size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">{title} panel</p>
        <p className="text-xs mt-1 opacity-60">Telemetry bound to the Digital Twin simulation engine</p>
      </div>
    </div>
  );
}

function AlertsPage({ sim }: { sim: SimState }) {
  return <AlertsPanel sim={sim} />;
}

/* ─── App ─── */
export default function App() {
  const [activeTab, setActiveTab] = useState('twin');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const [sim, setSim] = useState<SimState>(() => createInitialState(0));
  const [isPlaying, setIsPlaying] = useState(false);
  const [level, setLevel] = useState<TwinLevel>('farm');
  const [selectedField, setSelectedField] = useState('B');
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [fieldSoilMap, setFieldSoilMap] = useState<Record<string, import('./simulation').SoilClassId>>({
    A: 'red',
    B: 'black',
    C: 'alluvial',
    D: 'lateritic',
  });
  const setFieldSoil = useCallback((fieldId: string, soilId: import('./simulation').SoilClassId) => {
    setFieldSoilMap((prev) => ({ ...prev, [fieldId]: soilId }));
  }, []);
  const [fieldVarietyMap, setFieldVarietyMap] = useState<Record<string, import('./simulation').GrapeVarietyId>>({
    A: 'sharad',
    B: 'tas_a_ganesh',
    C: 'thompson',
    D: 'manjari_naveen',
  });
  const setFieldVariety = useCallback((fieldId: string, varietyId: import('./simulation').GrapeVarietyId) => {
    setFieldVarietyMap((prev) => ({ ...prev, [fieldId]: varietyId }));
  }, []);
  const activeFieldSoil = fieldSoilMap[selectedField] || 'alluvial';
  const [liveWeather, setLiveWeather] = useState<LiveWeatherSummary | null>(null);
  const [showNotif, setShowNotif] = useState(false);

  /** Overall farm notifications for the header bell */
  const farmNotifications = useMemo(() => {
    type N = { id: string; severity: 'critical' | 'high' | 'medium' | 'low' | 'info'; title: string; field: string; age: string; detail?: string };
    const list: N[] = [];
    const env = sim.env;
    let i = 0;
    const push = (n: Omit<N, 'id'>) => list.push({ ...n, id: `fn-${++i}` });

    if (env.temperature >= 34) {
      push({ severity: env.temperature >= 38 ? 'critical' : 'high', title: `Heat stress — ${env.temperature}°C`, field: 'Farm-wide', age: 'Just now', detail: 'Above safe canopy band' });
    } else if (env.temperature >= 31) {
      push({ severity: 'medium', title: `Warm conditions — ${env.temperature}°C`, field: 'Farm-wide', age: '4 min ago' });
    } else {
      push({ severity: 'info', title: `Temp optimal — ${env.temperature}°C`, field: 'Farm-wide', age: '2 min ago' });
    }

    if (env.humidity >= 80) {
      push({ severity: 'high', title: `High humidity ${env.humidity}% — disease window`, field: 'Farm-wide', age: '8 min ago' });
    } else if (env.humidity >= 70) {
      push({ severity: 'medium', title: `Elevated humidity ${env.humidity}%`, field: 'Farm-wide', age: '11 min ago' });
    }

    if (env.rainfall >= 12) {
      push({ severity: 'high', title: `Heavy rain ${env.rainfall.toFixed(1)} mm`, field: 'Farm-wide', age: '5 min ago' });
    } else if (env.rainfall < 0.5) {
      push({ severity: 'info', title: 'Dry weather — irrigation dependent', field: 'Farm-wide', age: '9 min ago' });
    }

    if (env.soilMoisture < 48) {
      push({ severity: env.soilMoisture < 40 ? 'critical' : 'high', title: `Farm soil moisture low (${env.soilMoisture.toFixed(0)}%)`, field: 'Farm-wide', age: '7 min ago' });
    } else {
      push({ severity: 'info', title: `Soil moisture on target (${Number(env.soilMoisture).toFixed(0)}%)`, field: 'Farm-wide', age: '3 min ago' });
    }

    if (sim.stressHeat > 0.25) {
      push({ severity: sim.stressHeat > 0.45 ? 'high' : 'medium', title: `Heat stress index ${(sim.stressHeat * 100).toFixed(0)}%`, field: 'Farm-wide', age: '6 min ago' });
    }
    if (sim.stressWater > 0.2) {
      push({ severity: sim.stressWater > 0.4 ? 'high' : 'medium', title: `Water stress index ${(sim.stressWater * 100).toFixed(0)}%`, field: 'Farm-wide', age: '9 min ago' });
    }
    if (env.nitrogen < 60) {
      push({ severity: 'medium', title: `Nitrogen below target (N ${Math.round(env.nitrogen)})`, field: 'Farm-wide', age: '28 min ago' });
    }
    if (env.hydrogelSat < 50) {
      push({ severity: 'medium', title: `Hydrogel low (${Math.round(env.hydrogelSat)}%)`, field: 'Farm-wide', age: '40 min ago' });
    }

    // Roll up field issues into farm-level lines
    for (const f of FIELDS) {
      if (f.soilMoisture < 50) {
        push({
          severity: f.soilMoisture < 42 ? 'critical' : 'high',
          title: `${f.name}: low moisture ${f.soilMoisture}%`,
          field: f.name,
          age: '12 min ago',
        });
      }
      if (f.health < 80) {
        push({
          severity: f.health < 72 ? 'high' : 'medium',
          title: `${f.name}: health ${f.health}/100`,
          field: f.name,
          age: '20 min ago',
        });
      }
    }

    // Include engine alerts
    for (const a of sim.alerts || []) {
      if (list.some((x) => x.title.toLowerCase().includes(a.title.toLowerCase().slice(0, 12)))) continue;
      push({
        severity: a.severity === 'high' ? 'high' : a.severity === 'medium' ? 'medium' : 'low',
        title: a.title,
        field: a.field,
        age: a.age,
      });
    }

    push({
      severity: 'info',
      title: `Stage: ${sim.stage.replace(/_/g, ' ')} · day ${sim.day}`,
      field: 'Farm-wide',
      age: '1 min ago',
    });

    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
    return list.sort((a, b) => order[a.severity] - order[b.severity]);
  }, [
    sim.env.temperature,
    sim.env.humidity,
    sim.env.rainfall,
    sim.env.soilMoisture,
    sim.env.nitrogen,
    sim.env.hydrogelSat,
    sim.stressHeat,
    sim.stressWater,
    sim.alerts,
    sim.stage,
    sim.day,
  ]);

  // Load live weather for Weather Summary (same city/source as Weather Intelligence)
  useEffect(() => {
    let cancelled = false;
    fetchSummaryWeather().then((w) => {
      if (!cancelled && w) setLiveWeather(w);
    });
    const id = window.setInterval(() => {
      fetchSummaryWeather().then((w) => {
        if (!cancelled && w) setLiveWeather(w);
      });
    }, 10 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  // Global playback for tabs that don't own their own timer
  useEffect(() => {
    if (!isPlaying) return;
    // SimulationHub and DigitalTwinMap run their own intervals
    if (activeTab === 'simulation' || activeTab === 'twin') return;
    const varietyId = fieldVarietyMap[selectedField] || 'thompson';
    const id = window.setInterval(() => {
      setSim((prev) => {
        if (prev.day >= 150) {
          setIsPlaying(false);
          return prev;
        }
        return stepSimulation(prev, undefined, undefined, varietyId);
      });
    }, 600);
    return () => window.clearInterval(id);
  }, [isPlaying, activeTab, fieldVarietyMap, selectedField]);

  return (
    <div className="flex h-screen w-screen bg-[#060B12] text-white overflow-hidden">
      {/* Sidebar */}
      {showSidebar && (
        <aside className="w-56 shrink-0 bg-[#0f1722] border-r border-[#1e2d40] flex flex-col z-30">
          <div className="h-14 flex items-center gap-2.5 px-4 border-b border-[#1e2d40]">
            <div className="w-7 h-7 rounded-md bg-emerald-900/50 flex items-center justify-center border border-emerald-500/40 text-sm">🍇</div>
            <div>
              <div className="font-bold text-[12px] tracking-wide leading-tight">APOLLO AGRIVERSE</div>
              <div className="text-[8px] text-slate-400 uppercase tracking-widest">Digital Twin System</div>
            </div>
          </div>
          <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
            {SIDEBAR.map((item) => {
              const on = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-left transition ${
                    on ? 'bg-emerald-900/25 border border-emerald-500/30' : 'border border-transparent hover:bg-[#16202d]'
                  }`}
                >
                  <item.icon size={16} className={on ? 'text-emerald-400' : 'text-slate-400'} />
                  <div className="min-w-0">
                    <div className={`text-[12px] truncate ${on ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>{item.label}</div>
                    <div className="text-[9px] text-slate-500 truncate">{item.sub}</div>
                  </div>
                </button>
              );
            })}
          </nav>
          <div className="p-4 border-t border-[#1e2d40] flex flex-col items-center">
            <div className="w-full text-left mb-2">
              <span className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">Farm Status</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Heart size={12} className="text-emerald-400" />
                <span className="text-emerald-400 font-bold text-xs">Healthy</span>
              </div>
            </div>
            <Gauge value={sim.healthIndex} />
          </div>
        </aside>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 shrink-0 bg-[#0f1722]/95 border-b border-[#1e2d40] flex items-center justify-between px-3 z-20">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowSidebar((v) => !v)}
              className="rounded-lg border border-[#1e2d40] bg-[#16202d] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:text-emerald-300 flex items-center gap-1">
              <PanelLeft size={12} /> {showSidebar ? 'Hide' : 'Show'} panels
            </button>
            <button type="button" onClick={() => setShowRight((v) => !v)}
              className="rounded-lg border border-[#1e2d40] bg-[#16202d] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:text-emerald-300">
              {showRight ? 'Hide' : 'Show'} summary
            </button>
            {activeTab === 'twin' && (
              <span className="text-[11px] text-slate-400 ml-2 hidden sm:inline">
                1. DIGITAL TWIN – {level === 'farm' ? 'FARM OVERVIEW' : level === 'field' ? 'FIELD VIEW' : level === 'plant' ? 'PLANT VIEW' : 'SOIL & HYDROGELS'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1"><CloudRain size={14} className="text-blue-400" /> {sim.env.temperature}°C</span>
            <span className="flex items-center gap-1"><Droplets size={14} className="text-cyan-400" /> {sim.env.humidity}% Hum</span>
            <span className="h-4 w-px bg-[#1e2d40]" />
            <span className="flex items-center gap-1 text-slate-300"><Calendar size={14} /> 20 May 2025</span>
            <span className="h-4 w-px bg-[#1e2d40]" />

            {/* Notification bell — overall farm alerts */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowNotif((v) => !v)}
                className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-[#1e2d40] bg-[#16202d] text-slate-300 hover:text-violet-300 hover:border-violet-500/40 transition"
                aria-label="Farm notifications"
              >
                <Bell size={15} />
                {farmNotifications.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-lg shadow-rose-500/40">
                    {farmNotifications.length > 9 ? '9+' : farmNotifications.length}
                  </span>
                )}
              </button>

              {showNotif && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotif(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-[22rem] rounded-xl border border-[#1e2d40] bg-[#121a27] shadow-2xl shadow-black/50 overflow-hidden">
                    <div className="flex items-center justify-between border-b border-[#1e2d40] px-3 py-2.5 bg-gradient-to-r from-rose-500/10 via-violet-500/5 to-transparent">
                      <div>
                        <div className="text-[11px] font-bold text-white tracking-wide">FARM ALERTS</div>
                        <div className="text-[9px] text-slate-500">Overall twin · weather · soil · fields</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => { setShowNotif(false); setActiveTab('alerts'); }}
                        className="text-[10px] text-violet-300 hover:text-violet-200 font-semibold"
                      >
                        View all
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {farmNotifications.slice(0, 8).map((a) => (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => { setShowNotif(false); setActiveTab('alerts'); }}
                          className="flex w-full gap-2.5 border-b border-[#1e2d40]/50 px-3 py-2.5 text-left hover:bg-[#16202d] transition"
                        >
                          <AlertTriangle
                            size={14}
                            className={`mt-0.5 shrink-0 ${
                              a.severity === 'critical' || a.severity === 'high'
                                ? 'text-rose-400'
                                : a.severity === 'medium'
                                  ? 'text-amber-400'
                                  : a.severity === 'low'
                                    ? 'text-sky-400'
                                    : 'text-violet-400'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span
                                className={`text-[8px] font-bold uppercase px-1 py-0.5 rounded border ${
                                  a.severity === 'critical' || a.severity === 'high'
                                    ? 'text-rose-300 border-rose-500/30 bg-rose-500/10'
                                    : a.severity === 'medium'
                                      ? 'text-amber-300 border-amber-500/30 bg-amber-500/10'
                                      : a.severity === 'low'
                                        ? 'text-sky-300 border-sky-500/30 bg-sky-500/10'
                                        : 'text-violet-300 border-violet-500/30 bg-violet-500/10'
                                }`}
                              >
                                {a.severity}
                              </span>
                            </div>
                            <div className="text-[11px] text-white font-medium leading-snug">{a.title}</div>
                            <div className="text-[9px] text-slate-500 mt-0.5">{a.field} · {a.age}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="border-t border-[#1e2d40] px-3 py-2 bg-[#0b131e] flex items-center justify-between">
                      <span className="text-[9px] text-slate-500">{farmNotifications.length} farm alerts</span>
                      <button
                        type="button"
                        onClick={() => { setShowNotif(false); setActiveTab('alerts'); }}
                        className="text-[10px] font-semibold text-violet-300 hover:text-violet-200"
                      >
                        Open Alert Command →
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 flex min-h-0 overflow-hidden">
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {activeTab === 'twin' && (
              <DigitalTwinMap
                sim={sim}
                setSim={setSim}
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
                level={level}
                setLevel={setLevel}
                selectedField={selectedField}
                setSelectedField={setSelectedField}
                mode={mode}
                setMode={setMode}
                fieldSoilMap={fieldSoilMap}
                setFieldSoil={setFieldSoil}
                fieldVarietyMap={fieldVarietyMap}
                setFieldVariety={setFieldVariety}
              />
            )}
            {activeTab === 'lifecycle' && (
              <LifecyclePanel
                sim={sim}
                varietyId={fieldVarietyMap[selectedField] || 'thompson'}
              />
            )}
            {activeTab === 'simulation' && (
              <SimulationPage sim={sim} setSim={setSim} isPlaying={isPlaying} setIsPlaying={setIsPlaying} />
            )}
            {activeTab === 'predictions' && <PredictionsPanel sim={sim} />}
            {activeTab === 'alerts' && <AlertsPage sim={sim} />}
            {activeTab === 'weather' && <WeatherPanel onLiveWeather={setLiveWeather} />}
            {activeTab === 'soil' && (
              <SoilPanel
                soilClass={activeFieldSoil}
                setSoilClass={(id) => setFieldSoil(selectedField, id)}
                fieldSoilMap={fieldSoilMap}
                setFieldSoil={setFieldSoil}
                selectedField={selectedField}
                setSelectedField={setSelectedField}
              />
            )}
            {activeTab === 'hydrogels' && (
              <HydrogelPanel
                sim={sim}
                soilClass={activeFieldSoil}
                setSoilClass={(id) => setFieldSoil(selectedField, id)}
                fieldSoilMap={fieldSoilMap}
                setFieldSoil={setFieldSoil}
                selectedField={selectedField}
                setSelectedField={setSelectedField}
              />
            )}
            {activeTab === 'mulching' && <MulchingPanel sim={sim} />}
            {activeTab === 'analytics' && (
              <AnalyticsPanel
                sim={sim}
                fieldVarietyMap={fieldVarietyMap}
                fieldSoilMap={fieldSoilMap}
              />
            )}
            {activeTab === 'reports' && <ReportsPanel sim={sim} />}
            {activeTab === 'settings' && (
              <SettingsPanel
                sim={sim}
                setSim={setSim}
                mode={mode}
                setMode={setMode}
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
              />
            )}
          </div>
          {showRight && activeTab !== 'weather' && activeTab !== 'soil' && activeTab !== 'simulation' && (
            <RightColumn sim={sim} selectedField={selectedField} level={level} liveWeather={liveWeather} />
          )}
        </div>
      </div>
    </div>
  );
}
