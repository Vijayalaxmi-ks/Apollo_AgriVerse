import logging
from typing import Any, Dict
import requests

logger = logging.getLogger("ExternalDataService")


class ExternalDataService:

  def __init__(
      self,
      openweather_api_key: str = "",
      agmarknet_api_key: str = "",
  ):
    self.openweather_api_key = openweather_api_key
    self.agmarknet_api_key = agmarknet_api_key

    # Realistic fallback baseline Mandi prices per quintal for Maharashtra (₹/qtl) & trends
    self._mandi_price_db = {
        "onion": {"modal_price_per_qtl": 1800, "price_trend": "UPWARD"},
        "soyabean": {"modal_price_per_qtl": 4600, "price_trend": "STABLE"},
        "cotton": {"modal_price_per_qtl": 6800, "price_trend": "UPWARD"},
        "tur": {"modal_price_per_qtl": 7200, "price_trend": "UPWARD"},
        "bajra": {"modal_price_per_qtl": 2300, "price_trend": "STABLE"},
        "jowar": {"modal_price_per_qtl": 2900, "price_trend": "STABLE"},
        "pomegranate": {"modal_price_per_qtl": 8500, "price_trend": "UPWARD"},
        "wheat": {"modal_price_per_qtl": 2400, "price_trend": "STABLE"},
        "grape": {"modal_price_per_qtl": 6500, "price_trend": "UPWARD"},
    }

  def get_live_weather(
      self, latitude: float, longitude: float
  ) -> Dict[str, Any]:
    if not self.openweather_api_key:
      try:
        response = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": latitude,
                "longitude": longitude,
                "current": "temperature_2m,relative_humidity_2m",
            },
            timeout=5,
        )
        if response.status_code == 200:
          current = response.json().get("current", {})
          if current.get("temperature_2m") is not None:
            logger.info("Using live weather from Open-Meteo.")
            return {
                "temp_c": float(current["temperature_2m"]),
                "humidity": int(current.get("relative_humidity_2m", 60)),
                "is_live": True,
                "source": "Open-Meteo",
            }
      except requests.exceptions.Timeout:
        logger.warning("Open-Meteo weather request timed out. Using local baseline.")
      except Exception as exc:
        logger.warning("Open-Meteo weather request failed: %s", exc)

      logger.info("No live weather available. Using local ambient baseline.")
      return {"temp_c": 27.5, "humidity": 60, "is_live": False, "source": "local baseline"}

    try:
      url = f"https://api.openweathermap.org/data/2.5/weather?lat={latitude}&lon={longitude}&appid={self.openweather_api_key}&units=metric"
      response = requests.get(url, timeout=5)
      if response.status_code == 200:
        data = response.json()
        if "main" in data:
          return {
              "temp_c": float(data["main"].get("temp", 27.5)),
              "humidity": int(data["main"].get("humidity", 60)),
              "is_live": True,
              "source": "OpenWeather",
          }
    except requests.exceptions.Timeout:
      logger.warning("OpenWeather API request timed out. Falling back to baseline.")
    except Exception as e:
      logger.warning(f"Failed to fetch live weather data: {e}")

    return {"temp_c": 27.5, "humidity": 60, "is_live": False, "source": "local baseline"}

  def get_mandi_market_data(
      self, state: str, district: str, crop_name: str
  ) -> Dict[str, Any]:
    clean_crop = str(crop_name).strip().lower().rstrip("s")

    if self.agmarknet_api_key:
      try:
        url = f"https://api.gov.in/resource/9ef02057-3605-4435-a679-e283d4152161?api-key={self.agmarknet_api_key}&format=json&filters[state]={state}&filters[district]={district}&filters[commodity]={crop_name}"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
          records = response.json().get("records", [])
          if records:
            latest = records[0]
            price = float(latest.get("modal_price", 0))
            return {
                "modal_price_per_qtl": price,
                "price_trend": "UPWARD" if price > 3000 else "STABLE",
                "is_live": True,
            }
      except Exception as e:
        logger.warning(f"Agmarknet API fetch failed for {crop_name}: {e}")

    if clean_crop in self._mandi_price_db:
      data = self._mandi_price_db[clean_crop]
      return {
          "modal_price_per_qtl": data["modal_price_per_qtl"],
          "price_trend": data["price_trend"],
          "is_live": False,
      }

    return {
        "modal_price_per_qtl": 2500,
        "price_trend": "STABLE",
        "is_live": False,
    }