# 🍇 Apollo AgriVerse: Phase 1 (Digital Twin)

Welcome to the **Apollo AgriVerse** project! Developed by our dedicated team. This repository represents Phase 1 of our intelligent agricultural digital twin platform.

---

## 📖 Project Overview

Apollo AgriVerse simulates real-world agricultural conditions by combining foundational crop data with live weather tracking. Initially focusing on grape farming (including high-value varieties like *Thompson Seedless* and *Manjari Naveen*), our system analyzes soil parameters, critical moisture levels, and climatic data to predict crop yields and provide smart agronomic triggers.

---

## ✨ Core Features & How It Works

*   **🌱 Crop & Soil Datasets:** We engineered comprehensive tabular datasets for Indian soil types and crop varieties, storing critical parameters like temperature requirements and hydrogel dosages.
*   **🌤️ NASA Weather API:** The backend integrates a live weather API from NASA to fetch crucial environmental data, seamlessly merging it with our crop requirements for real-time monitoring.
*   **🧠 Machine Learning Models:** Using pre-trained models (e.g., `grape_yield_model.pkl`), the system processes telemetry and weather data to output accurate yield predictions.
*   **📸 Crop Imagery:** We maintain a dedicated repository of crop images to visually support the digital twin interface and enhance data presentation.

---

## 🚀 Getting Started

To run this project locally, clone the repository and configure your environment:

1. **Clone the repository** to your local machine.
2. Ensure you have your **NASA Weather API key** configured in the `05_Backend/` environment variables.
3. Execute the Python setup files in the `scripts/` directory to initialize the local databases.
4. Start the backend server via **Uvicorn** and launch the frontend interface.

---

## 🛠️ Technology Stack

* **Backend API:** Python, FastAPI, Uvicorn
* **Data Processing:** Pandas, NumPy
* **Machine Learning:** Scikit-Learn
* **Frontend:** HTML5, CSS3, JavaScript

---

## 👥 Meet the Team

This project was built collaboratively by our core development team:

* **Vijayalaxmi** - Frontend Dashboard, User Interface, and Integration
* **Dakshini** - System Testing,ML Model Frontend, Quality Assurance, and Project Integration
* **Nandini** - Backend Architecture, API Development, and Logic Engines (Suitability & Monitoring)
* **Sunaina** - Data Engineering, Data Cleaning, Master Datasets, and Machine Learning Models

---
*Built with ❤️ to empower farmers with smart technology. 🍇*


## 📁 Project Folder Structure

Our workspace is highly modular to ensure clean separation between backend logic, frontend interfaces, data pipelines, and machine learning models.

```text
Apollo_AgriVerse/
├── 01_Documentation/           # Project proposals, reports, and API documentation
├── 02_Datasets/                # All data files and databases
│   ├── Interim/                # Temporary data states
│   ├── KnowledgeBase/          # The core rules for our backend engines
│   │   ├── Cleaned/
│   │   │   ├── 01_crop_database_cleaned.csv
│   │   │   └── 02_crop_variety_database_cleaned.csv
│   │   ├── 03_soil_database_final.csv
│   │   ├── 04_crop_soil_requirements_final.csv
│   │   └── 05_region_climate_processed.csv
│   ├── Master/                 # Flat datasets used to train the ML models
│   ├── Metadata/               # Descriptions of what each column means
│   ├── Processed/              # Finalized data
│   ├── Raw/                    # Original, untouched source data
│   └── Sample/                 # Small datasets for quick testing
├── 03_Images/                  # UI assets, logos, and architecture diagrams
├── 04_Frontend/                # Website files (HTML, CSS, JavaScript Dashboard)
├── 05_Backend/                 # Our FastAPI application and Python logic engines
├── 06_ML/                      # Pickled ML models (e.g., grape_yield_model.pkl)
├── 07_Deployment/              # Files for hosting the website online
├── 08_Testing/                 # Code to test if our API is working correctly
├── 09_Project_Management/      # Roadmaps and task trackers
├── 10_Presentations/           # Slides and presentation materials
├── 11_Team/                    # Team notes and work logs
├── logs/                       # Server error logs
├── scripts/                    # Extra Python scripts for cleaning data
├── temp/                       # Temporary cache files
├── validation_plots/           # Graphs showing how accurate our ML models are
├── apollo_twin.db              # Local SQLite database for the backend
├── .gitattributes              
├── .gitignore                  
├── LICENSE                     
└── README.md

