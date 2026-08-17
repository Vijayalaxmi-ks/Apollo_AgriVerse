"""
Apollo Agriverse - Execution Entry Point
Multi-crop and multi-district market arbitrage analysis dashboard.
"""

import sys
from arbitrage_engine import ApolloArbitrageEngine
from forex_client import ForexClient
from apollo_master_catalog import ApolloDropdownManager

def print_header(title: str):
    print("\n" + "=" * 75)
    print(f" {title.center(73)} ")
    print("=" * 75)

def run_suite():
    print_header("APOLLO AGRIVERSE - MASTER MARKET INTELLIGENCE SUITE")
    
    # 1. System Status
    forex = ForexClient()
    usd_inr = forex.get_usd_to_inr()
    print(f"[*] Live Forex Baseline   : 1 USD = ₹{usd_inr:.2f}")
    print(f"[*] Total Districts Tracked : {len(ApolloDropdownManager.get_all_cities_flat())} across India")
    print(f"[*] Total Crops in Catalog  : {len(ApolloDropdownManager.get_all_crops_flat())} varieties")

    engine = ApolloArbitrageEngine()

    # 2. Diverse Target Evaluation (Focus on Maharashtra + Key Indian Hubs)
    eval_targets = [
        {"commodity": "Grape (Thompson Seedless)", "state": "Maharashtra"},
        {"commodity": "Onion (Red / Nasik)", "state": "Maharashtra"},
        {"commodity": "Pomegranate (Bhagwa)", "state": "Maharashtra"},
        {"commodity": "Cotton (Bt Cotton)", "state": "Maharashtra"},
        {"commodity": "Sugarcane (Co 86032)", "state": "Maharashtra"},
        {"commodity": "Wheat (Sharbati)", "state": "Punjab"},
        {"commodity": "Soybean", "state": "Madhya Pradesh"},
        {"commodity": "Tomato (Hybrid)", "state": "Maharashtra"}
    ]

    for target in eval_targets:
        comm = target["commodity"]
        st = target["state"]
        
        print_header(f"ANALYZING: {comm} [{st.upper()}]")
        result = engine.evaluate_market_arbitrage(commodity=comm, state=st)

        if result.get("status") == "SUCCESS":
            print(f"Domestic Mandi Price    : ₹{result['local_spot_price_quintal_inr']:,.2f} / Qtl  (₹{result['local_spot_price_ton_inr']:,.2f} / Ton)")
            print(f"Global Benchmark/Futures : ${result['global_futures_usd_per_ton']:,.2f} / Ton  [{result['market_type']}]")
            print(f"Net Landed Export Value  : ₹{result['net_export_value_inr']:,.2f} / Ton  (Friction-Adjusted)")
            print(f"Net Price Spread         : ₹{result['arbitrage_spread_inr_ton']:+,.2f} / Ton  ({result['spread_percentage']:+.2f}%)")
            print(f"Decision Status          : {result['action_tag']}")
            print(f"Operational Directive    : {result['directive_message']}")
        else:
            print(f"[!] Evaluation Failed: {result.get('reason')}")

    print_header("SUITE EXECUTION COMPLETE")

if __name__ == "__main__":
    run_suite()