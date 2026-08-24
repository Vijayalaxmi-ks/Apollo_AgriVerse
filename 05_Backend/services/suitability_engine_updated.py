import logging
import re
from typing import Any, Dict, List, Tuple

import pandas as pd

from services.external_apis import ExternalDataService
from services.knowledge_loader import KnowledgeBaseLoader

logger = logging.getLogger("AgronomicSuitabilityEngine")


class AgronomicSuitabilityEngine:
    """
    Apollo AgriVerse - Farm Suitability Engine.

    Current prototype scope:
    - Maharashtra-focused farm evaluation.
    - Grape is the primary crop of interest.
    - Other Maharashtra-relevant crops are retained for comparison.
    - Agronomic suitability is evaluated BEFORE market ranking.
    - The engine returns both technical scores and farmer-friendly reasons.

    Important:
    This engine does not invent agronomic values. Where a knowledge-base field is
    unavailable, it uses a neutral baseline and records that the factor is not
    available instead of pretending that a measurement exists.
    """

    HIGH_WATER_CROPS = {
        "SUGARCANE",
        "RICE",
        "PADDY",
        "BANANA",
    }

    LOW_WATER_CROPS = {
        "MILLET",
        "BAJRA",
        "JOWAR",
        "SORGHUM",
    }

    MAHARASHTRA_CROPS = {
        "GRAPE",
        "POMEGRANATE",
        "ONION",
        "COTTON",
        "SUGARCANE",
        "SOYBEAN",
        "JOWAR",
        "SORGHUM",
        "BAJRA",
        "MAIZE",
        "WHEAT",
        "RICE",
        "PADDY",
        "TUR",
        "CHICKPEA",
        "GRAM",
        "GROUNDNUT",
        "SUNFLOWER",
    }

    FOCUS_CROP = "GRAPE"

    AGRONOMIC_PASS_THRESHOLD = 60.0

    def __init__(
        self,
        loader: KnowledgeBaseLoader,
        api_service: ExternalDataService,
        state_scope: str = "Maharashtra",
        focus_crop: str = "GRAPE",
    ):
        self.loader = loader
        self.api_service = api_service
        self.state_scope = state_scope
        self.focus_crop = self._normalize_crop_name(focus_crop)

    # ------------------------------------------------------------------
    # NORMALIZATION / HELPERS
    # ------------------------------------------------------------------

    def _normalize_crop_name(self, name: str) -> str:
        clean = re.sub(r"[^a-zA-Z]", "", str(name)).lower()

        aliases = {
            "grapes": "grape",
            "paddy": "rice",
            "sorghum": "jowar",
            "chickpeas": "chickpea",
            "gram": "chickpea",
        }

        clean = aliases.get(clean, clean)
        return clean.upper()

    @staticmethod
    def _first_value(row: pd.Series, aliases: List[str], default=None):
        for key in aliases:
            if key in row.index and pd.notna(row[key]):
                value = row[key]
                if str(value).strip() != "":
                    return value
        return default

    @staticmethod
    def _numeric(row: pd.Series, aliases: List[str], default=None):
        value = AgronomicSuitabilityEngine._first_value(row, aliases, default)
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return default

    def _get_region(self, farm_data: Dict[str, Any]) -> pd.Series:
        regions = self.loader.regions_df.copy()

        region_id = farm_data.get("region_id")
        if region_id is not None:
            match = regions[regions["region_id"].astype(str) == str(region_id)]
            if not match.empty:
                row = match.iloc[0]
                if str(row.get("state", "")).strip().lower() == self.state_scope.lower():
                    return row

        state_rows = regions[
            regions["state"].astype(str).str.strip().str.lower()
            == self.state_scope.lower()
        ]

        if state_rows.empty:
            raise ValueError(
                f"No {self.state_scope} region exists in the loaded region knowledge base."
            )

        preferred_districts = ["Nashik", "Pune", "Sangli", "Satara", "Ahmednagar", "Solapur"]
        for district in preferred_districts:
            match = state_rows[
                state_rows["district"].astype(str).str.strip().str.lower()
                == district.lower()
            ]
            if not match.empty:
                return match.iloc[0]

        return state_rows.iloc[0]

    def _get_soil(self, farm_data: Dict[str, Any]) -> pd.Series:
        soils = self.loader.soils_df.copy()

        soil_id = farm_data.get("soil_id")
        if soil_id is not None:
            match = soils[soils["soil_id"].astype(str) == str(soil_id)]
            if not match.empty:
                return match.iloc[0]

        # Prefer Maharashtra-relevant black soils for the current prototype.
        soil_text = soils.astype(str).agg(" ".join, axis=1).str.lower()
        black = soils[soil_text.str.contains("black|regur|vertisol", regex=True, na=False)]
        if not black.empty:
            return black.iloc[0]

        return soils.iloc[0]

    def _candidate_crops(self) -> pd.DataFrame:
        crops = self.loader.crops_df.copy()
        crops["canonical_name"] = crops["crop_name"].apply(self._normalize_crop_name)
        crops = crops.drop_duplicates(subset=["canonical_name"])

        # Keep only the Maharashtra crop set where possible.
        scoped = crops[crops["canonical_name"].isin(self.MAHARASHTRA_CROPS)]

        # If the knowledge base has fewer rows than expected, do not fail.
        # Use the available crop knowledge rather than inventing rows.
        if not scoped.empty:
            crops = scoped

        return crops

    # ------------------------------------------------------------------
    # CLIMATE
    # ------------------------------------------------------------------

    def _calculate_multi_vector_climate_score(
        self,
        live_temp: float,
        live_weather: bool,
        region_info: pd.Series,
        crop: pd.Series,
    ) -> Tuple[float, Dict[str, float], List[str], List[str]]:
        pros, cons = [], []

        hist_min = self._numeric(
            region_info,
            ["avg_temp_min", "annual_avg_temp_min", "temp_min"],
            20.0,
        )
        hist_max = self._numeric(
            region_info,
            ["avg_temp_max", "annual_avg_temp_max", "temp_max"],
            37.0,
        )

        crop_min = self._numeric(
            crop,
            ["ideal_temp_min", "min_temp", "temp_min"],
            18.0,
        )
        crop_max = self._numeric(
            crop,
            ["ideal_temp_max", "max_temp", "temp_max"],
            36.0,
        )

        # Seasonal compatibility: overlap between regional and crop temperature ranges.
        overlap_min = max(hist_min, crop_min)
        overlap_max = min(hist_max, crop_max)

        if overlap_min <= overlap_max:
            seasonal_score = 100.0
            pros.append(
                f"Seasonal climate: the regional temperature range "
                f"({hist_min:.1f}–{hist_max:.1f}°C) overlaps the crop's preferred "
                f"range ({crop_min:.1f}–{crop_max:.1f}°C)."
            )
        else:
            gap = min(abs(hist_min - crop_max), abs(crop_min - hist_max))
            seasonal_score = max(0.0, 100.0 - gap * 12.0)
            cons.append(
                f"Seasonal climate: the regional temperature pattern is outside "
                f"the preferred range ({crop_min:.1f}–{crop_max:.1f}°C)."
            )

        rainfall = self._numeric(
            region_info,
            ["annual_rainfall_mm", "rainfall_mm", "annual_rainfall"],
            None,
        )

        if rainfall is None:
            rainfall_score = 70.0
            cons.append("Rainfall: regional rainfall data is not available in the knowledge base.")
        else:
            # Conservative prototype score; exact crop rainfall requirements
            # should come from crop-specific knowledge when those fields exist.
            rainfall_score = 90.0 if rainfall >= 700 else 65.0
            if rainfall >= 700:
                pros.append(
                    f"Seasonal rainfall: the regional annual rainfall is about {rainfall:.0f} mm."
                )
            else:
                cons.append(
                    f"Seasonal rainfall: annual rainfall is relatively low ({rainfall:.0f} mm); "
                    "irrigation planning is important."
                )

        live_score = 70.0
        if live_weather and live_temp is not None:
            if crop_min <= live_temp <= crop_max:
                live_score = 100.0
                pros.append(
                    f"Current weather: live temperature ({live_temp:.1f}°C) is within "
                    f"the crop's preferred range."
                )
            else:
                distance = min(abs(live_temp - crop_min), abs(live_temp - crop_max))
                live_score = max(0.0, 100.0 - distance * 15.0)
                cons.append(
                    f"Current weather: live temperature ({live_temp:.1f}°C) is outside "
                    f"the crop's preferred range."
                )
        else:
            pros.append(
                "Current weather: live telemetry is unavailable, so the score relies "
                "on the regional climate profile."
            )

        total = round(
            (seasonal_score * 0.50)
            + (rainfall_score * 0.30)
            + (live_score * 0.20),
            1,
        )

        breakdown = {
            "seasonal_temperature": round(seasonal_score, 1),
            "rainfall": round(rainfall_score, 1),
            "live_temperature": round(live_score, 1),
        }

        return total, breakdown, pros, cons

    # ------------------------------------------------------------------
    # SOIL
    # ------------------------------------------------------------------

    def _score_range(
        self,
        value: float,
        minimum: float,
        maximum: float,
    ) -> float:
        if minimum <= value <= maximum:
            return 100.0

        distance = min(abs(value - minimum), abs(value - maximum))
        return max(0.0, 100.0 - distance * 20.0)

    def _calculate_expanded_soil_score(
        self,
        soil_info: pd.Series,
        crop: pd.Series,
    ) -> Tuple[float, Dict[str, float], List[str], List[str]]:
        pros, cons = [], []

        soil_ph = self._numeric(soil_info, ["ph", "pH"], 7.2)
        min_ph = self._numeric(crop, ["min_ph", "ph_min"], 6.0)
        max_ph = self._numeric(crop, ["max_ph", "ph_max"], 8.0)

        ph_score = self._score_range(soil_ph, min_ph, max_ph)

        if ph_score >= 90:
            pros.append(
                f"Soil acidity: pH {soil_ph:.2f} is suitable for the crop "
                f"(preferred range {min_ph:.1f}–{max_ph:.1f})."
            )
        else:
            cons.append(
                f"Soil acidity: pH {soil_ph:.2f} is outside the preferred range; "
                "soil correction may be required."
            )

        # Soil type / texture compatibility.
        soil_type = str(
            self._first_value(soil_info, ["soil_type", "soil_name", "texture"], "Unknown")
        ).strip()

        crop_texture = self._first_value(
            crop,
            ["preferred_soil_type", "soil_type", "preferred_texture", "texture"],
            None,
        )

        if crop_texture is None:
            texture_score = 75.0
            cons.append(
                "Soil structure: crop-specific texture requirements are not present "
                "in the current knowledge base."
            )
        else:
            required = str(crop_texture).lower()
            actual = soil_type.lower()
            texture_score = 100.0 if (
                required in actual or actual in required
            ) else 55.0

            if texture_score >= 90:
                pros.append(
                    f"Soil structure: {soil_type} is compatible with the crop's "
                    f"preferred soil type."
                )
            else:
                cons.append(
                    f"Soil structure: the farm has {soil_type}, while the crop "
                    f"knowledge base prefers {crop_texture}."
                )

        oc = self._numeric(
            soil_info,
            ["oc", "organic_carbon", "organic_carbon_pct"],
            None,
        )

        if oc is None:
            oc_score = 70.0
            cons.append("Organic carbon: no measured value is available in the soil profile.")
        else:
            oc_score = 100.0 if oc >= 0.75 else 80.0 if oc >= 0.5 else 60.0
            if oc >= 0.75:
                pros.append(f"Organic carbon: {oc:.2f}% provides a good soil carbon base.")
            elif oc >= 0.5:
                pros.append(f"Organic carbon: {oc:.2f}% is moderate; organic matter management is recommended.")
            else:
                cons.append(f"Organic carbon: {oc:.2f}% is low; organic matter improvement is recommended.")

        ec = self._numeric(
            soil_info,
            ["ec", "electrical_conductivity", "ec_ds_m"],
            None,
        )

        if ec is None:
            ec_score = 70.0
            cons.append("Salinity: EC measurement is not available in the soil profile.")
        else:
            if ec <= 2.0:
                ec_score = 100.0
                pros.append(f"Salinity: EC {ec:.2f} dS/m is within the current tolerance limit.")
            else:
                ec_score = max(0.0, 100.0 - (ec - 2.0) * 25.0)
                cons.append(
                    f"Salinity: EC {ec:.2f} dS/m is elevated and may stress the crop."
                )

        # Do not fabricate NPK numbers. If the soil KB has them, use them;
        # otherwise report that the factor needs a soil-test input.
        npk_available = all(
            self._numeric(soil_info, aliases, None) is not None
            for aliases in [
                ["n", "nitrogen", "nitrogen_kg_ha"],
                ["p", "phosphorus", "phosphorus_kg_ha"],
                ["k", "potassium", "potassium_kg_ha"],
            ]
        )

        if npk_available:
            npk_score = 85.0
            pros.append("NPK: measured nutrient values are available for nutrient-level assessment.")
        else:
            npk_score = 70.0
            cons.append(
                "NPK: a complete measured N-P-K profile is required for precise fertilizer advice."
            )

        sub_scores = {
            "ph": round(ph_score, 1),
            "texture": round(texture_score, 1),
            "organic_carbon": round(oc_score, 1),
            "ec_salinity": round(ec_score, 1),
            "npk_balance": round(npk_score, 1),
        }

        overall_soil = round(sum(sub_scores.values()) / len(sub_scores), 1)
        return overall_soil, sub_scores, pros, cons

    # ------------------------------------------------------------------
    # WATER
    # ------------------------------------------------------------------

    def _get_water_req_level(self, crop_name: str, crop: pd.Series) -> str:
        req = str(crop.get("water_requirement", "")).lower()

        if crop_name in self.HIGH_WATER_CROPS or "high" in req:
            return "high"

        if crop_name in self.LOW_WATER_CROPS or "low" in req:
            return "low"

        return "medium"

    def _calculate_water_score(
        self,
        water_avail: str,
        water_req: str,
    ) -> Tuple[float, List[str], List[str]]:
        matrix = {
            "low": {"high": 35.0, "medium": 50.0, "low": 65.0},
            "medium": {"high": 60.0, "medium": 80.0, "low": 90.0},
            "high": {"high": 85.0, "medium": 95.0, "low": 100.0},
        }

        availability = water_avail if water_avail in matrix else "medium"
        score = matrix[availability][water_req]

        pros, cons = [], []

        if score >= 80:
            pros.append("Water: current water availability is adequate for this crop.")
        elif score >= 60:
            cons.append(
                "Water: moderate constraint; efficient irrigation should be planned."
            )
        else:
            cons.append(
                "Water: significant constraint; reliable micro-irrigation and water "
                "conservation will be required."
            )

        return score, pros, cons

    # ------------------------------------------------------------------
    # EVALUATION
    # ------------------------------------------------------------------

    def evaluate_farm(self, farm_data: Dict[str, Any], top_n: int = 5) -> Dict[str, Any]:
        region_info = self._get_region(farm_data)
        soil_info = self._get_soil(farm_data)

        lat = farm_data.get("latitude")
        lon = farm_data.get("longitude")

        weather = {"is_live": False, "temp_c": None}
        if lat is not None and lon is not None:
            try:
                weather = self.api_service.get_live_weather(float(lat), float(lon))
            except Exception as exc:
                logger.warning("Live weather unavailable: %s", exc)

        live_weather = bool(weather.get("is_live", False))
        live_temp = weather.get("temp_c")

        water_avail = str(
            farm_data.get("water_availability", "medium")
        ).strip().lower()

        crops_df = self._candidate_crops()

        recs, disqualified = [], []

        for _, crop in crops_df.iterrows():
            crop_name = crop["canonical_name"]
            water_req = self._get_water_req_level(crop_name, crop)

            c_score, c_breakdown, c_pros, c_cons = (
                self._calculate_multi_vector_climate_score(
                    live_temp, live_weather, region_info, crop
                )
            )

            s_score, s_sub, s_pros, s_cons = self._calculate_expanded_soil_score(
                soil_info, crop
            )

            w_score, w_pros, w_cons = self._calculate_water_score(
                water_avail, water_req
            )

            agronomic_score = round(
                (c_score * 0.4)
                + (s_score * 0.4)
                + (w_score * 0.2),
                1,
            )

            if agronomic_score < self.AGRONOMIC_PASS_THRESHOLD:
                disqualified.append(
                    {
                        "crop_name": crop_name,
                        "agronomic_score": agronomic_score,
                        "reason": (
                            f"Agronomic score {agronomic_score:.1f}% is below "
                            f"the minimum threshold of "
                            f"{self.AGRONOMIC_PASS_THRESHOLD:.1f}%."
                        ),
                    }
                )
                continue

            # Market data is only used AFTER agronomic viability is established.
            state = str(region_info.get("state", self.state_scope))
            district = str(region_info.get("district", ""))
            try:
                mandi = self.api_service.get_mandi_market_data(
                    state, district, crop_name
                )
            except Exception as exc:
                logger.warning("Market data unavailable for %s: %s", crop_name, exc)
                mandi = {}

            price = mandi.get("modal_price_per_qtl")
            trend = str(mandi.get("price_trend", "STABLE")).upper()

            if trend == "UPWARD":
                market_score = 80.0
            elif trend == "DOWNWARD":
                market_score = 50.0
            else:
                market_score = 65.0

            final_score = round(
                (agronomic_score * 0.7) + (market_score * 0.3),
                1,
            )

            if final_score >= 90:
                band = "Excellent"
            elif final_score >= 80:
                band = "Highly Suitable"
            elif final_score >= 70:
                band = "Suitable"
            else:
                band = "Marginal"

            # Keep grape explicit in the returned record.
            is_focus_crop = crop_name == self.focus_crop

            recs.append(
                {
                    "crop_name": crop_name,
                    "is_focus_crop": is_focus_crop,
                    "final_suitability_score": final_score,
                    "agronomic_score": agronomic_score,
                    "suitability_band": band,
                    "water_requirement": water_req,
                    "score_tree": {
                        "agronomic_total": agronomic_score,
                        "climate": {
                            "score": c_score,
                            "weight": 0.4,
                            "sub_tree": c_breakdown,
                        },
                        "soil": {
                            "score": s_score,
                            "weight": 0.4,
                            "sub_tree": s_sub,
                        },
                        "water": {
                            "score": w_score,
                            "weight": 0.2,
                        },
                        "market": {
                            "score": market_score,
                            "weight": 0.3,
                            "modal_price": price,
                            "trend": trend,
                        },
                    },
                    "pros": c_pros + s_pros + w_pros,
                    "cons": c_cons + s_cons + w_cons,
                    "penalties_applied": [],
                }
            )

        recs.sort(
            key=lambda x: (
                x["is_focus_crop"],
                x["final_suitability_score"],
            ),
            reverse=True,
        )

        # Preserve an actual score ranking separately.
        ranked_recs = sorted(
            recs,
            key=lambda x: x["final_suitability_score"],
            reverse=True,
        )

        focus_record = next(
            (r for r in recs if r["is_focus_crop"]),
            None,
        )

        return {
            "location": {
                "district": str(region_info.get("district", "Unknown")),
                "state": str(region_info.get("state", self.state_scope)),
                "region_id": str(region_info.get("region_id", "")),
            },
            "soil_profile": {
                "type": str(
                    self._first_value(
                        soil_info,
                        ["soil_type", "soil_name", "texture"],
                        "Unknown",
                    )
                ),
                "soil_id": str(soil_info.get("soil_id", "")),
                "ph": self._numeric(soil_info, ["ph", "pH"], 7.2),
                "oc": self._numeric(
                    soil_info,
                    ["oc", "organic_carbon", "organic_carbon_pct"],
                    None,
                ),
                "ec": self._numeric(
                    soil_info,
                    ["ec", "electrical_conductivity", "ec_ds_m"],
                    None,
                ),
            },
            "water_availability": water_avail,
            "live_weather_applied": live_weather,
            "focus_crop": self.focus_crop,
            "focus_crop_assessment": focus_record,
            "primary_recommendations": ranked_recs[:top_n],
            "disqualified_crops": disqualified,
        }