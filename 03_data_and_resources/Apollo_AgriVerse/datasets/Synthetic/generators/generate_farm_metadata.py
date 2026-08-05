"""
Apollo AgriVerse
Synthetic Dataset Generator

Dataset: Farm Metadata
Output: ../Raw/farm_metadata.csv
"""

import random
import pandas as pd
from pathlib import Path

random.seed(42)

N = 1000

soil_types = [
    "Clay",
    "Sandy",
    "Loamy",
    "Silty",
    "Black",
    "Red"
]

crop_types = [
    "Cotton",
    "Wheat",
    "Rice",
    "Maize",
    "Sugarcane",
    "Soybean"
]

rows = []

for i in range(1, N + 1):

    rows.append({
        "farm_id": f"F{i:04}",
        "field_id": f"FD{i:04}",
        "latitude": round(random.uniform(15.5, 21.5), 6),
        "longitude": round(random.uniform(72.5, 80.5), 6),
        "area_acres": round(random.uniform(0.5, 15), 2),
        "soil_type": random.choice(soil_types),
        "crop_type": random.choice(crop_types),
        "installation_date": pd.Timestamp("2026-01-01") + pd.to_timedelta(random.randint(0, 180), unit="D")
    })

df = pd.DataFrame(rows)

output = Path(__file__).parent.parent / "Raw" / "farm_metadata.csv"
output.parent.mkdir(parents=True, exist_ok=True)

df.to_csv(output, index=False)

print(f"Saved {len(df)} rows to {output}")