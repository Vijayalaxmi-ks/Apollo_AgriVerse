"""
Apollo Agriverse - Foreign Exchange (Forex) Client
Provides real-time currency conversion rates for parity modeling.
"""

import requests
from typing import Dict, Any
import config

class ForexClient:
    def __init__(self):
        self.endpoint = config.FOREX_BASE_URL
        self.default_fallback_rates = {
            "INR": 83.50,
            "EUR": 0.92,
            "GBP": 0.79,
            "AED": 3.67
        }

    def fetch_exchange_rates(self) -> Dict[str, Any]:
        try:
            response = requests.get(self.endpoint, timeout=5)
            if response.status_code == 200:
                data = response.json()
                return {
                    "status": "LIVE",
                    "base": "USD",
                    "rates": data.get("rates", self.default_fallback_rates)
                }
            return {"status": "FALLBACK", "base": "USD", "rates": self.default_fallback_rates}
        except Exception:
            return {"status": "FALLBACK", "base": "USD", "rates": self.default_fallback_rates}

    def get_usd_to_inr(self) -> float:
        rates_data = self.fetch_exchange_rates()
        return float(rates_data["rates"].get("INR", 83.50))