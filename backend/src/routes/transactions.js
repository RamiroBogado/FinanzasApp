import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { searchClause } from '../utils/search.js';

const router = Router();
router.use(authenticate);

function previousBalance(userId, month, year) {
  const m = String(month).padStart(2, '0');
  const y = String(year);

  const txFlow = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as total
    FROM transactions
    WHERE user_id = ?
      AND (strftime('%Y', date) < ? OR (strftime('%Y', date) = ? AND strftime('%m', date) < ?))
  `).get(userId, y, y, m);

  const goalFlow = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN t.type = 'deposit' THEN t.amount ELSE -t.amount END), 0) as total
    FROM savings_goal_transactions t
    JOIN savings_goals g ON t.goal_id = g.id
    WHERE g.user_id = ?
      AND (strftime('%Y', t.created_at) < ? OR (strftime('%Y', t.created_at) = ? AND strftime('%m', t.created_at) < ?))
  `).get(userId, y, y, m);

  return txFlow.total - goalFlow.total;
}

function monthNetMetas(userId, month, year) {
  const m = String(month).padStart(2, '0');
  const y = String(year);
  const row = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN t.type = 'deposit' THEN t.amount ELSE -t.amount END), 0) as total
    FROM savings_goal_transactions t
    JOIN savings_goals g ON t.goal_id = g.id
    WHERE g.user_id = ? AND strftime('%m', t.created_at) = ? AND strftime('%Y', t.created_at) = ?
  `).get(userId, m, y);
  return row.total;
}

router.get('/', (req, res) => {
  const { type, category_id, start_date, end_date, search, limit, offset } = req.query;
  let sql = `SELECT t.*, c.name as category_name, c.color as category_color
    FROM transactions t JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ?`;
  const params = [req.userId];

  if (type) { sql += ' AND t.type = ?'; params.push(type); }
  if (category_id) { sql += ' AND t.category_id = ?'; params.push(category_id); }
  if (start_date) { sql += ' AND t.date >= ?'; params.push(start_date); }
  if (end_date) { sql += ' AND t.date <= ?'; params.push(end_date); }
  if (search) { const clause = searchClause(search); sql += clause.sql; params.push(...clause.params); }

  sql += ' ORDER BY t.date DESC, t.created_at DESC';
  if (limit) { sql += ' LIMIT ?'; params.push(parseInt(limit)); }
  if (offset) { sql += ' OFFSET ?'; params.push(parseInt(offset)); }

  const transactions = db.prepare(sql).all(...params);
  res.json(transactions);
});

router.get('/dashboard', (req, res) => {
  const { month, year } = req.query;
  const m = month || new Date().getMonth() + 1;
  const y = year || new Date().getFullYear();

  const income = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE user_id = ? AND type = 'income' AND strftime('%m', date) = ? AND strftime('%Y', date) = ?
  `).get(req.userId, String(m).padStart(2, '0'), String(y));

  const expense = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE user_id = ? AND type = 'expense' AND strftime('%m', date) = ? AND strftime('%Y', date) = ?
  `).get(req.userId, String(m).padStart(2, '0'), String(y));

  const savings = db.prepare(`
    SELECT COALESCE(SUM(current_amount), 0) as total FROM savings_goals
    WHERE user_id = ?
  `).get(req.userId);

  const byCategory = db.prepare(`
    SELECT c.id, c.name, c.color, c.type, COALESCE(SUM(t.amount), 0) as total
    FROM categories c LEFT JOIN transactions t ON c.id = t.category_id
      AND strftime('%m', t.date) = ? AND strftime('%Y', t.date) = ?
    WHERE c.user_id = ?
    GROUP BY c.id ORDER BY total DESC
  `).all(String(m).padStart(2, '0'), String(y), req.userId);

  const monthlySummary = db.prepare(`
    SELECT strftime('%m', date) as month, strftime('%Y', date) as year,
      SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
      SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expense
    FROM transactions WHERE user_id = ?
    GROUP BY strftime('%Y', date), strftime('%m', date)
    ORDER BY year DESC, month DESC LIMIT 12
  `).all(req.userId);

  const recentTransactions = db.prepare(`
    SELECT t.*, c.name as category_name, c.color as category_color
    FROM transactions t JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ? ORDER BY t.date DESC, t.created_at DESC LIMIT 10
  `).all(req.userId);

  const prevBalance = previousBalance(req.userId, m, y);
  const netMetas = monthNetMetas(req.userId, m, y);

  res.json({
    income: income.total,
    expense: expense.total,
    savings: savings.total,
    previousBalance: prevBalance,
    balance: prevBalance + income.total - expense.total - netMetas,
    byCategory,
    monthlySummary,
    recentTransactions
  });
});

router.get('/previous-balance', (req, res) => {
  const { month, year } = req.query;
  const m = month || new Date().getMonth() + 1;
  const y = year || new Date().getFullYear();
  res.json({ amount: previousBalance(req.userId, m, y) });
});

router.post('/', (req, res) => {
  const { category_id, amount, type, description, date } = req.body;
  if (!category_id || !amount || !type || !date) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const cat = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(category_id, req.userId);
  if (!cat) return res.status(404).json({ error: 'Categoría no encontrada' });
  if (cat.type !== type) return res.status(400).json({ error: `La categoría "${cat.name}" es de tipo ${cat.type === 'income' ? 'ingreso' : 'gasto'}` });
  if (amount <= 0) return res.status(400).json({ error: 'El monto debe ser mayor a 0' });

  const id = uuid();
  db.prepare('INSERT INTO transactions (id, user_id, category_id, amount, type, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.userId, category_id, amount, type, description || '', date);

  const tx = db.prepare('SELECT t.*, c.name as category_name, c.color as category_color FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.id = ?').get(id);
  res.status(201).json(tx);
});

router.put('/:id', (req, res) => {
  const tx = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!tx) return res.status(404).json({ error: 'Transacción no encontrada' });

  const { category_id, amount, type, description, date } = req.body;

  const finalCategoryId = category_id || tx.category_id;
  const finalType = type || tx.type;

  if (category_id) {
    const cat = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(category_id, req.userId);
    if (!cat) return res.status(404).json({ error: 'Categoría no encontrada' });
    if (cat.type !== finalType) return res.status(400).json({ error: `La categoría "${cat.name}" es de tipo ${cat.type === 'income' ? 'ingreso' : 'gasto'}` });
  }
  if (amount !== undefined && amount <= 0) return res.status(400).json({ error: 'El monto debe ser mayor a 0' });

  db.prepare('UPDATE transactions SET category_id = ?, amount = ?, type = ?, description = ?, date = ? WHERE id = ?')
    .run(finalCategoryId, amount ?? tx.amount, finalType, description !== undefined ? description : tx.description, date || tx.date, req.params.id);

  const updated = db.prepare('SELECT t.*, c.name as category_name, c.color as category_color FROM transactions t JOIN categories c ON t.category_id = c.id WHERE t.id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const tx = db.prepare('SELECT * FROM transactions WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!tx) return res.status(404).json({ error: 'Transacción no encontrada' });
  db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  res.json({ message: 'Transacción eliminada' });
});

export default router;
