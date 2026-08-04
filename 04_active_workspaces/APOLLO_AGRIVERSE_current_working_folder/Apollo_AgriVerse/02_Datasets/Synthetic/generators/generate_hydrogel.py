"""
Apollo AgriVerse
Synthetic Hydrogel Generator

Output:
02_Datasets/Synthetic/Raw/hydrogel.csv
"""

import random
import pandas as pd
from pathlib import Path

random.seed(42)

base = Path(__file__).parent.parent

farm_df = pd.read_csv(base / "Raw" / "farm_metadata.csv")
farm_ids = farm_df["farm_id"].tolist()

rows = []

start = pd.Timestamp("2026-01-01 00:00:00")

for i in range(10000):

    capacity = round(random.uniform(0,100),2)

    release = round(random.uniform(0.2,5),2)

    storage = round(random.uniform(capacity,100),2)

    rows.append({

        "timestamp": start + pd.Timedelta(minutes=5*i),

        "farm_id": random.choice(farm_ids),

        "water_storage": storage,

        "release_rate": release,

        "remaining_capacity": capacity,

        "status": random.choice(["Healthy","Low","Critical"])

    })

df = pd.DataFrame(rows)

output = base / "Raw" / "hydrogel.csv"

df.to_csv(output,index=False)

print(df.head())

print(f"\nGenerated {len(df)} records.")