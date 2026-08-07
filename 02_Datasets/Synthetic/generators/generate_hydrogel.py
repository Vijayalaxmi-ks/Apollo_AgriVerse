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

water_storage = np.random.uniform(10.0, 100.0, ROWS)
status = np.where(water_storage > 50, 'Healthy', np.where(water_storage > 20, 'Low', 'Critical'))

df_raw = pd.DataFrame({
    'timestamp': timestamps.strftime('%Y-%m-%d %H:%M:%S'),
    'farm_id': selected_farms,
    'water_storage': np.round(water_storage, 2),
    'release_rate': np.round(np.random.uniform(0.2, 4.5, ROWS), 2),
    'remaining_capacity': np.round(100.0 - water_storage, 2),
    'status': status
})

raw_path = "../raw/hydrogel.csv"
clean_path = "../cleaned/hydrogel_clean.csv"

df_raw.to_csv(raw_path, index=False)
df_raw.to_csv(clean_path, index=False)

print(f"[4/5] Hydrogel Stream generated: {ROWS} smart polymer rows.")