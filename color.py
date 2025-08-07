import json
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from datetime import datetime

# Load your data
with open("data.json", "r") as f:
    data = json.load(f)

# Fields to display (short keys for better fitting)
FIELDS = [
    ("symbol", "Sym"),
    ("transaction_type", "Type"),
    ("lastTradedPrice", "LTP"),
    ("quantity", "Q"),
    ("price", "Pr"),
    ("unreal_gain", "Unr"),
    ("earnings_per_share", "E"),
    ("book_value_per_share", "B"),
    ("return_on_asset", "R"),
    ("return_on_equity", "R"),
    ("market_cap", "Mark"),
    ("price_loans", "P/L"),
    ("price_earnings", "P/E"),
    ("price_book", "P/B"),
    ("transactionId", "Trans"),
    ("total_investments", "Total In"),
    ("current_value", "Curr"),
    ("unrealProfitPer", "Unreal %"),
    ("amountReceivable", "Amount"),
    ("sectorName", "Sector"),
    ("securityName", "Security Name"),
    ("dailyChange", "Daily"),
    ("perChange", "Perce"),
    ("interest_income", "Interest"),
    ("net_profit", "Net"),
    ("cash_equivalents", "Cash E"),
]

# Build table data
table_data = [[label for _, label in FIELDS]]  # header row

for item in data:
    row_span = len(item.get("user_transactions", [])) or 1
    base_row = []
    for key, _ in FIELDS:
        val = item.get(key, "")
        if isinstance(val, float):
            val = f"{val:.2f}"
        base_row.append(val)

    if "user_transactions" in item and item["user_transactions"]:
        for idx, sub in enumerate(item["user_transactions"]):
            sub_row = [''] * len(FIELDS)
            sub_label = sub.get("user_name", "")
            sub_row[FIELDS.index(("symbol", "Sym"))] = sub_label  # replace symbol with user name

            for i, (key, _) in enumerate(FIELDS):
                if key in sub:
                    val = sub[key]
                    if isinstance(val, float):
                        val = f"{val:.2f}"
                    sub_row[i] = val
            table_data.append(sub_row)
    else:
        table_data.append(base_row)

# Calculate column widths dynamically
font_size = 7
padding = 5
col_widths = []
for col_idx in range(len(FIELDS)):
    max_len = max(len(str(row[col_idx])) for row in table_data)
    col_widths.append((font_size * 0.6) * max_len + padding)

# Set custom width and height
total_width = sum(col_widths)
page_height = 210 * mm
page_size = (total_width, page_height)

# Create PDF
filename = f"portfolio_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
pdf = SimpleDocTemplate(
    filename,
    pagesize=page_size,
    rightMargin=10,
    leftMargin=10,
    topMargin=10,
    bottomMargin=10
)

# Table
table = Table(table_data, colWidths=col_widths, repeatRows=1)

# Styling
table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
    ("FONTSIZE", (0, 0), (-1, -1), font_size),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ("TOPPADDING", (0, 0), (-1, -1), 4),
    ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
]))

pdf.build([table])

print(f"✅ PDF successfully saved as {filename}")

