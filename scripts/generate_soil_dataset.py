import csv
import random
from pathlib import Path

# ============================================================
# APOLLO AGRIVERSE
# Synthetic Intelligent Soil Knowledge Dataset
# ============================================================

# Number of synthetic records
NUM_ROWS = 5000

# Project root:
# scripts/generate_soil.py -> go one folder up
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Output location
OUTPUT_FILE = (
    PROJECT_ROOT
    / "02_Datasets"
    / "KnowledgeBase"
    / "03_soil_database.csv"
)

# ------------------------------------------------------------
# 36 FEATURES
# ------------------------------------------------------------

FIELDS = [
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
# SOIL PROFILES
# These are generalized hypothetical profiles.
# ------------------------------------------------------------

SOIL_PROFILES = {

    "Black Soil": {
        "textures": ["Clay", "Clay Loam"],
        "sand": (15, 35),
        "silt": (20, 35),
        "clay": (35, 55),
        "depth": (80, 180),
        "bulk_density": (1.15, 1.40),
        "ph": (7.0, 8.2),
        "ec": (0.30, 1.80),
        "om": (0.8, 1.8),
        "cec": (35, 65),
        "ca": (2500, 6000),
        "mg": (500, 1500),
        "na": (100, 500),
        "n": (180, 350),
        "p": (15, 45),
        "k": (250, 600),
        "s": (10, 30),
        "fe": (20, 60),
        "zn": (0.5, 2.5),
        "cu": (0.3, 2.0),
        "mn": (10, 50),
        "b": (0.2, 1.2),
        "temp": (23, 31)
    },

    "Alluvial Soil": {
        "textures": ["Silt Loam", "Loam", "Sandy Loam"],
        "sand": (25, 50),
        "silt": (25, 55),
        "clay": (10, 30),
        "depth": (60, 160),
        "bulk_density": (1.25, 1.55),
        "ph": (6.5, 7.8),
        "ec": (0.20, 1.20),
        "om": (0.7, 1.6),
        "cec": (15, 35),
        "ca": (1500, 4000),
        "mg": (300, 1000),
        "na": (50, 350),
        "n": (150, 300),
        "p": (12, 40),
        "k": (180, 450),
        "s": (8, 25),
        "fe": (15, 50),
        "zn": (0.5, 2.0),
        "cu": (0.2, 1.5),
        "mn": (8, 40),
        "b": (0.2, 1.0),
        "temp": (22, 32)
    },

    "Red Soil": {
        "textures": ["Sandy Loam", "Loam"],
        "sand": (45, 70),
        "silt": (15, 30),
        "clay": (10, 25),
        "depth": (45, 120),
        "bulk_density": (1.35, 1.65),
        "ph": (5.5, 7.0),
        "ec": (0.10, 0.90),
        "om": (0.4, 1.2),
        "cec": (8, 22),
        "ca": (500, 2200),
        "mg": (150, 700),
        "na": (30, 200),
        "n": (90, 220),
        "p": (8, 30),
        "k": (100, 300),
        "s": (5, 20),
        "fe": (30, 100),
        "zn": (0.3, 1.5),
        "cu": (0.2, 1.2),
        "mn": (10, 70),
        "b": (0.1, 0.8),
        "temp": (24, 34)
    },

    "Lateritic Soil": {
        "textures": ["Clay Loam", "Loam"],
        "sand": (30, 50),
        "silt": (20, 35),
        "clay": (20, 40),
        "depth": (30, 100),
        "bulk_density": (1.30, 1.60),
        "ph": (4.8, 6.5),
        "ec": (0.10, 0.80),
        "om": (0.5, 1.5),
        "cec": (8, 25),
        "ca": (400, 1800),
        "mg": (100, 600),
        "na": (20, 150),
        "n": (80, 200),
        "p": (5, 25),
        "k": (80, 250),
        "s": (5, 18),
        "fe": (50, 150),
        "zn": (0.2, 1.3),
        "cu": (0.2, 1.5),
        "mn": (15, 90),
        "b": (0.1, 0.7),
        "temp": (23, 32)
    },

    "Saline-Alkaline Soil": {
        "textures": ["Silty Clay", "Clay Loam"],
        "sand": (10, 30),
        "silt": (25, 45),
        "clay": (30, 55),
        "depth": (40, 120),
        "bulk_density": (1.25, 1.55),
        "ph": (8.0, 9.2),
        "ec": (2.0, 5.5),
        "om": (0.3, 1.0),
        "cec": (25, 50),
        "ca": (1500, 4500),
        "mg": (400, 1200),
        "na": (500, 2000),
        "n": (70, 180),
        "p": (5, 25),
        "k": (150, 400),
        "s": (8, 30),
        "fe": (15, 50),
        "zn": (0.2, 1.2),
        "cu": (0.2, 1.3),
        "mn": (5, 40),
        "b": (0.3, 1.5),
        "temp": (24, 35)
    }
}


def rand_range(value_range, decimals=2):
    """Generate a random value within a range."""
    return round(random.uniform(*value_range), decimals)


def calculate_porosity(bulk_density):
    """
    Approximate soil porosity from bulk density.
    Assumes particle density around 2.65 g/cm3.
    """
    porosity = (1 - bulk_density / 2.65) * 100
    return round(max(25, min(65, porosity)), 2)


def calculate_water_properties(texture, porosity):
    """Generate realistic water-related properties."""
    
    if "Clay" in texture:
        field_capacity = random.uniform(30, 45)
        wilting_point = random.uniform(15, 25)
        infiltration = random.uniform(5, 18)
        permeability = "Slow"

    elif "Sandy" in texture:
        field_capacity = random.uniform(10, 20)
        wilting_point = random.uniform(4, 9)
        infiltration = random.uniform(25, 70)
        permeability = "Rapid"

    else:
        field_capacity = random.uniform(20, 32)
        wilting_point = random.uniform(8, 16)
        infiltration = random.uniform(15, 40)
        permeability = "Moderate"

    whc = field_capacity - wilting_point

    return (
        round(max(5, min(50, whc)), 2),
        round(field_capacity, 2),
        round(wilting_point, 2),
        round(infiltration, 2),
        permeability
    )


def calculate_drainage(texture, infiltration):
    if infiltration >= 45:
        return "Excessive"
    elif infiltration >= 25:
        return "Well-drained"
    elif infiltration >= 12:
        return "Moderate"
    else:
        return "Poor"


def calculate_health(ph, ec, organic_matter, nitrogen, phosphorus, potassium):
    """
    Approximate soil health score from important indicators.
    This is a synthetic project score, not a laboratory standard.
    """

    score = 70

    # Organic matter
    if organic_matter >= 1.2:
        score += 8
    elif organic_matter < 0.5:
        score -= 8

    # pH
    if 6.0 <= ph <= 7.8:
        score += 8
    elif ph < 5.0 or ph > 8.5:
        score -= 12

    # EC
    if ec <= 1.5:
        score += 5
    elif ec > 3.0:
        score -= 15

    # Nutrients
    if nitrogen >= 180:
        score += 3

    if phosphorus >= 15:
        score += 2

    if potassium >= 250:
        score += 3

    return round(max(20, min(100, score)), 2)


# ------------------------------------------------------------
# GENERATE DATA
# ------------------------------------------------------------

random.seed(42)

rows = []

soil_types = list(SOIL_PROFILES.keys())

for i in range(1, NUM_ROWS + 1):

    soil_type = random.choice(soil_types)
    profile = SOIL_PROFILES[soil_type]

    texture = random.choice(profile["textures"])

    # Texture percentages
    sand = rand_range(profile["sand"], 2)
    silt = rand_range(profile["silt"], 2)
    clay = rand_range(profile["clay"], 2)

    # Normalize texture percentages to approximately 100%
    total = sand + silt + clay

    sand = round(sand / total * 100, 2)
    silt = round(silt / total * 100, 2)
    clay = round(100 - sand - silt, 2)

    # Basic properties
    depth = rand_range(profile["depth"], 1)
    bulk_density = rand_range(profile["bulk_density"], 2)

    porosity = calculate_porosity(bulk_density)

    (
        water_holding_capacity,
        field_capacity,
        wilting_point,
        infiltration,
        permeability
    ) = calculate_water_properties(texture, porosity)

    drainage = calculate_drainage(texture, infiltration)

    # Chemical properties
    ph = rand_range(profile["ph"], 2)
    ec = rand_range(profile["ec"], 2)

    organic_matter = rand_range(profile["om"], 2)

    # Approximate relationship:
    # Organic Carbon ≈ Organic Matter / 1.724
    organic_carbon = round(organic_matter / 1.724, 2)

    cec = rand_range(profile["cec"], 2)

    calcium = rand_range(profile["ca"], 1)
    magnesium = rand_range(profile["mg"], 1)
    sodium = rand_range(profile["na"], 1)

    # Nutrients
    nitrogen = rand_range(profile["n"], 1)
    phosphorus = rand_range(profile["p"], 1)
    potassium = rand_range(profile["k"], 1)
    sulfur = rand_range(profile["s"], 1)

    # Micronutrients
    iron = rand_range(profile["fe"], 1)
    zinc = rand_range(profile["zn"], 2)
    copper = rand_range(profile["cu"], 2)
    manganese = rand_range(profile["mn"], 1)
    boron = rand_range(profile["b"], 2)

    # Current soil condition
    moisture = round(
        random.uniform(
            max(5, wilting_point),
            min(45, field_capacity + 5)
        ),
        2
    )

    soil_temperature = rand_range(profile["temp"], 2)

    # Biological activity
    microbial_activity = random.uniform(30, 95)

    if organic_matter < 0.6:
        microbial_activity -= 10

    if ph < 5.5 or ph > 8.5:
        microbial_activity -= 10

    microbial_activity = round(
        max(10, min(100, microbial_activity)),
        2
    )

    # Soil health
    soil_health = calculate_health(
        ph,
        ec,
        organic_matter,
        nitrogen,
        phosphorus,
        potassium
    )

    row = {
        "soil_id": f"SOIL_{i:05d}",
        "soil_type": soil_type,
        "soil_texture": texture,
        "soil_depth_cm": depth,
        "bulk_density_g_cm3": bulk_density,

        "sand_pct": sand,
        "silt_pct": silt,
        "clay_pct": clay,
        "porosity_pct": porosity,
        "water_holding_capacity_pct": water_holding_capacity,
        "field_capacity_pct": field_capacity,
        "wilting_point_pct": wilting_point,
        "infiltration_rate_mm_hr": infiltration,
        "permeability_class": permeability,

        "ph": ph,
        "electrical_conductivity_ds_m": ec,
        "organic_matter_pct": organic_matter,
        "organic_carbon_pct": organic_carbon,
        "cation_exchange_capacity_cmol_kg": cec,
        "calcium_mg_kg": calcium,
        "magnesium_mg_kg": magnesium,
        "sodium_mg_kg": sodium,

        "nitrogen_mg_kg": nitrogen,
        "phosphorus_mg_kg": phosphorus,
        "potassium_mg_kg": potassium,
        "sulfur_mg_kg": sulfur,

        "iron_mg_kg": iron,
        "zinc_mg_kg": zinc,
        "copper_mg_kg": copper,
        "manganese_mg_kg": manganese,
        "boron_mg_kg": boron,

        "soil_moisture_pct": moisture,
        "soil_temperature_c": soil_temperature,
        "microbial_activity_score": microbial_activity,
        "drainage_class": drainage,
        "soil_health_score": soil_health
    }

    rows.append(row)


# ------------------------------------------------------------
# SAVE CSV
# ------------------------------------------------------------

OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as file:

    writer = csv.DictWriter(file, fieldnames=FIELDS)

    writer.writeheader()
    writer.writerows(rows)


print("==============================================")
print("Apollo AgriVerse Soil Dataset Generated")
print("==============================================")
print(f"Records created : {len(rows)}")
print(f"Features        : {len(FIELDS)}")
print(f"Output file     : {OUTPUT_FILE}")
print("==============================================")