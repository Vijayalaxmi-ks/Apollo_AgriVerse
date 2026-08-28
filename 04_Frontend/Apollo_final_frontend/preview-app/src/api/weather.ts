import { API_BASE, apiGet } from './client';

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
};

function conditionFrom(temp: number, rain: number, cloud = 0): string {
  if (rain > 2) return 'Light Rain';
  if (cloud > 70) return 'Cloudy';
  if (cloud > 35) return 'Partly Cloudy';
  if (temp >= 34) return 'Hot';
  return 'Clear Sky';
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
      return {
        city: data.city || city,
        temperature: Math.round(temp),
        humidity: Math.round(Number(w.humidity_pct ?? 0)),
        rainfall: Math.round(rain * 10) / 10,
        windKmh: Math.round(Number(w.wind_speed_m_s ?? 0) * 3.6),
        condition: w.condition || conditionFrom(temp, rain),
        source: data.source || 'Backend',
        isBackend: true,
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
