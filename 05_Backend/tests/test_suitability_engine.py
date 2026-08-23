import json
from pathlib import Path
import sys
import unittest

# Add 05_Backend directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from services.knowledge_loader import KnowledgeBaseLoader
from services.suitability_engine import AgronomicSuitabilityEngine


class TestAgronomicEngine(unittest.TestCase):

  @classmethod
  def setUpClass(cls):
    # KnowledgeBaseLoader defaults to 02_Datasets/KnowledgeBase/Suitability engine csvs
    cls.loader = KnowledgeBaseLoader().load_and_validate()
    cls.engine = AgronomicSuitabilityEngine(loader=cls.loader)

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
    self.assertIn("recommendations", report)

  def test_score_range(self):
    report = self.engine.evaluate_farm(self.farm_profile)
    for rec in report["recommendations"]:
      self.assertTrue(0.0 <= rec["overall_suitability_score"] <= 100.0)


if __name__ == "__main__":
  unittest.main()