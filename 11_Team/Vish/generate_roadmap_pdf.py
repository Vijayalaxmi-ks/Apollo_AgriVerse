import sys
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
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


class NumberedCanvas(canvas.Canvas):
    """Canvas for adding dynamic page numbers and running footers."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#4A5568"))

        # Footer Line
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.75)
        self.line(54, 45, 612 - 54, 45)

        # Footer Text
        self.drawString(
            54,
            30,
            "Apollo AgriVerse — Technical Architecture & Implementation Manual",
        )
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(612 - 54, 30, page_str)
        self.restoreState()


def build_pdf():
    # Save directly inside 11_Team/Vish/
    script_dir = Path(__file__).resolve().parent
    pdf_path = script_dir / "Apollo_AgriVerse_Roadmap.pdf"

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=60,
    )

    styles = getSampleStyleSheet()

    # Custom Palette
    PRIMARY = colors.HexColor("#1B4D3E")  # Forest Green
    SECONDARY = colors.HexColor("#2C5282")  # Deep Blue
    DARK_TEXT = colors.HexColor("#2D3748")  # Charcoal Text
    LIGHT_BG = colors.HexColor("#F7FAFC")  # Soft Grey

    # Typography Styles
    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=PRIMARY,
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "DocSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10.5,
        leading=14,
        textColor=SECONDARY,
        spaceAfter=10,
    )
    h1_style = ParagraphStyle(
        "SectionH1",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12.5,
        leading=16,
        textColor=PRIMARY,
        spaceBefore=10,
        spaceAfter=5,
        keepWithNext=True,
    )
    h2_style = ParagraphStyle(
        "SectionH2",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=SECONDARY,
        spaceBefore=6,
        spaceAfter=3,
        keepWithNext=True,
    )
    body_style = ParagraphStyle(
        "BodyDark",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=DARK_TEXT,
        spaceAfter=4,
    )
    bullet_style = ParagraphStyle(
        "BulletText",
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=3,
    )
    table_text = ParagraphStyle(
        "TableText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=DARK_TEXT,
    )
    table_header = ParagraphStyle(
        "TableHeader",
        parent=table_text,
        fontName="Helvetica-Bold",
        textColor=colors.white,
    )

    story = []

    # -------------------------------------------------------------------------
    # PAGE 1: OVERVIEW & DATASET SCHEMAS
    # -------------------------------------------------------------------------
    story.append(
        Paragraph("Apollo AgriVerse: Execution Manual & Roadmap", title_style)
    )
    story.append(
        Paragraph(
            "Clear Plain-English Algorithm Guide & Code Implementation | Grape Cultivation Scope",
            subtitle_style,
        )
    )
    story.append(
        HRFlowable(
            width="100%",
            thickness=1.5,
            color=PRIMARY,
            spaceAfter=8,
            spaceBefore=0,
        )
    )

    # 1. Executive Overview & Scope Focus
    story.append(Paragraph("1. Executive Overview & Scope Focus", h1_style))
    story.append(
        Paragraph(
            "This document provides a fully clear, step-by-step walkthrough of how <b>Apollo AgriVerse</b> works. "
            "For our active phase, we focus specifically on <b>Grape Cultivation (<i>Vitis vinifera</i>)</b> across Maharashtra districts "
            "(Nashik, Sangli, Solapur, Pune, Ahmednagar, Satara, Osmanabad, Latur, Ratnagiri, Kolhapur).",
            body_style,
        )
    )
    story.append(
        Paragraph(
            "<b>Key Architecture Rule:</b> All data tables use a standard <code>crop_id</code> (e.g., <code>'crop_grape'</code>). "
            "This means the entire system is built so that adding new crops in the future requires zero database code rewrites.",
            body_style,
        )
    )

    story.append(Spacer(1, 4))

    # 2. KnowledgeBase Dataset Schemas
    story.append(
        Paragraph(
            "2. KnowledgeBase Dataset Schemas (5 Core CSVs)", h1_style
        )
    )
    story.append(
        Paragraph(
            "Our Suitability Engine reads 5 simple CSV files located inside <code>02_Datasets/KnowledgeBase/</code>:",
            body_style,
        )
    )

    csv_table_data = [
        [
            Paragraph("File Name", table_header),
            Paragraph("What It Stores (Simple Terms)", table_header),
            Paragraph("Key Field Columns", table_header),
            Paragraph("Status", table_header),
        ],
        [
            Paragraph("<b>01_crop_db.csv</b>", table_text),
            Paragraph(
                "Overall grape plant needs (temperature, pH range, salinity"
                " limits)",
                table_text,
            ),
            Paragraph(
                "crop_id, crop_name, min_temp_c, max_temp_c, ph_min, ph_max",
                table_text,
            ),
            Paragraph("Team Assigned", table_text),
        ],
        [
            Paragraph("<b>02_crop_variety_db.csv</b>", table_text),
            Paragraph(
                "Specific grape types (Thompson Seedless, Tas-A-Ganesh, Flame)"
                " & hydrogel dosage",
                table_text,
            ),
            Paragraph(
                "variety_id, crop_id, variety_name, hydrogel_dosage_kg_ha,"
                " heat_tolerance_index",
                table_text,
            ),
            Paragraph("Team Assigned", table_text),
        ],
        [
            Paragraph("<b>03_soil_db.csv</b>", table_text),
            Paragraph(
                "5 Maharashtra soil types (Black Cotton, Red Loam, Alluvial,"
                " Lateritic, Saline)",
                table_text,
            ),
            Paragraph(
                "soil_id, soil_name, texture_class, avg_ph, avg_ec_ds_m",
                table_text,
            ),
            Paragraph("Team Assigned", table_text),
        ],
        [
            Paragraph("<b>04_crop_soil_req.csv</b>", table_text),
            Paragraph(
                "Match scores between each grape variety and each soil type",
                table_text,
            ),
            Paragraph(
                "variety_id, soil_id, compatibility_score,"
                " yield_potential_factor",
                table_text,
            ),
            Paragraph("Team Assigned", table_text),
        ],
        [
            Paragraph("<b>05_region_climate_db.csv</b>", table_text),
            Paragraph(
                "District baseline climate data (Nashik, Sangli, Solapur"
                " weather & default soil)",
                table_text,
            ),
            Paragraph(
                "district, state, avg_annual_temp_c, avg_annual_rain_mm,"
                " dominant_soil_id",
                table_text,
            ),
            Paragraph(
                "<font color='#2F855A'><b>Completed</b></font>", table_text
            ),
        ],
    ]

    t_csv = Table(
        csv_table_data,
        colWidths=[1.3 * inch, 1.8 * inch, 2.8 * inch, 1.1 * inch],
    )
    t_csv.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), PRIMARY),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(t_csv)

    story.append(PageBreak())

    # -------------------------------------------------------------------------
    # PAGE 2: PLAIN-ENGLISH STEP-BY-STEP ALGORITHM EXPLANATION
    # -------------------------------------------------------------------------
    story.append(
        Paragraph(
            "3. Step-by-Step Plain-English Algorithm Walkthrough", h1_style
        )
    )
    story.append(
        Paragraph(
            "Here is exactly how the algorithm works in simple terms, step by"
            " step, when a farmer or user uses our app:",
            body_style,
        )
    )

    steps_plain = [
        (
            "Step 1: Get User Inputs (Location & Soil Details)",
            (
                "The user opens the app and selects their <b>District</b> (e.g.,"
                " <i>Nashik</i>), their <b>Soil Type</b> (e.g., <i>Black Cotton"
                " Soil</i>), and enters their <b>Farm Size</b> (e.g., <i>2.5"
                " Hectares</i>). The app sends this data to our Python backend."
            ),
        ),
        (
            "Step 2: Fetch Local Weather & Filter Grape Varieties",
            (
                "The system opens <code>05_region_climate_db.csv</code> to get"
                " average weather for Nashik. Next, it looks into"
                " <code>04_crop_soil_req.csv</code> and picks out all grape"
                " varieties that can grow in Black Cotton Soil (like Thompson"
                " Seedless, Tas-A-Ganesh, Flame Seedless)."
            ),
        ),
        (
            "Step 3: Calculate the Suitability Score (0 to 100)",
            (
                "For each candidate grape variety, the system calculates a"
                " single composite <b>Suitability Score</b> using 3 simple"
                " checks:<br/>• <b>Soil Match (50% weight):</b> How well does"
                " this grape variety like this soil type?<br/>• <b>Heat"
                " Tolerance (30% weight):</b> Can this grape variety handle"
                " local heat waves in Nashik?<br/>• <b>Yield Potential (20%"
                " weight):</b> What is the expected harvest yield"
                " multiplier?<br/><i>Formula: Final Score = (Soil Match × 0.50)"
                " + (Heat Score × 0.30) + (Yield Factor × 0.20)</i>"
            ),
        ),
        (
            "Step 4: Calculate Hydrogel Requirements for the Farm",
            (
                "Different grape varieties need different water retention"
                " support. The system reads the required hydrogel dosage per"
                " hectare from <code>02_crop_variety_db.csv</code> and calculates"
                " total hydrogel needed:<br/><i>Total Hydrogel (kg) = Farm Size"
                " (in Hectares) × Recommended Dosage (kg/ha)</i>"
            ),
        ),
        (
            "Step 5: Rank Results & Return Recommendation Payload",
            (
                "The system sorts the grape varieties from highest score to"
                " lowest score. The top ranked variety is recommended as the"
                " <b>Best Match</b>. It packages these results into a simple"
                " JSON response for the frontend."
            ),
        ),
        (
            "Step 6: Display on Dashboard & Feed Digital Twin",
            (
                "The React web dashboard displays the recommended grape varieties"
                " with visually easy cards, progress bars for scores, and"
                " exact hydrogel dosage instructions. This data also initializes"
                " the Digital Twin simulation model."
            ),
        ),
    ]

    for stitle, sdesc in steps_plain:
        story.append(Paragraph(f"<b>{stitle}</b>", h2_style))
        story.append(Paragraph(sdesc, body_style))
        story.append(Spacer(1, 2))

    story.append(PageBreak())

    # -------------------------------------------------------------------------
    # PAGE 3: EXPLICIT CODE IMPLEMENTATION & MODIFICATIONS MATRIX
    # -------------------------------------------------------------------------
    story.append(Paragraph("4. Concrete Python Code Implementation", h1_style))
    story.append(
        Paragraph(
            "Below is the exact Python implementation for the algorithm"
            " (<code>05_Backend/suitability_engine.py</code>). It is cleanly"
            " structured, commented, and easy for any team member to follow:",
            body_style,
        )
    )

    code_snippet = (
        "import pandas as pd\n\n"
        "def calculate_grape_suitability(district_name, soil_id,"
        " farm_size_ha):\n"
        "    # 1. Load KnowledgeBase CSVs\n"
        "    varieties_df ="
        " pd.read_csv('02_Datasets/KnowledgeBase/02_crop_variety_db.csv')\n"
        "    requirements_df ="
        " pd.read_csv('02_Datasets/KnowledgeBase/04_crop_soil_req.csv')\n"
        "    climate_df ="
        " pd.read_csv('02_Datasets/KnowledgeBase/05_region_climate_db.csv')\n\n"
        "    # 2. Filter varieties matching user's soil type\n"
        "    soil_matches = requirements_df[requirements_df['soil_id'] =="
        " soil_id]\n"
        "    results = []\n\n"
        "    # 3. Calculate scores for each candidate variety\n"
        "    for _, row in soil_matches.iterrows():\n"
        "        v_id = row['variety_id']\n"
        "        v_info = varieties_df[varieties_df['variety_id'] =="
        " v_id].iloc[0]\n\n"
        "        soil_score = row['compatibility_score']  # Range: 0 to 100\n"
        "        heat_score = v_info['heat_tolerance_index'] * 10  # Scale to"
        " 100\n"
        "        yield_score = row['yield_potential_factor'] * 100  # Scale to"
        " 100\n\n"
        "        # Weighted Formula\n"
        "        final_score = (soil_score * 0.50) + (heat_score * 0.30) +"
        " (yield_score * 0.20)\n"
        "        total_hydrogel_kg = farm_size_ha *"
        " v_info['hydrogel_dosage_kg_ha']\n\n"
        "        results.append({\n"
        "            'variety_name': v_info['variety_name'],\n"
        "            'suitability_score': round(final_score, 1),\n"
        "            'recommended_hydrogel_kg': round(total_hydrogel_kg, 1),\n"
        "            'yield_factor': row['yield_potential_factor']\n"
        "        })\n\n"
        "    # 4. Sort from highest score to lowest score\n"
        "    ranked_results = sorted(results, key=lambda x:"
        " x['suitability_score'], reverse=True)\n"
        "    return ranked_results\n"
    )

    story.append(
        Paragraph(
            (
                "<font face='Courier'"
                f" size='7.5'>{code_snippet.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace(' ', '&nbsp;').replace('\\n', '<br/>')}</font>"
            ),
            ParagraphStyle(
                "CodeBlockStyle",
                parent=body_style,
                backColor=LIGHT_BG,
                borderColor=colors.HexColor("#CBD5E0"),
                borderWidth=0.5,
                borderPadding=6,
                spaceAfter=8,
            ),
        )
    )

    story.append(
        Paragraph(
            "5. Concrete System Modifications Checklist",
            h1_style,
        )
    )

    mod_data = [
        [
            Paragraph("System Area", table_header),
            Paragraph("Exact File Modification Needed", table_header),
            Paragraph("Goal", table_header),
            Paragraph("Priority", table_header),
        ],
        [
            Paragraph("<b>Datasets</b>", table_text),
            Paragraph(
                "Fill and save CSVs 01 to 04 in"
                " <code>02_Datasets/KnowledgeBase/</code>",
                table_text,
            ),
            Paragraph(
                "Provides complete grape cultivar and soil data.", table_text
            ),
            Paragraph(
                "<font color='#C53030'><b>CRITICAL</b></font>", table_text
            ),
        ],
        [
            Paragraph("<b>Backend Logic</b>", table_text),
            Paragraph(
                "Create <code>05_Backend/suitability_engine.py</code> using"
                " code above",
                table_text,
            ),
            Paragraph("Executes suitability score calculations.", table_text),
            Paragraph(
                "<font color='#C53030'><b>CRITICAL</b></font>", table_text
            ),
        ],
        [
            Paragraph("<b>API Layer</b>", table_text),
            Paragraph(
                "Add FastAPI endpoint <code>POST /api/v1/recommend</code>",
                table_text,
            ),
            Paragraph(
                "Connects frontend input to Python backend logic.", table_text
            ),
            Paragraph("<font color='#DD6B20'><b>HIGH</b></font>", table_text),
        ],
        [
            Paragraph("<b>Frontend UI</b>", table_text),
            Paragraph(
                "Build District & Soil dropdown form in React", table_text
            ),
            Paragraph(
                "Lets farmers select inputs and view ranked grapes.", table_text
            ),
            Paragraph("MEDIUM", table_text),
        ],
    ]

    t_mod = Table(
        mod_data, colWidths=[1.0 * inch, 2.5 * inch, 2.5 * inch, 1.0 * inch]
    )
    t_mod.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), SECONDARY),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(t_mod)

    story.append(Spacer(1, 10))

    signoff_text = (
        "<b>Document Lead:</b> Vish | <b>Project:</b> Apollo AgriVerse<br/>"
        "<i>All team members must complete assigned database CSV files to"
        " enable engine testing.</i>"
    )
    story.append(
        Table(
            [[Paragraph(signoff_text, table_text)]],
            colWidths=[7.0 * inch],
            style=[
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
                ("BOX", (0, 0), (-1, -1), 1, PRIMARY),
                ("PADDING", (0, 0), (-1, -1), 6),
            ],
        )
    )

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Roadmap PDF successfully generated at: {pdf_path.resolve()}")


if __name__ == "__main__":
    build_pdf()