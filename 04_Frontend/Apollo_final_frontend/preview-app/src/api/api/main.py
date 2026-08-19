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
        "status": "API is running"
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