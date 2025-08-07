import json
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
from datetime import datetime

# Load data
with open("data.json", "r") as f:
    data = json.load(f)

FIELDS = [
    ("symbol", "Sym"),
    ("transaction_type", "Type"),
    ("lastTradedPrice", "LTP"),
    ("quantity", "Q"),
    ("price", "Pr"),
    ("unreal_gain", "Unr"),
    ("earnings_per_share", "E"),
    ("book_value_per_share", "B"),
    ("return_on_asset", "ROA"),
    ("return_on_equity", "ROE"),
    ("market_cap", "MCap"),
    ("price_loans", "P/L"),
    ("price_earnings", "P/E"),
    ("price_book", "P/B"),
    ("transactionId", "Trans"),
    ("total_investments", "Total In"),
    ("current_value", "Curr"),
    ("unrealProfitPer", "Unreal %"),
    ("amountReceivable", "Amount"),
    ("sectorName", "Sector"),
    ("securityName", "Security"),
    ("dailyChange", "Daily"),
    ("perChange", "Perce"),
    ("interest_income", "Interest"),
    ("net_profit", "Net"),
    ("cash_equivalents", "Cash E"),
]

# Prepare table data
table_data = [[label for _, label in FIELDS]]

for item in data:
    base_row = []
    for key, _ in FIELDS:
        val = item.get(key, "")
        if isinstance(val, float):
            val = f"{val:.2f}"
        base_row.append(val)

    if "user_transactions" in item and item["user_transactions"]:
        for sub in item["user_transactions"]:
            sub_row = [''] * len(FIELDS)
            sub_row[FIELDS.index(("symbol", "Sym"))] = sub.get("user_name", "")
            for i, (key, _) in enumerate(FIELDS):
                if key in sub:
                    val = sub[key]
                    if isinstance(val, float):
                        val = f"{val:.2f}"
                    sub_row[i] = val
            table_data.append(sub_row)
    else:
        table_data.append(base_row)

# Font and layout config
font_size = 5.5
padding = 2
max_lengths = [max(len(str(row[i])) for row in table_data) for i in range(len(FIELDS))]
raw_col_widths = [(font_size * 0.55) * l + padding for l in max_lengths]

# Scale to A4 portrait width
a4_width = A4[0] - 40
scale_factor = a4_width / sum(raw_col_widths)
col_widths = [w * scale_factor for w in raw_col_widths]

# PDF filename
filename = f"portfolio_A4portrait_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
pdf = SimpleDocTemplate(
    filename,
    pagesize=A4,
    leftMargin=20,
    rightMargin=20,
    topMargin=20,
    bottomMargin=20
)

# Create table
table = Table(table_data, colWidths=col_widths, repeatRows=1)
table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
    ("FONTSIZE", (0, 0), (-1, -1), font_size),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ("TOPPADDING", (0, 0), (-1, -1), 2),
    ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
]))

# Build PDF
pdf.build([table])
print(f"✅ PDF saved as {filename}")
