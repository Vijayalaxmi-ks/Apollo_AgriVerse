import { apiGet, apiPost } from './client';

export type FarmEvaluationRequest = {
  farm_id: string;
  region_id: string;
  soil_id: string;
  water_availability: string;
  latitude: number;
  longitude: number;
};

export type ScoreTree = {
  agronomic_total?: number;
  climate?: { score?: number; weight?: number; sub_tree?: unknown };
  soil?: { score?: number; weight?: number; sub_tree?: unknown };
  water?: number | { score?: number; weight?: number };
  market?: {
    score?: number;
    weight?: number;
    modal_price?: number;
    trend?: string;
  };
};

export type CropRecommendation = {
  crop_name: string;
  is_focus_crop?: boolean;
  final_suitability_score: number;
  agronomic_score?: number;
  expected_yield_tons_ha?: number | null;
  suitability_band?: string;
  water_requirement?: string;
  score_tree?: ScoreTree;
  pros?: string[];
  cons?: string[];
};

export type EvaluateReport = {
  location?: {
    district?: string;
    state?: string;
    region_id?: string;
  };
  soil_profile?: {
    type?: string;
    soil_id?: string;
    ph?: number;
    oc?: number | null;
    ec?: number | null;
    n?: number | null;
    p?: number | null;
    k?: number | null;
    moisture_pct?: number | null;
    temperature_c?: number | null;
    health_score?: number | null;
    texture?: string;
    sand_pct?: number | null;
    silt_pct?: number | null;
    clay_pct?: number | null;
  };
  water_availability?: string;
  live_weather_applied?: boolean;
  focus_crop?: string;
  focus_crop_assessment?: CropRecommendation | null;
  primary_recommendations?: CropRecommendation[];
  disqualified_crops?: { crop_name: string; agronomic_score?: number; reason?: string }[];
};

type EvaluateApiResponse = {
  success?: boolean;
  data?: EvaluateReport;
  detail?: string;
};

export const DEFAULT_FARM_REQUEST: FarmEvaluationRequest = {
  farm_id: 'FARM_MH_NASHIK_01',
  region_id: 'REG_0002',
  soil_id: 'SOIL_00001',
  water_availability: 'medium',
  latitude: 19.9975,
  longitude: 73.7898,
};

export async function evaluateFarm(
  req: FarmEvaluationRequest = DEFAULT_FARM_REQUEST,
): Promise<EvaluateReport> {
  const res = await apiPost<EvaluateApiResponse>('/api/evaluate', req);
  if (res?.data) return res.data;
  if (res && !('success' in res) && ('primary_recommendations' in (res as object) || 'location' in (res as object))) {
    return res as unknown as EvaluateReport;
  }
  throw new Error(res?.detail || 'Evaluate returned no data');
}

export async function checkBackendHealth(): Promise<{
  ok: boolean;
  payload?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const payload = await apiGet<Record<string, unknown>>('/health');
    return { ok: true, payload: payload || {} };
  } catch (e1) {
    // Fallback: root ping (some deploys only expose /)
    try {
      const root = await apiGet<Record<string, unknown>>('/');
      const status = String((root as { status?: string })?.status || '');
      if (status.toLowerCase().includes('running') || (root as { project?: string })?.project) {
        return { ok: true, payload: root || {} };
      }
    } catch {
      /* ignore */
    }
    const msg = e1 instanceof Error ? e1.message : String(e1);
    return { ok: false, error: msg };
  }
}
