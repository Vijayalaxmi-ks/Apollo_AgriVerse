import numpy as np

class HydrogelStateModel:
    """
    Physical State Model for Intelligent Hydrogel Polymer Substrates.
    Tracks water absorption capacity, swelling ratio, osmotic release kinetics,
    and cross-link polymer degradation over time.
    """
    def __init__(self, initial_water_storage_pct=100.0, max_capacity_liters=50.0, initial_degradation_pct=0.0):
        self.water_storage_pct = float(initial_water_storage_pct)
        self.max_capacity_liters = float(max_capacity_liters)
        self.degradation_pct = float(initial_degradation_pct)

    def update(self, soil_moisture_pct: float, wilting_point_pct: float = 12.0, 
               air_temp_c: float = 30.0, irrigation_l: float = 0.0, rainfall_mm: float = 0.0) -> dict:
        """
        Calculates dynamic hydrogel water absorption or osmotic release based on soil moisture potential.
        """
        # 1. Chemical Polymer Degradation (uv, thermal, and microclimate breakdown)
        thermal_degradation = max(0.0, (air_temp_c - 25.0) * 0.02)
        self.degradation_pct = float(np.clip(self.degradation_pct + 0.05 + thermal_degradation, 0.0, 100.0))
        
        # Effective capacity decreases as polymer cross-links degrade
        effective_capacity_liters = self.max_capacity_liters * (1.0 - (self.degradation_pct / 100.0))
        current_water_liters = (self.water_storage_pct / 100.0) * effective_capacity_liters

        # 2. Absorption Phase: Recharge hydrogel during rainfall or irrigation
        water_inflow_liters = (irrigation_l * 0.3) + (rainfall_mm * 0.5)
        
        # 3. Release Phase: Osmotic release triggered when soil moisture drops below threshold (e.g. 25%)
        soil_moisture_deficit = max(0.0, 25.0 - soil_moisture_pct)
        
        if soil_moisture_deficit > 0 and current_water_liters > 0:
            # Release rate proportional to soil water potential gradient (L/hr)
            release_rate_lhr = min(current_water_liters, 0.15 * soil_moisture_deficit * (1.0 - (self.degradation_pct / 100.0)))
        else:
            release_rate_lhr = 0.0

        # 4. Update Net Storage
        net_water_liters = np.clip(current_water_liters + water_inflow_liters - release_rate_lhr, 0.0, effective_capacity_liters)
        self.water_storage_pct = float((net_water_liters / effective_capacity_liters) * 100.0) if effective_capacity_liters > 0 else 0.0

        return {
            "hydrogel_water_storage_pct": round(self.water_storage_pct, 2),
            "hydrogel_release_rate_lhr": round(release_rate_lhr, 2),
            "hydrogel_degradation_pct": round(self.degradation_pct, 2),
            "effective_capacity_liters": round(effective_capacity_liters, 2),
            "hydrogel_status": "Optimal" if self.water_storage_pct > 40 else ("Low Storage" if self.water_storage_pct > 15 else "Exhausted")
        }


if __name__ == "__main__":
    print("=== TESTING HYDROGEL STATE MODEL ===")
    hydrogel_sim = HydrogelStateModel()
    result = hydrogel_sim.update(soil_moisture_pct=20.0, air_temp_c=32.0)
    print(result)