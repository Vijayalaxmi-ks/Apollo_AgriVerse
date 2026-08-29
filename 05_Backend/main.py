"""
Apollo AgriVerse unified API:
  - GET  /health
  - GET  /weather?city=
  - POST /api/evaluate
  - GET  /api/market/spot | /api/market/arbitrage
  - GET  /api/farm/default
  - GET  /api/ml/status
  - POST /api/ml/yield
  - POST /api/ml/telemetry
  - GET  /api/twin/state
  - POST /api/twin/step
"""
import sys
from pathlib import Path
from typing import Any, Optional

import requests
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Backend root on path
_BACKEND_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(_BACKEND_ROOT))
# ML simulation package (digital twin physics)
_ML_SIM = _BACKEND_ROOT.parent / "06_ML" / "simulation"
if _ML_SIM.exists():
    sys.path.insert(0, str(_ML_SIM))
_ML_ROOT = _BACKEND_ROOT.parent / "06_ML"
if _ML_ROOT.exists():
    sys.path.insert(0, str(_ML_ROOT))

from config import settings

app = FastAPI(
    title="Apollo AgriVerse - Unified API",
    description="Crop suitability, weather, market, ML models (06_ML), and digital twin simulation",
    version="2.0.0",
)

_cors = list(settings.CORS_ORIGINS) if isinstance(settings.CORS_ORIGINS, list) else []
if "*" not in _cors:
    _cors = _cors + [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5175",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
# Dev-friendly: allow any localhost / 127.0.0.1 port (Vite often picks 5174+)
# while still listing explicit origins above for credentialed requests.
_allow_origin_regex = r"https?://(localhost|127\.0\.0\.1)(:\d+)?"

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors or ["*"],
    allow_origin_regex=_allow_origin_regex,
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
        "version": "2.0.0",
        "routes": [
            "/health",
            "/weather",
            "/api/evaluate",
            "/api/market/spot",
            "/api/market/arbitrage",
            "/api/farm/default",
            "/api/ml/status",
            "/api/ml/yield",
            "/api/ml/telemetry",
            "/api/twin/state",
            "/api/twin/step",
        ],
        "ml_models_dir": str((_BACKEND_ROOT.parent / "06_ML" / "models").resolve()),
        "twin_sim_dir": str(_ML_SIM.resolve()) if _ML_SIM.exists() else None,
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

    ml_status = _ml_status_payload()
    twin_ok = False
    twin_detail = None
    try:
        get_twin_engine()
        twin_ok = True
    except Exception as e:
        twin_detail = str(e)

    overall = "healthy"
    if not engine_ok and not ml_status.get("yield_model_loaded"):
        overall = "degraded"
    if not engine_ok and not ml_status.get("yield_model_loaded") and not twin_ok:
        overall = "degraded"

    return {
        "status": overall if (engine_ok or ml_status.get("any_loaded") or twin_ok) else "degraded",
        "engine": "integrated" if engine_ok else "unavailable",
        "engine_error": engine_detail,
        "state": "Maharashtra",
        "focus_crop": "GRAPE",
        "weather": "active",
        "ml_service": "active" if ml_status.get("any_loaded") else ("pending_datasets" if not engine_ok else "partial"),
        "ml": ml_status,
        "twin": {
            "available": twin_ok,
            "error": twin_detail,
            "simulation_path": str(_ML_SIM) if _ML_SIM.exists() else None,
        },
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


# ---------------------------------------------------------------------
# ML Engine (06_ML/models — yield + telemetry hydrogel trigger)
# ---------------------------------------------------------------------

_ml_service = None
_ml_service_error: Optional[str] = None


def get_ml_service():
    """Lazy-load MLEngineService from services/ml_engine_service.py → 06_ML/models."""
    global _ml_service, _ml_service_error
    if _ml_service is not None:
        return _ml_service
    if _ml_service_error is not None:
        raise RuntimeError(_ml_service_error)
    try:
        from services.ml_engine_service import MLEngineService

        models_dir = _BACKEND_ROOT.parent / "06_ML" / "models"
        _ml_service = MLEngineService(models_dir=str(models_dir) if models_dir.exists() else None)
        return _ml_service
    except Exception as e:
        _ml_service_error = str(e)
        raise


def _ml_status_payload() -> dict:
    try:
        ml = get_ml_service()
        yield_ok = ml.yield_model is not None
        tel_ok = ml.telemetry_trigger_model is not None
        return {
            "any_loaded": yield_ok or tel_ok,
            "yield_model_loaded": yield_ok,
            "yield_scaler_loaded": ml.yield_scaler is not None,
            "telemetry_model_loaded": tel_ok,
            "telemetry_scaler_loaded": ml.telemetry_scaler is not None,
            "models_dir": str(getattr(ml, "models_dir", "")),
        }
    except Exception as e:
        return {
            "any_loaded": False,
            "yield_model_loaded": False,
            "yield_scaler_loaded": False,
            "telemetry_model_loaded": False,
            "telemetry_scaler_loaded": False,
            "error": str(e),
            "models_dir": str((_BACKEND_ROOT.parent / "06_ML" / "models").resolve()),
        }


class YieldPredictRequest(BaseModel):
    nitrogen_mgkg: float = Field(140.0, example=140.0)
    phosphorus_mgkg: float = Field(45.0, example=45.0)
    potassium_mgkg: float = Field(210.0, example=210.0)
    soil_ph: float = Field(6.4, example=6.4)
    air_temp_c: float = Field(26.5, example=26.5)
    humidity_pct: float = Field(65.0, example=65.0)
    rainfall_mm: float = Field(720.0, example=720.0)
    optimal_ph: float = Field(6.5, example=6.5)


class TelemetryPredictRequest(BaseModel):
    """Features for grape_telemetry_trigger_model (required hydrogel storage %)."""
    air_temp_c: float = Field(31.2)
    humidity_pct: float = Field(48.0)
    soil_moisture_pct: float = Field(24.5)
    soil_temp_c: float = Field(27.0)
    hydrogel_release_rate: float = Field(12.5)
    mulch_degradation_pct: float = Field(15.0)
    mulch_temp_reduction_c: float = Field(3.2)
    area_acres: float = Field(5.0)
    canopy_cover_percent: float = Field(65.0)
    chlorophyll_index: float = Field(42.0)
    crop_age_days: float = Field(120.0)
    latitude: float = Field(19.9975)




class FarmFieldPayload(BaseModel):
    field_id: str = Field("A")
    name: Optional[str] = None
    acres: Optional[float] = None
    soil_class: Optional[str] = None
    crop_id: Optional[str] = None
    grape_variety: Optional[str] = None
    area_ha: Optional[str] = None
    yield_t_per_ha: Optional[str] = None
    density_per_ha: Optional[str] = None
    irrigation_mm: Optional[str] = None
    notes: Optional[str] = None


class FarmProfileSaveRequest(BaseModel):
    farm_id: str = Field("FARM_LOCAL")
    region_id: Optional[str] = None
    soil_id: Optional[str] = None
    farm_name: Optional[str] = None
    operator: Optional[str] = None
    region: Optional[str] = None
    district: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    water_availability: Optional[str] = "medium"
    primary_crop: Optional[str] = None
    default_soil_class: Optional[str] = None
    field_count: Optional[int] = None
    fields: Optional[list] = None
    measures: Optional[dict] = None
    profile_label: Optional[str] = None


@app.post("/api/farm/profile")
def save_farm_profile(payload: FarmProfileSaveRequest):
    """Persist farmer profile + per-field soil/crop/measures for the digital twin."""
    import json
    from datetime import datetime, timezone

    cfg_dir = Path(__file__).resolve().parent / "config"
    cfg_dir.mkdir(parents=True, exist_ok=True)
    out_path = cfg_dir / "saved_farm_profiles.json"

    record = payload.model_dump() if hasattr(payload, "model_dump") else payload.dict()
    record["saved_at"] = datetime.now(timezone.utc).isoformat()

    store: dict = {}
    if out_path.exists():
        try:
            store = json.loads(out_path.read_text(encoding="utf-8"))
            if not isinstance(store, dict):
                store = {}
        except Exception:
            store = {}

    store[record["farm_id"]] = record
    # also keep last active pointer
    store["_active_farm_id"] = record["farm_id"]
    out_path.write_text(json.dumps(store, indent=2), encoding="utf-8")

    # Mirror into farm_profile.json for /api/farm/default bootstrap
    profile_path = cfg_dir / "farm_profile.json"
    slim = {
        "farm_id": record.get("farm_id"),
        "region_id": record.get("region_id"),
        "soil_id": record.get("soil_id"),
        "water_availability": record.get("water_availability") or "medium",
        "latitude": record.get("latitude"),
        "longitude": record.get("longitude"),
        "city": record.get("city"),
        "farm_name": record.get("farm_name"),
        "primary_crop": record.get("primary_crop"),
        "field_count": record.get("field_count"),
    }
    profile_path.write_text(json.dumps(slim, indent=2), encoding="utf-8")

    # Best-effort SQLite log for twin linkage
    try:
        import sqlite3
        db_candidates = [
            Path(__file__).resolve().parent.parent / "apollo_twin.db",
            Path(__file__).resolve().parent / "apollo_twin.db",
        ]
        db_path = next((p for p in db_candidates if p.parent.exists()), db_candidates[0])
        conn = sqlite3.connect(str(db_path))
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS farm_profiles (
                farm_id TEXT PRIMARY KEY,
                payload_json TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            "INSERT OR REPLACE INTO farm_profiles (farm_id, payload_json, updated_at) VALUES (?, ?, ?)",
            (record["farm_id"], json.dumps(record), record["saved_at"]),
        )
        conn.commit()
        conn.close()
    except Exception:
        pass

    return {
        "success": True,
        "farm_id": record["farm_id"],
        "saved_at": record["saved_at"],
        "path": str(out_path),
        "message": "Farm profile saved and linked for weather / evaluate / twin",
    }


@app.get("/api/farm/profile/{farm_id}")
def get_farm_profile(farm_id: str):
    """Load a previously saved farmer profile."""
    import json
    out_path = Path(__file__).resolve().parent / "config" / "saved_farm_profiles.json"
    if not out_path.exists():
        raise HTTPException(status_code=404, detail="No saved profiles yet")
    try:
        store = json.loads(out_path.read_text(encoding="utf-8"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    rec = store.get(farm_id)
    if not rec:
        raise HTTPException(status_code=404, detail=f"Profile {farm_id} not found")
    return {"success": True, "data": rec}



@app.get("/api/ml/status")
def ml_status():
    """Report which 06_ML model artifacts are loaded."""
    payload = _ml_status_payload()
    return {"success": True, **payload}


@app.post("/api/ml/yield")
def ml_predict_yield(payload: YieldPredictRequest):
    """Grape yield (t/ha) from 06_ML grape_yield_model + scaler."""
    try:
        ml = get_ml_service()
        if ml.yield_model is None:
            raise HTTPException(status_code=503, detail="Yield model not loaded from 06_ML/models")
        features = ml.prepare_yield_features(
            payload.nitrogen_mgkg,
            payload.phosphorus_mgkg,
            payload.potassium_mgkg,
            payload.soil_ph,
            payload.air_temp_c,
            payload.humidity_pct,
            payload.rainfall_mm,
            optimal_ph=payload.optimal_ph,
        )
        y = ml.predict_grape_yield(features)
        return {
            "success": True,
            "predicted_yield_tons_ha": y,
            "features": features.iloc[0].to_dict(),
            "source": "06_ML/models/grape_yield_model",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/ml/telemetry")
def ml_predict_telemetry(payload: TelemetryPredictRequest):
    """Required hydrogel storage % from 06_ML grape_telemetry_trigger_model."""
    try:
        import pandas as pd

        ml = get_ml_service()
        if ml.telemetry_trigger_model is None:
            raise HTTPException(status_code=503, detail="Telemetry model not loaded from 06_ML/models")

        # Build feature row aligned to scaler if available
        if ml.telemetry_scaler is not None and hasattr(ml.telemetry_scaler, "feature_names_in_"):
            expected = list(ml.telemetry_scaler.feature_names_in_)
            row = {f: 0.0 for f in expected}
        else:
            expected = None
            row = {}

        thermal_gap = payload.air_temp_c - payload.soil_temp_c
        effective_mulch = payload.mulch_temp_reduction_c * (1 - payload.mulch_degradation_pct / 100.0)
        et_index = payload.air_temp_c / (payload.humidity_pct + 1e-5)
        updates = {
            "air_temp_c": payload.air_temp_c,
            "humidity_pct": payload.humidity_pct,
            "soil_moisture_pct": payload.soil_moisture_pct,
            "soil_temp_c": payload.soil_temp_c,
            "hydrogel_release_rate": payload.hydrogel_release_rate,
            "mulch_degradation_pct": payload.mulch_degradation_pct,
            "mulch_temp_reduction_c": payload.mulch_temp_reduction_c,
            "thermal_gap": thermal_gap,
            "effective_mulch_cooling": effective_mulch,
            "evapotranspiration_index": et_index,
            "area_acres": payload.area_acres,
            "canopy_cover_percent": payload.canopy_cover_percent,
            "chlorophyll_index": payload.chlorophyll_index,
            "crop_age_days": payload.crop_age_days,
            "latitude": payload.latitude,
        }
        row.update({k: v for k, v in updates.items() if expected is None or k in row or k in updates})
        if expected:
            for k, v in updates.items():
                if k in row:
                    row[k] = v
            df = pd.DataFrame([row])[expected]
        else:
            df = pd.DataFrame([updates])

        pred = ml.predict_telemetry_trigger(df)
        return {
            "success": True,
            "predicted_required_hydrogel_storage_pct": pred,
            "derived": {
                "thermal_gap": thermal_gap,
                "effective_mulch_cooling": effective_mulch,
                "evapotranspiration_index": et_index,
            },
            "source": "06_ML/models/grape_telemetry_trigger_model",
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------
# Digital Twin (06_ML/simulation — closed-loop physics + SQLite)
# ---------------------------------------------------------------------

_twin_engine = None
_twin_engine_error: Optional[str] = None


def get_twin_engine():
    """Lazy-load DigitalTwinEngine from 06_ML/simulation."""
    global _twin_engine, _twin_engine_error
    if _twin_engine is not None:
        return _twin_engine
    if _twin_engine_error is not None:
        raise RuntimeError(_twin_engine_error)
    try:
        if str(_ML_SIM) not in sys.path:
            sys.path.insert(0, str(_ML_SIM))
        from digital_twin_engine import DigitalTwinEngine

        db_path = _ML_SIM / "apollo_twin.db"
        # Prefer project root copy if present
        root_db = _BACKEND_ROOT.parent / "apollo_twin.db"
        db_url = f"sqlite:///{root_db if root_db.exists() else db_path}"
        models_dir = _BACKEND_ROOT.parent / "06_ML" / "models"
        _twin_engine = DigitalTwinEngine(
            db_url=db_url,
            model_dir=str(models_dir) if models_dir.exists() else None,
        )
        return _twin_engine
    except Exception as e:
        _twin_engine_error = str(e)
        raise


class TwinStepRequest(BaseModel):
    farm_id: str = Field("FARM_MH_NASHIK_01")
    air_temp_c: float = Field(28.0)
    air_temp_max_c: float = Field(32.0)
    air_temp_min_c: float = Field(20.0)
    humidity_pct: float = Field(55.0)
    rainfall_mm: float = Field(0.0)
    uv_index: float = Field(6.0)


@app.get("/api/twin/state")
def twin_state():
    """Current digital twin state (from memory / last SQLite recovery)."""
    try:
        engine = get_twin_engine()
        state = engine.current_state
        if state is None:
            return {"success": True, "state": None, "message": "No twin state yet — POST /api/twin/step to initialize"}
        data = state.model_dump() if hasattr(state, "model_dump") else state.dict()
        # datetime → ISO
        if data.get("timestamp") is not None:
            ts = data["timestamp"]
            data["timestamp"] = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
        return {"success": True, "state": data, "source": "06_ML/simulation/DigitalTwinEngine"}
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Twin engine unavailable: {e}")


@app.post("/api/twin/step")
def twin_step(payload: TwinStepRequest):
    """Advance closed-loop digital twin by one timestep with live telemetry."""
    try:
        engine = get_twin_engine()
        telemetry = {
            "farm_id": payload.farm_id,
            "air_temp_c": payload.air_temp_c,
            "air_temp_max_c": payload.air_temp_max_c,
            "air_temp_min_c": payload.air_temp_min_c,
            "humidity_pct": payload.humidity_pct,
            "rainfall_mm": payload.rainfall_mm,
            "uv_index": payload.uv_index,
        }
        state = engine.step(telemetry)
        data = state.model_dump() if hasattr(state, "model_dump") else state.dict()
        if data.get("timestamp") is not None:
            ts = data["timestamp"]
            data["timestamp"] = ts.isoformat() if hasattr(ts, "isoformat") else str(ts)
        return {
            "success": True,
            "state": data,
            "source": "06_ML/simulation/DigitalTwinEngine",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
