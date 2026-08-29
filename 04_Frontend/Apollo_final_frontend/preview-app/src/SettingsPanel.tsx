import { useState } from 'react';
import {
  Settings, Save, RotateCcw, Bell, BellOff, Monitor, MapPin, CloudRain,
  Leaf, Beaker, Gauge, Shield, Smartphone, Moon, Sun, Volume2,
  Wifi, Database, User, Factory, Droplets, Thermometer, CheckCircle2,
  Layers, Zap, Eye, Lock, Globe, Cpu, Sparkles,
  Activity, Radio, RefreshCw, Server, Sprout, ChevronRight, Ruler,
} from 'lucide-react';
import type { SimState, SoilClassId, GrapeVarietyId, FieldInfo } from './simulation';
import { saveFarmProfile } from './api/farm';
import {
  FIELDS,
  SOIL_CLASSES,
  GRAPE_VARIETIES,
  CROP_CATALOG,
  getSoilClass,
  getGrapeVariety,
  getCropCatalogEntry,
  recommendVarietiesForSoil,
  varietyFitLevel,
} from './simulation';
import { useFarmOptional } from './context/FarmContext';
import {
  useSettings,
  DEFAULT_APP_SETTINGS,
  generateFarmIds,
  type AppSettings,
} from './context/SettingsContext';

type Props = {
  sim: SimState;
  setSim?: React.Dispatch<React.SetStateAction<SimState>>;
  mode?: 'auto' | 'manual';
  setMode?: (m: 'auto' | 'manual') => void;
  isPlaying?: boolean;
  setIsPlaying?: (v: boolean) => void;
  fieldSoilMap?: Record<string, SoilClassId>;
  setFieldSoil?: (fieldId: string, soilId: SoilClassId) => void;
  fieldVarietyMap?: Record<string, GrapeVarietyId>;
  setFieldVariety?: (fieldId: string, varietyId: GrapeVarietyId) => void;
  /** Dynamic fields from farmer field-count setting */
  fields?: FieldInfo[];
};

export default function SettingsPanel({
  sim,
  setSim,
  mode = 'auto',
  setMode,
  isPlaying = false,
  setIsPlaying,
  fieldSoilMap,
  setFieldSoil,
  fieldVarietyMap,
  setFieldVariety,
  fields = FIELDS,
}: Props) {
  const {
    settings: cfg,
    setSettings,
    replaceSettings,
    resetSettings,
    profiles,
    activeProfileId,
    createProfile,
    switchProfile,
    deleteProfile,
    saveActiveProfile,
    profileComplete,
  } = useSettings();
  const [savedFlash, setSavedFlash] = useState(false);

  type FieldMeasure = {
    /** Field area in hectares */
    areaHa: string;
    /** Observed / target yield t/ha */
    yieldTPerHa: string;
    /** Planting density plants/ha */
    densityPerHa: string;
    /** Seasonal irrigation mm (depth) */
    irrigationMm: string;
    notes: string;
  };
  const emptyMeasure = (): FieldMeasure => ({
    areaHa: '',
    yieldTPerHa: '',
    densityPerHa: '',
    irrigationMm: '',
    notes: '',
  });
  const MEASURES_KEY = 'agriverse-lifecycle-measures-v1';
  const [fieldMeasures, setFieldMeasures] = useState<Record<string, FieldMeasure>>(() => {
    try {
      const raw = localStorage.getItem(MEASURES_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return {};
  });
  const [measuresFlash, setMeasuresFlash] = useState(false);
  const patchFieldMeasure = (fieldId: string, patch: Partial<FieldMeasure>) => {
    setFieldMeasures((prev) => ({
      ...prev,
      [fieldId]: { ...(prev[fieldId] || emptyMeasure()), ...patch },
    }));
  };
  const saveFieldMeasures = () => {
    try {
      localStorage.setItem(MEASURES_KEY, JSON.stringify(fieldMeasures));
      setMeasuresFlash(true);
      window.setTimeout(() => setMeasuresFlash(false), 1600);
      window.dispatchEvent(new CustomEvent('agriverse-field-measures-saved'));
    } catch { /* ignore */ }
    // Also push to backend when farm id is known
    const fid = cfg.farmId?.trim();
    if (fid) {
      const fieldPayload = (fields.length ? fields : []).map((f) => {
        const m = fieldMeasures[f.id] || emptyMeasure();
        const areaHaNum = m.areaHa ? Number(m.areaHa) : undefined;
        const acresFromHa =
          areaHaNum != null && Number.isFinite(areaHaNum)
            ? Math.round(areaHaNum * 2.47105 * 100) / 100
            : f.acres;
        return {
          field_id: f.id,
          name: f.name,
          acres: acresFromHa,
          soil_class: fieldSoilMap?.[f.id] || cfg.defaultSoilClass,
          crop_id: fieldCropMap[f.id] || cfg.primaryCrop,
          grape_variety: fieldVarietyMap?.[f.id] || 'thompson',
          area_ha: m.areaHa || undefined,
          yield_t_per_ha: m.yieldTPerHa || undefined,
          density_per_ha: m.densityPerHa || undefined,
          irrigation_mm: m.irrigationMm || undefined,
          notes: m.notes || undefined,
        };
      });
      void saveFarmProfile({
        farm_id: fid,
        region_id: cfg.regionId || undefined,
        soil_id: cfg.soilId || undefined,
        farm_name: cfg.farmName,
        city: cfg.city,
        primary_crop: cfg.primaryCrop,
        default_soil_class: cfg.defaultSoilClass,
        field_count: cfg.fieldCount,
        fields: fieldPayload,
        measures: fieldMeasures,
      }).catch(() => { /* offline ok */ });
      try {
        window.dispatchEvent(
          new CustomEvent('agriverse-settings-saved', {
            detail: { fieldCount: cfg.fieldCount, fields: fieldPayload },
          }),
        );
      } catch { /* ignore */ }
    }
  };


  const [section, setSection] = useState<'farm' | 'soilcrop' | 'sim' | 'alerts' | 'display' | 'data' | 'account'>('farm');
  const [newProfileName, setNewProfileName] = useState('');

  const FIELD_CROP_KEY = 'agriverse-field-crops-v1';
  const [fieldCropMap, setFieldCropMap] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem(FIELD_CROP_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return {};
  });
  const setFieldCrop = (fieldId: string, cropId: string) => {
    setFieldCropMap((prev) => {
      const next = { ...prev, [fieldId]: cropId };
      try {
        localStorage.setItem(FIELD_CROP_KEY, JSON.stringify(next));
      } catch { /* ignore */ }
      return next;
    });
  };
  const farmCtx = useFarmOptional();

  const patch = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings({ [key]: value });
  };

  const save = () => {
    // Generate backend IDs from farmer-entered data if still blank
    let farmId = cfg.farmId;
    let regionId = cfg.regionId;
    let soilId = cfg.soilId;
    if (!farmId?.trim() || !regionId?.trim() || !soilId?.trim()) {
      const gen = generateFarmIds({
        farmName: cfg.farmName,
        region: cfg.region,
        district: cfg.district,
        city: cfg.city,
      });
      if (!farmId?.trim()) farmId = gen.farmId;
      if (!regionId?.trim()) regionId = gen.regionId;
      if (!soilId?.trim()) soilId = gen.soilId;
      setSettings({ farmId, regionId, soilId });
    }

    const lat = cfg.latitude === '' ? 0 : Number(cfg.latitude);
    const lon = cfg.longitude === '' ? 0 : Number(cfg.longitude);

    // Persist field measurements locally
    try {
      localStorage.setItem(MEASURES_KEY, JSON.stringify(fieldMeasures));
      window.dispatchEvent(new CustomEvent('agriverse-field-measures-saved'));
    } catch {
      /* ignore */
    }

    saveActiveProfile();

    // Push farm identity into shared FarmContext → weather + evaluate + twin step
    if (farmCtx) {
      const next = {
        farm_id: farmId,
        region_id: regionId,
        soil_id: soilId,
        water_availability: cfg.waterAvailability,
        latitude: lat,
        longitude: lon,
        city: cfg.city,
        farmName: cfg.farmName,
      };
      farmCtx.saveFarm({ ...farmCtx.farm, ...next });
    }

    // Build per-field payload for backend (must match FieldMeasure + FarmFieldPayload)
    const fieldPayload = (fields.length ? fields : []).map((f) => {
      const m = fieldMeasures[f.id] || emptyMeasure();
      const areaHaNum = m.areaHa ? Number(m.areaHa) : undefined;
      const acresFromHa =
        areaHaNum != null && Number.isFinite(areaHaNum) ? Math.round(areaHaNum * 2.47105 * 100) / 100 : f.acres;
      return {
        field_id: f.id,
        name: f.name,
        acres: acresFromHa,
        soil_class: fieldSoilMap?.[f.id] || cfg.defaultSoilClass,
        crop_id: fieldCropMap[f.id] || cfg.primaryCrop,
        grape_variety: fieldVarietyMap?.[f.id] || 'thompson',
        area_ha: m.areaHa || undefined,
        yield_t_per_ha: m.yieldTPerHa || undefined,
        density_per_ha: m.densityPerHa || undefined,
        irrigation_mm: m.irrigationMm || undefined,
        notes: m.notes || undefined,
      };
    });

    // Save to backend (profile + fields + measures) then refresh APIs / step twin
    void (async () => {
      try {
        const res = await saveFarmProfile({
          farm_id: farmId,
          region_id: regionId,
          soil_id: soilId,
          farm_name: cfg.farmName,
          operator: cfg.operator,
          region: cfg.region,
          district: cfg.district,
          city: cfg.city,
          latitude: lat || undefined,
          longitude: lon || undefined,
          water_availability: cfg.waterAvailability,
          primary_crop: cfg.primaryCrop,
          default_soil_class: cfg.defaultSoilClass,
          field_count: cfg.fieldCount,
          fields: fieldPayload,
          measures: fieldMeasures,
          profile_label: cfg.farmName || cfg.operator || farmId,
        });
        if (res?.success) {
          setSavedFlash(true);
        }
      } catch (err) {
        console.warn('Backend profile save failed (local save still applied):', err);
      }

      if (farmCtx && cfg.city?.trim() && lat && lon) {
        try {
          await farmCtx.refreshAll();
          await farmCtx.stepTwinFromLive();
        } catch {
          /* twin optional if backend offline */
        }
      }
    })();

    try {
      window.dispatchEvent(
        new CustomEvent('agriverse-settings-saved', {
          detail: {
            fieldCount: cfg.fieldCount,
            primaryCrop: cfg.primaryCrop,
            defaultSoilClass: cfg.defaultSoilClass,
            city: cfg.city,
            farmId,
            fields: fieldPayload,
          },
        }),
      );
    } catch {
      /* ignore */
    }
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2000);
  };

  const reset = () => {
    replaceSettings({ ...DEFAULT_APP_SETTINGS });
    resetSettings();
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
    { id: 'farm', icon: Factory, label: 'Farm profile', sub: 'Fields · soil · crop · ha', tint: 'from-emerald-500/20 to-transparent' },
    { id: 'soilcrop', icon: Layers, label: 'Soil & crop variety', sub: 'Twin visuals only', tint: 'from-violet-500/20 to-transparent' },
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
                {/* Multi-profile manager */}
                <div className="rounded-3xl border border-sky-500/20 bg-[#0c121c] overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-sky-500/10 via-transparent to-transparent flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/15 border border-sky-500/30">
                        <User size={14} className="text-sky-300" />
                      </div>
                      <div>
                        <div className="text-[12px] font-bold text-white">Farmer profiles</div>
                        <div className="text-[9px] text-slate-500">
                          Create multiple farms — each keeps its own location, soil & crop settings
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] text-slate-500">{profiles.length} saved</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {profiles.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-[#2a3a52] bg-[#0b131e]/60 p-4 text-center">
                        <p className="text-[12px] text-slate-300 font-semibold">No profiles yet</p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Enter your farm details below, then save — or create a blank profile to start.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {profiles.map((p) => (
                          <div
                            key={p.id}
                            className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] transition ${
                              p.id === activeProfileId
                                ? 'border-sky-400/50 bg-sky-500/15 text-sky-100'
                                : 'border-[#1e2d40] bg-[#0b131e] text-slate-400'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => switchProfile(p.id)}
                              className="font-semibold hover:text-white"
                            >
                              {p.label || 'Untitled'}
                            </button>
                            <button
                              type="button"
                              title="Delete profile"
                              onClick={() => {
                                if (window.confirm(`Delete profile “${p.label}”?`)) deleteProfile(p.id);
                              }}
                              className="text-slate-600 hover:text-rose-400 ml-0.5"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="rounded-xl border border-dashed border-sky-500/25 bg-[#0b131e]/50 p-3 space-y-2">
                      <div className="text-[10px] font-semibold text-slate-400">Create a new farmer profile</div>
                      <div className="flex flex-wrap gap-2 items-center">
                        <input
                          className={`${inputCls} max-w-[220px]`}
                          placeholder="Profile name (e.g. Dakshini farm)"
                          value={newProfileName}
                          onChange={(e) => setNewProfileName(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            createProfile(newProfileName.trim() || undefined);
                            setNewProfileName('');
                          }}
                          className="text-[11px] font-semibold px-3 py-2 rounded-xl border border-sky-500/40 bg-sky-500/10 text-sky-200 hover:bg-sky-500/20 transition"
                        >
                          Create profile
                        </button>
                      </div>
                      {!profileComplete && (
                        <p className="text-[10px] text-amber-400/90">
                          Fill farm name, city & coordinates below, then Save & refresh APIs.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/5 bg-[#0c121c] overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30">
                      <MapPin size={14} className="text-emerald-300" />
                    </div>
                    <div>
                      <div className="text-[12px] font-bold text-white">Farm identity</div>
                      <div className="text-[9px] text-slate-500">Entered by the farmer — empty until you fill it in</div>
                    </div>
                  </div>
                  <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(
                      [
                        { key: 'farmName' as const, label: 'Farm name', icon: Factory, ph: 'e.g. Green Valley Vineyard' },
                        { key: 'operator' as const, label: 'Operator', icon: User, ph: 'Your name' },
                        { key: 'region' as const, label: 'State / region', icon: Globe, ph: 'e.g. Maharashtra' },
                        { key: 'district' as const, label: 'District / belt', icon: MapPin, ph: 'e.g. Nashik' },
                      ] as const
                    ).map((f) => (
                      <div key={f.key}>
                        <div className={labelCls}>
                          <f.icon size={10} /> {f.label}
                        </div>
                        <input
                          className={inputCls}
                          value={cfg[f.key]}
                          placeholder={f.ph}
                          onChange={(e) => patch(f.key, e.target.value)}
                        />
                      </div>
                    ))}
                    <div className="sm:col-span-2">
                      <div className={labelCls}>
                        <Leaf size={10} /> Notes / market focus
                      </div>
                      <input
                        className={inputCls}
                        value={cfg.cropDefault}
                        placeholder="Optional notes (e.g. export table grapes)"
                        onChange={(e) => patch('cropDefault', e.target.value)}
                      />
                    </div>

                    {/* Field count + primary crop + default soil — drives all panels */}
                    <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <div className={labelCls}>Number of fields</div>
                        <select
                          className={inputCls}
                          value={cfg.fieldCount}
                          onChange={(e) => patch('fieldCount', Number(e.target.value))}
                        >
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                            <option key={n} value={n}>
                              {n} field{n > 1 ? 's' : ''}
                            </option>
                          ))}
                        </select>
                        <p className="text-[9px] text-slate-500 mt-1">Digital Twin pads scale to this count</p>
                      </div>

                      <div className="md:col-span-2 rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2.5">
                        <div className="text-[11px] font-semibold text-sky-200">Per-field soil, crop & measurements (ha)</div>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">
                          Set real farm data for each field below. Values save with the profile and sync to the backend on Save.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Per-field soil, crop (actual farm) + hectare measurements — part of profile creation */}
                <div className="rounded-3xl border border-emerald-500/20 bg-[#0c121c] overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30">
                        <Layers size={14} className="text-emerald-300" />
                      </div>
                      <div>
                        <div className="text-[12px] font-bold text-white">Fields — soil, crop & measurements</div>
                        <div className="text-[9px] text-slate-500">
                          Actual farm data per field (area in hectares) · saved with this farmer profile
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={save}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-3 py-1.5 text-[11px] font-semibold text-emerald-100 hover:bg-emerald-500/25 transition"
                    >
                      <Save size={13} />
                      {savedFlash ? 'Saved' : 'Save profile'}
                    </button>
                  </div>
                  <div className="p-5 space-y-4">
                    {(fields.length ? fields : [{ id: 'A', name: 'Field A', acres: 1 } as FieldInfo]).map((f) => {
                      const sid = fieldSoilMap?.[f.id] || (cfg.defaultSoilClass as SoilClassId) || 'alluvial';
                      const sc = getSoilClass(sid);
                      const cropId = fieldCropMap[f.id] || cfg.primaryCrop || 'grape';
                      const cropEntry = getCropCatalogEntry(cropId);
                      const m = fieldMeasures[f.id] || emptyMeasure();
                      const acresFromHa = m.areaHa ? (Number(m.areaHa) * 2.47105).toFixed(2) : String(f.acres);
                      return (
                        <div
                          key={f.id}
                          className="rounded-2xl border border-[#1e2d40] bg-[#0b131e]/80 p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-sm border border-white/20 shrink-0"
                                style={{ background: sc.base }}
                              />
                              <span className="text-[13px] font-bold text-white">{f.name}</span>
                              <span className="text-[10px] text-slate-500">
                                {m.areaHa ? `${m.areaHa} ha` : `${f.acres} ac`}
                              </span>
                            </div>
                            <span className="text-[10px] text-sky-300 font-semibold">{cropEntry.label}</span>
                          </div>

                          <div>
                            <div className={labelCls}>Soil class (this field)</div>
                            <div className="flex flex-wrap gap-1.5">
                              {SOIL_CLASSES.map((s) => (
                                <button
                                  key={s.id}
                                  type="button"
                                  title={s.label}
                                  onClick={() => setFieldSoil?.(f.id, s.id)}
                                  className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                                    sid === s.id
                                      ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/30'
                                      : 'border-[#1e2d40] bg-[#16202d] text-slate-400 hover:border-slate-500'
                                  }`}
                                >
                                  <span
                                    className="w-3 h-3 rounded-sm border border-black/30 shrink-0"
                                    style={{ background: s.base }}
                                  />
                                  {s.shortLabel}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <div className={labelCls}>Crop type (this field)</div>
                            <select
                              className={inputCls}
                              value={cropId}
                              onChange={(e) => {
                                setFieldCrop(f.id, e.target.value);
                                if (f.id === fields[0]?.id) {
                                  patch('primaryCrop', e.target.value);
                                  const entry = getCropCatalogEntry(e.target.value);
                                  if (entry.waterNeed) patch('waterAvailability', entry.waterNeed);
                                }
                              }}
                            >
                              {CROP_CATALOG.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.label} · {c.category}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <div className={labelCls}>
                              <Ruler size={10} /> Measurements (hectares)
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              {(
                                [
                                  ['areaHa', 'Area (ha)'],
                                  ['yieldTPerHa', 'Yield (t/ha)'],
                                  ['densityPerHa', 'Density (plants/ha)'],
                                  ['irrigationMm', 'Irrigation (mm)'],
                                ] as const
                              ).map(([key, label]) => (
                                <label key={key} className="block">
                                  <span className="text-[9px] uppercase text-slate-500">{label}</span>
                                  <input
                                    type="number"
                                    step="any"
                                    value={m[key]}
                                    onChange={(e) => patchFieldMeasure(f.id, { [key]: e.target.value })}
                                    className={inputCls}
                                    placeholder="—"
                                  />
                                </label>
                              ))}
                            </div>
                            {m.areaHa && (
                              <p className="text-[9px] text-slate-500 mt-1">≈ {acresFromHa} acres</p>
                            )}
                            <label className="block mt-2">
                              <span className="text-[9px] uppercase text-slate-500">Notes</span>
                              <textarea
                                value={m.notes}
                                onChange={(e) => patchFieldMeasure(f.id, { notes: e.target.value })}
                                rows={2}
                                className={`${inputCls} resize-none`}
                                placeholder="Field notes…"
                              />
                            </label>
                          </div>
                        </div>
                      );
                    })}
                    <p className="text-[10px] text-slate-500 leading-snug">
                      All field soil, crop and hectare measurements save with <strong className="text-white">Save</strong> /
                      <strong className="text-white"> Save &amp; refresh APIs</strong> (local + backend).
                      Digital Twin grape variety is set in the <span className="text-emerald-300">Soil &amp; crop variety</span> tab.
                    </p>
                  </div>
                </div>

                {/* Environment-based crop recommendations (any crop) — from evaluate API + soil heuristics */}
                <div className="rounded-3xl border border-lime-500/20 bg-[#0c121c] overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-lime-500/10 via-transparent to-transparent flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-lime-500/15 border border-lime-500/30">
                        <Sprout size={14} className="text-lime-300" />
                      </div>
                      <div>
                        <div className="text-[12px] font-bold text-white">Best crop recommendations</div>
                        <div className="text-[9px] text-slate-500">
                          Ranked by field soil, water & climate — any suitable crop (not limited to grapes)
                        </div>
                      </div>
                    </div>
                    {farmCtx?.evaluateLoading && (
                      <span className="text-[9px] text-slate-400 animate-pulse">Refreshing…</span>
                    )}
                  </div>
                  <div className="p-5 space-y-3">
                    {(() => {
                      const recs = farmCtx?.evaluateReport?.primary_recommendations ?? [];
                      const focus = farmCtx?.evaluateReport?.focus_crop_assessment;
                      const soilHint =
                        fieldSoilMap &&
                        getSoilClass(fieldSoilMap[Object.keys(fieldSoilMap)[0] || 'B'] || 'alluvial');
                      if (recs.length === 0 && !focus) {
                        return (
                          <div className="rounded-2xl border border-[#1e2d40] bg-[#0b131e]/80 p-4 text-[11px] text-slate-400 leading-relaxed">
                            <p className="text-slate-300 font-semibold mb-1">Heuristic fit from soil class</p>
                            <p>{soilHint?.cropFit || 'Save backend farm profile and refresh APIs to load full suitability scores.'}</p>
                            <p className="mt-2 text-[10px] text-slate-500">
                              Water: {cfg.waterAvailability} · Soil: {soilHint?.label || '—'} · City: {cfg.city}
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                save();
                              }}
                              className="mt-3 text-[11px] font-semibold px-3 py-1.5 rounded-xl border border-lime-500/40 bg-lime-500/10 text-lime-200 hover:bg-lime-500/20 transition"
                            >
                              Save profile & fetch recommendations
                            </button>
                          </div>
                        );
                      }
                      const list = [
                        ...(focus ? [focus] : []),
                        ...recs.filter((r) => r.crop_name !== focus?.crop_name),
                      ].slice(0, 8);
                      return (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {list.map((r) => {
                            const score = Number(r.final_suitability_score ?? r.agronomic_score ?? 0);
                            const band =
                              r.suitability_band ||
                              (score >= 80 ? 'Excellent' : score >= 65 ? 'Good' : score >= 50 ? 'Fair' : 'Limited');
                            return (
                              <div
                                key={r.crop_name}
                                className={`rounded-2xl border p-3.5 transition ${
                                  r.is_focus_crop || r.crop_name === focus?.crop_name
                                    ? 'border-lime-400/40 bg-lime-500/10'
                                    : 'border-[#1e2d40] bg-[#0b131e]/80'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="text-[13px] font-bold text-white">{r.crop_name}</div>
                                    <div className="text-[9px] text-slate-500 mt-0.5">
                                      {band}
                                      {r.water_requirement ? ` · Water: ${r.water_requirement}` : ''}
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <div className="text-[16px] font-bold text-lime-300 tabular-nums">
                                      {score.toFixed(0)}
                                    </div>
                                    <div className="text-[8px] uppercase text-slate-500">score</div>
                                  </div>
                                </div>
                                {r.expected_yield_tons_ha != null && (
                                  <div className="text-[10px] text-slate-400 mt-2">
                                    Est. yield ~{Number(r.expected_yield_tons_ha).toFixed(1)} t/ha
                                  </div>
                                )}
                                {(r.pros?.[0] || r.cons?.[0]) && (
                                  <div className="mt-2 text-[9px] text-slate-500 leading-snug line-clamp-2">
                                    {r.pros?.[0] || r.cons?.[0]}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                    <p className="text-[9px] text-slate-500 leading-snug">
                      These recommendations use soil profile, water availability, and climate from your farm settings.
                      Set per-field soil & crop in the Soil & crop variety tab. Grape varieties apply only when a field crop is grape.
                    </p>
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
                          Leave IDs blank — they are generated when you save · {farmCtx?.apiBase || 'API'}
                        </div>
                      </div>
                    </div>
                    {farmCtx && (
                      <span
                        className={`text-[9px] px-2 py-0.5 rounded border ${
                          profileComplete && farmCtx.apiStatus === 'ok'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : !profileComplete
                              ? 'bg-slate-500/15 text-slate-400 border-slate-500/30'
                              : farmCtx.apiStatus === 'degraded'
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {!profileComplete
                          ? 'Awaiting farmer data'
                          : farmCtx.apiStatus === 'ok'
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
                    {!profileComplete && (
                      <div className="sm:col-span-2 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-[10px] text-amber-200/90 leading-relaxed">
                        Fields start empty. Enter farm name, city, latitude &amp; longitude, then{' '}
                        <strong>Save &amp; refresh APIs</strong>. Farm / region / soil IDs are auto-generated from your entries — no static demo farmer data.
                      </div>
                    )}
                    {(
                      [
                        { key: 'farmId' as const, label: 'Farm ID', ph: 'Auto on save' },
                        { key: 'regionId' as const, label: 'Region ID', ph: 'Auto on save' },
                        { key: 'soilId' as const, label: 'Soil ID', ph: 'Auto on save' },
                        { key: 'city' as const, label: 'City (weather)', ph: 'e.g. Nashik' },
                      ] as const
                    ).map((f) => (
                      <div key={f.key}>
                        <div className={labelCls}>{f.label}</div>
                        <input
                          className={inputCls}
                          value={cfg[f.key]}
                          placeholder={f.ph}
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
                        placeholder="e.g. 19.9975"
                        onChange={(e) =>
                          patch('latitude', e.target.value === '' ? '' : Number(e.target.value))
                        }
                      />
                    </div>
                    <div>
                      <div className={labelCls}>Longitude</div>
                      <input
                        className={inputCls}
                        type="number"
                        step="0.0001"
                        value={cfg.longitude}
                        placeholder="e.g. 73.7898"
                        onChange={(e) =>
                          patch('longitude', e.target.value === '' ? '' : Number(e.target.value))
                        }
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
                          className="flex items-center gap-1.5 text-[11px] px-3 py-2 rounded-lg border border-[#1e2d40] text-slate-300 hover:border-sky-500/40"
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
                    { icon: Leaf, color: 'text-emerald-300', bg: 'from-emerald-500/15', border: 'border-emerald-500/25', l: 'Blocks', v: `${cfg.fieldCount} field${cfg.fieldCount === 1 ? '' : 's'}`, s: 'Digital twin parcels' },
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

            

            {section === 'soilcrop' && (
              <>
                <div className="rounded-3xl border border-violet-500/20 bg-[#0c121c] overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/5 bg-gradient-to-r from-violet-500/10 via-transparent to-transparent flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/15 border border-violet-500/30">
                      <Layers size={14} className="text-violet-300" />
                    </div>
                    <div>
                      <div className="text-[12px] font-bold text-white">Digital Twin — soil & grape variety</div>
                      <div className="text-[9px] text-slate-500">
                        Visual twin only: soil colours and grape variety / berries on the map (not operational farm crop mix)
                      </div>
                    </div>
                  </div>
                  <div className="p-5 space-y-4">
                    <p className="text-[11px] text-slate-400 leading-relaxed rounded-xl border border-[#1e2d40] bg-[#0b131e] px-3 py-2">
                      Use <span className="text-white font-semibold">Farm profile</span> for real field crop type and hectare measurements.
                      This panel only drives the <span className="text-violet-300 font-semibold">Digital Twin</span> appearance
                      (soil pad colours + grape vine variety).
                    </p>

                    {fieldSoilMap && setFieldSoil && fieldVarietyMap && setFieldVariety ? (
                      (fields.length ? fields : []).map((f) => {
                        const sid = fieldSoilMap[f.id] || (cfg.defaultSoilClass as SoilClassId) || 'alluvial';
                        const sc = getSoilClass(sid);
                        const vid = fieldVarietyMap[f.id] || 'thompson';
                        const vv = getGrapeVariety(vid);
                        const top = recommendVarietiesForSoil(sid)[0];
                        const score = vv.soilScore[sid as SoilClassId] ?? 50;
                        const fit = varietyFitLevel(score);
                        return (
                          <div
                            key={f.id}
                            className="rounded-2xl border border-[#1e2d40] bg-[#0b131e]/80 p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-3 h-3 rounded-sm border border-white/20 shrink-0"
                                  style={{ background: sc.base }}
                                />
                                <span className="text-[13px] font-bold text-white">{f.name}</span>
                                <span className="text-[10px] text-slate-500">Twin parcel</span>
                              </div>
                              <span className="text-[10px] text-slate-400">
                                Fit:{' '}
                                <span
                                  className={
                                    fit === 'Best' || fit === 'Good'
                                      ? 'text-emerald-400 font-semibold'
                                      : fit === 'Fair'
                                        ? 'text-amber-400 font-semibold'
                                        : 'text-rose-400 font-semibold'
                                  }
                                >
                                  {fit}
                                </span>
                              </span>
                            </div>

                            <div>
                              <div className={labelCls}>Twin soil class</div>
                              <div className="flex flex-wrap gap-1.5">
                                {SOIL_CLASSES.map((s) => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    title={s.label}
                                    onClick={() => setFieldSoil(f.id, s.id)}
                                    className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold transition ${
                                      sid === s.id
                                        ? 'border-violet-400/50 bg-violet-500/15 text-violet-100 ring-1 ring-violet-400/30'
                                        : 'border-[#1e2d40] bg-[#16202d] text-slate-400 hover:border-slate-500'
                                    }`}
                                  >
                                    <span
                                      className="w-3 h-3 rounded-sm border border-black/30 shrink-0"
                                      style={{ background: s.base }}
                                    />
                                    {s.shortLabel}
                                  </button>
                                ))}
                              </div>
                              <p className="text-[9px] text-slate-500 mt-1.5 leading-snug">{sc.description}</p>
                            </div>

                            <div>
                              <div className={labelCls}>Grape variety (twin vines)</div>
                              <select
                                className={inputCls}
                                value={vid}
                                onChange={(e) => setFieldVariety(f.id, e.target.value as GrapeVarietyId)}
                              >
                                {GRAPE_VARIETIES.map((v) => {
                                  const vs = v.soilScore[sid as SoilClassId] ?? 50;
                                  const vf = varietyFitLevel(vs);
                                  return (
                                    <option key={v.id} value={v.id}>
                                      {v.label} · {vf} ({vs})
                                    </option>
                                  );
                                })}
                              </select>
                              <div className="text-[9px] text-slate-400 mt-1.5 leading-snug">
                                Selected: <span className="text-white font-semibold">{vv.label}</span>
                                {top && (
                                  <>
                                    {' '}
                                    · AI suggest:{' '}
                                    <span className="text-emerald-300 font-semibold">{top.variety.label}</span>
                                  </>
                                )}
                              </div>
                              <p className="text-[9px] text-slate-500 mt-1 leading-snug">{vv.notes}</p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-[11px] text-slate-500">Field maps not available.</p>
                    )}
                    <p className="text-[10px] text-slate-500 leading-snug">
                      Changes apply to the Digital Twin map immediately (soil colours, berry colours). Save the profile
                      from Farm profile to persist and sync with the backend.
                    </p>
                  </div>
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
                    <div className="text-[12px] font-bold text-white">Display</div>
                    <div className="text-[9px] text-slate-500">Theme, units, map chrome</div>
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
