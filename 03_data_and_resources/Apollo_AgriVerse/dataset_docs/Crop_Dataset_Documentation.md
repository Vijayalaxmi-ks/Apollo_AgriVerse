# 🌱 Apollo AgriVerse
# Crop Dataset Documentation

**Dataset Name:** Crop Recommendation Dataset

**Version:** 1.0

**Author:** Apollo AgriVerse Team

**Last Updated:** August 2026

---

# Overview

The Crop Recommendation Dataset contains soil nutrient values and environmental conditions used for crop recommendation. This documentation covers the preprocessing performed on the crop dataset.

---

# Dataset Pipeline

```text
Raw Dataset
      │
      ▼
Data Cleaning
      │
      ▼
Feature Engineering
      │
      ▼
Train-Test Split
      │
      ▼
Feature Scaling
      │
      ▼
Processed Dataset
```

---

# Dataset Location

```text
02_Datasets/
│
├── Raw/
│   └── Crop/
│       └── Crop_recommendation.csv
│
├── Interim/
│   └── Crop/
│       └── crop_clean.csv
│
└── Processed/
    └── Crop/
        ├── X_train_processed.csv
        ├── X_test_processed.csv
        ├── y_train.csv
        └── y_test.csv
```

---

# Dataset Features

| Column | Type | Description |
|---------|------|-------------|
| N | Integer | Nitrogen content |
| P | Integer | Phosphorus content |
| K | Integer | Potassium content |
| temperature | Float | Air temperature (°C) |
| humidity | Float | Relative humidity (%) |
| ph | Float | Soil pH |
| rainfall | Float | Rainfall (mm) |
| label | Category | Crop label |

---

# Feature Categories

## Soil Features

- Nitrogen
- Phosphorus
- Potassium
- pH

## Weather Features

- Temperature
- Humidity
- Rainfall

## Target Feature

- Crop Label

---

# Data Cleaning

The following preprocessing steps were performed:

- Removed duplicate records
- Checked missing values
- Verified data types
- Removed invalid values
- Standardized column names

**Output File**

```text
crop_clean.csv
```

---

# Feature Engineering

The following operations were performed:

- Input and Output Separation
- Train-Test Split
- Feature Scaling

**Generated Files**

```text
X_train_processed.csv
X_test_processed.csv
y_train.csv
y_test.csv
```

---

# Related Notebooks

```text
06_ML/notebooks/

crop_data_cleaning.ipynb
crop_preprocessing.ipynb
```

---

# Output Files

The processed dataset files are stored in:

```text
02_Datasets/Processed/Crop/
```

---

# Future Work

- Train machine learning models
- Evaluate model performance
- Deploy the crop recommendation model

---

# Notes

- The raw dataset is never modified.
- All preprocessing is performed on copies of the raw dataset.
- The processed dataset is ready for machine learning.
- Model training has not been performed yet.