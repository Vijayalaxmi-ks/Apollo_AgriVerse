import pandas as pd
import os

# 1. Define the base path 
BASE_DIR = r"D:\Apollo_AgriVerse\02_Datasets\KnowledgeBase"

# 2. File paths
VARIETY_FILE = os.path.join(BASE_DIR, "Cleaned", "02_crop_variety_database_cleaned.csv")
REQUIREMENTS_FILE = os.path.join(BASE_DIR, "04_crop_soil_requirements_final.csv")

try:
    # 3. Load the data
    df_var = pd.read_csv(VARIETY_FILE)
    df_req = pd.read_csv(REQUIREMENTS_FILE)
    
    # 4. Extract unique variety IDs
    unique_vars_in_db = set(df_var['variety_id'].dropna().unique())
    unique_vars_in_req = set(df_req['variety_id'].dropna().unique())
    
    # 5. Check the connection overlaps
    matched_ids = unique_vars_in_req.intersection(unique_vars_in_db)
    missing_in_db = unique_vars_in_req - unique_vars_in_db
    
    print("\n--- Connection 2 Validation ---")
    print(f"Total unique varieties in Requirements: {len(unique_vars_in_req)}")
    print(f"Total unique varieties in Variety DB: {len(unique_vars_in_db)}")
    print(f"✅ Successfully matched IDs: {len(matched_ids)}")
    
    if missing_in_db:
        print(f"\n❌ Warning: {len(missing_in_db)} IDs in Requirements are NOT matching the Variety DB exactly.")
        print("Example mismatches:", list(missing_in_db)[:3])
    else:
        print("\n🎉 PERFECT MATCH! All requirements point to valid varieties.")
        
except Exception as e:
    print(f"Error: {e}")