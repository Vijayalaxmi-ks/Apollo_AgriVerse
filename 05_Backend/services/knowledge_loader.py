import logging
from pathlib import Path
import pandas as pd

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("KnowledgeLoader")


class KnowledgeBaseLoader:

  def __init__(self, datasets_dir: str = None):
    project_root = Path(__file__).resolve().parent.parent.parent

    self.data_dir = None
    if datasets_dir is None:
      possible_paths = [
          project_root
          / "02_Datasets"
          / "KnowledgeBase"
          / "Suitability engine csvs",
          project_root / "02_Datasets",
          Path(__file__).resolve().parent.parent / "02_Datasets",
      ]
      for p in possible_paths:
        if p.exists():
          self.data_dir = p
          break
    else:
      candidate = Path(datasets_dir)
      self.data_dir = candidate if candidate.is_absolute() else (project_root / datasets_dir)
    if self.data_dir is None or not Path(self.data_dir).exists():
      # Leave unset; load_and_validate will raise a clear error
      self.data_dir = Path(datasets_dir) if datasets_dir else (project_root / "02_Datasets")

    self.crops_df = None
    self.varieties_df = None
    self.soils_df = None
    self.requirements_df = None
    self.regions_df = None

  def _find_file(self, candidates):
    for filename in candidates:
      file_path = self.data_dir / filename
      if file_path.exists():
        return file_path

    for subpath in self.data_dir.rglob("*.csv"):
      if subpath.name in candidates:
        return subpath

    raise FileNotFoundError(
        f"None of {candidates} found inside '{self.data_dir}' or its subdirectories."
    )

  def load_and_validate(self):
    try:
      self.crops_df = pd.read_csv(self._find_file(["01_crop_database.csv", "01_crop_database_cleaned.csv"]))
      self.varieties_df = pd.read_csv(self._find_file(["02_crop_variety_database_linked.csv", "02_crop_variety_database.csv"]))
      self.soils_df = pd.read_csv(self._find_file(["03_soil_database_final.csv", "03_soil_database.csv"]))
      self.requirements_df = pd.read_csv(self._find_file(["04_crop_soil_requirements_standardized.csv", "04_crop_soil_requirements.csv"]))
      self.regions_df = pd.read_csv(self._find_file(["05_region_climate_processed.csv", "05_region_climate_db.csv"]))
    except FileNotFoundError as e:
      logger.error(f"Dataset missing: {e}")
      raise
    except Exception as e:
      logger.error(f"Error loading CSV datasets: {e}")
      raise

    self._normalize_data()
    self._alias_columns()
    self._validate_keys()
    logger.info("✅ Maharashtra Knowledge Base tables successfully loaded.")
    return self

  def _alias_columns(self):
    """Map KnowledgeBase column names to names the suitability engine expects."""
    if self.crops_df is not None and not self.crops_df.empty:
      ren = {}
      cols = {c.lower(): c for c in self.crops_df.columns}
      def pick(*names, dest):
        for n in names:
          if n.lower() in cols and dest not in self.crops_df.columns:
            ren[cols[n.lower()]] = dest
            return
      pick("opt_temp_min", "ideal_temp_min", "temperature_min_c", "min_temp_c", dest="ideal_temp_min")
      pick("opt_temp_max", "ideal_temp_max", "temperature_max_c", "max_temp_c", dest="ideal_temp_max")
      pick("ph_min", "min_ph", dest="min_ph")
      pick("ph_max", "max_ph", dest="max_ph")
      pick("water_requirement_l_day", "water_requirement", dest="water_requirement")
      pick("preferred_soil_type", "soil_type", dest="preferred_soil_type")
      if ren:
        self.crops_df = self.crops_df.rename(columns=ren)

    if self.soils_df is not None and not self.soils_df.empty:
      ren = {}
      cols = {c.lower(): c for c in self.soils_df.columns}
      mapping = {
        "organic_carbon_pct": "organic_carbon",
        "organic_carbon": "organic_carbon",
        "electrical_conductivity_ds_m": "electrical_conductivity",
        "nitrogen_mg_kg": "n",
        "phosphorus_mg_kg": "p",
        "potassium_mg_kg": "k",
      }
      for src, dest in mapping.items():
        if src in cols and dest not in self.soils_df.columns:
          ren[cols[src]] = dest
      if ren:
        self.soils_df = self.soils_df.rename(columns=ren)

    if self.regions_df is not None and not self.regions_df.empty:
      ren = {}
      cols = {c.lower(): c for c in self.regions_df.columns}
      mapping = {
        "minimum_temperature_c": "avg_temp_min",
        "maximum_temperature_c": "avg_temp_max",
        "average_temperature_c": "avg_temp",
      }
      for src, dest in mapping.items():
        if src in cols and dest not in self.regions_df.columns:
          ren[cols[src]] = dest
      if ren:
        self.regions_df = self.regions_df.rename(columns=ren)

  def _normalize_data(self):
    for df_name in ["crops_df", "varieties_df", "soils_df", "requirements_df", "regions_df"]:
      df = getattr(self, df_name)
      if df is not None and not df.empty:
        str_cols = df.select_dtypes(include=["object", "string"]).columns
        df[str_cols] = df[str_cols].apply(lambda x: x.astype(str).str.strip())

    # Strictly scope the region climate database to Maharashtra
    if self.regions_df is not None and not self.regions_df.empty:
      if "state" in self.regions_df.columns:
        self.regions_df = self.regions_df[
            self.regions_df["state"].astype(str).str.strip().str.lower() == "maharashtra"
        ].copy()

    if self.requirements_df is not None and "crop_id" in self.requirements_df.columns:
      self.requirements_df["crop_id"] = self.requirements_df["crop_id"].replace({"grape": "crop_grape"})

    if self.requirements_df is not None and "soil_type" in self.requirements_df.columns:
      self.requirements_df["soil_type"] = self.requirements_df["soil_type"].str.replace("Cotton ", "", regex=False)

  def _validate_keys(self):
    if self.soils_df is not None and "soil_id" in self.soils_df.columns and not self.soils_df["soil_id"].is_unique:
      logger.warning("Duplicate soil_ids detected in soil database.")
    if self.regions_df is not None and "region_id" in self.regions_df.columns and not self.regions_df["region_id"].is_unique:
      logger.warning("Duplicate region_ids detected in region climate database.")