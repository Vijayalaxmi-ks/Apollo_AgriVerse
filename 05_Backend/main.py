import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import settings
from services.external_apis import ExternalDataService
from services.knowledge_loader import KnowledgeBaseLoader
from services.suitability_engine import AgronomicSuitabilityEngine

app = FastAPI(title="Apollo AgriVerse - Maharashtra Crop Engine API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

datasets_dir = Path(__file__).resolve().parent.parent / "02_Datasets"
loader = KnowledgeBaseLoader(str(datasets_dir)).load_and_validate()
api_service = ExternalDataService(openweather_api_key=settings.OPENWEATHER_API_KEY)
engine = AgronomicSuitabilityEngine(loader=loader, api_service=api_service)


class FarmEvaluationRequest(BaseModel):
  farm_id: str = Field(..., example="FARM_PUNE_01")
  region_id: str = Field(..., example="REG_MH_PUNE_01")
  soil_id: str = Field(..., example="SOIL_BLACK_MH_01")
  water_availability: str = Field("medium", example="medium")
  latitude: float = Field(18.5204, example=18.5204)
  longitude: float = Field(73.8567, example=73.8567)


@app.get("/health")
def health_check():
  return {"status": "healthy", "engine": "active", "state": "Maharashtra"}


@app.post("/api/evaluate")
def evaluate_farm_suitability(payload: FarmEvaluationRequest):
  try:
    report = engine.evaluate_farm(payload.model_dump())
    return {"success": True, "data": report}
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))