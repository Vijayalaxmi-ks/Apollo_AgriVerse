import os
import shutil

# 1. Define the base paths based on your screenshot
BASE_DIR = r"D:\Apollo_AgriVerse\02_Datasets\KnowledgeBase"
CLEANED_DIR = os.path.join(BASE_DIR, "Cleaned")
SUITABILITY_DIR = os.path.join(BASE_DIR, "Suitability engine csvs")

# Define the connection folders
CONN_1_DIR = os.path.join(SUITABILITY_DIR, "Connection_1")
CONN_2_DIR = os.path.join(SUITABILITY_DIR, "Connection_2")

# 2. Create the directories if they don't exist
os.makedirs(CONN_1_DIR, exist_ok=True)
os.makedirs(CONN_2_DIR, exist_ok=True)

# 3. Define the source files
crop_src = os.path.join(CLEANED_DIR, "01_crop_database_cleaned.csv")
variety_src = os.path.join(CLEANED_DIR, "02_crop_variety_database_cleaned.csv")
req_src = os.path.join(BASE_DIR, "04_crop_soil_requirements_final.csv")

try:
    # --- CONNECTION 1 ---
    # Crop Database -> Crop Variety Database
    shutil.copy2(crop_src, os.path.join(CONN_1_DIR, "01_crop_database_cleaned.csv"))
    shutil.copy2(variety_src, os.path.join(CONN_1_DIR, "02_crop_variety_database_cleaned.csv"))
    print("✅ Connection 1 files successfully copied to Connection_1 folder!")

    # --- CONNECTION 2 ---
    # Crop Variety Database -> Crop Soil Requirements
    shutil.copy2(variety_src, os.path.join(CONN_2_DIR, "02_crop_variety_database_cleaned.csv"))
    shutil.copy2(req_src, os.path.join(CONN_2_DIR, "04_crop_soil_requirements_final.csv"))
    print("✅ Connection 2 files successfully copied to Connection_2 folder!")

except Exception as e:
    print(f"❌ Error organizing files: {e}")