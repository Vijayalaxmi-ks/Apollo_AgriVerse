import pandas as pd
import numpy as np

# 1. Load using the absolute path
df = pd.read_csv('D:/MindforgeAI Internship 2026 - 2026IT002- Sunaina Gaikwad/Apollo_AgriVerse/02_Datasets/Raw/Soil/Soil Nutrients.csv')

print("Original dataset shape (Rows, Columns):", df.shape)

# 2. Drop any duplicate rows
df = df.drop_duplicates()

# 3. Handle Missing Values
numerical_cols = df.select_dtypes(include=[np.number]).columns
for col in numerical_cols:
    df[col] = df[col].fillna(df[col].median())

# 4. Clean Unrealistic Outliers (e.g., pH must strictly be between 0 and 14)
if 'ph' in df.columns:
    df = df[(df['ph'] >= 0) & (df['ph'] <= 14)]

# 5. Save using the absolute path to your target folder
df.to_csv('D:/MindforgeAI Internship 2026 - 2026IT002- Sunaina Gaikwad/Apollo_AgriVerse/02_Datasets/cleaned_soil_nutrients.csv', index=False)

print("Preprocessing complete!")
print("Cleaned dataset shape:", df.shape)
print("Saved successfully!")