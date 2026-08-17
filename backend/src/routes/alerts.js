import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const alerts = db.prepare('SELECT * FROM alerts WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.userId);
  res.json(alerts);
});

function monthOf(now) {
  return String(now.getMonth() + 1).padStart(2, '0');
}

router.post('/check', (req, res) => {
  const { month, year } = req.body || {};
  const now = new Date();
  const m = month ? String(month).padStart(2, '0') : monthOf(now);
  const y = year ? parseInt(year) : now.getFullYear();

  const budgets = db.prepare(`
    SELECT b.*, c.name as category_name,
      COALESCE((SELECT SUM(amount) FROM transactions WHERE category_id = b.category_id
        AND user_id = b.user_id AND type = 'expense'
        AND strftime('%m', date) = ? AND strftime('%Y', date) = ?), 0) as spent
    FROM budgets b JOIN categories c ON b.category_id = c.id
    WHERE b.user_id = ? AND b.month = ? AND b.year = ?
  `).all(m, String(y), req.userId, m, y);

  const newAlerts = [];
  const existsAlert = (budget, type) => db.prepare(
    'SELECT id FROM alerts WHERE user_id = ? AND category_id = ? AND month = ? AND year = ? AND type = ?'
  ).get(req.userId, budget.category_id, m, y, type);

  for (const budget of budgets) {
    const pct = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;

    if (budget.spent > budget.amount) {
      if (!existsAlert(budget, 'danger')) {
        const id = uuid();
        const message = `Presupuesto excedido: ${budget.category_name} - Gastaste $${budget.spent.toFixed(2)} de $${budget.amount.toFixed(2)}`;
        db.prepare('INSERT INTO alerts (id, user_id, message, type, category_id, month, year) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(id, req.userId, message, 'danger', budget.category_id, m, y);
        newAlerts.push({ id, message, type: 'danger' });
      }
    } else if (pct >= budget.threshold) {
      if (!existsAlert(budget, 'warning')) {
        const id = uuid();
        const message = `Alerta de presupuesto: ${budget.category_name} - Llevas gastado $${budget.spent.toFixed(2)} de $${budget.amount.toFixed(2)} (${Math.round(pct)}%)`;
        db.prepare('INSERT INTO alerts (id, user_id, message, type, category_id, month, year) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(id, req.userId, message, 'warning', budget.category_id, m, y);
        newAlerts.push({ id, message, type: 'warning' });
      }
    }
  }

  res.json({ alerts: newAlerts, message: 'Alertas verificadas' });
});

router.put('/:id/read', (req, res) => {
  db.prepare('UPDATE alerts SET read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  res.json({ message: 'Alerta marcada como leída' });
});

router.post('/read-all', (req, res) => {
  db.prepare("UPDATE alerts SET read = 1 WHERE user_id = ? AND read = 0").run(req.userId);
  res.json({ message: 'Alertas marcadas como leídas' });
});

export default router;