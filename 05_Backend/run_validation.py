from pathlib import Path
from services.external_apis import ExternalDataService
from services.knowledge_loader import KnowledgeBaseLoader
from services.suitability_engine import AgronomicSuitabilityEngine

base_dir = Path(__file__).resolve().parent.parent
datasets_dir = base_dir / "02_Datasets"

loader = KnowledgeBaseLoader(str(datasets_dir)).load_and_validate()
api_service = ExternalDataService()
engine = AgronomicSuitabilityEngine(loader=loader, api_service=api_service)

farm = {
    "farm_id": "TEST_FARM_01",
    "region_id": loader.regions_df["region_id"].iloc[0],
    "soil_id": loader.soils_df["soil_id"].iloc[0],
    "water_availability": "low",
    "latitude": 12.9716,
    "longitude": 77.5946,
}

report = engine.evaluate_farm(farm, top_n=3)

print("\n================ FARM SUITABILITY AUDIT REPORT ================")
print(
    f"Location: {report['location']['district']},"
    f" {report['location']['state']}"
)
print(
    f"Soil Profile: {report['soil_profile']['type']} | pH:"
    f" {report['soil_profile']['ph']:.2f} | OC: {report['soil_profile']['oc']}%"
    f" | EC: {report['soil_profile']['ec']} dS/m"
)
print(f"Water Availability: {report['water_availability'].upper()}")
print(f"Live Weather Telemetry Active: {report['live_weather_applied']}")

print("\n-----------------------------------------------------------------")
print("STAGE 1: AGRONOMIC HARD FILTER")
print("-----------------------------------------------------------------")
if report["disqualified_crops"]:
  print("❌ Disqualified Unsuitable Crops:")
  for disq in report["disqualified_crops"]:
    print(
        f"   - {disq['crop_name'].upper()}: Not recommended because regional conditions"
        f" fall short of strict growth requirements ({disq['reason']})."
    )
else:
  print("✅ All candidate crops passed agronomic threshold.")

print("\n-----------------------------------------------------------------")
print("STAGE 2: ECONOMIC RANKING & FINAL RECOMMENDATIONS")
print("-----------------------------------------------------------------")

# Helper function to translate technical parameters into clear farmer explanations
def translate_to_farmer_language(pro_con_string, crop_name):
    text = pro_con_string.lower()
    if "soil (ph)" in text:
        return f"• Acidity Balance: The soil pH is right in the safe neutral range, allowing plant roots in your bhumi to absorb nutrients easily without blockages."
    elif "soil (texture)" in text:
        return f"• Soil Type: Your field's structure holds natural moisture well and provides strong physical support for root and crop expansion."
    elif "soil (salinity" in text or "ec)" in text:
        return f"• Salt Levels: Salt concentration is very low, meaning zero risk of root-burn or chemical stress for your {crop_name}."
    elif "soil (organic carbon)" in text:
        return f"• Organic Matter: Natural organic nutrients in your field are at a healthy level to support steady growth."
    elif "climate (seasonal)" in text:
        return f"• Local Weather: Regional temperature patterns align safely with the natural comfort bounds of this crop."
    elif "climate (hydrology)" in text or "rainfall" in text:
        return f"• Seasonal Rainfall: Normal regional rainfall patterns support the general moisture needs of this crop."
    elif "water" in text and ("deficit" in text or "stress" in text or "micro-irrigation" in text):
        return f"• Water Management Alert: Because local water supply is low, supplemental drip or micro-irrigation will be needed during key growth stages to protect your yield."
    else:
        # Fallback to a clean descriptive presentation if it's another technical note
        return f"• Field Check: {pro_con_string}"

for rec in report["primary_recommendations"]:
  st = rec["score_tree"]
  soil_sub = st["soil"]["sub_tree"]
  crop_display_name = rec['crop_name'].upper()

  print("\n" + "=" * 65)
  print(
      f"🏆 {crop_display_name} — Recommended Choice"
      f" (Expected Market Profit: High | Mandi Price: ₹{st['market']['modal_price']}/qtl)"
  )
  print("=" * 65)

  print(f"  📊 Financial & Performance Overview:")
  print(f"     • Final Suitability Score: {rec['final_suitability_score']}% ({rec['suitability_band']})")
  print(f"     • Market Trend: {st['market']['trend']} (Price: ₹{st['market']['modal_price']}/qtl)")
  print(
      f"     -----------------------------------------------------------------"
  )

  print("\n  ✅ Why your bhumi is ready for this crop:")
  if rec["pros"]:
    for pro in rec["pros"]:
      translated_pro = translate_to_farmer_language(pro, crop_display_name)
      print(f"     {translated_pro}")
  else:
    print(f"     - Field conditions successfully clear all minimum growth criteria.")

  if rec["cons"] or rec["penalties_applied"]:
    print("\n  ⚠️ What you need to manage on your farm:")
    for con in rec["cons"]:
      translated_con = translate_to_farmer_language(con, crop_display_name)
      print(f"     {translated_con}")
    for pen in rec["penalties_applied"]:
      print(f"     - Farm Management Note: {pen}")

print("\n================================================================")