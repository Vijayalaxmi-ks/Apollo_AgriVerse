import json
from pathlib import Path
import sys
import unittest

# Add 05_Backend directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from services.knowledge_loader import KnowledgeBaseLoader
from services.external_apis import ExternalDataService        # <-- ADDED
from services.ml_engine_service import MLEngineService        # <-- ADDED
from services.suitability_engine import AgronomicSuitabilityEngine

class TestAgronomicEngine(unittest.TestCase):

  @classmethod
  def setUpClass(cls):
    # Load knowledge base and initialize the services
    cls.loader = KnowledgeBaseLoader().load_and_validate()
    cls.api_service = ExternalDataService()                   # <-- ADDED
    cls.ml_service = MLEngineService()                        # <-- ADDED
    
    # Pass all required arguments to the engine
    cls.engine = AgronomicSuitabilityEngine(
        loader=cls.loader,
        api_service=cls.api_service,                          # <-- ADDED
        ml_service=cls.ml_service                             # <-- ADDED
    )

    config_path = Path(__file__).parent.parent / "config" / "farm_profile.json"
    with open(config_path) as f:
      cls.farm_profile = json.load(f)

  def test_knowledge_base_loading(self):
    self.assertIsNotNone(self.loader.crops_df)
    self.assertIsNotNone(self.loader.varieties_df)
    self.assertIsNotNone(self.loader.soils_df)
    self.assertIsNotNone(self.loader.requirements_df)
    self.assertIsNotNone(self.loader.regions_df)

  def test_evaluation_output_structure(self):
    report = self.engine.evaluate_farm(self.farm_profile)
    self.assertIn("primary_recommendations", report)          # Updated key name to match your new engine

  def test_score_range(self):
    report = self.engine.evaluate_farm(self.farm_profile)
    for rec in report["primary_recommendations"]:
      self.assertTrue(0.0 <= rec["final_suitability_score"] <= 100.0)

if __name__ == "__main__":
  unittest.main()