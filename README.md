# 🍇 Apollo AgriVerse: AgriIntel Division (Phase 1 Grape Digital Twin)

>
## 👥 Meet the AgriIntel Team

This technical integration and engineering effort was conducted by:

* **Vijayalaxmi K. Sundalam** - Technical Integration
* **Nandini N. Naral** - Product, Data Quality & Mining
* **Sunaina S. Gaikwad** - ML Baseline & Model Evaluation
* **Dakshini A. Neel** - Data & ML-Model Frontend

**Supervisor:** Akash Shivdas Chatake  
**Organization:** Chatake Innoworks Pvt. Ltd.

---
*Built with ❤️ to engineer an intelligent agricultural ecosystem.*


**Engineering Principle:** *"Agriculture should not merely be monitored it should be understood, anticipated, and empowered through intelligence."*

Welcome to the **Apollo AgriVerse** project, developed under **Chatake Innoworks Pvt. Ltd.**. This repository contains the mid-term engineering state for the **AgriIntel Division**, focusing on an explainable crop and field-intelligence vertical slice for Grape Farming in India.

---

## 📖 Project Overview

Agricultural systems are inherently dynamic. Soil moisture changes, nutrient availability shifts, and environmental stress alters crop trajectories before conventional dashboards even report a problem. 

To solve this, Apollo AgriVerse acts as a true **Digital Twin**. Instead of just showing raw sensor values, the architecture represents the farm as an evolving state. The project is built around **One Reviewable Decision Loop**: agricultural evidence is collected, represented as a system state, interpreted through Machine Learning (ML), and translated into an explainable decision.

---

## ✨ Core Architecture & Features

Our platform operates on a structured, four-layer architecture:

### 1. 📊 Agricultural Evidence Layer
We integrate real and synthetic tabular datasets covering soil types, weather conditions, farm metadata, sensor streams, and interventions (like hydrogel and mulching). 

### 2. 🔄 Dynamic State Layer (The Digital Twin)
The twin provides explicit memory of the system's condition. It utilizes mathematical state models to track:
*   **Soil State:** Evolving moisture, thermal stress, and nutrient conditions.
*   **Crop Lifecycle (GDD):** Tracking biological progress using cumulative Growing Degree Days (GDD) rather than just calendar days.
*   **Interventions:** Simulating hydrogel capacity retention and mulch degradation over time.

### 3. 🧠 Predictive Intelligence Layer (ML)
Machine learning complements our explicit state models by handling complex, non-linear predictions[cite: 3]. 
*   **Grape Yield Prediction:** Uses Random Forest regression to forecast harvest outcomes based on agronomy data[cite: 3].
*   **Hydrogel & Telemetry Triggers:** Uses Gradient Boosting to predict hydrogel water storage capacity from digital-twin telemetry[cite: 3].

### 4. 💻 Decision Layer (Explainable Frontend)
A comprehensive 12-panel React/Streamlit dashboard prototype that binds to the backend API[cite: 3]. It translates complex state variables and ML predictions into reviewable, explainable recommendations for the farmer[cite: 3].

---
## 🚀 Getting Started

To test the backend state models and view the ML baseline:

1. **Clone the repository** to your local machine.
2. Initialize the Python virtual environment: `python -m venv venv` and activate it.
3. Install dependencies from the `05_Backend` directory using `pip install -r requirements.txt`.
4. Run the state simulation scripts or launch the FastAPI server via **Uvicorn**.
5. The SQLite database (`apollo_twin.db`) will track the simulated temporal state transitions[cite: 3].

---

## 🛠️ Technology Stack

* **Core Language:** Python[cite: 3]
* **Data Engineering:** Pandas, NumPy[cite: 3]
* **Machine Learning:** Scikit-Learn[cite: 3]
* **Backend API & Storage:** FastAPI, SQLite[cite: 3]
* **Version Control:** Git / GitHub[cite: 3]

---


## 📁 Project Folder Structure

Our workspace separates data pipelines, backend logic, ML artifacts, and UI to ensure system maintainability[cite: 3].

```text
Apollo_AgriVerse/
├── 01_Documentation/           # Technical reports, proposals, and API documentation[cite: 3]
├── 02_Datasets/                # Tabular soil, weather, crop, farm, and synthetic data[cite: 3]
│   ├── Interim/                
│   ├── KnowledgeBase/          # Cleaned relational rulebooks (Crop, Variety, Soil, Climate)
│   ├── Master/                 # ML-ready flattened datasets[cite: 3]
│   ├── Metadata/               
│   ├── Processed/              
│   ├── Raw/                    
│   └── Sample/                 
├── 03_Images/                  # Visual evidence, dashboard panels, and diagrams[cite: 3]
├── 04_Frontend/                # Dashboard interface prototypes[cite: 3]
├── 05_Backend/                 # FastAPI application, Twin State Service, ML Inference Service[cite: 3]
├── 06_ML/                      # Pickled models (e.g., Random Forest, Gradient Boosting)[cite: 3]
├── 07_Deployment/              
├── 08_Testing/                 
├── 09_Project_Management/      
├── 10_Presentations/           
├── 11_Team/                    # Team notes and workflow logs[cite: 3]
├── logs/                       
├── scripts/                    
├── temp/                       
├── validation_plots/           # ML metrics and evaluation graphs[cite: 3]
├── apollo_twin.db              # Lightweight SQLite state and history store[cite: 3]
├── .gitattributes              
├── .gitignore                  
├── LICENSE                     
└── README.md
