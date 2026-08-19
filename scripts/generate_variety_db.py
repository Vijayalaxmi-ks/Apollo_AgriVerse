import pandas as pd

# ============================================================
# INPUT / OUTPUT FILE
# ============================================================

INPUT_FILE = r"D:\Apollo_AgriVerse\02_Datasets\KnowledgeBase\02_crop_variety_database.csv"
OUTPUT_FILE = r"D:\Apollo_AgriVerse\02_Datasets\KnowledgeBase\02_crop_variety_database.csv"


# ============================================================
# ONLY THESE 5 GRAPE VARIETIES ARE ALLOWED
# ============================================================

allowed_varieties = [
    "Thompson Seedless",
    "Tas-A-Ganesh",
    "Sharad Seedless",
    "Manjari Naveen",
    "Manjari Shyama"
]


# ============================================================
# LOAD DATASET
# ============================================================

df = pd.read_csv(INPUT_FILE)

print("Original dataset shape:", df.shape)


# ============================================================
# KEEP ONLY THE 5 REQUIRED VARIETIES
# ============================================================

df = df[
    df["variety_name"].astype(str).str.strip().isin(allowed_varieties)
].copy()


# ============================================================
# SAVE FILTERED DATASET
# ============================================================

df.to_csv(OUTPUT_FILE, index=False)


# ============================================================
# VERIFICATION
# ============================================================

print("\nFiltered dataset shape:", df.shape)

print("\nVarieties present in dataset:")
print(df["variety_name"].value_counts())

print("\nUnique varieties:")
for variety in df["variety_name"].unique():
    print("-", variety)

print(f"\nSaved successfully as: {OUTPUT_FILE}")