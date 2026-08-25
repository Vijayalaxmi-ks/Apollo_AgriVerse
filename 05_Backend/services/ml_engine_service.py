import logging
from pathlib import Path
from typing import Optional
import joblib
import numpy as np
import pandas as pd

# Set up logging so we can see exactly what loads
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("MLEngineService")

class MLEngineService:
    """Wrapper service for loading and executing trained ML models and feature scalers."""

    def __init__(self, models_dir: Optional[str] = None):
        # Navigate up from 05_Backend/services to the Apollo_AgriVerse root folder
        workspace_root = Path(__file__).resolve().parent.parent.parent
        
        # Point directly to the 06_ML/models directory shown in your screenshot
        self.models_dir = Path(models_dir) if models_dir else workspace_root / "06_ML" / "models"
        
        self.yield_scaler = None
        self.yield_model = None

        self._load_artifacts()

    def _load_artifacts(self) -> None:
        """Loads scalers and regressors from the models directory dynamically."""
        try:
            # Dynamically search for files starting with these names
            scaler_files = list(self.models_dir.glob("grape_yield_scaler*.pkl"))
            model_files = list(self.models_dir.glob("grape_yield_model*.pkl"))

            if scaler_files:
                self.yield_scaler = joblib.load(scaler_files[0])
                logger.info(f"✅ Loaded Scaler: {scaler_files[0].name}")
            else:
                logger.warning(f"❌ Could not find scaler .pkl in: {self.models_dir}")

            if model_files:
                self.yield_model = joblib.load(model_files[0])
                logger.info(f"✅ Loaded Model: {model_files[0].name}")
            else:
                logger.warning(f"❌ Could not find model .pkl in: {self.models_dir}")

        except Exception as exc:
            logger.error(f"Error loading ML artifacts: {exc}")

    def prepare_yield_features(self, n_mgkg, p_mgkg, k_mgkg, soil_ph, air_temp_c, humidity_pct, rainfall_mm, optimal_ph=6.5):
        """Constructs the 10-feature vector expected by the scaler."""
        n_k_ratio = float(n_mgkg) / max(float(k_mgkg), 1e-5)
        p_k_ratio = float(p_mgkg) / max(float(k_mgkg), 1e-5)
        ph_opt_dev = abs(float(soil_ph) - optimal_ph)

        raw_features = pd.DataFrame(
            [[n_mgkg, p_mgkg, k_mgkg, soil_ph, air_temp_c, humidity_pct, rainfall_mm, n_k_ratio, p_k_ratio, ph_opt_dev]],
            columns=["nitrogen_mgkg", "phosphorus_mgkg", "potassium_mgkg", "soil_ph", "air_temp_c", "humidity_pct", "rainfall_mm", "N_K_ratio", "P_K_ratio", "ph_opt_dev"],
        )
        return raw_features

    def predict_grape_yield(self, features_df: pd.DataFrame) -> float:
        """Predicts expected yield/performance using the model."""
        if self.yield_model is None:
            logger.error("Prediction failed: Yield model is missing. Returning 0.0")
            return 0.0
            
        scaled_data = self.yield_scaler.transform(features_df) if self.yield_scaler else features_df.to_numpy()
        prediction = self.yield_model.predict(scaled_data)
        return float(np.round(prediction[0], 2))