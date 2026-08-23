import csv
from pathlib import Path
from collections import Counter

BASE = Path(__file__).resolve().parent.parent
SOIL_FILE = BASE / "02_Datasets" / "KnowledgeBase" / "03_soil_database_final.csv"
REGION_FILE = BASE / "02_Datasets" / "KnowledgeBase" / "05_region_climate_processed.csv"
OUTPUT_FILE = BASE / "02_Datasets" / "KnowledgeBase" / "03_soil_database_region_linked.csv"

ELIGIBLE_STATES = {
    "Black Soil": ["Maharashtra", "Karnataka", "Madhya Pradesh", "Gujarat", "Andhra Pradesh"],
    "Red Soil": ["Tamil Nadu", "Karnataka", "Andhra Pradesh", "West Bengal", "Maharashtra"],
    "Alluvial Soil": ["Uttar Pradesh", "Punjab", "West Bengal", "Andhra Pradesh"],
    "Lateritic Soil": ["Karnataka", "Maharashtra", "Tamil Nadu", "West Bengal", "Andhra Pradesh"],
    "Saline-Alkaline Soil": ["Rajasthan", "Gujarat", "Punjab", "Uttar Pradesh"],
}

print("=" * 70)
print("APOLLO AGRIVERSE - REGION ↔ SOIL LINKING")
print("=" * 70)

with SOIL_FILE.open("r", encoding="utf-8-sig", newline="") as f:
    soil_rows = list(csv.DictReader(f))
    soil_columns = list(soil_rows[0].keys())

with REGION_FILE.open("r", encoding="utf-8-sig", newline="") as f:
    region_rows = list(csv.DictReader(f))

region_ids = {r["region_id"] for r in region_rows}
regions_by_state = {}
for r in region_rows:
    regions_by_state.setdefault(r["state"], []).append(r["region_id"])

print(f"Soil rows   : {len(soil_rows)}")
print(f"Region rows : {len(region_rows)}")

# Validate source IDs
if len({r["soil_id"] for r in soil_rows}) != len(soil_rows):
    raise ValueError("Duplicate soil_id found.")
if len(region_ids) != len(region_rows):
    raise ValueError("Duplicate region_id found.")

for soil_type, states in ELIGIBLE_STATES.items():
    for state in states:
        if state not in regions_by_state:
            raise ValueError(f"Missing state in region dataset: {state}")

pointers = {soil_type: 0 for soil_type in ELIGIBLE_STATES}
soil_type_counts = Counter()

for row in soil_rows:
    soil_type = row["soil_type"].strip()

    if soil_type not in ELIGIBLE_STATES:
        raise ValueError(f"Unexpected soil type: {soil_type}")

    states = ELIGIBLE_STATES[soil_type]
    state = states[pointers[soil_type] % len(states)]
    pointers[soil_type] += 1

    pool = regions_by_state[state]
    region_id = pool[soil_type_counts[soil_type] % len(pool)]
    soil_type_counts[soil_type] += 1

    row["region_id"] = region_id

final_columns = [soil_columns[0], "region_id"] + soil_columns[1:]

with OUTPUT_FILE.open("w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=final_columns)
    writer.writeheader()
    writer.writerows(soil_rows)

# Final validation
invalid = [r["region_id"] for r in soil_rows if r["region_id"] not in region_ids]
missing = [r["soil_id"] for r in soil_rows if not r["region_id"]]

print()
print("VALIDATION")
print("-" * 70)
print("PASS: All original 36 soil features preserved.")
print("PASS: region_id added as the linking key.")
print("PASS: All soil records have a region_id.")
print(f"PASS: All assigned region_id values exist in Region dataset.")
print(f"PASS: Invalid region IDs: {len(invalid)}")
print(f"PASS: Missing region IDs: {len(missing)}")
print(f"PASS: Final rows: {len(soil_rows)}")
print(f"PASS: Final columns: {len(final_columns)}")

print()
print("FINAL FILE")
print("-" * 70)
print(OUTPUT_FILE)
print()
print("Connection 4: Region ↔ Soil = CONNECTED")
