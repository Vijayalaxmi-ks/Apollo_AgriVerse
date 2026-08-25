import logging
from pathlib import Path
from typing import Optional
import joblib
import numpy as np
import pandas as pd

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MLEngineService")

class MLEngineService:
    """Wrapper service for loading and executing trained ML models and feature scalers."""

    def __init__(self, models_dir: Optional[str] = None):
        workspace_root = Path(__file__).resolve().parent.parent.parent
        self.models_dir = Path(models_dir) if models_dir else workspace_root / "06_ML" / "models"
        
        self.yield_scaler = None
        self.yield_model = None
        self.telemetry_scaler = None
        self.telemetry_trigger_model = None

        self._load_artifacts()

    def _load_artifacts(self) -> None:
        """Loads all scalers and models from the 06_ML/models directory dynamically."""
        try:
            # 1. Load Yield Models
            scaler_files = list(self.models_dir.glob("grape_yield_scaler*.pkl"))
            model_files = list(self.models_dir.glob("grape_yield_model*.pkl"))

            if scaler_files:
                self.yield_scaler = joblib.load(scaler_files[0])
                logger.info(f"✅ Loaded Yield Scaler: {scaler_files[0].name}")
            if model_files:
                self.yield_model = joblib.load(model_files[0])
                logger.info(f"✅ Loaded Yield Model: {model_files[0].name}")

            # 2. Load Telemetry Trigger Models (The new yellow checklist item)
            tel_scaler_files = list(self.models_dir.glob("grape_telemetry_scaler*.pkl"))
            tel_model_files = list(self.models_dir.glob("grape_telemetry_trigger_model*.pkl"))

            if tel_scaler_files:
                self.telemetry_scaler = joblib.load(tel_scaler_files[0])
                logger.info(f"✅ Loaded Telemetry Scaler: {tel_scaler_files[0].name}")
            if tel_model_files:
                self.telemetry_trigger_model = joblib.load(tel_model_files[0])
                logger.info(f"✅ Loaded Telemetry Trigger Model: {tel_model_files[0].name}")

        except Exception as exc:
            logger.error(f"Error loading ML artifacts: {exc}")

    def prepare_yield_features(self, n_mgkg, p_mgkg, k_mgkg, soil_ph, air_temp_c, humidity_pct, rainfall_mm, optimal_ph=6.5):
        n_k_ratio = float(n_mgkg) / max(float(k_mgkg), 1e-5)
        p_k_ratio = float(p_mgkg) / max(float(k_mgkg), 1e-5)
        ph_opt_dev = abs(float(soil_ph) - optimal_ph)

        return pd.DataFrame(
            [[n_mgkg, p_mgkg, k_mgkg, soil_ph, air_temp_c, humidity_pct, rainfall_mm, n_k_ratio, p_k_ratio, ph_opt_dev]],
            columns=["nitrogen_mgkg", "phosphorus_mgkg", "potassium_mgkg", "soil_ph", "air_temp_c", "humidity_pct", "rainfall_mm", "N_K_ratio", "P_K_ratio", "ph_opt_dev"],
        )

    def predict_grape_yield(self, features_df: pd.DataFrame) -> float:
        if self.yield_model is None:
            return 0.0
        scaled_data = self.yield_scaler.transform(features_df) if self.yield_scaler else features_df.to_numpy()
        prediction = self.yield_model.predict(scaled_data)
        return float(np.round(prediction[0], 2))

    def predict_telemetry_trigger(self, telemetry_features_df: pd.DataFrame) -> float:
        """Runs inference using the grape_telemetry_trigger_model."""
        if self.telemetry_trigger_model is None:
            return 0.0
        scaled_data = self.telemetry_scaler.transform(telemetry_features_df) if self.telemetry_scaler else telemetry_features_df.to_numpy()
        prediction = self.telemetry_trigger_model.predict(scaled_data)
        return float(prediction[0])