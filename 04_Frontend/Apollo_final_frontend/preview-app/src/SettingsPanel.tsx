import { useEffect, useState } from 'react';
import {
  Settings, Save, RotateCcw, Bell, BellOff, Monitor, MapPin, CloudRain,
  Leaf, Beaker, Gauge, Shield, Smartphone, Moon, Sun, Volume2,
  Wifi, Database, User, Factory, Droplets, Thermometer, CheckCircle2,
  Layers, Zap, Eye, Lock, Globe, Cpu, Sparkles, ChevronRight,
  Activity, Radio, RefreshCw, Server,
} from 'lucide-react';
import type { SimState } from './simulation';
import { useFarmOptional } from './context/FarmContext';

type Units = 'metric' | 'imperial';
type ThemeMode = 'dark' | 'oled' | 'midnight';
type Language = 'en' | 'hi' | 'mr';

export type AppSettings = {
  farmName: string;
  operator: string;
  region: string;
  district: string;
  cropDefault: string;
  /** Backend evaluate identity */
  farmId: string;
  regionId: string;
  soilId: string;
  waterAvailability: string;
  city: string;
  latitude: number;
  longitude: number;
  units: Units;
  language: Language;
  theme: ThemeMode;
  autoPlay: boolean;
  simSpeed: number;
  notifyCritical: boolean;
  notifyWeather: boolean;
  notifyIrrigation: boolean;
  notifyMarket: boolean;
  notifySound: boolean;
  emailDigest: boolean;
  mapLabels: boolean;
  showGrid: boolean;
  reduceMotion: boolean;
  dataRefreshSec: number;
  diseaseThreshold: number;
  moistureMin: number;
  moistureMax: number;
  heatAlertC: number;
  humidityAlert: number;
  apiLiveWeather: boolean;
  apiMarket: boolean;
  offlineCache: boolean;
};

const DEFAULTS: AppSettings = {
  farmName: 'Apollo Agriverse Demo Farm',
  operator: 'Farm Manager',
  region: 'Maharashtra',
  district: 'Nashik',
  cropDefault: 'Grape (Thompson / Flame)',
  farmId: 'FARM_MH_NASHIK_01',
  regionId: 'REG_0002',
  soilId: 'SOIL_00001',
  waterAvailability: 'medium',
  city: 'Nashik',
  latitude: 19.9975,
  longitude: 73.7898,
  units: 'metric',
  language: 'en',
  theme: 'dark',
  autoPlay: false,
  simSpeed: 1,
  notifyCritical: true,
  notifyWeather: true,
  notifyIrrigation: true,
  notifyMarket: false,
  notifySound: false,
  emailDigest: true,
  mapLabels: true,
  showGrid: false,
  reduceMotion: false,
  dataRefreshSec: 60,
  diseaseThreshold: 25,
  moistureMin: 48,
  moistureMax: 75,
  heatAlertC: 34,
  humidityAlert: 80,
  apiLiveWeather: true,
  apiMarket: true,
  offlineCache: true,
};

const STORAGE_KEY = 'agriverse-settings-v1';

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULTS };
}

type Props = {
  sim: SimState;
  setSim?: React.Dispatch<React.SetStateAction<SimState>>;
  mode?: 'auto' | 'manual';
  setMode?: (m: 'auto' | 'manual') => void;
  isPlaying?: boolean;
  setIsPlaying?: (v: boolean) => void;
};

export default function SettingsPanel({
  sim,
  setSim,
  mode = 'auto',
  setMode,
  isPlaying = false,
  setIsPlaying,
}: Props) {
  const [cfg, setCfg] = useState<AppSettings>(() => loadSettings());
  const [savedFlash, setSavedFlash] = useState(false);
  const [section, setSection] = useState<'farm' | 'sim' | 'alerts' | 'display' | 'data' | 'account'>('farm');
  const farmCtx = useFarmOptional();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    } catch {
      /* ignore */
    }
  }, [cfg]);

  const patch = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setCfg((c) => ({ ...c, [key]: value }));
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
    // Push farm identity into shared FarmContext → triggers weather + evaluate
    if (farmCtx) {
      const next = {
        farm_id: cfg.farmId,
        region_id: cfg.regionId,
        soil_id: cfg.soilId,
        water_availability: cfg.waterAvailability,
        latitude: cfg.latitude,
        longitude: cfg.longitude,
        city: cfg.city,
        farmName: cfg.farmName,
      };
      farmCtx.saveFarm({ ...farmCtx.farm, ...next });
      void farmCtx.refreshAll();
    }
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  };

  const reset = () => {
    setCfg({ ...DEFAULTS });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULTS));
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  };

  const enabledAlerts = [
    cfg.notifyCritical,
    cfg.notifyWeather,
    cfg.notifyIrrigation,
    cfg.notifyMarket,
    cfg.notifySound,
    cfg.emailDigest,
  ].filter(Boolean).length;

  const Toggle = ({
    on,
    onChange,
    label,
    hint,
    accent = 'violet',
  }: {
    on: boolean;
    onChange: (v: boolean) => void;
    label: string;
    hint?: string;
    accent?: 'violet' | 'emerald' | 'rose' | 'sky' | 'amber';
  }) => {
    const ring =
      accent === 'emerald'
        ? 'border-emerald-500/40 bg-emerald-500/10'
        : accent === 'rose'
          ? 'border-rose-500/40 bg-rose-500/10'
          : accent === 'sky'
            ? 'border-sky-500/40 bg-sky-500/10'
            : accent === 'amber'
              ? 'border-amber-500/40 bg-amber-500/10'
              : 'border-violet-500/40 bg-violet-500/10';
    const knob = accent === 'emerald' ? 'bg-emerald-500' : accent === 'rose' ? 'bg-rose-500' : accent === 'sky' ? 'bg-sky-500' : accent === 'amber' ? 'bg-amber-500' : 'bg-violet-500';
    return (
      <button
        type="button"
        onClick={() => onChange(!on)}
        className={`group flex w-full items-center justify-between gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-200 ${
          on ? `${ring} shadow-lg shadow-black/20` : 'border-[#1e2d40] bg-[#0b131e]/50 hover:border-slate-600 hover:bg-[#121a27]'
        }`}
      >
        <div className="min-w-0">
          <div className={`text-[12px] font-semibold ${on ? 'text-white' : 'text-slate-300'}`}>{label}</div>
          {hint && <div className="text-[9px] text-slate-500 mt-0.5 leading-snug">{hint}</div>}
        </div>
        <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${on ? knob : 'bg-slate-700'}`}>
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 ${
              on ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </span>
      </button>
    );
  };

  const Slider = ({
    label,
    value,
    min,
    max,
    step = 1,
    unit = '',
    onChange,
    color = '#8b5cf6',
  }: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    onChange: (n: number) => void;
    color?: string;
  }) => {
    const pct = ((value - min) / (max - min)) * 100;
    return (
      <div className="rounded-2xl border border-[#1e2d40] bg-gradient-to-br from-[#141c2a] to-[#0d1420] px-3.5 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-slate-300">{label}</span>
          <span
            className="text-[12px] font-bold tabular-nums px-2 py-0.5 rounded-lg border border-[#2a3a52] bg-[#0b131e]"
            style={{ color }}
          >
            {value}
            {unit}
          </span>
        </div>
        <div className="relative h-2 rounded-full bg-[#0b131e] overflow-hidden border border-[#1e2d40]/80">
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-150"
            style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full mt-1.5 accent-violet-500 h-1.5 cursor-pointer"
        />
        <div className="flex justify-between text-[8px] text-slate-600 mt-0.5">
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
  };

  const nav: {
    id: typeof section;
    icon: typeof Settings;
    label: string;
    sub: string;
    tint: string;
  }[] = [
    { id: 'farm', icon: Factory, label: 'Farm profile', sub: 'Identity & crop', tint: 'from-emerald-500/20 to-transparent' },
    { id: 'sim', icon: Cpu, label: 'Simulation', sub: 'Twin engine', tint: 'from-violet-500/20 to-transparent' },
    { id: 'alerts', icon: Bell, label: 'Alerts', sub: 'Notify & limits', tint: 'from-rose-500/20 to-transparent' },
    { id: 'display', icon: Monitor, label: 'Display', sub: 'Theme & units', tint: 'from-sky-500/20 to-transparent' },
    { id: 'data', icon: Database, label: 'Data & APIs', sub: 'Live feeds', tint: 'from-amber-500/20 to-transparent' },
    { id: 'account', icon: User, label: 'Account', sub: 'Session', tint: 'from-fuchsia-500/20 to-transparent' },
  ];

  const inputCls =
    'w-full bg-[#0b131e] border border-[#1e2d40] rounded-xl text-[12px] text-slate-100 px-3.5 py-2.5 outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30 placeholder:text-slate-600 transition';
  const labelCls = 'text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1';

  return (
    <div className="h-full min-h-0 overflow-y-auto overflow-x-hidden bg-[#080d14]">
      <div className="p-3 sm:p-4 space-y-4">
        {/* ── Hero ── */}
        <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-[#0c121c]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-24 -right-16 h-64 w-64 rounded-full bg-violet-600/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-10 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />
          </div>

          <div className="relative p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/40 via-violet-600/20 to-sky-500/20 border border-violet-400/30 shadow-[0_0_40px_rgba(139,92,246,0.25)]">
                    <Settings className="text-violet-100" size={24} />
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 border-2 border-[#0c121c]">
                    <Sparkles size={10} className="text-white" />
                  </span>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-violet-300/80 mb-0.5">
                    Control center
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                    System{' '}
                    <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-sky-300 bg-clip-text text-transparent">
                      Settings
                    </span>
                  </h1>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-md">
                    Tune farm identity, twin behaviour, alert thresholds, and live data — saved on this device.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {savedFlash && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold text-emerald-300 animate-pulse">
                    <CheckCircle2 size={13} /> Saved
                  </span>
                )}
                <button
                  type="button"
                  onClick={reset}
                  className="text-[11px] font-semibold px-3 py-2 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 hover:bg-white/5 transition flex items-center gap-1.5"
                >
                  <RotateCcw size={13} /> Reset
                </button>
                <button
                  type="button"
                  onClick={save}
                  className="text-[11px] font-semibold px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-600/30 flex items-center gap-1.5 transition"
                >
                  <Save size={13} /> Save
                </button>
              </div>
            </div>

            {/* Status strip */}
            <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {[
                { icon: <Activity size={13} className="text-emerald-400" />, l: 'Twin health', v: String(sim.healthIndex), sub: 'index' },
                { icon: <Leaf size={13} className="text-lime-400" />, l: 'Stage', v: sim.stage.replace(/_/g, ' '), sub: `day ${sim.day}` },
                { icon: <Cpu size={13} className="text-violet-400" />, l: 'Mode', v: mode, sub: isPlaying ? 'playing' : 'paused' },
                { icon: <Bell size={13} className="text-rose-400" />, l: 'Notify', v: `${enabledAlerts}/6`, sub: 'channels' },
                { icon: <Thermometer size={13} className="text-orange-400" />, l: 'Heat alert', v: `${cfg.heatAlertC}°C`, sub: 'threshold' },
                { icon: <Wifi size={13} className="text-sky-400" />, l: 'Refresh', v: `${cfg.dataRefreshSec}s`, sub: 'interval' },
              ].map((c) => (
                <div
                  key={c.l}
                  className="rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur px-3 py-2.5 hover:bg-white/[0.05] transition"
                >
                  <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                    {c.icon} {c.l}
                  </div>
                  <div className="text-[13px] font-bold text-white mt-1 truncate capitalize">{c.v}</div>
                  <div className="text-[9px] text-slate-500">{c.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Nav rail */}
          <div className="lg:col-span-3">
            <div className="rounded-3xl border border-white/5 bg-[#0c121c] p-2 space-y-1 sticky top-3">
              {nav.map((n) => {
                const Icon = n.icon;
                const on = section === n.id;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => setSection(n.id)}
                    className={`relative flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition-all duration-200 overflow-hidden ${
                      on
                        ? 'bg-gradient-to-r from-violet-600/25 to-fuchsia-600/10 border border-violet-500/30 shadow-lg shadow-violet-900/20'
                        : 'border border-transparent hover:bg-white/[0.03] hover:border-white/5'
                    }`}
                  >
                    {on && <div className={`absolute inset-0 bg-gradient-to-r ${n.tint} pointer-events-none`} />}
                    <div
                      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${
                        on
                          ? 'bg-violet-500/20 border-violet-400/40 text-violet-200'
                          : 'bg-[#0b131e] border-[#1e2d40] text-slate-400'
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="relative min-w-0 flex-1">
                      <div className={`text-[12px] font-semibold ${on ? 'text-white' : 'text-slate-300'}`}>{n.label}</div>
                      <div className="text-[9px] text-slate-500">{n.sub}</div>
                    </div>
                    {on && <ChevronRight size={14} className="relative text-violet-300 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Panels */}
          <div className="lg:col-span-9 space-y-4">
            {section === 'farm' && (
              <>
                <div className="rounded-3xl border border-white/5 bg-[#0c121c] overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30">
                      <MapPin size={14} className="text-emerald-300" />
                    </div>
                    <div>
                      <div className="text-[12px] font-bold text-white">Farm identity</div>
                      <div className="text-[9px] text-slate-500">Shown across reports and alerts</div>
                    </div>
                  </div>
                  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(
                      [
                        { key: 'farmName' as const, label: 'Farm name', icon: Factory },
                        { key: 'operator' as const, label: 'Operator', icon: User },
                        { key: 'region' as const, label: 'State / region', icon: Globe },
                        { key: 'district' as const, label: 'District / belt', icon: MapPin },
                      ] as const
                    ).map((f) => (
                      <div key={f.key}>
                        <div className={labelCls}>
                          <f.icon size={10} /> {f.label}
                        </div>
                        <input
                          className={inputCls}
                          value={cfg[f.key]}
                          onChange={(e) => patch(f.key, e.target.value)}
                        />
                      </div>
                    ))}
                    <div className="sm:col-span-2">
                      <div className={labelCls}>
                        <Leaf size={10} /> Default crop focus
                      </div>
                      <input
                        className={inputCls}
                        value={cfg.cropDefault}
                        onChange={(e) => patch('cropDefault', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-violet-500/20 bg-[#0c121c] overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-violet-500/10 via-transparent to-transparent flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/30">
                        <Server size={14} className="text-violet-300" />
                      </div>
                      <div>
                        <div className="text-[12px] font-bold text-white">Backend farm profile</div>
                        <div className="text-[9px] text-slate-500">
                          Drives POST /api/evaluate and GET /weather · {farmCtx?.apiBase || 'API'}
                        </div>
                      </div>
                    </div>
                    {farmCtx && (
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded border ${
                          farmCtx.apiStatus === 'ok'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : farmCtx.apiStatus === 'degraded'
                              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {farmCtx.apiStatus === 'ok'
                          ? 'API ok'
                          : farmCtx.apiStatus === 'degraded'
                            ? 'Degraded'
                            : farmCtx.apiStatus === 'down'
                              ? 'Down'
                              : 'Unknown'}
                      </span>
                    )}
                  </div>
                  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(
                      [
                        { key: 'farmId' as const, label: 'Farm ID' },
                        { key: 'regionId' as const, label: 'Region ID' },
                        { key: 'soilId' as const, label: 'Soil ID' },
                        { key: 'city' as const, label: 'City (weather)' },
                      ] as const
                    ).map((f) => (
                      <div key={f.key}>
                        <div className={labelCls}>{f.label}</div>
                        <input
                          className={inputCls}
                          value={cfg[f.key]}
                          onChange={(e) => patch(f.key, e.target.value)}
                        />
                      </div>
                    ))}
                    <div>
                      <div className={labelCls}>Water availability</div>
                      <select
                        className={inputCls}
                        value={cfg.waterAvailability}
                        onChange={(e) => patch('waterAvailability', e.target.value)}
                      >
                        <option value="low">low</option>
                        <option value="medium">medium</option>
                        <option value="high">high</option>
                      </select>
                    </div>
                    <div>
                      <div className={labelCls}>Latitude</div>
                      <input
                        className={inputCls}
                        type="number"
                        step="0.0001"
                        value={cfg.latitude}
                        onChange={(e) => patch('latitude', Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <div className={labelCls}>Longitude</div>
                      <input
                        className={inputCls}
                        type="number"
                        step="0.0001"
                        value={cfg.longitude}
                        onChange={(e) => patch('longitude', Number(e.target.value))}
                      />
                    </div>
                    <div className="sm:col-span-2 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          save();
                        }}
                        className="flex items-center gap-1.5 text-[11px] px-3 py-2 rounded-lg border border-violet-500/40 bg-violet-500/10 text-violet-200"
                      >
                        <Save size={12} /> Save & refresh APIs
                      </button>
                      {farmCtx && (
                        <button
                          type="button"
                          onClick={() => void farmCtx.refreshAll()}
                          className="flex items-center gap-1.5 text-[11px] px-3 py-2 rounded-lg border border-[#1e2d40] text-slate-300"
                        >
                          <RefreshCw size={12} /> Re-check health
                        </button>
                      )}
                      {farmCtx && (
                        <span className="text-[10px] text-slate-500 self-center">
                          {farmCtx.healthMessage}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { icon: Leaf, color: 'text-emerald-300', bg: 'from-emerald-500/15', border: 'border-emerald-500/25', l: 'Blocks', v: '4 fields A–D', s: 'Digital twin parcels' },
                    { icon: Droplets, color: 'text-cyan-300', bg: 'from-cyan-500/15', border: 'border-cyan-500/25', l: 'Water system', v: 'Drip + hydrogel', s: 'Smart irrigation stack' },
                    { icon: Globe, color: 'text-sky-300', bg: 'from-sky-500/15', border: 'border-sky-500/25', l: 'Market zone', v: 'Agmarknet + export', s: 'Price & arbitrage' },
                  ].map((c) => (
                    <div
                      key={c.l}
                      className={`rounded-2xl border ${c.border} bg-gradient-to-br ${c.bg} to-[#0c121c] p-4`}
                    >
                      <c.icon size={18} className={`${c.color} mb-2`} />
                      <div className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">{c.l}</div>
                      <div className="text-[14px] font-bold text-white mt-0.5">{c.v}</div>
                      <div className="text-[9px] text-slate-500 mt-1">{c.s}</div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {section === 'sim' && (
              <>
                <div className="rounded-3xl border border-white/5 bg-[#0c121c] overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-violet-500/10 via-transparent to-transparent flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/30">
                      <Cpu size={14} className="text-violet-300" />
                    </div>
                    <div>
                      <div className="text-[12px] font-bold text-white">Simulation engine</div>
                      <div className="text-[9px] text-slate-500">Control how the digital twin advances</div>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <Toggle
                        label="Auto mode"
                        hint="Stages advance from weather & growth rules"
                        on={mode === 'auto'}
                        onChange={(v) => setMode?.(v ? 'auto' : 'manual')}
                        accent="violet"
                      />
                      <Toggle
                        label="Playback running"
                        hint="Step the twin on a live interval"
                        on={isPlaying}
                        onChange={(v) => setIsPlaying?.(v)}
                        accent="emerald"
                      />
                      <Toggle
                        label="Auto-play preference"
                        hint="Remember start-playing preference"
                        on={cfg.autoPlay}
                        onChange={(v) => patch('autoPlay', v)}
                      />
                      <Toggle
                        label="Reduce motion"
                        hint="Softer panel animations"
                        on={cfg.reduceMotion}
                        onChange={(v) => patch('reduceMotion', v)}
                      />
                    </div>
                    <Slider
                      label="Simulation speed"
                      value={cfg.simSpeed}
                      min={0.5}
                      max={3}
                      step={0.5}
                      unit="×"
                      onChange={(n) => patch('simSpeed', n)}
                      color="#a78bfa"
                    />
                    <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
                      <div className="text-[11px] font-semibold text-violet-200 mb-2 flex items-center gap-1.5">
                        <Radio size={12} /> Live twin snapshot
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Day <span className="text-white font-bold">{sim.day}</span>
                        {' · '}
                        Stage <span className="text-white font-bold capitalize">{sim.stage.replace(/_/g, ' ')}</span>
                        {' · '}
                        Growth <span className="text-white font-bold">{(sim.growthRate * 100).toFixed(0)}%</span>
                        {' · '}
                        Health <span className="text-white font-bold">{sim.healthIndex}</span>
                      </div>
                      {setSim && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {[
                            {
                              label: '+1°C',
                              fn: () =>
                                setSim((s) => ({
                                  ...s,
                                  env: { ...s.env, temperature: Math.min(42, s.env.temperature + 1) },
                                })),
                            },
                            {
                              label: '−1°C',
                              fn: () =>
                                setSim((s) => ({
                                  ...s,
                                  env: { ...s.env, temperature: Math.max(10, s.env.temperature - 1) },
                                })),
                            },
                            {
                              label: '+ Moisture',
                              fn: () =>
                                setSim((s) => ({
                                  ...s,
                                  env: { ...s.env, soilMoisture: Math.min(90, s.env.soilMoisture + 3) },
                                })),
                            },
                            {
                              label: '− Moisture',
                              fn: () =>
                                setSim((s) => ({
                                  ...s,
                                  env: { ...s.env, soilMoisture: Math.max(20, s.env.soilMoisture - 3) },
                                })),
                            },
                          ].map((b) => (
                            <button
                              key={b.label}
                              type="button"
                              onClick={b.fn}
                              className="text-[10px] font-semibold px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-slate-200 hover:border-violet-400/40 hover:bg-violet-500/10 transition"
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}

            {section === 'alerts' && (
              <>
                <div className="rounded-3xl border border-white/5 bg-[#0c121c] overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-rose-500/10 via-transparent to-transparent flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/15 border border-rose-500/30">
                        <Bell size={14} className="text-rose-300" />
                      </div>
                      <div>
                        <div className="text-[12px] font-bold text-white">Notification channels</div>
                        <div className="text-[9px] text-slate-500">{enabledAlerts} of 6 enabled</div>
                      </div>
                    </div>
                    <div className="h-2 w-24 rounded-full bg-[#0b131e] overflow-hidden border border-[#1e2d40]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-rose-500 to-violet-500"
                        style={{ width: `${(enabledAlerts / 6) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Toggle label="Critical alerts" hint="Heat, moisture failure, high stress" on={cfg.notifyCritical} onChange={(v) => patch('notifyCritical', v)} accent="rose" />
                    <Toggle label="Weather alerts" hint="Rain, wind, disease humidity windows" on={cfg.notifyWeather} onChange={(v) => patch('notifyWeather', v)} accent="sky" />
                    <Toggle label="Irrigation alerts" hint="Soil bands & hydrogel buffer" on={cfg.notifyIrrigation} onChange={(v) => patch('notifyIrrigation', v)} accent="sky" />
                    <Toggle label="Market alerts" hint="Price moves & export spread" on={cfg.notifyMarket} onChange={(v) => patch('notifyMarket', v)} accent="amber" />
                    <Toggle label="Sound on critical" hint="Browser cue when critical fires" on={cfg.notifySound} onChange={(v) => patch('notifySound', v)} />
                    <Toggle label="Daily email digest" hint="Farm posture summary (mock)" on={cfg.emailDigest} onChange={(v) => patch('emailDigest', v)} accent="emerald" />
                  </div>
                </div>

                <div className="rounded-3xl border border-white/5 bg-[#0c121c] overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30">
                      <Shield size={14} className="text-amber-300" />
                    </div>
                    <div>
                      <div className="text-[12px] font-bold text-white">Alert thresholds</div>
                      <div className="text-[9px] text-slate-500">When the twin should raise severity</div>
                    </div>
                  </div>
                  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Slider label="Heat alert" value={cfg.heatAlertC} min={30} max={42} unit="°C" onChange={(n) => patch('heatAlertC', n)} color="#fb923c" />
                    <Slider label="Humidity disease alert" value={cfg.humidityAlert} min={60} max={95} unit="%" onChange={(n) => patch('humidityAlert', n)} color="#38bdf8" />
                    <Slider label="Min soil moisture" value={cfg.moistureMin} min={30} max={60} unit="%" onChange={(n) => patch('moistureMin', n)} color="#34d399" />
                    <Slider label="Max soil moisture" value={cfg.moistureMax} min={65} max={90} unit="%" onChange={(n) => patch('moistureMax', n)} color="#2dd4bf" />
                    <Slider label="Disease risk threshold" value={cfg.diseaseThreshold} min={10} max={50} unit="%" onChange={(n) => patch('diseaseThreshold', n)} color="#f472b6" />
                  </div>
                </div>
              </>
            )}

            {section === 'display' && (
              <div className="rounded-3xl border border-white/5 bg-[#0c121c] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-sky-500/10 via-transparent to-transparent flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/15 border border-sky-500/30">
                    <Eye size={14} className="text-sky-300" />
                  </div>
                  <div>
                    <div className="text-[12px] font-bold text-white">Display & localisation</div>
                    <div className="text-[9px] text-slate-500">Theme, units, language, map chrome</div>
                  </div>
                </div>
                <div className="p-5 space-y-5">
                  <div>
                    <div className={labelCls}>Theme</div>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'dark' as const, label: 'Dark', icon: Moon, desc: 'Default dual-tone' },
                          { id: 'oled' as const, label: 'OLED', icon: Monitor, desc: 'Deep blacks' },
                          { id: 'midnight' as const, label: 'Midnight', icon: Sun, desc: 'Cool navy' },
                        ] as const
                      ).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => patch('theme', t.id)}
                          className={`rounded-2xl border p-3 text-left transition ${
                            cfg.theme === t.id
                              ? 'border-violet-400/50 bg-violet-500/15 shadow-lg shadow-violet-900/20'
                              : 'border-[#1e2d40] bg-[#0b131e]/60 hover:border-slate-500'
                          }`}
                        >
                          <t.icon size={16} className={cfg.theme === t.id ? 'text-violet-300' : 'text-slate-400'} />
                          <div className={`text-[12px] font-bold mt-2 ${cfg.theme === t.id ? 'text-white' : 'text-slate-300'}`}>
                            {t.label}
                          </div>
                          <div className="text-[9px] text-slate-500">{t.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className={labelCls}>Units</div>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          { id: 'metric' as const, label: 'Metric', desc: '°C · ha · mm' },
                          { id: 'imperial' as const, label: 'Imperial', desc: '°F · ac · in' },
                        ] as const
                      ).map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => patch('units', u.id)}
                          className={`flex-1 min-w-[140px] rounded-2xl border px-4 py-3 text-left transition ${
                            cfg.units === u.id
                              ? 'border-emerald-400/45 bg-emerald-500/15'
                              : 'border-[#1e2d40] bg-[#0b131e]/60 hover:border-slate-500'
                          }`}
                        >
                          <div className={`text-[12px] font-bold ${cfg.units === u.id ? 'text-emerald-100' : 'text-slate-300'}`}>
                            {u.label}
                          </div>
                          <div className="text-[9px] text-slate-500">{u.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className={labelCls}>Language</div>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          { id: 'en' as const, label: 'English' },
                          { id: 'hi' as const, label: 'हिन्दी' },
                          { id: 'mr' as const, label: 'मराठी' },
                        ] as const
                      ).map((l) => (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => patch('language', l.id)}
                          className={`text-[12px] font-semibold px-4 py-2.5 rounded-xl border transition ${
                            cfg.language === l.id
                              ? 'bg-sky-600/25 border-sky-400/45 text-sky-100'
                              : 'border-[#1e2d40] text-slate-400 hover:border-slate-500'
                          }`}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Toggle label="Map field labels" hint="Show Field A–D names on twin map" on={cfg.mapLabels} onChange={(v) => patch('mapLabels', v)} accent="sky" />
                    <Toggle label="Show map grid" hint="Subtle grid overlay on farm view" on={cfg.showGrid} onChange={(v) => patch('showGrid', v)} />
                  </div>
                </div>
              </div>
            )}

            {section === 'data' && (
              <div className="rounded-3xl border border-white/5 bg-[#0c121c] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30">
                    <Wifi size={14} className="text-amber-300" />
                  </div>
                  <div>
                    <div className="text-[12px] font-bold text-white">Live data & APIs</div>
                    <div className="text-[9px] text-slate-500">Weather, market, and offline cache</div>
                  </div>
                </div>
                <div className="p-5 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Toggle label="Live weather feed" hint="City weather for twin & summary" on={cfg.apiLiveWeather} onChange={(v) => patch('apiLiveWeather', v)} accent="sky" />
                    <Toggle label="Market price engine" hint="Agmarknet-style rows & arbitrage" on={cfg.apiMarket} onChange={(v) => patch('apiMarket', v)} accent="amber" />
                    <Toggle label="Offline cache" hint="Keep last twin + market snapshot" on={cfg.offlineCache} onChange={(v) => patch('offlineCache', v)} accent="emerald" />
                  </div>
                  <Slider
                    label="Data refresh interval"
                    value={cfg.dataRefreshSec}
                    min={15}
                    max={300}
                    step={15}
                    unit="s"
                    onChange={(n) => patch('dataRefreshSec', n)}
                    color="#fbbf24"
                  />
                  <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 to-transparent p-4 flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                      <Zap size={16} className="text-emerald-300" />
                    </div>
                    <div>
                      <div className="text-[12px] font-bold text-emerald-200">All feeds operational</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                        Weather summary · market engine · local twin state are connected for this session.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {section === 'account' && (
              <div className="rounded-3xl border border-white/5 bg-[#0c121c] overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-fuchsia-500/10 via-transparent to-transparent flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-fuchsia-500/15 border border-fuchsia-500/30">
                    <User size={14} className="text-fuchsia-300" />
                  </div>
                  <div>
                    <div className="text-[12px] font-bold text-white">Account & session</div>
                    <div className="text-[9px] text-slate-500">Local profile for this browser</div>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  <div className="relative overflow-hidden rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/15 via-[#0b131e] to-emerald-500/10 p-5">
                    <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-violet-500/20 blur-2xl" />
                    <div className="relative flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-2xl font-bold text-white shadow-lg shadow-violet-600/30">
                        {cfg.operator.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-lg font-bold text-white">{cfg.operator}</div>
                        <div className="text-[12px] text-slate-300">{cfg.farmName}</div>
                        <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-semibold text-emerald-300">
                          <CheckCircle2 size={10} /> Farm administrator
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                      <div className="text-[9px] text-slate-500 font-bold uppercase flex items-center gap-1">
                        <Lock size={10} /> Session
                      </div>
                      <div className="text-[13px] text-white font-semibold mt-1.5">Local browser profile</div>
                      <div className="text-[10px] text-slate-500 mt-1">Settings stored in localStorage</div>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                      <div className="text-[9px] text-slate-500 font-bold uppercase flex items-center gap-1">
                        <Smartphone size={10} /> Device
                      </div>
                      <div className="text-[13px] text-white font-semibold mt-1.5">Desktop dashboard</div>
                      <div className="text-[10px] text-slate-500 mt-1">Responsive panels enabled</div>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    Apollo Agriverse Digital Twin — demo configuration. Thresholds shape how you read Alert Command and
                    Reports; twin physics remain driven by the live simulation engine.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Env footer */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { icon: <Thermometer size={14} className="text-orange-400" />, l: 'Temp', v: `${sim.env.temperature}°C` },
            { icon: <Droplets size={14} className="text-cyan-400" />, l: 'Humidity', v: `${sim.env.humidity}%` },
            { icon: <CloudRain size={14} className="text-sky-400" />, l: 'Rain', v: `${sim.env.rainfall.toFixed(1)} mm` },
            { icon: <Beaker size={14} className="text-lime-400" />, l: 'Hydrogel', v: `${Math.round(sim.env.hydrogelSat)}%` },
            { icon: <Layers size={14} className="text-emerald-400" />, l: 'Soil SM', v: `${Number(sim.env.soilMoisture).toFixed(0)}%` },
            { icon: <Gauge size={14} className="text-violet-300" />, l: 'Health', v: `${sim.healthIndex}` },
          ].map((m) => (
            <div
              key={m.l}
              className="rounded-2xl border border-white/5 bg-[#0c121c] px-3 py-2.5 flex items-center gap-2.5"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.03] border border-white/5">
                {m.icon}
              </div>
              <div>
                <div className="text-[8px] uppercase tracking-wider text-slate-500 font-bold">{m.l}</div>
                <div className="text-[13px] font-bold text-white">{m.v}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 px-1 pb-2 text-[9px] text-slate-500">
          <Settings size={11} />
          Preferences persist in this browser. Simulation mode and playback drive the live digital twin.
          <span className="ml-auto inline-flex items-center gap-2 text-slate-400">
            <span className="inline-flex items-center gap-1">
              <Volume2 size={10} /> {cfg.notifySound ? 'Sound on' : 'Sound off'}
            </span>
            <span className="opacity-40">·</span>
            <span className="inline-flex items-center gap-1">
              {cfg.notifyCritical ? <Bell size={10} className="text-rose-400" /> : <BellOff size={10} />}
              Alerts {cfg.notifyCritical ? 'armed' : 'muted'}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
