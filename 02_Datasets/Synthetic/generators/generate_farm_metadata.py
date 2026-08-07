import pandas as pd
import numpy as np
import os

np.random.seed(42)
NUM_FARMS = 1000

# Major grape belts in Maharashtra (Nashik/Sangli region)
latitudes = np.random.uniform(19.5, 20.5, NUM_FARMS)
longitudes = np.random.uniform(73.5, 74.5, NUM_FARMS)
soil_types = np.random.choice(['Loamy', 'Sandy Loam', 'Black', 'Red', 'Clay Loam'], size=NUM_FARMS, p=[0.4, 0.25, 0.2, 0.1, 0.05])

df_raw = pd.DataFrame({
    'farm_id': [f'F{i+1:04d}' for i in range(NUM_FARMS)],
    'field_id': [f'FD{i+1:04d}' for i in range(NUM_FARMS)],
    'latitude': np.round(latitudes, 6),
    'longitude': np.round(longitudes, 6),
    'area_acres': np.round(np.random.uniform(1.0, 12.0, NUM_FARMS), 2),
    'soil_type': soil_types,
    'crop_type': 'Grapes',
    'installation_date': pd.date_range(start='2026-01-01', periods=NUM_FARMS, freq='h').strftime('%Y-%m-%d')
})

# Paths based on workspace layout
raw_path = "../raw/farm_metadata.csv"
clean_path = "../cleaned/farm_metadata_clean.csv"

os.makedirs(os.path.dirname(raw_path), exist_ok=True)
os.makedirs(os.path.dirname(clean_path), exist_ok=True)

df_raw.to_csv(raw_path, index=False)
df_raw.to_csv(clean_path, index=False)

print(f"[1/5] Farm Metadata generated: {NUM_FARMS} grape farm profiles.")