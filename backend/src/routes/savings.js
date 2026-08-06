import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const goals = db.prepare('SELECT * FROM savings_goals WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  res.json(goals);
});

router.post('/', (req, res) => {
  const { name, target_amount, deadline } = req.body;
  if (!name || !target_amount) {
    return res.status(400).json({ error: 'Nombre y monto objetivo son requeridos' });
  }
  if (target_amount <= 0) {
    return res.status(400).json({ error: 'El monto objetivo debe ser mayor a 0' });
  }
  const id = uuid();
  db.prepare('INSERT INTO savings_goals (id, user_id, name, target_amount, deadline) VALUES (?, ?, ?, ?, ?)')
    .run(id, req.userId, name, target_amount, deadline || null);
  const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(id);
  res.status(201).json(goal);
});

router.post('/:id/deposit', (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: 'Monto inválido' });

  const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!goal) return res.status(404).json({ error: 'Meta no encontrada' });

  const newAmount = goal.current_amount + amount;
  db.prepare('UPDATE savings_goals SET current_amount = ? WHERE id = ?').run(newAmount, req.params.id);
  const updated = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.put('/:id', (req, res) => {
  const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!goal) return res.status(404).json({ error: 'Meta no encontrada' });

  const { name, target_amount, deadline } = req.body;
  const finalTarget = target_amount || goal.target_amount;
  if (finalTarget <= 0) return res.status(400).json({ error: 'El monto objetivo debe ser mayor a 0' });
  db.prepare('UPDATE savings_goals SET name = ?, target_amount = ?, deadline = ? WHERE id = ?')
    .run(name || goal.name, finalTarget, deadline !== undefined ? deadline : goal.deadline, req.params.id);
  const updated = db.prepare('SELECT * FROM savings_goals WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const goal = db.prepare('SELECT * FROM savings_goals WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!goal) return res.status(404).json({ error: 'Meta no encontrada' });
  db.prepare('DELETE FROM savings_goals WHERE id = ?').run(req.params.id);
  res.json({ message: 'Meta eliminada' });
});

export default router;
