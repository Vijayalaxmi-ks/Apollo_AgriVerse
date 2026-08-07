# Apollo AgriVerse
# Master Datasets Data Dictionary

**Version:** 1.0  
**Last Updated:** August 2026  

---

# Purpose

This document provides a comprehensive data dictionary for the production master datasets generated and utilized in **Apollo AgriVerse**. 

It serves as the authoritative reference for:
- Agronomic Benchmark Analysis
- Synthetic State Vector Generation
- Feature Engineering Pipelines
- Machine Learning Model Training (`06_ML/`)
- Real-Time Digital Twin Simulation Engine Sync

---

# Dataset 1 : Grape Agronomy Reference Master

**File Path**  
`02_Datasets/Processed/Grapes/Master_Grapes_Agronomy_Reference.csv`

**Description**  
Serves as the static agronomic baseline and machine learning knowledge base. It links soil chemistry, nutrient saturation levels, and microclimate parameters to target harvest yield outcomes for grapes (*Vitis vinifera*).

| Feature | Data Type | Description | Expected Range / Values |
| :--- | :--- | :--- | :--- |
| `nitrogen_mgkg` | Float | Soil Available Nitrogen Content | 80.0 – 250.0 mg/kg |
| `phosphorus_mgkg` | Float | Soil Available Phosphorus Content | 20.0 – 80.0 mg/kg |
| `potassium_mgkg` | Float | Soil Available Potassium Content | 120.0 – 400.0 mg/kg |
| `soil_ph` | Float | Soil Reaction / Acidity-Alkalinity Level | 5.5 – 8.5 |
| `air_temp_c` | Float | Seasonal Baseline Ambient Air Temperature | 15.0 – 38.0 °C |
| `humidity_pct` | Float | Seasonal Average Relative Humidity | 35.0 – 85.0 % |
| `rainfall_mm` | Float | Seasonal Cumulative Precipitation | 400.0 – 1200.0 mm |
| `N_K_ratio` | Float | Engineered Feature: Nitrogen to Potassium Balance | 0.2 – 1.8 |
| `P_K_ratio` | Float | Engineered Feature: Phosphorus to Potassium Balance | 0.05 – 0.6 |
| `ph_opt_dev` | Float | Engineered Feature: Deviation from Optimal Grape Soil pH (6.5) | 0.0 – 2.0 |
| `yield_tons_ha` | Float | **Target Output:** Grape Harvest Yield | 8.0 – 28.0 tons/ha |

---

# Dataset 2 : Grape Digital Twin Telemetry Master

**File Path**  
`02_Datasets/Processed/Grapes/Master_Grapes_Digital_Twin_Telemetry.csv`

**Description**  
Serves as the dynamic state vector for the virtual vineyard. It models continuous microclimate dynamics, soil thermal gradients, and intelligent substrate responses (hydrogels and protective mulching) across the viticulture lifecycle.

| Feature | Data Type | Description | Expected Range / Values |
| :--- | :--- | :--- | :--- |
| `farm_id` | String | Unique Farm Identifier | FD0001 ... FD1000 |
| `farmer_name` | String | Registered Farmer Name | Text String |
| `village_district` | String | Geographical Location / District in Maharashtra | Nashik, Solapur, Sangli, Pune, etc. |
| `latitude` | Float | Field Geo-Spatial Latitude | 15.5 – 21.5 °N |
| `longitude` | Float | Field Geo-Spatial Longitude | 72.5 – 80.5 °E |
| `area_acres` | Float | Total Vineyard Plot Area | 0.5 – 15.0 Acres |
| `soil_type` | Category | Soil Substrate Classification | Black, Red, Loamy, Sandy, Clay |
| `date_planted` | Date | Crop Cycle Sowing / Planting Date | YYYY-MM-DD |
| `crop_age_days` | Float | Age of the Grape Crop in Days | 1 – 210 Days |
| `growth_stage` | Category | Viticulture Growth Phase | Budbreak, Flowering, Fruit Set, Veraison, Harvest |
| `canopy_cover_percent` | Float | Leaf Canopy Coverage Percentage | 10.0 – 95.0 % |
| `chlorophyll_index` | Float | Leaf Chlorophyll Index (SPAD Value) | 20.0 – 65.0 |
| `air_temp_c` | Float | Live Ambient Air Temperature | 18.0 – 42.0 °C |
| `humidity_pct` | Float | Live Relative Humidity | 30.0 – 95.0 % |
| `soil_moisture_pct` | Float | Volumetric Soil Water Content | 12.0 – 85.0 % |
| `soil_temp_c` | Float | Root-Zone Soil Temperature | 15.0 – 35.0 °C |
| `hydrogel_water_storage_pct` | Float | **Target Output:** Smart Hydrogel Retention Capacity | 0.0 – 100.0 % |
| `hydrogel_release_rate` | Float | Hydrogel Adaptive Water Release Velocity | 0.1 – 8.0 L/hr |
| `mulch_degradation_pct` | Float | Protective Film Physical Degradation | 0.0 – 100.0 % |
| `mulch_temp_reduction_c` | Float | Surface Thermal Suppression by Mulch Film | 0.5 – 6.5 °C |
| `thermal_gap` | Float | Engineered Feature: Air-Soil Temperature Delta | 0.0 – 15.0 °C |
| `effective_mulch_cooling` | Float | Engineered Feature: Active Cooling Considering Degradation | 0.0 – 6.5 °C |
| `evapotranspiration_index` | Float | Engineered Feature: Atmospheric Evaporative Demand Proxy | 0.15 – 1.4 |

---

# Relationships & System Integrity Constraints

- Every `farm_id` in `Master_Grapes_Digital_Twin_Telemetry.csv` represents a distinct virtual plot block.
- `growth_stage` transitions must strictly align with cumulative Growing Degree Days (GDD) and `crop_age_days`.
- Soil moisture reductions must trigger proportional increases in `hydrogel_release_rate` when `evapotranspiration_index` is elevated.
- `effective_mulch_cooling` must decrease linearly as `mulch_degradation_pct` approaches 100%[cite: 5].

---

# Directory & Deliverable Structure

```text
Apollo_AgriVerse/
│
├── 01_Documentation/
│   ├── Dataset_Docs/
│   │   └── SYNTHETIC_DATA_DICTIONARY.md
│   ├── API_Docs/
│   └── Reports/
│
├── 02_Datasets/
│   ├── Master/
│   │   └── build_grape_masters.ipynb
│   ├── Processed/
│   │   └── Grapes/
│   │       ├── Master_Grapes_Agronomy_Reference.csv
│   │       └── Master_Grapes_Digital_Twin_Telemetry.csv
│   └── Synthetic/
│       ├── Raw/
│       └── Cleaned/
│
└── 06_ML/
    ├── models/
    │   ├── grape_yield_model.pkl
    │   ├── grape_yield_scaler.pkl
    │   ├── grape_telemetry_trigger_model.pkl
    │   └── grape_telemetry_scaler.pkl
    ├── notebooks/
    └── inference/
        └── test_models_inference.py