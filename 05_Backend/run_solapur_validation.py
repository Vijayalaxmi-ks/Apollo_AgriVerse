from pathlib import Path
from services.external_apis import ExternalDataService
from services.knowledge_loader import KnowledgeBaseLoader
from services.suitability_engine import AgronomicSuitabilityEngine

base_dir = Path(__file__).resolve().parent.parent
datasets_dir = base_dir / "02_Datasets"

loader = KnowledgeBaseLoader(str(datasets_dir)).load_and_validate()
api_service = ExternalDataService()

# Initialize the engine for Maharashtra, focusing on Pomegranate or Jowar/Pigeonpea which thrive in Solapur
engine = AgronomicSuitabilityEngine(
    loader=loader,
    api_service=api_service,
    state_scope="Maharashtra",
    focus_crop="POMEGRANATE",
)

# Custom farm profile for Solapur (using shallow/medium black soil & semi-arid coordinates)
solapur_farm = {
  "farm_id": "FARM_MH_SOLAPUR_01",
  "region_id": "REG_0005",             # Replace with the exact region_id from your regions.csv for Solapur
  "district": "Solapur",               # Added helper key for direct lookup
  "soil_id": "SOIL_00001",
  "water_availability": "low",
  "latitude": 17.6599,
  "longitude": 75.9064,
  "farm_area_ha": 3.0
}

# Run the evaluation
report = engine.evaluate_farm(solapur_farm, top_n=3)

print("\n" + "=" * 72)
print("              APOLLO AGRIVERSE — FARM ADVISORY (SOLAPUR)")
print("=" * 72)

location = report["location"]
soil = report["soil_profile"]
print(f"📍 Farm Region     : {location['district']}, {location['state']} (Region ID: {location['region_id']})")
print(f"🌱 Soil Profile    : {soil['type']} (Soil ID: {soil['soil_id']} | pH {soil['ph']:.2f})")
print(f"💧 Water Supply    : {report['water_availability'].upper()} (Semi-Arid Zone)")
print(f"🌦️ Live Weather    : {'Available' if report['live_weather_applied'] else 'Using Solapur regional climate baselines'}")

print("\n" + "-" * 72)
print("🏆 TOP 3 SUITABLE CROP PREFERENCES FOR THIS BHUMI")
print("-" * 72)

top_crops = report["primary_recommendations"][:3]
for rank, rec in enumerate(top_crops, start=1):
    market = rec["score_tree"]["market"]
    price_text = f"₹{market['modal_price']}/qtl" if market["modal_price"] is not None else "price unavailable"
    
    print(
        f"\n{rank}. {rec['crop_name'].upper()} — "
        f"Suitability Score: {rec['final_suitability_score']:.1f}% "
        f"({rec['suitability_band']}) | Mandi Price: {price_text}"
    )
    
    if rec["recommended_varieties"]:
        print("   🌱 Recommended Varieties:")
        for var in rec["recommended_varieties"]:
            print(f"      - {var['variety_name']} ({var['duration']}) | {var['trait']}")

    print("   ✅ Key Advantages:")
    for pro in rec["pros"][:2]:
        print(f"      • {pro}")

print("\n" + "-" * 72)
print("🚫 CROPS NOT RECOMMENDED UNDER THIS FARM PROFILE")
print("-" * 72)
if report["disqualified_crops"]:
    for item in report["disqualified_crops"]:
        print(f"  ❌ {item['crop_name'].title()} — {item['agronomic_score']:.1f}% | {item['reason']}")
else:
    print("  None of the evaluated crops failed the strict regional threshold.")

print("\n" + "=" * 72)
print("Solapur validation test complete.")
print("=" * 72)