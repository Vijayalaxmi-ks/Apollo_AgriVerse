"""
Apollo AgriVerse
Synthetic Sensor Stream Generator

Output:
02_Datasets/Synthetic/Raw/sensor_stream.csv
"""

import random
import pandas as pd
from pathlib import Path

random.seed(42)

# Read farm ids
base = Path(__file__).parent.parent
farm_df = pd.read_csv(base / "Raw" / "farm_metadata.csv")
farm_ids = farm_df["farm_id"].tolist()

rows = []

start = pd.Timestamp("2026-01-01 00:00:00")

for i in range(10000):

    rows.append({

        "timestamp": start + pd.Timedelta(minutes=5*i),

        "farm_id": random.choice(farm_ids),

        "temperature": round(random.uniform(18,42),2),

        "humidity": round(random.uniform(30,95),2),

        "soil_moisture": round(random.uniform(15,90),2),

        "soil_temperature": round(random.uniform(15,38),2),

        "light_intensity": random.randint(1000,100000),

        "battery_level": round(random.uniform(20,100),2)

    })

df = pd.DataFrame(rows)

output = base / "Raw" / "sensor_stream.csv"

df.to_csv(output,index=False)

print(df.head())

print(f"\nGenerated {len(df)} records.")