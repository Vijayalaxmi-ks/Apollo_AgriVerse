import pandas as pd
from datetime import datetime
import time
import requests
import sys
from pathlib import Path

# Add project root to path for imports
BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from api.weather_api.nasa_api import get_nasa_weather

# Load your local dataset for fallback
WEATHER_FILE = r"D:\Apollo_AgriVerse\02_Datasets\Raw\weather\weather_raw_dataset.csv"
try:
    weather_df = pd.read_csv(WEATHER_FILE)
    print("Local CSV dataset loaded successfully for fallback!")
except Exception as e:
    print(f"Warning: Could not load local dataset. {e}")
    weather_df = None

# In-Memory Cache dictionary
WEATHER_CACHE = {}
CACHE_TTL_SECONDS = 900  # Cache responses for 15 minutes (900 seconds)


def get_open_meteo_weather(latitude: float, longitude: float):
    """Fetches 100% true live weather using the free Open-Meteo API."""
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,shortwave_radiation",
        "timezone": "auto"
    }
    
    try:
        # Request live data
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        current = data.get("current", {})
        
        # Clean timestamps
        raw_time = current.get("time", "")
        clean_date = raw_time[:10].replace("-", "") if raw_time else datetime.utcnow().strftime("%Y%m%d")
        utc_hour = raw_time[11:13] if raw_time else datetime.utcnow().strftime("%H")

        return {
            "status": "success",
            "country": "India",
            "source": "Open-Meteo (Live)",
            "latitude": latitude,
            "longitude": longitude,
            "date": clean_date,
            "utc_hour": utc_hour,
            "weather": {
                "temperature_c": float(current.get("temperature_2m", 0.0)),
                "humidity_pct": float(current.get("relative_humidity_2m", 0.0)),
                "rainfall_mm": float(current.get("precipitation", 0.0)),
                "wind_speed_m_s": float(current.get("wind_speed_10m", 0.0)),
                "solar_radiation_w_m2": float(current.get("shortwave_radiation", 0.0))
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "message": f"Open-Meteo fetch failed: {str(e)}"
        }


def get_local_fallback_weather(latitude: float, longitude: float):
    """Fetches the closest weather data from the local CSV if online APIs fail."""
    if weather_df is None or weather_df.empty:
        return {
            "status": "error",
            "message": "All APIs and Local Dataset are unavailable."
        }

    # Find the nearest geographic point in the CSV
    distances = (
        (weather_df["latitude"] - latitude).abs()
        + (weather_df["longitude"] - longitude).abs()
    )
    nearest_index = distances.idxmin()
    weather = weather_df.loc[nearest_index]

    wind_kmh = float(weather.get("wind_kmh", 0))
    wind_ms = round(wind_kmh * (1000 / 3600), 2)

    time_str = str(weather.get("time", datetime.utcnow().strftime("%Y-%m-%d")))
    clean_date = time_str[:10].replace("-", "")

    return {
        "status": "success",
        "country": "India",
        "source": "Local CSV Fallback",
        "latitude": float(weather["latitude"]),
        "longitude": float(weather["longitude"]),
        "date": clean_date,
        "utc_hour": "12",
        "weather": {
            "temperature_c": float(weather.get("temp_c", 0)),
            "humidity_pct": float(weather.get("humidity_pct", 0)),
            "rainfall_mm": float(weather.get("precip_mm", 0)),
            "wind_speed_m_s": wind_ms,
            "solar_radiation_w_m2": float(weather.get("solar_wm2", 0))
        }
    }


def get_hybrid_weather(latitude: float, longitude: float):
    """Orchestrates the Ultimate Hybrid Logic: Cache -> Open-Meteo -> NASA -> CSV."""
    cache_key = (round(latitude, 2), round(longitude, 2))
    current_time = time.time()

    # 1. Check if valid cached data exists
    if cache_key in WEATHER_CACHE:
        cached_response, timestamp = WEATHER_CACHE[cache_key]
        if current_time - timestamp < CACHE_TTL_SECONDS:
            response_copy = cached_response.copy()
            if "(Cached)" not in response_copy["source"]:
                response_copy["source"] += " (Cached)"
            return response_copy

    # 2. Try fetching true live data from Open-Meteo
    live_data = get_open_meteo_weather(latitude, longitude)
    if live_data.get("status") == "success":
        WEATHER_CACHE[cache_key] = (live_data, current_time)
        return live_data

    # 3. Fall back to NASA POWER if Open-Meteo fails
    print(f"Open-Meteo Failed ({live_data.get('message')}). Trying NASA POWER...")
    nasa_data = get_nasa_weather(latitude, longitude)
    if nasa_data.get("status") == "success":
        WEATHER_CACHE[cache_key] = (nasa_data, current_time)
        return nasa_data

    # 4. Hard fall back to local CSV if both APIs fail
    print(f"NASA Fetch Failed ({nasa_data.get('message')}). Triggering CSV Fallback...")
    fallback_data = get_local_fallback_weather(latitude, longitude)
    if fallback_data.get("status") == "success":
        WEATHER_CACHE[cache_key] = (fallback_data, current_time)
        
    return fallback_data


if __name__ == "__main__":
    # Test execution for Solapur
    print(get_hybrid_weather(17.66, 75.91))