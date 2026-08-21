from pathlib import Path
import numpy as np
import pandas as pd

# Root project folder (Apollo_AgriVerse)
BASE_DIR = Path(__file__).resolve().parent.parent

# Input file path based on your VS Code tree
INPUT_PATH = BASE_DIR / "02_Datasets" / "KnowledgeBase" / "05_region_climate_db.csv"

# Output folder (saving processed output in 02_Datasets/Processed/)
OUTPUT_DIR = BASE_DIR / "02_Datasets" / "KnowledgeBase"
OUTPUT_PATH = OUTPUT_DIR / "05_region_climate_processed.csv"

# Ensure output directory exists
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# 1. Load Data
df = pd.read_csv(INPUT_PATH)

# 2. Validation Checks
assert len(df) > 0, "Dataset is empty!"
assert df["region_id"].duplicated().sum() == 0, "Duplicate region_ids found!"
assert (
    df["minimum_temperature_c"] <= df["maximum_temperature_c"]
).all(), "Min temp exceeds max temp!"

# 3. Data Cleaning & Preprocessing
df["frost_risk"] = df["frost_risk"].astype(int)
df["heat_stress_risk"] = df["heat_stress_risk"].astype(int)

categorical_cols = ["state", "district", "sub_zone_code", "climate_zone"]
for col in categorical_cols:
  df[col] = df[col].str.strip()

# One-hot encode climate zones
climate_encoded = pd.get_dummies(
    df["climate_zone"], prefix="climate", dtype=int
)
df_processed = pd.concat([df, climate_encoded], axis=1)

# 4. Feature Engineering
df_processed["temp_range_c"] = (
    df_processed["maximum_temperature_c"]
    - df_processed["minimum_temperature_c"]
)
df_processed["monsoon_ratio"] = (
    df_processed["monsoon_rainfall_mm"] / df_processed["annual_rainfall_mm"]
).round(3)
df_processed["is_extreme_climate"] = (
    (df_processed["frost_risk"] == 1) | (df_processed["heat_stress_risk"] == 1)
).astype(int)

# 5. Export Processed Dataset
df_processed.to_csv(OUTPUT_PATH, index=False)
print(f"Successfully processed dataset saved to: {OUTPUT_PATH}")