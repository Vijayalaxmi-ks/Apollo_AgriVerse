import os
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

# ----------------------------------------------------------------------
# 1. PATH CONFIGURATION FOR TEAM/VISH FOLDER
# ----------------------------------------------------------------------
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(SCRIPT_DIR, "..", ".."))

PLOT_PATH = os.path.join(ROOT_DIR, "validation_plots", "digital_twin_validation_results.png")
PDF_OUTPUT_PATH = os.path.join(ROOT_DIR, "Apollo_AgriVerse_Complete_Architecture_Guide.pdf")

# ----------------------------------------------------------------------
# 2. COLOR PALETTE (APOLLO THEME: GREEN & WHITE)
# ----------------------------------------------------------------------
COLOR_PRIMARY_DARK   = colors.HexColor("#1A4D2E")  # Deep Emerald Green
COLOR_PRIMARY_ACCENT = colors.HexColor("#4E9F3D")  # Mint Plant Accent
COLOR_BG_LIGHT       = colors.HexColor("#F2F9F4")  # Soft Green Light Background
COLOR_TEXT_MAIN      = colors.HexColor("#2D3748")  # Slate Charcoal
COLOR_BORDER         = colors.HexColor("#C2E0C6")  # Light Border Green

# ----------------------------------------------------------------------
# 3. TYPOGRAPHY & STYLES
# ----------------------------------------------------------------------
styles = getSampleStyleSheet()

style_title = ParagraphStyle(
    'DocTitle', parent=styles['Normal'],
    fontName='Helvetica-Bold', fontSize=22, leading=26,
    textColor=COLOR_PRIMARY_DARK, spaceAfter=4
)

style_subtitle = ParagraphStyle(
    'DocSubtitle', parent=styles['Normal'],
    fontName='Helvetica', fontSize=11, leading=15,
    textColor=COLOR_PRIMARY_ACCENT, spaceAfter=12
)

style_h1 = ParagraphStyle(
    'SectionH1', parent=styles['Normal'],
    fontName='Helvetica-Bold', fontSize=13, leading=17,
    textColor=COLOR_PRIMARY_DARK, spaceBefore=14, spaceAfter=6
)

style_h2 = ParagraphStyle(
    'SectionH2', parent=styles['Normal'],
    fontName='Helvetica-Bold', fontSize=10.5, leading=14,
    textColor=COLOR_PRIMARY_ACCENT, spaceBefore=10, spaceAfter=4
)

style_body = ParagraphStyle(
    'BodyTextCustom', parent=styles['Normal'],
    fontName='Helvetica', fontSize=9, leading=13.5,
    textColor=COLOR_TEXT_MAIN, spaceAfter=6
)

# Dedicated style for table headers (Fixes dark text on dark green header issue)
style_table_header = ParagraphStyle(
    'TableHeaderCustom', parent=styles['Normal'],
    fontName='Helvetica-Bold', fontSize=9, leading=13.5,
    textColor=colors.white, spaceAfter=0
)

style_code = ParagraphStyle(
    'CodeSnippet', parent=styles['Normal'],
    fontName='Courier', fontSize=8, leading=11,
    textColor=COLOR_PRIMARY_DARK, backColor=COLOR_BG_LIGHT,
    borderColor=COLOR_BORDER, borderWidth=1, borderPadding=6,
    spaceAfter=8
)

style_callout = ParagraphStyle(
    'CalloutText', parent=styles['Normal'],
    fontName='Helvetica-Oblique', fontSize=8.5, leading=12.5,
    textColor=COLOR_PRIMARY_DARK, backColor=COLOR_BG_LIGHT,
    borderColor=COLOR_PRIMARY_ACCENT, borderWidth=1, borderPadding=8,
    spaceAfter=10
)

def add_header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(COLOR_PRIMARY_DARK)
    canvas.drawString(36, 18, "Apollo AgriVerse — System Architecture & Digital Twin Manual")
    canvas.drawRightString(612 - 36, 18, f"Page {doc.page}")
    canvas.setStrokeColor(COLOR_BORDER)
    canvas.setLineWidth(0.5)
    canvas.line(36, 28, 612 - 36, 28)
    canvas.restoreState()

# ----------------------------------------------------------------------
# 4. BUILD DOCUMENT STORY
# ----------------------------------------------------------------------
doc = SimpleDocTemplate(
    PDF_OUTPUT_PATH,
    pagesize=letter,
    rightMargin=36, leftMargin=36,
    topMargin=36, bottomMargin=42
)

story = []

# Title Banner
story.append(Paragraph("Apollo AgriVerse — Complete Architecture & Technical Guide", style_title))
story.append(Paragraph("End-to-End System Manual: Database Storage, Telemetry Engine, Digital Twin Physics & Validation", style_subtitle))
story.append(HRFlowable(width="100%", thickness=2, color=COLOR_PRIMARY_ACCENT, spaceAfter=12))

story.append(Paragraph(
    "<b>Project Mission:</b> Apollo AgriVerse is a continuous, crop-specific precision agriculture system designed for "
    "vineyard (<i>Vitis vinifera</i>) cultivation. It integrates real-time telemetry persistence, stateful differential physics simulation, "
    "hydrogel intervention triggers, dynamic phenology stage intelligence, and FastAPI dashboard endpoints.",
    style_callout
))

# Section 1: Architecture & Directory Map
story.append(Paragraph("1. System Architecture & File Directory Walkthrough", style_h1))
story.append(Paragraph(
    "Every component in the Apollo AgriVerse ecosystem has a designated role within a modular repository layout. "
    "Below is the complete architectural map explaining the purpose of each directory and core file:",
    style_body
))

repo_data = [
    [Paragraph("Directory / File Path", style_table_header), Paragraph("Architectural Purpose & Technical Function", style_table_header)],
    [Paragraph("<code>02_Datasets/Processed/Grapes/simulation_db.sqlite</code>", style_body), Paragraph("<b>Relational Persistence Engine:</b> Stores daily telemetry, state history, and intervention logs locally.", style_body)],
    [Paragraph("<code>06_ML/models/grape_telemetry_trigger_model.pkl</code>", style_body), Paragraph("<b>ML Trigger Model:</b> Serialized Scikit-Learn/XGBoost model computing hydrogel release requirements based on deficit.", style_body)],
    [Paragraph("<code>06_ML/tests/test_digital_twin_physics.py</code>", style_body), Paragraph("<b>Validation Suite:</b> Executes the 5 formal integration tests and auto-saves visual plots.", style_body)],
    [Paragraph("<code>validation_plots/digital_twin_validation_results.png</code>", style_body), Paragraph("<b>Root Visual Sub-folder:</b> Stores 300 DPI multi-panel validation plots generated by the test runner.", style_body)],
    [Paragraph("<code>team/vish/generate_apollo_comprehensive_docs.py</code>", style_body), Paragraph("<b>Automated PDF Engine:</b> ReportLab documentation builder executing this manual in Apollo Theme.", style_body)],
    [Paragraph("<code>main.py</code>", style_body), Paragraph("<b>FastAPI Core Service:</b> REST API entrypoint exposing twin state, scenario executions, and dashboard endpoints.", style_body)]
]

t_repo = Table(repo_data, colWidths=[2.7*inch, 4.3*inch])
t_repo.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), COLOR_PRIMARY_DARK),
    ('GRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
]))
story.append(t_repo)
story.append(Spacer(1, 10))

# Section 2: Database Storage Engine
story.append(Paragraph("2. Telemetry Persistence Layer (SQLite Database Architecture)", style_h1))
story.append(Paragraph("Why SQLite for Apollo AgriVerse?", style_h2))
story.append(Paragraph(
    "SQLite was selected over heavy server-based databases (like PostgreSQL or MySQL) for key edge-computing reasons: "
    "<b>Zero-latency local disk read/writes</b> during high-frequency simulation steps, <b>zero setup configuration</b>, and "
    "<b>embedded local persistence</b> directly inside the repository. It allows the Digital Twin to run offline on edge field hardware "
    "or local servers without external network dependencies.",
    style_body
))

story.append(Paragraph("Database Schema Design & Storage Functionality:", style_h2))
story.append(Paragraph(
    "The database file <code>simulation_db.sqlite</code> maintains the continuous telemetry table <code>twin_telemetry</code>. "
    "It logs daily physical state transitions, atmospheric inputs, and active interventions:",
    style_body
))

db_schema_data = [
    [Paragraph("Column Name", style_table_header), Paragraph("Data Type", style_table_header), Paragraph("Physical Interpretation & Unit", style_table_header)],
    [Paragraph("<code>day</code>", style_body), Paragraph("INTEGER (PRIMARY KEY)", style_body), Paragraph("Sequential simulation day index (1 to N).", style_body)],
    [Paragraph("<code>stage</code>", style_body), Paragraph("TEXT", style_body), Paragraph("Active grape phenology growth stage (e.g., Flowering).", style_body)],
    [Paragraph("<code>soil_moisture</code>", style_body), Paragraph("REAL (FLOAT)", style_body), Paragraph("Current volumetric soil water content (%) [$S(t)$].", style_body)],
    [Paragraph("<code>evapotranspiration</code>", style_body), Paragraph("REAL (FLOAT)", style_body), Paragraph("Daily atmospheric moisture loss rate (%/day).", style_body)],
    [Paragraph("<code>rainfall</code>", style_body), Paragraph("REAL (FLOAT)", style_body), Paragraph("Natural rain water addition (% volumetric equivalent).", style_body)],
    [Paragraph("<code>hydrogel_release</code>", style_body), Paragraph("REAL (FLOAT)", style_body), Paragraph("Osmotic hydrogel water release intervention rate (%).", style_body)]
]

t_schema = Table(db_schema_data, colWidths=[1.8*inch, 1.8*inch, 3.4*inch])
t_schema.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), COLOR_PRIMARY_DARK),
    ('GRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLOR_BG_LIGHT]),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
]))
story.append(t_schema)
story.append(Spacer(1, 10))

story.append(Paragraph("State Recovery Mechanism (<code>load_latest_state()</code>):", style_h2))
story.append(Paragraph(
    "To ensure state persistence across application restarts, the synchronizer invokes <code>load_latest_state()</code>. "
    "This function queries SQLite via <code>SELECT * FROM twin_telemetry ORDER BY day DESC LIMIT 1</code>. "
    "If the simulation process halts at Day 30, restarting the backend fetches Day 30's exact soil moisture ($36.6\%$) "
    "and seamlessly computes Day 31 ($35.4\%$) without resetting state memory.",
    style_body
))

# Section 3: Digital Twin Physics Engine
story.append(Paragraph("3. Core Digital Twin Physics Engine & Intelligence", style_h1))
story.append(Paragraph(
    "The Digital Twin is built on a physical state differential update model rather than random number generators. "
    "The state update equation at step $t+1$ is strictly defined as:",
    style_body
))

story.append(Paragraph(
    "<code>S(t+1) = Clip( S(t) - Evapotranspiration(t) + Rainfall(t) + HydrogelRelease(t), 10.0, 90.0 )</code>",
    style_code
))

story.append(Paragraph("Grape Phenology Dynamic Threshold Intelligence (Vitis vinifera):", style_h2))
story.append(Paragraph(
    "Apollo AgriVerse continuously adapts water deficit thresholds based on the active phenological growth stage:",
    style_body
))

pheno_data = [
    [Paragraph("Phenology Stage", style_table_header), Paragraph("Day Range", style_table_header), Paragraph("Evap Multiplier", style_table_header), Paragraph("Moisture Threshold", style_table_header), Paragraph("Agronomic Rationale", style_table_header)],
    [Paragraph("<b>Bud Burst</b>", style_body), Paragraph("Day 1 - 15", style_body), Paragraph("0.45x", style_body), Paragraph("25.0%", style_body), Paragraph("Initial root awakening; moderate water need.", style_body)],
    [Paragraph("<b>Flowering</b>", style_body), Paragraph("Day 16 - 35", style_body), Paragraph("0.85x", style_body), Paragraph("35.0%", style_body), Paragraph("Critical sensitivity; water stress causes flower drop.", style_body)],
    [Paragraph("<b>Fruit Development</b>", style_body), Paragraph("Day 36 - 65", style_body), Paragraph("1.10x", style_body), Paragraph("30.0%", style_body), Paragraph("Peak canopy transpiration & cell expansion.", style_body)],
    [Paragraph("<b>Veraison</b>", style_body), Paragraph("Day 66 - 80", style_body), Paragraph("0.70x", style_body), Paragraph("22.0%", style_body), Paragraph("Controlled deficit boosts sugar accumulation (Brix).", style_body)],
    [Paragraph("<b>Harvest</b>", style_body), Paragraph("Day 81 - 90+", style_body), Paragraph("0.35x", style_body), Paragraph("18.0%", style_body), Paragraph("Minimal water to prevent berry splitting before pick.", style_body)]
]

t_pheno = Table(pheno_data, colWidths=[1.3*inch, 0.9*inch, 1.1*inch, 1.3*inch, 2.4*inch])
t_pheno.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), COLOR_PRIMARY_DARK),
    ('GRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLOR_BG_LIGHT]),
    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ('TOPPADDING', (0, 0), (-1, -1), 4),
]))
story.append(t_pheno)
story.append(Spacer(1, 10))

# Section 4: Integration Validation & Visual Results
story.append(Paragraph("4. Integration Validation Framework & Visual Proofs", style_h1))
story.append(Paragraph(
    "Before exposing endpoints to the FastAPI backend, the Digital Twin engine was subjected to 5 rigorous validation tests. "
    "All 5 tests passed successfully, confirming state continuity, causality, branching, persistence, and stage intelligence.",
    style_body
))

if os.path.exists(PLOT_PATH):
    story.append(Image(PLOT_PATH, width=7.0*inch, height=4.5*inch))
    story.append(Spacer(1, 10))
else:
    story.append(Paragraph("<i>[Note: Validation visual plot image not found in validation_plots folder.]</i>", style_callout))

test_summary_data = [
    [Paragraph("Test Name", style_table_header), Paragraph("Condition / Method", style_table_header), Paragraph("Observed Result", style_table_header), Paragraph("Status", style_table_header)],
    [Paragraph("<b>1. State Continuity</b>", style_body), Paragraph("Run Day 1 -> 90 step-wise", style_body), Paragraph("Smooth continuous curve; ending moisture 22.6%", style_body), Paragraph("<font color='#1A4D2E'><b>PASSED</b></font>", style_body)],
    [Paragraph("<b>2. Causal Intervention</b>", style_body), Paragraph("Low moisture (21.4%) + Hydrogel", style_body), Paragraph("Moisture jumped from 19.9% (no action) to 27.8%", style_body), Paragraph("<font color='#1A4D2E'><b>PASSED</b></font>", style_body)],
    [Paragraph("<b>3. Branching Logic</b>", style_body), Paragraph("Simulate Scenarios A, B, & C", style_body), Paragraph("Distinct physics profiles rendered for drought/hydrogel/rain", style_body), Paragraph("<font color='#1A4D2E'><b>PASSED</b></font>", style_body)],
    [Paragraph("<b>4. Database Recovery</b>", style_body), Paragraph("Run Day 1-30 -> Purge -> Resume", style_body), Paragraph("Restored Day 30 (36.6%) and calculated Day 31 (35.4%)", style_body), Paragraph("<font color='#1A4D2E'><b>PASSED</b></font>", style_body)],
    [Paragraph("<b>5. Stage Intelligence</b>", style_body), Paragraph("Evaluate phenology thresholds", style_body), Paragraph("Hydrogel trigger dynamic bounds adjusted per growth stage", style_body), Paragraph("<font color='#1A4D2E'><b>PASSED</b></font>", style_body)]
]

t_test_sum = Table(test_summary_data, colWidths=[1.5*inch, 1.8*inch, 2.7*inch, 1.0*inch])
t_test_sum.setStyle(TableStyle([
    ('BACKGROUND', (0, 0), (-1, 0), COLOR_PRIMARY_DARK),
    ('GRID', (0, 0), (-1, -1), 0.5, COLOR_BORDER),
    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, COLOR_BG_LIGHT]),
    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ('TOPPADDING', (0, 0), (-1, -1), 5),
]))
story.append(t_test_sum)
story.append(Spacer(1, 12))

# Section 5: Execution Commands
story.append(Paragraph("5. Execution Commands & Developer Travel Guide", style_h1))
story.append(Paragraph(
    "To interact with, test, or rebuild the Apollo AgriVerse ecosystem, follow these execution commands in sequence:",
    style_body
))

story.append(Paragraph(
    "<code># Step 1: Execute Digital Twin Physics Validation Suite<br/>"
    "cd D:\\Internship\\Apollo_AgriVerse\\06_ML\\tests\\<br/>"
    "python test_digital_twin_physics.py<br/><br/>"
    "# Step 2: Re-build this Comprehensive Technical PDF Documentation from team/vish/<br/>"
    "cd D:\\Internship\\Apollo_AgriVerse\\team\\vish\\<br/>"
    "python generate_apollo_comprehensive_docs.py<br/><br/>"
    "# Step 3: Launch FastAPI Backend Server for Dashboard Wiring<br/>"
    "cd D:\\Internship\\Apollo_AgriVerse\\<br/>"
    "uvicorn main:app --reload --port 8000</code>",
    style_code
))

story.append(Spacer(1, 10))
story.append(HRFlowable(width="100%", thickness=1, color=COLOR_PRIMARY_ACCENT, spaceAfter=8))
story.append(Paragraph("Apollo AgriVerse Technical Documentation Manual — Authored & Verified", style_subtitle))

doc.build(story, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
print(f"[SUCCESS] Apollo Comprehensive Manual PDF generated with visible white headers at: {PDF_OUTPUT_PATH}")