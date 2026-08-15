import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

# ==========================================
# PAGE NUMBERING & HEADER/FOOTER CANVAS
# ==========================================
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        
        # Primary palette colors
        primary_color = colors.HexColor("#1A365D")
        text_gray = colors.HexColor("#718096")
        line_gray = colors.HexColor("#E2E8F0")

        # Running Header (Skip on Page 1 cover)
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(primary_color)
            self.drawString(54, 750, "APOLLO AGRIVERSE — TECHNICAL WORK SUMMARY REPORT")
            self.setFont("Helvetica", 8)
            self.setFillColor(text_gray)
            self.drawRightString(612 - 54, 750, "CONFIDENTIAL — INDUSTRY MENTOR REVIEW")
            
            self.setStrokeColor(line_gray)
            self.setLineWidth(0.75)
            self.line(54, 742, 612 - 54, 742)

        # Running Footer (All pages)
        self.setStrokeColor(line_gray)
        self.setLineWidth(0.75)
        self.line(54, 48, 612 - 54, 48)

        self.setFont("Helvetica", 8)
        self.setFillColor(text_gray)
        self.drawString(54, 34, "Digital Twin Architecture & Precision Agronomy Module")
        
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(612 - 54, 34, page_text)
        
        self.restoreState()


# ==========================================
# PDF GENERATION FUNCTION
# ==========================================
def build_pdf():
    pdf_filename = "Apollo_AgriVerse_Work_Summary.pdf"
    doc = SimpleDocTemplate(
        pdf_filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    # Base Color Palette
    PRIMARY = colors.HexColor("#1A365D")     # Deep Navy
    SECONDARY = colors.HexColor("#2B6CB0")   # Slate Blue
    ACCENT = colors.HexColor("#2F855A")      # Forest Green
    DARK_TEXT = colors.HexColor("#2D3748")   # Charcoal
    LIGHT_BG = colors.HexColor("#F7FAFC")    # Cool Light Off-White
    BORDER_COLOR = colors.HexColor("#E2E8F0")# Soft Border Gray

    # Styles Setup
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=PRIMARY,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=SECONDARY,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=SECONDARY,
        spaceBefore=10,
        spaceAfter=6,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=DARK_TEXT,
        spaceAfter=8
    )

    bullet_style = ParagraphStyle(
        'BulletCustom',
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=4
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=DARK_TEXT
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    code_style = ParagraphStyle(
        'CodeBlock',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#2C7A7B"),
        backColor=colors.HexColor("#EDF2F7"),
        borderColor=BORDER_COLOR,
        borderWidth=0.5,
        borderPadding=6,
        spaceAfter=8
    )

    story = []

    # ==========================================
    # HEADER / TITLE BLOCK
    # ==========================================
    story.append(Paragraph("Apollo AgriVerse: Technical Work Summary", title_style))
    story.append(Paragraph("Comprehensive Project Engineering Documentation for Industry Mentor Review", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY, spaceAfter=12))

    # Meta Info Table (Updated: Team Lead removed)
    meta_data = [
        [
            Paragraph("<b>Project Domain:</b> Precision Agronomy & Digital Twin", table_cell_style),
            Paragraph("<b>Date:</b> August 2026", table_cell_style)
        ],
        [
            Paragraph("<b>Target Crop Focus:</b> Grapes (<i>Vitis vinifera</i>)", table_cell_style),
            Paragraph("<b>Target Platform:</b> Apollo AgriVerse Engine", table_cell_style)
        ],
        [
            Paragraph("<b>Technical Contact:</b> Vijayalaxmi", table_cell_style),
            Paragraph("<b>Team Members:</b> Sunaina, Dakshini, Nandini", table_cell_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[270, 234])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # ==========================================
    # SECTION 1: EXECUTIVE PROJECT OVERVIEW
    # ==========================================
    story.append(Paragraph("1. Executive Project & Architecture Overview", h1_style))
    story.append(Paragraph(
        "<b>Apollo AgriVerse</b> is a multi-layered precision agriculture platform that integrates internet of things (IoT) telemetry, "
        "synthetic data generation, advanced ML predictive engines, deep-learning computer vision, dynamic frontend panels, and real-time backend API services "
        "to construct a dynamic <b>Digital Twin Engine</b> specifically tailored for grape farming (<i>Vitis vinifera</i>) in Indian agricultural conditions.",
        body_style
    ))
    story.append(Paragraph(
        "The project engineering workload was collaboratively executed across four core specialized modules: Synthetic Data Generation & Digital Twin Engine Architecture "
        "(<b>Vijayalaxmi</b>), Deep Learning Vision & Interactive Panels (<b>Sunaina Gaikwad</b>), High-Volume Spatial Weather Data Pipeline & Core Frontend System Panels (<b>Dakshini</b>), and "
        "Crop Dataset Phenology, NASA API, & FastAPI Microservices (<b>Nandini</b>). This document presents an explicit and detailed architectural record of all technical "
        "deliverables, file locations, mathematical methodologies, model parameters, and backend scripts.",
        body_style
    ))
    story.append(Spacer(1, 10))

    # ==========================================
    # SECTION 2: VIJAYALAXMI'S WORK
    # ==========================================
    story.append(Paragraph("2. Technical Work Summary — Vijayalaxmi", h1_style))
    story.append(Paragraph("<b>Role & Scope:</b> Systems & Digital Twin Architect | Data Integration, ML Inference Engine, and Synthetic Framework", h2_style))
    story.append(Paragraph(
        "Vijayalaxmi architected the foundational data layer, synthetic data generation pipelines, master dataset relational synthesis, "
        "agronomic machine learning inference engines, and the digital twin telemetry simulation core powering Apollo AgriVerse.",
        body_style
    ))

    story.append(Paragraph("2.1 Synthetic Datasets & Data Dictionary Specification", h2_style))
    story.append(Paragraph(
        "To model farm dynamics realistically, Vijayalaxmi authored the synthetic generator suite and data cleaning scripts, outputting five distinct raw/cleaned synthetic relational streams inside <code>02_Datasets/Synthetic/</code>:",
        body_style
    ))

    # Table of Vijayalaxmi's Datasets
    ds_data = [
        [Paragraph("Dataset File", table_header_style), Paragraph("Key Schema Features", table_header_style), Paragraph("Value Ranges & Constraints", table_header_style)],
        [
            Paragraph("<b>farm_metadata.csv</b><br/>(Raw & Clean)", table_cell_style),
            Paragraph("farm_id, field_id, latitude, longitude, area_acres, soil_type, crop_type, installation_date", table_cell_style),
            Paragraph("farm_id: F0001–F1000<br/>Lat: 15.5–21.5, Long: 72.5–80.5<br/>Area: 0.5–15 Acres<br/>Soil: Clay, Loamy, Black, etc.<br/>Crops: Cotton, Wheat, Rice, Grapes", table_cell_style)
        ],
        [
            Paragraph("<b>sensor_stream.csv</b><br/>(Raw & Clean)", table_cell_style),
            Paragraph("timestamp, farm_id, temperature, humidity, soil_moisture, soil_temperature, light_intensity, battery_level", table_cell_style),
            Paragraph("Freq: Every 5 mins<br/>Air Temp: 18–42 °C<br/>Humidity: 30–95 %<br/>Soil Moisture: 15–90 %<br/>Soil Temp: 15–38 °C<br/>Light: 1,000–100,000 lux", table_cell_style)
        ],
        [
            Paragraph("<b>hydrogel.csv</b><br/>(Raw & Clean)", table_cell_style),
            Paragraph("timestamp, farm_id, water_storage, release_rate, remaining_capacity, status", table_cell_style),
            Paragraph("Freq: 5 mins<br/>Water Storage: 0–100 %<br/>Release Rate: 0.2–5.0 L/hr<br/>Status: Healthy, Low, Critical", table_cell_style)
        ],
        [
            Paragraph("<b>mulching.csv</b><br/>(Raw & Clean)", table_cell_style),
            Paragraph("timestamp, farm_id, mulch_type, degradation_percent, evaporation_reduction, temperature_reduction, status", table_cell_style),
            Paragraph("Mulch Types: Plastic, Organic, Biodegradable<br/>Degradation: 0–100 %<br/>Evap Reduction: 10–70 %<br/>Temp Reduction: 1–8 °C", table_cell_style)
        ],
        [
            Paragraph("<b>crop_lifecycle.csv</b><br/>(Raw & Clean)", table_cell_style),
            Paragraph("farm_id, crop_type, sowing_date, crop_age_days, growth_stage, plant_height_cm, leaf_area_index, chlorophyll_index, canopy_cover_percent", table_cell_style),
            Paragraph("Age: 1–150 Days<br/>Height: 5–250 cm<br/>LAI: 0.5–6.0<br/>Chlorophyll: 20–70<br/>Canopy Cover: 5–100 %", table_cell_style)
        ]
    ]
    ds_table = Table(ds_data, colWidths=[120, 200, 184])
    ds_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG]),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(ds_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("2.2 Grape Focal Pivot & Master Integration Pipeline", h2_style))
    story.append(Paragraph(
        "Via Jupyter Notebook <code>02_Datasets/Master/build_grape_masters.ipynb</code>, Vijayalaxmi synthesized two primary enterprise master datasets stored inside <code>02_Datasets/Processed/Grapes/</code>:",
        body_style
    ))
    story.append(Paragraph("• <b>Master 1: <code>Master_Grapes_Agronomy_Reference.csv</code></b> (800 rows × 9 columns) — Integrates soil chemistry (NPK, pH) and microclimate requirements filtered specifically for grapes to power offline crop yield ML models.", bullet_style))
    story.append(Paragraph("• <b>Master 2: <code>Master_Grapes_Digital_Twin_Telemetry.csv</code></b> (1,000 rows × 24 columns) — Aggregates 5-minute telemetry streams into daily state averages anchored on key <code>farm_id</code>, combining spatial metadata, growth stage phenology, hydrogel polymer metrics, and mulch film degradation.", bullet_style))

    story.append(Spacer(1, 6))
    story.append(Paragraph("2.3 Agronomic ML Machine Learning Engines", h2_style))
    story.append(Paragraph(
        "Vijayalaxmi engineered and trained two predictive machine learning models in <code>06_ML/notebooks/</code>, serializing artifacts into <code>06_ML/models/</code> for live backend inference:",
        body_style
    ))
    story.append(Paragraph("1. <b>Grape Crop Yield Prediction Model (<code>grape_yield_model.pkl</code>):</b> Trained using Gradient Boosting Regressor / Random Forest Regressor on soil chemistry and weather parameters. Feature engineered parameters include N/K ratio, P/K ratio, and optimal pH deviation (<code>ph_opt_dev = |soil_ph - 6.5|</code>). Scaled via <code>grape_yield_scaler.pkl</code>.", bullet_style))
    story.append(Paragraph("2. <b>Telemetry Hydrogel Trigger Model (<code>grape_telemetry_trigger_model.pkl</code>):</b> Predicts dynamic hydrogel water storage capacity requirement based on real-time sensor streams. Features engineered include <code>thermal_gap = air_temp - soil_temp</code>, <code>effective_mulch_cooling</code>, and <code>evapotranspiration_index = air_temp / (humidity + 1e-5)</code>. Scaled via <code>grape_telemetry_scaler.pkl</code>.", bullet_style))

    story.append(Paragraph("Sample ML Inference Verification Code (Engineered by Vijayalaxmi):", h2_style))
    code_snippet = (
        "import joblib, pandas as pd, numpy as np\n"
        "yield_model = joblib.load('../models/grape_yield_model.pkl')\n"
        "yield_scaler = joblib.load('../models/grape_yield_scaler.pkl')\n"
        "input_data = pd.DataFrame([{'nitrogen_mgkg': 140.0, 'phosphorus_mgkg': 45.0, 'potassium_mgkg': 210.0,\n"
        "  'soil_ph': 6.4, 'air_temp_c': 26.5, 'humidity_pct': 65.0, 'rainfall_mm': 720.0,\n"
        "  'N_K_ratio': 140.0/210.0, 'P_K_ratio': 45.0/210.0, 'ph_opt_dev': 0.1}])\n"
        "scaled_input = yield_scaler.transform(input_data[yield_scaler.feature_names_in_])\n"
        "pred_yield = yield_model.predict(scaled_input)[0] # Returns predicted yield (tons/ha)"
    )
    story.append(Paragraph(code_snippet.replace('\n', '<br/>').replace(' ', '&nbsp;'), code_style))

    story.append(Paragraph("2.4 Digital Twin Engine & Simulation Core", h2_style))
    story.append(Paragraph(
        "Vijayalaxmi developed the core simulation engine (located inside the project's <code>simulation/</code> architecture) that models physical farm dynamic states in real time. "
        "It integrates real-time telemetry inputs, evaluates moisture loss against hydrogel polymer absorption curves, factors mulch film thermal cooling reductions, "
        "and triggers automated micro-irrigation interventions when soil moisture drops below critical physiological thresholds.",
        body_style
    ))
    story.append(Spacer(1, 14))

    # ==========================================
    # SECTION 3: SUNAINA'S WORK (UNTOUCHED / FULL ORIGINAL DETAIL)
    # ==========================================
    story.append(Paragraph("3. Technical Work Summary — Sunaina Gaikwad", h1_style))
    story.append(Paragraph("<b>Role & Scope:</b> Deep Learning Vision Specialist & Frontend Interface Lead | Apollo AgriVerse Implementation", h2_style))
    story.append(Paragraph(
        "Sunaina Gaikwad focused on computer vision dataset curation, custom deep learning model training for soil, crop phenology, and polymer condition, "
        "alongside user dashboard frontend construction.",
        body_style
    ))

    story.append(Paragraph("3.1 Tabular Data & Soil Dataset Engineering", h2_style))
    story.append(Paragraph(
        "Sunaina developed dedicated Python scripts to generate localized tabular soil datasets mimicking Indian regional soil and telemetry profile conditions. "
        "All synthetic soil practice files were stored directly inside <code>02_Datasets/</code>.",
        body_style
    ))

    story.append(Paragraph("3.2 Image Dataset Curation & Folder Structuring", h2_style))
    story.append(Paragraph("• <b>Regional Indian Soil Image Dataset:</b> Sourced from Kaggle and structured under <code>02_Datasets/Processed/Soil/Image_Dataset/</code> into train, val, and test splits covering 7 major classes: <i>Alluvial_Soil, Arid_Soil, Black_Soil, Laterite_Soil, Mountain_Soil, Red_Soil, and Yellow_Soil</i>.", bullet_style))
    story.append(Paragraph("• <b>Hydrogel & Mulch Condition Image Dataset:</b> Generated and preprocessed synthetic/real image datasets stored under <code>03_Images/Dataset/</code> to inspect state transitions in water-retention polymers (dry vs. swollen hydrogel) and surface mulching film integrity (intact vs. degraded film).", bullet_style))

    story.append(Paragraph("3.3 Deep Learning AI Models Built & Trained (.keras)", h2_style))
    
    cv_data = [
        [Paragraph("Model Name", table_header_style), Paragraph("Architecture & Methodology", table_header_style), Paragraph("Notebook & Model Paths", table_header_style), Paragraph("Functional Purpose", table_header_style)],
        [
            Paragraph("<b>Soil Classification Model</b>", table_cell_style),
            Paragraph("MobileNetV2 Transfer Learning fine-tuned for 7 classes", table_cell_style),
            Paragraph("Notebook:<br/><code>06_ML/notebooks/train_soil_model.ipynb</code><br/>Model:<br/><code>06_ML/models/soil_classification_model.keras</code>", table_cell_style),
            Paragraph("Classifies input soil images into one of 7 regional Indian soil types to inform agronomic baseline setup.", table_cell_style)
        ],
        [
            Paragraph("<b>Grape Crop Stage Model</b>", table_cell_style),
            Paragraph("Convolutional Neural Network (CNN) / Transfer Learning", table_cell_style),
            Paragraph("Notebook:<br/><code>06_ML/notebooks/train_crop_model.ipynb</code><br/>Model:<br/><code>06_ML/models/grape_crop_stage_model.keras</code>", table_cell_style),
            Paragraph("Identifies grapevine growth across 5 life stages (Bud Burst, Vegetative, Flowering, Fruit Dev, Harvest).", table_cell_style)
        ],
        [
            Paragraph("<b>Hydrogel & Mulch Inspection Model</b>", table_cell_style),
            Paragraph("Custom CNN for state integrity & surface classification", table_cell_style),
            Paragraph("Notebook:<br/><code>06_ML/notebooks/train_hydrogel_model.ipynb</code><br/>Model:<br/><code>06_ML/models/hydrogel_model.keras</code>", table_cell_style),
            Paragraph("Inspects physical state of polymers (dry/swollen) and mulch film degradation (intact/damaged).", table_cell_style)
        ]
    ]
    cv_table = Table(cv_data, colWidths=[100, 120, 144, 140])
    cv_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SECONDARY),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG]),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(cv_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("3.4 Frontend Dashboard Panel Development", h2_style))
    story.append(Paragraph(
        "Utilizing UI generation platforms (v0, ChatGPT, Gemini, Codex), Sunaina designed and implemented <b>2 out of the 6 core platform panels</b> for the AgriVerse user dashboard:",
        body_style
    ))
    story.append(Paragraph("1. <b>Smart Mulching Panel:</b> Built to monitor real-time physical condition, degradation level, coverage percentage, and moisture retention efficiency of protective ground films.", bullet_style))
    story.append(Paragraph("2. <b>Predictions Panel:</b> Constructed to display live AI computer vision classifications, growth stage progression, yield predictions, and operational system alerts directly to end-users.", bullet_style))
    story.append(Spacer(1, 14))

    # ==========================================
    # SECTION 4: DAKSHINI'S WORK (UPDATED WITH FRONTEND DETAILS)
    # ==========================================
    story.append(Paragraph("4. Technical Work Summary — Dakshini", h1_style))
    story.append(Paragraph("<b>Role & Scope:</b> High-Volume Spatial Weather Data Pipeline Architect & Core Frontend System Lead", h2_style))
    story.append(Paragraph(
        "Dakshini engineered the large-scale weather data processing pipeline (managing over <b>800,000 continuous entries</b>) and spearheaded "
        "the frontend design and implementation of the <b>6 Main Core Platform Panels</b> that form the primary interactive backbone of Apollo AgriVerse.",
        body_style
    ))

    story.append(Paragraph("4.1 Core System Frontend Panels Architecture (6 Main Panels)", h2_style))
    story.append(Paragraph(
        "Dakshini led the UI/UX architecture, component structure, and state integration for the 6 central system panels across the platform:",
        body_style
    ))

    panels_data = [
        [Paragraph("Core Panel Name", table_header_style), Paragraph("Key Functional & Interface Components", table_header_style), Paragraph("Data Integration & Outputs", table_header_style)],
        [
            Paragraph("<b>1. Digital Twin Panel</b>", table_cell_style),
            Paragraph("Interactive 3D/2D spatial farm visualizer, telemetry node indicators, live sensor metric gauges.", table_cell_style),
            Paragraph("Streams real-time sensor streams (temp, moisture, light) into a live virtual farm model.", table_cell_style)
        ],
        [
            Paragraph("<b>2. Crop Life Cycle Panel</b>", table_cell_style),
            Paragraph("Phenology progress indicators, growth timeline (Bud Burst to Harvest), leaf area index & height graphs.", table_cell_style),
            Paragraph("Binds with <code>crop_lifecycle.csv</code> and vision model stage progression data.", table_cell_style)
        ],
        [
            Paragraph("<b>3. Simulation Panel</b>", table_cell_style),
            Paragraph("Interactive environment controls (irrigation rates, temp offset, fertilizer inputs), scenario execution triggers.", table_cell_style),
            Paragraph("Interfaces directly with the Digital Twin dynamic physics simulation engine.", table_cell_style)
        ],
        [
            Paragraph("<b>4. Hydrogel & Smart Irrigation Panel</b>", table_cell_style),
            Paragraph("Polymer hydration levels, release rate meters, automated micro-irrigation valve toggles.", table_cell_style),
            Paragraph("Monitors hydrogel water storage and triggers automated irrigation interventions.", table_cell_style)
        ],
        [
            Paragraph("<b>5. Weather Analytics Panel</b>", table_cell_style),
            Paragraph("Spatial microclimate maps, hourly temperature/humidity trends, precipitation forecasting charts.", table_cell_style),
            Paragraph("Powered by Dakshini's 800k Open-Meteo pipeline and live NASA weather API streams.", table_cell_style)
        ],
        [
            Paragraph("<b>6. Executive Dashboard Panel</b>", table_cell_style),
            Paragraph("High-level KPI metric cards, master system health monitoring, critical alert feed.", table_cell_style),
            Paragraph("Aggregates real-time state streams across all farm sub-systems into a unified view.", table_cell_style)
        ]
    ]
    panels_table = Table(panels_data, colWidths=[120, 210, 174])
    panels_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SECONDARY),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG]),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(panels_table)
    story.append(Spacer(1, 10))

    story.append(Paragraph("4.2 High-Volume Weather Data Pipeline (800,000+ Entries)", h2_style))
    story.append(Paragraph("<b>Environment & Python Tech Stack:</b>", h2_style))
    story.append(Paragraph("• <b>`requests` & `urllib3`:</b> Developed robust API client connection logic with automated retries and network fault tolerance.", bullet_style))
    story.append(Paragraph("• <b>`pandas` & `numpy`:</b> Executed high-performance vector math, time-series indexing, and structured data manipulation on 800k rows.", bullet_style))
    story.append(Paragraph("• <b>`scikit-learn` (`RobustScaler`):</b> Applied robust feature scaling based on statistics that are resilient to outliers, preserving critical extreme weather event signals (e.g., severe heatwaves, sudden rain spikes).", bullet_style))
    story.append(Paragraph("• <b>`time` & `os`:</b> Managed rate-limiting algorithms to respect external API throttle policies and orchestrated local system file saving.", bullet_style))

    story.append(Paragraph("<b>External Data Sourcing & Advanced ML Techniques:</b>", h2_style))
    story.append(Paragraph("• <b>Open-Meteo Archive API:</b> Ingested 2023 historical hourly weather telemetry across a customized latitude/longitude grid covering key Indian agricultural zones.", bullet_style))
    story.append(Paragraph("• <b>Time-Weighted Interpolation:</b> Applied linear and spline temporal interpolation algorithms to resolve missing continuous data points without destroying temporal continuity.", bullet_style))
    story.append(Paragraph("• <b>Outlier Detection & Noise Smoothing (IQR & EWMA):</b> Utilized Interquartile Range (IQR) filtering to isolate physical sensor anomalies and Exponentially Weighted Moving Average (EWMA) to smooth high-frequency microclimate sensor noise.", bullet_style))
    story.append(Paragraph("• <b>Cyclical Feature Encoding:</b> Transformed temporal features (hours of day, months of year) into continuous 2D spatial features using Sine and Cosine trigonometric transformations:", bullet_style))
    
    math_code = "x_sin = sin(2 * pi * t / T),   x_cos = cos(2 * pi * t / T)"
    story.append(Paragraph(math_code, code_style))

    story.append(Paragraph("• <b>Time-Series Windowing & Feature Extraction:</b> Engineered 1-hour, 3-hour, and 24-hour lag variables, alongside 6-hour rolling means and rolling standard deviations to provide rich temporal context for downstream ML models.", bullet_style))
    story.append(Spacer(1, 14))

    # ==========================================
    # SECTION 5: NANDINI'S WORK
    # ==========================================
    story.append(Paragraph("5. Technical Work Summary — Nandini", h1_style))
    story.append(Paragraph("<b>Role & Scope:</b> Crop Phenology Pipeline, NASA API Testing, & FastAPI Microservice Engineer", h2_style))
    story.append(Paragraph(
        "Nandini delivered work spanning crop dataset organization, grape phenology image preprocessing, growth stage model training, "
        "external NASA POWER API integration, and setting up the central FastAPI backend server.",
        body_style
    ))

    story.append(Paragraph("5.1 Crop Dataset & Image Phenology Pipeline", h2_style))
    story.append(Paragraph("• <b>Agronomic Crop Recommendation Dataset:</b> Handled and verified <code>02_Datasets/Raw/Crop/Crop_recommendation.csv</code> for multi-crop comparison baselines.", bullet_style))
    story.append(Paragraph("• <b>Grape Crop Image Structuring:</b> Curated and organized grape plant images under <code>03_Images/Dataset/</code> into 5 distinct biological growth directories: <code>01_Bud_Burst</code>, <code>02_Vegetative</code>, <code>03_Flowering</code>, <code>04_Fruit_Development</code>, and <code>05_Harvest</code>.", bullet_style))

    story.append(Paragraph("5.2 Computer Vision Preprocessing & Model Execution", h2_style))
    story.append(Paragraph("• Preprocessed image datasets using OpenCV, NumPy, and TensorFlow/Keras to verify image resolutions, channels, and bounding integrity.", bullet_style))
    story.append(Paragraph("• Built and trained the <b>Grape Crop Stage Classification Model</b> inside notebook <code>06_ML/notebooks/train_crop_model.ipynb</code>, saving the final model artifact to <code>06_ML/models/grape_crop_stage_model.keras</code>.", bullet_style))

    story.append(Paragraph("5.3 External Weather API Integration & Verification", h2_style))
    story.append(Paragraph("• Tested real-time solar and meteorological data extraction using the <b>NASA POWER Hourly API</b> across target Indian coordinates.", bullet_style))
    story.append(Paragraph("• Developed API client logic in <code>05_Backend/api/weather_api/nasa_api.py</code> and automated verification test script in <code>05_Backend/api/weather_api/test_nasa_weather.py</code>, extracting temperature, relative humidity, and precipitation parameters.", bullet_style))

    story.append(Paragraph("5.4 FastAPI Microservice Architecture", h2_style))
    story.append(Paragraph("• Constructed and tested the core FastAPI application entry point inside <code>05_Backend/app/main.py</code>.", bullet_style))
    story.append(Paragraph("• Configured Uvicorn ASGI server deployment and verified backend endpoint routing via Interactive OpenAPI / Swagger documentation.", bullet_style))
    story.append(Paragraph("• Maintained team version control across Git/GitHub repositories.", bullet_style))

    story.append(Paragraph("Nandini's End-to-End Workflow Vector:", h2_style))
    story.append(Paragraph(
        "<b>Grape Dataset</b> → <b>Image Preprocessing (OpenCV)</b> → <b>Grape Growth Stage Model (.keras)</b> → <b>NASA Weather API Engine</b> → <b>FastAPI Service Setup</b>",
        code_style
    ))
    story.append(Spacer(1, 14))

    # ==========================================
    # SECTION 6: COMBINED TEAM RESPONSIBILITY MATRIX
    # ==========================================
    story.append(KeepTogether([
        Paragraph("6. Team Task & Technical Ownership Matrix", h1_style),
        Paragraph("The following table provides a high-level summary of technical deliverables and individual task ownership across Apollo AgriVerse:", body_style),
        Spacer(1, 4)
    ]))

    matrix_data = [
        [Paragraph("Project Subsystem", table_header_style), Paragraph("Primary Engineer", table_header_style), Paragraph("Key Deliverables & Technology Stack", table_header_style)],
        [
            Paragraph("<b>Synthetic Data & Digital Twin</b>", table_cell_style),
            Paragraph("Vijayalaxmi", table_cell_style),
            Paragraph("5 Synthetic CSVs, Master Agronomy & Telemetry Pipelines, Digital Twin Simulation Core, Yield & Hydrogel ML Engines (`joblib`, `scikit-learn`).", table_cell_style)
        ],
        [
            Paragraph("<b>6 Main Core Frontend Panels & Weather Pipeline</b>", table_cell_style),
            Paragraph("Dakshini", table_cell_style),
            Paragraph("Designed & built 6 main panels (Digital Twin, Life Cycle, Simulation, Hydrogel, Weather, Overview Dashboard). 800,000-entry Open-Meteo processing (`RobustScaler`, EWMA/IQR).", table_cell_style)
        ],
        [
            Paragraph("<b>Soil & Polymer Vision Models</b>", table_cell_style),
            Paragraph("Sunaina Gaikwad", table_cell_style),
            Paragraph("Soil & Mulch Image Datasets, 3 Keras DL Models (MobileNetV2, CNNs), Smart Mulching & Predictions UI Panels.", table_cell_style)
        ],
        [
            Paragraph("<b>Crop Phenology & Backend API</b>", table_cell_style),
            Paragraph("Nandini", table_cell_style),
            Paragraph("Grape Phenology Dataset, Crop Stage Classification Model, NASA POWER API client, FastAPI (`main.py`) & Uvicorn setup.", table_cell_style)
        ]
    ]
    matrix_table = Table(matrix_data, colWidths=[120, 100, 284])
    matrix_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), PRIMARY),
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG]),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(matrix_table)
    story.append(Spacer(1, 20))

    # ==========================================
    # SECTION 7: SIGN-OFF BLOCK
    # ==========================================
    signoff_data = [
        [
            Paragraph("<b>Submitted By:</b> Vijayalaxmi<br/>Systems & Digital Twin Architect", table_cell_style),
            Paragraph("<b>Reviewed By:</b> Industry Mentor<br/>Apollo AgriVerse Evaluation", table_cell_style)
        ],
        [
            Paragraph("<br/><br/>Signature: ______________________", table_cell_style),
            Paragraph("<br/><br/>Signature: ______________________", table_cell_style)
        ]
    ]
    signoff_table = Table(signoff_data, colWidths=[250, 254])
    signoff_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(KeepTogether([
        Paragraph("7. Document Authorization & Sign-off", h1_style),
        signoff_table
    ]))

    # Build PDF Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated: {os.path.abspath(pdf_filename)}")

if __name__ == "__main__":
    build_pdf()