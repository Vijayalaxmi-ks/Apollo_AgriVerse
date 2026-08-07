import joblib
import pandas as pd
import numpy as np
import os

# 1. Define Paths
MODEL_DIR = "../models"

YIELD_MODEL_PATH = os.path.join(MODEL_DIR, "grape_yield_model.pkl")
YIELD_SCALER_PATH = os.path.join(MODEL_DIR, "grape_yield_scaler.pkl")

TELEMETRY_MODEL_PATH = os.path.join(MODEL_DIR, "grape_telemetry_trigger_model.pkl")
TELEMETRY_SCALER_PATH = os.path.join(MODEL_DIR, "grape_telemetry_scaler.pkl")

print("=== APOLLO AGRIVERSE ML INFERENCE VERIFICATION ===")

# --- TEST 1: YIELD PREDICTION MODEL ---
print("\n[1/2] Testing Grape Yield Prediction Engine...")
yield_model = joblib.load(YIELD_MODEL_PATH)
yield_scaler = joblib.load(YIELD_SCALER_PATH)

sample_yield_input = pd.DataFrame([{
    'nitrogen_mgkg': 140.0,
    'phosphorus_mgkg': 45.0,
    'potassium_mgkg': 210.0,
    'soil_ph': 6.4,
    'air_temp_c': 26.5,
    'humidity_pct': 65.0,
    'rainfall_mm': 720.0,
    'N_K_ratio': 140.0 / (210.0 + 1e-5),
    'P_K_ratio': 45.0 / (210.0 + 1e-5),
    'ph_opt_dev': abs(6.4 - 6.5)
}])

# Align columns with scaler
sample_yield_input = sample_yield_input[yield_scaler.feature_names_in_]
scaled_yield_input = yield_scaler.transform(sample_yield_input)
predicted_yield = yield_model.predict(scaled_yield_input)[0]
print(f"-> SUCCESS! Predicted Grape Yield: {predicted_yield:.2f} tons/ha")

# --- TEST 2: TELEMETRY HYDROGEL TRIGGER MODEL ---
print("\n[2/2] Testing Telemetry Hydrogel Trigger Engine...")
telemetry_model = joblib.load(TELEMETRY_MODEL_PATH)
telemetry_scaler = joblib.load(TELEMETRY_SCALER_PATH)

# Create a sample dict with default values for all features seen at fit time
expected_features = telemetry_scaler.feature_names_in_
sample_data = {feat: 0.0 for feat in expected_features}

# Update with specific sample telemetry values
sample_data.update({
    'air_temp_c': 31.2,
    'humidity_pct': 48.0,
    'soil_moisture_pct': 24.5,
    'soil_temp_c': 27.0,
    'hydrogel_release_rate': 12.5,
    'mulch_degradation_pct': 15.0,
    'mulch_temp_reduction_c': 3.2,
    'thermal_gap': 31.2 - 27.0,
    'effective_mulch_cooling': 3.2 * (1 - (15.0 / 100)),
    'evapotranspiration_index': 31.2 / (48.0 + 1e-5),
    'area_acres': 5.0,
    'canopy_cover_percent': 65.0,
    'chlorophyll_index': 42.0,
    'crop_age_days': 120.0,
    'latitude': 19.9975
})

sample_telemetry_input = pd.DataFrame([sample_data])[expected_features]

scaled_telemetry_input = telemetry_scaler.transform(sample_telemetry_input)
predicted_hydrogel_storage = telemetry_model.predict(scaled_telemetry_input)[0]
print(f"-> SUCCESS! Predicted Required Hydrogel Storage: {predicted_hydrogel_storage:.2f}%")

print("\n=== ALL MODEL ARTIFACTS VERIFIED SUCCESSFULLY ===")