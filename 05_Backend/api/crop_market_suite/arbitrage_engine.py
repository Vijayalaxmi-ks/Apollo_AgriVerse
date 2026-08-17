"""
Apollo Agriverse - Arbitrage & Export Parity Decision Engine
Integrates Spot Mandi Data, Global Futures/Benchmarks, and Forex.
"""

from typing import Dict, Any
from agmarknet_client import AgmarknetClient
from global_futures_client import GlobalFuturesClient
from forex_client import ForexClient
import config

class ApolloArbitrageEngine:
    def __init__(self, agmarknet_key: str = None):
        self.spot_client = AgmarknetClient(api_key=agmarknet_key)
        self.futures_client = GlobalFuturesClient()
        self.forex_client = ForexClient()

    def evaluate_market_arbitrage(self, commodity: str, state: str = "MAHARASHTRA") -> Dict[str, Any]:
        # 1. Fetch Local Spot Data
        spot_data = self.spot_client.get_crop_price_summary(commodity, state)
        if spot_data.get("status") != "SUCCESS":
            return {"status": "FAILED", "reason": f"Unable to fetch spot mandi data for {commodity}"}

        # 2. Fetch Global Benchmark / Futures
        futures_data = self.futures_client.fetch_commodity_futures(commodity)
        if futures_data.get("status") != "SUCCESS":
            return {"status": "FAILED", "reason": f"Global market mapping unavailable for {commodity}"}

        # 3. Fetch Forex
        usd_inr = self.forex_client.get_usd_to_inr()

        # 4. Parity Calculations
        local_price_ton_inr = spot_data["modal_price_ton"]
        global_price_ton_usd = futures_data["usd_per_metric_ton"]
        gross_export_value_inr = global_price_ton_usd * usd_inr
        
        # Deduct port logistics and handling friction
        net_export_value_inr = gross_export_value_inr - config.DEFAULT_EXPORT_FRICTION_INR_PER_TON
        
        spread_inr = net_export_value_inr - local_price_ton_inr
        spread_percentage = (spread_inr / local_price_ton_inr) * 100

        # 5. Directives
        if spread_percentage > 12.0:
            directive_code = "EXPORT_ARBITRAGE_RECOMMENDED"
            directive_msg = (
                "Global market offers a high premium over domestic mandis. "
                "Route inventory toward APEDA maritime export corridors."
            )
            action_tag = "🟢 EXPORT FAVORABLE"
        elif spread_percentage < -5.0:
            directive_code = "DOMESTIC_LIQUIDATION_RECOMMENDED"
            directive_msg = (
                "Domestic spot prices exceed international parity. "
                "Halt export logistics and liquidate inventory across local APMC mandis."
            )
            action_tag = "🔴 DOMESTIC SPOT FAVORABLE"
        else:
            directive_code = "WAREHOUSE_HOLD_RECOMMENDED"
            directive_msg = (
                "Price differential is within logistics friction margin. "
                "Hold stock in climate-controlled warehousing."
            )
            action_tag = "🟡 EQUILIBRIUM / HOLD"

        return {
            "status": "SUCCESS",
            "commodity": commodity.upper(),
            "region": state.upper(),
            "forex_usd_inr": usd_inr,
            "market_type": futures_data.get("market_type", "EXCHANGE"),
            "local_spot_price_quintal_inr": spot_data["modal_price_quintal"],
            "local_spot_price_ton_inr": local_price_ton_inr,
            "global_futures_usd_per_ton": global_price_ton_usd,
            "gross_export_value_inr": round(gross_export_value_inr, 2),
            "net_export_value_inr": round(net_export_value_inr, 2),
            "arbitrage_spread_inr_ton": round(spread_inr, 2),
            "spread_percentage": round(spread_percentage, 2),
            "action_tag": action_tag,
            "directive_code": directive_code,
            "directive_message": directive_msg
        }