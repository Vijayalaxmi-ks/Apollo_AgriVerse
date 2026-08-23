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

    # Realistic fallback baseline Mandi prices per quintal (₹/qtl) & trends
    self._mandi_price_db = {
        "grape": {"modal_price_per_qtl": 4500, "price_trend": "UPWARD"},
        "onion": {"modal_price_per_qtl": 1800, "price_trend": "UPWARD"},
        "tomato": {"modal_price_per_qtl": 1200, "price_trend": "DOWNWARD"},
        "potato": {"modal_price_per_qtl": 1500, "price_trend": "STABLE"},
        "maize": {"modal_price_per_qtl": 2100, "price_trend": "STABLE"},
        "cotton": {"modal_price_per_qtl": 6800, "price_trend": "UPWARD"},
        "paddy": {"modal_price_per_qtl": 2200, "price_trend": "STABLE"},
        "wheat": {"modal_price_per_qtl": 2400, "price_trend": "STABLE"},
    }

  def get_live_weather(
      self, latitude: float, longitude: float
  ) -> Dict[str, Any]:
    if not self.openweather_api_key:
      logger.info("No OpenWeather API key provided. Using local ambient baseline.")
      return {"temp_c": 21.1, "humidity": 65, "is_live": False}

    try:
      url = f"https://api.openweathermap.org/data/2.5/weather?lat={latitude}&lon={longitude}&appid={self.openweather_api_key}&units=metric"
      response = requests.get(url, timeout=5)
      if response.status_code == 200:
        data = response.json()
        return {
            "temp_c": float(data["main"]["temp"]),
            "humidity": int(data["main"]["humidity"]),
            "is_live": True,
        }
    except Exception as e:
      logger.warning(f"Failed to fetch live weather data: {e}")

    return {"temp_c": 21.1, "humidity": 65, "is_live": False}

  def get_mandi_market_data(
      self, state: str, district: str, crop_name: str
  ) -> Dict[str, Any]:
    clean_crop = str(crop_name).strip().lower().rstrip("s")

    # If Agmarknet API key is available, query the official API endpoint
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
                "price_trend": "UPWARD" if price > 2500 else "STABLE",
                "is_live": True,
            }
      except Exception as e:
        logger.warning(f"Agmarknet API fetch failed for {crop_name}: {e}")

    # Dynamic dynamic fallback lookup by normalized crop key
    if clean_crop in self._mandi_price_db:
      data = self._mandi_price_db[clean_crop]
      return {
          "modal_price_per_qtl": data["modal_price_per_qtl"],
          "price_trend": data["price_trend"],
          "is_live": False,
      }

    # Generic default for unregistered crops
    return {
        "modal_price_per_qtl": 2000,
        "price_trend": "STABLE",
        "is_live": False,
    }