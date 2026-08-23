import logging
from typing import Any, Dict, List, Tuple
import pandas as pd

logger = logging.getLogger("SuitabilityEngine")


class AgronomicSuitabilityEngine:

  def __init__(
      self,
      loader,
      weights: Dict[str, float] = None,
  ):
    self.loader = loader
    self.weights = weights or {"climate": 0.35, "soil": 0.40, "water": 0.25}

  def evaluate_farm(self, farm_profile: Dict[str, Any]) -> Dict[str, Any]:
    """Computes suitability scores, verifies boundary limits, and returns recommendations."""
    region_id = farm_profile.get("region_id")
    soil_id = farm_profile.get("soil_id")
    water_avail = str(
        farm_profile.get("water_availability", "medium")
    ).lower()

    region_rows = self.loader.regions_df[
        self.loader.regions_df["region_id"] == region_id
    ]
    soil_rows = self.loader.soils_df[
        self.loader.soils_df["soil_id"] == soil_id
    ]

    if region_rows.empty or soil_rows.empty:
      raise ValueError(
          f"Record missing for region_id='{region_id}' or soil_id='{soil_id}'."
      )

    region = region_rows.iloc[0]
    soil = soil_rows.iloc[0]

    recommendations = []
    unique_crops = self.loader.crops_df.drop_duplicates(subset=["crop_id"])

    for _, crop in unique_crops.iterrows():
      crop_id = crop["crop_id"]

      climate_score, climate_reasons = self._eval_climate(region, crop)
      soil_score, soil_reasons = self._eval_soil(soil, crop_id)
      water_score, water_reasons = self._eval_water(water_avail, crop)

      overall_score = round(
          (climate_score * self.weights["climate"])
          + (soil_score * self.weights["soil"])
          + (water_score * self.weights["water"]),
          2,
      )

      top_varieties = self._eval_varieties(crop_id, region)

      recommendations.append({
          "crop_id": crop_id,
          "crop_name": crop["crop_name"].title(),
          "overall_suitability_score": overall_score,
          "sub_scores": {
              "climate_score": round(climate_score, 2),
              "soil_score": round(soil_score, 2),
              "water_score": round(water_score, 2),
          },
          "explanations": climate_reasons + soil_reasons + water_reasons,
          "recommended_varieties": top_varieties,
      })

    recommendations.sort(
        key=lambda x: x["overall_suitability_score"], reverse=True
    )

    return {
        "farm_id": farm_profile.get("farm_id"),
        "location": {
            "state": region["state"],
            "district": region["district"],
            "climate_zone": region["climate_zone"],
        },
        "soil_profile": {
            "soil_id": soil["soil_id"],
            "type": soil["soil_type"],
            "texture": soil["soil_texture"],
            "ph": soil["ph"],
            "ec": soil["electrical_conductivity_ds_m"],
        },
        "recommendations": recommendations[:5],
    }

  def _eval_climate(
      self, region: pd.Series, crop: pd.Series
  ) -> Tuple[float, List[str]]:
    score, reasons = 100.0, []
    avg_temp = float(region.get("average_temperature_c", 25.0))
    opt_min = float(crop.get("opt_temp_min", 20.0))
    opt_max = float(crop.get("opt_temp_max", 32.0))

    if opt_min <= avg_temp <= opt_max:
      reasons.append(
          f"✓ Regional temp ({avg_temp}°C) matches optimal band"
          f" ({opt_min}°C–{opt_max}°C)."
      )
    else:
      dev = min(abs(avg_temp - opt_min), abs(avg_temp - opt_max))
      penalty = min(50.0, dev * 4.0)
      score -= penalty
      reasons.append(
          f"⚠ Regional temp ({avg_temp}°C) deviates from optimal"
          f" ({opt_min}°C–{opt_max}°C) [-{penalty:.1f} pts]."
      )

    if region.get("frost_risk", 0) == 1:
      score -= 20.0
      reasons.append("⚠ Zone frost risk identified [-20 pts].")

    return max(0.0, score), reasons

  def _eval_soil(
      self, soil: pd.Series, crop_id: str
  ) -> Tuple[float, List[str]]:
    score, reasons = 100.0, []
    reqs = self.loader.requirements_df[
        (self.loader.requirements_df["crop_id"] == crop_id)
        & (
            self.loader.requirements_df["soil_type"].str.lower()
            == soil["soil_type"].lower()
        )
    ]

    if reqs.empty:
      return 75.0, [
          f"ℹ Standard baseline score used for soil type '{soil['soil_type']}'."
      ]

    req = reqs.iloc[0]
    soil_ph = float(soil.get("ph", 7.0))
    ph_min, ph_max = float(req["ph_min"]), float(req["ph_max"])

    if ph_min <= soil_ph <= ph_max:
      reasons.append(
          f"✓ Soil pH ({soil_ph}) is within target range ({ph_min}–{ph_max})."
      )
    else:
      score -= 25.0
      reasons.append(
          f"⚠ Soil pH ({soil_ph}) outside optimal bounds ({ph_min}–{ph_max})"
          " [-25 pts]."
      )

    soil_ec = float(soil.get("electrical_conductivity_ds_m", 0.5))
    ec_max = float(req["ec_max_ds_m"])
    if soil_ec > ec_max:
      score -= 20.0
      reasons.append(
          f"⚠ Electrical conductivity ({soil_ec} dS/m) exceeds maximum limit"
          f" ({ec_max} dS/m) [-20 pts]."
      )

    return max(0.0, score), reasons

  def _eval_water(
      self, water_avail: str, crop: pd.Series
  ) -> Tuple[float, List[str]]:
    sensitivity = str(crop.get("water_sensitivity", "medium")).lower()

    if water_avail == "high":
      return 100.0, ["✓ Water supply supports requirements."]
    elif water_avail == "medium":
      if sensitivity == "high":
        return 70.0, [
            "⚠ High crop water sensitivity under moderate water supply [-30"
            " pts]."
        ]
      return 90.0, ["✓ Water availability matches crop requirement."]
    else:
      if sensitivity == "high":
        return 30.0, [
            "❌ Severe deficit: Low water supply for water-sensitive crop [-70"
            " pts]."
        ]
      return 60.0, ["⚠ Low water availability limits crop growth [-40 pts]."]

  def _eval_varieties(
      self, crop_id: str, region: pd.Series
  ) -> List[Dict[str, Any]]:
    varieties = self.loader.varieties_df[
        self.loader.varieties_df["crop_id"] == crop_id
    ]
    if varieties.empty:
      return []

    results = []
    for _, var in varieties.iterrows():
      v_score = 80.0
      if (
          str(var.get("cultivation_region", "")).lower()
          == str(region.get("district", "")).lower()
      ):
        v_score += 15.0

      results.append({
          "variety_id": var["variety_id"],
          "variety_name": str(var["variety_name"]).title(),
          "suitability_score": min(100.0, v_score),
          "export_suitability": var.get("export_suitability", "N/A"),
          "market_demand": var.get("market_demand", "N/A"),
      })

    return sorted(results, key=lambda x: x["suitability_score"], reverse=True)[
        :3
    ]