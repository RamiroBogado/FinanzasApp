import { Router } from 'express';
import { v4 as uuid } from 'uuid';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories WHERE user_id = ? ORDER BY name').all(req.userId);
  res.json(categories);
});

router.post('/', (req, res) => {
  const { name, type, color } = req.body;
  if (!name || !type) {
    return res.status(400).json({ error: 'Nombre y tipo son requeridos' });
  }
  const id = uuid();
  db.prepare('INSERT INTO categories (id, user_id, name, type, color) VALUES (?, ?, ?, ?, ?)').run(id, req.userId, name, type, color || '#6366f1');
  const cat = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  res.status(201).json(cat);
});

router.put('/:id', (req, res) => {
  const { name, type, color } = req.body;
  const cat = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!cat) return res.status(404).json({ error: 'Categoría no encontrada' });

  db.prepare('UPDATE categories SET name = ?, type = ?, color = ? WHERE id = ?')
    .run(name || cat.name, type || cat.type, color || cat.color, req.params.id);
  const updated = db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const cat = db.prepare('SELECT * FROM categories WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!cat) return res.status(404).json({ error: 'Categoría no encontrada' });

  const txCount = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?').get(req.params.id);
  if (txCount.count > 0) {
    return res.status(400).json({ error: 'No se puede eliminar una categoría con transacciones asociadas' });
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ message: 'Categoría eliminada' });
});

export default router;
