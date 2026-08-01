# Apollo AgriVerse
# Synthetic Data Dictionary

**Version:** 1.0
**Last Updated:** August 2026

---

# Purpose

This document describes all synthetic datasets generated for Apollo AgriVerse.

It serves as the reference for:
- Data Generation
- Data Validation
- Data Integration
- Machine Learning
- Digital Twin Development

---

# Dataset 1 : Farm Metadata

**File**
Raw/farm_metadata.csv

| Feature | Data Type | Description | Expected Range / Values |
|----------|-----------|-------------|-------------------------|
| farm_id | String | Unique Farm ID | F0001 ... F1000 |
| field_id | String | Unique Field ID | FD0001 ... |
| latitude | Float | Farm Latitude | 15.5 – 21.5 |
| longitude | Float | Farm Longitude | 72.5 – 80.5 |
| area_acres | Float | Farm Area | 0.5 – 15 Acres |
| soil_type | Category | Soil Classification | Clay, Sandy, Loamy, Silty, Black, Red |
| crop_type | Category | Crop Grown | Cotton, Wheat, Rice, Maize, Sugarcane, Soybean |
| installation_date | Date | Digital Twin Installation Date | YYYY-MM-DD |

---

# Dataset 2 : Sensor Stream

**File**
Raw/sensor_stream.csv

| Feature | Data Type | Description | Expected Range |
|----------|-----------|-------------|----------------|
| timestamp | DateTime | Sensor Timestamp | Every 5 minutes |
| farm_id | String | Farm Reference | Matches farm_metadata |
| temperature | Float | Air Temperature | 18–42 °C |
| humidity | Float | Relative Humidity | 30–95 % |
| soil_moisture | Float | Soil Moisture | 15–90 % |
| soil_temperature | Float | Soil Temperature | 15–38 °C |
| light_intensity | Integer | Sunlight | 1,000–100,000 lux |
| battery_level | Float | Sensor Battery | 20–100 % |

---

# Dataset 3 : Hydrogel

**File**
Raw/hydrogel.csv

| Feature | Data Type | Description | Expected Range |
|----------|-----------|-------------|----------------|
| timestamp | DateTime | Reading Time | Every 5 minutes |
| farm_id | String | Farm Reference | Matches farm_metadata |
| water_storage | Float | Stored Water (%) | 0–100 |
| release_rate | Float | Water Release Rate | 0.2–5 L/hr |
| remaining_capacity | Float | Remaining Storage (%) | 0–100 |
| status | Category | Hydrogel Status | Healthy, Low, Critical |

---

# Dataset 4 : Mulching

**File**
Raw/mulching.csv

| Feature | Data Type | Description | Expected Range |
|----------|-----------|-------------|----------------|
| timestamp | DateTime | Reading Time | Every 5 minutes |
| farm_id | String | Farm Reference | Matches farm_metadata |
| mulch_type | Category | Mulch Material | Plastic, Organic, Biodegradable |
| degradation_percent | Float | Material Degradation | 0–100 % |
| evaporation_reduction | Float | Water Loss Reduction | 10–70 % |
| temperature_reduction | Float | Soil Temperature Reduction | 1–8 °C |
| status | Category | Mulch Condition | Healthy, Needs Replacement, Damaged |

---

# Relationships

- Every `farm_id` must exist in `farm_metadata.csv`.
- Every timestamped dataset references a valid farm.
- All datasets use consistent units.
- No duplicate records.
- No missing values after cleaning.

---

# Final Synthetic Deliverables

```
Synthetic/
│
├── Raw/
│   ├── farm_metadata.csv
│   ├── sensor_stream.csv
│   ├── hydrogel.csv
│   └── mulching.csv
│
├── Cleaned/
│   ├── farm_metadata_clean.csv
│   ├── sensor_stream_clean.csv
│   ├── hydrogel_clean.csv
│   └── mulching_clean.csv
│
├── generators/
├── notebooks/
└── SYNTHETIC_DATA_DICTIONARY.md
```

---

# Notes

- Raw datasets are never modified.
- Cleaning is performed only on copies.
- All synthetic datasets will later be merged with cleaned real datasets to create `Apollo_Master_Dataset.csv`.
- This document must be updated whenever a feature is added, removed, or modified.