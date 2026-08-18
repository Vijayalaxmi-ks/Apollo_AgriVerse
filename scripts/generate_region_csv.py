import csv
from pathlib import Path

# Resolve project root directory relative to this script's location
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent

# Output directory path
output_dir = PROJECT_ROOT / "02_Datasets" / "KnowledgeBase"
output_dir.mkdir(parents=True, exist_ok=True)
csv_file_path = output_dir / "05_region_climate_database.csv"

# Dataset rows focusing on major grape-producing & agricultural regions in MH
region_data = [
    {
        "district": "Nashik",
        "state": "Maharashtra",
        "latitude": 20.011,
        "longitude": 73.790,
        "avg_annual_temp_c": 26.5,
        "avg_annual_rain_mm": 820,
        "dominant_soil_id": "black_cotton",
    },
    {
        "district": "Sangli",
        "state": "Maharashtra",
        "latitude": 16.852,
        "longitude": 74.581,
        "avg_annual_temp_c": 27.0,
        "avg_annual_rain_mm": 700,
        "dominant_soil_id": "black_cotton",
    },
    {
        "district": "Solapur",
        "state": "Maharashtra",
        "latitude": 17.659,
        "longitude": 75.906,
        "avg_annual_temp_c": 28.2,
        "avg_annual_rain_mm": 610,
        "dominant_soil_id": "black_cotton",
    },
    {
        "district": "Pune",
        "state": "Maharashtra",
        "latitude": 18.520,
        "longitude": 73.856,
        "avg_annual_temp_c": 25.0,
        "avg_annual_rain_mm": 750,
        "dominant_soil_id": "red_loam",
    },
    {
        "district": "Ahmednagar",
        "state": "Maharashtra",
        "latitude": 19.095,
        "longitude": 74.749,
        "avg_annual_temp_c": 27.1,
        "avg_annual_rain_mm": 580,
        "dominant_soil_id": "black_cotton",
    },
    {
        "district": "Satara",
        "state": "Maharashtra",
        "latitude": 17.680,
        "longitude": 73.993,
        "avg_annual_temp_c": 24.8,
        "avg_annual_rain_mm": 890,
        "dominant_soil_id": "red_loam",
    },
    {
        "district": "Osmanabad",
        "state": "Maharashtra",
        "latitude": 18.186,
        "longitude": 76.041,
        "avg_annual_temp_c": 27.8,
        "avg_annual_rain_mm": 680,
        "dominant_soil_id": "black_cotton",
    },
    {
        "district": "Latur",
        "state": "Maharashtra",
        "latitude": 18.408,
        "longitude": 76.560,
        "avg_annual_temp_c": 28.0,
        "avg_annual_rain_mm": 720,
        "dominant_soil_id": "black_cotton",
    },
    {
        "district": "Ratnagiri",
        "state": "Maharashtra",
        "latitude": 16.990,
        "longitude": 73.312,
        "avg_annual_temp_c": 27.5,
        "avg_annual_rain_mm": 3100,
        "dominant_soil_id": "lateritic_soil",
    },
    {
        "district": "Kolhapur",
        "state": "Maharashtra",
        "latitude": 16.705,
        "longitude": 74.243,
        "avg_annual_temp_c": 25.5,
        "avg_annual_rain_mm": 1100,
        "dominant_soil_id": "alluvial_soil",
    },
]

# Write CSV File
fieldnames = [
    "district",
    "state",
    "latitude",
    "longitude",
    "avg_annual_temp_c",
    "avg_annual_rain_mm",
    "dominant_soil_id",
]

with open(csv_file_path, mode="w", newline="", encoding="utf-8") as file:
    writer = csv.DictWriter(file, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(region_data)

print(
    f"Successfully generated: {csv_file_path.resolve()} with {len(region_data)} region records."
)