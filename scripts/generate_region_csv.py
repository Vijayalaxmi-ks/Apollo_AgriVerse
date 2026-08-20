import csv
import random
from pathlib import Path

# Seed for reproducible generation
random.seed(42)

# Define output path relative to project root
PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = PROJECT_ROOT / "02_Datasets" / "KnowledgeBase"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
FILE_PATH = OUTPUT_DIR / "05_region_climate_db.csv"

# Geographic Mapping
state_districts = {
    "Maharashtra": ["Pune", "Nashik", "Nagpur", "Ahmednagar", "Satara", "Kolhapur", "Aurangabad", "Solapur", "Amravati", "Jalgaon", "Nanded", "Latur", "Sangli", "Yavatmal", "Buldhana"],
    "Karnataka": ["Bangalore Urban", "Belagavi", "Mysuru", "Dharwad", "Shimoga", "Mandya", "Bellary", "Davangere", "Hassan", "Vijayapura", "Kalaburagi"],
    "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Firozpur", "Gurdaspur", "Sangrur", "Hoshiarpur"],
    "Gujarat": ["Rajkot", "Anand", "Surat", "Junagadh", "Vadodara", "Kheda", "Bhavnagar", "Amreli", "Banaskantha", "Mehsana"],
    "Uttar Pradesh": ["Varanasi", "Kanpur", "Lucknow", "Agra", "Prayagraj", "Bareilly", "Gorakhpur", "Aligarh", "Meerut", "Mathura"],
    "Madhya Pradesh": ["Indore", "Bhopal", "Ujjain", "Jabalpur", "Sagar", "Dewas", "Dhar", "Khargone", "Ratlam"],
    "Tamil Nadu": ["Coimbatore", "Madurai", "Salem", "Thanjavur", "Erode", "Tiruchirappalli", "Dindigul", "Tirunelveli"],
    "Andhra Pradesh": ["Guntur", "Krishna", "Kurnool", "Anantapur", "East Godavari", "West Godavari", "Prakasam"],
    "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Udaipur", "Sri Ganganagar", "Bikaner", "Alwar", "Chittorgarh"],
    "West Bengal": ["Burdwan", "Hooghly", "Nadia", "Murshidabad", "Birbhum", "Bankura", "Malda"]
}

climate_zones = ["Tropical Wet", "Tropical Dry", "Semi-Arid", "Humid Subtropical", "Arid"]

header = [
    "region_id",
    "state",
    "district",
    "sub_zone_code",
    "climate_zone",
    "average_temperature_c",
    "minimum_temperature_c",
    "maximum_temperature_c",
    "average_humidity_pct",
    "annual_rainfall_mm",
    "monsoon_rainfall_mm",
    "growing_season_months",
    "frost_risk",
    "heat_stress_risk"
]

rows = []
TOTAL_ENTRIES = 1000

for i in range(1, TOTAL_ENTRIES + 1):
    region_id = f"REG_{i:04d}"
    state = random.choice(list(state_districts.keys()))
    district = random.choice(state_districts[state])
    sub_zone = f"{district[:3].upper()}-BLOCK-{(i % 8) + 1}"
    climate = random.choice(climate_zones)
    
    if climate == "Arid":
        min_temp = round(random.uniform(5.0, 14.0), 1)
        max_temp = round(random.uniform(38.0, 46.0), 1)
        annual_rain = random.randint(200, 500)
        humidity = random.randint(25, 50)
    elif climate in ["Tropical Wet", "Humid Subtropical"]:
        min_temp = round(random.uniform(14.0, 22.0), 1)
        max_temp = round(random.uniform(30.0, 38.0), 1)
        annual_rain = random.randint(1200, 2800)
        humidity = random.randint(65, 90)
    else:
        min_temp = round(random.uniform(10.0, 18.0), 1)
        max_temp = round(random.uniform(34.0, 42.0), 1)
        annual_rain = random.randint(500, 1100)
        humidity = random.randint(45, 70)

    avg_temp = round((min_temp + max_temp) / 2 + random.uniform(-1.5, 1.5), 1)
    monsoon_pct = random.uniform(0.70, 0.85)
    monsoon_rain = round(annual_rain * monsoon_pct)
    growing_season = random.randint(4, 12)
    
    frost_risk = True if min_temp < 8.0 else False
    heat_stress_risk = True if max_temp > 40.0 else False
    
    rows.append([
        region_id,
        state,
        district,
        sub_zone,
        climate,
        avg_temp,
        min_temp,
        max_temp,
        humidity,
        annual_rain,
        monsoon_rain,
        growing_season,
        frost_risk,
        heat_stress_risk
    ])

with open(FILE_PATH, mode="w", newline="", encoding="utf-8") as file:
    writer = csv.writer(file)
    writer.writerow(header)
    writer.writerows(rows)

print(f"File successfully created at: {FILE_PATH.resolve()}")