from pathlib import Path

from services.external_apis import ExternalDataService
from services.knowledge_loader import KnowledgeBaseLoader
from services.suitability_engine import AgronomicSuitabilityEngine


# ---------------------------------------------------------------------
# Apollo current prototype scope:
# Maharashtra farm + Maharashtra soil/region + grape-focused evaluation.
# ---------------------------------------------------------------------

base_dir = Path(__file__).resolve().parent.parent
datasets_dir = base_dir / "02_Datasets"

loader = KnowledgeBaseLoader(str(datasets_dir)).load_and_validate()
api_service = ExternalDataService()

engine = AgronomicSuitabilityEngine(
    loader=loader,
    api_service=api_service,
    state_scope="Maharashtra",
    focus_crop="GRAPE",
)


# Pick a real Maharashtra region and a black-soil/regur profile from the
# loaded knowledge base instead of hard-coding an unknown CSV ID.
maha_regions = loader.regions_df[
    loader.regions_df["state"].astype(str).str.strip().str.lower()
    == "maharashtra"
].copy()

if maha_regions.empty:
    raise RuntimeError(
        "No Maharashtra regions were found in the region knowledge base."
    )

# Prefer Nashik because grapes are the current Apollo prototype scope.
preferred_districts = [
    "Nashik",
    "Sangli",
    "Pune",
    "Satara",
    "Ahmednagar",
    "Solapur",
]

region_row = None
for district in preferred_districts:
    match = maha_regions[
        maha_regions["district"].astype(str).str.strip().str.lower()
        == district.lower()
    ]
    if not match.empty:
        region_row = match.iloc[0]
        break

if region_row is None:
    region_row = maha_regions.iloc[0]


soils = loader.soils_df.copy()
soil_text = soils.astype(str).agg(" ".join, axis=1).str.lower()
black_soils = soils[
    soil_text.str.contains("black|regur|vertisol", regex=True, na=False)
]

if black_soils.empty:
    soil_row = soils.iloc[0]
else:
    soil_row = black_soils.iloc[0]


farm = {
    "farm_id": "TEST_MH_GRAPE_01",
    "region_id": region_row["region_id"],
    "soil_id": soil_row["soil_id"],
    "water_availability": "medium",
    "latitude": 20.0059,   # Nashik-area prototype coordinate
    "longitude": 73.7897,
}

report = engine.evaluate_farm(farm, top_n=5)


# ---------------------------------------------------------------------
# Farmer-friendly report
# ---------------------------------------------------------------------

print("\n" + "=" * 72)
print("              APOLLO AGRIVERSE — FARM ADVISORY")
print("=" * 72)

location = report["location"]
soil = report["soil_profile"]

print(
    f"📍 Farm Region : {location['district']}, {location['state']}"
)
print(
    f"🌱 Soil        : {soil['type']} "
    f"(pH {soil['ph']:.2f}"
    + (f", OC {soil['oc']:.2f}%" if soil["oc"] is not None else "")
    + (f", EC {soil['ec']:.2f} dS/m" if soil["ec"] is not None else "")
    + ")"
)
print(f"💧 Water       : {report['water_availability'].upper()}")
print(
    f"🌦️ Live Weather: "
    f"{'Available' if report['live_weather_applied'] else 'Not available — using regional climate data'}"
)

print("\n" + "-" * 72)
print("🍇 CURRENT APOLLO FOCUS: GRAPE")
print("-" * 72)

focus = report["focus_crop_assessment"]

if focus is None:
    print("⚠️ Grape is not present in the current crop knowledge base.")
    print("   Add grape to the crop knowledge table before using grape recommendations.")
else:
    st = focus["score_tree"]

    print(
        f"🍇 Grape Agronomic Score : {focus['agronomic_score']:.1f}%"
    )
    print(
        f"💰 Grape Final Score     : {focus['final_suitability_score']:.1f}% "
        f"({focus['suitability_band']})"
    )

    market = st["market"]
    if market["modal_price"] is not None:
        print(
            f"📈 Market              : {market['trend']} | "
            f"Modal price ₹{market['modal_price']}/qtl"
        )
    else:
        print("📈 Market              : Current price unavailable")

    print("\nWhy Apollo considers this farm for grapes:")

    if focus["pros"]:
        for item in focus["pros"]:
            print(f"  ✅ {item}")
    else:
        print("  • No positive factors were recorded.")

    if focus["cons"]:
        print("\nWhat the farmer should watch:")
        for item in focus["cons"]:
            print(f"  ⚠️ {item}")

    print("\nScore breakdown:")
    print(
        f"  • Climate : {st['climate']['score']:.1f}/100"
    )
    print(
        f"  • Soil    : {st['soil']['score']:.1f}/100"
    )
    print(
        f"  • Water   : {st['water']['score']:.1f}/100"
    )
    print(
        f"  • Market  : {st['market']['score']:.1f}/100"
    )

    print(
        "\n👉 This is a suitability assessment, not a guarantee of yield. "
        "A field soil test and crop-specific agronomic validation are still required."
    )


# ---------------------------------------------------------------------
# Alternative Maharashtra crops
# ---------------------------------------------------------------------

print("\n" + "-" * 72)
print("🌾 OTHER MAHARASHTRA CROP OPTIONS")
print("-" * 72)

alternatives = [
    r for r in report["primary_recommendations"]
    if not r["is_focus_crop"]
]

if not alternatives:
    print("No additional Maharashtra crop candidates were available.")
else:
    for rank, rec in enumerate(alternatives, start=1):
        market = rec["score_tree"]["market"]

        price_text = (
            f"₹{market['modal_price']}/qtl"
            if market["modal_price"] is not None
            else "price unavailable"
        )

        print(
            f"{rank}. {rec['crop_name'].title()} — "
            f"{rec['final_suitability_score']:.1f}% "
            f"({rec['suitability_band']}) | Market: {price_text}"
        )


# ---------------------------------------------------------------------
# Agronomic hard-filter results
# ---------------------------------------------------------------------

print("\n" + "-" * 72)
print("🚫 CROPS NOT RECOMMENDED UNDER THIS FARM PROFILE")
print("-" * 72)

if report["disqualified_crops"]:
    for item in report["disqualified_crops"]:
        print(
            f"  ❌ {item['crop_name'].title()} — "
            f"{item['agronomic_score']:.1f}% | {item['reason']}"
        )
else:
    print("  None of the evaluated Maharashtra crops failed the agronomic threshold.")

print("\n" + "=" * 72)
print("Apollo recommendation complete.")
print("=" * 72)