
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
      if (col.key === 'symbol' && Array.isArray(row.user_transactions) && row.user_transactions.length > 0) {
        // symbol column + user names width combined
        maxWidth = Math.max(
          maxWidth,
          doc.widthOfString(row.symbol || '', { fontSize }),
          ...row.user_transactions.map(t => doc.widthOfString('↳ ' + t.user_name, { fontSize }))
        );
      } else {
        const mainVal = formatValue(row[col.key]);
        maxWidth = Math.max(maxWidth, doc.widthOfString(mainVal, { fontSize }));
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

  // Draw header
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
    // Draw main row
    y = drawRow(doc, row, columns, columnWidths, startX, y);

    // If multiple transactions, draw their user names in symbol column rows only
    if (Array.isArray(row.user_transactions) && row.user_transactions.length > 0) {
      for (let userRow of row.user_transactions) {
        y = drawNestedUserRow(doc, userRow, columns, columnWidths, startX, y);
      }
    }

    // Page break if needed
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

function drawRow(doc, row, columns, columnWidths, startX, y) {
  let x = startX;
  for (let i = 0; i < columns.length; i++) {
    // Normal row, show data for all columns
    const val = formatValue(row[columns[i].key]);
    doc.rect(x, y, columnWidths[i], rowHeight).stroke();
    doc.text(val, x + padding, y + 4, {
      width: columnWidths[i] - padding * 2,
      ellipsis: true,
    });
    x += columnWidths[i];
  }
  return y + rowHeight;
}

function drawNestedUserRow(doc, userRow, columns, columnWidths, startX, y) {
  let x = startX;

  for (let i = 0; i < columns.length; i++) {
    let text = '';
    if (i === 0) {
      // Symbol column: show user name with arrow
      text = '↳ ' + (userRow.user_name || '');
    }
    doc.rect(x, y, columnWidths[i], rowHeight).stroke();
    doc.text(text, x + padding, y + 4, {
      width: columnWidths[i] - padding * 2,
      ellipsis: true,
    });
    x += columnWidths[i];
  }

  return y + rowHeight;
}

// Main PDF generation function
function generatePDF(data, outputPath = 'v2.pdf') {
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

// Load data and run
const jsonData = require('./data.json');
generatePDF(jsonData);
