# Apollo Engine — Stage A Agronomic Suitability Module

This module forms **Stage A** of the Apollo Digital Twin framework. It evaluates regional climate metrics, soil profiles, and water availability to rank crop and variety suitability before initializing Digital Twin physics loops in Stage B.

## Engine Architecture

1. **Knowledge Loader (`src/knowledge_loader.py`)**: Ingests, normalizes, and validates primary/foreign keys across 5 agronomic CSV datasets.
2. **Suitability Engine (`src/suitability_engine.py`)**: Runs modular scoring functions (`climate`, `soil`, `water`) and aggregates results using weighted agronomic functions.
3. **Farm Profile Config (`config/farm_profile.json`)**: Configurable entrypoint specifying target location (`region_id`) and soil profile (`soil_id`).

## Getting Started

### 1. Prerequisites
Ensure Python 3.10+ is installed along with `pandas`.

```bash
pip install -r requirements.txt