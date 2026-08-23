import logging
import re
from typing import Any, Dict, List, Optional, Tuple
import pandas as pd
from services.external_apis import ExternalDataService
from services.knowledge_loader import KnowledgeBaseLoader

logger = logging.getLogger("AgronomicSuitabilityEngine")


class AgronomicSuitabilityEngine:

  HIGH_WATER_CROPS = {"grape", "grapes", "sugarcane", "paddy", "rice", "banana"}
  AGRONOMIC_PASS_THRESHOLD = 60.0  # Minimum % required to pass Stage 1

  def __init__(
      self, loader: KnowledgeBaseLoader, api_service: ExternalDataService
  ):
    self.loader = loader
    self.api_service = api_service

  def _normalize_crop_name(self, name: str) -> str:
    clean = re.sub(r"[^a-zA-Z]", "", str(name)).lower()
    if clean.endswith("s") and len(clean) > 3:
      clean = clean[:-1]
    return clean.upper()

  def _calculate_multi_vector_climate_score(
      self, live_temp: float, region_info: pd.Series, crop: pd.Series
  ) -> Tuple[float, List[str], List[str]]:
    pros, cons = [], []

    hist_min_temp = float(region_info.get("avg_temp_min", 18.0))
    hist_max_temp = float(region_info.get("avg_temp_max", 34.0))

    crop_ideal_min = float(
        crop.get("ideal_temp_min", crop.get("min_temp_c", 15.0))
    )
    crop_ideal_max = float(
        crop.get("ideal_temp_max", crop.get("max_temp_c", 35.0))
    )

    # non-linear penalty calculation for severe thermal breaches
    min_breach = max(0.0, crop_ideal_min - hist_min_temp)
    max_breach = max(0.0, hist_max_temp - crop_ideal_max)
    total_breach = min_breach + max_breach

    if total_breach == 0:
      seasonal_temp_score = 100.0
      pros.append(
          f"Climate (Seasonal): Regional profile"
          f" ({hist_min_temp:.1f}°C–{hist_max_temp:.1f}°C) perfectly aligns with"
          f" crop bounds ({crop_ideal_min:.1f}°C–{crop_ideal_max:.1f}°C)."
      )
    else:
      # Severe penalties for severe temperature deviations
      seasonal_temp_score = max(0.0, 100.0 - (total_breach * 12.0))
      cons.append(
          f"Climate (Seasonal): Thermal stress risk. Regional bounds"
          f" ({hist_min_temp:.1f}°C–{hist_max_temp:.1f}°C) breach crop"
          f" requirements ({crop_ideal_min:.1f}°C–{crop_ideal_max:.1f}°C) by"
          f" {total_breach:.1f}°C."
      )

    annual_rainfall = float(region_info.get("annual_rainfall_mm", 850.0))
    crop_water_req = str(crop.get("water_requirement", "medium")).lower()

    if crop_water_req == "high":
      if annual_rainfall >= 1000:
        rainfall_score = 100.0
        pros.append(
            f"Climate (Hydrology): High annual rainfall ({annual_rainfall:.0f}mm)"
            " supports crop demand."
        )
      else:
        rainfall_score = 50.0
        cons.append(
            f"Climate (Hydrology): Rainfall ({annual_rainfall:.0f}mm) below high"
            " crop demand."
        )
    elif crop_water_req == "medium":
      rainfall_score = (
          95.0 if 600 <= annual_rainfall <= 1200 else 70.0
      )
      if rainfall_score > 80:
        pros.append(
            f"Climate (Hydrology): Rainfall ({annual_rainfall:.0f}mm) suits"
            " medium crop demands."
        )
    else:
      rainfall_score = 100.0 if annual_rainfall < 900 else 80.0
      pros.append(
          "Climate (Hydrology): Low crop water demand suits regional rainfall."
      )

    if crop_ideal_min <= live_temp <= crop_ideal_max:
      live_score = 100.0
    else:
      dev = min(abs(live_temp - crop_ideal_min), abs(live_temp - crop_ideal_max))
      live_score = max(0.0, 100.0 - (dev * 15.0))
      cons.append(
          f"Climate (Real-time): Ambient temperature ({live_temp:.1f}°C) shows"
          " short-term deviation."
      )

    total_climate_score = round(
        (seasonal_temp_score * 0.50)
        + (rainfall_score * 0.35)
        + (live_score * 0.15),
        1,
    )

    return total_climate_score, pros, cons

  def _calculate_expanded_soil_score(
      self, soil_info: pd.Series, crop: pd.Series
  ) -> Tuple[float, Dict[str, float], List[str], List[str]]:
    pros, cons = [], []

    soil_type = str(soil_info.get("soil_type", "black")).lower()
    soil_ph = float(soil_info.get("ph", 7.11))
    soil_ec = float(
        soil_info.get("ec", soil_info.get("electrical_conductivity", 0.8))
    )
    soil_oc = float(soil_info.get("oc", soil_info.get("organic_carbon", 0.65)))
    soil_n = float(soil_info.get("nitrogen", 280.0))
    soil_p = float(soil_info.get("phosphorus", 18.0))
    soil_k = float(soil_info.get("potassium", 310.0))

    min_ph = float(crop.get("min_ph", 6.0))
    max_ph = float(crop.get("max_ph", 7.5))
    opt_ph = (min_ph + max_ph) / 2.0

    if min_ph <= soil_ph <= max_ph:
      ph_score = 100.0 - (abs(soil_ph - opt_ph) * 12.0)
      pros.append(
          f"Soil (pH): {soil_ph:.2f} is within optimal range"
          f" ({min_ph:.1f}–{max_ph:.1f})."
      )
    else:
      ph_diff = min(abs(soil_ph - min_ph), abs(soil_ph - max_ph))
      ph_score = max(30.0, 100.0 - (ph_diff * 30.0))
      cons.append(
          f"Soil (pH): {soil_ph:.2f} deviates from target"
          f" ({min_ph:.1f}–{max_ph:.1f})."
      )

    preferred_soils = str(
        crop.get("preferred_soil", "black,loam,alluvial")
    ).lower()
    if any(st in soil_type for st in preferred_soils.split(",")):
      texture_score = 95.0
      pros.append(
          f"Soil (Texture): {soil_type.title()} structure highly compatible."
      )
    else:
      texture_score = 70.0
      cons.append(
          f"Soil (Texture): {soil_type.title()} soil is sub-optimal for root"
          " aeration."
      )

    if soil_oc >= 0.75:
      oc_score = 100.0
      pros.append(
          f"Soil (Organic Carbon): Excellent organic matter level"
          f" ({soil_oc:.2f}%)."
      )
    elif soil_oc >= 0.50:
      oc_score = 80.0
      pros.append(
          f"Soil (Organic Carbon): Moderate organic matter level"
          f" ({soil_oc:.2f}%)."
      )
    else:
      oc_score = 55.0
      cons.append(
          f"Soil (Organic Carbon): Low organic carbon ({soil_oc:.2f}%) requires"
          " bio-amendments."
      )

    max_tolerable_ec = float(crop.get("max_ec", 2.0))
    if soil_ec <= max_tolerable_ec:
      ec_score = 100.0 - ((soil_ec / max_tolerable_ec) * 10.0)
      pros.append(
          f"Soil (Salinity/EC): {soil_ec:.2f} dS/m within tolerance limit"
          f" (<{max_tolerable_ec:.1f} dS/m)."
      )
    else:
      ec_score = max(20.0, 100.0 - ((soil_ec - max_tolerable_ec) * 40.0))
      cons.append(
          f"Soil (Salinity/EC): High EC ({soil_ec:.2f} dS/m) causes osmotic"
          " stress."
      )

    npk_avg = (
        min(100.0, (soil_n / 250.0) * 80.0)
        + min(100.0, (soil_p / 20.0) * 85.0)
        + min(100.0, (soil_k / 200.0) * 90.0)
    ) / 3.0
    npk_score = round(npk_avg, 1)

    sub_scores = {
        "ph": round(ph_score, 1),
        "texture": round(texture_score, 1),
        "organic_carbon": round(oc_score, 1),
        "ec_salinity": round(ec_score, 1),
        "npk_balance": round(npk_score, 1),
    }

    overall_soil = round(
        (ph_score * 0.25)
        + (texture_score * 0.25)
        + (oc_score * 0.20)
        + (ec_score * 0.15)
        + (npk_score * 0.15),
        1,
    )

    return overall_soil, sub_scores, pros, cons

  def _get_water_req_level(self, crop_name: str, crop: pd.Series) -> str:
    req = str(crop.get("water_requirement", "")).lower().strip()
    if crop_name.lower() in self.HIGH_WATER_CROPS or "high" in req:
      return "high"
    if "low" in req:
      return "low"
    return "medium"

  def _calculate_water_score(
      self, water_avail: str, water_req: str
  ) -> Tuple[float, List[str], List[str]]:
    pros, cons = [], []
    if water_avail == "low":
      if water_req == "high":
        score = 25.0
        cons.append(
            "Water: Severe deficit. High crop demand vs low water availability."
        )
      elif water_req == "medium":
        score = 55.0
        cons.append(
            "Water: Moderate stress. Supplemental micro-irrigation required."
        )
      else:
        score = 85.0
        pros.append(
            "Water: Low crop water demand aligns with farm's dry baseline."
        )
    elif water_avail == "moderate":
      score = 70.0 if water_req == "high" else 90.0
    else:
      score = 100.0

    return round(score, 1), pros, cons

  def evaluate_farm(
      self, farm_data: Dict[str, Any], top_n: int = 3
  ) -> Dict[str, Any]:
    lat = farm_data.get("latitude", 12.9716)
    lon = farm_data.get("longitude", 77.5946)

    weather_data = self.api_service.get_live_weather(lat, lon)
    live_temp = weather_data.get("temp_c", 21.1)
    is_live_weather = weather_data.get("is_live", False)

    region_info = self.loader.regions_df[
        self.loader.regions_df["region_id"] == farm_data["region_id"]
    ].iloc[0]
    state = region_info.get("state", "Karnataka")
    district = region_info.get("district", "Bangalore Urban")

    soil_info = self.loader.soils_df[
        self.loader.soils_df["soil_id"] == farm_data["soil_id"]
    ].iloc[0]
    water_avail = farm_data.get("water_availability", "low").lower()

    crops_df = self.loader.crops_df.copy()
    crops_df["canonical_name"] = crops_df["crop_name"].apply(
        self._normalize_crop_name
    )
    crops_df = crops_df.drop_duplicates(subset=["canonical_name"])

    filtered_out_crops = []
    agronomic_passed_recs = []

    for _, crop in crops_df.iterrows():
      crop_name = crop["canonical_name"]
      water_req = self._get_water_req_level(crop_name, crop)

      # STAGE 1: AGRONOMIC HARD FILTER
      climate_score, c_pros, c_cons = (
          self._calculate_multi_vector_climate_score(
              live_temp, region_info, crop
          )
      )
      soil_score, soil_sub_tree, s_pros, s_cons = (
          self._calculate_expanded_soil_score(soil_info, crop)
      )
      water_score, w_pros, w_cons = self._calculate_water_score(
          water_avail, water_req
      )

      penalty_pts = 0.0
      penalties = []
      if water_avail == "low" and water_req == "high":
        penalty_pts += 20.0
        penalties.append(
            "High Water Dependency Penalty (-20.0 pts): Mismatch with low water"
            " availability."
        )

      agronomic_raw = (
          (climate_score * 0.40) + (soil_score * 0.40) + (water_score * 0.20)
      )
      agronomic_score = round(max(0.0, agronomic_raw - penalty_pts), 1)

      agronomic_pros = c_pros + s_pros + w_pros
      agronomic_cons = c_cons + s_cons + w_cons

      if agronomic_score < self.AGRONOMIC_PASS_THRESHOLD:
        filtered_out_crops.append({
            "crop_name": crop_name,
            "agronomic_score": agronomic_score,
            "reason": (
                f"Failed Agronomic Threshold ({agronomic_score}% <"
                f" {self.AGRONOMIC_PASS_THRESHOLD}%)."
            ),
            "key_cons": agronomic_cons + penalties,
        })
        continue

      # STAGE 2: ECONOMIC RANKER
      mandi_data = self.api_service.get_mandi_market_data(
          state, district, crop_name
      )
      price = mandi_data.get("modal_price_per_qtl", 2000)
      trend = mandi_data.get("price_trend", "STABLE")

      if trend == "UPWARD":
        market_score = 85.0 + min(15.0, (price / 1000.0))
      elif trend == "STABLE":
        market_score = 65.0 + min(15.0, (price / 1000.0))
      else:
        market_score = 40.0

      final_suitability_score = round(
          (agronomic_score * 0.70) + (market_score * 0.30), 1
      )

      band = (
          "Highly Suitable"
          if final_suitability_score >= 85
          else "Suitable (Optimal Choice)"
          if final_suitability_score >= 70
          else "Feasible with Management"
      )

      agronomic_passed_recs.append({
          "crop_name": crop_name,
          "final_suitability_score": final_suitability_score,
          "agronomic_score": agronomic_score,
          "suitability_band": band,
          "score_tree": {
              "agronomic_total": agronomic_score,
              "climate": {
                  "score": climate_score,
                  "weight": 0.40,
                  "contribution": round(climate_score * 0.40, 1),
              },
              "soil": {
                  "score": soil_score,
                  "weight": 0.40,
                  "contribution": round(soil_score * 0.40, 1),
                  "sub_tree": soil_sub_tree,
              },
              "water": {
                  "score": water_score,
                  "weight": 0.20,
                  "contribution": round(water_score * 0.20, 1),
              },
              "market": {
                  "score": round(market_score, 1),
                  "weight": 0.30,
                  "contribution": round(market_score * 0.30, 1),
                  "modal_price": price,
                  "trend": trend,
              },
              "penalties_deducted": penalty_pts,
          },
          "pros": agronomic_pros,
          "cons": agronomic_cons,
          "penalties_applied": penalties,
      })

    agronomic_passed_recs.sort(
        key=lambda x: x["final_suitability_score"], reverse=True
    )

    return {
        "location": {"district": district, "state": state},
        "soil_profile": {
            "type": soil_info["soil_type"],
            "ph": float(soil_info.get("ph", 7.11)),
            "oc": float(soil_info.get("oc", 0.65)),
            "ec": float(soil_info.get("ec", 0.8)),
        },
        "water_availability": water_avail,
        "live_weather_applied": is_live_weather,
        "primary_recommendations": agronomic_passed_recs[:top_n],
        "disqualified_crops": filtered_out_crops,
    }