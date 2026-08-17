import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { describe, it, expect, beforeAll } from 'vitest';

process.env.JWT_SECRET = 'test-secret';
process.env.DB_PATH = ':memory:';

const { default: db } = await import('../src/db.js');
const { default: budgetsRouter } = await import('../src/routes/budgets.js');
const { default: alertsRouter } = await import('../src/routes/alerts.js');
const { default: transactionsRouter } = await import('../src/routes/transactions.js');

async function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/budgets', budgetsRouter);
  app.use('/api/alerts', alertsRouter);
  app.use('/api/transactions', transactionsRouter);
  return app;
}

function auth(userId = 'user-1') {
  return `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET)}`;
}

const now = new Date();
const MONTH = String(now.getMonth() + 1).padStart(2, '0');
const YEAR = now.getFullYear();
const OTHER_MONTH = String(((now.getMonth() + 2) % 12) + 1).padStart(2, '0');

async function seedExpense(categoryId, amount, month, year) {
  await request(app).post('/api/transactions')
    .set('Authorization', auth())
    .send({ category_id: categoryId, amount, type: 'expense', date: `${year}-${month}-10` })
    .expect(201);
}

let app;

describe('budgets: umbral configurable', () => {
  beforeAll(async () => {
    app = await buildApp();
    db.prepare("INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)")
      .run('user-1', 'Test', 'test@test.com', 'hash');
    db.prepare("INSERT INTO categories (id, user_id, name, type) VALUES (?, ?, ?, ?)")
      .run('cat-food', 'user-1', 'Comida', 'expense');
  });

  it('crea un presupuesto con threshold por defecto 80', async () => {
    const res = await request(app).post('/api/budgets')
      .set('Authorization', auth())
      .send({ category_id: 'cat-food', month: MONTH, year: YEAR, amount: 10000 })
      .expect(201);
    expect(res.body.threshold).toBe(80);
  });

  it('actualiza el threshold con PUT', async () => {
    const list = await request(app).get(`/api/budgets?month=${MONTH}&year=${YEAR}`).set('Authorization', auth()).expect(200);
    const res = await request(app).put(`/api/budgets/${list.body[0].id}`)
      .set('Authorization', auth())
      .send({ amount: 10000, threshold: 50 })
      .expect(200);
    expect(res.body.threshold).toBe(50);
  });

  it('rechaza thresholds inválidos', async () => {
    await request(app).post('/api/budgets')
      .set('Authorization', auth())
      .send({ category_id: 'cat-food', month: OTHER_MONTH, year: YEAR, amount: 10000, threshold: 0 })
      .expect(400);
    await request(app).post('/api/budgets')
      .set('Authorization', auth())
      .send({ category_id: 'cat-food', month: OTHER_MONTH, year: YEAR, amount: 10000, threshold: 101 })
      .expect(400);
  });
});

describe('alerts: motor de alertas de presupuestos', () => {
  beforeAll(async () => {
    if (!app) app = await buildApp();
    db.prepare("INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)")
      .run('user-2', 'Otro', 'otro@test.com', 'hash');
  });

  it('crea warning al superar el threshold configurado (50%)', async () => {
    await seedExpense('cat-food', 6000, MONTH, YEAR);
    const check = await request(app).post('/api/alerts/check')
      .set('Authorization', auth())
      .send({ month: MONTH, year: YEAR })
      .expect(200);
    expect(check.body.alerts).toHaveLength(1);
    expect(check.body.alerts[0].type).toBe('warning');

    const list = await request(app).get('/api/alerts').set('Authorization', auth()).expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].message).toContain('Comida');
  });

  it('no duplica alertas al re-ejecutar el check', async () => {
    await request(app).post('/api/alerts/check')
      .set('Authorization', auth())
      .send({ month: MONTH, year: YEAR })
      .expect(200);
    const list = await request(app).get('/api/alerts').set('Authorization', auth()).expect(200);
    expect(list.body.filter(a => a.type === 'warning')).toHaveLength(1);
  });

  it('crea danger al superar el 100% y convive con la warning de la misma categoría', async () => {
    await seedExpense('cat-food', 8000, MONTH, YEAR);
    const check = await request(app).post('/api/alerts/check')
      .set('Authorization', auth())
      .send({ month: MONTH, year: YEAR })
      .expect(200);
    expect(check.body.alerts).toHaveLength(1);
    expect(check.body.alerts[0].type).toBe('danger');

    const list = await request(app).get('/api/alerts').set('Authorization', auth()).expect(200);
    expect(list.body.filter(a => a.type === 'warning')).toHaveLength(1);
    expect(list.body.filter(a => a.type === 'danger')).toHaveLength(1);
  });

  it('evalúa el período recibido, no el mes actual', async () => {
    await request(app).post('/api/budgets')
      .set('Authorization', auth())
      .send({ category_id: 'cat-food', month: OTHER_MONTH, year: YEAR, amount: 10000, threshold: 50 })
      .expect(201);
    await seedExpense('cat-food', 6000, OTHER_MONTH, YEAR);

    const check = await request(app).post('/api/alerts/check')
      .set('Authorization', auth())
      .send({ month: OTHER_MONTH, year: YEAR })
      .expect(200);
    expect(check.body.alerts).toHaveLength(1);

    const today = new Date();
    const isSameMonth = String(today.getMonth() + 1).padStart(2, '0') === OTHER_MONTH;
    if (!isSameMonth) {
      const list = await request(app).get('/api/alerts').set('Authorization', auth()).expect(200);
      expect(list.body.filter(a => a.type === 'warning' && a.month === OTHER_MONTH)).toHaveLength(1);
      expect(list.body.some(a => a.month === MONTH && a.type === 'danger')).toBe(true);
    }
  });

  it('marca una alerta como leída y todas con read-all', async () => {
    const list = await request(app).get('/api/alerts').set('Authorization', auth()).expect(200);
    const first = list.body[0];

    await request(app).put(`/api/alerts/${first.id}/read`).set('Authorization', auth()).expect(200);
    const afterOne = await request(app).get('/api/alerts').set('Authorization', auth()).expect(200);
    expect(afterOne.body.find(a => a.id === first.id).read).toBe(1);

    await request(app).post('/api/alerts/read-all').set('Authorization', auth()).expect(200);
    const all = await request(app).get('/api/alerts').set('Authorization', auth()).expect(200);
    expect(all.body.every(a => a.read === 1)).toBe(true);
  });

  it('no filtra alertas de otro usuario', async () => {
    const list = await request(app).get('/api/alerts').set('Authorization', auth('user-2')).expect(200);
    expect(list.body).toHaveLength(0);
  });
});