# Apollo AgriVerse
# Weather Data Dictionary

**Version:** 1.1
**Last Updated:** August 2026

---

# Purpose

This document describes the weather dataset fetched, cleaned, preprocessed, and augmented for the Apollo AgriVerse project. 

It serves as the reference for:
*   Historical weather data spanning the India-wide grid for the year 2023.
*   Data cleaning and imputation workflows.
*   Feature engineering and advanced Machine Learning preprocessing pipelines, including cyclical encoding, windowing, and meteorological augmentation.

---

# Dataset 1 : Raw Weather Data

**File**
`02_Datasets/Raw/weather/weather_raw_dataset.csv`

| Feature | Data Type | Description | Expected Range / Limits |
| :--- | :--- | :--- | :--- |
| time | DateTime | Hourly timestamp of the reading | 2023-01-01 to 2023-12-31 |
| latitude | Float | Grid location latitude | 8.0 to 37.0 |
| longitude | Float | Grid location longitude | 68.0 to 97.0 |
| temp_c | Float | Air temperature at 2m | Unbounded (contains extremes/outliers) |
| humidity_pct | Integer | Relative humidity at 2m | Unbounded initially |
| precip_mm | Float | Hourly precipitation | Unbounded initially |
| dewpoint_c | Float | Dewpoint temperature at 2m | - |
| pressure_hpa | Float | Surface pressure | - |
| cloud_pct | Integer | Total cloud cover percentage | Unbounded initially |
| wind_kmh | Float | Wind speed at 10m | Unbounded initially |
| wind_dir_deg | Integer | Wind direction at 10m | 0 - 360 degrees |
| soil_temp_shallow_c | Float | Soil temperature (0-7cm) | - |
| soil_moist_shallow_pct | Float | Soil moisture (0-7cm) | - |
| soil_moist_deep_pct | Float | Soil moisture (7-28cm) | - |
| solar_wm2 | Float | Shortwave radiation | - |
| evap_mm | Float | Evapotranspiration (FAO) | - |
| vpd_kpa | Float | Vapour pressure deficit | - |

---

# Dataset 2 : Interim (Cleaned) Weather Data

**File**
`02_Datasets/Interim/weather/weather_cleaned_dataset.csv`

This dataset contains the raw variables with missing values imputed, physical constraints applied, and temporal features added.

| Feature | Data Type | Description | Expected Range / Limits |
| :--- | :--- | :--- | :--- |
| humidity_pct | Integer | Relative humidity at 2m | 0 to 100 (Clipped) |
| precip_mm | Float32 | Hourly precipitation | ≥ 0 (Clipped) |
| wind_kmh | Float32 | Wind speed at 10m | ≥ 0 (Clipped) |
| cloud_pct | Integer | Total cloud cover percentage | 0 to 100 (Clipped) |
| temp_c_is_outlier | Boolean | Flag indicating temperature outliers based on IQR | True / False |
| temp_c_smoothed | Float32 | Exponentially Weighted Moving Average (EWMA) of temperature | - |
| hour | Integer | Hour of the day | 0 to 23 |
| month | Integer | Month of the year | 1 to 12 |
| day_of_year | Integer | Day of the year | 1 to 365 |
| season | String | Indian season based on month | Winter, Summer, Monsoon, Post-Monsoon |

---

# Dataset 3 : Processed (ML-Ready) Weather Data

The processed data is split into two progressive stages to allow flexibility in model training: base preprocessing and final meteorological augmentation.

### 3.1 Preprocessed Base Data
**File**
`02_Datasets/Processed/weather/india_weather_preprocessed_ready.csv`

This file includes basic ML scaling, temporal encoding, lag features, and rolling statistics. All numeric columns are scaled using `RobustScaler`.

| Feature | Data Type | Description |
| :--- | :--- | :--- |
| hour_sin / hour_cos | Float | Cyclical encoding of the hour |
| month_sin / month_cos | Float | Cyclical encoding of the month |
| [feature]_lag_1h | Float | 1-hour historical lag for temp, humidity, precip, and pressure |
| [feature]_lag_3h | Float | 3-hour historical lag for temp, humidity, precip, and pressure |
| [feature]_lag_24h | Float | 24-hour historical lag for temp, humidity, precip, and pressure |
| [feature]_roll_mean_6h | Float | 6-hour rolling mean for temp and humidity |
| [feature]_roll_std_6h | Float | 6-hour rolling standard deviation for temp and humidity |

### 3.2 Final Augmented Processed Data
**File**
`02_Datasets/Processed/weather/weather_processed_dataset.csv`

This is the final, comprehensive dataset. It inherits all scaled and encoded features from `india_weather_preprocessed_ready.csv` and introduces advanced physical and extreme-event features (also appropriately scaled).

| Feature | Data Type | Description |
| :--- | :--- | :--- |
| wind_u | Float | U-component (East-West vector) of wind, decomposed from speed and direction |
| wind_v | Float | V-component (North-South vector) of wind, decomposed from speed and direction |
| dew_point_depression | Float | Difference between air temperature and dew point (saturation proxy) |
| is_extreme_heat | Integer (Binary) | Flag identifying extreme heat events (temperatures > 40°C) |
| is_heavy_precip | Integer (Binary) | Flag identifying heavy rainfall events (precipitation > 10mm/hr) |
| temp_delta_1h | Float | Hour-over-hour change in temperature |

---

# Deliverables Structure

```text
02_Datasets/
│
├── Raw/
│   └── weather/
│       └── weather_raw_dataset.csv
│
├── Interim/
│   └── weather/
│       └── weather_cleaned_dataset.csv
│
└── Processed/
    └── weather/
        ├── india_weather_preprocessed_ready.csv
        └── weather_processed_dataset.csv