import numpy as np

class MulchStateModel:
    """
    Physical State Model for Sensor-Integrated Mulching Film.
    Tracks UV degradation, surface cooling suppression, and physical integrity limits.
    """
    def __init__(self, initial_degradation_pct=0.0, film_thickness_um=25.0, max_cooling_effect_c=5.5):
        self.degradation_pct = float(initial_degradation_pct)
        self.film_thickness_um = float(film_thickness_um)
        self.max_cooling_effect_c = float(max_cooling_effect_c)

    def update(self, uv_index: float, max_temp_c: float, wind_speed_kmh: float) -> dict:
        """
        Calculates daily non-linear mechanical and photo-degradation.
        """
        # Photo-oxidation rate based on UV energy intensity
        uv_factor = 0.05 * (uv_index ** 1.15)
        
        # Thermal stress factor (expansion-contraction wear)
        thermal_stress = max(0.0, (max_temp_c - 30.0) * 0.03)
        
        # Mechanical wind tearing stress
        mechanical_stress = (wind_speed_kmh / 50.0) ** 2 * 0.1
        
        # Cumulative degradation increment scaled by film thickness
        daily_wear = (uv_factor + thermal_stress + mechanical_stress) * (25.0 / self.film_thickness_um)
        
        # Apply strict saturation boundaries [0.0%, 100.0%]
        self.degradation_pct = float(np.clip(self.degradation_pct + daily_wear, 0.0, 100.0))
        
        # Non-linear thermal reduction efficiency loss
        integrity_factor = 1.0 - (self.degradation_pct / 100.0) ** 1.5
        effective_cooling_c = max(0.0, self.max_cooling_effect_c * integrity_factor)
        
        return {
            "mulch_degradation_pct": round(self.degradation_pct, 2),
            "effective_mulch_cooling_c": round(effective_cooling_c, 2),
            "mulch_status": "Healthy" if self.degradation_pct < 40 else ("Worn" if self.degradation_pct < 75 else "Needs Replacement")
        }


if __name__ == "__main__":
    print("=== TESTING MULCH STATE MODEL ===")
    mulch_sim = MulchStateModel(initial_degradation_pct=0.0, film_thickness_um=25.0)
    
    # Simulate 3 days of weather exposure
    for day in range(1, 4):
        result = mulch_sim.update(uv_index=8.0, max_temp_c=34.0, wind_speed_kmh=15.0)
        print(f"Day {day}: {result}")


