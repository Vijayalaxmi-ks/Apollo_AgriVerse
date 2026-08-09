import numpy as np

class CropLifecycleEngine:
    """
    Precision Viticulture Growth Stage Tracking using Single-Sine Wave 
    Growing Degree Days (GDD) with Upper Thermal Cutoff Bounds.
    """
    def __init__(self, cumulative_gdd=0.0, t_base=10.0, t_upper=35.0):
        self.cumulative_gdd = float(cumulative_gdd)
        self.t_base = t_base
        self.t_upper = t_upper

    def calculate_daily_gdd(self, t_max_c: float, t_min_c: float) -> float:
        """
        Calculates effective GDD considering photosynthetic upper thermal cutoff.
        """
        # Cap maximum temperature at photosynthesis inhibition threshold
        t_max_eff = min(self.t_upper, max(t_max_c, self.t_base))
        t_min_eff = max(self.t_base, min(t_min_c, self.t_upper))
        
        t_avg = (t_max_eff + t_min_eff) / 2.0
        daily_gdd = max(0.0, t_avg - self.t_base)
        return float(daily_gdd)

    def update(self, t_max_c: float, t_min_c: float) -> dict:
        daily_gdd = self.calculate_daily_gdd(t_max_c, t_min_c)
        self.cumulative_gdd += daily_gdd
        
        # Viticulture Phenology Thresholds for Vitis vinifera
        if self.cumulative_gdd < 250.0:
            stage = "Budbreak"
            canopy_cover = 10.0 + (self.cumulative_gdd / 250.0) * 20.0
        elif self.cumulative_gdd < 650.0:
            stage = "Flowering"
            canopy_cover = 30.0 + ((self.cumulative_gdd - 250.0) / 400.0) * 35.0
        elif self.cumulative_gdd < 1200.0:
            stage = "Veraison"
            canopy_cover = 65.0 + ((self.cumulative_gdd - 650.0) / 550.0) * 25.0
        elif self.cumulative_gdd < 1600.0:
            stage = "Ripening & Harvest"
            canopy_cover = 90.0
        else:
            stage = "Post-Harvest"
            canopy_cover = 85.0
            
        return {
            "daily_gdd": round(daily_gdd, 2),
            "cumulative_gdd": round(self.cumulative_gdd, 2),
            "growth_stage": stage,
            "estimated_canopy_cover_pct": round(canopy_cover, 1)
        }


if __name__ == "__main__":
    print("=== TESTING CROP LIFECYCLE ENGINE ===")
    crop_sim = CropLifecycleEngine()
    result = crop_sim.update(t_max_c=34.0, t_min_c=20.0)
    print(result)