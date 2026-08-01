"""
Apollo AgriVerse
Synthetic Mulching Dataset Generator

Output:
02_Datasets/Synthetic/Raw/mulching.csv
"""

import random
import pandas as pd
from pathlib import Path

random.seed(42)

base = Path(__file__).parent.parent

farm_df = pd.read_csv(base / "Raw" / "farm_metadata.csv")
farm_ids = farm_df["farm_id"].tolist()

mulch_types = [
    "Plastic",
    "Organic",
    "Biodegradable"
]

rows = []

start = pd.Timestamp("2026-01-01 00:00:00")

for i in range(10000):

    degradation = round(random.uniform(0,100),2)

    evaporation = round(random.uniform(10,70),2)

    temp_reduction = round(random.uniform(1,8),2)

    rows.append({

        "timestamp": start + pd.Timedelta(minutes=5*i),

        "farm_id": random.choice(farm_ids),

        "mulch_type": random.choice(mulch_types),

        "degradation_percent": degradation,

        "evaporation_reduction": evaporation,

        "temperature_reduction": temp_reduction,

        "status": random.choice([
            "Healthy",
            "Needs Replacement",
            "Damaged"
        ])

    })

df = pd.DataFrame(rows)

output = base / "Raw" / "mulching.csv"

df.to_csv(output, index=False)

print(df.head())

print(f"\nGenerated {len(df)} records.")