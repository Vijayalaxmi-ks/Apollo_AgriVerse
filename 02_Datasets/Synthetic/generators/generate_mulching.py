import pandas as pd
import numpy as np
import os

np.random.seed(42)

raw_farm_path = "../raw/farm_metadata.csv"
farm_meta = pd.read_csv(raw_farm_path)
farm_ids = farm_meta['farm_id'].tolist()

ROWS = 10000
selected_farms = np.random.choice(farm_ids, size=ROWS)
timestamps = pd.date_range(start='2026-01-01 00:00:00', periods=ROWS, freq='5min')

mulch_types = np.random.choice(['Plastic', 'Organic', 'Biodegradable'], size=ROWS, p=[0.5, 0.3, 0.2])
degradation = np.random.uniform(0.0, 100.0, ROWS)
status = np.where(degradation < 40, 'Healthy', np.where(degradation < 75, 'Needs Replacement', 'Damaged'))

df_raw = pd.DataFrame({
    'timestamp': timestamps.strftime('%Y-%m-%d %H:%M:%S'),
    'farm_id': selected_farms,
    'mulch_type': mulch_types,
    'degradation_percent': np.round(degradation, 2),
    'evaporation_reduction': np.round(np.random.uniform(15.0, 65.0, ROWS), 2),
    'temperature_reduction': np.round(np.random.uniform(1.0, 7.5, ROWS), 2),
    'status': status
})

raw_path = "../raw/mulching.csv"
clean_path = "../cleaned/mulching_clean.csv"

df_raw.to_csv(raw_path, index=False)
df_raw.to_csv(clean_path, index=False)

print(f"[5/5] Mulching Stream generated: {ROWS} mulch film rows.")


