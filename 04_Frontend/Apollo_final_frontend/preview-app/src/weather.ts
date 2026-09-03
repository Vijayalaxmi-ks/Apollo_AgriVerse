import { API_BASE, apiGet } from './api/client';

export type BackendWeatherPayload = {
  status: string;
  city: string;
  country: string;
  source: string;
  latitude: number;
  longitude: number;
  date: string;
  utc_hour: string;
  weather: {
    temperature_c?: number;
    humidity_pct?: number;
    rainfall_mm?: number;
    wind_speed_m_s?: number;
    solar_radiation_w_m2?: number;
    feels_like?: number;
    dew_point?: number;
    pressure?: number;
    visibility?: number;
    uv_index?: number;
    condition?: string;
    wind_dir?: string;
  };
  message?: string;
};

/** Summary shape used by App right column / twin */
export type LiveWeatherSummary = {
  city: string;
  temperature: number;
  humidity: number;
  rainfall: number;
  windKmh: number;
  condition: string;
  minTemp?: number;
  maxTemp?: number;
  source?: string;
  isBackend?: boolean;
  /** Observation date from weather API, e.g. "28 Aug 2026" */
  observationDate?: string;
  /** ISO YYYY-MM-DD from API when available */
  observationDateIso?: string;
  utcHour?: string;
};

function conditionFrom(temp: number, rain: number, cloud = 0): string {
  if (rain > 2) return 'Light Rain';
  if (cloud > 70) return 'Cloudy';
  if (cloud > 35) return 'Partly Cloudy';
  if (temp >= 34) return 'Hot';
  return 'Clear Sky';
}

/** Parse backend date fields: "20260828" or "2026-08-28" → display + ISO */
export function formatWeatherDate(
  rawDate?: string,
  _utcHour?: string,
): { display: string; iso: string } {
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth() + 1;
  let d = now.getDate();

  if (rawDate) {
    const digits = rawDate.replace(/\D/g, '');
    if (digits.length >= 8) {
      y = parseInt(digits.slice(0, 4), 10);
      m = parseInt(digits.slice(4, 6), 10);
      d = parseInt(digits.slice(6, 8), 10);
    } else if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
      const [yy, mm, dd] = rawDate.slice(0, 10).split('-').map(Number);
      y = yy;
      m = mm;
      d = dd;
    }
  }

  const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const dt = new Date(`${iso}T12:00:00`);
  const display = Number.isNaN(dt.getTime())
    ? now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return { display, iso };
}

/** Prefer backend hybrid weather; fall back to Open-Meteo in the browser */
export async function fetchLiveWeatherSummary(
  city = 'Solapur',
  lat = 17.66,
  lon = 75.91,
): Promise<LiveWeatherSummary | null> {
  // 1) Backend
  try {
    const data = await apiGet<BackendWeatherPayload>(
      `/weather?city=${encodeURIComponent(city)}`,
    );
    if (data && data.status !== 'error' && data.weather) {
      const w = data.weather;
      const temp = Number(w.temperature_c ?? 0);
      const rain = Number(w.rainfall_mm ?? 0);
      const { display, iso } = formatWeatherDate(data.date, data.utc_hour);
      return {
        city: data.city || city,
        temperature: Math.round(temp),
        humidity: Math.round(Number(w.humidity_pct ?? 0)),
        rainfall: Math.round(rain * 10) / 10,
        windKmh: Math.round(Number(w.wind_speed_m_s ?? 0) * 3.6),
        condition: w.condition || conditionFrom(temp, rain),
        source: data.source || 'Backend',
        isBackend: true,
        observationDate: display,
        observationDateIso: iso,
        utcHour: data.utc_hour,
      };
    }
  } catch {
    /* fall through */
  }

  // 2) Open-Meteo fallback
  try {
    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set(
      'current',
      'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,cloud_cover',
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
    const rawTime = String(c.time || '');
    const { display, iso } = formatWeatherDate(
      rawTime.slice(0, 10).replace(/-/g, '') || undefined,
      rawTime.length >= 13 ? rawTime.slice(11, 13) : undefined,
    );
    return {
      city,
      temperature: Math.round(temp),
      humidity: Math.round(Number(c.relative_humidity_2m ?? 0)),
      rainfall: Math.round(rain * 10) / 10,
      windKmh: Math.round(Number(c.wind_speed_10m ?? 0) * 3.6),
      condition: conditionFrom(temp, rain, cloud),
      minTemp: d.temperature_2m_min ? Math.round(Number(d.temperature_2m_min[0])) : undefined,
      maxTemp: d.temperature_2m_max ? Math.round(Number(d.temperature_2m_max[0])) : undefined,
      source: 'Open-Meteo (client fallback)',
      isBackend: false,
      observationDate: display,
      observationDateIso: iso,
      utcHour: rawTime.length >= 13 ? rawTime.slice(11, 13) : undefined,
    };
  } catch {
    return null;
  }
}

/** Resolve Indian city → lat/lon (backend weather geocode first, Open-Meteo fallback). */
export async function geocodeCity(
  cityName: string,
): Promise<{ city: string; latitude: number; longitude: number; source: string } | null> {
  const q = cityName.trim();
  if (q.length < 2) return null;

  // 1) Backend /weather geocodes the city and returns coordinates
  try {
    const data = await apiGet<BackendWeatherPayload & { latitude?: number; longitude?: number }>(
      `/weather?city=${encodeURIComponent(q)}`,
    );
    const lat = Number(data?.latitude);
    const lon = Number(data?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lon) && !(lat === 0 && lon === 0)) {
      return {
        city: data.city || q,
        latitude: Math.round(lat * 10000) / 10000,
        longitude: Math.round(lon * 10000) / 10000,
        source: 'backend',
      };
    }
  } catch {
    /* fall through */
  }

  // 2) Open-Meteo geocoding (prefer India)
  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', q);
    url.searchParams.set('count', '10');
    url.searchParams.set('language', 'en');
    url.searchParams.set('format', 'json');
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = await res.json();
    const results: Array<{
      name?: string;
      latitude?: number;
      longitude?: number;
      country_code?: string;
    }> = data?.results || [];
    if (!results.length) return null;
    const india = results.find((r) => r.country_code === 'IN') || results[0];
    const lat = Number(india.latitude);
    const lon = Number(india.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return {
      city: india.name || q,
      latitude: Math.round(lat * 10000) / 10000,
      longitude: Math.round(lon * 10000) / 10000,
      source: 'open-meteo',
    };
  } catch {
    return null;
  }
}

export async function fetchBackendWeatherRaw(cityName: string): Promise<BackendWeatherPayload | null> {
  try {
    const data = await apiGet<BackendWeatherPayload>(
      `/weather?city=${encodeURIComponent(cityName)}`,
    );
    if (!data || data.status === 'error') return null;
    return data;
  } catch {
    return null;
  }
}

export { API_BASE };
