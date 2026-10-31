/**
 * Client-side Export Utility for BizBox POS
 * Generates true downloadable CSV, formatted PDF (via printable document), and Tally XML.
 */

export function exportToCsv(filename: string, headers: string[], rows: (string | number | undefined | null)[][]) {
  if (typeof window === 'undefined') return;

  const escapeCell = (cell: string | number | undefined | null) => {
    if (cell === null || cell === undefined) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ].join('\r\n');

  // Add \uFEFF BOM for Excel UTF-8 Rupee symbol support
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToPdf(options: {
  title: string;
  subtitle?: string;
  outlet?: string;
  headers: string[];
  rows: (string | number | undefined | null)[][];
  summary?: { label: string; value: string }[];
}) {
  if (typeof window === 'undefined') return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to generate and save PDF report.');
    return;
  }

  const { title, subtitle, outlet, headers, rows, summary } = options;
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const summaryHtml = summary && summary.length > 0
    ? `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 20px;">
        ${summary
          .map(
            (s) => `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 14px; border-radius: 8px;">
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">${s.label}</div>
            <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px;">${s.value}</div>
          </div>
        `
          )
          .join('')}
      </div>
    `
    : '';

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${title} - ${outlet || 'BizBox POS'}</title>
        <style>
          @page { size: A4 landscape; margin: 15mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            background: #fff;
            margin: 0;
            padding: 24px;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #4f46e5;
            padding-bottom: 14px;
            margin-bottom: 18px;
          }
          h1 { margin: 0; font-size: 22px; font-weight: 900; color: #0f172a; }
          .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
          .meta { text-align: right; font-size: 11px; color: #64748b; }
          .meta strong { color: #0f172a; }
          .btn-print {
            padding: 8px 16px;
            background: #4f46e5;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          }
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
          th {
            background: #f1f5f9;
            color: #334155;
            text-align: left;
            padding: 8px 10px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border: 1px solid #cbd5e1;
          }
          td {
            padding: 8px 10px;
            border: 1px solid #e2e8f0;
            color: #1e293b;
          }
          tr:nth-child(even) td { background: #f8fafc; }
          .footer {
            margin-top: 30px;
            font-size: 10px;
            color: #94a3b8;
            text-align: center;
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
          }
          @media print {
            body { padding: 0; }
            .btn-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header-row">
          <div>
            <h1>${title}</h1>
            <div class="subtitle">${subtitle || 'Official Store Analytics & Reconciliation Report'}</div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
            <button class="btn-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
            <div class="meta">
              <div>Outlet: <strong>${outlet || 'Indiranagar (BLR01)'}</strong></div>
              <div>Generated: <strong>${dateStr}</strong></div>
            </div>
          </div>
        </div>

        ${summaryHtml}

        <table>
          <thead>
            <tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? ''}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>

        <div class="footer">
          Generated securely by BizBox POS Enterprise · All financial figures in INR (₹) · Confidential
        </div>

        <script>
          setTimeout(() => { window.print(); }, 400);
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

export function exportToTallyXml(filename: string, hsnData: any[]) {
  if (typeof window === 'undefined') return;

  const xmlLines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<ENVELOPE>',
    '  <HEADER>',
    '    <TALLYREQUEST>Import Data</TALLYREQUEST>',
    '  </HEADER>',
    '  <BODY>',
    '    <IMPORTDATA>',
    '      <REQUESTDESC>',
    '        <REPORTNAME>GSTR-1 HSN Summary</REPORTNAME>',
    '      </REQUESTDESC>',
    '      <REQUESTDATA>',
  ];

  hsnData.forEach((item, index) => {
    xmlLines.push(`        <TALLYMESSAGE xmlns:UDF="TallyUDF">`);
    xmlLines.push(`          <VOUCHER VCHTYPE="Sales" ACTION="Create">`);
    xmlLines.push(`            <DATE>${new Date().toISOString().slice(0, 10).replace(/-/g, '')}</DATE>`);
    xmlLines.push(`            <HSNCODE>${item.hsnCode}</HSNCODE>`);
    xmlLines.push(`            <DESCRIPTION>${item.description}</DESCRIPTION>`);
    xmlLines.push(`            <GSTRATE>${item.gstRate}%</GSTRATE>`);
    xmlLines.push(`            <TAXABLEVALUE>${item.taxableValue}</TAXABLEVALUE>`);
    xmlLines.push(`            <CGST>${item.cgst}</CGST>`);
    xmlLines.push(`            <SGST>${item.sgst}</SGST>`);
    xmlLines.push(`            <TOTALGST>${item.totalGst}</TOTALGST>`);
    xmlLines.push(`            <GROSSVALUE>${item.grossValue}</GROSSVALUE>`);
    xmlLines.push(`          </VOUCHER>`);
    xmlLines.push(`        </TALLYMESSAGE>`);
  });

  xmlLines.push('      </REQUESTDATA>');
  xmlLines.push('    </IMPORTDATA>');
  xmlLines.push('  </BODY>');
  xmlLines.push('</ENVELOPE>');

  const blob = new Blob([xmlLines.join('\n')], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename.endsWith('.xml') ? filename : `${filename}.xml`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

