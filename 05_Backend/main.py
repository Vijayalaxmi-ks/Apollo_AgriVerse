"""
Apollo AgriVerse unified API:
  - GET  /health
  - GET  /weather?city=
  - POST /api/evaluate
"""
import sys
from pathlib import Path
from typing import Any, Optional

import requests
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

sys.path.append(str(Path(__file__).resolve().parent))

from config import settings

app = FastAPI(title="Apollo AgriVerse - Unified Crop + Weather API")

_cors = list(settings.CORS_ORIGINS) if isinstance(settings.CORS_ORIGINS, list) else []
if "*" not in _cors:
    _cors = _cors + [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------
# Lazy suitability engine (weather still works if datasets missing)
# ---------------------------------------------------------------------

_engine = None
_engine_error: Optional[str] = None


def get_engine():
    global _engine, _engine_error
    if _engine is not None:
        return _engine
    if _engine_error is not None:
        raise RuntimeError(_engine_error)
    try:
        from services.external_apis import ExternalDataService
        from services.knowledge_loader import KnowledgeBaseLoader
        from services.ml_engine_service import MLEngineService
        from services.connect_suitability_engine import connectSuitabilityEngine

        root_ds = Path(__file__).resolve().parent.parent / "02_Datasets"
        # Prefer full KnowledgeBase (rich soils/crops/regions); fall back to root CSVs
        kb = root_ds / "KnowledgeBase"
        suit = kb / "Suitability engine csvs"
        if kb.exists():
            datasets_dir = kb
        elif root_ds.exists():
            datasets_dir = root_ds
        else:
            datasets_dir = None
        loader = KnowledgeBaseLoader(str(datasets_dir) if datasets_dir else None)
        loader.load_and_validate()
        # Prefer Connection_* packs under Suitability engine csvs if present (via rglob in loader)
        if suit.exists() and loader.data_dir == kb:
            # re-bind data_dir so rglob can still find Connection_* files; files at KB root already load
            pass
        api_service = ExternalDataService(openweather_api_key=settings.OPENWEATHER_API_KEY)
        ml_service = MLEngineService()
        _engine = connectSuitabilityEngine(
            loader=loader,
            api_service=api_service,
            ml_service=ml_service,
            state_scope="Maharashtra",
            focus_crop="GRAPE",
        )
        return _engine
    except Exception as e:
        _engine_error = str(e)
        raise


# ---------------------------------------------------------------------
# Weather helpers (from app/main.py)
# ---------------------------------------------------------------------

def get_city_coordinates(city: str):
    url = "https://geocoding-api.open-meteo.com/v1/search"
    params = {"name": city, "count": 10, "language": "en", "format": "json"}
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        results = data.get("results", [])
        if not results:
            raise HTTPException(status_code=404, detail=f"City '{city}' not found.")
        india_result = next((loc for loc in results if loc.get("country_code") == "IN"), None)
        if india_result is None:
            raise HTTPException(status_code=404, detail=f"Indian city '{city}' not found.")
        return {
            "city": india_result.get("name", city),
            "country": india_result.get("country", "India"),
            "latitude": float(india_result["latitude"]),
            "longitude": float(india_result["longitude"]),
        }
    except HTTPException:
        raise
    except requests.RequestException as e:
        raise HTTPException(status_code=503, detail=f"Geocoding service unavailable: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to find city: {e}")


def _get_hybrid_weather(lat: float, lon: float) -> dict:
    try:
        from api.weather_api.weather_service import get_hybrid_weather
        return get_hybrid_weather(lat, lon)
    except Exception as e:
        # Minimal Open-Meteo fallback if hybrid module fails
        try:
            url = "https://api.open-meteo.com/v1/forecast"
            params = {
                "latitude": lat,
                "longitude": lon,
                "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,shortwave_radiation",
                "timezone": "auto",
                "wind_speed_unit": "ms",
            }
            r = requests.get(url, params=params, timeout=10)
            r.raise_for_status()
            c = r.json().get("current") or {}
            return {
                "status": "success",
                "source": "Open-Meteo (API fallback)",
                "latitude": lat,
                "longitude": lon,
                "date": str(c.get("time", ""))[:10].replace("-", ""),
                "utc_hour": str(c.get("time", ""))[11:13] if c.get("time") else "",
                "weather": {
                    "temperature_c": c.get("temperature_2m"),
                    "humidity_pct": c.get("relative_humidity_2m"),
                    "rainfall_mm": c.get("precipitation"),
                    "wind_speed_m_s": c.get("wind_speed_10m"),
                    "solar_radiation_w_m2": c.get("shortwave_radiation"),
                },
            }
        except Exception as inner:
            return {"status": "error", "message": f"{e}; fallback failed: {inner}"}


class FarmEvaluationRequest(BaseModel):
    farm_id: str = Field(..., example="FARM_NASHIK_01")
    region_id: str = Field(..., example="REG_MH_NASHIK_01")
    soil_id: str = Field(..., example="SOIL_BLACK_MH_01")
    water_availability: str = Field("medium", example="low")
    latitude: float = Field(20.0059, example=20.0059)
    longitude: float = Field(73.7897, example=73.7897)


@app.get("/")
def root():
    return {
        "project": "Apollo AgriVerse",
        "status": "API is running",
        "routes": ["/health", "/weather", "/api/evaluate", "/api/market/spot", "/api/market/arbitrage", "/api/farm/default"],
    }


@app.get("/health")
def health_check():
    engine_ok = False
    engine_detail = None
    try:
        get_engine()
        engine_ok = True
    except Exception as e:
        engine_detail = str(e)
    return {
        "status": "healthy" if engine_ok else "degraded",
        "engine": "integrated" if engine_ok else "unavailable",
        "engine_error": engine_detail,
        "state": "Maharashtra",
        "focus_crop": "GRAPE",
        "weather": "active",
        "ml_service": "active" if engine_ok else "pending_datasets",
    }


@app.get("/weather")
def weather(
    city: str = Query(..., min_length=2, description="Indian city name, e.g. Solapur, Nashik, Pune"),
):
    location = get_city_coordinates(city)
    result = _get_hybrid_weather(location["latitude"], location["longitude"])
    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result.get("message", "Unable to fetch weather"))
    result["city"] = location["city"]
    result["country"] = location["country"]
    result["status"] = result.get("status") or "success"
    return result


@app.post("/api/evaluate")
def evaluate_farm_suitability(payload: FarmEvaluationRequest):
    try:
        engine = get_engine()
        report = engine.evaluate_farm(payload.model_dump(), top_n=5)
        return {"success": True, "data": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------
# Market (uses ExternalDataService — works without full knowledge base)
# ---------------------------------------------------------------------

_api_service = None


def get_api_service():
    global _api_service
    if _api_service is None:
        from services.external_apis import ExternalDataService

        _api_service = ExternalDataService(
            openweather_api_key=settings.OPENWEATHER_API_KEY,
            agmarknet_api_key=getattr(settings, "AGMARKNET_API_KEY", "") or "",
        )
    return _api_service


@app.get("/api/market/spot")
def market_spot(
    commodity: str = Query("GRAPE", description="Crop commodity e.g. GRAPE, ONION"),
    state: str = Query("Maharashtra"),
    district: str = Query("", description="Optional district e.g. Nashik"),
):
    """Mandi-style spot price from ExternalDataService (live Agmarknet if key set, else baseline DB)."""
    svc = get_api_service()
    data = svc.get_mandi_market_data(state, district or state, commodity)
    modal = float(data.get("modal_price_per_qtl") or 0)
    return {
        "success": True,
        "source": "agmarknet" if data.get("is_live") else "backend_baseline",
        "is_live": bool(data.get("is_live")),
        "commodity": commodity.upper().strip(),
        "state": state,
        "district": district or None,
        "modal_price_per_qtl": modal,
        "min_price_per_qtl": round(modal * 0.9, 2),
        "max_price_per_qtl": round(modal * 1.1, 2),
        "price_trend": data.get("price_trend", "STABLE"),
        "modal_price_per_ton": round(modal * 10, 2),
    }


@app.get("/api/market/arbitrage")
def market_arbitrage(
    commodity: str = Query("GRAPE"),
    state: str = Query("Maharashtra"),
    district: str = Query(""),
):
    """Simple export-vs-domestic spread using backend spot + fixed export benchmarks."""
    svc = get_api_service()
    data = svc.get_mandi_market_data(state, district or state, commodity)
    modal_qtl = float(data.get("modal_price_per_qtl") or 0)
    local_ton = modal_qtl * 10
    # USD/ton hort export benchmarks (aligned with frontend constants)
    export_usd = {
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
    key = commodity.upper().strip().split()[0]
    usd_ton = export_usd.get(key, 800)
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
        "is_live": bool(data.get("is_live")),
        "source": "agmarknet" if data.get("is_live") else "backend_baseline",
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
        "price_trend": data.get("price_trend", "STABLE"),
    }




@app.get("/api/farm/default")
def farm_default():
    """Default farm profile for Settings bootstrap."""
    profile_path = Path(__file__).resolve().parent / "config" / "farm_profile.json"
    data = {
        "farm_id": "FARM_MH_NASHIK_01",
        "region_id": "REG_0002",
        "soil_id": "SOIL_00001",
        "water_availability": "medium",
        "latitude": 19.9975,
        "longitude": 73.7898,
        "city": "Nashik",
        "farm_area_ha": 2.5,
    }
    if profile_path.exists():
        import json
        try:
            data.update(json.loads(profile_path.read_text()))
        except Exception:
            pass
    return {"success": True, "data": data}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
