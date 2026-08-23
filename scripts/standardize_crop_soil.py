import csv
import os

# ============================================================
# APOLLO AGRIVERSE
# CROP-SOIL REQUIREMENTS STANDARDIZATION
# ============================================================

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

KNOWLEDGE_BASE = os.path.join(
    BASE_DIR,
    "02_Datasets",
    "KnowledgeBase"
)

INPUT_FILE = os.path.join(
    KNOWLEDGE_BASE,
    "04_crop_soil_requirements_final.csv"
)

SOIL_FILE = os.path.join(
    KNOWLEDGE_BASE,
    "03_soil_database.csv"
)

OUTPUT_FILE = os.path.join(
    KNOWLEDGE_BASE,
    "04_crop_soil_requirements_standardized.csv"
)


print("=" * 70)
print("APOLLO AGRIVERSE")
print("CROP-SOIL REQUIREMENTS STANDARDIZATION")
print("=" * 70)


# ============================================================
# 1. CHECK INPUT FILES
# ============================================================

print("\n1. CHECKING INPUT FILES")
print("-" * 70)

if not os.path.exists(INPUT_FILE):
    print("ERROR: Crop-soil requirements file not found.")
    print(INPUT_FILE)
    raise SystemExit

if not os.path.exists(SOIL_FILE):
    print("ERROR: Soil database file not found.")
    print(SOIL_FILE)
    raise SystemExit

print("PASS: Crop-soil requirements file found.")
print("PASS: Soil database file found.")


# ============================================================
# 2. READ SOIL DATABASE
# ============================================================

print("\n2. READING SOIL DATABASE")
print("-" * 70)

with open(SOIL_FILE, "r", newline="", encoding="utf-8-sig") as file:
    soil_reader = csv.DictReader(file)

    soil_columns = soil_reader.fieldnames

    if "soil_type" not in soil_columns:
        print("ERROR: soil_type column not found in soil database.")
        raise SystemExit

    valid_soil_types = set()

    for row in soil_reader:
        soil_type = row["soil_type"].strip()

        if soil_type:
            valid_soil_types.add(soil_type)

print("Valid soil types found in 03_soil_database.csv:")

for soil_type in sorted(valid_soil_types):
    print("   -", soil_type)


# ============================================================
# 3. READ ORIGINAL CROP-SOIL REQUIREMENTS
# ============================================================

print("\n3. READING ORIGINAL REQUIREMENTS DATASET")
print("-" * 70)

with open(INPUT_FILE, "r", newline="", encoding="utf-8-sig") as file:
    reader = csv.DictReader(file)

    original_columns = reader.fieldnames
    original_rows = list(reader)

if original_columns is None:
    print("ERROR: CSV has no header.")
    raise SystemExit

print("Original rows   :", len(original_rows))
print("Original columns:", len(original_columns))


# ============================================================
# 4. CHECK REQUIRED COLUMN
# ============================================================

if "soil_type" not in original_columns:
    print("ERROR: soil_type column not found.")
    raise SystemExit

print("PASS: soil_type column exists.")


# ============================================================
# 5. STANDARDIZATION MAPPING
# ============================================================

print("\n4. STANDARDIZING SOIL TYPE")
print("-" * 70)

soil_mapping = {
    "Black Cotton Soil": "Black Soil",
    "Red Loam Soil": "Red Soil",

    # Already standardized values
    "Black Soil": "Black Soil",
    "Red Soil": "Red Soil",
    "Saline-Alkaline Soil": "Saline-Alkaline Soil",
    "Lateritic Soil": "Lateritic Soil",
    "Alluvial Soil": "Alluvial Soil"
}


changes = 0

for row in original_rows:

    old_value = row["soil_type"].strip()

    if old_value not in soil_mapping:
        print("ERROR: Unknown soil type found:")
        print("       ", old_value)
        raise SystemExit

    new_value = soil_mapping[old_value]

    if old_value != new_value:
        changes += 1
        print(f"   {old_value}  -->  {new_value}")

    # ONLY this value is changed
    row["soil_type"] = new_value


print("\nTotal soil_type values changed:", changes)


# ============================================================
# 6. VERIFY STANDARDIZED SOIL TYPES
# ============================================================

print("\n5. VERIFYING SOIL TYPES")
print("-" * 70)

standardized_soil_types = set()

for row in original_rows:
    standardized_soil_types.add(row["soil_type"])

print("Soil types after standardization:")

for soil_type in sorted(standardized_soil_types):
    print("   -", soil_type)

invalid_types = standardized_soil_types - valid_soil_types

if invalid_types:
    print("\nERROR: These soil types do not exist in the soil database:")

    for soil_type in invalid_types:
        print("   -", soil_type)

    raise SystemExit

print("PASS: Every soil_type exists in 03_soil_database.csv.")


# ============================================================
# 7. SAVE NEW DATASET
# ============================================================

print("\n6. SAVING STANDARDIZED DATASET")
print("-" * 70)

with open(
    OUTPUT_FILE,
    "w",
    newline="",
    encoding="utf-8"
) as file:

    writer = csv.DictWriter(
        file,
        fieldnames=original_columns
    )

    writer.writeheader()
    writer.writerows(original_rows)


print("PASS: Standardized dataset created.")
print("Location:")
print(OUTPUT_FILE)


# ============================================================
# 8. FINAL SAFETY CHECK
# ============================================================

print("\n7. FINAL DATASET SAFETY CHECK")
print("-" * 70)

with open(
    OUTPUT_FILE,
    "r",
    newline="",
    encoding="utf-8-sig"
) as file:

    final_reader = csv.DictReader(file)

    final_columns = final_reader.fieldnames
    final_rows = list(final_reader)


print("Original rows      :", len(original_rows))
print("Final rows         :", len(final_rows))

print("Original columns   :", len(original_columns))
print("Final columns      :", len(final_columns))


# Row count check
if len(original_rows) != len(final_rows):
    print("ERROR: Row count changed!")
    raise SystemExit

print("PASS: Row count unchanged.")


# Column count check
if len(original_columns) != len(final_columns):
    print("ERROR: Column count changed!")
    raise SystemExit

print("PASS: Column count unchanged.")


# Column name/order check
if original_columns != final_columns:
    print("ERROR: Column names/order changed!")
    raise SystemExit

print("PASS: All columns preserved in the same order.")


# Final soil check
for row in final_rows:

    if row["soil_type"] not in valid_soil_types:
        print("ERROR: Invalid soil type in final dataset:")
        print(row["soil_type"])
        raise SystemExit

print("PASS: All final soil types are valid.")


# ============================================================
# FINAL RESULT
# ============================================================

print("\n" + "=" * 70)
print("STANDARDIZATION COMPLETED SUCCESSFULLY")
print("=" * 70)

print("\nOriginal dataset:")
print("   Rows    :", len(original_rows))
print("   Columns :", len(original_columns))

print("\nFinal dataset:")
print("   Rows    :", len(final_rows))
print("   Columns :", len(final_columns))

print("\nOnly soil_type was standardized.")
print("No rows were removed.")
print("No columns were removed.")
print("No data was merged.")
print("No filtering was performed.")

print("\nFinal file:")
print(OUTPUT_FILE)

print("\n" + "=" * 70)