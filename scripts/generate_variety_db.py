import pandas as pd
import numpy as np
import random
import os

# ============================================================
# APOLLO AGRIVERSE
# MAHARASHTRA GRAPE VARIETY DATABASE
# ============================================================

# ------------------------------------------------------------
# FILE PATHS
# ------------------------------------------------------------

INPUT_FILE = r"D:\Apollo_AgriVerse\02_Datasets\KnowledgeBase\02_crop_variety_database.csv"

OUTPUT_FILE = r"D:\Apollo_AgriVerse\02_Datasets\KnowledgeBase\02_crop_variety_database.csv"


# ------------------------------------------------------------
# SETTINGS
# ------------------------------------------------------------

NUMBER_OF_NEW_RECORDS = 1500

random.seed(42)
np.random.seed(42)


# ============================================================
# GRAPE VARIETY BASE PROFILES
#
# These are HYPOTHETICAL/SYNTHETIC values for your project.
# They are not direct farm measurements.
# ============================================================

variety_profiles = {

    "Thompson Seedless": {
        "berry_color": "Green",
        "berry_shape": "Ellipsoidal",
        "berry_size": "Medium",
        "seed_status": "Seedless",
        "bunch_size": "Large",

        "critical_flowering_moisture_pct": 35,
        "hydrogel_dosage_kg_ha": 2.5,
        "heat_tolerance_index": 0.85,

        "water_requirement_l_day": 18,
        "irrigation_frequency_days": 2,
        "drought_tolerance_index": 0.65,

        "optimal_temperature_min_c": 20,
        "optimal_temperature_max_c": 32,
        "critical_temperature_max_c": 40,

        "optimal_humidity_min_pct": 50,
        "optimal_humidity_max_pct": 70,

        "rainfall_requirement_mm": 650,

        "crop_duration_days": 125,
        "bud_burst_days": 20,
        "flowering_days": 45,
        "fruit_development_days": 75,
        "harvest_days": 120,

        "bunch_weight_g": 450,
        "berry_weight_g": 4.5,

        "expected_yield_ton_ha": 25,

        "sugar_brix_min": 18,
        "sugar_brix_max": 22,
        "acidity_pct": 0.65,

        "storage_days": 45,

        "fruit_cracking_risk": "Low",
        "powdery_mildew_risk": "Medium",
        "downy_mildew_risk": "Medium",
        "anthracnose_risk": "Low",

        "mulching_recommended": "Yes",
        "mulching_type": "Organic Mulch",
        "mulching_water_saving_pct": 18,

        "market_type": "Export",
        "export_suitability": "Excellent",
        "market_demand": "Very High",
        "profit_potential": "Very High"
    },


    "Tas-A-Ganesh": {
        "berry_color": "Green",
        "berry_shape": "Oval",
        "berry_size": "Large",
        "seed_status": "Seedless",
        "bunch_size": "Large",

        "critical_flowering_moisture_pct": 38,
        "hydrogel_dosage_kg_ha": 2.5,
        "heat_tolerance_index": 0.88,

        "water_requirement_l_day": 20,
        "irrigation_frequency_days": 2,
        "drought_tolerance_index": 0.62,

        "optimal_temperature_min_c": 21,
        "optimal_temperature_max_c": 33,
        "critical_temperature_max_c": 41,

        "optimal_humidity_min_pct": 50,
        "optimal_humidity_max_pct": 68,

        "rainfall_requirement_mm": 700,

        "crop_duration_days": 130,
        "bud_burst_days": 21,
        "flowering_days": 46,
        "fruit_development_days": 78,
        "harvest_days": 125,

        "bunch_weight_g": 500,
        "berry_weight_g": 5.5,

        "expected_yield_ton_ha": 29,

        "sugar_brix_min": 17,
        "sugar_brix_max": 21,
        "acidity_pct": 0.70,

        "storage_days": 40,

        "fruit_cracking_risk": "Medium",
        "powdery_mildew_risk": "Medium",
        "downy_mildew_risk": "Medium",
        "anthracnose_risk": "Medium",

        "mulching_recommended": "Yes",
        "mulching_type": "Plastic Mulch",
        "mulching_water_saving_pct": 22,

        "market_type": "Export",
        "export_suitability": "Excellent",
        "market_demand": "Very High",
        "profit_potential": "Very High"
    },


    "Sonaka": {
        "berry_color": "Green",
        "berry_shape": "Elongated",
        "berry_size": "Large",
        "seed_status": "Seedless",
        "bunch_size": "Large",

        "critical_flowering_moisture_pct": 39,
        "hydrogel_dosage_kg_ha": 3.0,
        "heat_tolerance_index": 0.87,

        "water_requirement_l_day": 20,
        "irrigation_frequency_days": 2,
        "drought_tolerance_index": 0.63,

        "optimal_temperature_min_c": 21,
        "optimal_temperature_max_c": 33,
        "critical_temperature_max_c": 41,

        "optimal_humidity_min_pct": 50,
        "optimal_humidity_max_pct": 70,

        "rainfall_requirement_mm": 680,

        "crop_duration_days": 128,
        "bud_burst_days": 21,
        "flowering_days": 46,
        "fruit_development_days": 78,
        "harvest_days": 123,

        "bunch_weight_g": 520,
        "berry_weight_g": 5.8,

        "expected_yield_ton_ha": 31,

        "sugar_brix_min": 18,
        "sugar_brix_max": 21,
        "acidity_pct": 0.68,

        "storage_days": 42,

        "fruit_cracking_risk": "Medium",
        "powdery_mildew_risk": "Medium",
        "downy_mildew_risk": "Medium",
        "anthracnose_risk": "Medium",

        "mulching_recommended": "Yes",
        "mulching_type": "Plastic Mulch",
        "mulching_water_saving_pct": 23,

        "market_type": "Export",
        "export_suitability": "Excellent",
        "market_demand": "Very High",
        "profit_potential": "Very High"
    },


    "Manik Chaman": {
        "berry_color": "Green",
        "berry_shape": "Elongated",
        "berry_size": "Large",
        "seed_status": "Seedless",
        "bunch_size": "Large",

        "critical_flowering_moisture_pct": 37,
        "hydrogel_dosage_kg_ha": 2.5,
        "heat_tolerance_index": 0.86,

        "water_requirement_l_day": 19,
        "irrigation_frequency_days": 2,
        "drought_tolerance_index": 0.65,

        "optimal_temperature_min_c": 20,
        "optimal_temperature_max_c": 33,
        "critical_temperature_max_c": 41,

        "optimal_humidity_min_pct": 50,
        "optimal_humidity_max_pct": 69,

        "rainfall_requirement_mm": 660,

        "crop_duration_days": 126,
        "bud_burst_days": 20,
        "flowering_days": 45,
        "fruit_development_days": 76,
        "harvest_days": 121,

        "bunch_weight_g": 505,
        "berry_weight_g": 5.7,

        "expected_yield_ton_ha": 28,

        "sugar_brix_min": 18,
        "sugar_brix_max": 21,
        "acidity_pct": 0.66,

        "storage_days": 43,

        "fruit_cracking_risk": "Low",
        "powdery_mildew_risk": "Medium",
        "downy_mildew_risk": "Medium",
        "anthracnose_risk": "Low",

        "mulching_recommended": "Yes",
        "mulching_type": "Organic Mulch",
        "mulching_water_saving_pct": 19,

        "market_type": "Export",
        "export_suitability": "Excellent",
        "market_demand": "High",
        "profit_potential": "Very High"
    },


    "Super Sonaka": {
        "berry_color": "Green",
        "berry_shape": "Elongated",
        "berry_size": "Very Large",
        "seed_status": "Seedless",
        "bunch_size": "Very Large",

        "critical_flowering_moisture_pct": 40,
        "hydrogel_dosage_kg_ha": 3.0,
        "heat_tolerance_index": 0.90,

        "water_requirement_l_day": 22,
        "irrigation_frequency_days": 2,
        "drought_tolerance_index": 0.58,

        "optimal_temperature_min_c": 21,
        "optimal_temperature_max_c": 34,
        "critical_temperature_max_c": 42,

        "optimal_humidity_min_pct": 50,
        "optimal_humidity_max_pct": 68,

        "rainfall_requirement_mm": 720,

        "crop_duration_days": 132,
        "bud_burst_days": 21,
        "flowering_days": 48,
        "fruit_development_days": 82,
        "harvest_days": 128,

        "bunch_weight_g": 600,
        "berry_weight_g": 6.2,

        "expected_yield_ton_ha": 32,

        "sugar_brix_min": 17,
        "sugar_brix_max": 20,
        "acidity_pct": 0.72,

        "storage_days": 45,

        "fruit_cracking_risk": "Medium",
        "powdery_mildew_risk": "Medium",
        "downy_mildew_risk": "Medium",
        "anthracnose_risk": "Medium",

        "mulching_recommended": "Yes",
        "mulching_type": "Plastic Mulch",
        "mulching_water_saving_pct": 24,

        "market_type": "Export",
        "export_suitability": "Excellent",
        "market_demand": "Very High",
        "profit_potential": "Very High"
    },


    "Clone 2A": {
        "berry_color": "Green",
        "berry_shape": "Ellipsoidal",
        "berry_size": "Large",
        "seed_status": "Seedless",
        "bunch_size": "Very Large",

        "critical_flowering_moisture_pct": 39,
        "hydrogel_dosage_kg_ha": 3.0,
        "heat_tolerance_index": 0.89,

        "water_requirement_l_day": 21,
        "irrigation_frequency_days": 2,
        "drought_tolerance_index": 0.60,

        "optimal_temperature_min_c": 21,
        "optimal_temperature_max_c": 33,
        "critical_temperature_max_c": 41,

        "optimal_humidity_min_pct": 50,
        "optimal_humidity_max_pct": 70,

        "rainfall_requirement_mm": 700,

        "crop_duration_days": 130,
        "bud_burst_days": 21,
        "flowering_days": 47,
        "fruit_development_days": 80,
        "harvest_days": 125,

        "bunch_weight_g": 590,
        "berry_weight_g": 6.0,

        "expected_yield_ton_ha": 30,

        "sugar_brix_min": 17,
        "sugar_brix_max": 21,
        "acidity_pct": 0.69,

        "storage_days": 44,

        "fruit_cracking_risk": "Medium",
        "powdery_mildew_risk": "Medium",
        "downy_mildew_risk": "Medium",
        "anthracnose_risk": "Medium",

        "mulching_recommended": "Yes",
        "mulching_type": "Plastic Mulch",
        "mulching_water_saving_pct": 23,

        "market_type": "Export",
        "export_suitability": "Excellent",
        "market_demand": "Very High",
        "profit_potential": "Very High"
    },


    "Sharad Seedless": {
        "berry_color": "Black",
        "berry_shape": "Oval",
        "berry_size": "Medium",
        "seed_status": "Seedless",
        "bunch_size": "Medium",

        "critical_flowering_moisture_pct": 34,
        "hydrogel_dosage_kg_ha": 2.0,
        "heat_tolerance_index": 0.76,

        "water_requirement_l_day": 17,
        "irrigation_frequency_days": 2,
        "drought_tolerance_index": 0.72,

        "optimal_temperature_min_c": 20,
        "optimal_temperature_max_c": 31,
        "critical_temperature_max_c": 39,

        "optimal_humidity_min_pct": 48,
        "optimal_humidity_max_pct": 65,

        "rainfall_requirement_mm": 600,

        "crop_duration_days": 115,
        "bud_burst_days": 18,
        "flowering_days": 42,
        "fruit_development_days": 70,
        "harvest_days": 110,

        "bunch_weight_g": 410,
        "berry_weight_g": 4.2,

        "expected_yield_ton_ha": 24,

        "sugar_brix_min": 19,
        "sugar_brix_max": 24,
        "acidity_pct": 0.60,

        "storage_days": 35,

        "fruit_cracking_risk": "Low",
        "powdery_mildew_risk": "Low",
        "downy_mildew_risk": "Medium",
        "anthracnose_risk": "Low",

        "mulching_recommended": "Yes",
        "mulching_type": "Organic Mulch",
        "mulching_water_saving_pct": 20,

        "market_type": "Export",
        "export_suitability": "Excellent",
        "market_demand": "Very High",
        "profit_potential": "Very High"
    },


    "Crimson Seedless": {
        "berry_color": "Red",
        "berry_shape": "Oval",
        "berry_size": "Medium",
        "seed_status": "Seedless",
        "bunch_size": "Large",

        "critical_flowering_moisture_pct": 36,
        "hydrogel_dosage_kg_ha": 2.5,
        "heat_tolerance_index": 0.78,

        "water_requirement_l_day": 18,
        "irrigation_frequency_days": 2,
        "drought_tolerance_index": 0.66,

        "optimal_temperature_min_c": 19,
        "optimal_temperature_max_c": 31,
        "critical_temperature_max_c": 39,

        "optimal_humidity_min_pct": 48,
        "optimal_humidity_max_pct": 65,

        "rainfall_requirement_mm": 620,

        "crop_duration_days": 120,
        "bud_burst_days": 19,
        "flowering_days": 43,
        "fruit_development_days": 74,
        "harvest_days": 115,

        "bunch_weight_g": 470,
        "berry_weight_g": 4.8,

        "expected_yield_ton_ha": 26,

        "sugar_brix_min": 17,
        "sugar_brix_max": 20,
        "acidity_pct": 0.63,

        "storage_days": 50,

        "fruit_cracking_risk": "Medium",
        "powdery_mildew_risk": "Medium",
        "downy_mildew_risk": "Medium",
        "anthracnose_risk": "Low",

        "mulching_recommended": "Yes",
        "mulching_type": "Plastic Mulch",
        "mulching_water_saving_pct": 21,

        "market_type": "Export",
        "export_suitability": "Excellent",
        "market_demand": "Very High",
        "profit_potential": "Very High"
    },


    "Flame Seedless": {
        "berry_color": "Red",
        "berry_shape": "Round",
        "berry_size": "Medium",
        "seed_status": "Seedless",
        "bunch_size": "Medium",

        "critical_flowering_moisture_pct": 35,
        "hydrogel_dosage_kg_ha": 2.0,
        "heat_tolerance_index": 0.79,

        "water_requirement_l_day": 17,
        "irrigation_frequency_days": 2,
        "drought_tolerance_index": 0.69,

        "optimal_temperature_min_c": 19,
        "optimal_temperature_max_c": 31,
        "critical_temperature_max_c": 39,

        "optimal_humidity_min_pct": 48,
        "optimal_humidity_max_pct": 66,

        "rainfall_requirement_mm": 610,

        "crop_duration_days": 112,
        "bud_burst_days": 18,
        "flowering_days": 41,
        "fruit_development_days": 70,
        "harvest_days": 108,

        "bunch_weight_g": 430,
        "berry_weight_g": 4.3,

        "expected_yield_ton_ha": 25,

        "sugar_brix_min": 17,
        "sugar_brix_max": 21,
        "acidity_pct": 0.61,

        "storage_days": 40,

        "fruit_cracking_risk": "Low",
        "powdery_mildew_risk": "Medium",
        "downy_mildew_risk": "Medium",
        "anthracnose_risk": "Low",

        "mulching_recommended": "Yes",
        "mulching_type": "Organic Mulch",
        "mulching_water_saving_pct": 19,

        "market_type": "Export",
        "export_suitability": "Excellent",
        "market_demand": "High",
        "profit_potential": "High"
    },


    "Manjari Naveen": {
        "berry_color": "Black",
        "berry_shape": "Round",
        "berry_size": "Large",
        "seed_status": "Seedless",
        "bunch_size": "Large",

        "critical_flowering_moisture_pct": 37,
        "hydrogel_dosage_kg_ha": 2.5,
        "heat_tolerance_index": 0.81,

        "water_requirement_l_day": 18,
        "irrigation_frequency_days": 2,
        "drought_tolerance_index": 0.68,

        "optimal_temperature_min_c": 20,
        "optimal_temperature_max_c": 32,
        "critical_temperature_max_c": 40,

        "optimal_humidity_min_pct": 48,
        "optimal_humidity_max_pct": 67,

        "rainfall_requirement_mm": 640,

        "crop_duration_days": 120,
        "bud_burst_days": 19,
        "flowering_days": 44,
        "fruit_development_days": 73,
        "harvest_days": 115,

        "bunch_weight_g": 560,
        "berry_weight_g": 5.0,

        "expected_yield_ton_ha": 27,

        "sugar_brix_min": 18,
        "sugar_brix_max": 21,
        "acidity_pct": 0.62,

        "storage_days": 40,

        "fruit_cracking_risk": "Low",
        "powdery_mildew_risk": "Low",
        "downy_mildew_risk": "Medium",
        "anthracnose_risk": "Low",

        "mulching_recommended": "Yes",
        "mulching_type": "Organic Mulch",
        "mulching_water_saving_pct": 20,

        "market_type": "Export",
        "export_suitability": "Excellent",
        "market_demand": "High",
        "profit_potential": "Very High"
    }
}


# ============================================================
# FUNCTION TO GENERATE ONE RECORD
# ============================================================

def generate_record(record_number):

    # Select one grape variety
    variety_name = random.choice(
        list(variety_profiles.keys())
    )

    profile = variety_profiles[variety_name]

    # Create unique ID
    variety_code = (
        variety_name
        .lower()
        .replace(" ", "_")
        .replace("-", "_")
    )

    variety_id = (
        f"grape_{variety_code}_{record_number:05d}"
    )

    # --------------------------------------------------------
    # Generate realistic variation around base values
    # --------------------------------------------------------

    record = {

        # BASIC
        "variety_id": variety_id,

        "crop_id": "crop_grape",

        "variety_name": variety_name,

        "state": "Maharashtra",

        "cultivation_region": random.choice([
            "Nashik",
            "Sangli",
            "Pune",
            "Ahmednagar",
            "Solapur"
        ]),

        # GRAPE CHARACTERISTICS
        "berry_color": profile["berry_color"],

        "berry_shape": profile["berry_shape"],

        "berry_size": profile["berry_size"],

        "seed_status": profile["seed_status"],

        "bunch_size": profile["bunch_size"],

        "bunch_weight_g": round(
            profile["bunch_weight_g"]
            + random.uniform(-30, 30),
            2
        ),

        "berry_weight_g": round(
            profile["berry_weight_g"]
            + random.uniform(-0.3, 0.3),
            2
        ),

        # ----------------------------------------------------
        # WATER / DIGITAL TWIN
        # ----------------------------------------------------

        "critical_flowering_moisture_pct": round(
            profile["critical_flowering_moisture_pct"]
            + random.uniform(-2, 2),
            2
        ),

        "critical_moisture_min_pct": round(
            profile["critical_flowering_moisture_pct"] - 8
            + random.uniform(-2, 2),
            2
        ),

        "critical_moisture_max_pct": round(
            profile["critical_flowering_moisture_pct"] + 15
            + random.uniform(-2, 2),
            2
        ),

        "water_requirement_l_day": round(
            profile["water_requirement_l_day"]
            + random.uniform(-1.5, 1.5),
            2
        ),

        "irrigation_frequency_days": random.choice([
            1, 2, 2, 2, 3
        ]),

        "drought_tolerance_index": round(
            profile["drought_tolerance_index"]
            + random.uniform(-0.03, 0.03),
            2
        ),

        # ----------------------------------------------------
        # HYDROGEL
        # ----------------------------------------------------

        "hydrogel_dosage_kg_ha": round(
            profile["hydrogel_dosage_kg_ha"]
            + random.uniform(-0.25, 0.25),
            2
        ),

        # ----------------------------------------------------
        # CLIMATE
        # ----------------------------------------------------

        "heat_tolerance_index": round(
            profile["heat_tolerance_index"]
            + random.uniform(-0.03, 0.03),
            2
        ),

        "optimal_temperature_min_c": round(
            profile["optimal_temperature_min_c"]
            + random.uniform(-1, 1),
            1
        ),

        "optimal_temperature_max_c": round(
            profile["optimal_temperature_max_c"]
            + random.uniform(-1, 1),
            1
        ),

        "critical_temperature_max_c": round(
            profile["critical_temperature_max_c"]
            + random.uniform(-1, 1),
            1
        ),

        "optimal_humidity_min_pct": round(
            profile["optimal_humidity_min_pct"]
            + random.uniform(-2, 2),
            1
        ),

        "optimal_humidity_max_pct": round(
            profile["optimal_humidity_max_pct"]
            + random.uniform(-2, 2),
            1
        ),

        "rainfall_requirement_mm": round(
            profile["rainfall_requirement_mm"]
            + random.uniform(-30, 30),
            1
        ),

        # ----------------------------------------------------
        # GROWTH
        # ----------------------------------------------------

        "crop_duration_days": round(
            profile["crop_duration_days"]
            + random.uniform(-4, 4),
            1
        ),

        "bud_burst_days": round(
            profile["bud_burst_days"]
            + random.uniform(-1, 1),
            1
        ),

        "flowering_days": round(
            profile["flowering_days"]
            + random.uniform(-2, 2),
            1
        ),

        "fruit_development_days": round(
            profile["fruit_development_days"]
            + random.uniform(-3, 3),
            1
        ),

        "harvest_days": round(
            profile["harvest_days"]
            + random.uniform(-4, 4),
            1
        ),

        # ----------------------------------------------------
        # YIELD
        # ----------------------------------------------------

        "expected_yield_ton_ha": round(
            profile["expected_yield_ton_ha"]
            + random.uniform(-2.5, 2.5),
            2
        ),

        # ----------------------------------------------------
        # QUALITY
        # ----------------------------------------------------

        "sugar_brix_min": round(
            profile["sugar_brix_min"]
            + random.uniform(-0.3, 0.3),
            2
        ),

        "sugar_brix_max": round(
            profile["sugar_brix_max"]
            + random.uniform(-0.3, 0.3),
            2
        ),

        "acidity_pct": round(
            profile["acidity_pct"]
            + random.uniform(-0.03, 0.03),
            2
        ),

        "storage_days": round(
            profile["storage_days"]
            + random.uniform(-3, 3),
            1
        ),

        "fruit_cracking_risk": profile[
            "fruit_cracking_risk"
        ],

        # ----------------------------------------------------
        # DISEASE
        # ----------------------------------------------------

        "powdery_mildew_risk": profile[
            "powdery_mildew_risk"
        ],

        "downy_mildew_risk": profile[
            "downy_mildew_risk"
        ],

        "anthracnose_risk": profile[
            "anthracnose_risk"
        ],

        # ----------------------------------------------------
        # MULCHING
        # ----------------------------------------------------

        "mulching_recommended": profile[
            "mulching_recommended"
        ],

        "mulching_type": profile[
            "mulching_type"
        ],

        "mulching_water_saving_pct": round(
            profile["mulching_water_saving_pct"]
            + random.uniform(-2, 2),
            2
        ),

        # ----------------------------------------------------
        # MARKET
        # ----------------------------------------------------

        "market_type": profile[
            "market_type"
        ],

        "export_suitability": profile[
            "export_suitability"
        ],

        "market_demand": profile[
            "market_demand"
        ],

        "profit_potential": profile[
            "profit_potential"
        ]
    }

    return record


# ============================================================
# GENERATE 1500 NEW RECORDS
# ============================================================

print("\nGenerating hypothetical grape records...")

new_records = []

for i in range(1, NUMBER_OF_NEW_RECORDS + 1):

    record = generate_record(i)

    new_records.append(record)


df_new = pd.DataFrame(new_records)


# ============================================================
# READ EXISTING DATASET
# ============================================================

print("Reading existing dataset...")

if os.path.exists(INPUT_FILE):

    df_existing = pd.read_csv(INPUT_FILE)

    print(
        f"Existing records found: {len(df_existing)}"
    )

else:

    print(
        "Existing file not found."
    )

    df_existing = pd.DataFrame()


# ============================================================
# KEEP ONLY GRAPE RECORDS FROM EXISTING DATA
# ============================================================

if not df_existing.empty:

    if "crop_id" in df_existing.columns:

        df_existing = df_existing[
            df_existing["crop_id"]
            .astype(str)
            .str.lower()
            .str.contains("grape", na=False)
        ].copy()


# ============================================================
# REMOVE SOIL COLUMNS
# ============================================================

soil_columns = [
    "preferred_soil_id",
    "soil_id",
    "soil_type",
    "soil_texture",
    "soil_ph",
    "soil_ec",
    "soil_drainage",
    "organic_carbon_pct",
    "preferred_soil_ph_min",
    "preferred_soil_ph_max",
    "preferred_soil_ec_max"
]

df_existing = df_existing.drop(
    columns=[
        column
        for column in soil_columns
        if column in df_existing.columns
    ],
    errors="ignore"
)


# ============================================================
# COMBINE EXISTING + NEW
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
# CHECK FOR MISSING VALUES
# ============================================================

missing_values = df_final.isnull().sum().sum()

print("\nTotal missing values:", missing_values)


# ============================================================
# IF OLD DATA HAS MISSING VALUES
# FILL THEM WITH VALID VALUES
# ============================================================

if missing_values > 0:

    print(
        "Existing dataset contains missing values."
    )

    # Numeric columns
    numeric_columns = df_final.select_dtypes(
        include=["int64", "float64"]
    ).columns

    for column in numeric_columns:

        if df_final[column].isnull().any():

            df_final[column] = df_final[column].fillna(
                df_final[column].median()
            )

    # Text columns
    text_columns = df_final.select_dtypes(
        include=["object"]
    ).columns

    for column in text_columns:

        if df_final[column].isnull().any():

            mode_value = df_final[column].mode()

            if len(mode_value) > 0:

                df_final[column] = df_final[column].fillna(
                    mode_value.iloc[0]
                )

            else:

                df_final[column] = df_final[column].fillna(
                    "Not Specified"
                )


# ============================================================
# FINAL CHECK
# ============================================================

print(
    "\nMissing values after cleaning:",
    df_final.isnull().sum().sum()
)


# ============================================================
# CHECK ZERO VALUES
# ============================================================

numeric_columns = df_final.select_dtypes(
    include=["int64", "float64"]
).columns

zero_values = (
    df_final[numeric_columns] == 0
).sum().sum()

print(
    "Total zero values:",
    zero_values
)


# ============================================================
# SAVE FINAL DATASET
# ============================================================

df_final.to_csv(
    OUTPUT_FILE,
    index=False
)


# ============================================================
# REPORT
# ============================================================

print("\n")
print("=" * 70)
print("       APOLLO AGRIVERSE GRAPE VARIETY DATABASE")
print("=" * 70)

print(
    f"\nOriginal grape records : {len(df_existing)}"
)

print(
    f"New hypothetical records: {len(df_new)}"
)

print(
    f"Final total records    : {len(df_final)}"
)

print(
    f"Total features         : {len(df_final.columns)}"
)

print("\nGrape varieties:")

for variety in sorted(
    df_final["variety_name"].unique()
):

    print(
        "  ✓",
        variety
    )


print("\n")
print("=" * 70)
print("VARIETY DISTRIBUTION")
print("=" * 70)

print(
    df_final["variety_name"].value_counts()
)


print("\n")
print("=" * 70)
print("DATASET SHAPE")
print("=" * 70)

print(
    df_final.shape
)


print("\n")
print("=" * 70)
print("SAMPLE DATA")
print("=" * 70)

print(
    df_final.head(10).to_string(index=False)
)


print("\n")
print("=" * 70)
print("FILE SAVED")
print("=" * 70)

print(OUTPUT_FILE)

print("\nDataset generation completed successfully.")