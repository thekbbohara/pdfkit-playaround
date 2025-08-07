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

  // Additional keys from your data
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

// Format values with 2 decimals if number or numeric string
function formatValue(val) {
  if (typeof val === 'number') {
    return val.toFixed(2);
  } else if (!isNaN(val) && val !== null && val !== '') {
    const num = parseFloat(val);
    return isNaN(num) ? String(val) : num.toFixed(2);
  }
  return String(val ?? '');
}

// Calculate column widths dynamically based on content length and font size
function calculateColumnWidths(doc, data, columns) {
  const widths = [];

  for (let col of columns) {
    let maxWidth = doc.widthOfString(col.label, { fontSize });

    for (let row of data) {
      if (col.key === 'symbol' && Array.isArray(row.user_transactions) && row.user_transactions.length > 0) {
        // For symbol column consider main symbol and all nested user names width
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

// Draw the whole table with headers, rows, nested user transactions, and borders
function drawTable(doc, data, columns, columnWidths) {
  let startX = doc.page.margins.left;
  let y = doc.page.margins.top;

  const pageHeight = doc.page.height - doc.page.margins.bottom;

  // Draw header row
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
  doc.font('Helvetica').fontSize(fontSize);

  // Draw data rows
  for (let row of data) {
    y = drawRow(doc, row, columns, columnWidths, startX, y);

    if (Array.isArray(row.user_transactions) && row.user_transactions.length > 0) {
      for (let userRow of row.user_transactions) {
        y = drawNestedUserRow(doc, userRow, columns, columnWidths, startX, y);
      }
    }

    // Handle page break
    if (y + rowHeight > pageHeight) {
      doc.addPage();
      y = doc.page.margins.top;

      // Redraw header on new page
      x = startX;
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
      doc.font('Helvetica').fontSize(fontSize);
    }
  }
}

// Draw a normal row with all columns populated
function drawRow(doc, row, columns, columnWidths, startX, y) {
  let x = startX;
  for (let i = 0; i < columns.length; i++) {
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

// Draw a nested user transaction row:
// Symbol column: '↳ user_name'
// Other columns: actual values formatted
function drawNestedUserRow(doc, userRow, columns, columnWidths, startX, y) {
  let x = startX;

  for (let i = 0; i < columns.length; i++) {
    let text = '';
    if (i === 0) {
      text = '↳ ' + (userRow.user_name || '');
    } else {
      text = formatValue(userRow[columns[i].key]);
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

// Main function to generate PDF from JSON data
function generatePDF(data, outputPath = 'limitless.pdf') {
  const doc = new PDFDocument({
    size: [600, 2132],
    layout: 'landscape',
    margin: 40,
  });

  const columnWidths = calculateColumnWidths(doc, data, columnsToPrint);

  const pageSize = columnWidths.reduce((acc, curr) => curr + acc, 0) // +  margin * 2 + padding * 2
  console.log("columnWidths", columnWidths);
  console.log("pageSize", pageSize);


  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  drawTable(doc, data, columnsToPrint, columnWidths);

  doc.end();

  stream.on('finish', () => {
    console.log(`✅ PDF generated: ${outputPath}`);
  });
}

// Load your JSON data from data.json in same folder
const jsonData = require('./data.json');
generatePDF(jsonData);
