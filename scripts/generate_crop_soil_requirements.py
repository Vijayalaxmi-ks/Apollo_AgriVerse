import csv
import os

# ============================================================
# APOLLO AGRIVERSE
# CROP-SOIL REQUIREMENTS DATASET GENERATOR
# ============================================================

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

OUTPUT_DIR = os.path.join(
    BASE_DIR,
    "02_Datasets",
    "Knowledge_Base"
)

OUTPUT_FILE = os.path.join(
    OUTPUT_DIR,
    "04_crop_soil_requirements.csv"
)

os.makedirs(OUTPUT_DIR, exist_ok=True)


# ============================================================
# DATASET COLUMNS
# ============================================================

COLUMNS = [
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


# ============================================================
# SOIL INFORMATION
# ============================================================

soils = {
    "black_cotton": {
        "name": "Black Cotton Soil",
        "texture": "Clay"
    },

    "alluvial_soil": {
        "name": "Alluvial Soil",
        "texture": "Silt Loam"
    },

    "red_loam": {
        "name": "Red Loam Soil",
        "texture": "Sandy Loam"
    },

    "lateritic_soil": {
        "name": "Lateritic Soil",
        "texture": "Clay Loam"
    },

    "saline_alkaline": {
        "name": "Saline-Alkaline Soil",
        "texture": "Silty Clay"
    }
}


# ============================================================
# GRAPE VARIETIES
# ============================================================

varieties = [
    {
        "variety_id": "grape_thompson",
        "variety_name": "Thompson Seedless"
    },

    {
        "variety_id": "grape_tas_a_ganesh",
        "variety_name": "Tas-A-Ganesh"
    },

    {
        "variety_id": "grape_sharad",
        "variety_name": "Sharad Seedless"
    },

    {
        "variety_id": "grape_manjari_naveen",
        "variety_name": "Manjari Naveen"
    },

    {
        "variety_id": "grape_manjari_shyama",
        "variety_name": "Manjari Shyama"
    }
]


# ============================================================
# HYPOTHETICAL SOIL-VARIETY SUITABILITY KNOWLEDGE
#
# IMPORTANT:
# These are synthetic/hypothetical knowledge-base values
# for the Apollo prototype. They are NOT presented as
# laboratory measurements or field trial results.
# ============================================================

suitability = {

    # --------------------------------------------------------
    # THOMPSON SEEDLESS
    # --------------------------------------------------------

    "grape_thompson": {

        "black_cotton": {
            "ph_min": 6.5,
            "ph_max": 8.0,
            "ec_max": 1.5,
            "moisture_min": 18,
            "moisture_max": 32,
            "n": 150,
            "p": 20,
            "k": 250,
            "om": 0.8,
            "drainage": "Well-drained",
            "water": "Moderate",
            "soil_score": 88,
            "yield_score": 86,
            "compatibility": 0.88,
            "notes": "Good compatibility; drainage management is important in heavy clay soil."
        },

        "alluvial_soil": {
            "ph_min": 6.5,
            "ph_max": 8.0,
            "ec_max": 1.5,
            "moisture_min": 16,
            "moisture_max": 30,
            "n": 150,
            "p": 20,
            "k": 250,
            "om": 0.8,
            "drainage": "Well-drained",
            "water": "Moderate",
            "soil_score": 94,
            "yield_score": 93,
            "compatibility": 0.94,
            "notes": "Highly suitable when drainage and nutrient availability are maintained."
        },

        "red_loam": {
            "ph_min": 6.0,
            "ph_max": 7.5,
            "ec_max": 1.5,
            "moisture_min": 15,
            "moisture_max": 28,
            "n": 150,
            "p": 20,
            "k": 250,
            "om": 1.0,
            "drainage": "Well-drained",
            "water": "Moderate",
            "soil_score": 84,
            "yield_score": 82,
            "compatibility": 0.84,
            "notes": "Suitable with adequate organic matter and balanced fertilization."
        },

        "lateritic_soil": {
            "ph_min": 5.8,
            "ph_max": 7.0,
            "ec_max": 1.2,
            "moisture_min": 16,
            "moisture_max": 28,
            "n": 160,
            "p": 25,
            "k": 260,
            "om": 1.0,
            "drainage": "Well-drained",
            "water": "Moderate",
            "soil_score": 68,
            "yield_score": 65,
            "compatibility": 0.68,
            "notes": "Moderate suitability; nutrient and organic matter management may be required."
        },

        "saline_alkaline": {
            "ph_min": 6.5,
            "ph_max": 8.0,
            "ec_max": 1.0,
            "moisture_min": 16,
            "moisture_max": 28,
            "n": 170,
            "p": 25,
            "k": 280,
            "om": 1.0,
            "drainage": "Well-drained",
            "water": "Moderate",
            "soil_score": 48,
            "yield_score": 45,
            "compatibility": 0.48,
            "notes": "Low suitability because salinity and sodium conditions can restrict grape performance."
        }
    },


    # --------------------------------------------------------
    # TAS-A-GANESH
    # --------------------------------------------------------

    "grape_tas_a_ganesh": {

        "black_cotton": {
            "ph_min": 6.5,
            "ph_max": 8.0,
            "ec_max": 1.5,
            "moisture_min": 18,
            "moisture_max": 32,
            "n": 150,
            "p": 20,
            "k": 250,
            "om": 0.8,
            "drainage": "Well-drained",
            "water": "Moderate",
            "soil_score": 86,
            "yield_score": 84,
            "compatibility": 0.86,
            "notes": "Good potential with effective drainage and moisture management."
        },

        "alluvial_soil": {
            "ph_min": 6.5,
            "ph_max": 8.0,
            "ec_max": 1.5,
            "moisture_min": 16,
            "moisture_max": 30,
            "n": 150,
            "p": 20,
            "k": 250,
            "om": 0.8,
            "drainage": "Well-drained",
            "water": "Moderate",
            "soil_score": 92,
            "yield_score": 91,
            "compatibility": 0.92,
            "notes": "Highly suitable soil condition with good drainage and nutrient availability."
        },

        "red_loam": {
            "ph_min": 6.0,
            "ph_max": 7.5,
            "ec_max": 1.5,
            "moisture_min": 15,
            "moisture_max": 28,
            "n": 150,
            "p": 20,
            "k": 250,
            "om": 1.0,
            "drainage": "Well-drained",
            "water": "Moderate",
            "soil_score": 86,
            "yield_score": 84,
            "compatibility": 0.86,
            "notes": "Good compatibility with adequate organic matter and nutrient management."
        },

        "lateritic_soil": {
            "ph_min": 5.8,
            "ph_max": 7.0,
            "ec_max": 1.2,
            "moisture_min": 16,
            "moisture_max": 28,
            "n": 160,
            "p": 25,
            "k": 260,
            "om": 1.0,
            "drainage": "Well-drained",
            "water": "Moderate",
            "soil_score": 70,
            "yield_score": 67,
            "compatibility": 0.70,
            "notes": "Moderate suitability; soil fertility and organic matter should be monitored."
        },

        "saline_alkaline": {
            "ph_min": 6.5,
            "ph_max": 8.0,
            "ec_max": 1.0,
            "moisture_min": 16,
            "moisture_max": 28,
            "n": 170,
            "p": 25,
            "k": 280,
            "om": 1.0,
            "drainage": "Well-drained",
            "water": "Moderate",
            "soil_score": 52,
            "yield_score": 48,
            "compatibility": 0.52,
            "notes": "Lower suitability under saline conditions; salinity management is required."
        }
    },


    # --------------------------------------------------------
    # SHARAD SEEDLESS
    # --------------------------------------------------------

    "grape_sharad": {

        "black_cotton": {
            "ph_min": 6.5,
            "ph_max": 8.0,
            "ec_max": 1.5,
            "moisture_min": 18,
            "moisture_max": 32,
            "n": 145,
            "p": 20,
            "k": 250,
            "om": 0.8,
            "drainage": "Well-drained",
            "water": "Moderate",
            "soil_score": 82,
            "yield_score": 80,
            "compatibility": 0.82,
            "notes": "Good suitability with controlled moisture and proper drainage."
        },

        "alluvial_soil": {
            "ph_min": 6.5,
            "ph_max": 8.0,
            "ec_max": 1.5,
            "moisture_min": 16,
            "moisture_max": 30,
            "n": 145,
            "p": 20,
            "k": 250,
            "om": 0.8,
            "drainage": "Well-drained",
            "water": "Moderate",
            "soil_score": 89,
            "yield_score": 88,
            "compatibility": 0.89,
            "notes": "Very good compatibility with suitable drainage and nutrient availability."
        },

        "red_loam": {
            "ph_min": 6.0,
            "ph_max": 7.5,
            "ec_max": 1.5,
            "moisture_min": 15,
            "moisture_max": 28,
            "n": 145,
            "p": 20,
            "k": 250,
            "om": 1.0,
            "drainage": "Well-drained",
            "water": "Moderate",
            "soil_score": 92,
            "yield_score": 91,
            "compatibility": 0.92,
            "notes": "Highly compatible with lighter well-drained soil conditions."
        },

        "lateritic_soil": {
            "ph_min": 5.8,
            "ph_max": 7.0,
            "ec_max": 1.2,
            "moisture_min": 16,
            "moisture_max": 28,
            "n": 160,
            "p": 25,
            "k": 260,
            "om": 1.0,
            "drainage": "Well-drained",
            "water": "Moderate",
            "soil_score": 72,
            "yield_score": 69,
            "compatibility": 0.72,
            "notes": "Moderate suitability with fertility improvement and moisture management."
        },

        "saline_alkaline": {
            "ph_min": 6.5,
            "ph_max": 8.0,
            "ec_max": 1.0,
            "moisture_min": 16,
            "moisture_max": 28,
            "n": 170,
            "p": 25,
            "k": 280,
            "om": 1.0,
            "drainage": "Well-drained",
            "water": "Moderate",
            "soil_score": 50,
            "yield_score": 47,
            "compatibility": 0.50,
            "notes": "Lower compatibility where salinity and sodium levels are high."
        }
    },


    # --------------------------------------------------------
    # MANJARI NAVEEN
    # --------------------------------------------------------

    "grape_manjari_naveen": {

        "black_cotton": {
            "ph_min": 6.5,
            "ph_max": 8.0,
            "ec_max": 1.5,
            "moisture_min": 18,
            "moisture_max": 32,
            "n": 150,
            "p": 20,
            "k": 260,
            "om": 0.8,
            "drainage": "Well-drained",
            "water": "Moderate",
            "soil_score": 85,
            "yield_score": 83,
            "compatibility": 0.85,
            "notes": "Good suitability with adequate drainage and potassium availability."
        },

        "alluvial_soil": {
            "ph_min": 6.5,
            "ph_max": 8.0,
            "ec_max": 1.5,
            "moisture_min": 16,
            "moisture_max": 30,
            "n": 150,
            "p": 20,
            "k": 260,
            "om": 0.8,
            "drainage": "Well-drained",
            "water": "Moderate",
            "soil_score": 91,
            "yield_score": 90,
            "compatibility": 0.91,
            "notes": "Very good soil compatibility under well-managed vineyard conditions."
        },

        "red_loam": {
            "ph_min": 6.0,
            "ph_max": 7.5,
            "ec_max": 1.5,
            "moisture_min": 15,
            "moisture_max": 28,
            "n": 150,
            "p": 20,
            "k": 260,
            "om": 1.0,
            "drainage": "Well-drained",
            "water": "Moderate",
            "soil_score": 88,
            "yield_score": 86,
            "compatibility": 0.88,
            "notes": "Good suitability with organic matter and nutrient management."
        },

        "lateritic_soil": {
            "ph_min": 5.8,
            "ph_max": 7.0,
            "ec_max": 1.2,
            "moisture_min": 16,
            "moisture_max": 28,
            "n": 160,
            "p": 25,
            "k": 270,
            "om": 1.0,
            "drainage": "Well-drained",
            "water": "Moderate",
            "soil_score": 70,
            "yield_score": 68,
            "compatibility": 0.70,
            "notes": "Moderate suitability; nutrient supplementation may be necessary."
        },

        "saline_alkaline": {
            "ph_min": 6.5,
            "ph_max": 8.0,
            "ec_max": 1.0,
            "moisture_min": 16,
            "moisture_max": 28,
            "n": 170,
            "p": 25,
            "k": 280,
            "om": 1.0,
            "drainage": "Well-drained",
            "water": "Moderate",
            "soil_score": 49,
            "yield_score": 46,
            "compatibility": 0.49,
            "notes": "Low suitability in strongly saline conditions."
        }
    },


    # --------------------------------------------------------
    # MANJARI SHYAMA
    # --------------------------------------------------------

    "grape_manjari_shyama": {

        "black_cotton": {
            "ph_min": 6.5,
            "ph_max": 8.0,
            "ec_max": 1.5,
            "moisture_min": 18,
            "moisture_max": 32,
            "n": 150,
            "p": 20,
            "k": 260,
            "om": 0.8,
            "drainage": "Well-drained",
            "water": "Moderate",
            "soil_score": 84,
            "yield_score": 82,
            "compatibility": 0.84,
            "notes": "Good compatibility when drainage and soil moisture are controlled."
        },

        "alluvial_soil": {
            "ph_min": 6.5,
            "ph_max": 8.0,
            "ec_max": 1.5,
            "moisture_min": 16,
            "moisture_max": 30,
            "n": 150,
            "p": 20,
            "k": 260,
            "om": 0.8,
            "drainage": "Well-drained",
            "water": "Moderate",
            "soil_score": 90,
            "yield_score": 89,
            "compatibility": 0.90,
            "notes": "Very good compatibility with well-drained alluvial soil."
        },

        "red_loam": {
            "ph_min": 6.0,
            "ph_max": 7.5,
            "ec_max": 1.5,
            "moisture_min": 15,
            "moisture_max": 28,
            "n": 150,
            "p": 20,
            "k": 260,
            "om": 1.0,
            "drainage": "Well-drained",
            "water": "Moderate",
            "soil_score": 89,
            "yield_score": 87,
            "compatibility": 0.89,
            "notes": "Good compatibility with appropriate nutrient and organic matter management."
        },

        "lateritic_soil": {
            "ph_min": 5.8,
            "ph_max": 7.0,
            "ec_max": 1.2,
            "moisture_min": 16,
            "moisture_max": 28,
            "n": 160,
            "p": 25,
            "k": 270,
            "om": 1.0,
            "drainage": "Well-drained",
            "water": "Moderate",
            "soil_score": 69,
            "yield_score": 66,
            "compatibility": 0.69,
            "notes": "Moderate suitability; fertility improvement may be required."
        },

        "saline_alkaline": {
            "ph_min": 6.5,
            "ph_max": 8.0,
            "ec_max": 1.0,
            "moisture_min": 16,
            "moisture_max": 28,
            "n": 170,
            "p": 25,
            "k": 280,
            "om": 1.0,
            "drainage": "Well-drained",
            "water": "Moderate",
            "soil_score": 47,
            "yield_score": 44,
            "compatibility": 0.47,
            "notes": "Low compatibility with high salinity and sodium conditions."
        }
    }
}


# ============================================================
# CREATE DATASET
# ============================================================

rows = []

requirement_number = 1

for variety in varieties:

    variety_id = variety["variety_id"]

    for soil_id, soil in soils.items():

        data = suitability[variety_id][soil_id]

        row = {
            "requirement_id": f"CSR_{requirement_number:03d}",
            "crop_id": "grape",
            "variety_id": variety_id,
            "soil_type": soil["name"],
            "preferred_texture": soil["texture"],

            "ph_min": data["ph_min"],
            "ph_max": data["ph_max"],
            "ec_max_ds_m": data["ec_max"],

            "minimum_soil_moisture_pct": data["moisture_min"],
            "maximum_soil_moisture_pct": data["moisture_max"],

            "nitrogen_min_mg_kg": data["n"],
            "phosphorus_min_mg_kg": data["p"],
            "potassium_min_mg_kg": data["k"],

            "organic_matter_min_pct": data["om"],

            "drainage_requirement": data["drainage"],
            "water_requirement_level": data["water"],

            "soil_suitability_score": data["soil_score"],
            "yield_potential_score": data["yield_score"],
            "compatibility_score": data["compatibility"],

            "recommendation_notes": data["notes"]
        }

        rows.append(row)

        requirement_number += 1


# ============================================================
# SAVE CSV
# ============================================================

with open(
    OUTPUT_FILE,
    "w",
    newline="",
    encoding="utf-8"
) as file:

    writer = csv.DictWriter(
        file,
        fieldnames=COLUMNS
    )

    writer.writeheader()
    writer.writerows(rows)


# ============================================================
# SUMMARY
# ============================================================

print("=" * 70)
print("APOLLO AGRIVERSE - CROP-SOIL REQUIREMENTS DATASET")
print("=" * 70)

print(f"Output file:")
print(OUTPUT_FILE)

print()
print(f"Number of varieties : {len(varieties)}")
print(f"Number of soil types: {len(soils)}")
print(f"Total records       : {len(rows)}")
print(f"Total features      : {len(COLUMNS)}")

print()
print("Dataset created successfully.")
print("=" * 70)