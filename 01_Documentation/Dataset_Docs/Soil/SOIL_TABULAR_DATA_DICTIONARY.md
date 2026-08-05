# Apollo AgriVerse
# Soil Tabular Data Dictionary

**Version:** 1.0  
**Last Updated:** August 2026  

---

# Purpose

This document describes the synthetic and cleaned tabular soil datasets generated for Apollo AgriVerse.

It serves as the reference for:
- Data Generation
- Data Validation
- Data Integration
- Machine Learning
- Digital Twin Development

---

# Dataset : Cleaned Soil Tabular Dataset

**File**  
`02_Datasets/Processed/Soil/cleaned_soil_dataset.csv`

| Feature | Data Type | Description | Expected Range / Values |
| :--- | :--- | :--- | :--- |
| timestamp | DateTime | Reading/Simulation Timestamp | YYYY-MM-DD HH:MM:SS |
| Region_State | Category | Indian State / Region | Uttar Pradesh, Gujarat, Karnataka, Punjab, Tamil Nadu |
| Soil_Type | Category | Indian Soil Classification | Alluvial, Arid, Black, Laterite, Red, Yellow, Mountain |
| Soil_PH | Float | Soil pH Level | 4.0 – 9.0 |
| Nitrogen__Phosphorus_Potassium | Float Group | Macro Soil Nutrients (N, P, K) | Varies based on type |
| Soil_Moisture | Float | Current Soil Moisture Percentage | 10 – 90 % |
| Soil_Temp | Float | Soil Temperature | 15 – 45 °C |
| Dryness_Status | Category | Evaluated Moisture Condition | Normal, Moderate, Critical_Dry |
| Hydrogel_Water_Release_Trigger | Integer / Category | Automated Trigger Flag for Smart Hydrogel Activation | 0 (Inactive) / 1 (Triggered) |

---

# Relationships

- Every record maps to regional Indian soil parameters and weather-dependent thresholds.
- All datasets use consistent standard units.
- No duplicate records.
- Zero missing values post-cleaning.

---

# Deliverables Structure

```
Apollo_AgriVerse/
│
├── 02_Datasets/
│   ├── Raw/
│   │   └── Soil/
│   └── Processed/
│       └── Soil/
│           └── cleaned_soil_dataset.csv
│
├── 06_ML/
│   └── notebooks/
│       ├── soil_data_creation.ipynb
│       ├── soil_cleaning_preprocessing.ipynb
│       └── soil_testing_evaluation.ipynb
│
└── SOIL_TABULAR_DATA_DICTIONARY.md
```

---

# Notes

- Raw datasets are preserved without direct modifications.
- Cleaning and feature scaling are executed on isolated copies.
- This tabular dataset feeds directly into our training, validation, and testing model pipeline.
