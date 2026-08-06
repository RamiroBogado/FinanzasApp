import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const conversations = new Map();

router.post('/message', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Mensaje requerido' });

  if (!conversations.has(req.userId)) {
    conversations.set(req.userId, []);
  }
  const history = conversations.get(req.userId);
  history.push({ role: 'user', content: message });

  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.userId);
  const summary = db.prepare(`
    SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expense
    FROM transactions WHERE user_id = ?
  `).get(req.userId);

  const recentTx = db.prepare(`
    SELECT t.date, t.type, t.amount, t.description, c.name as category
    FROM transactions t JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = ? ORDER BY t.date DESC LIMIT 5
  `).all(req.userId);

  const goals = db.prepare('SELECT name, target_amount, current_amount FROM savings_goals WHERE user_id = ?').all(req.userId);

  const systemPrompt = `Eres un asesor financiero personal. Ayudas al usuario con sus finanzas personales.
Usuario: ${user?.name || 'Usuario'}
Resumen financiero:
- Ingresos totales: $${summary?.total_income || 0}
- Gastos totales: $${summary?.total_expense || 0}
- Balance: $${((summary?.total_income || 0) - (summary?.total_expense || 0)).toFixed(2)}

Últimas transacciones:
${recentTx.map(t => `- ${t.date}: ${t.type === 'income' ? 'Ingreso' : 'Gasto'} de $${t.amount} en ${t.category}${t.description ? ': ' + t.description : ''}`).join('\n')}

Metas de ahorro:
${goals.map(g => `- ${g.name}: $${g.current_amount}/$${g.target_amount} (${Math.round(g.current_amount / g.target_amount * 100)}%)`).join('\n') || 'Ninguna'}

Responde de forma útil, clara y concisa. Si te preguntan algo que no sabes, sé honesto.`;

  const fullPrompt = `${systemPrompt}\n\nHistorial:\n${history.slice(-6).map(m => `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`).join('\n')}\n\nAsistente:`;

  try {
    const response = await queryOllama(fullPrompt);
    history.push({ role: 'assistant', content: response });
    if (history.length > 20) history.splice(0, history.length - 20);
    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: 'Error al contactar el asistente: ' + err.message });
  }
});

router.post('/clear', (req, res) => {
  conversations.delete(req.userId);
  res.json({ message: 'Conversación reiniciada' });
});

async function queryOllama(prompt) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
    const resp = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        prompt,
        stream: false,
        options: { temperature: 0.7, max_tokens: 500 }
      }),
      signal: controller.signal
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Ollama error: ${resp.status} - ${text}`);
    }

    const data = await resp.json();
    return data.response.trim();
  } finally {
    clearTimeout(timeout);
  }
}

export default router;
