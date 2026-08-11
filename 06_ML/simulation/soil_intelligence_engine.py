import json
import os

class SoilIntelligenceEngine:
    """
    Evaluates current soil substrate state against dynamic crop phenology profiles
    to diagnose deficiencies and calculate precise intervention requirements.
    """
    def __init__(self, requirements_path=None):
        if requirements_path is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            requirements_path = os.path.join(current_dir, "crop_requirements.json")

        with open(requirements_path, "r") as f:
            self.crop_profiles = json.load(f)

    def diagnose_soil_health(self, soil_state: dict, crop_type: str = "grape", growth_stage: str = "flowering") -> dict:
        crop_data = self.crop_profiles.get(crop_type, {}).get(growth_stage.lower(), None)

        if not crop_data:
            # Fallback to flowering defaults if stage is unrecognized
            crop_data = self.crop_profiles.get("grape", {}).get("flowering")

        deficiencies = []
        interventions = []

        # 1. Hydrological Status Assessment
        moisture = soil_state.get("soil_moisture_pct", 0.0)
        moisture_target = crop_data["moisture_pct"]
        if moisture < moisture_target["min"]:
            deficiencies.append({"variable": "soil_moisture", "severity": "HIGH", "current": moisture, "target": moisture_target["optimal"]})
            interventions.append({"type": "IRRIGATION_AND_HYDROGEL_RELEASE", "action": "Trigger hydrogel osmotic release and supplemental drip irrigation."})
        elif moisture > moisture_target["max"]:
            deficiencies.append({"variable": "soil_moisture", "severity": "OVERWATERED", "current": moisture, "target": moisture_target["optimal"]})
            interventions.append({"type": "DRAINAGE_PAUSE", "action": "Pause active irrigation routines; soil is saturated."})

        # 2. Thermal Stress Assessment
        soil_temp = soil_state.get("soil_temp_c", 0.0)
        temp_target = crop_data["soil_temp_c"]
        if soil_temp > temp_target["max"]:
            deficiencies.append({"variable": "soil_temperature", "severity": "CRITICAL_HEAT", "current": soil_temp, "target": temp_target["optimal"]})
            interventions.append({"type": "MULCH_COOLING", "action": "Deploy or re-align reflective mulch sheets to mitigate surface thermal degradation."})

        # 3. Nutrient NPK Status Assessment
        n_val = soil_state.get("nitrogen_mgkg", 0.0)
        if n_val < crop_data["nitrogen_mgkg"]["min"]:
            deficiencies.append({"variable": "nitrogen", "severity": "MODERATE", "current": n_val, "target": crop_data["nitrogen_mgkg"]["optimal"]})
            interventions.append({"type": "FERTIGATION_N", "action": f"Apply Nitrogen fertigation: shortage of {round(crop_data['nitrogen_mgkg']['optimal'] - n_val, 2)} mg/kg."})

        p_val = soil_state.get("phosphorus_mgkg", 0.0)
        if p_val < crop_data["phosphorus_mgkg"]["min"]:
            deficiencies.append({"variable": "phosphorus", "severity": "LOW", "current": p_val, "target": crop_data["phosphorus_mgkg"]["optimal"]})
            interventions.append({"type": "FERTIGATION_P", "action": f"Apply Phosphorus boost: shortage of {round(crop_data['phosphorus_mgkg']['optimal'] - p_val, 2)} mg/kg."})

        k_val = soil_state.get("potassium_mgkg", 0.0)
        if k_val < crop_data["potassium_mgkg"]["min"]:
            deficiencies.append({"variable": "potassium", "severity": "HIGH", "current": k_val, "target": crop_data["potassium_mgkg"]["optimal"]})
            interventions.append({"type": "FERTIGATION_K", "action": f"Apply Potassium supplementation: shortage of {round(crop_data['potassium_mgkg']['optimal'] - k_val, 2)} mg/kg."})

        return {
            "crop_evaluated": crop_type,
            "growth_stage_evaluated": growth_stage,
            "soil_health_index": "OPTIMAL" if not deficiencies else "ATTENTION_REQUIRED",
            "detected_deficiencies": deficiencies,
            "recommended_interventions": interventions
        }

if __name__ == "__main__":
    engine = SoilIntelligenceEngine()
    sample_soil = {
        "soil_moisture_pct": 22.0,
        "soil_temp_c": 34.5,
        "nitrogen_mgkg": 35.0,
        "phosphorus_mgkg": 28.0,
        "potassium_mgkg": 190.0
    }
    diagnosis = engine.diagnose_soil_health(sample_soil, crop_type="grape", growth_stage="flowering")
    import pprint
    pprint.pprint(diagnosis)