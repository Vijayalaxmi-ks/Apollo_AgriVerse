import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  DEFAULT_FARM_REQUEST,
  evaluateFarm,
  checkBackendHealth,
  type EvaluateReport,
  type FarmEvaluationRequest,
} from '../api/evaluate';
import {
  fetchLiveWeatherSummary,
  type LiveWeatherSummary,
} from '../api/weather';
import {
  fetchMlStatus,
  predictGrapeYield,
  predictTelemetryHydrogel,
  type MlStatus,
  type YieldPredictResponse,
  type TelemetryPredictResponse,
} from '../api/ml';
import { fetchTwinState, stepTwin, type TwinStatePayload } from '../api/twin';
import { API_BASE } from '../api/client';

const FARM_STORAGE_KEY = 'agriverse-farm-profile-v2';

export type FarmProfile = FarmEvaluationRequest & {
  city: string;
  farmName?: string;
};

/** Empty until farmer enters data — no static demo farm */
const DEFAULT_FARM: FarmProfile = {
  farm_id: '',
  region_id: '',
  soil_id: '',
  water_availability: 'medium',
  latitude: 0,
  longitude: 0,
  city: '',
  farmName: '',
};

type ApiStatus = 'unknown' | 'ok' | 'degraded' | 'down';

export type MlBundle = {
  status: MlStatus | null;
  yield: YieldPredictResponse | null;
  telemetry: TelemetryPredictResponse | null;
  error: string | null;
};

type FarmContextValue = {
  farm: FarmProfile;
  setFarm: (patch: Partial<FarmProfile>) => void;
  saveFarm: (next?: FarmProfile) => void;
  liveWeather: LiveWeatherSummary | null;
  pushLiveWeather: (w: LiveWeatherSummary | null) => void;
  evaluateReport: EvaluateReport | null;
  evaluateError: string | null;
  weatherLoading: boolean;
  evaluateLoading: boolean;
  apiStatus: ApiStatus;
  apiBase: string;
  refreshWeather: () => Promise<void>;
  refreshEvaluate: () => Promise<void>;
  refreshAll: () => Promise<void>;
  healthMessage: string;
  /** 06_ML model status + last yield / telemetry predictions */
  ml: MlBundle;
  refreshMl: () => Promise<void>;
  /** 06_ML digital twin closed-loop state */
  twinState: TwinStatePayload | null;
  twinError: string | null;
  twinLoading: boolean;
  refreshTwin: () => Promise<void>;
  stepTwinFromLive: () => Promise<void>;
};

const FarmContext = createContext<FarmContextValue | null>(null);

function loadFarm(): FarmProfile {
  try {
    const raw = localStorage.getItem(FARM_STORAGE_KEY);
    if (raw) return { ...DEFAULT_FARM, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_FARM };
}

export function FarmProvider({ children }: { children: ReactNode }) {
  const [farm, setFarmState] = useState<FarmProfile>(() => loadFarm());

  // Pull identity from Settings localStorage when Farm profile is still empty
  useEffect(() => {
    try {
      const raw = localStorage.getItem('agriverse-settings-v2') || localStorage.getItem('agriverse-settings-v1');
      if (!raw) return;
      const s = JSON.parse(raw);
      setFarmState((prev) => {
        const empty = !prev.city?.trim() && !prev.farm_id?.trim();
        if (!empty) return prev;
        const lat = s.latitude === '' || s.latitude == null ? prev.latitude : Number(s.latitude);
        const lon = s.longitude === '' || s.longitude == null ? prev.longitude : Number(s.longitude);
        const next = {
          ...prev,
          farm_id: s.farmId || prev.farm_id,
          region_id: s.regionId || prev.region_id,
          soil_id: s.soilId || prev.soil_id,
          city: s.city || prev.city,
          latitude: lat,
          longitude: lon,
          water_availability: s.waterAvailability || prev.water_availability,
          farmName: s.farmName || prev.farmName,
        };
        try {
          localStorage.setItem(FARM_STORAGE_KEY, JSON.stringify(next));
        } catch { /* ignore */ }
        return next;
      });
    } catch { /* ignore */ }
  }, []);

  const [liveWeather, setLiveWeather] = useState<LiveWeatherSummary | null>(null);
  const [evaluateReport, setEvaluateReport] = useState<EvaluateReport | null>(null);
  const [evaluateError, setEvaluateError] = useState<string | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [evaluateLoading, setEvaluateLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('unknown');
  const [healthMessage, setHealthMessage] = useState('Not checked');
  const [ml, setMl] = useState<MlBundle>({
    status: null,
    yield: null,
    telemetry: null,
    error: null,
  });
  const [twinState, setTwinState] = useState<TwinStatePayload | null>(null);
  const [twinError, setTwinError] = useState<string | null>(null);
  const [twinLoading, setTwinLoading] = useState(false);

  const setFarm = useCallback((patch: Partial<FarmProfile>) => {
    setFarmState((prev) => ({ ...prev, ...patch }));
  }, []);

  const saveFarm = useCallback((next?: FarmProfile) => {
    setFarmState((prev) => {
      const value = next ?? prev;
      try {
        localStorage.setItem(FARM_STORAGE_KEY, JSON.stringify(value));
      } catch {
        /* ignore */
      }
      return value;
    });
  }, []);

  const pushLiveWeather = useCallback((w: LiveWeatherSummary | null) => {
    setLiveWeather(w);
    if (w?.city) {
      setFarmState((prev) => (prev.city === w.city ? prev : { ...prev, city: w.city }));
    }
    if (w?.isBackend) setApiStatus((s) => (s === 'down' ? 'degraded' : 'ok'));
  }, []);

  const hasLocation = Boolean(
    farm.city?.trim() && Number(farm.latitude) && Number(farm.longitude),
  );
  const hasIdentity = Boolean(farm.farm_id?.trim() && farm.region_id?.trim());

  const refreshWeather = useCallback(async () => {
    if (!hasLocation) {
      setLiveWeather(null);
      return;
    }
    setWeatherLoading(true);
    try {
      const w = await fetchLiveWeatherSummary(farm.city, farm.latitude, farm.longitude);
      setLiveWeather(w);
      if (w?.isBackend) {
        setApiStatus((s) => (s === 'down' ? 'degraded' : 'ok'));
      } else if (w) {
        setApiStatus((s) => (s === 'ok' ? 'degraded' : s === 'unknown' ? 'degraded' : s));
      }
    } finally {
      setWeatherLoading(false);
    }
  }, [farm.city, farm.latitude, farm.longitude, hasLocation]);

  const refreshEvaluate = useCallback(async () => {
    if (!hasIdentity || !hasLocation) {
      setEvaluateReport(null);
      setEvaluateError(null);
      return;
    }
    setEvaluateLoading(true);
    setEvaluateError(null);
    try {
      const req: FarmEvaluationRequest = {
        farm_id: farm.farm_id,
        region_id: farm.region_id,
        soil_id: farm.soil_id,
        water_availability: farm.water_availability,
        latitude: farm.latitude,
        longitude: farm.longitude,
      };
      const report = await evaluateFarm(req);
      setEvaluateReport(report);
      setApiStatus('ok');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Evaluate failed';
      setEvaluateError(msg);
      setEvaluateReport(null);
      setApiStatus((s) => (s === 'ok' ? 'degraded' : 'down'));
    } finally {
      setEvaluateLoading(false);
    }
  }, [farm]);

  const refreshMl = useCallback(async () => {
    try {
      const status = await fetchMlStatus();
      const soil = evaluateReport?.soil_profile;
      const wx = liveWeather;
      let yieldRes: YieldPredictResponse | null = null;
      let telRes: TelemetryPredictResponse | null = null;

      if (status.yield_model_loaded) {
        try {
          yieldRes = await predictGrapeYield({
            nitrogen_mgkg: Number(soil?.n ?? 140),
            phosphorus_mgkg: Number(soil?.p ?? 45),
            potassium_mgkg: Number(soil?.k ?? 210),
            soil_ph: Number(soil?.ph ?? 6.4),
            air_temp_c: wx?.temperature ?? 26.5,
            humidity_pct: wx?.humidity ?? 65,
            rainfall_mm: Math.max(50, (wx?.rainfall ?? 2) * 30),
            optimal_ph: 6.5,
          });
        } catch {
          /* model may reject feature shape */
        }
      }

      if (status.telemetry_model_loaded) {
        try {
          telRes = await predictTelemetryHydrogel({
            air_temp_c: wx?.temperature ?? 28,
            humidity_pct: wx?.humidity ?? 55,
            soil_moisture_pct: Number(soil?.moisture_pct ?? 45),
            soil_temp_c: (wx?.temperature ?? 28) - 2,
            hydrogel_release_rate: 12.5,
            mulch_degradation_pct: 15,
            mulch_temp_reduction_c: 3.2,
            area_acres: 5,
            canopy_cover_percent: 65,
            chlorophyll_index: 42,
            crop_age_days: 120,
            latitude: farm.latitude,
          });
        } catch {
          /* optional */
        }
      }

      setMl({ status, yield: yieldRes, telemetry: telRes, error: null });
    } catch (e) {
      setMl((prev) => ({
        ...prev,
        error: e instanceof Error ? e.message : 'ML refresh failed',
      }));
    }
  }, [evaluateReport, liveWeather, farm.latitude]);

  const refreshTwin = useCallback(async () => {
    setTwinLoading(true);
    setTwinError(null);
    try {
      const res = await fetchTwinState();
      setTwinState(res.state);
    } catch (e) {
      setTwinError(e instanceof Error ? e.message : 'Twin state failed');
      setTwinState(null);
    } finally {
      setTwinLoading(false);
    }
  }, []);

  const stepTwinFromLive = useCallback(async () => {
    setTwinLoading(true);
    setTwinError(null);
    try {
      const t = liveWeather?.temperature ?? 28;
      const res = await stepTwin({
        farm_id: farm.farm_id,
        air_temp_c: t,
        air_temp_max_c: liveWeather?.maxTemp ?? t + 4,
        air_temp_min_c: liveWeather?.minTemp ?? t - 6,
        humidity_pct: liveWeather?.humidity ?? 55,
        rainfall_mm: liveWeather?.rainfall ?? 0,
        uv_index: 6,
      });
      setTwinState(res.state);
      setApiStatus((s) => (s === 'down' ? 'degraded' : 'ok'));
    } catch (e) {
      setTwinError(e instanceof Error ? e.message : 'Twin step failed');
    } finally {
      setTwinLoading(false);
    }
  }, [farm.farm_id, liveWeather]);

  const refreshAll = useCallback(async () => {
    setHealthMessage('Checking backend…');
    const health = await checkBackendHealth();
    if (health.ok) {
      setApiStatus('ok');
      const mlPart =
        health.payload && typeof health.payload === 'object' && 'ml' in health.payload
          ? ' · ML'
          : '';
      const twinPart =
        health.payload && typeof health.payload === 'object' && 'twin' in health.payload
          ? ' · Twin'
          : '';
      setHealthMessage(
        typeof health.payload?.status === 'string'
          ? `Healthy · ${String(health.payload.engine ?? 'engine')}${mlPart}${twinPart}`
          : 'Backend reachable',
      );
    } else {
      setApiStatus('down');
      const err = health.error || 'Backend unreachable';
      const hint =
        /failed to fetch|networkerror|load failed/i.test(err)
          ? ' — start API: cd 05_Backend && uvicorn main:app --host 127.0.0.1 --port 8000'
          : '';
      setHealthMessage(`${err}${hint}`);
    }
    // Still try weather/evaluate (may use public Open-Meteo even if backend is down)
    await Promise.all([refreshWeather(), refreshEvaluate()]);
    if (health.ok) {
      await Promise.all([refreshMl(), refreshTwin()]);
    }
  }, [refreshWeather, refreshEvaluate, refreshMl, refreshTwin]);

  // Initial + periodic weather
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const health = await checkBackendHealth();
      if (cancelled) return;
      if (health.ok) {
        setApiStatus('ok');
        setHealthMessage('Backend reachable');
      } else {
        setApiStatus('down');
        setHealthMessage(health.error || 'Backend down');
      }
      await refreshWeather();
      await refreshEvaluate();
      if (!cancelled) {
        await refreshMl();
        await refreshTwin();
      }
    })();
    const id = window.setInterval(() => {
      if (!cancelled) refreshWeather();
    }, 10 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farm.city, farm.latitude, farm.longitude, farm.farm_id, farm.region_id, farm.soil_id, farm.water_availability]);

  // Re-run ML when evaluate / weather settles
  useEffect(() => {
    if (evaluateReport || liveWeather) {
      void refreshMl();
    }
  }, [evaluateReport, liveWeather, refreshMl]);

  const value = useMemo<FarmContextValue>(
    () => ({
      farm,
      setFarm,
      saveFarm,
      liveWeather,
      pushLiveWeather,
      evaluateReport,
      evaluateError,
      weatherLoading,
      evaluateLoading,
      apiStatus,
      apiBase: API_BASE,
      refreshWeather,
      refreshEvaluate,
      refreshAll,
      healthMessage,
      ml,
      refreshMl,
      twinState,
      twinError,
      twinLoading,
      refreshTwin,
      stepTwinFromLive,
    }),
    [
      farm,
      setFarm,
      saveFarm,
      liveWeather,
      pushLiveWeather,
      evaluateReport,
      evaluateError,
      weatherLoading,
      evaluateLoading,
      apiStatus,
      refreshWeather,
      refreshEvaluate,
      refreshAll,
      healthMessage,
      ml,
      refreshMl,
      twinState,
      twinError,
      twinLoading,
      refreshTwin,
      stepTwinFromLive,
    ],
  );

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>;
}

export function useFarm() {
  const ctx = useContext(FarmContext);
  if (!ctx) {
    throw new Error('useFarm must be used within FarmProvider');
  }
  return ctx;
}

/** Safe hook when provider might be absent during partial mounts */
export function useFarmOptional() {
  return useContext(FarmContext);
}
