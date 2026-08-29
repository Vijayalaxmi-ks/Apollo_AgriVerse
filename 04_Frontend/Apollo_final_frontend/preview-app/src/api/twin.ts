/** Apollo 06_ML digital twin simulation via backend */

import { apiGet, apiPost } from './client';

export type TwinStepRequest = {
  farm_id: string;
  air_temp_c: number;
  air_temp_max_c: number;
  air_temp_min_c: number;
  humidity_pct: number;
  rainfall_mm: number;
  uv_index: number;
};

export type TwinStatePayload = {
  farm_id?: string;
  timestamp?: string;
  telemetry?: Record<string, unknown>;
  soil?: {
    soil_moisture_pct?: number;
    soil_temp_c?: number;
    nitrogen_mgkg?: number;
    phosphorus_mgkg?: number;
    potassium_mgkg?: number;
  };
  hydrogel?: {
    hydrogel_water_storage_pct?: number;
    hydrogel_release_rate_lhr?: number;
  };
  mulch?: {
    mulch_degradation_pct?: number;
    effective_mulch_cooling_c?: number;
  };
  crop?: {
    growth_stage?: string;
    cumulative_gdd?: number;
  };
  intelligence?: {
    soil_health_index?: string;
    events?: unknown[];
    executed_interventions?: unknown[];
  };
  predictions?: {
    predicted_required_hydrogel_storage_pct?: number;
    predicted_grape_yield_tons_ha?: number;
  };
  [key: string]: unknown;
};

export type TwinStateResponse = {
  success: boolean;
  state: TwinStatePayload | null;
  message?: string;
  source?: string;
};

export async function fetchTwinState(): Promise<TwinStateResponse> {
  return apiGet<TwinStateResponse>('/api/twin/state');
}

export async function stepTwin(body: TwinStepRequest): Promise<TwinStateResponse> {
  return apiPost<TwinStateResponse>('/api/twin/step', body);
}
