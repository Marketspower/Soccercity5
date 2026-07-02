"use client";

/**
 * Exports côté client, sans dépendance lourde :
 * — CSV avec BOM UTF-8 et séparateur `;` : s'ouvre proprement dans Excel
 * — PDF via la boîte d'impression du navigateur (fenêtre stylée)
 */

export function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(escape).join(";")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportPDF(title: string, headers: string[], rows: (string | number)[][]) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;
  win.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${title}</title>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;padding:32px;color:#0a0f1a}
      h1{font-style:italic;text-transform:uppercase;letter-spacing:1px;border-bottom:4px solid #0357F3;padding-bottom:8px}
      table{width:100%;border-collapse:collapse;margin-top:16px;font-size:12px}
      th{background:#0357F3;color:#fff;text-align:left;padding:8px}
      td{padding:8px;border-bottom:1px solid #ddd}
      tr:nth-child(even) td{background:#f4f7ff}
      footer{margin-top:24px;font-size:10px;color:#888}
    </style></head><body>
    <h1>Soccer City — ${title}</h1>
    <table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>
    <footer>Généré le ${new Date().toLocaleString("fr-CA")}</footer>
    </body></html>`);
  win.document.close();
  win.focus();
  win.print();
}
