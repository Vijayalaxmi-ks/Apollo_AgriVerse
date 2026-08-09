import os
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def build_pdf(filename="Apollo_AgriVerse_Digital_Twin_State_Models.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    # Styling Palette
    PRIMARY = colors.HexColor("#1b4332")      # Deep Emerald Green
    SECONDARY = colors.HexColor("#2d6a4f")    # Medium Forest Green
    DARK_TEXT = colors.HexColor("#212529")    # Charcoal Dark Gray
    LIGHT_BG = colors.HexColor("#f8f9fa")     # Soft Background Gray
    ACCENT = colors.HexColor("#e9ecef")       # Table Border Gray

    styles = getSampleStyleSheet()

    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
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
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=PRIMARY,
        spaceBefore=14,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=DARK_TEXT,
        spaceAfter=8
    )

    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        parent=body_style,
        leftIndent=12,
        spaceAfter=4
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

    # Title & Subtitle Header
    story.append(Paragraph("Apollo AgriVerse: Digital Twin State Models", title_style))
    story.append(Paragraph("A Complete Conceptual Guide to Substrate Physics and Machine Learning Integration", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=PRIMARY, spaceAfter=12))

    # Section 1: Introduction
    story.append(Paragraph("1. Understanding State Models from Scratch", h1_style))
    story.append(Paragraph(
        "A <b>State Model</b> is a mathematical simulation module that calculates and tracks the live physical condition (the 'state') "
        "of a farm environment over time. Instead of relying on guesswork, it applies established principles of physics, chemistry, "
        " and plant biology to continuously update variables like soil moisture, nutrient depletion, and temperature levels.",
        body_style
    ))
    story.append(Paragraph(
        "<b>Real-World Analogy: The Video Game Health Bar</b><br/>"
        "Think of a character in a video game starting with 100 Health Points (HP). If the character takes 15 damage from extreme heat "
        "and recovers 20 HP from an item, the game calculates: <i>100 - 15 + 20 = 105 HP</i>. "
        "Our State Models do the exact same thing for farmland. Instead of tracking health points, they calculate real-world physical changes "
        "such as water evaporating under sunlight or nutrients absorbed by crops.",
        body_style
    ))

    # Section 2: Why State Models are Essential
    story.append(Paragraph("2. Why Machine Learning Alone is Not Enough", h1_style))
    story.append(Paragraph(
        "Machine Learning (ML) excels at predicting long-term outcomes (such as harvest yields), but relying solely on ML for daily field updates creates significant issues:",
        body_style
    ))
    story.append(Paragraph("• <b>Resource Heavy:</b> Retraining AI models every hour for minor environmental changes consumes unnecessary computing power.", bullet_style))
    story.append(Paragraph("• <b>Sensor Gaps:</b> Hardware sensors can fail, lose connectivity, or produce noisy, inaccurate readings.", bullet_style))
    story.append(Paragraph("• <b>Hallucination Risk:</b> Pure AI models lack physical constraints and can predict mathematically impossible soil or water states.", bullet_style))
    story.append(Paragraph(
        "<b>The Hybrid Solution:</b> State Models maintain continuous, physics-governed ground truth. They calculate precise intermediate state values 24/7 "
        "and feed clean, structured vectors into our ML models only when required.",
        body_style
    ))

    # Section 3: The 4 Core State Models
    story.append(Paragraph("3. The 4 Core State Engine Modules", h1_style))
    
    table_data = [
        [
            Paragraph("Module Name", table_header_style),
            Paragraph("Tracked Variables", table_header_style),
            Paragraph("Physical Role in System", table_header_style)
        ],
        [
            Paragraph("<b>Mulch Degradation Model</b>", table_cell_style),
            Paragraph("UV exposure, film thickness (μm), degradation rate (%)", table_cell_style),
            Paragraph("Calculates structural wear of plastic mulch and its decreasing capacity to cool underlying soil over time.", table_cell_style)
        ],
        [
            Paragraph("<b>Soil Hydrology & Substrate Model</b>", table_cell_style),
            Paragraph("Volumetric water content (%), soil temp (°C), N-P-K nutrient levels", table_cell_style),
            Paragraph("Simulates water loss from evapotranspiration, irrigation additions, and NPK depletion in the root zone.", table_cell_style)
        ],
        [
            Paragraph("<b>Intelligent Hydrogel Model</b>", table_cell_style),
            Paragraph("Water storage capacity (%), release rate (L/hr), polymer decay", table_cell_style),
            Paragraph("Tracks superabsorbent polymer swelling and triggers osmotic water release into dry soil during drought stress.", table_cell_style)
        ],
        [
            Paragraph("<b>Crop Lifecycle Engine</b>", table_cell_style),
            Paragraph("Growing Degree Days (GDD), canopy cover (%), growth stage", table_cell_style),
            Paragraph("Tracks heat accumulation to advance phenological stages (e.g., Budbreak → Flowering → Veraison → Harvest).", table_cell_style)
        ]
    ]

    model_table = Table(table_data, colWidths=[130, 150, 252])
    model_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, ACCENT),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(model_table)

    # Section 4: System Integration Workflow
    story.append(Paragraph("4. How State Models Fit Into the Digital Twin", h1_style))
    story.append(Paragraph(
        "<b>1. Telemetry Ingestion:</b> Microclimate data (Air Temp, Humidity, UV Index, Rainfall) enters the pipeline daily.<br/>"
        "<b>2. Substrate Physics Pipeline:</b> The 4 state modules update consecutively—Mulch calculates cooling, Hydrogel evaluates water release, Crop advances GDD, and Soil updates moisture and NPK.<br/>"
        "<b>3. State Synchronization:</b> The <i>DigitalTwinStateSynchronizer</i> bundles all outputs into a single unified state vector.<br/>"
        "<b>4. ML Inference:</b> Machine Learning models ingest the synchronized vector to predict hydrogel storage needs and final crop yield.",
        body_style
    ))

    # Section 5: Future Roadmap & Next Steps
    story.append(Paragraph("5. Immediate Roadmap & Next Steps", h1_style))
    story.append(Paragraph("• <b>Backend Microservice Integration (05_Backend/):</b> Wrap the synchronizer in a FastAPI endpoint (<code>POST /api/v1/twin/sync</code>) to handle external requests.", bullet_style))
    story.append(Paragraph("• <b>Executive Dashboard UI (04_Frontend/):</b> Build a React interface to visualize soil moisture, mulch degradation, and crop growth timelines.", bullet_style))
    story.append(Paragraph("• <b>System Architecture Documentation (01_Documentation/):</b> Formalize API payloads, schema contracts, and mathematical formulas.", bullet_style))

    # Build Document
    doc.build(story)
    print(f"PDF generated successfully: {filename}")

if __name__ == "__main__":
    build_pdf()