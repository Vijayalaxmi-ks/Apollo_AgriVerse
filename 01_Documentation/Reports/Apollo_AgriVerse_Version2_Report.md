# Apollo AgriVerse — Version 2 Report

## 1. Executive Summary

This document captures the current Apollo AgriVerse project state, the data and model workflows, the digital twin behavior, and a version-two plan that preserves the current project without disturbing it.

The existing project contains:
- Tabular datasets for grapes, soil, hydrogel, and weather.
- Image datasets for crop stages, hydrogel states, soil states, and related categories.
- ML notebooks for:
  - grape yield prediction
  - telemetry-driven hydrogel trigger prediction
  - image-based hydrogel/soil/crop classification models
- A digital twin simulation engine in `06_ML/simulation/`.
- A placeholder backend folder structure in `05_Backend/` and frontend scaffolding in `04_Frontend/`.

This report is saved in `01_Documentation/Reports/Apollo_AgriVerse_Version2_Report.md`.

---

## 2. Current Project Status

### 2.1 Repository Structure

Key areas:
- `02_Datasets/Processed/` — Processed dataset artifacts, including grape agronomy, hydrogel images, soil data, and weather.
- `06_ML/` — Model training notebooks, inference scripts, and simulation engines.
- `06_ML/models/` — Saved model artifacts such as `grape_yield_model.pkl`, `grape_telemetry_trigger_model.pkl`, and Keras image models in `Image_dataset_models/`.
- `01_Documentation/Reports/` — Report files and abstracts.
- `05_Backend/` — Backend directory currently contains placeholder `.gitkeep` files, no active API server implementation.
- `04_Frontend/` — Frontend folder with HTML prototypes (`digital_twin_raw.html`, `digital_twin_raw_1_version.html`) and placeholder structure.

### 2.2 Active ML Workflows

#### Yield and Telemetry Models
- `06_ML/notebooks/01_grape_yield_prediction.ipynb`
  - Uses tabular feature engineering on `02_Datasets/Processed/Grapes/Master_Grapes_Agronomy_Reference.csv`.
  - Trains and compares ensemble regressors such as `RandomForestRegressor` and `GradientBoostingRegressor`.
  - Saves best model and scaler to `06_ML/models/grape_yield_model.pkl` and `06_ML/models/grape_yield_scaler.pkl`.

- `06_ML/notebooks/02_grape_telemetry_trigger_model.ipynb`
  - Uses telemetry and digital twin state variables from `02_Datasets/Processed/Grapes/Master_Grapes_Digital_Twin_Telemetry.csv`.
  - Trains a `GradientBoostingRegressor` to predict hydrogel storage requirements.
  - Saves model and scaler to `06_ML/models/grape_telemetry_trigger_model.pkl` and `06_ML/models/grape_telemetry_scaler.pkl`.

#### Image Models
- `06_ML/notebooks/Image_dataset_notebooks/train_hydrogel_model.ipynb`
- `06_ML/notebooks/Image_dataset_notebooks/train_soil_model.ipynb`
- `06_ML/notebooks/Image_dataset_notebooks/train_crop_model.ipynb`
  - Use `tensorflow.keras.preprocessing.image_dataset_from_directory`.
  - Use transfer learning with `MobileNetV2(input_shape=(224, 224, 3))`.
  - Build a final `Sequential` model with dense classification layers.
  - Save Keras models in `06_ML/models/Image_dataset_models/`.

### 2.3 Digital Twin and Simulation

The digital twin engine is implemented in `06_ML/simulation/`:
- `twin_state_synchronizer.py` — central orchestrator.
- `soil_state_model.py` — tracks soil moisture, NPK levels, pH, temperature, and stress.
- `hydrogel_state_model.py` — tracks hydrogel storage, release rate, and polymer degradation.
- `mulch_state_model.py` — tracks mulch degradation and cooling effect.
- `crop_lifecycle_engine.py` — tracks grape crop growth stage using cumulative GDD.
- `test_simulation_sync.py` — test harness meant to run the integrated digital twin.

### 2.4 Backend / Frontend Readiness

- `05_Backend/` currently contains folders with `.gitkeep` files, meaning the backend stub exists but no actual service code is committed here.
- `04_Frontend/` contains HTML views under `src/`, but no application framework or build config is present.
- `requirements.txt` includes FastAPI and Uvicorn, indicating a plan for a REST API backend.

Currently, the working project is not fully deployed as a localhost web application because no active backend entrypoint or frontend build configuration exists in the repo.

---

## 3. Digital Twin Behavior and Study

### 3.1 Digital Twin Sync Flow

The digital twin engine performs the following sequence for each telemetry update:
1. Update mulch state using UV index, max temperature, and wind speed.
2. Update hydrogel state using soil moisture, air temperature, irrigation, and rainfall.
3. Update grape phenology using growing degree days (GDD).
4. Update soil state using the latest physical conditions, hydrogel release, mulch cooling, and crop stage.
5. Build an input feature vector for the telemetry model.
6. Predict required hydrogel storage percentage with the telemetry ML model.
7. Build an input vector for the yield model.
8. Predict grape yield in tons/ha.

### 3.2 What the Twin Produces

The synchronizer returns:
- `digital_twin_state`
  - `mulch`: degradation and cooling effect.
  - `hydrogel`: storage percentage, release rate, effective capacity, polymer status.
  - `soil`: moisture, temperature, NPK levels, pH, and stress index.
  - `crop_phenology`: daily and cumulative GDD, growth stage, canopy cover.
- `ml_predictions`
  - `predicted_required_hydrogel_storage_pct`
  - `predicted_grape_yield_tons_ha`

### 3.3 Behavior Observations

This hybrid system is not purely data-driven:
- The physical state models provide continuous physics-based values.
- The ML models add predictive intelligence for yield and hydrogel requirements.
- The digital twin can therefore support both state monitoring and decision support.

### 3.4 Autonomous Operation

The current implementation is semi-autonomous:
- It can compute the next state given telemetry inputs.
- It does not yet include closed-loop actuation (irrigation control, hydrogel deployment automation) in the committed code.
- Full autonomy would require live sensor feeds, an API, and actuator integration.

---

## 4. Data and Model Details

### 4.1 Datasets

Key dataset storage conventions:
- Processed tabular datasets are stored under `02_Datasets/Processed/`.
- Grapes dataset: `02_Datasets/Processed/Grapes/Master_Grapes_Agronomy_Reference.csv`.
- Digital twin telemetry dataset: `02_Datasets/Processed/Grapes/Master_Grapes_Digital_Twin_Telemetry.csv`.
- Hydrogel images: `02_Datasets/Processed/Hydrogel/Image_Dataset/{train,val,test}/{dry_state,swollen_state}`.
- Crop and soil image datasets are stored under similar processed directories.

### 4.2 Data Storage Strategy

Recommended storage organization:
- Raw data: `02_Datasets/Raw/`.
- Cleaned data: `02_Datasets/Processed/`.
- Metadata: `02_Datasets/Metadata/`.
- Models and scalers: `06_ML/models/`.
- Reports and documentation: `01_Documentation/Reports/`.

This separation supports auditability and reproducibility.

### 4.3 Model Types

The current project uses:
- Regression models for yield and telemetry prediction:
  - `RandomForestRegressor`
  - `GradientBoostingRegressor`
- Transfer learning image classifiers using TensorFlow/Keras MobileNetV2.

### 4.4 Model Storage

Model artifacts are stored as:
- `*.pkl` for scikit-learn regressors and scalers.
- `*.keras` for Keras image classification models.

This is already consistent with a versioned artifact workflow. A Version 2 improvement would add model metadata and version tags.

---

## 5. Potential Advancement — Version 2

### 5.1 Version 2 Goals

Version 2 should deliver:
- A working backend API on localhost.
- A frontend dashboard for digital twin state and grape predictions.
- A distinct versioned branch or design folder that preserves the current repo.
- A more complete “plant-level and field-level digital twin” experience.
- Better data governance, model versioning, and loss prevention.

### 5.2 Recommended Architecture

#### Backend
- Implement a FastAPI service in `05_Backend/app/`.
- Use `POST /api/v1/twin/sync` to accept telemetry and return twin state.
- Use `GET /api/v1/twin/status` as a health endpoint.
- Load models from `06_ML/models/` and expose inference through the API.

#### Frontend
- Create a lightweight dashboard in `04_Frontend/src/`.
- Use either React/Vite or static HTML to show:
  - current grape plant twin status
  - soil/hydrogel/mulch state
  - yield prediction and hydrogel recommendation.

#### Simulation and Study
- Use `06_ML/simulation/test_simulation_sync.py` as the baseline engine.
- Add a `Version2` notebook or script that runs multiple simulated plants in parallel, comparing individual grape plants and a whole field.

### 5.3 Individual Plant vs Flock-Level Twin

Recommended digital twin design:
- Individual grape plant twin:
  - one state vector for soil, hydrogel, mulch, and phenology.
  - useful for high-resolution decisions on individual vine rows.
- Whole-field twin:
  - aggregated state across multiple plants or plots.
  - useful for irrigation planning, yield forecasts, and resource management.
- A Version 2 implementation can model both layers and compare them in dashboards.

### 5.4 Potential Advancements

1. **Live telemetry ingestion**
   - sensor stream or simulated API feed.
2. **Model versioning and model registry**
   - store `model_name`, `version`, `train_date`, `metric_summary`.
3. **Data lineage and backup**
   - save raw telemetry before processing.
   - archive processed feature datasets.
4. **Enhanced generalization**
   - use transfer learning for cross-plant applicability.
   - add plant-specific calibration parameters.
5. **Loss avoidance**
   - keep raw and processed datasets separately.
   - store model artifacts in a versioned folder.
   - keep regular Git commits, backups, and code documentation.
6. **Autonomous decision support**
   - add an actuator layer to the backend.
   - support irrigation/hydrogel trigger commands.

---

## 6. Cross-Plant Data Reuse

### Is data from one plant usable for another?

- Yes, but with caveats.
- If the other plant is the same crop type (e.g. grapes), the dataset can support transfer learning and domain adaptation.
- For different plants, the same physical principles may apply, but model performance will generally require re-training or fine-tuning.
- The current system is best suited for grape-focused viticulture; generalization to other crops requires new crop-specific datasets.

### How to make it more transferable

- Add metadata for farm location, soil type, and crop variety.
- Use a feature normalization strategy that removes unit-specific bias.
- Fine-tune the model on a small sample of the new plant’s data.
- Maintain a shared baseline dataset plus crop-specific adapters.

---

## 7. Implementation Notes and Limitations

### 7.1 Current Limitations

- The `05_Backend/` folder is a placeholder; no active FastAPI app is committed.
- The frontend is only static HTML prototypes, not a completed dashboard app.
- Local simulation tests require Python packages to be installed in the active environment.
- The repository currently does not include a running `localhost` launch script.

### 7.2 Dependency Status

The committed `requirements.txt` already includes the API and ML dependencies, but the current workspace needs them installed in the active interpreter to execute the twin and inference scripts.

### 7.3 Behavior Study

The digital twin engine is a hybrid physics-plus-ML system. It uses physics-based state models for soil, mulch, hydrogel, and crop growth, then applies ML to compute:
- predicted hydrogel requirements
- predicted grape yield

This design is strong because it keeps physical meaning while adding predictive intelligence.

---

## 8. Recommended Next Steps for Version 2

1. Create a new branch or version folder named `version-2`.
2. Implement `05_Backend/app/main.py` with FastAPI routes for digital twin sync.
3. Create a frontend dashboard in `04_Frontend/src/` that fetches from `/api/v1/twin/sync`.
4. Add a script or notebook for multi-plant simulation and field-level aggregation.
5. Add model metadata and save a `models/metadata.json` file.
6. Add a `Version 2` summary notebook or report that logs behavior, outputs, and analysis.
7. Keep the current project unchanged while building the version-2 branch.

---

## 9. Practical Use Cases

### What this system can do
- Predict grape yield before harvest.
- Estimate hydrogel water storage needs.
- Monitor soil health and mulch effectiveness.
- Support decision-making for irrigation and substrate deployment.

### What it is not yet
- A fully autonomous control system that drives actuators.
- A deployed localhost web application.
- A complete cross-crop model registry.

---

## 10. Report Location

This report has been saved to:
- `01_Documentation/Reports/Apollo_AgriVerse_Version2_Report.md`

Use this file as the authoritative project version-two report and build plan.
