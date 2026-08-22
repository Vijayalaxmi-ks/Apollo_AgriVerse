import pandas as pd

CROP_FILE = r"D:\Apollo_AgriVerse\02_Datasets\KnowledgeBase\Cleaned\01_crop_database_cleaned.csv"
VARIETY_FILE = r"D:\Apollo_AgriVerse\02_Datasets\KnowledgeBase\Cleaned\02_crop_variety_database_cleaned.csv"

crop = pd.read_csv(CROP_FILE)
variety = pd.read_csv(VARIETY_FILE)

# -----------------------------------------
# 1. Check GRAPE exists in Crop database
# -----------------------------------------

grape = crop[
    crop["crop_id"].astype(str).str.strip().eq("crop_grape")
]

if not grape.empty:
    print("✅ GRAPE exists in CSV-01")
else:
    print("❌ GRAPE not found in CSV-01")


# -----------------------------------------
# 2. Check Crop -> Variety connection
# -----------------------------------------

grape_varieties = variety[
    variety["crop_id"].astype(str).str.strip().eq("crop_grape")
]

wrong_crop = variety[
    variety["crop_id"].astype(str).str.strip().ne("crop_grape")
]

if wrong_crop.empty:
    print("✅ ALL varieties belong to GRAPE")
else:
    print("⚠️ Some varieties have another crop_id:")
    print(wrong_crop[["variety_id", "variety_name", "crop_id"]])


# -----------------------------------------
# 3. Final result
# -----------------------------------------

print("\n========== RESULT ==========")

print("Crop:", "GRAPE")
print("Connected varieties:", len(grape_varieties))

if not grape.empty and wrong_crop.empty:
    print("✅ CROP ↔ CROP VARIETY CONNECTION COMPLETE")
else:
    print("❌ CONNECTION NEEDS CORRECTION")