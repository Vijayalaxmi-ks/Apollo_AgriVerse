import joblib
import pandas as pd
import numpy as np
import os
import sys

# Ensure current simulation folder is in Python path
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

        # Load ML artifacts
        self.yield_model = joblib.load(os.path.join(model_dir, "grape_yield_model.pkl"))
        self.yield_scaler = joblib.load(os.path.join(model_dir, "grape_yield_scaler.pkl"))
        self.telemetry_model = joblib.load(os.path.join(model_dir, "grape_telemetry_trigger_model.pkl"))
        self.telemetry_scaler = joblib.load(os.path.join(model_dir, "grape_telemetry_scaler.pkl"))

    def sync_daily_state(self, telemetry_input: dict) -> dict:
        # 1. Update Mulch State
        mulch_out = self.mulch.update(
            uv_index=telemetry_input.get("uv_index", 5.0),
            max_temp_c=telemetry_input.get("air_temp_max_c", 32.0),
            wind_speed_kmh=telemetry_input.get("wind_speed_kmh", 12.0)
        )

        # 2. Update Hydrogel State
        hydrogel_out = self.hydrogel.update(
            soil_moisture_pct=self.soil.moisture_pct,
            air_temp_c=telemetry_input.get("air_temp_c", 28.0),
            irrigation_l=telemetry_input.get("irrigation_l", 0.0),
            rainfall_mm=telemetry_input.get("rainfall_mm", 0.0)
        )

        # 3. Update Crop Phenology Engine (GDD)
        crop_out = self.crop.update(
            t_max_c=telemetry_input.get("air_temp_max_c", 32.0),
            t_min_c=telemetry_input.get("air_temp_min_c", 18.0)
        )

        # 4. Update Soil State
        soil_out = self.soil.update(
            air_temp_c=telemetry_input.get("air_temp_c", 28.0),
            humidity_pct=telemetry_input.get("humidity_pct", 60.0),
            rainfall_mm=telemetry_input.get("rainfall_mm", 0.0),
            irrigation_l=telemetry_input.get("irrigation_l", 0.0),
            hydrogel_release_lhr=hydrogel_out["hydrogel_release_rate_lhr"],
            effective_mulch_cooling_c=mulch_out["effective_mulch_cooling_c"],
            growth_stage=crop_out["growth_stage"]
        )

        # 5. Build ML Input Vector for Telemetry Trigger Model
        expected_telemetry_features = list(self.telemetry_scaler.feature_names_in_)
        telemetry_dict = {feat: 0.0 for feat in expected_telemetry_features}

        telemetry_dict.update({
            'air_temp_c': telemetry_input.get("air_temp_c", 28.0),
            'humidity_pct': telemetry_input.get("humidity_pct", 60.0),
            'soil_moisture_pct': soil_out["soil_moisture_pct"],
            'soil_temp_c': soil_out["soil_temp_c"],
            'hydrogel_release_rate': hydrogel_out["hydrogel_release_rate_lhr"],
            'mulch_degradation_pct': mulch_out["mulch_degradation_pct"],
            'mulch_temp_reduction_c': mulch_out["effective_mulch_cooling_c"],
            'thermal_gap': telemetry_input.get("air_temp_c", 28.0) - soil_out["soil_temp_c"],
            'effective_mulch_cooling': mulch_out["effective_mulch_cooling_c"],
            'evapotranspiration_index': telemetry_input.get("air_temp_c", 28.0) / (telemetry_input.get("humidity_pct", 60.0) + 1e-5),
            'area_acres': telemetry_input.get("area_acres", 5.0),
            'canopy_cover_percent': crop_out["estimated_canopy_cover_pct"],
            'chlorophyll_index': 45.0,
            'crop_age_days': telemetry_input.get("crop_age_days", 60.0),
            'latitude': telemetry_input.get("latitude", 19.9975),
            'longitude': telemetry_input.get("longitude", 73.7898),
            'plant_height_cm': 120.0,
            'leaf_area_index': 2.8
        })

        df_telemetry = pd.DataFrame([telemetry_dict])[expected_telemetry_features]
        scaled_telemetry = self.telemetry_scaler.transform(df_telemetry)
        predicted_hydrogel_req = self.telemetry_model.predict(scaled_telemetry)[0]

        # 6. Build ML Input Vector for Yield Model
        expected_yield_features = list(self.yield_scaler.feature_names_in_)
        yield_dict = {feat: 0.0 for feat in expected_yield_features}

        yield_dict.update({
            'nitrogen_mgkg': soil_out["nitrogen_mgkg"],
            'phosphorus_mgkg': soil_out["phosphorus_mgkg"],
            'potassium_mgkg': soil_out["potassium_mgkg"],
            'soil_ph': soil_out["soil_ph"],
            'air_temp_c': telemetry_input.get("air_temp_c", 28.0),
            'humidity_pct': telemetry_input.get("humidity_pct", 60.0),
            'rainfall_mm': telemetry_input.get("seasonal_rainfall_mm", 700.0),
            'N_K_ratio': soil_out["nitrogen_mgkg"] / (soil_out["potassium_mgkg"] + 1e-5),
            'P_K_ratio': soil_out["phosphorus_mgkg"] / (soil_out["potassium_mgkg"] + 1e-5),
            'ph_opt_dev': abs(soil_out["soil_ph"] - 6.5)
        })

        df_yield = pd.DataFrame([yield_dict])[expected_yield_features]
        scaled_yield = self.yield_scaler.transform(df_yield)
        predicted_yield = self.yield_model.predict(scaled_yield)[0]

        return {
            "digital_twin_state": {
                "mulch": mulch_out,
                "hydrogel": hydrogel_out,
                "soil": soil_out,
                "crop_phenology": crop_out
            },
            "ml_predictions": {
                "predicted_required_hydrogel_storage_pct": round(predicted_hydrogel_req, 2),
                "predicted_grape_yield_tons_ha": round(predicted_yield, 2)
            }
        }