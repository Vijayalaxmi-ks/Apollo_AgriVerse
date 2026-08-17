"""
Apollo Agriverse - Master Configuration Module
Centralizes API endpoints, commodity tickers, conversions, and export benchmarks.
"""

import os

# --- API KEYS ---
DATA_GOV_API_KEY = os.getenv("DATA_GOV_API_KEY", "YOUR_DATA_GOV_IN_API_KEY_HERE")

# --- AGMARKNET ENDPOINT ---
AGMARKNET_RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"
AGMARKNET_BASE_URL = f"https://api.data.gov.in/resource/{AGMARKNET_RESOURCE_ID}"

# --- FOREX ENDPOINT ---
FOREX_BASE_URL = "https://api.exchangerate-api.com/v4/latest/USD"

# --- GLOBAL COMMODITY DERIVATIVE TICKERS (CBOT / ICE via yfinance) ---
GLOBAL_COMMODITY_TICKERS = {
    "WHEAT": "ZW=F",      # CBOT Chicago Wheat (Cents/Bushel)
    "CORN": "ZC=F",       # CBOT Corn (Cents/Bushel)
    "MAIZE": "ZC=F",      # CBOT Maize
    "SOYBEAN": "ZS=F",    # CBOT Soybeans (Cents/Bushel)
    "SUGAR": "SB=F",      # ICE Sugar #11 (Cents/Pound)
    "SUGARCANE": "SB=F",  # Mapped to Sugar derivative
    "COTTON": "CT=F",     # ICE Cotton #2 (Cents/Pound)
    "COFFEE": "KC=F",     # ICE Coffee (Cents/Pound)
    "RICE": "ZR=F"        # CBOT Rough Rice (Cents/Hundredweight)
}

# --- UNIT CONVERSION MULTIPLIERS (To USD / Metric Ton) ---
METRIC_CONVERSIONS = {
    "WHEAT": 0.367437,
    "CORN": 0.393680,
    "MAIZE": 0.393680,
    "SOYBEAN": 0.367437,
    "SUGAR": 22.046200,
    "SUGARCANE": 22.046200,
    "COTTON": 22.046200,
    "COFFEE": 22.046200,
    "RICE": 0.220462
}

# --- HORTICULTURAL & FRESH PRODUCE EXPORT BENCHMARKS (USD / Metric Ton) ---
# For crops not traded on derivative exchanges, tracking international FOB/APEDA benchmarks.
HORTICULTURAL_EXPORT_BENCHMARKS = {
    "GRAPE": 3330.00,        # Rotterdam/Middle East premium export benchmark ($3.33/kg)
    "ONION": 450.00,         # GCC export FOB benchmark ($0.45/kg)
    "POMEGRANATE": 2400.00,  # Bhagwa EU/Middle East export benchmark ($2.40/kg)
    "MANGO": 3800.00,        # Alphonso/Kesar export air-cargo benchmark ($3.80/kg)
    "BANANA": 650.00,        # Grand Naine reefer export benchmark ($0.65/kg)
    "TOMATO": 550.00,        # Regional cross-border trade benchmark ($0.55/kg)
    "POTATO": 380.00,        # Processing/table grade export benchmark ($0.38/kg)
    "TURMERIC": 1850.00      # High-curcumin spice export benchmark ($1.85/kg)
}

# --- ESTIMATED EXPORT LOGISTICS & FRICTION (INR / Metric Ton) ---
# Covers port handling, reefer/dry container freight, documentation, APEDA clearances
DEFAULT_EXPORT_FRICTION_INR_PER_TON = 3500.0