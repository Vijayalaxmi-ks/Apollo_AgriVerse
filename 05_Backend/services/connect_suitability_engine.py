import logging
import re
from typing import Any, Dict, List, Tuple, Optional
import pandas as pd

from services.external_apis import ExternalDataService
from services.knowledge_loader import KnowledgeBaseLoader
from services.ml_engine_service import MLEngineService

logger = logging.getLogger("connectSuitabilityEngine")

class connectSuitabilityEngine:
    """Apollo AgriVerse - Integrated Farm Suitability & ML Estimation Engine.
    Combines multi-vector agronomic scoring with RandomForest yield predictions.
    """

    HIGH_WATER_CROPS = {"SUGARCANE", "RICE", "PADDY", "BANANA"}
    LOW_WATER_CROPS = {"MILLET", "BAJRA", "JOWAR", "SORGHUM"}
    MAHARASHTRA_CROPS = {
        "GRAPE", "POMEGRANATE", "ONION", "COTTON", "SUGARCANE", "SOYBEAN",
        "JOWAR", "SORGHUM", "BAJRA", "MAIZE", "WHEAT", "RICE", "PADDY",
        "TUR", "CHICKPEA", "GRAM", "GROUNDNUT", "SUNFLOWER"
    }
    FOCUS_CROP = "GRAPE"
    AGRONOMIC_PASS_THRESHOLD = 60.0

    def __init__(
        self,
        loader: KnowledgeBaseLoader,
        api_service: ExternalDataService,
        ml_service: Optional[MLEngineService] = None,
        state_scope: str = "Maharashtra",
        focus_crop: str = "GRAPE",
    ):
        self.loader = loader
        self.api_service = api_service
        self.ml_service = ml_service or MLEngineService()
        self.state_scope = state_scope
        self.focus_crop = self._normalize_crop_name(focus_crop)

    def _normalize_crop_name(self, name: str) -> str:
        clean = re.sub(r"[^a-zA-Z]", "", str(name)).lower()
        aliases = {"grapes": "grape", "paddy": "rice", "sorghum": "jowar", "chickpeas": "chickpea", "gram": "chickpea"}
        return aliases.get(clean, clean).upper()

    @staticmethod
    def _first_value(row: pd.Series, aliases: List[str], default=None):
        for key in aliases:
            if key in row.index and pd.notna(row[key]):
                val = row[key]
                if str(val).strip() != "":
                    return val
        return default

    @staticmethod
    def _numeric(row: pd.Series, aliases: List[str], default=None):
        val = connectSuitabilityEngine._first_value(row, aliases, default)
        if val is None:
            return None
        try:
            return float(val)
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

        state_rows = regions[regions["state"].astype(str).str.strip().str.lower() == self.state_scope.lower()]
        if state_rows.empty:
            raise ValueError(f"No {self.state_scope} region exists in the loaded knowledge base.")

        preferred_districts = ["Nashik", "Pune", "Sangli", "Satara", "Ahmednagar", "Solapur"]
        for district in preferred_districts:
            match = state_rows[state_rows["district"].astype(str).str.strip().str.lower() == district.lower()]
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

        soil_text = soils.astype(str).agg(" ".join, axis=1).str.lower()
        black = soils[soil_text.str.contains("black|regur|vertisol", regex=True, na=False)]
        if not black.empty:
            return black.iloc[0]
        return soils.iloc[0]

    def _candidate_crops(self) -> pd.DataFrame:
        crops = self.loader.crops_df.copy()
        crops["canonical_name"] = crops["crop_name"].apply(self._normalize_crop_name)
        crops = crops.drop_duplicates(subset=["canonical_name"])
        scoped = crops[crops["canonical_name"].isin(self.MAHARASHTRA_CROPS)]
        return scoped if not scoped.empty else crops

    def _calculate_multi_vector_climate_score(self, live_temp: float, live_weather: bool, region_info: pd.Series, crop: pd.Series) -> Tuple[float, Dict[str, float], List[str], List[str]]:
        pros, cons = [], []
        hist_min = self._numeric(region_info, ["avg_temp_min", "annual_avg_temp_min", "temp_min"], 20.0)
        hist_max = self._numeric(region_info, ["avg_temp_max", "annual_avg_temp_max", "temp_max"], 37.0)
        crop_min = self._numeric(crop, ["ideal_temp_min", "min_temp"], 18.0)
        crop_max = self._numeric(crop, ["ideal_temp_max", "max_temp"], 36.0)

        overlap_min = max(hist_min, crop_min)
        overlap_max = min(hist_max, crop_max)

        if overlap_min <= overlap_max:
            seasonal_score = 100.0
            pros.append(f"Seasonal climate: regional range ({hist_min:.1f}–{hist_max:.1f}°C) matches crop preference.")
        else:
            gap = min(abs(hist_min - crop_max), abs(crop_min - hist_max))
            seasonal_score = max(0.0, 100.0 - gap * 12.0)
            cons.append("Seasonal climate: regional temperature pattern is outside preferred crop range.")

        rainfall = self._numeric(region_info, ["annual_rainfall_mm", "rainfall_mm"], 650.0)
        rainfall_score = 90.0 if rainfall >= 700 else 65.0
        if rainfall >= 700:
            pros.append(f"Seasonal rainfall: annual average is {rainfall:.0f} mm.")
        else:
            cons.append(f"Seasonal rainfall: annual average is moderate ({rainfall:.0f} mm).")

        live_score = 70.0
        if live_weather and live_temp is not None:
            if crop_min <= live_temp <= crop_max:
                live_score = 100.0
                pros.append(f"Current weather: live temperature ({live_temp:.1f}°C) is optimal.")
            else:
                dist = min(abs(live_temp - crop_min), abs(live_temp - crop_max))
                live_score = max(0.0, 100.0 - dist * 15.0)
                cons.append(f"Current weather: live temperature ({live_temp:.1f}°C) is outside preferred range.")
        else:
            pros.append("Current weather: baseline regional climate profile applied.")

        total = round((seasonal_score * 0.50) + (rainfall_score * 0.30) + (live_score * 0.20), 1)
        return total, {"seasonal_temperature": round(seasonal_score, 1), "rainfall": round(rainfall_score, 1), "live_temperature": round(live_score, 1)}, pros, cons

    def _score_range(self, val: float, mini: float, maxi: float) -> float:
        if mini <= val <= maxi: return 100.0
        return max(0.0, 100.0 - min(abs(val - mini), abs(val - maxi)) * 20.0)

    def _calculate_expanded_soil_score(self, soil_info: pd.Series, crop: pd.Series) -> Tuple[float, Dict[str, float], List[str], List[str]]:
        pros, cons = [], []
        soil_ph = self._numeric(soil_info, ["ph", "pH"], 7.2)
        min_ph = self._numeric(crop, ["min_ph", "ph_min"], 6.0)
        max_ph = self._numeric(crop, ["max_ph", "ph_max"], 8.0)

        ph_score = self._score_range(soil_ph, min_ph, max_ph)
        if ph_score >= 90:
            pros.append(f"Soil acidity: pH {soil_ph:.2f} is within preferred range.")
        else:
            cons.append(f"Soil acidity: pH {soil_ph:.2f} requires buffer/correction.")

        soil_type = str(self._first_value(soil_info, ["soil_type", "soil_name", "texture"], "Black Soil")).strip()
        crop_texture = self._first_value(crop, ["preferred_soil_type", "soil_type", "texture"], None)

        texture_score = 75.0
        if crop_texture is not None:
            texture_score = 100.0 if (str(crop_texture).lower() in soil_type.lower() or soil_type.lower() in str(crop_texture).lower()) else 55.0

        oc = self._numeric(soil_info, ["oc", "organic_carbon"], 0.6)
        oc_score = 100.0 if oc >= 0.75 else 80.0 if oc >= 0.5 else 60.0

        ec = self._numeric(soil_info, ["ec", "electrical_conductivity"], 0.8)
        ec_score = 100.0 if ec <= 2.0 else max(0.0, 100.0 - (ec - 2.0) * 25.0)

        npk_score = 85.0 if all(self._numeric(soil_info, [k], None) is not None for k in ["n", "p", "k"]) else 70.0

        sub_scores = {"ph": round(ph_score, 1), "texture": round(texture_score, 1), "organic_carbon": round(oc_score, 1), "ec_salinity": round(ec_score, 1), "npk_balance": round(npk_score, 1)}
        return round(sum(sub_scores.values()) / len(sub_scores), 1), sub_scores, pros, cons

    def _calculate_water_score(self, water_avail: str, water_req: str) -> Tuple[float, List[str], List[str]]:
        matrix = {
            "low": {"high": 35.0, "medium": 50.0, "low": 65.0},
            "medium": {"high": 60.0, "medium": 80.0, "low": 90.0},
            "high": {"high": 85.0, "medium": 95.0, "low": 100.0},
        }
        score = matrix.get(water_avail, matrix["medium"]).get(water_req, 75.0)
        pros, cons = (["Water: current water availability is adequate."], []) if score >= 80 else ([], ["Water: constraint detected; planned micro-irrigation advised."])
        return score, pros, cons

    def evaluate_farm(self, farm_data: Dict[str, Any], top_n: int = 5) -> Dict[str, Any]:
        region_info = self._get_region(farm_data)
        soil_info = self._get_soil(farm_data)
        lat, lon = farm_data.get("latitude"), farm_data.get("longitude")
        
        weather = {"is_live": False, "temp_c": 27.5, "humidity": 60}
        if lat is not None and lon is not None:
            try: weather = self.api_service.get_live_weather(float(lat), float(lon))
            except Exception: pass

        live_weather = bool(weather.get("is_live", False))
        live_temp, live_humidity = weather.get("temp_c", 27.5), weather.get("humidity", 60)
        water_avail = str(farm_data.get("water_availability", "medium")).strip().lower()

        recs, disqualified = [], []
        crops_df = self._candidate_crops()

        for _, crop in crops_df.iterrows():
            crop_name = crop["canonical_name"]
            req_str = str(crop.get("water_requirement", "")).lower()
            water_req = "high" if crop_name in self.HIGH_WATER_CROPS or "high" in req_str else "low" if crop_name in self.LOW_WATER_CROPS or "low" in req_str else "medium"

            c_score, c_tree, c_pros, c_cons = self._calculate_multi_vector_climate_score(live_temp, live_weather, region_info, crop)
            s_score, s_tree, s_pros, s_cons = self._calculate_expanded_soil_score(soil_info, crop)
            w_score, w_pros, w_cons = self._calculate_water_score(water_avail, water_req)

            agronomic_score = round((c_score * 0.4) + (s_score * 0.4) + (w_score * 0.2), 1)

            if agronomic_score < self.AGRONOMIC_PASS_THRESHOLD:
                disqualified.append({"crop_name": crop_name, "agronomic_score": agronomic_score, "reason": f"Score {agronomic_score:.1f}% below minimum."})
                continue

            state = str(region_info.get("state", self.state_scope))
            district = str(region_info.get("district", ""))
            mandi = self.api_service.get_mandi_market_data(state, district, crop_name)
            trend = str(mandi.get("price_trend", "STABLE")).upper()
            market_score = 80.0 if trend == "UPWARD" else 50.0 if trend == "DOWNWARD" else 65.0
            final_score = round((agronomic_score * 0.7) + (market_score * 0.3), 1)
            
            is_focus_crop = crop_name == self.focus_crop
            predicted_yield_tons_ha = None

            # --- MACHINE LEARNING YIELD PREDICTION ---
            if is_focus_crop:
                try:
                    features_df = self.ml_service.prepare_yield_features(
                        n_mgkg=self._numeric(soil_info, ["n", "nitrogen", "nitrogen_mgkg"], 120.0),
                        p_mgkg=self._numeric(soil_info, ["p", "phosphorus", "phosphorus_mgkg"], 25.0),
                        k_mgkg=self._numeric(soil_info, ["k", "potassium", "potassium_mgkg"], 200.0),
                        soil_ph=self._numeric(soil_info, ["ph", "pH"], 7.2),
                        air_temp_c=live_temp,
                        humidity_pct=live_humidity,
                        rainfall_mm=self._numeric(region_info, ["annual_rainfall_mm", "rainfall_mm"], 650.0),
                    )
                    predicted_yield_tons_ha = self.ml_service.predict_grape_yield(features_df)
                except Exception as exc:
                    logger.warning(f"ML yield prediction skipped: {exc}")

            recs.append({
                "crop_name": crop_name,
                "is_focus_crop": is_focus_crop,
                "final_suitability_score": final_score,
                "agronomic_score": agronomic_score,
                "expected_yield_tons_ha": predicted_yield_tons_ha,
                "suitability_band": "Excellent" if final_score >= 90 else "Highly Suitable" if final_score >= 80 else "Suitable" if final_score >= 70 else "Marginal",
                "water_requirement": water_req,
                "score_tree": {"agronomic_total": agronomic_score, "climate": {"score": c_score, "weight": 0.4, "sub_tree": c_tree}, "soil": {"score": s_score, "weight": 0.4, "sub_tree": s_tree}, "water": {"score": w_score, "weight": 0.2}, "market": {"score": market_score, "weight": 0.3, "modal_price": mandi.get("modal_price_per_qtl"), "trend": trend}},
                "pros": c_pros + s_pros + w_pros, "cons": c_cons + s_cons + w_cons,
            })

        ranked_recs = sorted(recs, key=lambda x: x["final_suitability_score"], reverse=True)
        focus_record = next((r for r in recs if r["is_focus_crop"]), None)

        return {
            "location": {"district": str(region_info.get("district", "Unknown")), "state": str(region_info.get("state", self.state_scope)), "region_id": str(region_info.get("region_id", ""))},
            "soil_profile": {
                "type": str(self._first_value(soil_info, ["soil_type", "soil_name", "texture"], "Unknown")),
                "soil_id": str(soil_info.get("soil_id", "")),
                "ph": self._numeric(soil_info, ["ph", "pH"], 7.2),
                "oc": self._numeric(soil_info, ["oc", "organic_carbon", "organic_carbon_pct"], None),
                "ec": self._numeric(soil_info, ["ec", "electrical_conductivity", "electrical_conductivity_ds_m"], None),
                "n": self._numeric(soil_info, ["n", "nitrogen", "nitrogen_mgkg", "nitrogen_mg_kg"], None),
                "p": self._numeric(soil_info, ["p", "phosphorus", "phosphorus_mgkg", "phosphorus_mg_kg"], None),
                "k": self._numeric(soil_info, ["k", "potassium", "potassium_mgkg", "potassium_mg_kg"], None),
                "moisture_pct": self._numeric(soil_info, ["soil_moisture_pct", "moisture", "moisture_pct"], None),
                "temperature_c": self._numeric(soil_info, ["soil_temperature_c", "temperature_c"], None),
                "health_score": self._numeric(soil_info, ["soil_health_score", "health_score"], None),
                "texture": str(self._first_value(soil_info, ["soil_texture", "texture"], "") or ""),
                "sand_pct": self._numeric(soil_info, ["sand_pct"], None),
                "silt_pct": self._numeric(soil_info, ["silt_pct"], None),
                "clay_pct": self._numeric(soil_info, ["clay_pct"], None),
            },
            "water_availability": water_avail, "live_weather_applied": live_weather, "focus_crop": self.focus_crop, "focus_crop_assessment": focus_record, "primary_recommendations": ranked_recs[:top_n], "disqualified_crops": disqualified,
        }