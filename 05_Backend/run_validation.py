from pathlib import Path
from services.knowledge_loader import KnowledgeBaseLoader
from services.suitability_engine import AgronomicSuitabilityEngine
from services.external_apis import ExternalDataService
from config import settings

base_dir = Path(__file__).resolve().parent.parent
datasets_dir = base_dir / "02_Datasets"

loader = KnowledgeBaseLoader(str(datasets_dir)).load_and_validate()
api_service = ExternalDataService(
    openweather_api_key=settings.OPENWEATHER_API_KEY,
    agmarknet_api_key=settings.AGMARKNET_API_KEY,
)

engine = AgronomicSuitabilityEngine(
    loader=loader,
    api_service=api_service,
    state_scope="Maharashtra",
    focus_crop="POMEGRANATE",
)

# Solapur validation scenario using a different district and a red-soil profile
# to test whether the suitability engine behaves sensibly for a non-Nashik farm.
test_farms = [
    {
        "farm_id": "FARM_MH_SOLAPUR_RED_01",
        "district": "Solapur",
        "region_id": "REG_0666",
        "soil_id": "SOIL_00002",
        "soil_type": "Red Soil",
        "water_availability": "medium",
        "latitude": 17.6599,
        "longitude": 75.9064,
    }
]

for farm in test_farms:
    report = engine.evaluate_farm(farm, top_n=3)
    loc = report["location"]
    soil = report["soil_profile"]

    print("=" * 64)
    print("        🍇 APOLLO AGRIVERSE — FARM ADVISORY")
    print("=" * 64)
    print(f"\n📍 Farm: {loc['district']}, {loc['state']}")
    print(f"🌱 Soil: {soil['type']} (pH {soil['ph']:.2f})")
    print(f"💧 Water: {report['water_availability'].capitalize()}")
    weather_status = "live" if report["live_weather_applied"] else "fallback"
    print(f"Weather data: {report['weather_source']} ({weather_status})")

    print("\n" + "-" * 64)
    print("🌾 WHAT SHOULD YOU GROW?")
    print("-" * 64)

    medals = ["🥇", "🥈", "🥉"]
    for idx, rec in enumerate(report["primary_recommendations"][:3]):
        medal = medals[idx] if idx < len(medals) else "•"
        c_name = rec["crop_name"].upper()
        status_label = "RECOMMENDED" if idx == 0 else "SUITABLE ALTERNATIVE"

        print(f"\n{medal} {idx + 1}. {c_name} — {status_label}\n")
        print("Why this crop fits your farm:")
        print(rec["decision_explanation"]["why"])
        for pro in rec["decision_explanation"]["strengths"][:3]:
            print(f"✅ {pro}")

        print("\n💰 MONEY OUTLOOK")
        market = rec["score_tree"]["market"]
        price_display = f"₹{market['modal_price']}/qtl" if market.get("modal_price") else "Available market demand"
        print(f"{c_name} market outlook: modal price {price_display}; trend {market.get('trend', 'STABLE')}.")

        if rec["decision_explanation"]["management"]:
            print("\n⚠️ WHAT YOU NEED TO MANAGE")
            for con in rec["decision_explanation"]["management"][:3]:
                print(f"• {con}")

        print("\n👉 VERDICT:")
        print(
            f"{c_name} scores {rec['final_suitability_score']:.1f}% overall "
            f"and is classified as {rec['suitability_band'].lower()} for this farm."
        )

        if rec.get("variety_recommendations"):
            print(f"\n🍇 BEST VARIETIES FOR THIS CROP")
            var_medals = ["🥇", "🥈", "🥉"]
            for v_idx, var in enumerate(rec["variety_recommendations"][:3]):
                v_medal = var_medals[v_idx] if v_idx < len(var_medals) else "•"
                print(f"\n{v_medal} {var['variety_name']}")
                traits = ", ".join(
                    f"{key.replace('_', ' ')}: {value}"
                    for key, value in var.get("traits", {}).items()
                )
                reason = " ".join(var.get("reasons", []) + var.get("cautions", []))
                details = "; ".join(
                    item for item in [
                        f"suitability score {var['suitability_score']:.1f}%",
                        traits,
                        reason,
                    ] if item
                )
                print(f"Best fit because it features: {details}")

        print("\n" + "-" * 64)

    print("\n⚠️ IMPORTANT")
    print("\nThis recommendation is based on the current farm profile,")
    print("regional climate and available market information.")
    print("\nBefore planting:")
    print("• perform a field soil test")
    print("• verify irrigation availability")
    print("• check current local mandi prices")
    print("• consult crop-specific agronomic guidance")

print("\n" + "=" * 64)
print("Advisory generation complete.")
print("=" * 64)
