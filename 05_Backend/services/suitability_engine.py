import logging
import re
from typing import Any, Dict, List, Optional, Tuple

import pandas as pd

from services.external_apis import ExternalDataService
from services.knowledge_loader import KnowledgeBaseLoader

logger = logging.getLogger("AgronomicSuitabilityEngine")


class AgronomicSuitabilityEngine:
    """
    Apollo AgriVerse suitability engine.

    Current scope:
      - Maharashtra only.
      - Candidate crops are read dynamically from the crop knowledge table.
      - Region is resolved by region_id / district / state.
      - Soil is resolved by soil_id.
      - Crop-soil requirements are resolved through crop_id + soil identity.
      - Suitability is calculated from available bio-physical and chemical factors.
      - Market is a separate economic component.
      - If GRAPE is the highest-scoring crop, grape varieties are ranked dynamically.

    Important:
      The weights below are engineering weights for the prototype, not claims of
      universal agronomic truth. Missing measurements are excluded from the
      weighted mean rather than fabricated.
    """

    STATE_SCOPE = "Maharashtra"
    AGRONOMIC_PASS_THRESHOLD = 60.0

    # Agronomic score = climate + soil + water.
    AGRONOMIC_WEIGHTS = {
        "climate": 0.40,
        "soil": 0.40,
        "water": 0.20,
    }

    # Climate internal weights.
    CLIMATE_WEIGHTS = {
        "temperature": 0.50,
        "rainfall": 0.30,
        "live_temperature": 0.20,
    }

    # Soil internal weights.
    SOIL_WEIGHTS = {
        "ph": 0.25,
        "texture": 0.20,
        "organic_carbon": 0.15,
        "ec": 0.15,
        "nitrogen": 0.10,
        "phosphorus": 0.075,
        "potassium": 0.075,
    }

    # Final score = agronomic + market.
    FINAL_WEIGHTS = {
        "agronomic": 0.70,
        "market": 0.30,
    }

    # Only used to recognize the focus crop for the variety layer.
    # It does NOT force grape to be the crop recommendation.
    FOCUS_CROP = "GRAPE"

    def __init__(
        self,
        loader: KnowledgeBaseLoader,
        api_service: ExternalDataService,
        state_scope: str = STATE_SCOPE,
        focus_crop: str = FOCUS_CROP,
        prefer_focus_crop: bool = True,
    ):
        self.loader = loader
        self.api_service = api_service
        self.state_scope = str(state_scope).strip()

        if self.state_scope.casefold() != self.STATE_SCOPE.casefold():
            raise ValueError("AgronomicSuitabilityEngine is restricted to Maharashtra.")

        self.focus_crop = self._normalize_name(focus_crop)
        self.prefer_focus_crop = prefer_focus_crop

        # Work only on Maharashtra regions for this prototype.
        regions = self.loader.regions_df.copy()
        if "state" not in regions.columns:
            raise ValueError("Region knowledge base must contain a 'state' column.")

        self.maharashtra_regions = regions[
            regions["state"].astype(str).str.strip().str.casefold()
            == self.state_scope.casefold()
        ].copy()

        if self.maharashtra_regions.empty:
            raise ValueError("No Maharashtra rows found in region knowledge base.")

        # Keep the original IDs; do not replace them with names.
        self._prepare_ids()

    # ------------------------------------------------------------------
    # BASIC HELPERS
    # ------------------------------------------------------------------

    @staticmethod
    def _normalize_name(value: Any) -> str:
        text = re.sub(r"[^a-zA-Z0-9]+", "", str(value)).lower()
        aliases = {
            "grapes": "grape",
            "paddy": "rice",
            "sorghum": "jowar",
            "gram": "chickpea",
            "chickpeas": "chickpea",
        }
        return aliases.get(text, text).upper()

    @staticmethod
    def _clean_text(value: Any) -> str:
        if value is None or pd.isna(value):
            return ""
        return str(value).strip()

    @staticmethod
    def _num(row: pd.Series, aliases: List[str]) -> Optional[float]:
        for col in aliases:
            if col in row.index and pd.notna(row[col]):
                try:
                    return float(row[col])
                except (TypeError, ValueError):
                    continue
        return None

    @staticmethod
    def _first(row: pd.Series, aliases: List[str], default=None):
        for col in aliases:
            if col in row.index and pd.notna(row[col]):
                value = row[col]
                if str(value).strip() != "":
                    return value
        return default

    @staticmethod
    def _norm_id(value: Any) -> str:
        return str(value).strip().casefold()

    def _prepare_ids(self):
        if "crop_id" in self.loader.crops_df.columns:
            self.loader.crops_df["_canonical_crop"] = (
                self.loader.crops_df["crop_name"]
                .map(self._normalize_name)
                if "crop_name" in self.loader.crops_df.columns
                else self.loader.crops_df["crop_id"].map(self._normalize_name)
            )

        if "crop_id" in self.loader.requirements_df.columns:
            self.loader.requirements_df["_canonical_crop_id"] = (
                self.loader.requirements_df["crop_id"].map(self._norm_id)
            )

        if "crop_id" in self.loader.varieties_df.columns:
            self.loader.varieties_df["_canonical_crop_id"] = (
                self.loader.varieties_df["crop_id"].map(self._norm_id)
            )

    # ------------------------------------------------------------------
    # REGION / SOIL
    # ------------------------------------------------------------------

    def _get_region(self, farm: Dict[str, Any]) -> pd.Series:
        regions = self.maharashtra_regions

        region_id = farm.get("region_id")
        if region_id is not None:
            m = regions[
                regions["region_id"].map(self._norm_id) == self._norm_id(region_id)
            ]
            if not m.empty:
                return m.iloc[0]

        district = farm.get("district")
        if district:
            m = regions[
                regions["district"].astype(str).str.strip().str.casefold()
                == str(district).strip().casefold()
            ]
            if not m.empty:
                return m.iloc[0]

        # Deterministic fallback only when the caller did not specify a region.
        preferred = ["Nashik", "Sangli", "Pune", "Satara", "Ahmednagar", "Solapur"]
        for d in preferred:
            m = regions[
                regions["district"].astype(str).str.strip().str.casefold()
                == d.casefold()
            ]
            if not m.empty:
                return m.iloc[0]

        return regions.iloc[0]

    def _get_soil(self, farm: Dict[str, Any]) -> pd.Series:
        soils = self.loader.soils_df.copy()

        if "state" in soils.columns:
            scoped = soils[
                soils["state"].astype(str).str.strip().str.casefold()
                == self.state_scope.casefold()
            ]
            if scoped.empty:
                raise ValueError("No Maharashtra rows found in soil knowledge base.")
            soils = scoped

        soil_id = farm.get("soil_id")
        if soil_id is not None:
            m = soils[
                soils["soil_id"].map(self._norm_id) == self._norm_id(soil_id)
            ]
            if not m.empty:
                return m.iloc[0]

        soil_type = farm.get("soil_type")
        if soil_type:
            m = soils[
                soils.apply(
                    lambda r: self._normalize_name(
                        self._first(
                            r,
                            ["soil_type", "soil_name", "texture"],
                            "",
                        )
                    )
                    == self._normalize_name(soil_type),
                    axis=1,
                )
            ]
            if not m.empty:
                return m.iloc[0]

        return soils.iloc[0]

    # ------------------------------------------------------------------
    # REQUIREMENT LOOKUP
    # ------------------------------------------------------------------

    def _get_crop_requirements(
        self,
        crop: pd.Series,
        soil: pd.Series,
    ) -> Optional[pd.Series]:
        req = self.loader.requirements_df.copy()

        if req.empty or "crop_id" not in req.columns:
            return None

        crop_id = self._norm_id(crop.get("crop_id", ""))
        req["_cid"] = req["crop_id"].map(self._norm_id)

        matches = req[req["_cid"] == crop_id]

        if matches.empty:
            crop_name = self._normalize_name(crop.get("crop_name", ""))
            matches = req[
                req["crop_id"].map(self._normalize_name) == crop_name
            ]

        if matches.empty:
            return None

        soil_name = self._normalize_name(
            self._first(soil, ["soil_type", "soil_name", "texture"], "")
        )

        for col in ["soil_id", "soil_type", "soil_name", "texture"]:
            if col not in matches.columns:
                continue

            if col == "soil_id":
                m = matches[
                    matches[col].map(self._norm_id)
                    == self._norm_id(soil.get("soil_id", ""))
                ]
            else:
                m = matches[
                    matches[col].map(self._normalize_name) == soil_name
                ]

            if not m.empty:
                return m.iloc[0]

        return matches.iloc[0]

    # ------------------------------------------------------------------
    # RANGE SCORING
    # ------------------------------------------------------------------

    @staticmethod
    def _range_score(
        value: Optional[float],
        optimum_min: Optional[float],
        optimum_max: Optional[float],
        critical_min: Optional[float] = None,
        critical_max: Optional[float] = None,
    ) -> Optional[float]:
        if value is None or optimum_min is None or optimum_max is None:
            return None

        lo, hi = sorted((float(optimum_min), float(optimum_max)))

        if lo <= value <= hi:
            return 100.0

        width = max(hi - lo, 1e-9)

        if value < lo:
            boundary = critical_min
            if boundary is None:
                boundary = lo - 0.25 * width
            if value <= boundary:
                return 0.0
            return max(0.0, min(100.0, 100.0 * (value - boundary) / (lo - boundary)))

        boundary = critical_max
        if boundary is None:
            boundary = hi + 0.25 * width
        if value >= boundary:
            return 0.0
        return max(0.0, min(100.0, 100.0 * (boundary - value) / (boundary - hi)))

    @staticmethod
    def _weighted_mean(values: Dict[str, Optional[float]], weights: Dict[str, float]):
        usable = [
            (k, v, weights[k])
            for k, v in values.items()
            if v is not None and k in weights
        ]
        if not usable:
            return 0.0

        weight_sum = sum(w for _, _, w in usable)
        return round(sum(v * w for _, v, w in usable) / weight_sum, 1)

    # ------------------------------------------------------------------
    # CLIMATE
    # ------------------------------------------------------------------

    def _climate_score(
        self,
        crop: pd.Series,
        req: Optional[pd.Series],
        region: pd.Series,
        live_temp: Optional[float],
        live_weather: bool,
    ):
        pros, cons = [], []
        source = req if req is not None else crop

        crop_min = self._num(
            source,
            ["optimal_temperature_min_c", "ideal_temp_min", "min_temp", "temp_min"],
        )
        crop_max = self._num(
            source,
            ["optimal_temperature_max_c", "ideal_temp_max", "max_temp", "temp_max"],
        )

        reg_min = self._num(
            region,
            ["avg_temp_min", "annual_avg_temp_min", "temp_min", "min_temperature_c"],
        )
        reg_max = self._num(
            region,
            ["avg_temp_max", "annual_avg_temp_max", "temp_max", "max_temperature_c"],
        )

        temp_score = None
        if crop_min is not None and crop_max is not None and reg_min is not None and reg_max is not None:
            s1 = self._range_score(reg_min, crop_min, crop_max)
            s2 = self._range_score(reg_max, crop_min, crop_max)
            temp_score = (s1 + s2) / 2.0

            if temp_score >= 80:
                pros.append(
                    f"Temperature: regional range {reg_min:.1f}–{reg_max:.1f}°C "
                    f"is compatible with the crop's preferred {crop_min:.1f}–{crop_max:.1f}°C."
                )
            else:
                cons.append(
                    f"Temperature: regional range {reg_min:.1f}–{reg_max:.1f}°C "
                    f"does not fully fit the crop's preferred {crop_min:.1f}–{crop_max:.1f}°C."
                )

        rainfall = self._num(
            region,
            ["annual_rainfall_mm", "rainfall_mm", "annual_rainfall"],
        )
        crop_rain = self._num(
            source,
            ["rainfall_requirement_mm", "annual_rainfall_requirement_mm"],
        )

        rainfall_score = None
        if rainfall is not None and crop_rain is not None and crop_rain > 0:
            ratio = rainfall / crop_rain
            rainfall_score = max(0.0, 100.0 - min(abs(1.0 - ratio), 1.0) * 100.0)
            if rainfall_score >= 80:
                pros.append(
                    f"Rainfall: regional annual rainfall (~{rainfall:.0f} mm) is close "
                    f"to the crop requirement (~{crop_rain:.0f} mm)."
                )
            else:
                cons.append(
                    f"Rainfall: regional annual rainfall (~{rainfall:.0f} mm) differs "
                    f"from the crop requirement (~{crop_rain:.0f} mm)."
                )
        elif rainfall is not None:
            rainfall_score = 70.0
            cons.append("Rainfall: crop-specific rainfall requirement is not available.")

        live_score = None
        if live_weather and live_temp is not None and crop_min is not None and crop_max is not None:
            live_score = self._range_score(live_temp, crop_min, crop_max)
            if live_score >= 80:
                pros.append(f"Live temperature: {live_temp:.1f}°C is currently suitable.")
            else:
                cons.append(f"Live temperature: {live_temp:.1f}°C is outside the preferred range.")
        elif not live_weather:
            cons.append("Live weather: unavailable; regional climate data is being used.")

        values = {
            "temperature": temp_score,
            "rainfall": rainfall_score,
            "live_temperature": live_score,
        }
        score = self._weighted_mean(values, self.CLIMATE_WEIGHTS)

        return score, {
            "temperature": None if temp_score is None else round(temp_score, 1),
            "rainfall": None if rainfall_score is None else round(rainfall_score, 1),
            "live_temperature": None if live_score is None else round(live_score, 1),
        }, pros, cons

    # ------------------------------------------------------------------
    # SOIL
    # ------------------------------------------------------------------

    def _soil_score(self, soil: pd.Series, crop: pd.Series, req: Optional[pd.Series]):
        pros, cons = [], []
        source = req if req is not None else crop
        values = {}

        ph = self._num(soil, ["ph", "pH", "soil_ph"])
        ph_min = self._num(source, ["ph_min", "min_ph", "optimal_ph_min"])
        ph_max = self._num(source, ["ph_max", "max_ph", "optimal_ph_max"])
        ph_crit_min = self._num(source, ["critical_ph_min"])
        ph_crit_max = self._num(source, ["critical_ph_max"])

        values["ph"] = self._range_score(ph, ph_min, ph_max, ph_crit_min, ph_crit_max)

        if values["ph"] is not None:
            if values["ph"] >= 80:
                pros.append(f"Soil pH: {ph:.2f} is within/near the preferred range.")
            else:
                cons.append(f"Soil pH: {ph:.2f} is outside the preferred range.")

        actual_soil = self._normalize_name(
            self._first(soil, ["soil_type", "soil_name", "texture"], "")
        )
        required_soil = self._first(
            source,
            ["soil_type", "preferred_soil_type", "preferred_texture", "texture"],
            None,
        )

        if required_soil is not None and actual_soil:
            required_tokens = {
                self._normalize_name(x)
                for x in re.split(r"[,;/|]+", str(required_soil))
                if str(x).strip()
            }
            texture_score = 100.0 if actual_soil in required_tokens else 0.0
            if texture_score >= 80:
                pros.append("Soil type: farm soil matches the crop's soil requirement.")
            else:
                cons.append(
                    f"Soil type: {self._first(soil, ['soil_type','soil_name','texture'], 'Unknown')} "
                    f"does not match the stated crop requirement ({required_soil})."
                )
            values["texture"] = texture_score
        else:
            values["texture"] = None
            cons.append("Soil type: crop-specific soil compatibility data is unavailable.")

        oc = self._num(soil, ["oc", "organic_carbon", "organic_carbon_pct"])
        oc_min = self._num(source, ["oc_min", "organic_carbon_min", "optimal_oc_min"])
        oc_max = self._num(source, ["oc_max", "organic_carbon_max", "optimal_oc_max"])

        if oc_min is not None and oc_max is not None:
            values["organic_carbon"] = self._range_score(oc, oc_min, oc_max)
        else:
            values["organic_carbon"] = None

        ec = self._num(soil, ["ec", "electrical_conductivity", "ec_ds_m"])
        ec_max = self._num(source, ["ec_max", "max_ec", "optimal_ec_max"])
        if ec is not None and ec_max is not None:
            if ec <= ec_max:
                values["ec"] = 100.0
                pros.append(f"Salinity: EC {ec:.2f} dS/m is within the crop limit.")
            else:
                values["ec"] = max(0.0, min(100.0, 100.0 * (1.0 - max(ec - ec_max, 0) / max(ec_max, 1e-9))))
                cons.append(f"Salinity: EC {ec:.2f} dS/m exceeds the crop limit.")
        else:
            values["ec"] = None

        for nutrient, aliases_value, aliases_min, aliases_max in [
            ("nitrogen", ["n", "nitrogen", "nitrogen_kg_ha"], ["n_min", "nitrogen_min"], ["n_max", "nitrogen_max"]),
            ("phosphorus", ["p", "phosphorus", "phosphorus_kg_ha"], ["p_min", "phosphorus_min"], ["p_max", "phosphorus_max"]),
            ("potassium", ["k", "potassium", "potassium_kg_ha"], ["k_min", "potassium_min"], ["k_max", "potassium_max"]),
        ]:
            observed = self._num(soil, aliases_value)
            lo = self._num(source, aliases_min)
            hi = self._num(source, aliases_max)

            if observed is not None and lo is not None and hi is not None:
                values[nutrient] = self._range_score(observed, lo, hi)
            else:
                values[nutrient] = None

        score = self._weighted_mean(values, self.SOIL_WEIGHTS)
        return score, {k: (None if v is None else round(v, 1)) for k, v in values.items()}, pros, cons

    # ------------------------------------------------------------------
    # WATER
    # ------------------------------------------------------------------

    def _water_score(self, farm: Dict[str, Any], crop: pd.Series, req: Optional[pd.Series]):
        availability = str(farm.get("water_availability", "medium")).strip().lower()
        source = req if req is not None else crop
        requirement = self._num(
            source,
            ["water_requirement_l_day", "water_requirement_mm", "water_requirement"],
        )
        drought = self._num(
            source,
            ["drought_tolerance_index", "drought_tolerance"],
        )

        availability_score = {
            "low": 35.0,
            "medium": 70.0,
            "high": 95.0,
        }.get(availability, 70.0)

        drought_score = None
        if drought is not None:
            drought_score = drought * 100.0 if 0 <= drought <= 1 else max(0.0, min(100.0, drought))

        requirement_penalty = 0.0
        if requirement is not None:
            if availability == "low":
                requirement_penalty = min(25.0, requirement / 100.0)
            elif availability == "medium":
                requirement_penalty = min(10.0, requirement / 200.0)

        water_score = availability_score - requirement_penalty
        if drought_score is not None:
            water_score = 0.75 * water_score + 0.25 * drought_score

        water_score = round(max(0.0, min(100.0, water_score)), 1)
        pros, cons = [], []
        if water_score >= 80:
            pros.append("Water: available supply is broadly compatible with this crop.")
        elif water_score >= 60:
            cons.append("Water: efficient irrigation should be planned.")
        else:
            cons.append("Water: low availability creates meaningful crop stress risk; drip/micro-irrigation is recommended.")

        return water_score, pros, cons

    # ------------------------------------------------------------------
    # MARKET
    # ------------------------------------------------------------------

    def _market_score(self, state: str, district: str, crop_name: str):
        try:
            mandi = self.api_service.get_mandi_market_data(state, district, crop_name) or {}
        except Exception as exc:
            logger.warning("Market API unavailable for %s: %s", crop_name, exc)
            mandi = {}

        trend = str(mandi.get("price_trend", "STABLE")).upper()
        price = mandi.get("modal_price_per_qtl")

        trend_score = {
            "UPWARD": 100.0,
            "STABLE": 70.0,
            "DOWNWARD": 40.0,
        }.get(trend, 60.0)

        return {
            "score": trend_score,
            "modal_price": price,
            "trend": trend,
        }

    # ------------------------------------------------------------------
    # VARIETY LAYER
    # ------------------------------------------------------------------

    def _crop_id_for_focus(self, crop_record: pd.Series) -> str:
        return self._norm_id(crop_record.get("crop_id", ""))

    def _variety_candidates(
        self,
        crop_record: pd.Series,
        region: pd.Series,
    ) -> pd.DataFrame:
        varieties = self.loader.varieties_df.copy()
        if varieties.empty or "crop_id" not in varieties.columns:
            return varieties.iloc[0:0]

        crop_id = self._crop_id_for_focus(crop_record)
        varieties["_cid"] = varieties["crop_id"].map(self._norm_id)
        candidates = varieties[varieties["_cid"] == crop_id].copy()

        if candidates.empty and "crop_name" in varieties.columns:
            canonical = self._normalize_name(crop_record.get("crop_name", ""))
            candidates = varieties[
                varieties["crop_name"].map(self._normalize_name) == canonical
            ].copy()

        if "state" in candidates.columns:
            state_filtered = candidates[
                candidates["state"].astype(str).str.strip().str.casefold()
                == self.state_scope.casefold()
            ]
            candidates = state_filtered

        if "variety_name" in candidates.columns:
            candidates = candidates.drop_duplicates(
                subset=["variety_name"], keep="first"
            )

        return candidates

    def _score_variety(
        self,
        variety: pd.Series,
        region: pd.Series,
        soil: pd.Series,
        farm: Dict[str, Any],
        live_temp: Optional[float],
        live_weather: bool,
    ):
        factors = {}
        reasons = []
        cautions = []

        cultivation_region = str(variety.get("cultivation_region", "")).casefold()
        region_text = " ".join(
            str(region.get(c, ""))
            for c in ["district", "region", "region_name", "cultivation_region"]
            if c in region.index
        ).casefold()

        if cultivation_region.strip():
            factors["regional_fit"] = (
                100.0 if any(token and token in region_text for token in re.split(r"[,;/|]+", cultivation_region))
                else 70.0
            )
        else:
            factors["regional_fit"] = 70.0

        tmin = self._num(variety, ["optimal_temperature_min_c"])
        tmax = self._num(variety, ["optimal_temperature_max_c"])
        live = live_temp if live_weather else None

        if live is not None and tmin is not None and tmax is not None:
            factors["temperature_fit"] = self._range_score(live, tmin, tmax)
        else:
            reg_min = self._num(region, ["avg_temp_min", "annual_avg_temp_min", "temp_min"])
            reg_max = self._num(region, ["avg_temp_max", "annual_avg_temp_max", "temp_max"])
            if reg_min is not None and reg_max is not None and tmin is not None and tmax is not None:
                factors["temperature_fit"] = (
                    self._range_score(reg_min, tmin, tmax)
                    + self._range_score(reg_max, tmin, tmax)
                ) / 2.0

        rain = self._num(region, ["annual_rainfall_mm", "rainfall_mm", "annual_rainfall"])
        vrain = self._num(variety, ["rainfall_requirement_mm"])
        if rain is not None and vrain is not None and vrain > 0:
            factors["rainfall_fit"] = max(
                0.0, 100.0 - min(abs(rain / vrain - 1.0), 1.0) * 100.0
            )

        water_avail = str(farm.get("water_availability", "medium")).lower()
        water_score = {"low": 35.0, "medium": 70.0, "high": 95.0}.get(water_avail, 70.0)

        drought = self._num(variety, ["drought_tolerance_index"])
        if drought is not None:
            drought_score = drought * 100.0 if 0 <= drought <= 1 else max(0.0, min(100.0, drought))
            water_score = 0.75 * water_score + 0.25 * drought_score

        factors["water_fit"] = water_score

        heat = self._num(variety, ["heat_tolerance_index"])
        if heat is not None:
            factors["heat_tolerance"] = heat * 100.0 if 0 <= heat <= 1 else max(0.0, min(100.0, heat))

        disease_cols = [
            "powdery_mildew_risk",
            "downy_mildew_risk",
            "anthracnose_risk",
            "fruit_cracking_risk",
        ]
        disease_scores = []
        for col in disease_cols:
            if col in variety.index and pd.notna(variety[col]):
                raw = str(variety[col]).strip().casefold()
                mapping = {
                    "low": 100.0,
                    "medium": 70.0,
                    "moderate": 70.0,
                    "high": 35.0,
                    "very high": 15.0,
                }
                if raw in mapping:
                    disease_scores.append(mapping[raw])
                else:
                    try:
                        x = float(variety[col])
                        disease_scores.append(max(0.0, min(100.0, 100.0 - x)))
                    except (TypeError, ValueError):
                        pass

        if disease_scores:
            factors["disease_resilience"] = sum(disease_scores) / len(disease_scores)

        demand = str(variety.get("market_demand", "")).casefold()
        demand_score = {"very high": 100.0, "high": 85.0, "medium": 65.0, "low": 40.0}.get(demand)
        if demand_score is not None:
            factors["market_demand"] = demand_score

        profit = str(variety.get("profit_potential", "")).casefold()
        profit_score = {"very high": 100.0, "high": 85.0, "medium": 65.0, "low": 40.0}.get(profit)
        if profit_score is not None:
            factors["profit_potential"] = profit_score

        weights = {
            "regional_fit": 0.20,
            "temperature_fit": 0.20,
            "rainfall_fit": 0.10,
            "water_fit": 0.15,
            "heat_tolerance": 0.10,
            "disease_resilience": 0.10,
            "market_demand": 0.025,
            "profit_potential": 0.025,
        }

        score = self._weighted_mean(factors, weights)

        if score >= 85:
            reasons.append("Strong match across available farm, climate, and variety attributes.")
        elif score >= 70:
            reasons.append("Good overall match, with minor management constraints.")
        else:
            cautions.append("Several variety requirements do not closely match the farm profile.")

        return score, factors, reasons, cautions

    def _recommend_grape_varieties(
        self,
        crop_record: pd.Series,
        region: pd.Series,
        soil: pd.Series,
        farm: Dict[str, Any],
        live_temp: Optional[float],
        live_weather: bool,
    ) -> List[Dict[str, Any]]:
        candidates = self._variety_candidates(crop_record, region)
        results = []

        for _, variety in candidates.iterrows():
            score, factors, reasons, cautions = self._score_variety(
                variety, region, soil, farm, live_temp, live_weather
            )

            results.append(
                {
                    "variety_id": variety.get("variety_id"),
                    "variety_name": variety.get("variety_name", "Unknown"),
                    "state": variety.get("state"),
                    "cultivation_region": variety.get("cultivation_region"),
                    "suitability_score": round(score, 1),
                    "factor_scores": {k: round(v, 1) for k, v in factors.items()},
                    "reasons": reasons,
                    "cautions": cautions,
                    "traits": {
                        key: variety.get(key)
                        for key in [
                            "berry_color",
                            "berry_shape",
                            "berry_size",
                            "seed_status",
                            "bunch_size",
                            "cultivation_region",
                        ]
                        if key in variety.index and pd.notna(variety.get(key))
                    },
                    "yield_ton_ha": self._num(variety, ["expected_yield_ton_ha"]),
                    "crop_duration_days": self._num(variety, ["crop_duration_days"]),
                    "berry_color": variety.get("berry_color"),
                    "market_demand": variety.get("market_demand"),
                    "profit_potential": variety.get("profit_potential"),
                }
            )

        results.sort(key=lambda x: x["suitability_score"], reverse=True)
        return results

    # ------------------------------------------------------------------
    # MAIN EVALUATION
    # ------------------------------------------------------------------

    def evaluate_farm(self, farm_data: Dict[str, Any], top_n: int = 5) -> Dict[str, Any]:
        region = self._get_region(farm_data)
        soil = self._get_soil(farm_data)

        lat = farm_data.get("latitude")
        lon = farm_data.get("longitude")

        weather = {"is_live": False, "temp_c": None}
        if lat is not None and lon is not None:
            try:
                weather = self.api_service.get_live_weather(float(lat), float(lon)) or weather
            except Exception as exc:
                logger.warning("Live weather unavailable: %s", exc)

        live_weather = bool(weather.get("is_live", False))
        live_temp = weather.get("temp_c")

        crops = self.loader.crops_df.copy()
        if "crop_name" not in crops.columns:
            raise ValueError("Crop knowledge base must contain 'crop_name'.")

        crops["_canonical_crop"] = crops["crop_name"].map(self._normalize_name)

        recommendations = []
        disqualified = []

        for _, crop in crops.iterrows():
            crop_name = crop["_canonical_crop"]
            req = self._get_crop_requirements(crop, soil)

            climate_score, climate_tree, climate_pros, climate_cons = self._climate_score(
                crop, req, region, live_temp, live_weather
            )
            soil_score, soil_tree, soil_pros, soil_cons = self._soil_score(
                soil, crop, req
            )
            water_score, water_pros, water_cons = self._water_score(
                farm_data, crop, req
            )

            agronomic = self._weighted_mean(
                {
                    "climate": climate_score,
                    "soil": soil_score,
                    "water": water_score,
                },
                self.AGRONOMIC_WEIGHTS,
            )

            if agronomic < self.AGRONOMIC_PASS_THRESHOLD:
                disqualified.append(
                    {
                        "crop_id": crop.get("crop_id"),
                        "crop_name": crop_name,
                        "agronomic_score": agronomic,
                        "reason": (
                            f"Aggregate agronomic score {agronomic:.1f}% "
                            f"is below the {self.AGRONOMIC_PASS_THRESHOLD:.1f}% threshold."
                        ),
                    }
                )
                continue

            state = str(region.get("state", self.state_scope))
            district = str(region.get("district", ""))

            market = self._market_score(state, district, crop_name)

            final_score = round(
                agronomic * self.FINAL_WEIGHTS["agronomic"]
                + market["score"] * self.FINAL_WEIGHTS["market"],
                1,
            )

            if final_score >= 90:
                band = "Excellent"
            elif final_score >= 80:
                band = "Highly Suitable"
            elif final_score >= 70:
                band = "Suitable"
            elif final_score >= 60:
                band = "Marginal"
            else:
                band = "Low Suitability"

            rec = {
                "crop_id": crop.get("crop_id"),
                "crop_name": crop_name,
                "is_focus_crop": crop_name == self.focus_crop,
                "final_suitability_score": final_score,
                "agronomic_score": agronomic,
                "suitability_band": band,
                "score_tree": {
                    "agronomic_total": agronomic,
                    "climate": {
                        "score": climate_score,
                        "weight": self.AGRONOMIC_WEIGHTS["climate"],
                        "sub_tree": climate_tree,
                    },
                    "soil": {
                        "score": soil_score,
                        "weight": self.AGRONOMIC_WEIGHTS["soil"],
                        "sub_tree": soil_tree,
                    },
                    "water": {
                        "score": water_score,
                        "weight": self.AGRONOMIC_WEIGHTS["water"],
                    },
                    "market": {
                        "score": market["score"],
                        "weight": self.FINAL_WEIGHTS["market"],
                        "modal_price": market["modal_price"],
                        "trend": market["trend"],
                    },
                },
                "pros": climate_pros + soil_pros + water_pros,
                "cons": climate_cons + soil_cons + water_cons,
                "variety_recommendations": [],
            }

            rec["decision_explanation"] = {
                "why": (
                    f"{crop_name.title()} scores {final_score:.1f}% because its climate, "
                    f"soil, water, and market checks are combined."
                ),
                "strengths": climate_pros + soil_pros + water_pros,
                "management": climate_cons + soil_cons + water_cons,
            }

            recommendations.append(rec)

        # Crop data contains multiple regional records for the same crop. Keep
        # only the highest-scoring record for each canonical crop name.
        unique_recommendations = {}
        for recommendation in recommendations:
            unique_recommendations.setdefault(
                recommendation["crop_name"], recommendation
            )
        recommendations = list(unique_recommendations.values())

        # The focus crop is a farmer preference, so it leads when it passes
        # agronomic screening. Its measured score is never altered.
        recommendations.sort(
            key=lambda r: (
                self.prefer_focus_crop and r["is_focus_crop"],
                r["final_suitability_score"],
            ),
            reverse=True,
        )

        focus_crop_row = crops[crops["_canonical_crop"] == self.focus_crop]
        if not focus_crop_row.empty:
            focus_varieties = self._recommend_grape_varieties(
                focus_crop_row.iloc[0],
                region,
                soil,
                farm_data,
                live_temp,
                live_weather,
            )
            for recommendation in recommendations:
                if recommendation["is_focus_crop"]:
                    recommendation["variety_recommendations"] = focus_varieties

        return {
            "location": {
                "state": str(region.get("state", self.state_scope)),
                "district": str(region.get("district", "Unknown")),
                "region_id": str(region.get("region_id", "")),
            },
            "soil_profile": {
                "soil_id": str(soil.get("soil_id", "")),
                "type": self._first(soil, ["soil_type", "soil_name", "texture"], "Unknown"),
                "ph": self._num(soil, ["ph", "pH", "soil_ph"]),
                "oc": self._num(soil, ["oc", "organic_carbon", "organic_carbon_pct"]),
                "ec": self._num(soil, ["ec", "electrical_conductivity", "ec_ds_m"]),
            },
            "water_availability": str(farm_data.get("water_availability", "medium")).lower(),
            "live_weather_applied": live_weather,
            "weather_source": weather.get("source", "unknown"),
            "focus_crop": self.focus_crop,
            "primary_recommendations": recommendations[:top_n],
            "all_recommendations": recommendations,
            "disqualified_crops": disqualified,
        }