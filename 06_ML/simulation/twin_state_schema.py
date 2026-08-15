from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# --- SUB-SCHEMAS ---

class TelemetryInput(BaseModel):
    farm_id: str = Field(default="NASIK_GRAPE_PARCEL_04")
    air_temp_c: float
    air_temp_max_c: float
    air_temp_min_c: float
    humidity_pct: float
    rainfall_mm: float
    uv_index: float

class SoilState(BaseModel):
    soil_moisture_pct: float
    soil_temp_c: float
    nitrogen_mgkg: float
    phosphorus_mgkg: float
    potassium_mgkg: float

class HydrogelState(BaseModel):
    hydrogel_water_storage_pct: float
    hydrogel_release_rate_lhr: float

class MulchState(BaseModel):
    mulch_degradation_pct: float
    effective_mulch_cooling_c: float

class CropState(BaseModel):
    growth_stage: str
    cumulative_gdd: float

class IntelligenceEvent(BaseModel):
    component: str  # SOIL, HYDROGEL, MULCH
    event_type: str # WATER_DEFICIT, THERMAL_STRESS, RELEASE_ACTIVE, REPLACEMENT_REQUIRED
    severity: str   # LOW, MODERATE, HIGH, CRITICAL
    reason: str
    action_taken: str

class Intervention(BaseModel):
    component: str             # SOIL, HYDROGEL, MULCH
    action_type: str           # OSMOTIC_WATER_RELEASE, DRIP_IRRIGATION, FERTIGATION_N, MULCH_REINFORCE
    applied_quantity: float    # e.g., Liters of water, mg/kg of NPK
    unit: str                  # L, mg/kg, %
    status: str = "EXECUTED"   # EXECUTED, PENDING, FAILED

class IntelligenceDiagnosis(BaseModel):
    soil_health_index: str
    events: List[IntelligenceEvent] = []
    executed_interventions: List[Intervention] = []

class MachineLearningPredictions(BaseModel):
    predicted_required_hydrogel_storage_pct: float
    predicted_grape_yield_tons_ha: float

# --- MASTER TWIN STATE SCHEMA ---

class TwinState(BaseModel):
    farm_id: str
    timestamp: datetime
    telemetry: TelemetryInput
    soil: SoilState
    hydrogel: HydrogelState
    mulch: MulchState
    crop: CropState
    intelligence: IntelligenceDiagnosis
    predictions: MachineLearningPredictions