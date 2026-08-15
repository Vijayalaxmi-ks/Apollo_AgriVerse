<style>
  /* Base Body Style */
  body {
    font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #2c3e50;
    line-height: 1.6;
    font-size: 14px;
  }
  
  /* Agriculture Green Theme for Headers */
  h1, h2, h3 {
    color: #1a4d2e; 
  }
  h1 {
    text-align: center;
    font-size: 2.2em;
    border-bottom: 3px solid #1a4d2e;
    padding-bottom: 10px;
    margin-bottom: 5px;
  }
  h2 {
    border-bottom: 1px solid #4f6f52;
    padding-bottom: 5px;
    margin-top: 30px;
  }

  /* Professional Table Styling */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    font-size: 13px;
  }
  th {
    background-color: #1a4d2e;
    color: #ffffff;
    padding: 12px;
    text-align: left;
    border: 1px solid #1a4d2e;
  }
  td {
    border: 1px solid #dddddd;
    padding: 10px;
  }
  tr:nth-child(even) {
    background-color: #f8f9fa;
  }

  /* Code and Highlights */
  code {
    background-color: #f1f3f5;
    color: #d63384;
    padding: 2px 5px;
    border-radius: 4px;
    font-family: 'Courier New', Courier, monospace;
    font-size: 0.95em;
  }
</style>
# Apollo AgriVerse
## Engineering an Intelligent Agricultural Ecosystem via Weather API Architecture
**MindForgeAI Internship Program** | **Computational Engineering & Smart Systems** | **Target Scope:** Live Agricultural Weather Microservice (India)

---

### 1. Executive Overview & System Philosophy

**Apollo AgriVerse** is a unified technological ecosystem engineered to model, predict, and continuously optimize agricultural operations across the crop lifecycle. Traditional precision agriculture operates reactively—monitoring static sensor parameters or relying on historical averages, taking action only after resource degradation has occurred.

The **Weather API Microservice** replaces delayed observation loops with a live meteorological stream that dynamically feeds real-time telemetry—such as ambient temperature, relative humidity, precipitation, wind speed, and solar radiation—directly into downstream digital twin crop models. Engineered specifically for Indian agricultural topography, the API incorporates geographic boundary validation, automated data sanitization, in-memory response caching, and a bulletproof 3-tier hybrid fallback routing architecture.

#### Fundamental Concept Glossary
* **Hybrid Fallback Engine:** A multi-layered request routing mechanism that prioritizes real-time live APIs and gracefully degrades to satellite data or offline local datasets during network outages.
* **Telemetry:** Automated, continuous collection and transmission of environmental parameters from remote weather stations or satellites.
* **In-Memory TTL Cache:** A high-speed memory layer that stores recent API responses for a set Time-To-Live (15 minutes), serving identical location queries in under $5\text{ ms}$.
* **Data Sanitization:** Preprocessing logic that intercepts missing or corrupted telemetry values (e.g., NASA's $-999.0$ fill codes) and normalizes them into valid numerical bounds.
* **OpenAPI / Swagger UI:** Auto-generated interactive API documentation built on Pydantic schemas, enabling visual API testing and formal contract enforcement.

---

### 2. Implemented Weather Architecture & Data Sources

The Weather API Microservice relies on three synchronized data tiers to guarantee high availability and sub-second response times.

#### 2.1 Multi-Tier Weather Data Matrix

| Data Tier | Source / Endpoint | Update Frequency | Key Parameters Captured | Operational Role in Apollo AgriVerse |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1 (Primary)** | **Open-Meteo API** | Live (Every 15 mins) | Air Temp (°C), Humidity (%), Rainfall (mm), Wind Speed (m/s), Solar Radiation (W/m²) | Serves 100% true live weather telemetry for real-time digital twin state updates. |
| **Tier 2 (Secondary)** | **NASA POWER AG API** | Daily Snapshot (~3-day satellite lag) | Temperature ($T_{2M}$), Relative Humidity ($RH_{2M}$), Precipitation ($PRECTOTCORR$), Wind Speed ($WS_{2M}$), Solar Radiation ($ALLSKY\_SFC\_SW\_DWN$) | Acts as secondary online satellite backup with specialized agricultural solar parameters. |
| **Tier 3 (Tertiary Failsafe)** | **`weather_raw_dataset.csv`** | Static Offline Dataset | Latitude, Longitude, Temp (°C), Humidity (%), Precip (mm), Pressure (hPa), Wind (km/h), Solar (W/m²) | Guarantees offline availability by computing nearest geographic point via coordinate distance algorithm. |

---

### 3. The Three Core Pillars of the Weather API

1. **Real-Time Telemetry Stream (Open-Meteo Engine):** Fetches live microclimate metrics without requiring authentication keys, updating every 15 minutes to reflect atmospheric changes.
2. **Satellite & Offline Resilient Routing (NASA POWER & CSV Engine):** Intercepts network timeouts or socket failures. If Open-Meteo is unreachable, requests route seamlessly to NASA POWER AG; if all internet access drops, the system matches user coordinates against `weather_raw_dataset.csv` using Manhattan distance approximation:
   $$d = |\text{latitude}_{\text{CSV}} - \text{latitude}_{\text{User}}| + |\text{longitude}_{\text{CSV}} - \text{longitude}_{\text{User}}|$$
3. **Automated Bounding & Sanitization:** Enforces Indian geographic boundary constraints ($6.0^\circ\text{N} \le \text{Latitude} \le 37.5^\circ\text{N}$ and $68.0^\circ\text{E} \le \text{Longitude} \le 97.5^\circ\text{E}$) and filters invalid satellite flags (converting $-999.0$ indicators to $0.0$).

---

### 4. Performance Metrics & Caching Mechanics

To minimize latency and prevent rate-limiting when multiple requests query identical farm coordinates, the API implements spatial coordinate rounding and in-memory Time-To-Live (TTL) caching:

* **Cache Key Computation:** Coordinates are rounded to 2 decimal places ($\sim 1.1\text{ km}$ spatial grid resolution).
* **TTL Duration:** $900\text{ seconds}$ ($15\text{ minutes}$).

#### Performance Benchmarks
* **Cached Hits:** $< 5\text{ ms}$ response time.
* **Live Open-Meteo Queries:** $\sim 200 - 400\text{ ms}$ response time.
* **NASA POWER Queries:** $\sim 1.5 - 2.5\text{ s}$ response time.
* **CSV Offline Fallback:** $\sim 10 - 20\text{ ms}$ execution time.

---

### 5. Technical Implementation & Microservices Endpoint Roadmap

* **Phase 1: Core Service Engineering (`05_Backend/api/weather_api/`)**
  * **What:** Developed module logic for NASA POWER (`nasa_api.py`), script testing (`test_nasa_weather.py`), and local dataset fallback processing (`weather_service.py`).
  * **How:** Utilized `requests` and `pandas` libraries to build dynamic date calculation routines (`datetime.utcnow() - timedelta(days=3)`) and distance-minimization logic.

* **Phase 2: REST API & Pydantic Validation (`05_Backend/app/main.py`)**
  * **What:** Built high-performance FastAPI microservice endpoints with CORS cross-origin middleware.
  * **How:** Implemented GET `/weather` endpoint accepting `latitude` and `longitude` query parameters. Enforced strict range constraints using Pydantic `Field` and `Query` schemas.

* **Phase 3: Live Verification & Testing**
  * **What:** Verified interactive OpenAPI documentation (`http://127.0.0.1:8000/docs`) and CLI terminal outputs.
  * **How:** Tested edge cases including boundary violation queries, simulated network drops, and live coordinates across major Indian agricultural zones (e.g., Solapur, Maharashtra at $17.66^\circ\text{N}, 75.91^\circ\text{E}$).

* **Phase 4: Final Handoff & Frontend Integration**
  * **What:** Handed off clean, self-documenting JSON APIs for integration into the digital twin dashboard (`04_Frontend/`).
  * **How:** Created standardized response payloads with source tracking tags (`"Open-Meteo (Live)"`, `"NASA POWER AG"`, or `"Local CSV Fallback"`) for transparent frontend rendering.          