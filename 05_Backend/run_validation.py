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
        f"   - {disq['crop_name']}: Agronomic Score = {disq['agronomic_score']}%"
        f" ({disq['reason']})"
    )
else:
  print("✅ All candidate crops passed agronomic threshold.")

print("\n-----------------------------------------------------------------")
print("STAGE 2: ECONOMIC RANKING & FINAL RECOMMENDATIONS")
print("-----------------------------------------------------------------")
for rec in report["primary_recommendations"]:
  st = rec["score_tree"]
  soil_sub = st["soil"]["sub_tree"]

  print("\n" + "=" * 65)
  print(
      f"🏆 {rec['crop_name']} — Final Score: {rec['final_suitability_score']}%"
      f" ({rec['suitability_band']})"
  )
  print(f"   [Agronomic Viability Score: {rec['agronomic_score']}%]")
  print("=" * 65)

  print("  📊 Two-Stage Score Tree Breakdown:")
  print(
      f"     ├── Climate Vector: {st['climate']['score']}/100 (Weight: 40%) ->"
      f" Contribution: {st['climate']['contribution']} pts"
  )
  print(
      f"     ├── Soil Vector:    {st['soil']['score']}/100 (Weight: 40%) ->"
      f" Contribution: {st['soil']['contribution']} pts"
  )
  print(f"     │    ├── pH Score:             {soil_sub['ph']}%")
  print(f"     │    ├── Texture Compatibility: {soil_sub['texture']}%")
  print(f"     │    ├── Organic Carbon (OC):  {soil_sub['organic_carbon']}%")
  print(f"     │    ├── Salinity (EC):        {soil_sub['ec_salinity']}%")
  print(f"     │    └── NPK Balance:          {soil_sub['npk_balance']}%")
  print(
      f"     ├── Water Vector:   {st['water']['score']}/100 (Weight: 20%) ->"
      f" Contribution: {st['water']['contribution']} pts"
  )
  print(
      f"     ├── Penalties:      -{st['penalties_deducted']} pts applied to"
      " Agronomic total"
  )
  print(
      f"     └── Market Ranker:  {st['market']['score']}/100 (Weight: 30%) ->"
      f" Contribution: {st['market']['contribution']} pts"
  )
  print(
      f"          (Modal Price: ₹{st['market']['modal_price']}/qtl | Trend:"
      f" {st['market']['trend']})"
  )
  print(
      "     -----------------------------------------------------------------"
  )
  print(
      f"     FINAL COMPOSITE SCORE: {rec['final_suitability_score']}/100.0"
  )

  if rec["pros"]:
    print("\n  ✅ Key Pros:")
    for pro in rec["pros"]:
      print(f"     - {pro}")

  if rec["cons"] or rec["penalties_applied"]:
    print("\n  ⚠️ Key Stress & Penalties:")
    for con in rec["cons"]:
      print(f"     - {con}")
    for pen in rec["penalties_applied"]:
      print(f"     - {pen}")

print("\n================================================================")