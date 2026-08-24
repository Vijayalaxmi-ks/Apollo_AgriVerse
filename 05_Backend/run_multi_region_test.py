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
    focus_crop="GRAPE",
)

# Test Farm Profile (Nashik, Maharashtra)
test_farms = [
    {
        "farm_id": "FARM_NASHIK_01",
        "region_id": "REG_0254",  # Nashik region ID
        "soil_id": "SOIL_00001",
        "water_availability": "medium",
        "latitude": 20.0059,
        "longitude": 73.7897,
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
    print(f"🌱 Soil: {soil['type']}")
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
        for con in rec["decision_explanation"]["management"][:3]:
            print(f"⚠️ {con}")

        print("\n💰 MONEY OUTLOOK")
        market = rec["score_tree"]["market"]
        price = market.get("modal_price")
        price_text = f"₹{price}/qtl" if price is not None else "unavailable"
        print(f"Modal price: {price_text}; trend: {market.get('trend', 'STABLE')}.")

        print("\n👉 VERDICT:")
        print(
            f"{c_name} scores {rec['final_suitability_score']:.1f}% and is "
            f"{rec['suitability_band'].lower()} for this farm."
        )

        if rec.get("variety_recommendations"):
            print(f"\n🍇 BEST GRAPE VARIETIES FOR YOUR FARM")
            var_medals = ["🥇", "🥈", "🥉"]
            for v_idx, var in enumerate(rec["variety_recommendations"][:3]):
                v_medal = var_medals[v_idx] if v_idx < len(var_medals) else "•"
                print(f"\n{v_medal} {var['variety_name']}")
                traits = ", ".join(
                    f"{key.replace('_', ' ')}: {value}"
                    for key, value in var.get("traits", {}).items()
                )
                reason = " ".join(var.get("reasons", []) + var.get("cautions", []))
                print(
                    f"Best fit because it features: suitability score "
                    f"{var['suitability_score']:.1f}%; {traits}. {reason}"
                )
            
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