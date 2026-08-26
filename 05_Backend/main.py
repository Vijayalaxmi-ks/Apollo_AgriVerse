import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import settings
from services.external_apis import ExternalDataService
from services.knowledge_loader import KnowledgeBaseLoader
from services.ml_engine_service import MLEngineService
from services.connect_suitability_engine import connectSuitabilityEngine


app = FastAPI(title="Apollo AgriVerse - Maharashtra Crop Engine API")


# ---------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------
# Load Knowledge Base
# ---------------------------------------------------------------------

datasets_dir = Path(__file__).resolve().parent.parent / "02_Datasets"

loader = KnowledgeBaseLoader(
    str(datasets_dir)
).load_and_validate()


# ---------------------------------------------------------------------
# External APIs
# ---------------------------------------------------------------------

api_service = ExternalDataService(
    openweather_api_key=settings.OPENWEATHER_API_KEY
)


# ---------------------------------------------------------------------
# ML Engine
# ---------------------------------------------------------------------

ml_service = MLEngineService()


# ---------------------------------------------------------------------
# Integrated Suitability Engine
# ---------------------------------------------------------------------

engine = connectSuitabilityEngine(
    loader=loader,
    api_service=api_service,
    ml_service=ml_service,
    state_scope="Maharashtra",
    focus_crop="GRAPE",
)


# ---------------------------------------------------------------------
# Request Model
# ---------------------------------------------------------------------

class FarmEvaluationRequest(BaseModel):
    farm_id: str = Field(
        ...,
        example="FARM_NASHIK_01"
    )

    region_id: str = Field(
        ...,
        example="REG_MH_NASHIK_01"
    )

    soil_id: str = Field(
        ...,
        example="SOIL_BLACK_MH_01"
    )

    water_availability: str = Field(
        "medium",
        example="low"
    )

    latitude: float = Field(
        20.0059,
        example=20.0059
    )

    longitude: float = Field(
        73.7897,
        example=73.7897
    )


# ---------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "engine": "integrated",
        "state": "Maharashtra",
        "focus_crop": "GRAPE",
        "ml_service": "active",
    }


# ---------------------------------------------------------------------
# Farm Suitability Evaluation
# ---------------------------------------------------------------------

@app.post("/api/evaluate")
def evaluate_farm_suitability(
    payload: FarmEvaluationRequest
):
    try:
        report = engine.evaluate_farm(
            payload.model_dump(),
            top_n=5,
        )

        return {
            "success": True,
            "data": report,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e),
        )