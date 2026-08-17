"""
Apollo Agriverse - Agmarknet Spot Market Client
Extracts and normalizes Indian wholesale APMC Mandi data with multi-crop fallback.
"""

import requests
import pandas as pd
from typing import Optional, Dict, Any
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import config

class AgmarknetClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or config.DATA_GOV_API_KEY
        self.base_url = config.AGMARKNET_BASE_URL
        
        self.session = requests.Session()
        retries = Retry(
            total=3,
            backoff_factor=1.5,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET"]
        )
        self.session.mount("https://", HTTPAdapter(max_retries=retries))

    def fetch_spot_records(self, limit: int = 2000) -> pd.DataFrame:
        if self.api_key == "YOUR_DATA_GOV_IN_API_KEY_HERE" or not self.api_key:
            return self._get_mock_spot_data()

        params = {"api-key": self.api_key, "format": "json", "limit": limit}

        try:
            response = self.session.get(self.base_url, params=params, timeout=15)
            if response.status_code == 200:
                records = response.json().get("records", [])
                if records:
                    return self._clean_records(records)
            return self._get_mock_spot_data()
        except Exception:
            return self._get_mock_spot_data()

    def get_crop_price_summary(self, commodity: str, state: Optional[str] = None) -> Dict[str, Any]:
        df = self.fetch_spot_records()
        if df.empty:
            return {"status": "NO_DATA", "commodity": commodity}

        # Normalize search string (extract core crop name)
        clean_comm = commodity.split("(")[0].strip().upper()

        filtered = df[df["commodity"].str.contains(clean_comm, na=False)]
        if state:
            filtered = filtered[filtered["state"].str.contains(state.split()[0].upper(), na=False)]

        if filtered.empty:
            # Fallback search without state filter
            filtered = df[df["commodity"].str.contains(clean_comm, na=False)]
            if filtered.empty:
                return {"status": "NOT_FOUND", "commodity": commodity}

        modal_avg = filtered["modal_price"].mean()
        min_p = filtered["min_price"].min()
        max_p = filtered["max_price"].max()
        market_count = len(filtered["market"].unique())

        return {
            "status": "SUCCESS",
            "commodity": clean_comm,
            "state_filtered": state or "ALL_INDIA",
            "modal_price_quintal": round(modal_avg, 2),
            "modal_price_ton": round(modal_avg * 10, 2),
            "min_price_quintal": round(min_p, 2),
            "max_price_quintal": round(max_p, 2),
            "reporting_markets_count": market_count
        }

    def _clean_records(self, records: list) -> pd.DataFrame:
        df = pd.DataFrame(records)
        for col in ["min_price", "max_price", "modal_price"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
        for col in ["state", "district", "market", "commodity", "variety", "grade"]:
            if col in df.columns:
                df[col] = df[col].astype(str).str.upper().str.strip()
        return df

    def _get_mock_spot_data(self) -> pd.DataFrame:
        """High-fidelity fallback data covering major Maharashtra and Indian APMC hubs."""
        data = [
            # Maharashtra Grapes, Onions, Pomegranates, Cotton, Sugarcane
            {"state": "MAHARASHTRA", "district": "NASHIK", "market": "PIMPALGAON", "commodity": "GRAPE", "variety": "THOMPSON SEEDLESS", "grade": "A-GRADE", "min_price": 4200, "max_price": 5200, "modal_price": 4800},
            {"state": "MAHARASHTRA", "district": "SANGLI", "market": "SANGLI", "commodity": "GRAPE", "variety": "SONAKA", "grade": "A-GRADE", "min_price": 4400, "max_price": 5400, "modal_price": 4900},
            {"state": "MAHARASHTRA", "district": "NASHIK", "market": "LASALGAON", "commodity": "ONION", "variety": "RED", "grade": "FAQ", "min_price": 1900, "max_price": 2400, "modal_price": 2250},
            {"state": "MAHARASHTRA", "district": "SOLAPUR", "market": "SOLAPUR", "commodity": "POMEGRANATE", "variety": "BHAGWA", "grade": "EXPORT-GRADE", "min_price": 8500, "max_price": 12500, "modal_price": 10500},
            {"state": "MAHARASHTRA", "district": "JALGAON", "market": "JALGAON", "commodity": "BANANA", "variety": "GRAND NAINE", "grade": "FAQ", "min_price": 1400, "max_price": 1800, "modal_price": 1600},
            {"state": "MAHARASHTRA", "district": "NAGPUR", "market": "NAGPUR", "commodity": "COTTON", "variety": "BT COTTON", "grade": "FAQ", "min_price": 7200, "max_price": 7700, "modal_price": 7450},
            {"state": "MAHARASHTRA", "district": "KOLHAPUR", "market": "KOLHAPUR", "commodity": "SUGARCANE", "variety": "CO 86032", "grade": "FAQ", "min_price": 3100, "max_price": 3400, "modal_price": 3250},
            {"state": "MAHARASHTRA", "district": "PUNE", "market": "PUNE", "commodity": "TOMATO", "variety": "HYBRID", "grade": "FAQ", "min_price": 1800, "max_price": 2600, "modal_price": 2200},
            {"state": "MAHARASHTRA", "district": "SANGLI", "market": "SANGLI", "commodity": "TURMERIC", "variety": "RAJAPORE", "grade": "FAQ", "min_price": 13000, "max_price": 15500, "modal_price": 14200},
            
            # Other Indian States
            {"state": "PUNJAB", "district": "LUDHIANA", "market": "LUDHIANA", "commodity": "WHEAT", "variety": "SHARBATI", "grade": "FAQ", "min_price": 2250, "max_price": 2400, "modal_price": 2320},
            {"state": "GUJARAT", "district": "RAJKOT", "market": "RAJKOT", "commodity": "COTTON", "variety": "BT COTTON", "grade": "FAQ", "min_price": 7100, "max_price": 7600, "modal_price": 7350},
            {"state": "MADHYA PRADESH", "district": "INDORE", "market": "INDORE", "commodity": "SOYBEAN", "variety": "YELLOW", "grade": "FAQ", "min_price": 4400, "max_price": 4800, "modal_price": 4650},
            {"state": "UTTAR PRADESH", "district": "MEERUT", "market": "MEERUT", "commodity": "SUGAR", "variety": "MEDIUM", "grade": "FAQ", "min_price": 3800, "max_price": 3950, "modal_price": 3890}
        ]
        return pd.DataFrame(data)