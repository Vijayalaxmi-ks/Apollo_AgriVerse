import numpy as np

class SoilStateModel:
    """
    Comprehensive Substrate State Model tracking Volumetric Water Content (VWC),
    NPK nutrient leaching/absorption, and soil pH buffering dynamics.
    """
    def __init__(self, moisture_pct=35.0, n_mgkg=150.0, p_mgkg=45.0, k_mgkg=210.0, soil_ph=6.5, soil_type="Loamy"):
        self.moisture_pct = float(moisture_pct)
        self.n_mgkg = float(n_mgkg)
        self.p_mgkg = float(p_mgkg)
        self.k_mgkg = float(k_mgkg)
        self.soil_ph = float(soil_ph)
        self.soil_type = soil_type
        
        # Soil Field Capacity & Wilting Point limits
        self.field_capacity = 42.0 if soil_type == "Clay" else (35.0 if soil_type == "Loamy" else 22.0)
        self.wilting_point = 18.0 if soil_type == "Clay" else (12.0 if soil_type == "Loamy" else 6.0)

    def update(self, air_temp_c: float, humidity_pct: float, rainfall_mm: float, 
               irrigation_l: float, hydrogel_release_lhr: float, 
               effective_mulch_cooling_c: float, growth_stage: str) -> dict:
        """
        Updates soil substrate parameters based on environmental flux.
        """
        # 1. Root-zone effective temperature considering mulch cooling
        effective_soil_temp = max(10.0, air_temp_c - effective_mulch_cooling_c)
        
        # 2. Simplified Hargreaves Potential Evapotranspiration (PET)
        vapor_pressure_deficit = max(0.1, (100.0 - humidity_pct) / 100.0 * (effective_soil_temp / 10.0))
        daily_evaporation = 0.18 * effective_soil_temp * vapor_pressure_deficit
        
        # 3. Water Inflow & Outflow Balancing
        water_inflow_pct = (rainfall_mm * 0.8) + (irrigation_l * 0.05) + (hydrogel_release_lhr * 0.4)
        net_moisture_change = water_inflow_pct - daily_evaporation
        
        self.moisture_pct = float(np.clip(self.moisture_pct + net_moisture_change, self.wilting_point * 0.5, self.field_capacity * 1.2))
        
        # 4. NPK Nutrient Depletion & Heavy Rainfall Leaching Logic
        stage_uptake_multiplier = 1.5 if growth_stage in ["Flowering", "Veraison"] else 0.8
        self.n_mgkg = float(max(10.0, self.n_mgkg - (0.12 * stage_uptake_multiplier) - (max(0.0, rainfall_mm - 30.0) * 0.5)))
        self.p_mgkg = float(max(5.0, self.p_mgkg - (0.04 * stage_uptake_multiplier)))
        self.k_mgkg = float(max(30.0, self.k_mgkg - (0.15 * stage_uptake_multiplier)))
        
        # 5. Soil Moisture Stress Index calculation
        stress_index = max(0.0, (self.field_capacity * 0.6 - self.moisture_pct) / (self.field_capacity * 0.6)) if self.moisture_pct < (self.field_capacity * 0.6) else 0.0

        return {
            "soil_moisture_pct": round(self.moisture_pct, 2),
            "soil_temp_c": round(effective_soil_temp, 2),
            "nitrogen_mgkg": round(self.n_mgkg, 2),
            "phosphorus_mgkg": round(self.p_mgkg, 2),
            "potassium_mgkg": round(self.k_mgkg, 2),
            "soil_ph": round(self.soil_ph, 2),
            "soil_moisture_stress_index": round(stress_index, 3)
        }


if __name__ == "__main__":
    print("=== TESTING SOIL STATE MODEL ===")
    soil_sim = SoilStateModel()
    result = soil_sim.update(
        air_temp_c=30.0,
        humidity_pct=50.0,
        rainfall_mm=0.0,
        irrigation_l=10.0,
        hydrogel_release_lhr=0.5,
        effective_mulch_cooling_c=3.5,
        growth_stage="Flowering"
    )
    print(result)