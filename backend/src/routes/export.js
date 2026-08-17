import { Router } from 'express';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { searchClause } from '../utils/search.js';

const router = Router();
router.use(authenticate);

function filteredTransactions(req) {
  const { type, category_id, start_date, end_date, search } = req.query;
  let sql = `SELECT t.date, t.type, c.name as category, t.description, t.amount
    FROM transactions t JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ?`;
  const params = [req.userId];

  if (type) { sql += ' AND t.type = ?'; params.push(type); }
  if (category_id) { sql += ' AND t.category_id = ?'; params.push(category_id); }
  if (start_date) { sql += ' AND t.date >= ?'; params.push(start_date); }
  if (end_date) { sql += ' AND t.date <= ?'; params.push(end_date); }
  if (search) { const clause = searchClause(search); sql += clause.sql; params.push(...clause.params); }

  sql += ' ORDER BY t.date DESC';

  return db.prepare(sql).all(...params);
}

function summarize(transactions) {
  const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return { income, expense, balance: income - expense };
}

router.get('/csv', (req, res) => {
  const transactions = filteredTransactions(req);

  const header = 'Fecha,Tipo,Categoría,Descripción,Monto\n';
  const rows = transactions.map(t =>
    `"${t.date}","${t.type}","${t.category}","${(t.description || '').replace(/"/g, '""')}","${t.amount}"`
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=transacciones.csv');
  res.send(header + rows);
});

router.get('/pdf', (req, res) => {
  const transactions = filteredTransactions(req);
  const totals = summarize(transactions);

  const doc = new PDFDocument({ margin: 60, size: 'A4' });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename=transacciones.pdf');
  doc.pipe(res);

  const M = 60;
  const W = 495;
  const cols = [
    { label: 'Fecha', x: M,        w: 80 },
    { label: 'Tipo', x: M + 80,    w: 70 },
    { label: 'Categoría', x: M + 150, w: 100 },
    { label: 'Descripción', x: M + 250, w: 165 },
    { label: 'Monto', x: M + 415,  w: 80 },
  ];
  const rowH = 20;

  function tableHeader() {
    doc.rect(M, doc.y, W, rowH).fill('#1e40af');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9.5);
    for (const c of cols) doc.text(c.label, c.x + 6, doc.y + 5, { width: c.w - 12 });
    doc.moveDown(1.15);
  }

  doc.font('Helvetica-Bold').fontSize(18).fillColor('#111827').text('Transacciones', { align: 'center' });
  doc.moveDown(0.3);
  doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text(
    `Total: ${transactions.length} movimiento${transactions.length === 1 ? '' : 's'}`, { align: 'center' }
  );
  doc.moveDown(1);

  if (transactions.length === 0) {
    doc.font('Helvetica').fontSize(11).fillColor('#9ca3af').text('Sin movimientos para los filtros aplicados.', { align: 'center' });
  } else {
    tableHeader();
    transactions.forEach((t, i) => {
      if (doc.y + rowH > doc.page.height - 60) {
        doc.addPage();
        tableHeader();
      }
      const ry = doc.y;
      doc.rect(M, ry, W, rowH).fill(i % 2 === 0 ? '#f8fafc' : '#ffffff');
      doc.fillColor('#111827').font('Helvetica').fontSize(9);
      doc.text(t.date, cols[0].x + 6, ry + 6, { width: cols[0].w - 12 });
      doc.text(t.type === 'income' ? 'Ingreso' : 'Gasto', cols[1].x + 6, ry + 6, { width: cols[1].w - 12 });
      doc.text(t.category, cols[2].x + 6, ry + 6, { width: cols[2].w - 12 });
      doc.text(t.description || '-', cols[3].x + 6, ry + 6, { width: cols[3].w - 12 });
      doc.fillColor(t.type === 'income' ? '#059669' : '#dc2626').font('Helvetica-Bold')
        .text(`${t.type === 'income' ? '+' : '-'}$${t.amount.toFixed(2)}`, cols[4].x + 6, ry + 6, { width: cols[4].w - 12, align: 'right' });
      doc.moveDown(0.9);
    });

    doc.moveDown(0.6);
    doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(M, doc.y).lineTo(M + W, doc.y).stroke();
    doc.moveDown(0.6);

    const totalsRows = [
      ['Total ingresos', totals.income, '#059669'],
      ['Total gastos', totals.expense, '#dc2626'],
      ['Balance', totals.balance, totals.balance >= 0 ? '#1e40af' : '#dc2626'],
    ];
    for (const [label, value, color] of totalsRows) {
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#374151').text(label, M, doc.y, { width: 300 });
      doc.fillColor(color).text(`$${value.toFixed(2)}`, M + 300, doc.y - 11, { width: 195, align: 'right' });
      doc.moveDown(0.6);
    }
  }

  doc.end();
});

router.get('/xlsx', async (req, res) => {
  const transactions = filteredTransactions(req);
  const totals = summarize(transactions);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Transacciones');
  ws.columns = [
    { header: 'Fecha', key: 'date', width: 14 },
    { header: 'Tipo', key: 'type', width: 12 },
    { header: 'Categoría', key: 'category', width: 22 },
    { header: 'Descripción', key: 'description', width: 45 },
    { header: 'Monto', key: 'amount', width: 16 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 20;

  for (const t of transactions) {
    const row = ws.addRow({
      date: t.date,
      type: t.type === 'income' ? 'Ingreso' : 'Gasto',
      category: t.category,
      description: t.description || '-',
      amount: t.amount,
    });
    row.getCell('amount').numFmt = '"$"#,##0.00';
    row.getCell('amount').font = { color: { argb: t.type === 'income' ? 'FF059669' : 'FFDC2626' } };
  }

  if (transactions.length === 0) {
    ws.addRow({ date: 'Sin movimientos para los filtros aplicados' }).font = { italic: true, color: { argb: 'FF9CA3AF' } };
  } else {
    ws.addRow({});
    const totalsRows = [
      { description: 'Total ingresos', amount: totals.income },
      { description: 'Total gastos', amount: totals.expense },
      { description: 'Balance', amount: totals.balance },
    ];
    for (const r of totalsRows) {
      const row = ws.addRow({ description: r.description, amount: r.amount });
      row.getCell('description').font = { bold: true };
      row.getCell('amount').numFmt = '"$"#,##0.00';
      row.getCell('amount').font = { bold: true };
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=transacciones.xlsx');
  res.send(Buffer.from(buffer));
});

export default router;