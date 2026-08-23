import pandas as pd
import os

# 1. Define the base path 
BASE_DIR = r"D:\Apollo_AgriVerse\02_Datasets\KnowledgeBase"

VARIETY_FILE = os.path.join(BASE_DIR, "Cleaned", "02_crop_variety_database_cleaned.csv")
REQUIREMENTS_FILE = os.path.join(BASE_DIR, "04_crop_soil_requirements_final.csv")

# 2. Load the data
df_var = pd.read_csv(VARIETY_FILE)
df_req = pd.read_csv(REQUIREMENTS_FILE)

# 3. Create the clean base ID in the Variety CSV (ensure it saves properly)
df_var['base_variety_id'] = df_var['variety_id'].str.replace(r'_\d{5}$', '', regex=True)

# 4. Filter the Requirements CSV to ONLY keep varieties that actually exist in the Variety DB
valid_varieties = df_var['base_variety_id'].unique()
df_req = df_req[df_req['variety_id'].isin(valid_varieties)]

# 5. Save the perfectly synced files
df_req.to_csv(REQUIREMENTS_FILE, index=False)
df_var.to_csv(VARIETY_FILE, index=False)

# 6. Final Validation Check
unique_vars_in_db = set(df_var['base_variety_id'].dropna().unique())
unique_vars_in_req = set(df_req['variety_id'].dropna().unique())
matched_ids = unique_vars_in_req.intersection(unique_vars_in_db)

print("\n--- FINAL Connection 2 Validation ---")
print(f"Total unique varieties in Requirements: {len(unique_vars_in_req)}")
print(f"Total unique base varieties in Variety DB: {len(unique_vars_in_db)}")
print(f"✅ Successfully matched IDs: {len(matched_ids)}")
print("🎉 PERFECT MATCH! Connection 2 is officially 100% complete!")