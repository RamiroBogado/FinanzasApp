import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/csv', (req, res) => {
  const { type, category_id, start_date, end_date, search } = req.query;
  let sql = `SELECT t.date, t.type, c.name as category, t.description, t.amount
    FROM transactions t JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ?`;
  const params = [req.userId];

  if (type) { sql += ' AND t.type = ?'; params.push(type); }
  if (category_id) { sql += ' AND t.category_id = ?'; params.push(category_id); }
  if (start_date) { sql += ' AND t.date >= ?'; params.push(start_date); }
  if (end_date) { sql += ' AND t.date <= ?'; params.push(end_date); }
  if (search) { sql += ' AND t.description LIKE ?'; params.push(`%${search}%`); }

  sql += ' ORDER BY t.date DESC';

  const transactions = db.prepare(sql).all(...params);

  const header = 'Fecha,Tipo,Categoría,Descripción,Monto\n';
  const rows = transactions.map(t =>
    `"${t.date}","${t.type}","${t.category}","${(t.description || '').replace(/"/g, '""')}","${t.amount}"`
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=transacciones.csv');
  res.send(header + rows);
});

export default router;
