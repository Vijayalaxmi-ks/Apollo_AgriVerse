import json
import os

class SubstrateIntelligenceEngine:
    """
    Unified Substrate Intelligence Engine for Apollo AgriVerse.
    Houses decision/intelligence logic for Soil, Hydrogel, and Mulch.
    """
    def __init__(self, requirements_path=None):
        if requirements_path is None:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            requirements_path = os.path.join(current_dir, "crop_requirements.json")

        with open(requirements_path, "r") as f:
            self.crop_profiles = json.load(f)

    def evaluate_soil(self, soil_state: dict, crop_type: str = "grape", growth_stage: str = "flowering") -> dict:
        """🌱 Soil Intelligence: Determines substrate health & deficit demands."""
        crop_data = self.crop_profiles.get(crop_type, {}).get(growth_stage.lower(), None)
        if not crop_data:
            crop_data = self.crop_profiles.get("grape", {}).get("flowering")

        deficiencies = []
        interventions = []

        # Moisture check
        moisture = soil_state.get("soil_moisture_pct", 0.0)
        m_target = crop_data["moisture_pct"]
        if moisture < m_target["min"]:
            deficiencies.append({"variable": "soil_moisture", "severity": "HIGH", "current": moisture, "target": m_target["optimal"]})
            interventions.append({"type": "WATER_DEMAND_TRIGGER", "action": "Substrate water deficit detected. Trigger hydrogel release."})

        # Thermal check
        soil_temp = soil_state.get("soil_temp_c", 0.0)
        t_target = crop_data["soil_temp_c"]
        if soil_temp > t_target["max"]:
            deficiencies.append({"variable": "soil_temperature", "severity": "CRITICAL_HEAT", "current": soil_temp, "target": t_target["optimal"]})
            interventions.append({"type": "THERMAL_STRESS_TRIGGER", "action": "Soil thermal stress detected. Assess mulch integrity."})

        # NPK checks
        for nut in ["nitrogen", "phosphorus", "potassium"]:
            val = soil_state.get(f"{nut}_mgkg", 0.0)
            target = crop_data[f"{nut}_mgkg"]
            if val < target["min"]:
                deficiencies.append({"variable": nut, "severity": "MODERATE", "current": val, "target": target["optimal"]})
                interventions.append({"type": f"FERTIGATION_{nut.upper()}", "action": f"Apply {nut.capitalize()} fertigation: shortage of {round(target['optimal'] - val, 2)} mg/kg."})

        return {
            "soil_health_index": "OPTIMAL" if not deficiencies else "ATTENTION_REQUIRED",
            "detected_deficiencies": deficiencies,
            "soil_demands": interventions
        }

    def evaluate_hydrogel(self, hydrogel_state: dict, soil_demands: list) -> dict:
        """💧 Hydrogel Intelligence: Responds to soil water demand."""
        water_requested = any(demand["type"] == "WATER_DEMAND_TRIGGER" for demand in soil_demands)
        storage_pct = hydrogel_state.get("hydrogel_water_storage_pct", 0.0)
        release_rate = hydrogel_state.get("hydrogel_release_rate_lhr", 0.0)

        if water_requested:
            if storage_pct > 15.0:
                decision = "ACTIVE_RELEASE"
                action = f"Hydrogel responding to demand: Releasing water at {release_rate} L/hr (Storage remaining: {storage_pct}%)."
            else:
                decision = "STORAGE_DEPLETED"
                action = "Hydrogel capacity below 15%! Immediate drip irrigation refill required."
        else:
            decision = "STANDBY_RETENTION"
            action = "Soil moisture adequate. Hydrogel maintaining passive water retention."

        return {
            "hydrogel_operational_status": decision,
            "recommended_action": action,
            "storage_level_pct": storage_pct
        }

    def evaluate_mulch(self, mulch_state: dict, soil_demands: list) -> dict:
        """🍂 Mulch Intelligence: Assesses structural wear & thermal cooling loss."""
        heat_stress = any(demand["type"] == "THERMAL_STRESS_TRIGGER" for demand in soil_demands)
        degradation_pct = mulch_state.get("mulch_degradation_pct", 0.0)
        cooling_c = mulch_state.get("effective_mulch_cooling_c", 0.0)

        if degradation_pct > 65.0:
            status = "CRITICAL_DEGRADATION"
            action = f"Mulch film is {degradation_pct}% degraded. Replacement recommended immediately."
        elif heat_stress and cooling_c < 2.0:
            status = "INSUFFICIENT_COOLING"
            action = f"Mulch cooling capacity decreased (-{cooling_c}°C). Reinforce with organic mulch layer."
        else:
            status = "FUNCTIONAL"
            action = f"Mulch film operating normally (-{cooling_c}°C cooling effect maintained)."

        return {
            "mulch_integrity_status": status,
            "recommended_action": action,
            "degradation_pct": degradation_pct
        }

if __name__ == "__main__":
    engine = SubstrateIntelligenceEngine()
    
    # Test Data
    sample_soil = {"soil_moisture_pct": 20.0, "soil_temp_c": 35.0, "nitrogen_mgkg": 30.0, "phosphorus_mgkg": 25.0, "potassium_mgkg": 180.0}
    sample_hydrogel = {"hydrogel_water_storage_pct": 65.0, "hydrogel_release_rate_lhr": 0.85}
    sample_mulch = {"mulch_degradation_pct": 45.0, "effective_mulch_cooling_c": 1.8}

    soil_res = engine.evaluate_soil(sample_soil, growth_stage="flowering")
    hydro_res = engine.evaluate_hydrogel(sample_hydrogel, soil_res["soil_demands"])
    mulch_res = engine.evaluate_mulch(sample_mulch, soil_res["soil_demands"])

    import pprint
    print("=== UNIFIED SUBSTRATE INTELLIGENCE TEST ===")
    pprint.pprint({"Soil_Intelligence": soil_res, "Hydrogel_Intelligence": hydro_res, "Mulch_Intelligence": mulch_res})