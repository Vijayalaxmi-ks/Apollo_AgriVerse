import os
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def create_manual():
  target_dir = Path("11_Team/Vish")
  target_dir.mkdir(parents=True, exist_ok=True)
  pdf_path = target_dir / "Suitability_Engine_Technical_Manual.pdf"

  doc = SimpleDocTemplate(
      str(pdf_path),
      pagesize=letter,
      rightMargin=40,
      leftMargin=40,
      topMargin=40,
      bottomMargin=40,
  )

  styles = getSampleStyleSheet()

  # Custom Styles
  title_style = ParagraphStyle(
      "DocTitle",
      parent=styles["Heading1"],
      fontName="Helvetica-Bold",
      fontSize=22,
      leading=26,
      textColor=colors.HexColor("#1b4332"),
      spaceAfter=6,
  )

  subtitle_style = ParagraphStyle(
      "DocSubtitle",
      parent=styles["Normal"],
      fontName="Helvetica-Bold",
      fontSize=12,
      leading=16,
      textColor=colors.HexColor("#2d6a4f"),
      spaceAfter=15,
  )

  h1_style = ParagraphStyle(
      "Heading1_Custom",
      parent=styles["Heading2"],
      fontName="Helvetica-Bold",
      fontSize=14,
      leading=18,
      textColor=colors.HexColor("#1b4332"),
      spaceBefore=14,
      spaceAfter=8,
      keepWithNext=True,
  )

  h2_style = ParagraphStyle(
      "Heading2_Custom",
      parent=styles["Heading3"],
      fontName="Helvetica-Bold",
      fontSize=11,
      leading=15,
      textColor=colors.HexColor("#2d6a4f"),
      spaceBefore=10,
      spaceAfter=4,
      keepWithNext=True,
  )

  body_style = ParagraphStyle(
      "Body_Custom",
      parent=styles["Normal"],
      fontName="Helvetica",
      fontSize=9.5,
      leading=13.5,
      textColor=colors.HexColor("#212529"),
      spaceAfter=8,
  )

  bullet_style = ParagraphStyle(
      "Bullet_Custom",
      parent=body_style,
      leftIndent=15,
      firstLineIndent=-10,
      spaceAfter=4,
  )

  code_style = ParagraphStyle(
      "Code_Style",
      parent=styles["Normal"],
      fontName="Courier",
      fontSize=8.5,
      leading=11,
      textColor=colors.HexColor("#111827"),
      backColor=colors.HexColor("#f3f4f6"),
      borderColor=colors.HexColor("#e5e7eb"),
      borderWidth=1,
      borderPadding=6,
      spaceAfter=8,
  )

  story = []

  # Header Block
  story.append(
      Paragraph(
          "Apollo_AgriVerse: Agronomic Suitability Engine", title_style
      )
  )
  story.append(
      Paragraph(
          "Technical Architecture, Digital Twin Synergy & Implementation"
          " Manual",
          subtitle_style,
      )
  )
  story.append(
      HRFlowable(
          width="100%",
          thickness=2,
          color=colors.HexColor("#1b4332"),
          spaceAfter=15,
      )
  )

  # Executive Summary
  story.append(Paragraph("1. Executive Summary & Vision", h1_style))
  story.append(
      Paragraph(
          "The Agronomic Suitability Engine forms the algorithmic backbone of"
          " the <b>Apollo_AgriVerse</b> platform. Its core function is to"
          " transform raw physical, chemical, and climatic parameters into"
          " deterministic suitability scores (0-100%) for crop selection and"
          " variety matching. By establishing a data-driven bridge between"
          " agricultural domain knowledge and real-time field data, the engine"
          " eliminates empirical guesswork and optimizes resource"
          " utilization.",
          body_style,
      )
  )

  # Digital Twin Context
  story.append(Paragraph("2. Strategic Integration with Digital Twin", h1_style))
  story.append(
      Paragraph(
          "In the context of Apollo_AgriVerse, a Digital Twin is not merely a 3D"
          " visual model; it is a live computational mirror of the farm's total"
          " ecosystem (Bhumi). The Suitability Engine empowers the Digital Twin"
          " across three operational layers:",
          body_style,
      )
  )

  twin_points = [
      (
          "State Initialization",
          (
              "When a farm is onboarded, the Digital Twin pulls soil composition"
              " (pH, EC, texture, NPK) and regional climate data. The Engine"
              " processes these attributes to set baseline health and yield"
              " expectations."
          ),
      ),
      (
          "Predictive Simulation & What-If Analysis",
          (
              "Farm operators can simulate climate anomalies (e.g., thermal"
              " stress or shifting monsoon patterns) or soil amendments."
              " The Engine re-evaluates suitability dynamically, allowing"
              " proactive mitigation before real-world planting."
          ),
      ),
      (
          "Dynamic Decision Engine",
          (
              "As real-time IoT sensors (soil moisture, temperature) and drone"
              " imagery stream data into the Digital Twin, the Engine updates"
              " crop stress metrics and dynamically recommends corrective actions"
              " or alternative crop varieties."
          ),
      ),
  ]

  for title, desc in twin_points:
      story.append(
          Paragraph(f"• <b>{title}:</b> {desc}", bullet_style)
      )
  story.append(Spacer(1, 8))

  # Knowledge Base & CSV Datasets
  story.append(Paragraph("3. Knowledge Base Architecture & Datasets", h1_style))
  story.append(
      Paragraph(
          "The engine relies on a structured multi-table Knowledge Base located"
          " under <code>02_Datasets/KnowledgeBase/Suitability engine"
          " csvs/</code>. The datasets are modularized into five core relational"
          " domains:",
          body_style,
      )
  )

  table_data = [
      [
          Paragraph("<b>Dataset File</b>", h2_style),
          Paragraph("<b>Primary Key</b>", h2_style),
          Paragraph("<b>Core Parameters & Role</b>", h2_style),
      ],
      [
          Paragraph("<code>01_crop_database.csv</code>", body_style),
          Paragraph("<code>crop_id</code>", body_style),
          Paragraph(
              "Master catalog of crops, baseline growth cycle length, water"
              " requirements, and economics.",
              body_style,
          ),
      ],
      [
          Paragraph("<code>02_crop_variety_database.csv</code>", body_style),
          Paragraph("<code>variety_id</code>", body_style),
          Paragraph(
              "Cultivar-specific traits (e.g., Thompson Seedless), yield"
              " potentials, thermal heat units, and resistance levels.",
              body_style,
          ),
      ],
      [
          Paragraph("<code>03_soil_database.csv</code>", body_style),
          Paragraph("<code>soil_id</code>", body_style),
          Paragraph(
              "Soil classifications, texture profiles, organic carbon,"
              " cation-exchange capacity, and pH tolerances.",
              body_style,
          ),
      ],
      [
          Paragraph("<code>04_crop_soil_requirements.csv</code>", body_style),
          Paragraph("<code>req_id</code>", body_style),
          Paragraph(
              "Relational mapping defining optimal, tolerable, and critical"
              " thresholds for soil-crop pairings.",
              body_style,
          ),
      ],
      [
          Paragraph("<code>05_region_climate_processed.csv</code>", body_style),
          Paragraph("<code>region_id</code>", body_style),
          Paragraph(
              "Historical climate vectors including seasonal temperature"
              " ranges, annual rainfall, humidity, and agro-climatic zone"
              " data.",
              body_style,
          ),
      ],
  ]

  t = Table(table_data, colWidths=[150, 90, 290])
  t.setStyle(
      TableStyle([
          ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e8f5e9")),
          ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#a3b18a")),
          ("VALIGN", (0, 0), (-1, -1), "TOP"),
          ("TOPPADDING", (0, 0), (-1, -1), 5),
          ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
      ])
  )
  story.append(t)
  story.append(Spacer(1, 10))

  # Knowledge Loader Service
  story.append(Paragraph("4. Backend Service: Knowledge Base Loader", h1_style))
  story.append(
      Paragraph(
          "The <code>KnowledgeBaseLoader</code> service"
          " (<code>05_Backend/services/knowledge_loader.py</code>) provides"
          " robust, cross-platform dataset ingestion. Key implementation"
          " features include:",
          body_style,
      )
  )

  loader_features = [
      (
          "Recursive Folder Resolution",
          (
              "Uses Python's <code>pathlib.Path.rglob()</code> to locate dataset"
              " CSV files dynamically across subdirectories (e.g.,"
              " <code>Connection_1</code> through <code>Connection_5</code>),"
              " ensuring resilient path resolution regardless of OS or"
              " execution root."
          ),
      ),
      (
          "Dataset Name Fallbacks",
          (
              "Implements a robust lookup mechanism matching multiple filename"
              " variants (e.g., <code>01_crop_database.csv</code> vs."
              " <code>01_crop_database_cleaned.csv</code>)."
          ),
      ),
      (
          "Data Normalization & Cleaning",
          (
              "Trims trailing whitespaces from string fields across all"
              " DataFrames using <code>include=['object', 'string']</code>"
              " (ensuring Pandas 4/3 string migration compatibility) and maps"
              " cultivar alias identifiers."
          ),
      ),
  ]

  for title, desc in loader_features:
    story.append(Paragraph(f"• <b>{title}:</b> {desc}", bullet_style))
  story.append(Spacer(1, 10))

  # Suitability Engine Algorithm
  story.append(
      Paragraph("5. Engine Design & Multi-Factor Scoring Algorithm", h1_style)
  )
  story.append(
      Paragraph(
          "The <code>AgronomicSuitabilityEngine</code> computes suitability by"
          " evaluating farm profiles against multi-parametric boundary conditions"
          " loaded by the Knowledge Base. The overall score is calculated as a"
          " weighted matrix:",
          body_style,
      )
  )

  story.append(
      Paragraph(
          "<b>Overall Score = (W_soil × Soil_Score) + (W_climate ×"
          " Climate_Score) + (W_water × Water_Score) - Penalties</b>",
          code_style,
      )
  )

  algo_steps = [
      (
          "Soil Compatibility Evaluation",
          (
              "Evaluates pH compatibility, electrical conductivity (salinity),"
              " texture match, and organic carbon content. Penalties are applied"
              " when values fall outside optimal thresholds into marginal or"
              " non-viable zones."
          ),
      ),
      (
          "Climatic Fit Analysis",
          (
              "Compares region-specific min/max/avg temperatures, thermal"
              " degree-days, and humidity against crop growth requirements."
          ),
      ),
      (
          "Water Requirement & Seasonality Match",
          (
              "Verifies whether natural seasonal rainfall paired with available"
              " farm irrigation capacity fulfills the crop's total seasonal water"
              " demand."
          ),
      ),
  ]

  for title, desc in algo_steps:
    story.append(Paragraph(f"• <b>{title}:</b> {desc}", bullet_style))
  story.append(Spacer(1, 10))

  # Testing & Validation
  story.append(Paragraph("6. Testing, Verification & Quality Assurance", h1_style))
  story.append(
      Paragraph(
          "The suitability module was verified via unit tests located in"
          " <code>05_Backend/tests/test_suitability_engine.py</code>. The test"
          " suite executes automated checks covering:",
          body_style,
      )
  )

  test_checks = [
      "Dataset structural integrity and successful loading of all 5 relational tables.",
      "Key uniqueness checks across soil and regional datasets.",
      "Evaluation pipeline integrity verifying JSON farm profile parsing.",
      "Mathematical boundaries validating that suitability output scores strictly range within 0.0% to 100.0%.",
  ]
  for chk in test_checks:
    story.append(Paragraph(f"• {chk}", bullet_style))

  story.append(Spacer(1, 6))
  story.append(
      Paragraph(
          "<b>Execution Command:</b>"
          " <code>python 05_Backend/tests/test_suitability_engine.py</code><br/>"
          "<b>Execution Status:</b> <code>ALL 3 TESTS PASSED (OK)</code>",
          code_style,
      )
  )

  # Next Steps & Roadmap
  story.append(Paragraph("7. Next Steps & Development Roadmap", h1_style))

  roadmap = [
      (
          "FastAPI REST Endpoints Integration",
          (
              "Expose <code>/api/v1/suitability/evaluate</code> endpoint to"
              " receive farm profile payloads from frontend interfaces."
          ),
      ),
      (
          "Digital Twin Visual Overlay",
          (
              "Connect engine suitability scores to the frontend 3D/GIS map layer"
              " to render color-coded heatmaps across farm zones."
          ),
      ),
      (
          "Real-Time Sensor Ingestion Pipeline",
          (
              "Connect live IoT telemetry (soil moisture/weather station) to"
              " auto-trigger dynamic suitability updates."
          ),
      ),
      (
          "LLM Decision Explanations",
          (
              "Feed engine output matrices into an LLM agent to generate plain-text"
              " agronomic advice and action plans for farmers."
          ),
      ),
  ]

  for title, desc in roadmap:
    story.append(Paragraph(f"• <b>{title}:</b> {desc}", bullet_style))

  doc.build(story)
  print(f"Manual PDF successfully generated at: {pdf_path.resolve()}")


if __name__ == "__main__":
  create_manual()