
const fs = require('fs');
const PDFDocument = require('pdfkit');

const fontSize = 10;
const rowHeight = fontSize + 8;
const padding = 6;

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
  { key: 'user_name', label: 'User' },
];

// Format numbers
function formatValue(val) {
  if (typeof val === 'number') {
    return val.toFixed(2);
  } else if (!isNaN(val) && val !== null && val !== '') {
    const num = parseFloat(val);
    return isNaN(num) ? String(val) : num.toFixed(2);
  }
  return String(val ?? '');
}

// Calculate column widths
function calculateColumnWidths(doc, data, columns) {
  const widths = [];

  for (let col of columns) {
    let maxWidth = doc.widthOfString(col.label, { fontSize });

    for (let row of data) {
      const mainVal = formatValue(row[col.key]);
      maxWidth = Math.max(maxWidth, doc.widthOfString(mainVal, { fontSize }));

      if (Array.isArray(row.user_transactions)) {
        row.user_transactions.forEach((child) => {
          const val = formatValue(child[col.key] ?? '');
          const valWidth = doc.widthOfString(val, { fontSize });

          if (col.key === 'user_name') {
            const userName = '↳ ' + (child.user_name || '');
            const nameWidth = doc.widthOfString(userName, { fontSize });
            maxWidth = Math.max(maxWidth, nameWidth);
          } else {
            maxWidth = Math.max(maxWidth, valWidth);
          }
        });
      }
    }

    widths.push(maxWidth + padding * 2);
  }

  return widths;
}

// Draw the table with borders
function drawTable(doc, data, columns, columnWidths) {
  let startX = doc.page.margins.left;
  let y = doc.page.margins.top;

  const pageHeight = doc.page.height - doc.page.margins.bottom;

  // Draw header background
  doc.fontSize(fontSize).font('Helvetica-Bold');
  let x = startX;
  for (let i = 0; i < columns.length; i++) {
    doc.rect(x, y, columnWidths[i], rowHeight).stroke();
    doc.text(columns[i].label, x + padding, y + 4, {
      width: columnWidths[i] - padding * 2,
      ellipsis: true,
    });
    x += columnWidths[i];
  }

  y += rowHeight;

  // Draw rows
  doc.font('Helvetica').fontSize(fontSize);
  for (let row of data) {
    y = drawRow(doc, row, columns, columnWidths, startX, y);

    if (Array.isArray(row.user_transactions)) {
      for (let userRow of row.user_transactions) {
        y = drawRow(doc, userRow, columns, columnWidths, startX, y, true);
      }
    }

    // Check if we need to start a new page
    if (y + rowHeight > pageHeight) {
      doc.addPage();
      y = doc.page.margins.top;

      // Redraw header on new page
      let x = startX;
      doc.font('Helvetica-Bold');
      for (let i = 0; i < columns.length; i++) {
        doc.rect(x, y, columnWidths[i], rowHeight).stroke();
        doc.text(columns[i].label, x + padding, y + 4, {
          width: columnWidths[i] - padding * 2,
          ellipsis: true,
        });
        x += columnWidths[i];
      }

      y += rowHeight;
      doc.font('Helvetica');
    }
  }
}

function drawRow(doc, row, columns, columnWidths, startX, y, isNested = false) {
  let x = startX;

  for (let i = 0; i < columns.length; i++) {
    let val = formatValue(row[columns[i].key]);

    if (columns[i].key === 'user_name' && isNested) {
      val = '↳ ' + (row.user_name || '');
    }

    doc.rect(x, y, columnWidths[i], rowHeight).stroke();
    doc.text(val, x + padding, y + 4, {
      width: columnWidths[i] - padding * 2,
      ellipsis: true,
    });

    x += columnWidths[i];
  }

  return y + rowHeight;
}

// Generate PDF
function generatePDF(data, outputPath = 'v1.pdf') {
  const doc = new PDFDocument({
    size: 'A3',
    layout: 'landscape',
    margin: 40,
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

// ==== RUN ====
const jsonData = require('./data.json');
generatePDF(jsonData);

