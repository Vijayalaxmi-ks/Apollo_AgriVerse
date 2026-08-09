import sys
import os

# Ensure current simulation folder is in Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from twin_state_synchronizer import DigitalTwinStateSynchronizer

def run_simulation_test():
    print("=======================================================")
    print("  APOLLO AGRIVERSE DIGITAL TWIN SIMULATION ENGINE TEST ")
    print("=======================================================\n")

    synchronizer = DigitalTwinStateSynchronizer()

    # Simulate 5 consecutive days of microclimate telemetry
    sample_telemetry_days = [
        {"air_temp_c": 29.5, "air_temp_max_c": 33.0, "air_temp_min_c": 20.0, "humidity_pct": 55.0, "rainfall_mm": 0.0, "uv_index": 6.5},
        {"air_temp_c": 31.0, "air_temp_max_c": 35.0, "air_temp_min_c": 22.0, "humidity_pct": 45.0, "rainfall_mm": 0.0, "uv_index": 8.0},
        {"air_temp_c": 26.0, "air_temp_max_c": 28.0, "air_temp_min_c": 19.0, "humidity_pct": 80.0, "rainfall_mm": 25.0, "uv_index": 3.0},
        {"air_temp_c": 28.0, "air_temp_max_c": 31.0, "air_temp_min_c": 18.0, "humidity_pct": 60.0, "rainfall_mm": 0.0, "uv_index": 5.5},
        {"air_temp_c": 32.5, "air_temp_max_c": 36.0, "air_temp_min_c": 23.0, "humidity_pct": 40.0, "rainfall_mm": 0.0, "uv_index": 9.0}
    ]

    for day_idx, telemetry in enumerate(sample_telemetry_days, 1):
        output = synchronizer.sync_daily_state(telemetry)
        twin = output["digital_twin_state"]
        ml = output["ml_predictions"]

        print(f"--- DAY {day_idx} SYNCHRONIZED STATE VECTOR ---")
        print(f"  Crop Growth Stage  : {twin['crop_phenology']['growth_stage']} (GDD: {twin['crop_phenology']['cumulative_gdd']})")
        print(f"  Soil Moisture      : {twin['soil']['soil_moisture_pct']}% | Soil Temp: {twin['soil']['soil_temp_c']}°C")
        print(f"  Mulch Cooling      : -{twin['mulch']['effective_mulch_cooling_c']}°C (Degradation: {twin['mulch']['mulch_degradation_pct']}%)")
        print(f"  Hydrogel Release   : {twin['hydrogel']['hydrogel_release_rate_lhr']} L/hr (Storage: {twin['hydrogel']['hydrogel_water_storage_pct']}%)")
        print(f"  -> ML Hydrogel Req : {ml['predicted_required_hydrogel_storage_pct']}%")
        print(f"  -> ML Predicted Yield: {ml['predicted_grape_yield_tons_ha']} tons/ha\n")

    print("=======================================================")
    print("  SIMULATION TEST PASSED SUCCESSFULLY!                 ")
    print("=======================================================")

run_simulation_test()