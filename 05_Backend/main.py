import json
from pathlib import Path
from services.knowledge_loader import KnowledgeBaseLoader
from services.suitability_engine import AgronomicSuitabilityEngine

if __name__ == "__main__":
  # Initialize Loader & Engine using root directory structures
  loader = KnowledgeBaseLoader(datasets_dir="../../02_Datasets").load_and_validate()
  engine = AgronomicSuitabilityEngine(loader=loader)

  # Load farm profile configuration
  config_path = Path(__file__).parent / "config" / "farm_profile.json"
  with open(config_path) as f:
    farm_profile = json.load(f)

  # Execute evaluation
  results = engine.evaluate_farm(farm_profile)

  print("\n================ STAGE A SUITABILITY ENGINE REPORT ================")
  print(json.dumps(results, indent=2))