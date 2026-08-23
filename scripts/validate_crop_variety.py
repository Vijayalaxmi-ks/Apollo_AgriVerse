import pandas as pd

crop = pd.read_csv(r"D:\Apollo_AgriVerse\02_Datasets\KnowledgeBase\Cleaned\01_crop_database_cleaned.csv")
variety = pd.read_csv(r"D:\Apollo_AgriVerse\02_Datasets\KnowledgeBase\Cleaned\02_crop_variety_database_cleaned.csv")

# Only one crop is allowed: grape
EXPECTED_CROP_ID = "crop_grape"

# Check Crop CSV
grape_rows = crop[
    (crop["crop_id"] == EXPECTED_CROP_ID) &
    (crop["crop_name"].str.lower() == "grape")
]

if len(grape_rows) == 1:
    print("✅ Crop database: GRAPE is correct")
else:
    print("❌ Crop database should contain exactly one GRAPE record")

# Check Variety CSV
invalid = variety[
    variety["crop_id"] != EXPECTED_CROP_ID
]

if invalid.empty:
    print("✅ Crop ↔ Crop Variety: MATCHED")
    print(f"✅ {len(variety)} varieties belong to grape")
else:
    print("❌ Some varieties have an incorrect crop_id:")
    print(invalid[["variety_id", "variety_name", "crop_id"]])

print("\nDONE")