import json
import sys
from pathlib import Path
import unittest

# Ensure 05_Backend is in the path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(backend_dir))

from services.knowledge_loader import KnowledgeBaseLoader
from services.external_apis import ExternalDataService
from services.ml_engine_service import MLEngineService
from services.connect_suitability_engine import connectSuitabilityEngine

class TestIntegratedEngine(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        print("\n--- 1. Initializing Services ---")
        cls.loader = KnowledgeBaseLoader().load_and_validate()
        cls.api_service = ExternalDataService()
        cls.ml_service = MLEngineService()
        
        print("--- 2. Instantiating Integrated Engine ---")
        cls.engine = connectSuitabilityEngine(
            loader=cls.loader,
            api_service=cls.api_service,
            ml_service=cls.ml_service,
            focus_crop="GRAPE"
        )

        # Creating a mock farm profile for testing
        cls.test_farm = {
            "farm_id": "TEST_FARM_01",
            "region_id": cls.loader.regions_df["region_id"].iloc[0] if not cls.loader.regions_df.empty else "reg_01",
            "soil_id": cls.loader.soils_df["soil_id"].iloc[0] if not cls.loader.soils_df.empty else "soil_01",
            "water_availability": "high",
            "latitude": 19.9975,
            "longitude": 73.7898
        }

    def test_ml_yield_prediction(self):
        print("--- 3. Running Farm Evaluation & ML Inference ---")
        result = self.engine.evaluate_farm(self.test_farm, top_n=3)
        
        self.assertIn("primary_recommendations", result)
        
        focus_crop_data = result.get("focus_crop_assessment")
        self.assertIsNotNone(focus_crop_data, "Focus crop data should be present")
        
        # Check if ML Yield is predicted
        predicted_yield = focus_crop_data.get("expected_yield_tons_ha")
        print(f"\n✅ SUCCESS! ML Predicted Yield for {focus_crop_data['crop_name']}: {predicted_yield} tons/ha\n")
        
        self.assertIsNotNone(predicted_yield, "ML Predicted yield should not be None")
        self.assertGreater(predicted_yield, 0.0, "Predicted yield should be greater than 0")

if __name__ == "__main__":
    unittest.main()