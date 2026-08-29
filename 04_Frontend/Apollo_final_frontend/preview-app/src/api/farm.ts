/** Backend farm profile bootstrap + save */

import { apiGet, apiPost } from './client';

export type BackendFarmDefault = {
  farm_id: string;
  region_id: string;
  soil_id: string;
  water_availability: string;
  latitude: number;
  longitude: number;
  city?: string;
  farm_name?: string;
  primary_crop?: string;
  default_soil_class?: string;
  field_count?: number;
  farm_area_ha?: number;
  fields?: FarmFieldPayload[];
  measures?: Record<string, unknown>;
  [key: string]: unknown;
};

export type FarmFieldPayload = {
  field_id: string;
  name?: string;
  acres?: number;
  soil_class?: string;
  crop_id?: string;
  grape_variety?: string;
  area_ha?: string;
  yield_t_per_ha?: string;
  density_per_ha?: string;
  irrigation_mm?: string;
  notes?: string;
};

export type FarmProfileSavePayload = {
  farm_id: string;
  region_id?: string;
  soil_id?: string;
  farm_name?: string;
  operator?: string;
  region?: string;
  district?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  water_availability?: string;
  primary_crop?: string;
  default_soil_class?: string;
  field_count?: number;
  fields?: FarmFieldPayload[];
  measures?: Record<string, unknown>;
  profile_label?: string;
  saved_at?: string;
};

export async function fetchFarmDefault(): Promise<BackendFarmDefault> {
  const res = await apiGet<{ success?: boolean; data: BackendFarmDefault }>('/api/farm/default');
  if (res?.data) return res.data;
  return res as unknown as BackendFarmDefault;
}

/** Full active profile (fields + measures + field_count) from backend */
export async function fetchActiveFarmProfile(): Promise<FarmProfileSavePayload | null> {
  try {
    const res = await apiGet<{ success?: boolean; data: FarmProfileSavePayload | null }>(
      '/api/farm/active',
    );
    if (res?.data) return res.data;
    return null;
  } catch {
    return null;
  }
}

export async function saveFarmProfile(
  payload: FarmProfileSavePayload,
): Promise<{ success: boolean; farm_id: string; saved_at?: string; message?: string }> {
  return apiPost('/api/farm/profile', payload);
}

export async function fetchFarmProfile(
  farmId: string,
): Promise<FarmProfileSavePayload & { saved_at?: string }> {
  const res = await apiGet<{ success?: boolean; data: FarmProfileSavePayload & { saved_at?: string } }>(
    `/api/farm/profile/${encodeURIComponent(farmId)}`,
  );
  if (res?.data) return res.data;
  return res as unknown as FarmProfileSavePayload & { saved_at?: string };
}
