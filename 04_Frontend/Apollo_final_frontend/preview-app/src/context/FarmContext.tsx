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
import { API_BASE } from '../api/client';

const FARM_STORAGE_KEY = 'agriverse-farm-profile-v1';

export type FarmProfile = FarmEvaluationRequest & {
  city: string;
  farmName?: string;
};

const DEFAULT_FARM: FarmProfile = {
  ...DEFAULT_FARM_REQUEST,
  city: 'Nashik',
  farmName: 'Apollo Agriverse Demo Farm',
};

type ApiStatus = 'unknown' | 'ok' | 'degraded' | 'down';

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
  const [liveWeather, setLiveWeather] = useState<LiveWeatherSummary | null>(null);
  const [evaluateReport, setEvaluateReport] = useState<EvaluateReport | null>(null);
  const [evaluateError, setEvaluateError] = useState<string | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [evaluateLoading, setEvaluateLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('unknown');
  const [healthMessage, setHealthMessage] = useState('Not checked');

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

  const refreshWeather = useCallback(async () => {
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
  }, [farm.city, farm.latitude, farm.longitude]);

  const refreshEvaluate = useCallback(async () => {
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

  const refreshAll = useCallback(async () => {
    const health = await checkBackendHealth();
    if (health.ok) {
      setApiStatus('ok');
      setHealthMessage(
        typeof health.payload?.status === 'string'
          ? `Healthy · ${String(health.payload.engine ?? 'engine')}`
          : 'Healthy',
      );
    } else {
      setApiStatus('down');
      setHealthMessage(health.error || 'Backend unreachable');
    }
    await Promise.all([refreshWeather(), refreshEvaluate()]);
  }, [refreshWeather, refreshEvaluate]);

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
