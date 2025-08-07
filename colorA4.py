
import json
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
from reportlab.platypus import PageTemplate, Frame
from reportlab.lib.units import inch
from datetime import datetime

def draw_background(canvas, doc):
    canvas.saveState()
    canvas.setFillColorRGB(28/255, 29/255, 34/255)  # p1 color
    canvas.rect(0, 0, doc.pagesize[0], doc.pagesize[1], fill=1)
    canvas.restoreState()

# Load data
with open("data.json", "r") as f:
    data = json.load(f)

# Define fields and headers
FIELDS = [
    ("symbol", "Sym"),
    ("transaction_type", "Type"),
    ("lastTradedPrice", "LTP"),
    ("quantity", "Q"),
    ("price", "Pr"),
    ("unreal_gain", "Unr"),
    ("earnings_per_share", "Eps"),
    ("book_value_per_share", "B/v"),
    ("return_on_asset", "ROA"),
    ("return_on_equity", "ROE"),
    ("market_cap", "MCap"),
    ("price_loans", "P/L"),
    ("price_earnings", "P/E"),
    ("price_book", "P/B"),
    ("total_investments", "Total In"),
    ("current_value", "Curr"),
    ("unrealProfitPer", "Unreal %"),
    ("amountReceivable", "Amount"),
    ("dailyChange", "Daily C"),
    ("perChange", "%C"),
    ("interest_income", "Interest"),
    ("net_profit", "Net/p"),
    ("cash_equivalents", "Cash/E"),
]

# Tailwind-style colors (converted to ReportLab RGB tuples)
S1 = colors.Color(0.14, 0.14, 0.20)  # ~ hsl(240, 9%, 19%)
S2 = colors.Color(0.25, 0.25, 0.34)  # ~ hsl(240, 10%, 28%)
A1 = S2  # Sub-transactions use same as S2

# Header row
table_data = [[label for _, label in FIELDS]]
row_styles = []

row_index = 1  # Header is row 0

for i, item in enumerate(data):
    base_row = []
    for key, _ in FIELDS:
        val = item.get(key, "")
        if isinstance(val, float):
            val = f"{val:.2f}"
        base_row.append(val)

    # Alternate background for base rows
    base_bg = S1 if i % 2 == 0 else S2
    table_data.append(base_row)
    row_styles.append(("BACKGROUND", (0, row_index), (-1, row_index), base_bg))
    # color = (245/255, 245/255, 245/255) if row_index % 2 == 1 else (235/255, 235/255, 235/255)
    # row_styles.append(("BACKGROUND", (0, row_index), (-1, row_index), color))
    row_index += 1

    # Sub-transaction rows
    if "user_transactions" in item and item["user_transactions"]:
        for sub in item["user_transactions"]:
            sub_row = [''] * len(FIELDS)
            sub_row[FIELDS.index(("symbol", "Sym"))] = sub.get("user_name", "")
            for j, (key, _) in enumerate(FIELDS):
                if key in sub:
                    val = sub[key]
                    if isinstance(val, float):
                        val = f"{val:.2f}"
                    sub_row[j] = val
            table_data.append(sub_row)
            row_styles.append(("BACKGROUND", (0, row_index), (-1, row_index), A1))
            # sub_color = (253/255, 253/255, 240/255) if row_index % 2 == 1 else (248/255, 248/255, 230/255)
            # row_styles.append(("BACKGROUND", (0, row_index), (-1, row_index), sub_color))
            row_index += 1

# Font + padding
font_size = 5.5
padding = 2

# Dynamic column widths
max_lengths = [max(len(str(row[i])) for row in table_data) for i in range(len(FIELDS))]
raw_col_widths = [(font_size * 0.55) * l + padding for l in max_lengths]

# Scale to fit A4 width
a4_width = A4[0] - 40
scale = a4_width / sum(raw_col_widths)
col_widths = [w * scale for w in raw_col_widths]

# Output PDF
filename = f"darkcolored_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
pdf = SimpleDocTemplate(filename, pagesize=A4, leftMargin=20, rightMargin=20, topMargin=20, bottomMargin=20)

pdf = SimpleDocTemplate(
    filename,
    pagesize=A4,
    leftMargin=20,
    rightMargin=20,
    topMargin=20,
    bottomMargin=20
)

frame = Frame(pdf.leftMargin, pdf.bottomMargin, pdf.width, pdf.height, id='normal')
template = PageTemplate(id='colored', frames=frame, onPage=draw_background)
pdf.addPageTemplates([template])


table = Table(table_data, colWidths=col_widths, repeatRows=1)

base_style = [
    ("BACKGROUND", (0, 0), (-1, 0), (28/255, 29/255, 34/255)),  # header background
    ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),          # header text
    ("TEXTCOLOR", (0, 1), (-1, -1), colors.white),              # body text
    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
    ("FONTSIZE", (0, 0), (-1, -1), font_size),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ("TOPPADDING", (0, 0), (-1, -1), 2),
    ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
]

# base_style = [
#     ("BACKGROUND", (0, 0), (-1, 0), (230/255, 233/255, 242/255)),  # Header
#     ("TEXTCOLOR", (0, 0), (-1, 0), (33/255, 33/255, 33/255)),      # Header text
#     ("TEXTCOLOR", (0, 1), (-1, -1), (33/255, 33/255, 33/255)),     # Body text
#     ("ALIGN", (0, 0), (-1, -1), "CENTER"),
#     ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
#     ("FONTSIZE", (0, 0), (-1, -1), font_size),
#     ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
#     ("TOPPADDING", (0, 0), (-1, -1), 2),
#     ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
# ]

table.setStyle(TableStyle(base_style + row_styles))

# Build
pdf.build([table])
print(f"✅ PDF saved as {filename}")

