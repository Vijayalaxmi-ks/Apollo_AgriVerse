"""
Apollo Agriverse - Global Commodity Futures Client
Fetches real-time exchange futures (CBOT / ICE) with weekend lookback and 
Horticultural/APEDA benchmarks for fresh produce.
"""

import yfinance as yf
from typing import Dict, Any
import config

class GlobalFuturesClient:
    def __init__(self):
        self.tickers = config.GLOBAL_COMMODITY_TICKERS
        self.conversions = config.METRIC_CONVERSIONS
        self.horticultural_benchmarks = config.HORTICULTURAL_EXPORT_BENCHMARKS

    def fetch_commodity_futures(self, commodity: str) -> Dict[str, Any]:
        # Normalize crop name
        comm_key = commodity.split("(")[0].strip().upper()

        # 1. HORTICULTURAL & NON-EXCHANGE CROPS (Grapes, Onions, Pomegranates, etc.)
        if comm_key in self.horticultural_benchmarks:
            usd_ton = self.horticultural_benchmarks[comm_key]
            return {
                "status": "SUCCESS",
                "commodity": comm_key,
                "ticker": "APEDA/GLOBAL-BENCHMARK",
                "raw_price": round(usd_ton / 1000.0, 2),
                "usd_per_metric_ton": float(usd_ton),
                "market_type": "PHYSICAL_EXPORT_BENCHMARK"
            }

        # 2. DERIVATIVE EXCHANGE COMMODITIES (Wheat, Cotton, Soybeans, Sugar, etc.)
        ticker_symbol = self.tickers.get(comm_key)
        if not ticker_symbol:
            return {
                "status": "UNSUPPORTED_COMMODITY",
                "commodity": comm_key,
                "message": f"No global derivative or export benchmark mapping for '{comm_key}'."
            }

        try:
            ticker = yf.Ticker(ticker_symbol)
            # 5d lookback ensures closing prices are returned during weekends & holidays
            history = ticker.history(period="5d")

            if history.empty:
                return {"status": "DATA_UNAVAILABLE", "commodity": comm_key}

            latest_close = float(history["Close"].iloc[-1])
            conversion_factor = self.conversions.get(comm_key, 1.0)
            usd_per_ton = latest_close * conversion_factor

            return {
                "status": "SUCCESS",
                "commodity": comm_key,
                "ticker": ticker_symbol,
                "raw_price": round(latest_close, 2),
                "usd_per_metric_ton": round(usd_per_ton, 2),
                "market_type": "EXCHANGE_FUTURES"
            }
        except Exception as err:
            return {
                "status": "ERROR",
                "commodity": comm_key,
                "message": str(err)
            }