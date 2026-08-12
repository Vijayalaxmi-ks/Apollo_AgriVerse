from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import sys
from pathlib import Path

# Add project root to path for imports
BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

# Import the hybrid function instead of the direct NASA call
from api.weather_api.weather_service import get_hybrid_weather


# ------------------------------------------------------------------
# Response Schemas (Pydantic Models)
# ------------------------------------------------------------------
class WeatherData(BaseModel):
    temperature_c: Optional[float] = Field(None, description="Temperature in Celsius")
    humidity_pct: Optional[float] = Field(None, description="Relative Humidity percentage")
    rainfall_mm: Optional[float] = Field(None, description="Precipitation in mm")
    wind_speed_m_s: Optional[float] = Field(None, description="Wind Speed in m/s")
    solar_radiation_w_m2: Optional[float] = Field(None, description="Solar Radiation in W/m²")

class WeatherResponse(BaseModel):
    status: str = Field(..., example="success")
    country: str = Field("India", example="India")
    source: str = Field(..., example="NASA POWER AG")
    latitude: float = Field(..., example=17.66)
    longitude: float = Field(..., example=75.91)
    date: str = Field(..., example="20260809")
    utc_hour: str = Field(..., example="23")
    weather: WeatherData

class ErrorResponse(BaseModel):
    status: str = Field("error")
    message: str


# ------------------------------------------------------------------
# FastAPI App Initialization
# ------------------------------------------------------------------
app = FastAPI(
    title="Apollo AgriVerse - Weather API",
    description="Hybrid Agricultural Weather API tailored for India (NASA POWER + CSV Fallback)",
    version="1.2.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------
# API Endpoints
# ------------------------------------------------------------------
@app.get("/", tags=["Health"])
def root():
    return {
        "project": "Apollo AgriVerse",
        "status": "API is running"
    }


@app.get(
    "/weather", 
    response_model=WeatherResponse,
    responses={400: {"model": ErrorResponse}},
    tags=["Weather"]
)
def weather(
    latitude: float = Query(..., ge=6.0, le=37.5, description="Latitude within India bounds (6.0 to 37.5)"),
    longitude: float = Query(..., ge=68.0, le=97.5, description="Longitude within India bounds (68.0 to 97.5)")
):
    result = get_hybrid_weather(latitude, longitude)
    
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message"))
        
    return result


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)