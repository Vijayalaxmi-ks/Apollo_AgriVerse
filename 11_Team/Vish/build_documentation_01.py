import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, PageBreak, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def build_pdf(filename="Apollo_AgriVerse_Substrate_Intelligence_Doc.pdf"):
    # Target PDF setup with generous margins for clarity
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        rightMargin=45,
        leftMargin=45,
        topMargin=45,
        bottomMargin=45
    )

    # Pure Agricultural Green Palette (No Blue Accents)
    PRIMARY = colors.HexColor("#1b4332")      # Deep Emerald Green
    SECONDARY = colors.HexColor("#2d6a4f")    # Medium Forest Green
    ACCENT_LIGHT = colors.HexColor("#52b788") # Soft Sage Accent
    DARK_TEXT = colors.HexColor("#1a1a1a")    # Off-Black Body Text
    LIGHT_BG = colors.HexColor("#f4f7f5")     # Soft Mint/Gray Card Background
    BORDER_GREEN = colors.HexColor("#b7e4c7") # Light Green Border

    styles = getSampleStyleSheet()

    # Custom Typography Styles with Increased Spacing
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=PRIMARY,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=SECONDARY,
        spaceAfter=14
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=8
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=SECONDARY,
        spaceBefore=10,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=14.5,
        textColor=DARK_TEXT,
        spaceAfter=8
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=14,
        spaceAfter=5
    )

    callout_style = ParagraphStyle(
        'Callout_Text',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9.5,
        leading=14,
        textColor=PRIMARY
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=DARK_TEXT
    )

    story = []

    # =========================================================================
    # PAGE 1: TITLE, MOTTO & BACKGROUND CONCEPTS
    # =========================================================================
    story.append(Paragraph("Apollo AgriVerse: Substrate Intelligence Architecture", title_style))
    story.append(Paragraph("Technical Documentation: Background, Present Intelligence Layer & Future Roadmap", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=2, color=PRIMARY, spaceAfter=15))

    # Motto Callout Box
    motto_text = "<b>System Motto:</b> <i>'Moving beyond passive physical simulation—transforming raw substrate telemetry into dynamic, closed-loop agricultural decisions.'</i>"
    motto_table = Table([[Paragraph(motto_text, callout_style)]], colWidths=[522])
    motto_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_GREEN),
        ('PADDING', (0, 0), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(motto_table)
    story.append(Spacer(1, 14))

    story.append(Paragraph("1. Conceptual Background & Evolution", h1_style))
    story.append(Paragraph(
        "<b>The Core Problem in Precision Farming:</b> In traditional smart agriculture, sensor telemetry and machine learning models operate as disconnected tools. "
        "A sensor reading might show that Volumetric Water Content (VWC) is at 22%, or soil Nitrogen is at 35 mg/kg. "
        "However, raw numbers lack biological context. A 22% moisture level could be perfectly safe during crop dormancy, but devastatingly low during the critical flowering stage.",
        body_style
    ))
    story.append(Paragraph(
        "<b>Why Physical Simulation Alone Is Not Enough:</b> In earlier phases, we constructed 4 core <i>Physics State Models</i> (Soil, Mulch, Hydrogel, and Crop Lifecycle). "
        "These models continuously simulate underlying physical processes—such as evapotranspiration, plastic UV degradation, water storage capacity, and thermal heat accumulation (GDD). "
        "While highly accurate, physical state models only answer the question: <i>'What is happening in the soil right now?'</i> "
        "They do not answer: <i>'Is this state healthy for the specific crop, and what intervention should be executed?'</i>",
        body_style
    ))
    story.append(Paragraph(
        "<b>The Solution: Closed-Loop Substrate Intelligence:</b> To bridge this gap, we introduced an autonomous decision-making layer. "
        "In this closed-loop paradigm, the <b>Soil Intelligence Layer</b> acts as the demand engine (detecting shortages and requesting water/nutrients), "
        "while the <b>Hydrogel</b> and <b>Mulch Intelligence Layers</b> act as responsive execution systems that adjust water release and thermal shielding accordingly.",
        body_style
    ))

    # Page Break to give Page 2 clean spacing for Today's Work
    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: PRESENT IMPLEMENTATION (TODAY'S WORK)
    # =========================================================================
    story.append(Paragraph("2. Present Implementation (Today's Work)", h1_style))
    story.append(Paragraph(
        "Today, we successfully designed and implemented two foundational modules that give Apollo AgriVerse its diagnostic and closed-loop intelligence abilities.",
        body_style
    ))
    story.append(Spacer(1, 6))

    story.append(Paragraph("A. Crop Requirement Profiles (<code>crop_requirements.json</code>)", h2_style))
    story.append(Paragraph(
        "• <b>What It Is:</b> A structured knowledge base defining stage-specific physiological targets for crops across their growth lifecycle.<br/>"
        "• <b>Why It Was Built:</b> Agricultural requirements are dynamic. Grapes require vastly different moisture, temperature, and NPK nutrient ratios during <i>Budbreak</i> versus <i>Flowering</i> or <i>Harvest</i>.<br/>"
        "• <b>How It Functions:</b> Maps numerical range profiles (minimum, optimal, and maximum) for moisture (%), soil temperature (°C), Nitrogen, Phosphorus, and Potassium (mg/kg) directly to phenological stages.",
        body_style
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph("B. Substrate Intelligence Engine (<code>substrate_intelligence_engine.py</code>)", h2_style))
    story.append(Paragraph(
        "• <b>What It Is:</b> A unified Python decision engine that houses rule-based diagnostic layers for <b>Soil</b>, <b>Hydrogel</b>, and <b>Mulch</b>.<br/>"
        "• <b>How The Layers Work Together:</b>",
        body_style
    ))

    story.append(Paragraph("1. <b>🌱 Soil Intelligence:</b> Evaluates live moisture, NPK, and temperature against active growth stage targets. Calculates exact shortages (e.g., <i>'Nitrogen shortage of 40 mg/kg'</i>) and emits high-priority demand triggers (e.g., <code>WATER_DEMAND_TRIGGER</code>).", bullet_style))
    story.append(Paragraph("2. <b>💧 Hydrogel Intelligence:</b> Intercepts <code>WATER_DEMAND_TRIGGER</code>. Checks current hydrogel storage capacity. If storage is >15%, it triggers active osmotic water release (e.g., 0.85 L/hr). If depleted, it flags an urgent drip irrigation refill alert.", bullet_style))
    story.append(Paragraph("3. <b>🍂 Mulch Intelligence:</b> Evaluates thermal heat stress and plastic UV degradation. If degradation >65%, it issues a replacement alert; if cooling effect drops below 2.0°C, it alerts the grower to reinforce the sheet.", bullet_style))
    
    story.append(Spacer(1, 10))

    # Implementation Breakdown Table
    table_data = [
        [
            Paragraph("Substrate Module", table_header_style),
            Paragraph("Inputs Received", table_header_style),
            Paragraph("Diagnostic Evaluation", table_header_style),
            Paragraph("Generated Action / Output", table_header_style)
        ],
        [
            Paragraph("<b>Soil Intelligence</b>", table_cell_style),
            Paragraph("Moisture, Temp, NPK, Crop Stage", table_cell_style),
            Paragraph("Compares state vs. stage thresholds in JSON profile", table_cell_style),
            Paragraph("Soil Health Index + Deficit Triggers (Water, Heat, Fertigation)", table_cell_style)
        ],
        [
            Paragraph("<b>Hydrogel Intelligence</b>", table_cell_style),
            Paragraph("Hydrogel Storage %, Water Demand Flag", table_cell_style),
            Paragraph("Checks polymer storage and release kinetics", table_cell_style),
            Paragraph("Active Osmotic Release Rate or Refill Required Alert", table_cell_style)
        ],
        [
            Paragraph("<b>Mulch Intelligence</b>", table_cell_style),
            Paragraph("UV Degradation %, Cooling °C, Heat Flag", table_cell_style),
            Paragraph("Evaluates physical film wear and thermal loss", table_cell_style),
            Paragraph("Functional Status or Sheet Reinforce/Replace Recommendation", table_cell_style)
        ]
    ]

    exec_table = Table(table_data, colWidths=[105, 115, 140, 162])
    exec_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_GREEN),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(exec_table)

    # Page Break for Clean Page 3 Architecture & Roadmap
    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: FUTURE ARCHITECTURE & ROADMAP (TOMORROW'S GOALS)
    # =========================================================================
    story.append(Paragraph("3. Future Architecture & Next Milestone (Tomorrow)", h1_style))
    story.append(Paragraph(
        "With the Substrate Intelligence Layer completed, our next architectural milestone is to unify all physical simulations, "
        "closed-loop intelligence layers, and predictive ML models into a persistent **Master Digital Twin Engine** supported by a time-series database.",
        body_style
    ))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Upcoming Architectural Components:", h2_style))
    
    story.append(Paragraph("1. <b>Master Digital Twin Engine (<code>digital_twin_engine.py</code>):</b> A central coordinator that executes state synchronization, intelligence evaluations, and yield forecasting models in a single unified step.", bullet_style))
    story.append(Paragraph("2. <b>Database Persistence Schema (<code>database.py</code>):</b> An SQLite time-series data store (`apollo_twin.db`) structured across 3 core tables:", bullet_style))
    
    story.append(Paragraph("• <code>twin_state_logs</code>: Logs physical metrics (soil moisture, temperature, NPK, hydrogel level, crop GDD) at every time step.<br/>"
                           "• <code>twin_events_log</code>: Captures every decision and intervention triggered by the intelligence layers.<br/>"
                           "• <code>ground_truth_outcomes</code>: Records actual harvest yields alongside predictions to enable future ML model retraining.", ParagraphStyle('SubBullet', parent=bullet_style, leftIndent=26)))

    story.append(Paragraph("3. <b>Multi-Day Time-Series Simulation:</b> Implementing a simulation loop that runs consecutive crop days (e.g., simulating 90 days in seconds) to generate rich historical farm data before backend API integration.", bullet_style))
    
    story.append(Spacer(1, 14))

    # Architecture Roadmap Summary Box
    summary_box_data = [
        [Paragraph("<b>Immediate System Roadmap</b>", ParagraphStyle('BoxTitle', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=10, textColor=PRIMARY))],
        [Paragraph("<b>Step 1 (Done):</b> Physical State Models (Soil, Mulch, Hydrogel, Crop GDD)<br/>"
                   "<b>Step 2 (Today):</b> Substrate Intelligence Engine & Crop Requirement Profiles<br/>"
                   "<b>Step 3 (Tomorrow):</b> Master Digital Twin Engine & Database Persistence (`apollo_twin.db`)<br/>"
                   "<b>Step 4 (Next Phase):</b> FastAPI Backend Endpoints (`05_Backend/`) & React Dashboard (`04_Frontend/`)", body_style)]
    ]
    summary_table = Table(summary_box_data, colWidths=[522])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), LIGHT_BG),
        ('BOX', (0, 0), (-1, -1), 1, PRIMARY),
        ('PADDING', (0, 0), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(summary_table)

    # Build PDF Document
    doc.build(story)
    print(f"Multi-page PDF documentation generated successfully: {filename}")

if __name__ == "__main__":
    build_pdf()