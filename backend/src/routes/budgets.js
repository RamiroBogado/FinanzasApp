import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const { month, year } = req.query;
  const m = month || new Date().getMonth() + 1;
  const y = year || new Date().getFullYear();

  const budgets = db.prepare(`
    SELECT b.*, c.name as category_name, c.color as category_color,
      COALESCE((SELECT SUM(amount) FROM transactions WHERE category_id = b.category_id
        AND user_id = b.user_id AND type = 'expense'
        AND strftime('%m', date) = ? AND strftime('%Y', date) = ?), 0) as spent
    FROM budgets b JOIN categories c ON b.category_id = c.id
    WHERE b.user_id = ? AND b.month = ? AND b.year = ?
    ORDER BY c.name
  `).all(String(m).padStart(2, '0'), String(y), req.userId, String(m).padStart(2, '0'), parseInt(y));

  res.json(budgets);
});

router.post('/', (req, res) => {
  const { category_id, month, year, amount, threshold } = req.body;
  if (!category_id || !month || !year || !amount) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const t = threshold === undefined || threshold === null || threshold === '' ? 80 : Number(threshold);
  if (!Number.isFinite(t) || t < 1 || t > 100) {
    return res.status(400).json({ error: 'El umbral debe ser un número entre 1 y 100' });
  }

  const cat = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(category_id, req.userId);
  if (!cat) return res.status(404).json({ error: 'Categoría no encontrada' });

  const existing = db.prepare('SELECT id FROM budgets WHERE user_id = ? AND category_id = ? AND month = ? AND year = ?')
    .get(req.userId, category_id, month, year);
  if (existing) {
    return res.status(400).json({ error: 'Ya existe un presupuesto para esta categoría en este mes' });
  }

  const id = uuid();
  db.prepare('INSERT INTO budgets (id, user_id, category_id, month, year, amount, threshold) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(id, req.userId, category_id, month, year, amount, t);

  const budget = db.prepare('SELECT * FROM budgets WHERE id = ?').get(id);
  res.status(201).json(budget);
});

router.put('/:id', (req, res) => {
  const budget = db.prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!budget) return res.status(404).json({ error: 'Presupuesto no encontrado' });

  const { amount, threshold } = req.body;
  const t = threshold === undefined || threshold === null || threshold === '' ? budget.threshold : Number(threshold);
  if (!Number.isFinite(t) || t < 1 || t > 100) {
    return res.status(400).json({ error: 'El umbral debe ser un número entre 1 y 100' });
  }
  db.prepare('UPDATE budgets SET amount = ?, threshold = ? WHERE id = ?')
    .run(amount === undefined ? budget.amount : amount, t, req.params.id);
  const updated = db.prepare('SELECT * FROM budgets WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const budget = db.prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!budget) return res.status(404).json({ error: 'Presupuesto no encontrado' });
  db.prepare('DELETE FROM budgets WHERE id = ?').run(req.params.id);
  res.json({ message: 'Presupuesto eliminado' });
});

export default router;
