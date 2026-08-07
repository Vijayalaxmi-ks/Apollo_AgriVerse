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

df_raw = pd.DataFrame({
    'timestamp': timestamps.strftime('%Y-%m-%d %H:%M:%S'),
    'farm_id': selected_farms,
    'temperature': np.round(np.random.uniform(18.0, 38.0, ROWS), 2),
    'humidity': np.round(np.random.uniform(35.0, 90.0, ROWS), 2),
    'soil_moisture': np.round(np.random.uniform(15.0, 85.0, ROWS), 2),
    'soil_temperature': np.round(np.random.uniform(15.0, 35.0, ROWS), 2),
    'light_intensity': np.random.randint(1000, 85000, size=ROWS),
    'battery_level': np.round(np.random.uniform(40.0, 100.0, ROWS), 2)
})

raw_path = "../raw/sensor_stream.csv"
clean_path = "../cleaned/sensor_stream_clean.csv"

df_raw.to_csv(raw_path, index=False)
df_raw.to_csv(clean_path, index=False)

print(f"[3/5] Sensor Stream generated: {ROWS} telemetry rows.")