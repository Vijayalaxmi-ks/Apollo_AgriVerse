import logging
from pathlib import Path
import pandas as pd

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("KnowledgeLoader")


class KnowledgeBaseLoader:

  def __init__(self, datasets_dir: str = None):
    project_root = Path(__file__).resolve().parent.parent.parent

    if datasets_dir is None:
      possible_paths = [
          project_root
          / "02_Datasets"
          / "KnowledgeBase"
          / "Suitability engine csvs",
          project_root / "02_Datasets",
      ]
      for p in possible_paths:
        if p.exists():
          self.data_dir = p
          break
    else:
      self.data_dir = project_root / datasets_dir

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
    self._validate_keys()
    logger.info("✅ Maharashtra Knowledge Base tables successfully loaded.")
    return self

  def _normalize_data(self):
    for df_name in ["crops_df", "varieties_df", "soils_df", "requirements_df", "regions_df"]:
      df = getattr(self, df_name)
      if df is not None and not df.empty:
        str_cols = df.select_dtypes(include=["object", "string"]).columns
        df[str_cols] = df[str_cols].apply(lambda x: x.astype(str).str.strip())

    if self.requirements_df is not None and "crop_id" in self.requirements_df.columns:
      self.requirements_df["crop_id"] = self.requirements_df["crop_id"].replace({"grape": "crop_grape"})

    if self.requirements_df is not None and "soil_type" in self.requirements_df.columns:
      self.requirements_df["soil_type"] = self.requirements_df["soil_type"].str.replace("Cotton ", "", regex=False)

  def _validate_keys(self):
    if self.soils_df is not None and "soil_id" in self.soils_df.columns and not self.soils_df["soil_id"].is_unique:
      logger.warning("Duplicate soil_ids detected in soil database.")
    if self.regions_df is not None and "region_id" in self.regions_df.columns and not self.regions_df["region_id"].is_unique:
      logger.warning("Duplicate region_ids detected in region climate database.")