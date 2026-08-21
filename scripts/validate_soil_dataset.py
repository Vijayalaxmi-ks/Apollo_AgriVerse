import csv
import os
from collections import Counter

# ============================================================
# APOLLO AGRIVERSE
# Soil Dataset Validation Script
# Dataset: 03_soil_database.csv
# ============================================================

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DATASET_FILE = os.path.join(
    BASE_DIR,
    "02_Datasets",
    "KnowledgeBase",
    "03_soil_database.csv"
)

# ------------------------------------------------------------
# Expected 36 features
# ------------------------------------------------------------

EXPECTED_COLUMNS = [
    "soil_id",
    "soil_type",
    "soil_texture",
    "soil_depth_cm",
    "bulk_density_g_cm3",

    "sand_pct",
    "silt_pct",
    "clay_pct",
    "porosity_pct",
    "water_holding_capacity_pct",
    "field_capacity_pct",
    "wilting_point_pct",
    "infiltration_rate_mm_hr",
    "permeability_class",

    "ph",
    "electrical_conductivity_ds_m",
    "organic_matter_pct",
    "organic_carbon_pct",
    "cation_exchange_capacity_cmol_kg",
    "calcium_mg_kg",
    "magnesium_mg_kg",
    "sodium_mg_kg",

    "nitrogen_mg_kg",
    "phosphorus_mg_kg",
    "potassium_mg_kg",
    "sulfur_mg_kg",

    "iron_mg_kg",
    "zinc_mg_kg",
    "copper_mg_kg",
    "manganese_mg_kg",
    "boron_mg_kg",

    "soil_moisture_pct",
    "soil_temperature_c",
    "microbial_activity_score",
    "drainage_class",
    "soil_health_score"
]

# ------------------------------------------------------------
# Numeric columns
# ------------------------------------------------------------

NUMERIC_COLUMNS = [
    "soil_depth_cm",
    "bulk_density_g_cm3",
    "sand_pct",
    "silt_pct",
    "clay_pct",
    "porosity_pct",
    "water_holding_capacity_pct",
    "field_capacity_pct",
    "wilting_point_pct",
    "infiltration_rate_mm_hr",
    "ph",
    "electrical_conductivity_ds_m",
    "organic_matter_pct",
    "organic_carbon_pct",
    "cation_exchange_capacity_cmol_kg",
    "calcium_mg_kg",
    "magnesium_mg_kg",
    "sodium_mg_kg",
    "nitrogen_mg_kg",
    "phosphorus_mg_kg",
    "potassium_mg_kg",
    "sulfur_mg_kg",
    "iron_mg_kg",
    "zinc_mg_kg",
    "copper_mg_kg",
    "manganese_mg_kg",
    "boron_mg_kg",
    "soil_moisture_pct",
    "soil_temperature_c",
    "microbial_activity_score",
    "soil_health_score"
]

# ------------------------------------------------------------
# Allowed categorical values
# ------------------------------------------------------------

EXPECTED_PERMEABILITY = {
    "Very Slow",
    "Slow",
    "Moderate",
    "Rapid",
    "Very Rapid"
}

EXPECTED_DRAINAGE = {
    "Very Poor",
    "Poor",
    "Moderate",
    "Well-drained",
    "Excessive"
}

# ------------------------------------------------------------
# Load dataset
# ------------------------------------------------------------

print("=" * 70)
print("APOLLO AGRIVERSE - SOIL DATASET VALIDATION")
print("=" * 70)

print("\nDataset:")
print(DATASET_FILE)

if not os.path.exists(DATASET_FILE):
    print("\nERROR: Dataset file not found.")
    print("Check the KnowledgeBase folder and filename.")
    raise SystemExit(1)

with open(DATASET_FILE, "r", encoding="utf-8-sig", newline="") as file:
    reader = csv.DictReader(file)

    columns = reader.fieldnames
    rows = list(reader)

# ------------------------------------------------------------
# 1. Basic information
# ------------------------------------------------------------

print("\n1. BASIC DATASET INFORMATION")
print("-" * 70)

print(f"Number of rows    : {len(rows)}")
print(f"Number of columns : {len(columns)}")

# ------------------------------------------------------------
# 2. Check exactly 36 columns
# ------------------------------------------------------------

print("\n2. FEATURE CHECK")
print("-" * 70)

if len(columns) == 36:
    print("PASS: Dataset contains exactly 36 columns.")
else:
    print(f"FAIL: Dataset contains {len(columns)} columns instead of 36.")

# ------------------------------------------------------------
# 3. Check missing columns
# ------------------------------------------------------------

missing_columns = [
    column for column in EXPECTED_COLUMNS
    if column not in columns
]

extra_columns = [
    column for column in columns
    if column not in EXPECTED_COLUMNS
]

if not missing_columns:
    print("PASS: No required columns are missing.")
else:
    print("FAIL: Missing columns:")
    for column in missing_columns:
        print("   -", column)

if not extra_columns:
    print("PASS: No unexpected columns found.")
else:
    print("WARNING: Extra columns:")
    for column in extra_columns:
        print("   -", column)

# ------------------------------------------------------------
# 4. Check column order
# ------------------------------------------------------------

print("\n3. COLUMN ORDER CHECK")
print("-" * 70)

if columns == EXPECTED_COLUMNS:
    print("PASS: All 36 columns are in the correct order.")
else:
    print("WARNING: Column order is different.")

# ------------------------------------------------------------
# 5. Missing values
# ------------------------------------------------------------

print("\n4. MISSING VALUE CHECK")
print("-" * 70)

missing_counts = {}

for column in columns:
    count = 0

    for row in rows:
        value = row.get(column, "").strip()

        if value == "":
            count += 1

    if count > 0:
        missing_counts[column] = count

if not missing_counts:
    print("PASS: No missing values found.")
else:
    print("WARNING: Missing values found:")

    for column, count in missing_counts.items():
        print(f"   {column}: {count}")

# ------------------------------------------------------------
# 6. Duplicate soil IDs
# ------------------------------------------------------------

print("\n5. DUPLICATE soil_id CHECK")
print("-" * 70)

soil_ids = [
    row["soil_id"].strip()
    for row in rows
    if row.get("soil_id")
]

id_counts = Counter(soil_ids)

duplicates = {
    soil_id: count
    for soil_id, count in id_counts.items()
    if count > 1
}

if not duplicates:
    print("PASS: No duplicate soil_id values.")
else:
    print("WARNING: Duplicate soil_id values found:")

    for soil_id, count in list(duplicates.items())[:10]:
        print(f"   {soil_id}: {count} occurrences")

# ------------------------------------------------------------
# 7. Numeric value validation
# ------------------------------------------------------------

print("\n6. NUMERIC VALUE CHECK")
print("-" * 70)

conversion_errors = []

for row_number, row in enumerate(rows, start=2):

    for column in NUMERIC_COLUMNS:

        value = row.get(column, "").strip()

        if value == "":
            continue

        try:
            float(value)
        except ValueError:
            conversion_errors.append(
                (row_number, column, value)
            )

if not conversion_errors:
    print("PASS: All numeric columns contain valid numbers.")
else:
    print("FAIL: Invalid numeric values found:")

    for item in conversion_errors[:20]:
        print(
            f"   Row {item[0]} | {item[1]} | value={item[2]}"
        )

# ------------------------------------------------------------
# 8. Percentage checks
# ------------------------------------------------------------

print("\n7. PERCENTAGE RANGE CHECK")
print("-" * 70)

percentage_columns = [
    "sand_pct",
    "silt_pct",
    "clay_pct",
    "porosity_pct",
    "water_holding_capacity_pct",
    "field_capacity_pct",
    "wilting_point_pct",
    "organic_matter_pct",
    "organic_carbon_pct",
    "soil_moisture_pct"
]

percentage_errors = []

for row_number, row in enumerate(rows, start=2):

    for column in percentage_columns:

        try:
            value = float(row[column])

            if value < 0 or value > 100:
                percentage_errors.append(
                    (row_number, column, value)
                )

        except:
            pass

if not percentage_errors:
    print("PASS: Percentage values are between 0 and 100.")
else:
    print("FAIL: Invalid percentage values found:")

    for item in percentage_errors[:20]:
        print(
            f"   Row {item[0]} | {item[1]} | value={item[2]}"
        )

# ------------------------------------------------------------
# 9. Soil texture consistency
# ------------------------------------------------------------

print("\n8. SOIL TEXTURE CHECK")
print("-" * 70)

texture_errors = []

for row_number, row in enumerate(rows, start=2):

    try:
        sand = float(row["sand_pct"])
        silt = float(row["silt_pct"])
        clay = float(row["clay_pct"])

        total = sand + silt + clay

        if abs(total - 100) > 1.5:
            texture_errors.append(
                (row_number, sand, silt, clay, total)
            )

    except:
        pass

if not texture_errors:
    print("PASS: Sand + Silt + Clay percentages are consistent.")
else:
    print(
        f"WARNING: {len(texture_errors)} rows have texture "
        "percentages that do not total approximately 100%."
    )

    for item in texture_errors[:10]:
        print(
            f"   Row {item[0]}: "
            f"sand={item[1]}, "
            f"silt={item[2]}, "
            f"clay={item[3]}, "
            f"total={item[4]:.2f}"
        )

# ------------------------------------------------------------
# 10. pH validation
# ------------------------------------------------------------

print("\n9. pH CHECK")
print("-" * 70)

ph_errors = []

for row_number, row in enumerate(rows, start=2):

    try:
        ph = float(row["ph"])

        if ph < 3 or ph > 11:
            ph_errors.append(
                (row_number, ph)
            )

    except:
        pass

if not ph_errors:
    print("PASS: pH values are within a reasonable soil range.")
else:
    print(f"WARNING: {len(ph_errors)} unusual pH values found.")

# ------------------------------------------------------------
# 11. EC validation
# ------------------------------------------------------------

print("\n10. EC CHECK")
print("-" * 70)

ec_errors = []

for row_number, row in enumerate(rows, start=2):

    try:
        ec = float(row["electrical_conductivity_ds_m"])

        if ec < 0:
            ec_errors.append(
                (row_number, ec)
            )

    except:
        pass

if not ec_errors:
    print("PASS: EC values are non-negative.")
else:
    print("FAIL: Negative EC values found.")

# ------------------------------------------------------------
# 12. Permeability check
# ------------------------------------------------------------

print("\n11. PERMEABILITY CHECK")
print("-" * 70)

permeability_values = set(
    row["permeability_class"].strip()
    for row in rows
    if row.get("permeability_class")
)

print("Values found:")

for value in sorted(permeability_values):
    print("   -", value)

unknown_permeability = (
    permeability_values - EXPECTED_PERMEABILITY
)

if not unknown_permeability:
    print("PASS: Permeability categories are valid.")
else:
    print("WARNING: Unexpected permeability values:")
    for value in unknown_permeability:
        print("   -", value)

# ------------------------------------------------------------
# 13. Drainage check
# ------------------------------------------------------------

print("\n12. DRAINAGE CHECK")
print("-" * 70)

drainage_values = set(
    row["drainage_class"].strip()
    for row in rows
    if row.get("drainage_class")
)

print("Values found:")

for value in sorted(drainage_values):
    print("   -", value)

unknown_drainage = (
    drainage_values - EXPECTED_DRAINAGE
)

if not unknown_drainage:
    print("PASS: Drainage categories are valid.")
else:
    print("WARNING: Unexpected drainage values:")
    for value in unknown_drainage:
        print("   -", value)

# ------------------------------------------------------------
# 14. Logical water relationship
# ------------------------------------------------------------

print("\n13. WATER RELATIONSHIP CHECK")
print("-" * 70)

water_errors = []

for row_number, row in enumerate(rows, start=2):

    try:
        field_capacity = float(row["field_capacity_pct"])
        wilting_point = float(row["wilting_point_pct"])

        if field_capacity < wilting_point:
            water_errors.append(
                (row_number, field_capacity, wilting_point)
            )

    except:
        pass

if not water_errors:
    print("PASS: Field capacity >= wilting point.")
else:
    print(
        f"FAIL: {len(water_errors)} rows have "
        "field capacity below wilting point."
    )

# ------------------------------------------------------------
# 15. Soil health score
# ------------------------------------------------------------

print("\n14. SOIL HEALTH SCORE CHECK")
print("-" * 70)

health_errors = []

for row_number, row in enumerate(rows, start=2):

    try:
        score = float(row["soil_health_score"])

        if score < 0 or score > 100:
            health_errors.append(
                (row_number, score)
            )

    except:
        pass

if not health_errors:
    print("PASS: Soil health scores are between 0 and 100.")
else:
    print("FAIL: Invalid soil health scores found.")

# ------------------------------------------------------------
# FINAL SUMMARY
# ------------------------------------------------------------

print("\n" + "=" * 70)
print("FINAL VALIDATION SUMMARY")
print("=" * 70)

print(f"Rows checked        : {len(rows)}")
print(f"Columns checked     : {len(columns)}")
print(f"Expected columns    : 36")
print(f"Missing columns     : {len(missing_columns)}")
print(f"Missing-value cols  : {len(missing_counts)}")
print(f"Duplicate IDs       : {len(duplicates)}")
print(f"Numeric errors      : {len(conversion_errors)}")
print(f"Percentage errors   : {len(percentage_errors)}")
print(f"Texture errors      : {len(texture_errors)}")
print(f"pH errors           : {len(ph_errors)}")
print(f"EC errors           : {len(ec_errors)}")
print(f"Water logic errors  : {len(water_errors)}")
print(f"Health score errors : {len(health_errors)}")

print("\nValidation completed.")
print("=" * 70)