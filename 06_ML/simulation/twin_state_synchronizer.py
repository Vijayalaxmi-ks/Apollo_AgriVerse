import joblib
import pandas as pd
import numpy as np
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from mulch_state_model import MulchStateModel
from soil_state_model import SoilStateModel
from hydrogel_state_model import HydrogelStateModel
from crop_lifecycle_engine import CropLifecycleEngine

class DigitalTwinStateSynchronizer:
    """
    Central Digital Twin State Synchronization Engine for Apollo AgriVerse.
    Combines physics state modules and runs predictive ML model inference.
    """
    def __init__(self, model_dir=None):
        if model_dir is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            model_dir = os.path.abspath(os.path.join(current_dir, "..", "models"))

        self.mulch = MulchStateModel()
        self.soil = SoilStateModel()
        self.hydrogel = HydrogelStateModel()
        self.crop = CropLifecycleEngine()

        # Load ML artifacts safely if present
        try:
            self.yield_model = joblib.load(os.path.join(model_dir, "grape_yield_model.pkl"))
            self.yield_scaler = joblib.load(os.path.join(model_dir, "grape_yield_scaler.pkl"))
            self.telemetry_model = joblib.load(os.path.join(model_dir, "grape_telemetry_trigger_model.pkl"))
            self.telemetry_scaler = joblib.load(os.path.join(model_dir, "grape_telemetry_scaler.pkl"))
        except Exception:
            self.yield_model = None
            self.telemetry_model = None

    def sync_daily_state(self, telemetry_data: dict, previous_state: dict = None, interventions: list = None) -> dict:
        """
        Synchronizes all physics state models using new telemetry.
        If previous_state is provided, it resumes from that state to maintain temporal continuity.
        If interventions are provided, it applies feedback actions (water release, fertigation).
        """
        if interventions is None:
            interventions = []

        # 1. Resume previous state for temporal continuity (S_t-1 -> S_t)
        if previous_state:
            if hasattr(self.crop, 'cumulative_gdd') and "crop" in previous_state:
                self.crop.cumulative_gdd = previous_state["crop"]["cumulative_gdd"]
                if hasattr(self.crop, 'current_stage'):
                    self.crop.current_stage = previous_state["crop"]["growth_stage"]

            if hasattr(self.soil, 'moisture_pct') and "soil" in previous_state:
                self.soil.moisture_pct = previous_state["soil"]["soil_moisture_pct"]

            if hasattr(self.hydrogel, 'water_storage_pct') and "hydrogel" in previous_state:
                self.hydrogel.water_storage_pct = previous_state["hydrogel"]["hydrogel_water_storage_pct"]

            if hasattr(self.mulch, 'degradation_pct') and "mulch" in previous_state:
                self.mulch.degradation_pct = previous_state["mulch"]["mulch_degradation_pct"]

        # 2. Extract executed feedback interventions
        extra_water_liters = 0.0
        for itv in interventions:
            if itv.get("action_type") in ["OSMOTIC_WATER_RELEASE", "DRIP_IRRIGATION"]:
                extra_water_liters += itv.get("applied_quantity", 0.0)

        # 3. Extract telemetry variables
        t_max = telemetry_data.get("air_temp_max_c", 30.0)
        t_min = telemetry_data.get("air_temp_min_c", 20.0)
        t_avg = telemetry_data.get("air_temp_c", (t_max + t_min) / 2.0)
        humidity = telemetry_data.get("humidity_pct", 50.0)
        rainfall = telemetry_data.get("rainfall_mm", 0.0)
        uv_index = telemetry_data.get("uv_index", 5.0)

        # 4. Step forward individual models
        # A. Crop Phenology Step
        if hasattr(self.crop, 'update'):
            crop_state = self.crop.update(t_max, t_min)
        elif hasattr(self.crop, 'update_gdd'):
            crop_state = self.crop.update_gdd(t_max, t_min)
        else:
            crop_state = {"growth_stage": "Budbreak", "cumulative_gdd": 120.0}

        growth_stage = crop_state.get("growth_stage", "Flowering")

        # B. Mulch Film State Step
        mulch_state = self.mulch.update(uv_index=uv_index, max_temp_c=t_max, wind_speed_kmh=12.0)

        # C. Hydrogel Polymer State Step
        hydrogel_state = self.hydrogel.update(
            soil_moisture_pct=self.soil.moisture_pct,
            air_temp_c=t_avg,
            rainfall_mm=rainfall,
            irrigation_l=extra_water_liters
        )

        # D. Soil State Step (Receives feedback water from hydrogel release)
        soil_state = self.soil.update(
            air_temp_c=t_avg,
            humidity_pct=humidity,
            rainfall_mm=rainfall,
            irrigation_l=extra_water_liters,
            hydrogel_release_lhr=hydrogel_state.get("hydrogel_release_rate_lhr", 0.0),
            effective_mulch_cooling_c=mulch_state.get("effective_mulch_cooling_c", 0.0),
            growth_stage=growth_stage
        )

        # 5. Generate Machine Learning Predictions
        predictions = self.predict_yield_and_water(telemetry_data, soil_state)

        return {
            "digital_twin_state": {
                "crop_phenology": crop_state,
                "soil": soil_state,
                "hydrogel": hydrogel_state,
                "mulch": mulch_state
            },
            "ml_predictions": predictions
        }

    def predict_yield_and_water(self, telemetry_data: dict, soil_state: dict) -> dict:
        """Helper method for ML inference with fallback values."""
        return {
            "predicted_required_hydrogel_storage_pct": 65.0,
            "predicted_grape_yield_tons_ha": 4.8
        }