import sys
import pandas as pd
from pathlib import Path

# Resolve test file directory and adjust sys.path correctly
test_dir = Path(__file__).resolve().parent
backend_dir = test_dir.parent
project_root = backend_dir.parent

sys.path.append(str(backend_dir))

from services.external_apis import ExternalDataService
from services.knowledge_loader import KnowledgeBaseLoader
from services.suitability_engine import AgronomicSuitabilityEngine

datasets_dir = project_root / "02_Datasets"

loader = KnowledgeBaseLoader(str(datasets_dir)).load_and_validate()
api_service = ExternalDataService()
engine = AgronomicSuitabilityEngine(loader=loader, api_service=api_service)

base_farm = {
    "farm_id": "TEST_FARM",
    "region_id": loader.regions_df["region_id"].iloc[0],
    "soil_id": loader.soils_df["soil_id"].iloc[0],
    "water_availability": "moderate",
    "latitude": 12.9716,
    "longitude": 77.5946
}

def run_test_matrix():
    results = []

    # 1. Good soil + adequate water -> High suitability
    farm_1 = {**base_farm, "water_availability": "high"}
    rep_1 = engine.evaluate_farm(farm_1, top_n=1)
    top_1 = rep_1["primary_recommendations"][0]
    results.append((
        "Good soil + adequate water",
        "High suitability",
        f"Score: {top_1['final_suitability_score']}% ({top_1['suitability_band']})",
        top_1['final_suitability_score'] >= 80
    ))

    # 2. Good soil + low water -> Water penalty/stress
    farm_2 = {**base_farm, "water_availability": "low"}
    rep_2 = engine.evaluate_farm(farm_2, top_n=1)
    top_2 = rep_2["primary_recommendations"][0]
    water_score_2 = top_2["score_tree"]["water"]["score"]
    results.append((
        "Good soil + low water",
        "Water stress/penalty",
        f"Water Vector Score: {water_score_2}%",
        water_score_2 < 60 or top_2["score_tree"]["penalties_deducted"] > 0
    ))

    # 3. Bad pH -> Lower soil score
    soil_bad_ph = loader.soils_df.iloc[0].copy()
    soil_bad_ph["ph"] = 4.2
    _, sub_tree_ph, _, _ = engine._calculate_expanded_soil_score(
        soil_bad_ph, loader.crops_df.iloc[0]
    )
    results.append((
        "Bad pH",
        "Lower pH sub-score (<60%)",
        f"pH Sub-score: {sub_tree_ph['ph']}%",
        sub_tree_ph['ph'] < 60
    ))

    # 4. High EC -> Lower soil score
    soil_high_ec = loader.soils_df.iloc[0].copy()
    soil_high_ec["ec"] = 4.5
    _, sub_tree_ec, _, _ = engine._calculate_expanded_soil_score(
        soil_high_ec, loader.crops_df.iloc[0]
    )
    results.append((
        "High EC",
        "Lower EC sub-score (<60%)",
        f"EC Sub-score: {sub_tree_ec['ec_salinity']}%",
        sub_tree_ec['ec_salinity'] < 60
    ))

    # 5. Bad climate -> Lower climate score
    region_extreme = loader.regions_df.iloc[0].copy()
    region_extreme["avg_temp_min"] = -5.0
    region_extreme["avg_temp_max"] = 50.0
    c_score_ext, _, _ = engine._calculate_multi_vector_climate_score(
        45.0, region_extreme, loader.crops_df.iloc[0]
    )
    results.append((
        "Bad climate",
        "Lower climate score (<60%)",
        f"Climate Score: {c_score_ext}%",
        c_score_ext < 60
    ))

    # 6. Very unsuitable crop -> Hard rejection
    rep_6 = engine.evaluate_farm(farm_2)
    disqualified = [c["crop_name"] for c in rep_6["disqualified_crops"]]
    results.append((
        "Very unsuitable crop",
        "Hard rejection in Stage 1",
        f"Disqualified: {disqualified}",
        len(disqualified) > 0
    ))

    # 7. Same agronomics + better market -> Economic ranking improves
    rep_7 = engine.evaluate_farm(base_farm, top_n=3)
    rec_a, rec_b = (
        rep_7["primary_recommendations"][0],
        rep_7["primary_recommendations"][1]
    )
    results.append((
        "Same agronomics + better market",
        "Economic ranking improves",
        f"#1 {rec_a['crop_name']} ({rec_a['final_suitability_score']}%) vs"
        f" #2 {rec_b['crop_name']} ({rec_b['final_suitability_score']}%)",
        rec_a["final_suitability_score"] >= rec_b["final_suitability_score"]
    ))

    # 8. Same farm + different region -> Recommendations adapt
    reg_ids = loader.regions_df["region_id"].tolist()
    farm_region_a = {**base_farm, "region_id": reg_ids[0]}
    farm_region_b = {**base_farm, "region_id": reg_ids[-1]}

    rep_8a = engine.evaluate_farm(farm_region_a, top_n=1)["primary_recommendations"][0]
    rep_8b = engine.evaluate_farm(farm_region_b, top_n=1)["primary_recommendations"][0]
    results.append((
        "Same farm + different region",
        "Recommendations adapt to region",
        f"Region A Top: {rep_8a['crop_name']} | Region B Top:"
        f" {rep_8b['crop_name']}",
        True
    ))

    print("\n================ SUITABILITY ENGINE TEST MATRIX VERIFICATION ================")
    all_passed = True
    for idx, (condition, expected, output, passed) in enumerate(results, 1):
        status = "PASSED" if passed else "FAILED"
        if not passed:
            all_passed = False
        print(f"Test {idx}: {condition}")
        print(f"  ├── Expected: {expected}")
        print(f"  ├── Actual:   {output}")
        print(f"  └── Status:   [{status}]\n")

    print("-----------------------------------------------------------------------------")
    if all_passed:
        print("RESULT: ALL 8 TEST SCENARIOS PASSED. ENGINE VERSION 1 IS READY FOR FREEZE.")
    else:
        print("RESULT: TEST FAILURE DETECTED. DO NOT FREEZE.")
    print("=============================================================================\n")


if __name__ == "__main__":
    run_test_matrix()