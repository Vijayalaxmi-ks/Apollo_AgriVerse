import sys
from pathlib import Path

# Add current folder to Python path
sys.path.append(str(Path(__file__).resolve().parent))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import settings
from services.external_apis import ExternalDataService
from services.knowledge_loader import KnowledgeBaseLoader
from services.suitability_engine import AgronomicSuitabilityEngine

app = FastAPI(title="Apollo AgriVerse - Crop Engine API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Engine
datasets_dir = Path(__file__).resolve().parent.parent / "02_Datasets"
loader = KnowledgeBaseLoader(str(datasets_dir)).load_and_validate()
api_service = ExternalDataService(openweather_api_key=settings.OPENWEATHER_API_KEY)
engine = AgronomicSuitabilityEngine(loader=loader, api_service=api_service)

class FarmEvaluationRequest(BaseModel):
    farm_id: str = Field(..., example="FARM_BLR_01")
    region_id: str = Field(..., example="REG_KA_BLR_01")
    soil_id: str = Field(..., example="SOIL_BLACK_01")
    water_availability: str = Field("medium", example="low")
    latitude: float = Field(None, example=12.9716)
    longitude: float = Field(None, example=77.5946)

@app.get("/health")
def health_check():
    return {"status": "healthy", "engine": "active"}

@app.post("/api/evaluate")
def evaluate_farm_suitability(payload: FarmEvaluationRequest):
    try:
        report = engine.evaluate_farm(payload.model_dump())
        return {"success": True, "data": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))