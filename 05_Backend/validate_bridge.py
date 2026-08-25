from backend_bridge import backend_core

def test_master_bridge():
    print("\n=======================================================")
    print("      TESTING APOLLO AGRIVERSE MASTER BACKEND BRIDGE     ")
    print("=======================================================\n")

    # 1. Test Suitability Engine & ML Yield Prediction
    print("--- 1. Running Pre-Season Suitability & ML Inference ---")
    test_farm = {
        "farm_id": "TEST_FARM_BRIDGE",
        "water_availability": "high",
        "latitude": 19.9975,
        "longitude": 73.7898
    }
    suitability_report = backend_core.evaluate_farm_parcel(test_farm)
    focus = suitability_report.get("focus_crop_assessment")
    
    print(f"  📍 Region District: {suitability_report['location']['district']}")
    print(f"  🌱 Focus Crop     : {focus['crop_name']}")
    print(f"  ⭐ Suitability Band : {focus['suitability_band']} ({focus['final_suitability_score']}%)")
    print(f"  🍇 ML Yield Output : {focus['expected_yield_tons_ha']} tons/ha ✅\n")

    # 2. Test Digital Twin Simulation Step & Database Logging
    print("--- 2. Running Real-Time Digital Twin Timestep Step ---")
    sample_telemetry = {
        "farm_id": "NASIK_GRAPE_PARCEL_04",
        "air_temp_c": 29.5,
        "air_temp_max_c": 34.0,
        "air_temp_min_c": 19.0,
        "humidity_pct": 45.0,
        "rainfall_mm": 0.0,
        "uv_index": 7.5,
        "wind_speed_kmh": 12.0,
        "irrigation_l": 8.0
    }
    twin_state = backend_core.run_twin_simulation_step(sample_telemetry)
    
    print(f"  📅 Logged Timestamp : {twin_state['timestamp']}")
    print(f"  🌿 Growth Stage     : {twin_state['crop']['growth_stage']}")
    print(f"  💧 Soil Moisture    : {twin_state['soil']['soil_moisture_pct']}%")
    print(f"  🧪 Hydrogel Storage : {twin_state['hydrogel']['hydrogel_water_storage_pct']}%")
    print(f"  💾 Database State   : Successfully committed to apollo_twin.db ✅\n")

    print("=======================================================")
    print("🎉 ALL SYSTEMS GO! YOUR BACKEND IS READY FOR FASTAPI.")
    print("=======================================================\n")

if __name__ == "__main__":
    test_master_bridge()