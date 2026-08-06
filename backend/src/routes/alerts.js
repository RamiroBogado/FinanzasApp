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

router.post('/check', (req, res) => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();

  const budgets = db.prepare(`
    SELECT b.*, c.name as category_name,
      COALESCE((SELECT SUM(amount) FROM transactions WHERE category_id = b.category_id
        AND user_id = b.user_id AND type = 'expense'
        AND strftime('%m', date) = ? AND strftime('%Y', date) = ?), 0) as spent
    FROM budgets b JOIN categories c ON b.category_id = c.id
    WHERE b.user_id = ? AND b.month = ? AND b.year = ?
  `).all(month, String(year), req.userId, month, year);

  const newAlerts = [];
  for (const budget of budgets) {
    if (budget.spent > budget.amount) {
      const existing = db.prepare('SELECT id FROM alerts WHERE user_id = ? AND message LIKE ? AND strftime(\'%m\', created_at) = ?')
        .get(req.userId, `%${budget.category_name}%`, month);
      if (!existing) {
        const id = uuid();
        const message = `Presupuesto excedido: ${budget.category_name} - Gastaste $${budget.spent.toFixed(2)} de $${budget.amount.toFixed(2)}`;
        db.prepare('INSERT INTO alerts (id, user_id, message, type) VALUES (?, ?, ?, ?)').run(id, req.userId, message, 'danger');
        newAlerts.push({ id, message, type: 'danger' });
      }
    } else if (budget.spent > budget.amount * 0.8) {
      const existing = db.prepare('SELECT id FROM alerts WHERE user_id = ? AND message LIKE ? AND strftime(\'%m\', created_at) = ?')
        .get(req.userId, `%${budget.category_name}%`, month);
      if (!existing) {
        const id = uuid();
        const message = `Alerta de presupuesto: ${budget.category_name} - Llevas gastado $${budget.spent.toFixed(2)} de $${budget.amount.toFixed(2)} (${Math.round(budget.spent / budget.amount * 100)}%)`;
        db.prepare('INSERT INTO alerts (id, user_id, message, type) VALUES (?, ?, ?, ?)').run(id, req.userId, message, 'warning');
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

export default router;
