/** Apollo 06_ML model inference via backend */

import { apiGet, apiPost } from './client';

export type MlStatus = {
  success?: boolean;
  any_loaded: boolean;
  yield_model_loaded: boolean;
  yield_scaler_loaded: boolean;
  telemetry_model_loaded: boolean;
  telemetry_scaler_loaded: boolean;
  models_dir?: string;
  error?: string;
};

export type YieldPredictRequest = {
  nitrogen_mgkg: number;
  phosphorus_mgkg: number;
  potassium_mgkg: number;
  soil_ph: number;
  air_temp_c: number;
  humidity_pct: number;
  rainfall_mm: number;
  optimal_ph?: number;
};

export type YieldPredictResponse = {
  success: boolean;
  predicted_yield_tons_ha: number;
  features?: Record<string, number>;
  source?: string;
};

export type TelemetryPredictRequest = {
  air_temp_c: number;
  humidity_pct: number;
  soil_moisture_pct: number;
  soil_temp_c: number;
  hydrogel_release_rate: number;
  mulch_degradation_pct: number;
  mulch_temp_reduction_c: number;
  area_acres: number;
  canopy_cover_percent: number;
  chlorophyll_index: number;
  crop_age_days: number;
  latitude: number;
};

export type TelemetryPredictResponse = {
  success: boolean;
  predicted_required_hydrogel_storage_pct: number;
  derived?: {
    thermal_gap: number;
    effective_mulch_cooling: number;
    evapotranspiration_index: number;
  };
  source?: string;
};

export async function fetchMlStatus(): Promise<MlStatus> {
  return apiGet<MlStatus>('/api/ml/status');
}

export async function predictGrapeYield(
  body: YieldPredictRequest,
): Promise<YieldPredictResponse> {
  return apiPost<YieldPredictResponse>('/api/ml/yield', body);
}

export async function predictTelemetryHydrogel(
  body: TelemetryPredictRequest,
): Promise<TelemetryPredictResponse> {
  return apiPost<TelemetryPredictResponse>('/api/ml/telemetry', body);
}
