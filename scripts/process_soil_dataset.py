import csv
import os
import statistics
from collections import Counter


# ============================================================
# APOLLO AGRIVERSE
# SOIL DATA PROCESSING PIPELINE
#
# Pipeline:
# 1. Validation
# 2. Cleaning
# 3. Preprocessing
# 4. EDA
# 5. Feature Engineering
# 6. Final Dataset
# ============================================================


# ============================================================
# 1. PATH CONFIGURATION
# ============================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)

INPUT_FILE = os.path.join(
    BASE_DIR,
    "02_Datasets",
    "KnowledgeBase",
    "03_soil_database.csv"
)

OUTPUT_FILE = os.path.join(
    BASE_DIR,
    "02_Datasets",
    "KnowledgeBase",
    "03_soil_database_final.csv"
)

EDA_REPORT_FILE = os.path.join(
    BASE_DIR,
    "02_Datasets",
    "KnowledgeBase",
    "soil_eda_report.txt"
)


# ============================================================
# 2. EXPECTED 36 FEATURES
# ============================================================

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


# ============================================================
# 3. COLUMN GROUPS
# ============================================================

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


PERCENTAGE_COLUMNS = [
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


TEXT_COLUMNS = [
    "soil_id",
    "soil_type",
    "soil_texture",
    "permeability_class",
    "drainage_class"
]


# ============================================================
# 4. HELPER FUNCTIONS
# ============================================================

def print_section(title):
    print("\n" + "=" * 70)
    print(title)
    print("=" * 70)


def clean_text(value):
    """
    Remove unnecessary spaces and normalize simple text fields.
    """
    if value is None:
        return ""

    value = value.strip()

    # Replace multiple spaces with a single space
    value = " ".join(value.split())

    return value


def to_float(value):
    """
    Safely convert a value to float.
    """
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def calculate_mean(values):
    if not values:
        return None

    return statistics.mean(values)


def calculate_median(values):
    if not values:
        return None

    return statistics.median(values)


# ============================================================
# 5. LOAD RAW DATA
# ============================================================

print_section("APOLLO AGRIVERSE - SOIL DATA PROCESSING")

print("Input dataset:")
print(INPUT_FILE)

if not os.path.exists(INPUT_FILE):
    print("\nERROR: Input CSV was not found.")
    print("Check:")
    print("02_Datasets\\KnowledgeBase\\03_soil_database.csv")
    raise SystemExit(1)


with open(
    INPUT_FILE,
    "r",
    encoding="utf-8-sig",
    newline=""
) as file:

    reader = csv.DictReader(file)

    columns = reader.fieldnames
    raw_rows = list(reader)


print("\nDataset loaded successfully.")
print("Rows:", len(raw_rows))
print("Columns:", len(columns))


# ============================================================
# 6. STAGE 1 — VALIDATION
# ============================================================

print_section("STAGE 1 — VALIDATION")

validation_errors = []

# ------------------------------------------------------------
# Column count
# ------------------------------------------------------------

if len(columns) != 36:
    validation_errors.append(
        f"Expected 36 columns but found {len(columns)}."
    )

else:
    print("PASS: 36 columns detected.")


# ------------------------------------------------------------
# Missing columns
# ------------------------------------------------------------

missing_columns = [
    column
    for column in EXPECTED_COLUMNS
    if column not in columns
]

if missing_columns:

    print("FAIL: Missing columns:")

    for column in missing_columns:
        print("   -", column)

else:

    print("PASS: All required columns exist.")


# ------------------------------------------------------------
# Extra columns
# ------------------------------------------------------------

extra_columns = [
    column
    for column in columns
    if column not in EXPECTED_COLUMNS
]

if extra_columns:

    print("WARNING: Extra columns found:")

    for column in extra_columns:
        print("   -", column)

else:

    print("PASS: No unexpected columns.")


# ------------------------------------------------------------
# Missing values
# ------------------------------------------------------------

missing_values = {}

for column in columns:

    count = 0

    for row in raw_rows:

        value = row.get(column, "")

        if value is None or value.strip() == "":
            count += 1

    if count > 0:
        missing_values[column] = count


if missing_values:

    print("WARNING: Missing values found.")

    for column, count in missing_values.items():
        print(f"   {column}: {count}")

else:

    print("PASS: No missing values.")


# ------------------------------------------------------------
# Duplicate soil IDs
# ------------------------------------------------------------

soil_ids = []

for row in raw_rows:

    soil_id = row.get("soil_id", "").strip()

    if soil_id:
        soil_ids.append(soil_id)


id_counts = Counter(soil_ids)

duplicate_ids = {
    soil_id: count
    for soil_id, count in id_counts.items()
    if count > 1
}


if duplicate_ids:

    print("WARNING: Duplicate soil IDs found.")

    for soil_id, count in list(duplicate_ids.items())[:10]:
        print(f"   {soil_id}: {count}")

else:

    print("PASS: No duplicate soil IDs.")


# ------------------------------------------------------------
# Numeric validation
# ------------------------------------------------------------

numeric_errors = []

for row_number, row in enumerate(raw_rows, start=2):

    for column in NUMERIC_COLUMNS:

        value = row.get(column, "").strip()

        if value == "":
            continue

        if to_float(value) is None:

            numeric_errors.append(
                (row_number, column, value)
            )


if numeric_errors:

    print("WARNING: Numeric conversion errors found.")

    for error in numeric_errors[:10]:

        print(
            f"   Row {error[0]} | "
            f"{error[1]} | "
            f"{error[2]}"
        )

else:

    print("PASS: Numeric values are valid.")


# ------------------------------------------------------------
# Percentage validation
# ------------------------------------------------------------

percentage_errors = []

for row_number, row in enumerate(raw_rows, start=2):

    for column in PERCENTAGE_COLUMNS:

        value = to_float(
            row.get(column, "")
        )

        if value is None:
            continue

        if value < 0 or value > 100:

            percentage_errors.append(
                (row_number, column, value)
            )


if percentage_errors:

    print("WARNING: Percentage errors found.")

    for error in percentage_errors[:10]:

        print(
            f"   Row {error[0]} | "
            f"{error[1]} | "
            f"{error[2]}"
        )

else:

    print("PASS: Percentage ranges are valid.")


# ------------------------------------------------------------
# Sand + silt + clay
# ------------------------------------------------------------

texture_errors = []

for row_number, row in enumerate(raw_rows, start=2):

    sand = to_float(row.get("sand_pct"))
    silt = to_float(row.get("silt_pct"))
    clay = to_float(row.get("clay_pct"))

    if sand is None or silt is None or clay is None:
        continue

    total = sand + silt + clay

    if abs(total - 100) > 1.5:

        texture_errors.append(
            (row_number, total)
        )


if texture_errors:

    print(
        f"WARNING: {len(texture_errors)} "
        "texture rows are inconsistent."
    )

else:

    print(
        "PASS: Sand + Silt + Clay ≈ 100%."
    )


# ------------------------------------------------------------
# Water relationship
# ------------------------------------------------------------

water_errors = []

for row_number, row in enumerate(raw_rows, start=2):

    field_capacity = to_float(
        row.get("field_capacity_pct")
    )

    wilting_point = to_float(
        row.get("wilting_point_pct")
    )

    if field_capacity is None or wilting_point is None:
        continue

    if field_capacity < wilting_point:

        water_errors.append(row_number)


if water_errors:

    print(
        f"WARNING: {len(water_errors)} "
        "water relationship errors."
    )

else:

    print(
        "PASS: Field capacity >= wilting point."
    )


# ============================================================
# 7. STAGE 2 — DATA CLEANING
# ============================================================

print_section("STAGE 2 — DATA CLEANING")

cleaned_rows = []

duplicate_complete_rows = 0

seen_rows = set()


for row in raw_rows:

    cleaned_row = {}

    # --------------------------------------------------------
    # Clean text fields
    # --------------------------------------------------------

    for column in columns:

        value = row.get(column, "")

        if column in TEXT_COLUMNS:

            cleaned_row[column] = clean_text(value)

        else:

            cleaned_row[column] = value.strip()


    # --------------------------------------------------------
    # Detect complete duplicate rows
    # --------------------------------------------------------

    row_signature = tuple(
        cleaned_row[column]
        for column in columns
    )

    if row_signature in seen_rows:

        duplicate_complete_rows += 1

        continue

    seen_rows.add(row_signature)

    cleaned_rows.append(cleaned_row)


print(
    "Rows before cleaning:",
    len(raw_rows)
)

print(
    "Rows after cleaning:",
    len(cleaned_rows)
)

print(
    "Duplicate complete rows removed:",
    duplicate_complete_rows
)

print("Text fields standardized.")
print("Whitespace cleaned.")


# ============================================================
# 8. STAGE 3 — PREPROCESSING
# ============================================================

print_section("STAGE 3 — PREPROCESSING")

preprocessed_rows = []

for row in cleaned_rows:

    processed_row = {}

    for column in columns:

        value = row[column]

        # ----------------------------------------------------
        # Numeric columns
        # ----------------------------------------------------

        if column in NUMERIC_COLUMNS:

            numeric_value = to_float(value)

            if numeric_value is None:

                processed_row[column] = ""

            else:

                # Keep meaningful decimal precision
                processed_row[column] = round(
                    numeric_value,
                    3
                )

        # ----------------------------------------------------
        # Text columns
        # ----------------------------------------------------

        else:

            processed_row[column] = clean_text(value)

    preprocessed_rows.append(processed_row)


print(
    "PASS: Numeric fields converted to numeric format."
)

print(
    "PASS: Text fields standardized."
)

print(
    "PASS: Preprocessing completed."
)


# ============================================================
# 9. STAGE 4 — EDA / DATA ANALYSIS
# ============================================================

print_section("STAGE 4 — EDA / DATA ANALYSIS")

eda_lines = []

eda_lines.append(
    "APOLLO AGRIVERSE — SOIL DATA EDA REPORT"
)

eda_lines.append("=" * 60)

eda_lines.append(
    f"Total records: {len(preprocessed_rows)}"
)

eda_lines.append(
    f"Total features: {len(columns)}"
)

eda_lines.append("")


# ------------------------------------------------------------
# Soil type distribution
# ------------------------------------------------------------

soil_type_counts = Counter(
    row["soil_type"]
    for row in preprocessed_rows
    if row["soil_type"]
)

eda_lines.append("SOIL TYPE DISTRIBUTION")
eda_lines.append("-" * 60)

for soil_type, count in soil_type_counts.most_common():

    eda_lines.append(
        f"{soil_type}: {count}"
    )


eda_lines.append("")


# ------------------------------------------------------------
# Soil texture distribution
# ------------------------------------------------------------

texture_counts = Counter(
    row["soil_texture"]
    for row in preprocessed_rows
    if row["soil_texture"]
)

eda_lines.append("SOIL TEXTURE DISTRIBUTION")
eda_lines.append("-" * 60)

for texture, count in texture_counts.most_common():

    eda_lines.append(
        f"{texture}: {count}"
    )


eda_lines.append("")


# ------------------------------------------------------------
# Numeric statistics
# ------------------------------------------------------------

eda_lines.append("NUMERIC FEATURE STATISTICS")
eda_lines.append("-" * 60)

for column in NUMERIC_COLUMNS:

    values = []

    for row in preprocessed_rows:

        value = to_float(
            row.get(column)
        )

        if value is not None:

            values.append(value)

    if not values:
        continue

    minimum = min(values)
    maximum = max(values)
    mean = calculate_mean(values)
    median = calculate_median(values)

    eda_lines.append(
        f"{column}"
    )

    eda_lines.append(
        f"  Min    : {minimum:.3f}"
    )

    eda_lines.append(
        f"  Max    : {maximum:.3f}"
    )

    eda_lines.append(
        f"  Mean   : {mean:.3f}"
    )

    eda_lines.append(
        f"  Median : {median:.3f}"
    )

    eda_lines.append("")


# ------------------------------------------------------------
# Save EDA report
# ------------------------------------------------------------

with open(
    EDA_REPORT_FILE,
    "w",
    encoding="utf-8"
) as file:

    file.write(
        "\n".join(eda_lines)
    )


print(
    "EDA report created:"
)

print(
    EDA_REPORT_FILE
)


# ============================================================
# 10. STAGE 5 — FEATURE ENGINEERING
# ============================================================

print_section("STAGE 5 — FEATURE ENGINEERING")

print(
    "No unnecessary features are being added."
)

print(
    "The original 36 soil features are preserved."
)

print(
    "Derived features will be added only when"
)

print(
    "they are scientifically justified for Apollo."
)


# ============================================================
# 11. STAGE 6 — SAVE FINAL DATASET
# ============================================================

print_section("STAGE 6 — FINAL DATASET")

with open(
    OUTPUT_FILE,
    "w",
    encoding="utf-8",
    newline=""
) as file:

    writer = csv.DictWriter(
        file,
        fieldnames=columns
    )

    writer.writeheader()

    writer.writerows(
        preprocessed_rows
    )


print(
    "FINAL DATASET CREATED SUCCESSFULLY."
)

print(
    "Location:"
)

print(
    OUTPUT_FILE
)

print(
    "Final rows:",
    len(preprocessed_rows)
)

print(
    "Final features:",
    len(columns)
)


# ============================================================
# 12. FINAL SUMMARY
# ============================================================

print_section("PIPELINE COMPLETED")

print("RAW DATASET")
print("    ↓")
print("VALIDATION")
print("    ↓")
print("CLEANING")
print("    ↓")
print("PREPROCESSING")
print("    ↓")
print("EDA")
print("    ↓")
print("FEATURE ENGINEERING")
print("    ↓")
print("FINAL DATASET")

print("\nFiles created:")

print(
    "1.",
    OUTPUT_FILE
)

print(
    "2.",
    EDA_REPORT_FILE
)

print("\nSoil data pipeline completed successfully.")