const fs = require('fs');
const PDFDocument = require('pdfkit');

const fontSize = 9;
const rowHeight = fontSize + 8;
const padding = 4;

const A4_WIDTH = 842; // landscape A4 width in points
const A4_HEIGHT = 595; // landscape A4 height in points
const margin = 40;
const usableWidth = A4_WIDTH - margin * 2;

const columnsToPrint = [
  { key: 'symbol', label: 'Symbol' },
  { key: 'transaction_type', label: 'Type' },
  { key: 'lastTradedPrice', label: 'LTP' },
  { key: 'quantity', label: 'Qty' },
  { key: 'price', label: 'Price' },
  { key: 'unreal_gain', label: 'Unreal Gain' },
  { key: 'earnings_per_share', label: 'EPS' },
  { key: 'book_value_per_share', label: 'BVPS' },
  { key: 'return_on_asset', label: 'ROA' },
  { key: 'return_on_equity', label: 'ROE' },
  { key: 'market_cap', label: 'Market Cap' },
  { key: 'price_loans', label: 'PL' },
  { key: 'price_book', label: 'PB' },
  { key: 'transactionId', label: 'Transaction ID' },
  { key: 'total_investments', label: 'Total Investments' },
  { key: 'current_value', label: 'Current Value' },
  { key: 'unrealProfitPer', label: 'Unreal Gain (%)' },
  { key: 'amountReceivable', label: 'Amount Receivable' },
  { key: 'sectorName', label: 'Sector' },
  { key: 'securityName', label: 'Security Name' },
  { key: 'dailyChange', label: 'Daily Change' },
  { key: 'perChange', label: 'Percent Change' },
  { key: 'price_earnings', label: 'PE' },
  { key: 'interest_income', label: 'Interest Income' },
  { key: 'net_profit', label: 'Net Profit' },
  { key: 'cash_equivalents', label: 'Cash Equivalents' },
];

function formatValue(val) {
  if (typeof val === 'number') return val.toFixed(2);
  if (!isNaN(val) && val !== null && val !== '') {
    const num = parseFloat(val);
    return isNaN(num) ? String(val) : num.toFixed(2);
  }
  return String(val ?? '');
}

function calculateColumnWidths(doc, data, columns) {
  const widths = [];

  for (let col of columns) {
    let maxWidth = doc.widthOfString(col.label, { fontSize });

    for (let row of data) {
      if (col.key === 'symbol' && Array.isArray(row.user_transactions)) {
        maxWidth = Math.max(
          maxWidth,
          doc.widthOfString(row.symbol || '', { fontSize }),
          ...row.user_transactions.map(t =>
            doc.widthOfString('↳ ' + t.user_name, { fontSize })
          )
        );
      } else {
        const val = formatValue(row[col.key]);
        maxWidth = Math.max(maxWidth, doc.widthOfString(val, { fontSize }));
      }
    }

    widths.push(maxWidth + padding * 2);
  }

  // Scale widths to fit within A4 landscape width
  const total = widths.reduce((a, b) => a + b, 0);
  const scale = usableWidth / total;
  return widths.map(w => w * scale);
}

function drawTable(doc, data, columns, columnWidths) {
  let xStart = margin;
  let y = margin;
  const pageHeight = A4_HEIGHT - margin;

  drawHeader(doc, columns, columnWidths, xStart, y);
  y += rowHeight;

  doc.font('Helvetica').fontSize(fontSize);

  for (let row of data) {
    y = drawRow(doc, row, columns, columnWidths, xStart, y);

    if (row.user_transactions?.length) {
      for (let userRow of row.user_transactions) {
        y = drawNestedRow(doc, userRow, columns, columnWidths, xStart, y);
      }
    }

    if (y + rowHeight > pageHeight) {
      doc.addPage();
      y = margin;
      drawHeader(doc, columns, columnWidths, xStart, y);
      y += rowHeight;
    }
  }
}

function drawHeader(doc, columns, widths, x, y) {
  doc.font('Helvetica-Bold').fontSize(fontSize);
  for (let i = 0; i < columns.length; i++) {
    doc.rect(x, y, widths[i], rowHeight).stroke();
    doc.text(columns[i].label, x + padding, y + 4, {
      width: widths[i] - padding * 2,
      ellipsis: true,
    });
    x += widths[i];
  }
}

function drawRow(doc, row, columns, widths, x, y) {
  for (let i = 0; i < columns.length; i++) {
    const val = formatValue(row[columns[i].key]);
    doc.rect(x, y, widths[i], rowHeight).stroke();
    doc.text(val, x + padding, y + 4, {
      width: widths[i] - padding * 2,
      ellipsis: true,
    });
    x += widths[i];
  }
  return y + rowHeight;
}

function drawNestedRow(doc, userRow, columns, widths, x, y) {
  for (let i = 0; i < columns.length; i++) {
    let val = '';
    if (i === 0) {
      val = '↳ ' + (userRow.user_name || '');
    } else {
      val = formatValue(userRow[columns[i].key]);
    }

    doc.rect(x, y, widths[i], rowHeight).stroke();
    doc.text(val, x + padding, y + 4, {
      width: widths[i] - padding * 2,
      ellipsis: true,
    });

    x += widths[i];
  }
  return y + rowHeight;
}

function generatePDF(data, outputPath = 'A4.pdf') {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margin,
  });

  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  const columnWidths = calculateColumnWidths(doc, data, columnsToPrint);
  drawTable(doc, data, columnsToPrint, columnWidths);

  doc.end();

  stream.on('finish', () => {
    console.log(`✅ PDF generated: ${outputPath}`);
  });
}

// Load your data.json
const jsonData = require('./data.json');
generatePDF(jsonData);
