import pandas as pd
import numpy as np
import random
import os

# ============================================================
# APOLLO AGRIVERSE
# CROP DATABASE - HYPOTHETICAL DATA GENERATOR
# ============================================================

# ------------------------------------------------------------
# FILE PATHS
# ------------------------------------------------------------

INPUT_FILE = r"D:\Apollo_AgriVerse\02_Datasets\KnowledgeBase\01_crop_database_1200_plus.csv"

OUTPUT_FILE = r"D:\Apollo_AgriVerse\02_Datasets\KnowledgeBase\01_crop_database.csv"


# ------------------------------------------------------------
# SETTINGS
# ------------------------------------------------------------

TARGET_RECORDS = 2500

random.seed(42)
np.random.seed(42)


# ============================================================
# CROP PROFILES
# ============================================================
#
# These values are HYPOTHETICAL / SYNTHETIC.
# They are intended for Apollo AgriVerse development,
# testing and ML experimentation.
#
# SOIL FEATURES ARE NOT INCLUDED.
# ============================================================

crop_profiles = {

    "Cotton": {
        "crop_category": "Cash Crop",
        "season": "Kharif",

        "temperature_min_c": 21,
        "temperature_max_c": 35,

        "humidity_min_pct": 45,
        "humidity_max_pct": 70,

        "rainfall_min_mm": 500,
        "rainfall_max_mm": 900,

        "water_requirement_l_day": 18,
        "irrigation_frequency_days": 3,

        "crop_duration_days": 165,

        "bud_burst_days": 20,
        "vegetative_days": 55,
        "flowering_days": 95,
        "fruit_development_days": 135,
        "harvest_days": 165,

        "heat_tolerance_index": 0.88,
        "drought_tolerance_index": 0.72,

        "expected_yield_ton_ha": 2.2,

        "market_demand": "Very High",
        "profit_potential": "High",
        "market_price_index": 0.86,

        "water_sensitivity": "Medium",
        "climate_suitability": "Excellent"
    },


    "Sugarcane": {
        "crop_category": "Cash Crop",
        "season": "Annual",

        "temperature_min_c": 20,
        "temperature_max_c": 35,

        "humidity_min_pct": 55,
        "humidity_max_pct": 80,

        "rainfall_min_mm": 1000,
        "rainfall_max_mm": 1800,

        "water_requirement_l_day": 30,
        "irrigation_frequency_days": 2,

        "crop_duration_days": 330,

        "bud_burst_days": 25,
        "vegetative_days": 150,
        "flowering_days": 240,
        "fruit_development_days": 285,
        "harvest_days": 330,

        "heat_tolerance_index": 0.91,
        "drought_tolerance_index": 0.52,

        "expected_yield_ton_ha": 85,

        "market_demand": "Very High",
        "profit_potential": "High",
        "market_price_index": 0.78,

        "water_sensitivity": "High",
        "climate_suitability": "Excellent"
    },


    "Soybean": {
        "crop_category": "Oilseed",
        "season": "Kharif",

        "temperature_min_c": 20,
        "temperature_max_c": 32,

        "humidity_min_pct": 50,
        "humidity_max_pct": 75,

        "rainfall_min_mm": 600,
        "rainfall_max_mm": 1000,

        "water_requirement_l_day": 14,
        "irrigation_frequency_days": 4,

        "crop_duration_days": 105,

        "bud_burst_days": 12,
        "vegetative_days": 38,
        "flowering_days": 60,
        "fruit_development_days": 85,
        "harvest_days": 105,

        "heat_tolerance_index": 0.74,
        "drought_tolerance_index": 0.67,

        "expected_yield_ton_ha": 2.4,

        "market_demand": "High",
        "profit_potential": "High",
        "market_price_index": 0.74,

        "water_sensitivity": "Medium",
        "climate_suitability": "Very Good"
    },


    "Rice": {
        "crop_category": "Food Crop",
        "season": "Kharif",

        "temperature_min_c": 21,
        "temperature_max_c": 34,

        "humidity_min_pct": 65,
        "humidity_max_pct": 90,

        "rainfall_min_mm": 1000,
        "rainfall_max_mm": 2000,

        "water_requirement_l_day": 28,
        "irrigation_frequency_days": 2,

        "crop_duration_days": 135,

        "bud_burst_days": 15,
        "vegetative_days": 55,
        "flowering_days": 85,
        "fruit_development_days": 110,
        "harvest_days": 135,

        "heat_tolerance_index": 0.78,
        "drought_tolerance_index": 0.42,

        "expected_yield_ton_ha": 4.5,

        "market_demand": "Very High",
        "profit_potential": "Medium",
        "market_price_index": 0.70,

        "water_sensitivity": "Very High",
        "climate_suitability": "Good"
    },


    "Maize": {
        "crop_category": "Cereal",
        "season": "Kharif",

        "temperature_min_c": 18,
        "temperature_max_c": 32,

        "humidity_min_pct": 45,
        "humidity_max_pct": 70,

        "rainfall_min_mm": 500,
        "rainfall_max_mm": 900,

        "water_requirement_l_day": 16,
        "irrigation_frequency_days": 3,

        "crop_duration_days": 110,

        "bud_burst_days": 10,
        "vegetative_days": 40,
        "flowering_days": 65,
        "fruit_development_days": 90,
        "harvest_days": 110,

        "heat_tolerance_index": 0.80,
        "drought_tolerance_index": 0.62,

        "expected_yield_ton_ha": 5.2,

        "market_demand": "High",
        "profit_potential": "High",
        "market_price_index": 0.75,

        "water_sensitivity": "Medium",
        "climate_suitability": "Very Good"
    },


    "Groundnut": {
        "crop_category": "Oilseed",
        "season": "Kharif",

        "temperature_min_c": 21,
        "temperature_max_c": 33,

        "humidity_min_pct": 50,
        "humidity_max_pct": 75,

        "rainfall_min_mm": 500,
        "rainfall_max_mm": 900,

        "water_requirement_l_day": 13,
        "irrigation_frequency_days": 4,

        "crop_duration_days": 120,

        "bud_burst_days": 12,
        "vegetative_days": 40,
        "flowering_days": 65,
        "fruit_development_days": 95,
        "harvest_days": 120,

        "heat_tolerance_index": 0.83,
        "drought_tolerance_index": 0.76,

        "expected_yield_ton_ha": 2.5,

        "market_demand": "High",
        "profit_potential": "High",
        "market_price_index": 0.77,

        "water_sensitivity": "Medium",
        "climate_suitability": "Very Good"
    },


    "Tur": {
        "crop_category": "Pulse",
        "season": "Kharif",

        "temperature_min_c": 20,
        "temperature_max_c": 34,

        "humidity_min_pct": 40,
        "humidity_max_pct": 70,

        "rainfall_min_mm": 500,
        "rainfall_max_mm": 900,

        "water_requirement_l_day": 10,
        "irrigation_frequency_days": 5,

        "crop_duration_days": 175,

        "bud_burst_days": 18,
        "vegetative_days": 70,
        "flowering_days": 110,
        "fruit_development_days": 145,
        "harvest_days": 175,

        "heat_tolerance_index": 0.89,
        "drought_tolerance_index": 0.86,

        "expected_yield_ton_ha": 1.8,

        "market_demand": "Very High",
        "profit_potential": "High",
        "market_price_index": 0.83,

        "water_sensitivity": "Low",
        "climate_suitability": "Excellent"
    },


    "Onion": {
        "crop_category": "Vegetable",
        "season": "Rabi",

        "temperature_min_c": 13,
        "temperature_max_c": 30,

        "humidity_min_pct": 45,
        "humidity_max_pct": 70,

        "rainfall_min_mm": 350,
        "rainfall_max_mm": 650,

        "water_requirement_l_day": 12,
        "irrigation_frequency_days": 3,

        "crop_duration_days": 120,

        "bud_burst_days": 10,
        "vegetative_days": 45,
        "flowering_days": 70,
        "fruit_development_days": 95,
        "harvest_days": 120,

        "heat_tolerance_index": 0.72,
        "drought_tolerance_index": 0.61,

        "expected_yield_ton_ha": 25,

        "market_demand": "Very High",
        "profit_potential": "Very High",
        "market_price_index": 0.90,

        "water_sensitivity": "Medium",
        "climate_suitability": "Excellent"
    },


    "Tomato": {
        "crop_category": "Vegetable",
        "season": "Rabi",

        "temperature_min_c": 18,
        "temperature_max_c": 30,

        "humidity_min_pct": 50,
        "humidity_max_pct": 75,

        "rainfall_min_mm": 400,
        "rainfall_max_mm": 800,

        "water_requirement_l_day": 15,
        "irrigation_frequency_days": 2,

        "crop_duration_days": 120,

        "bud_burst_days": 12,
        "vegetative_days": 40,
        "flowering_days": 65,
        "fruit_development_days": 95,
        "harvest_days": 120,

        "heat_tolerance_index": 0.67,
        "drought_tolerance_index": 0.55,

        "expected_yield_ton_ha": 35,

        "market_demand": "Very High",
        "profit_potential": "Very High",
        "market_price_index": 0.92,

        "water_sensitivity": "High",
        "climate_suitability": "Very Good"
    },


    "Grape": {
        "crop_category": "Fruit Crop",
        "season": "Annual",

        "temperature_min_c": 18,
        "temperature_max_c": 32,

        "humidity_min_pct": 45,
        "humidity_max_pct": 70,

        "rainfall_min_mm": 500,
        "rainfall_max_mm": 800,

        "water_requirement_l_day": 20,
        "irrigation_frequency_days": 2,

        "crop_duration_days": 125,

        "bud_burst_days": 20,
        "vegetative_days": 45,
        "flowering_days": 60,
        "fruit_development_days": 90,
        "harvest_days": 125,

        "heat_tolerance_index": 0.84,
        "drought_tolerance_index": 0.65,

        "expected_yield_ton_ha": 28,

        "market_demand": "Very High",
        "profit_potential": "Very High",
        "market_price_index": 0.95,

        "water_sensitivity": "High",
        "climate_suitability": "Excellent"
    }
}


# ============================================================
# MAHARASHTRA LOCATIONS
# ============================================================

maharashtra_regions = [
    "Nashik",
    "Pune",
    "Sangli",
    "Kolhapur",
    "Ahmednagar",
    "Solapur",
    "Satara",
    "Jalgaon",
    "Dhule",
    "Nandurbar",
    "Aurangabad",
    "Beed",
    "Latur",
    "Nagpur",
    "Amravati"
]


# ============================================================
# FUNCTION TO GENERATE ONE NEW RECORD
# ============================================================

def generate_crop_record(record_number):

    crop_name = random.choice(
        list(crop_profiles.keys())
    )

    profile = crop_profiles[crop_name]

    crop_code = (
        crop_name
        .lower()
        .replace(" ", "_")
    )

    crop_id = (
        f"crop_{crop_code}_{record_number:05d}"
    )

    record = {

        # ----------------------------------------------------
        # IDENTIFICATION
        # ----------------------------------------------------

        "crop_id": crop_id,

        "crop_name": crop_name,

        "crop_category": profile[
            "crop_category"
        ],

        "state": "Maharashtra",

        "cultivation_region": random.choice(
            maharashtra_regions
        ),

        "season": profile["season"],


        # ----------------------------------------------------
        # CLIMATE
        # ----------------------------------------------------

        "temperature_min_c": round(
            profile["temperature_min_c"]
            + random.uniform(-1.5, 1.5),
            2
        ),

        "temperature_max_c": round(
            profile["temperature_max_c"]
            + random.uniform(-1.5, 1.5),
            2
        ),

        "humidity_min_pct": round(
            profile["humidity_min_pct"]
            + random.uniform(-3, 3),
            2
        ),

        "humidity_max_pct": round(
            profile["humidity_max_pct"]
            + random.uniform(-3, 3),
            2
        ),

        "rainfall_min_mm": round(
            profile["rainfall_min_mm"]
            + random.uniform(-30, 30),
            2
        ),

        "rainfall_max_mm": round(
            profile["rainfall_max_mm"]
            + random.uniform(-50, 50),
            2
        ),


        # ----------------------------------------------------
        # WATER / IRRIGATION
        # ----------------------------------------------------

        "water_requirement_l_day": round(
            profile["water_requirement_l_day"]
            + random.uniform(-1.5, 1.5),
            2
        ),

        "irrigation_frequency_days": random.choice(
            [
                max(1, profile["irrigation_frequency_days"] - 1),
                profile["irrigation_frequency_days"],
                profile["irrigation_frequency_days"],
                profile["irrigation_frequency_days"] + 1
            ]
        ),

        "drought_tolerance_index": round(
            profile["drought_tolerance_index"]
            + random.uniform(-0.04, 0.04),
            3
        ),

        "heat_tolerance_index": round(
            profile["heat_tolerance_index"]
            + random.uniform(-0.04, 0.04),
            3
        ),


        # ----------------------------------------------------
        # CROP GROWTH
        # ----------------------------------------------------

        "crop_duration_days": round(
            profile["crop_duration_days"]
            + random.uniform(-5, 5),
            1
        ),

        "bud_burst_days": round(
            profile["bud_burst_days"]
            + random.uniform(-1, 1),
            1
        ),

        "vegetative_days": round(
            profile["vegetative_days"]
            + random.uniform(-3, 3),
            1
        ),

        "flowering_days": round(
            profile["flowering_days"]
            + random.uniform(-3, 3),
            1
        ),

        "fruit_development_days": round(
            profile["fruit_development_days"]
            + random.uniform(-4, 4),
            1
        ),

        "harvest_days": round(
            profile["harvest_days"]
            + random.uniform(-5, 5),
            1
        ),


        # ----------------------------------------------------
        # YIELD
        # ----------------------------------------------------

        "expected_yield_ton_ha": round(
            profile["expected_yield_ton_ha"]
            + random.uniform(
                -profile["expected_yield_ton_ha"] * 0.08,
                profile["expected_yield_ton_ha"] * 0.08
            ),
            2
        ),


        # ----------------------------------------------------
        # DIGITAL TWIN / DECISION SUPPORT
        # ----------------------------------------------------

        "water_sensitivity": profile[
            "water_sensitivity"
        ],

        "climate_suitability": profile[
            "climate_suitability"
        ],

        "market_demand": profile[
            "market_demand"
        ],

        "profit_potential": profile[
            "profit_potential"
        ],

        "market_price_index": round(
            profile["market_price_index"]
            + random.uniform(-0.05, 0.05),
            3
        )
    }

    return record


# ============================================================
# READ EXISTING DATA
# ============================================================

print("\nReading existing crop database...")

if not os.path.exists(INPUT_FILE):

    raise FileNotFoundError(
        f"\nFile not found:\n{INPUT_FILE}"
    )

df_existing = pd.read_csv(INPUT_FILE)

print(
    f"Existing records: {len(df_existing)}"
)

print(
    f"Existing columns: {len(df_existing.columns)}"
)


# ============================================================
# REMOVE SOIL FEATURES
# ============================================================

soil_columns = [

    "soil_id",
    "preferred_soil_id",
    "soil_type",
    "soil_texture",
    "soil_ph",
    "soil_pH",
    "soil_ec",
    "soil_EC",
    "soil_drainage",
    "drainage",
    "organic_carbon",
    "organic_carbon_pct",
    "preferred_soil_ph_min",
    "preferred_soil_ph_max",
    "preferred_soil_ec_max"

]

df_existing = df_existing.drop(
    columns=[
        col
        for col in soil_columns
        if col in df_existing.columns
    ],
    errors="ignore"
)


# ============================================================
# NORMALIZE CROP COLUMN
# ============================================================

possible_crop_columns = [
    "crop_name",
    "crop",
    "Crop",
    "cropName"
]

existing_crop_column = None

for column in possible_crop_columns:

    if column in df_existing.columns:

        existing_crop_column = column
        break


# ============================================================
# CLEAN EXISTING MISSING VALUES
# ============================================================

print("\nChecking existing missing values...")

print(
    "Missing values before cleaning:",
    df_existing.isnull().sum().sum()
)


# Numeric columns
numeric_columns = df_existing.select_dtypes(
    include=["int64", "float64"]
).columns


for column in numeric_columns:

    if df_existing[column].isnull().any():

        median_value = df_existing[column].median()

        # If median is unavailable, use a positive value
        if pd.isna(median_value):

            median_value = 1.0

        df_existing[column] = (
            df_existing[column]
            .fillna(median_value)
        )


# Text columns
text_columns = df_existing.select_dtypes(
    include=["object"]
).columns


for column in text_columns:

    if df_existing[column].isnull().any():

        mode_value = df_existing[column].mode()

        if len(mode_value) > 0:

            replacement = mode_value.iloc[0]

        else:

            replacement = "Not Specified"

        df_existing[column] = (
            df_existing[column]
            .fillna(replacement)
        )


# ============================================================
# DETERMINE HOW MANY NEW RECORDS ARE REQUIRED
# ============================================================

current_count = len(df_existing)

records_required = max(
    0,
    TARGET_RECORDS - current_count
)

print(
    f"\nNew records required: {records_required}"
)


# ============================================================
# GENERATE NEW RECORDS
# ============================================================

new_records = []

for i in range(
    1,
    records_required + 1
):

    new_records.append(
        generate_crop_record(i)
    )


df_new = pd.DataFrame(
    new_records
)


# ============================================================
# COMBINE OLD + NEW
# ============================================================

df_final = pd.concat(
    [
        df_existing,
        df_new
    ],
    ignore_index=True,
    sort=False
)


# ============================================================
# REMOVE DUPLICATE COLUMNS
# ============================================================

df_final = df_final.loc[
    :,
    ~df_final.columns.duplicated()
]


# ============================================================
# HANDLE ANY COLUMNS CREATED BY OLD DATA
# ============================================================

numeric_columns = df_final.select_dtypes(
    include=["int64", "float64"]
).columns


for column in numeric_columns:

    if df_final[column].isnull().any():

        median_value = df_final[column].median()

        if pd.isna(median_value):

            median_value = 1.0

        df_final[column] = (
            df_final[column]
            .fillna(median_value)
        )


text_columns = df_final.select_dtypes(
    include=["object"]
).columns


for column in text_columns:

    if df_final[column].isnull().any():

        mode_value = df_final[column].mode()

        if len(mode_value) > 0:

            replacement = mode_value.iloc[0]

        else:

            replacement = "Not Specified"

        df_final[column] = (
            df_final[column]
            .fillna(replacement)
        )


# ============================================================
# FINAL MISSING VALUE CHECK
# ============================================================

missing_count = (
    df_final.isnull().sum().sum()
)

print(
    "\nMissing values after cleaning:",
    missing_count
)


# ============================================================
# CHECK FOR NaN / NULL / NONE
# ============================================================

print(
    "NaN values:",
    df_final.isna().sum().sum()
)


# ============================================================
# CHECK NUMERIC ZERO VALUES
# ============================================================

numeric_columns = df_final.select_dtypes(
    include=["int64", "float64"]
).columns

zero_count = (
    df_final[numeric_columns] == 0
).sum().sum()

print(
    "Numeric zero values:",
    zero_count
)


# ============================================================
# IMPORTANT:
# DO NOT REPLACE LEGITIMATE ZERO VALUES AUTOMATICALLY.
#
# The generated data itself does not intentionally create 0.
# If the original file contains a legitimate 0, it is retained.
# ============================================================


# ============================================================
# SAVE DATASET
# ============================================================

df_final.to_csv(
    OUTPUT_FILE,
    index=False
)


# ============================================================
# FINAL REPORT
# ============================================================

print("\n")
print("=" * 75)
print("          APOLLO AGRIVERSE CROP DATABASE")
print("=" * 75)

print(
    f"\nOriginal records : {current_count}"
)

print(
    f"New records      : {len(df_new)}"
)

print(
    f"Final records    : {len(df_final)}"
)

print(
    f"Total features   : {len(df_final.columns)}"
)

print(
    f"\nMissing values   : {df_final.isnull().sum().sum()}"
)

print(
    f"NaN values       : {df_final.isna().sum().sum()}"
)


# ============================================================
# CROP DISTRIBUTION
# ============================================================

print("\n")
print("=" * 75)
print("CROP DISTRIBUTION")
print("=" * 75)


if "crop_name" in df_final.columns:

    print(
        df_final["crop_name"]
        .value_counts()
    )

elif "crop" in df_final.columns:

    print(
        df_final["crop"]
        .value_counts()
    )

elif "Crop" in df_final.columns:

    print(
        df_final["Crop"]
        .value_counts()
    )


# ============================================================
# DATASET PREVIEW
# ============================================================

print("\n")
print("=" * 75)
print("FIRST 10 RECORDS")
print("=" * 75)

print(
    df_final.head(10).to_string(
        index=False
    )
)


# ============================================================
# OUTPUT
# ============================================================

print("\n")
print("=" * 75)
print("DATASET CREATED SUCCESSFULLY")
print("=" * 75)

print(
    f"\nSaved at:\n{OUTPUT_FILE}"
)