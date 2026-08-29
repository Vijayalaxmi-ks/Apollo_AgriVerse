import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Units = 'metric' | 'imperial';
export type ThemeMode = 'dark' | 'oled' | 'midnight';

export type AppSettings = {
  farmName: string;
  operator: string;
  region: string;
  district: string;
  cropDefault: string;
  farmId: string;
  regionId: string;
  soilId: string;
  waterAvailability: string;
  city: string;
  latitude: number | '';
  longitude: number | '';
  units: Units;
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
  /** Number of field parcels on the twin (1–8) */
  fieldCount: number;
  /** Primary crop id from CROP_CATALOG (any crop) */
  primaryCrop: string;
  /** Default soil class applied to new fields */
  defaultSoilClass: string;
};

/** Blank farmer profile — no pre-filled farm identity until the user enters data */
export const EMPTY_FARM_SETTINGS: Pick<
  AppSettings,
  | 'farmName'
  | 'operator'
  | 'region'
  | 'district'
  | 'cropDefault'
  | 'farmId'
  | 'regionId'
  | 'soilId'
  | 'waterAvailability'
  | 'city'
  | 'latitude'
  | 'longitude'
> = {
  farmName: '',
  operator: '',
  region: '',
  district: '',
  cropDefault: '',
  farmId: '',
  regionId: '',
  soilId: '',
  waterAvailability: 'medium',
  city: '',
  latitude: '',
  longitude: '',
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  ...EMPTY_FARM_SETTINGS,
  units: 'metric',
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
  fieldCount: 4,
  primaryCrop: 'grape',
  defaultSoilClass: 'alluvial',
};

export type FarmerProfile = {
  id: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  settings: AppSettings;
};

const STORAGE_KEY = 'agriverse-settings-v2';
const PROFILES_KEY = 'agriverse-profiles-v1';
const ACTIVE_PROFILE_KEY = 'agriverse-active-profile-v1';

function uid() {
  return `prof_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Generate stable backend IDs from farmer-entered location + name (no static demo IDs) */
export function generateFarmIds(input: {
  farmName: string;
  region: string;
  district: string;
  city: string;
  soilHint?: string;
}): { farmId: string; regionId: string; soilId: string } {
  const slug = (s: string) =>
    (s || 'X')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 12) || 'X';
  const reg = slug(input.region || input.district || input.city || 'REG');
  const place = slug(input.district || input.city || input.farmName || 'LOC');
  const name = slug(input.farmName || 'FARM');
  const n = Math.abs(
    Array.from(`${name}${place}${reg}`).reduce((a, c) => a + c.charCodeAt(0), 0),
  );
  return {
    farmId: `FARM_${reg}_${place}_${String(n % 1000).padStart(3, '0')}`,
    regionId: `REG_${reg.slice(0, 6)}_${String((n * 7) % 10000).padStart(4, '0')}`,
    soilId: `SOIL_${slug(input.soilHint || place).slice(0, 6)}_${String((n * 13) % 100000).padStart(5, '0')}`,
  };
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_APP_SETTINGS, ...JSON.parse(raw) };
    // migrate v1 if present
    const v1 = localStorage.getItem('agriverse-settings-v1');
    if (v1) {
      const parsed = JSON.parse(v1);
      return { ...DEFAULT_APP_SETTINGS, ...parsed };
    }
  } catch {
    /* ignore */
  }
  return { ...DEFAULT_APP_SETTINGS };
}

function loadProfiles(): FarmerProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) {
      const list = JSON.parse(raw) as FarmerProfile[];
      if (Array.isArray(list)) return list;
    }
  } catch {
    /* ignore */
  }
  return [];
}

function loadActiveId(profiles: FarmerProfile[]): string | null {
  try {
    const id = localStorage.getItem(ACTIVE_PROFILE_KEY);
    if (id && profiles.some((p) => p.id === id)) return id;
  } catch {
    /* ignore */
  }
  return profiles[0]?.id ?? null;
}

type SettingsContextValue = {
  settings: AppSettings;
  setSettings: (patch: Partial<AppSettings>) => void;
  replaceSettings: (next: AppSettings) => void;
  resetSettings: () => void;
  saveSettings: () => void;
  /** Multi-profile */
  profiles: FarmerProfile[];
  activeProfileId: string | null;
  activeProfile: FarmerProfile | null;
  createProfile: (label?: string) => FarmerProfile;
  switchProfile: (id: string) => void;
  deleteProfile: (id: string) => void;
  renameProfile: (id: string, label: string) => void;
  saveActiveProfile: () => void;
  /** True when farmer has entered minimum identity to drive APIs */
  profileComplete: boolean;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettingsState] = useState<AppSettings>(() => loadSettings());
  const [profiles, setProfiles] = useState<FarmerProfile[]>(() => loadProfiles());
  const [activeProfileId, setActiveProfileId] = useState<string | null>(() =>
    loadActiveId(loadProfiles()),
  );

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  // Persist profiles list
  useEffect(() => {
    try {
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    } catch {
      /* ignore */
    }
  }, [profiles]);

  useEffect(() => {
    try {
      if (activeProfileId) localStorage.setItem(ACTIVE_PROFILE_KEY, activeProfileId);
      else localStorage.removeItem(ACTIVE_PROFILE_KEY);
    } catch {
      /* ignore */
    }
  }, [activeProfileId]);

  // Theme
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    if (settings.theme === 'oled') {
      root.style.setProperty('--app-bg', '#000000');
      root.style.setProperty('--app-panel', '#0a0a0a');
      root.style.setProperty('--app-border', '#1a1a1a');
    } else if (settings.theme === 'midnight') {
      root.style.setProperty('--app-bg', '#060b14');
      root.style.setProperty('--app-panel', '#0a1220');
      root.style.setProperty('--app-border', '#152033');
    } else {
      root.style.setProperty('--app-bg', '#080d14');
      root.style.setProperty('--app-panel', '#0c121c');
      root.style.setProperty('--app-border', '#1e2d40');
    }
    if (settings.reduceMotion) root.classList.add('reduce-motion');
    else root.classList.remove('reduce-motion');
  }, [settings.theme, settings.reduceMotion]);

  const setSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettingsState((prev) => ({ ...prev, ...patch }));
  }, []);

  const replaceSettings = useCallback((next: AppSettings) => {
    setSettingsState(next);
  }, []);

  const resetSettings = useCallback(() => {
    setSettingsState({ ...DEFAULT_APP_SETTINGS });
  }, []);

  const saveSettings = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      /* ignore */
    }
  }, [settings]);

  const createProfile = useCallback(
    (label?: string) => {
      const now = new Date().toISOString();
      const blank: AppSettings = { ...DEFAULT_APP_SETTINGS };
      const profile: FarmerProfile = {
        id: uid(),
        label: label || `Farm profile ${profiles.length + 1}`,
        createdAt: now,
        updatedAt: now,
        settings: blank,
      };
      setProfiles((prev) => [...prev, profile]);
      setActiveProfileId(profile.id);
      setSettingsState(blank);
      return profile;
    },
    [profiles.length],
  );

  const switchProfile = useCallback(
    (id: string) => {
      const p = profiles.find((x) => x.id === id);
      if (!p) return;
      // stash current into active profile first
      setProfiles((prev) =>
        prev.map((x) =>
          x.id === activeProfileId
            ? { ...x, settings: { ...settings }, updatedAt: new Date().toISOString() }
            : x,
        ),
      );
      setActiveProfileId(id);
      setSettingsState({ ...DEFAULT_APP_SETTINGS, ...p.settings });
    },
    [profiles, activeProfileId, settings],
  );

  const deleteProfile = useCallback(
    (id: string) => {
      setProfiles((prev) => {
        const next = prev.filter((p) => p.id !== id);
        if (activeProfileId === id) {
          const fallback = next[0];
          setActiveProfileId(fallback?.id ?? null);
          setSettingsState(fallback ? { ...DEFAULT_APP_SETTINGS, ...fallback.settings } : { ...DEFAULT_APP_SETTINGS });
        }
        return next;
      });
    },
    [activeProfileId],
  );

  const renameProfile = useCallback((id: string, label: string) => {
    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, label, updatedAt: new Date().toISOString() } : p)),
    );
  }, []);

  const saveActiveProfile = useCallback(() => {
    if (!activeProfileId) {
      // auto-create if farmer saves without a profile
      const now = new Date().toISOString();
      const label = settings.farmName?.trim() || `Farm profile ${profiles.length + 1}`;
      const profile: FarmerProfile = {
        id: uid(),
        label,
        createdAt: now,
        updatedAt: now,
        settings: { ...settings },
      };
      setProfiles((prev) => [...prev, profile]);
      setActiveProfileId(profile.id);
      saveSettings();
      return;
    }
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === activeProfileId
          ? {
              ...p,
              label: settings.farmName?.trim() || p.label,
              settings: { ...settings },
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    );
    saveSettings();
  }, [activeProfileId, settings, profiles.length, saveSettings]);

  const profileComplete = Boolean(
    settings.farmName?.trim() &&
      settings.city?.trim() &&
      settings.latitude !== '' &&
      settings.longitude !== '' &&
      settings.farmId?.trim(),
  );

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? null;

  const value = useMemo(
    () => ({
      settings,
      setSettings,
      replaceSettings,
      resetSettings,
      saveSettings,
      profiles,
      activeProfileId,
      activeProfile,
      createProfile,
      switchProfile,
      deleteProfile,
      renameProfile,
      saveActiveProfile,
      profileComplete,
    }),
    [
      settings,
      setSettings,
      replaceSettings,
      resetSettings,
      saveSettings,
      profiles,
      activeProfileId,
      activeProfile,
      createProfile,
      switchProfile,
      deleteProfile,
      renameProfile,
      saveActiveProfile,
      profileComplete,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

export function useSettingsOptional() {
  return useContext(SettingsContext);
}
