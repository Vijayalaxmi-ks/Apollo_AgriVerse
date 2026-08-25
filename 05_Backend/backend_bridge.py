import logging
import sys
from pathlib import Path
from typing import Dict, Any, List

# Add 06_ML/simulation to Python path so it can find digital_twin_engine
backend_dir = Path(__file__).resolve().parent
simulation_dir = backend_dir.parent / "06_ML" / "simulation"
sys.path.append(str(simulation_dir))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ApolloBackendBridge")

class ApolloBackendBridge:
    """Master Bridge Class combining Agronomic Suitability, ML Yields, 
    and Closed-Loop Digital Twin Simulation.
    """
    def __init__(self):
        logger.info("🚀 Initializing Apollo AgriVerse Core Bridge...")
        try:
            from services.knowledge_loader import KnowledgeBaseLoader
            from services.external_apis import ExternalDataService
            from services.ml_engine_service import MLEngineService
            from services.connect_suitability_engine import connectSuitabilityEngine
            from digital_twin_engine import DigitalTwinEngine

            # 1. Load Knowledge Base
            self.loader = KnowledgeBaseLoader().load_and_validate()
            
            # 2. Initialize External APIs (Weather & Mandi)
            self.api_service = ExternalDataService()
            
            # 3. Initialize ML Engine Service
            self.ml_service = MLEngineService()
            
            # 4. Initialize Integrated Suitability Engine
            self.suitability_engine = connectSuitabilityEngine(
                loader=self.loader,
                api_service=self.api_service,
                ml_service=self.ml_service,
                focus_crop="GRAPE"
            )
            
            # 5. Initialize Digital Twin Engine & Database
            self.twin_engine = DigitalTwinEngine()
            logger.info("✅ Apollo AgriVerse Core Bridge successfully initialized!")
            
        except Exception as e:
            logger.error(f"❌ Error during initialization: {e}")
            raise e

    def evaluate_farm_parcel(self, farm_data: Dict[str, Any], top_n: int = 5) -> Dict[str, Any]:
        """Runs pre-season agronomic scoring, market trends, and ML grape yield prediction."""
        return self.suitability_engine.evaluate_farm(farm_data, top_n=top_n)

    def run_twin_simulation_step(self, telemetry_data: Dict[str, Any]) -> Dict[str, Any]:
        """Runs a single real-time closed-loop timestep update for the digital twin."""
        state = self.twin_engine.step(telemetry_data)
        return state.model_dump()

# Global singleton instance with error trapping
try:
    backend_core = ApolloBackendBridge()
except Exception as init_err:
    print(f"\n[CRITICAL INITIALIZATION ERROR]: {init_err}\n")
    raise init_err