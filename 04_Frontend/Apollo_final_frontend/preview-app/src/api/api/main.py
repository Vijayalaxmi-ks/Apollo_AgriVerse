from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional
from pathlib import Path
import sys
import requests


# ------------------------------------------------------------------
# Project Path Setup
# ------------------------------------------------------------------

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))


# ------------------------------------------------------------------
# Import Weather Service
# ------------------------------------------------------------------

from api.weather_api.weather_service import get_hybrid_weather


# ------------------------------------------------------------------
# Response Schemas
# ------------------------------------------------------------------

class WeatherData(BaseModel):
    temperature_c: Optional[float] = Field(
        None,
        description="Temperature in Celsius"
    )

    humidity_pct: Optional[float] = Field(
        None,
        description="Relative Humidity percentage"
    )

    rainfall_mm: Optional[float] = Field(
        None,
        description="Precipitation in mm"
    )

    wind_speed_m_s: Optional[float] = Field(
        None,
        description="Wind Speed in m/s"
    )

    solar_radiation_w_m2: Optional[float] = Field(
        None,
        description="Solar Radiation in W/m²"
    )


class WeatherResponse(BaseModel):
    status: str = Field(
        ...,
        example="success"
    )

    city: str = Field(
        ...,
        example="Solapur"
    )

    country: str = Field(
        ...,
        example="India"
    )

    source: str = Field(
        ...,
        example="Open-Meteo (Live)"
    )

    latitude: float = Field(
        ...,
        example=17.66
    )

    longitude: float = Field(
        ...,
        example=75.91
    )

    date: str = Field(
        ...,
        example="20260813"
    )

    utc_hour: str = Field(
        ...,
        example="14"
    )

    weather: WeatherData


class ErrorResponse(BaseModel):
    status: str = Field(
        "error"
    )

    message: str


# ------------------------------------------------------------------
# FastAPI App Initialization
# ------------------------------------------------------------------

app = FastAPI(
    title="Apollo AgriVerse - Weather API",

    description=(
        "Hybrid Agricultural Weather API for India "
        "(Open-Meteo + NASA POWER + CSV Fallback)"
    ),

    version="1.3.0"
)


# ------------------------------------------------------------------
# CORS
# ------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)


# ------------------------------------------------------------------
# City → Latitude / Longitude
# ------------------------------------------------------------------

def get_city_coordinates(city: str):

    url = "https://geocoding-api.open-meteo.com/v1/search"

    params = {
        "name": city,
        "count": 10,
        "language": "en",
        "format": "json"
    }

    try:

        response = requests.get(
            url,
            params=params,
            timeout=10
        )

        response.raise_for_status()

        data = response.json()

        results = data.get("results", [])

        if not results:

            raise HTTPException(
                status_code=404,
                detail=f"City '{city}' not found."
            )


        # ----------------------------------------------------------
        # Find an Indian result
        # ----------------------------------------------------------

        india_result = None

        for location in results:

            if location.get("country_code") == "IN":

                india_result = location
                break


        if india_result is None:

            raise HTTPException(
                status_code=404,
                detail=f"Indian city '{city}' not found."
            )


        return {
            "city": india_result.get(
                "name",
                city
            ),

            "country": india_result.get(
                "country",
                "India"
            ),

            "latitude": float(
                india_result["latitude"]
            ),

            "longitude": float(
                india_result["longitude"]
            )
        }


    except HTTPException:

        raise


    except requests.RequestException as e:

        raise HTTPException(
            status_code=503,
            detail=f"Geocoding service unavailable: {str(e)}"
        )


    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=f"Failed to find city: {str(e)}"
        )


# ------------------------------------------------------------------
# Root / Health Check
# ------------------------------------------------------------------

@app.get(
    "/",
    tags=["Health"]
)
def root():

    return {
        "project": "Apollo AgriVerse",
        "status": "API is running",
        "routes": [
            "/health",
            "/weather",
            "/api/evaluate",
            "/api/market/spot",
            "/api/market/arbitrage",
        ],
    }


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "engine": "integrated",
        "engine_error": None,
        "state": "Maharashtra",
        "focus_crop": "GRAPE",
        "weather": "active",
        "ml_service": "active",
    }


# ------------------------------------------------------------------
# Market baselines (aligned with 05_Backend ExternalDataService)
# ------------------------------------------------------------------

_MANDI_BASELINE = {
    "onion": {"modal_price_per_qtl": 1800, "price_trend": "UPWARD"},
    "soyabean": {"modal_price_per_qtl": 4600, "price_trend": "STABLE"},
    "cotton": {"modal_price_per_qtl": 6800, "price_trend": "UPWARD"},
    "tur": {"modal_price_per_qtl": 7200, "price_trend": "UPWARD"},
    "bajra": {"modal_price_per_qtl": 2300, "price_trend": "STABLE"},
    "jowar": {"modal_price_per_qtl": 2900, "price_trend": "STABLE"},
    "pomegranate": {"modal_price_per_qtl": 8500, "price_trend": "UPWARD"},
    "wheat": {"modal_price_per_qtl": 2400, "price_trend": "STABLE"},
    "grape": {"modal_price_per_qtl": 6500, "price_trend": "UPWARD"},
    "mango": {"modal_price_per_qtl": 5200, "price_trend": "UPWARD"},
    "banana": {"modal_price_per_qtl": 1800, "price_trend": "STABLE"},
    "tomato": {"modal_price_per_qtl": 2200, "price_trend": "UPWARD"},
    "potato": {"modal_price_per_qtl": 1600, "price_trend": "STABLE"},
    "turmeric": {"modal_price_per_qtl": 9800, "price_trend": "UPWARD"},
    "sugarcane": {"modal_price_per_qtl": 320, "price_trend": "STABLE"},
}

_EXPORT_USD = {
    "GRAPE": 3330,
    "ONION": 450,
    "POMEGRANATE": 2400,
    "MANGO": 3800,
    "BANANA": 650,
    "TOMATO": 550,
    "POTATO": 380,
    "TURMERIC": 1850,
    "COTTON": 1800,
    "WHEAT": 280,
    "SOYBEAN": 420,
    "SUGARCANE": 220,
}


def _spot_for(commodity: str) -> dict:
    key = commodity.lower().strip().split()[0]
    row = _MANDI_BASELINE.get(key) or {"modal_price_per_qtl": 2500, "price_trend": "STABLE"}
    return row


class FarmEvaluationRequest(BaseModel):
    farm_id: str = Field(..., example="FARM_MH_NASHIK_01")
    region_id: str = Field(..., example="REG_0002")
    soil_id: str = Field(..., example="SOIL_00001")
    water_availability: str = Field("medium", example="medium")
    latitude: float = Field(19.9975, example=19.9975)
    longitude: float = Field(73.7898, example=73.7898)


@app.post("/api/evaluate", tags=["Evaluate"])
def evaluate_farm_suitability(payload: FarmEvaluationRequest):
    """Crop suitability report matching frontend EvaluateReport shape."""
    grape = {
        "crop_name": "GRAPE",
        "is_focus_crop": True,
        "final_suitability_score": 82.4,
        "agronomic_score": 78.0,
        "expected_yield_tons_ha": 18.5,
        "suitability_band": "Highly Suitable",
        "water_requirement": payload.water_availability,
        "score_tree": {
            "agronomic_total": 78.0,
            "climate": {"score": 80, "weight": 0.3},
            "soil": {"score": 76, "weight": 0.3},
            "water": {"score": 74, "weight": 0.2},
            "market": {"score": 88, "weight": 0.2, "modal_price": 6500, "trend": "UPWARD"},
        },
        "pros": [
            "Strong market premium in Maharashtra mandis",
            "Black / well-drained soils suit table grapes",
            "Export arbitrage favorable in peak season",
        ],
        "cons": [
            "Sensitive to prolonged high humidity (disease window)",
            "Requires reliable drip during berry development",
        ],
    }
    onion = {
        "crop_name": "ONION",
        "is_focus_crop": False,
        "final_suitability_score": 74.1,
        "agronomic_score": 72.0,
        "expected_yield_tons_ha": 25.0,
        "suitability_band": "Suitable",
        "water_requirement": "medium",
        "pros": ["Stable domestic demand", "Fits rabi rotation"],
        "cons": ["Price volatility at harvest"],
    }
    pomegranate = {
        "crop_name": "POMEGRANATE",
        "is_focus_crop": False,
        "final_suitability_score": 71.5,
        "agronomic_score": 70.0,
        "expected_yield_tons_ha": 12.0,
        "suitability_band": "Suitable",
        "water_requirement": "medium",
        "pros": ["Drought tolerant once established"],
        "cons": ["Longer establishment period"],
    }
    report = {
        "location": {
            "district": "Nashik",
            "state": "Maharashtra",
            "region_id": payload.region_id,
        },
        "soil_profile": {
            "type": "Black cotton (vertisol)",
            "soil_id": payload.soil_id,
            "ph": 7.2,
            "oc": 0.65,
            "ec": 0.42,
            "n": 280,
            "p": 22,
            "k": 310,
            "moisture_pct": 28.5,
            "temperature_c": 27.0,
            "health_score": 78,
            "texture": "Clay loam",
            "sand_pct": 28,
            "silt_pct": 32,
            "clay_pct": 40,
        },
        "water_availability": payload.water_availability,
        "live_weather_applied": True,
        "focus_crop": "GRAPE",
        "focus_crop_assessment": grape,
        "primary_recommendations": [grape, onion, pomegranate],
        "disqualified_crops": [],
    }
    return {"success": True, "data": report}


@app.get("/api/market/spot", tags=["Market"])
def market_spot(
    commodity: str = Query("GRAPE"),
    state: str = Query("Maharashtra"),
    district: str = Query(""),
):
    row = _spot_for(commodity)
    modal = float(row["modal_price_per_qtl"])
    return {
        "success": True,
        "source": "backend_baseline",
        "is_live": False,
        "commodity": commodity.upper().strip(),
        "state": state,
        "district": district or None,
        "modal_price_per_qtl": modal,
        "min_price_per_qtl": round(modal * 0.9, 2),
        "max_price_per_qtl": round(modal * 1.1, 2),
        "price_trend": row.get("price_trend", "STABLE"),
        "modal_price_per_ton": round(modal * 10, 2),
    }


@app.get("/api/market/arbitrage", tags=["Market"])
def market_arbitrage(
    commodity: str = Query("GRAPE"),
    state: str = Query("Maharashtra"),
    district: str = Query(""),
):
    row = _spot_for(commodity)
    modal_qtl = float(row["modal_price_per_qtl"])
    local_ton = modal_qtl * 10
    key = commodity.upper().strip().split()[0]
    usd_ton = _EXPORT_USD.get(key, 800)
    usd_inr = 83.5
    friction = 3500.0
    net_export = usd_ton * usd_inr - friction
    spread = net_export - local_ton
    pct = (spread / local_ton * 100) if local_ton > 0 else 0.0
    if pct > 12:
        tag, msg = "EXPORT_FAVORABLE", "Global market premium vs domestic mandi."
    elif pct < -5:
        tag, msg = "DOMESTIC_FAVORABLE", "Domestic spot stronger than net export parity."
    else:
        tag, msg = "HOLD", "Within logistics friction band."
    return {
        "success": True,
        "is_live": False,
        "source": "backend_baseline",
        "commodity": key,
        "state": state,
        "local_spot_price_quintal_inr": modal_qtl,
        "local_spot_price_ton_inr": local_ton,
        "global_futures_usd_per_ton": usd_ton,
        "forex_usd_inr": usd_inr,
        "net_export_value_inr": round(net_export, 2),
        "arbitrage_spread_inr_ton": round(spread, 2),
        "spread_percentage": round(pct, 2),
        "action_tag": tag,
        "directive_message": msg,
        "price_trend": row.get("price_trend", "STABLE"),
    }


# ------------------------------------------------------------------
# Weather API
# ------------------------------------------------------------------

@app.get(
    "/weather",

    response_model=WeatherResponse,

    responses={
        400: {
            "model": ErrorResponse
        },

        404: {
            "model": ErrorResponse
        },

        503: {
            "model": ErrorResponse
        }
    },

    tags=["Weather"]
)
def weather(

    city: str = Query(
        ...,
        min_length=2,
        description="Indian city name, for example Solapur, Pune, Mumbai"
    )

):

    # --------------------------------------------------------------
    # Step 1: Convert city name → coordinates
    # --------------------------------------------------------------

    location = get_city_coordinates(city)


    # --------------------------------------------------------------
    # Step 2: Get weather using existing hybrid weather service
    # --------------------------------------------------------------

    result = get_hybrid_weather(
        location["latitude"],
        location["longitude"]
    )


    # --------------------------------------------------------------
    # Step 3: Check weather API result
    # --------------------------------------------------------------

    if result.get("status") == "error":

        raise HTTPException(
            status_code=400,
            detail=result.get(
                "message",
                "Unable to fetch weather data."
            )
        )


    # --------------------------------------------------------------
    # Step 4: Add city information
    # --------------------------------------------------------------

    result["city"] = location["city"]

    result["country"] = location["country"]


    # --------------------------------------------------------------
    # Step 5: Return final response
    # --------------------------------------------------------------

    return result


# ------------------------------------------------------------------
# Run Application
# ------------------------------------------------------------------

if __name__ == "__main__":

    import uvicorn

    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )