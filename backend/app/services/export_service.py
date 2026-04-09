"""
Export Service: Generate CSV and PDF reports of decisions and action items.
"""
import csv
import io
import logging
from typing import List, Any

logger = logging.getLogger(__name__)


def generate_csv(decisions: List[Any], action_items: List[Any]) -> bytes:
    """Generate a CSV file with decisions and action items."""
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["=== DECISIONS ==="])
    writer.writerow(["#", "Decision", "Context", "Speaker", "Timestamp", "Confidence"])
    for i, d in enumerate(decisions, 1):
        writer.writerow([
            i,
            d.content,
            d.context or "",
            d.speaker or "",
            d.timestamp or "",
            f"{d.confidence:.0%}",
        ])

    writer.writerow([])
    writer.writerow(["=== ACTION ITEMS ==="])
    writer.writerow(["#", "Task", "Assigned To", "Due Date", "Priority", "Status", "Speaker", "Timestamp", "Confidence"])
    for i, a in enumerate(action_items, 1):
        writer.writerow([
            i,
            a.what,
            a.who or "",
            a.due_date or "",
            a.priority,
            a.status,
            a.speaker or "",
            a.timestamp or "",
            f"{a.confidence:.0%}",
        ])

    return output.getvalue().encode("utf-8-sig")


def generate_pdf(
    meeting_title: str,
    decisions: List[Any],
    action_items: List[Any],
) -> bytes:
    """Generate a PDF report using ReportLab."""
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import cm
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.enums import TA_LEFT, TA_CENTER

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm,
                                topMargin=2*cm, bottomMargin=2*cm)
        styles = getSampleStyleSheet()
        story = []

        # Title
        title_style = ParagraphStyle("title", parent=styles["Title"], fontSize=20, spaceAfter=6)
        story.append(Paragraph(f"Meeting Report: {meeting_title}", title_style))
        story.append(Spacer(1, 0.5*cm))

        # Decisions
        story.append(Paragraph("Decisions", styles["Heading1"]))
        story.append(Spacer(1, 0.3*cm))
        if decisions:
            data = [["#", "Decision", "Speaker", "Time", "Confidence"]]
            for i, d in enumerate(decisions, 1):
                data.append([str(i), d.content[:80], d.speaker or "-", d.timestamp or "-", f"{d.confidence:.0%}"])
            t = Table(data, colWidths=[1*cm, 9*cm, 3*cm, 2*cm, 2.5*cm])
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]))
            story.append(t)
        else:
            story.append(Paragraph("No decisions extracted.", styles["Normal"]))

        story.append(Spacer(1, 0.7*cm))

        # Action Items
        story.append(Paragraph("Action Items", styles["Heading1"]))
        story.append(Spacer(1, 0.3*cm))
        if action_items:
            data = [["#", "Task", "Assigned To", "Due Date", "Priority", "Status"]]
            for i, a in enumerate(action_items, 1):
                data.append([str(i), a.what[:60], a.who or "-", a.due_date or "-", a.priority, a.status])
            t = Table(data, colWidths=[1*cm, 7*cm, 3*cm, 2.5*cm, 2*cm, 2*cm])
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]))
            story.append(t)
        else:
            story.append(Paragraph("No action items extracted.", styles["Normal"]))

        doc.build(story)
        return buffer.getvalue()

    except Exception as e:
        logger.error(f"PDF generation failed: {e}")
        raise
