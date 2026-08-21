import csv
import os
import statistics
from collections import Counter


# ============================================================
# APOLLO AGRIVERSE
# CROP-SOIL REQUIREMENTS DATA PROCESSING
# WITHOUT PANDAS / NUMPY
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

KNOWLEDGE_BASE = os.path.join(
    BASE_DIR,
    "02_Datasets",
    "KnowledgeBase"
)

INPUT_FILE = os.path.join(
    KNOWLEDGE_BASE,
    "04_crop_soil_requirements.csv"
)

FINAL_FILE = os.path.join(
    KNOWLEDGE_BASE,
    "04_crop_soil_requirements_final.csv"
)

EDA_FILE = os.path.join(
    KNOWLEDGE_BASE,
    "crop_soil_requirements_eda_report.txt"
)


# ============================================================
# EXPECTED 20 COLUMNS
# ============================================================

EXPECTED_COLUMNS = [
    "requirement_id",
    "crop_id",
    "variety_id",
    "soil_type",
    "preferred_texture",
    "ph_min",
    "ph_max",
    "ec_max_ds_m",
    "minimum_soil_moisture_pct",
    "maximum_soil_moisture_pct",
    "nitrogen_min_mg_kg",
    "phosphorus_min_mg_kg",
    "potassium_min_mg_kg",
    "organic_matter_min_pct",
    "drainage_requirement",
    "water_requirement_level",
    "soil_suitability_score",
    "yield_potential_score",
    "compatibility_score",
    "recommendation_notes"
]


NUMERIC_COLUMNS = [
    "ph_min",
    "ph_max",
    "ec_max_ds_m",
    "minimum_soil_moisture_pct",
    "maximum_soil_moisture_pct",
    "nitrogen_min_mg_kg",
    "phosphorus_min_mg_kg",
    "potassium_min_mg_kg",
    "organic_matter_min_pct",
    "soil_suitability_score",
    "yield_potential_score",
    "compatibility_score"
]


TEXT_COLUMNS = [
    "requirement_id",
    "crop_id",
    "variety_id",
    "soil_type",
    "preferred_texture",
    "drainage_requirement",
    "water_requirement_level",
    "recommendation_notes"
]


# ============================================================
# HEADER
# ============================================================

print("=" * 70)
print("APOLLO AGRIVERSE - CROP-SOIL REQUIREMENTS DATA PROCESSING")
print("=" * 70)

print("\nInput dataset:")
print(INPUT_FILE)


# ============================================================
# CHECK FILE
# ============================================================

if not os.path.exists(INPUT_FILE):

    print("\nERROR: Input CSV file was not found.")
    print("Expected location:")
    print(INPUT_FILE)

    raise SystemExit


# ============================================================
# LOAD CSV
# ============================================================

with open(
    INPUT_FILE,
    "r",
    encoding="utf-8-sig",
    newline=""
) as file:

    reader = csv.DictReader(file)

    columns = reader.fieldnames

    rows = list(reader)


print("\nDataset loaded successfully.")
print("Rows:", len(rows))
print("Columns:", len(columns))


# ============================================================
# 1. VALIDATION
# ============================================================

print("\n" + "=" * 70)
print("STAGE 1 — VALIDATION")
print("=" * 70)


# Column count
if len(columns) == 20:
    print("PASS: 20 columns detected.")
else:
    print("FAIL: Expected 20 columns.")
    

# Missing columns
missing_columns = [
    col for col in EXPECTED_COLUMNS
    if col not in columns
]

if len(missing_columns) == 0:
    print("PASS: All required columns exist.")
else:
    print("FAIL: Missing columns:", missing_columns)


# Unexpected columns
unexpected_columns = [
    col for col in columns
    if col not in EXPECTED_COLUMNS
]

if len(unexpected_columns) == 0:
    print("PASS: No unexpected columns.")
else:
    print("FAIL: Unexpected columns:", unexpected_columns)


# Column order
if columns == EXPECTED_COLUMNS:

    print("PASS: All columns are in correct order.")

else:

    print("WARNING: Column order is different.")

    # Rebuild rows using expected order
    new_rows = []

    for row in rows:

        new_row = {}

        for col in EXPECTED_COLUMNS:
            new_row[col] = row.get(col, "")

        new_rows.append(new_row)

    rows = new_rows

    print("Columns reordered automatically.")


# ============================================================
# MISSING VALUES
# ============================================================

missing_values = 0

for row in rows:

    for col in EXPECTED_COLUMNS:

        value = row.get(col, "").strip()

        if value == "":
            missing_values += 1


if missing_values == 0:

    print("PASS: No missing values.")

else:

    print(
        "WARNING:",
        missing_values,
        "missing values found."
    )


# ============================================================
# DUPLICATE IDs
# ============================================================

ids = [
    row["requirement_id"].strip()
    for row in rows
]

duplicate_ids = len(ids) - len(set(ids))

if duplicate_ids == 0:

    print("PASS: No duplicate requirement IDs.")

else:

    print(
        "WARNING:",
        duplicate_ids,
        "duplicate requirement IDs."
    )


# ============================================================
# NUMERIC VALIDATION
# ============================================================

numeric_errors = 0

for row in rows:

    for col in NUMERIC_COLUMNS:

        try:

            float(row[col])

        except:

            numeric_errors += 1


if numeric_errors == 0:

    print("PASS: Numeric fields contain valid numbers.")

else:

    print(
        "WARNING:",
        numeric_errors,
        "numeric errors found."
    )


# ============================================================
# PH RANGE CHECK
# ============================================================

ph_errors = 0

for row in rows:

    try:

        ph_min = float(row["ph_min"])
        ph_max = float(row["ph_max"])

        if ph_min > ph_max:
            ph_errors += 1

    except:
        pass


if ph_errors == 0:

    print(
        "PASS: pH minimum/maximum relationship is valid."
    )

else:

    print(
        "FAIL:",
        ph_errors,
        "invalid pH ranges."
    )


# ============================================================
# MOISTURE RANGE CHECK
# ============================================================

moisture_errors = 0

for row in rows:

    try:

        minimum = float(
            row["minimum_soil_moisture_pct"]
        )

        maximum = float(
            row["maximum_soil_moisture_pct"]
        )

        if minimum > maximum:
            moisture_errors += 1

    except:
        pass


if moisture_errors == 0:

    print(
        "PASS: Soil moisture ranges are valid."
    )

else:

    print(
        "FAIL:",
        moisture_errors,
        "invalid moisture ranges."
    )


# ============================================================
# SCORE CHECK
# ============================================================

score_errors = 0

for row in rows:

    for col in [
        "soil_suitability_score",
        "yield_potential_score",
        "compatibility_score"
    ]:

        try:

            value = float(row[col])

            if value < 0 or value > 100:
                score_errors += 1

        except:
            pass


if score_errors == 0:

    print(
        "PASS: Suitability scores are between 0 and 100."
    )

else:

    print(
        "FAIL:",
        score_errors,
        "score errors."
    )


# ============================================================
# EC CHECK
# ============================================================

ec_errors = 0

for row in rows:

    try:

        ec = float(row["ec_max_ds_m"])

        if ec < 0:
            ec_errors += 1

    except:
        pass


if ec_errors == 0:

    print("PASS: EC values are non-negative.")

else:

    print(
        "FAIL:",
        ec_errors,
        "negative EC values."
    )


# ============================================================
# 2. DATA CLEANING
# ============================================================

print("\n" + "=" * 70)
print("STAGE 2 — DATA CLEANING")
print("=" * 70)


rows_before = len(rows)


# Remove completely duplicate rows
unique_rows = []
seen_rows = set()

for row in rows:

    row_tuple = tuple(
        row[col] for col in EXPECTED_COLUMNS
    )

    if row_tuple not in seen_rows:

        seen_rows.add(row_tuple)
        unique_rows.append(row)


rows = unique_rows


# Remove duplicate requirement IDs
unique_id_rows = []
seen_ids = set()

for row in rows:

    requirement_id = row[
        "requirement_id"
    ].strip()

    if requirement_id not in seen_ids:

        seen_ids.add(requirement_id)
        unique_id_rows.append(row)


rows = unique_id_rows


# Clean text
for row in rows:

    for col in TEXT_COLUMNS:

        value = row[col]

        value = value.strip()

        # Remove multiple spaces
        value = " ".join(value.split())

        row[col] = value


rows_after = len(rows)

print("Rows before cleaning:", rows_before)
print("Rows after cleaning:", rows_after)

print(
    "Duplicate rows removed:",
    rows_before - rows_after
)

print("Text fields standardized.")
print("Whitespace cleaned.")


# ============================================================
# 3. PREPROCESSING
# ============================================================

print("\n" + "=" * 70)
print("STAGE 3 — PREPROCESSING")
print("=" * 70)


for row in rows:

    for col in NUMERIC_COLUMNS:

        try:

            value = float(row[col])

            row[col] = f"{value:.2f}"

        except:

            pass


print("PASS: Numeric fields converted.")
print("PASS: Text fields standardized.")
print("PASS: Numeric values rounded.")
print("PASS: Preprocessing completed.")


# ============================================================
# 4. EDA
# ============================================================

print("\n" + "=" * 70)
print("STAGE 4 — EDA / DATA ANALYSIS")
print("=" * 70)


with open(
    EDA_FILE,
    "w",
    encoding="utf-8"
) as report:

    report.write(
        "APOLLO AGRIVERSE — "
        "CROP-SOIL REQUIREMENTS EDA REPORT\n"
    )

    report.write("=" * 60 + "\n")

    report.write(
        f"Total records: {len(rows)}\n"
    )

    report.write(
        f"Total features: {len(EXPECTED_COLUMNS)}\n\n"
    )


    # --------------------------------------------------------
    # SOIL TYPE
    # --------------------------------------------------------

    report.write("SOIL TYPE DISTRIBUTION\n")
    report.write("-" * 60 + "\n")

    counter = Counter(
        row["soil_type"]
        for row in rows
    )

    for value, count in counter.items():

        report.write(
            f"{value}: {count}\n"
        )


    # --------------------------------------------------------
    # TEXTURE
    # --------------------------------------------------------

    report.write(
        "\nPREFERRED TEXTURE DISTRIBUTION\n"
    )

    report.write("-" * 60 + "\n")

    counter = Counter(
        row["preferred_texture"]
        for row in rows
    )

    for value, count in counter.items():

        report.write(
            f"{value}: {count}\n"
        )


    # --------------------------------------------------------
    # CROP
    # --------------------------------------------------------

    report.write("\nCROP DISTRIBUTION\n")
    report.write("-" * 60 + "\n")

    counter = Counter(
        row["crop_id"]
        for row in rows
    )

    for value, count in counter.items():

        report.write(
            f"{value}: {count}\n"
        )


    # --------------------------------------------------------
    # VARIETY
    # --------------------------------------------------------

    report.write("\nVARIETY DISTRIBUTION\n")
    report.write("-" * 60 + "\n")

    counter = Counter(
        row["variety_id"]
        for row in rows
    )

    for value, count in counter.items():

        report.write(
            f"{value}: {count}\n"
        )


    # --------------------------------------------------------
    # NUMERIC STATISTICS
    # --------------------------------------------------------

    report.write(
        "\nNUMERIC FEATURE STATISTICS\n"
    )

    report.write("-" * 60 + "\n")


    for col in NUMERIC_COLUMNS:

        values = []

        for row in rows:

            try:
                values.append(
                    float(row[col])
                )
            except:
                pass


        if len(values) > 0:

            report.write(
                f"\n{col}\n"
            )

            report.write(
                f"  Min    : {min(values):.2f}\n"
            )

            report.write(
                f"  Max    : {max(values):.2f}\n"
            )

            report.write(
                f"  Mean   : "
                f"{statistics.mean(values):.2f}\n"
            )

            report.write(
                f"  Median : "
                f"{statistics.median(values):.2f}\n"
            )


print("EDA report created:")
print(EDA_FILE)


# ============================================================
# 5. FEATURE ENGINEERING
# ============================================================

print("\n" + "=" * 70)
print("STAGE 5 — FEATURE ENGINEERING")
print("=" * 70)

print(
    "No unnecessary features are being added."
)

print(
    "The original 20 crop-soil requirement "
    "features are preserved."
)

print(
    "Derived features will be added later only "
    "if scientifically justified."
)


# ============================================================
# 6. FINAL DATASET
# ============================================================

print("\n" + "=" * 70)
print("STAGE 6 — FINAL DATASET")
print("=" * 70)


with open(
    FINAL_FILE,
    "w",
    encoding="utf-8",
    newline=""
) as file:

    writer = csv.DictWriter(
        file,
        fieldnames=EXPECTED_COLUMNS
    )

    writer.writeheader()

    writer.writerows(rows)


print("\nFINAL DATASET CREATED SUCCESSFULLY.")

print("Location:")
print(FINAL_FILE)

print("Final rows:", len(rows))
print("Final features:", len(EXPECTED_COLUMNS))


# ============================================================
# SUMMARY
# ============================================================

print("\n" + "=" * 70)
print("PIPELINE COMPLETED")
print("=" * 70)

print("""
RAW DATASET
    ↓
VALIDATION
    ↓
CLEANING
    ↓
PREPROCESSING
    ↓
EDA
    ↓
FEATURE ENGINEERING
    ↓
FINAL DATASET
""")

print("Files created:")
print("1.", FINAL_FILE)
print("2.", EDA_FILE)

print(
    "\nCrop-soil requirements data pipeline "
    "completed successfully."
)

print("=" * 70)