import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { describe, it, expect, beforeAll } from 'vitest';

process.env.JWT_SECRET = 'test-secret';
process.env.DB_PATH = ':memory:';

const { default: db } = await import('../src/db.js');
const { default: savingsRouter } = await import('../src/routes/savings.js');
const { default: transactionsRouter } = await import('../src/routes/transactions.js');

async function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/savings', savingsRouter);
  app.use('/api/transactions', transactionsRouter);
  return app;
}

function auth(userId = 'user-1') {
  return `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET)}`;
}

const now = new Date();
const MONTH = now.getMonth() + 1;
const YEAR = now.getFullYear();

describe('savings goals: depositos, retiros e historial', () => {
  let app;

  beforeAll(async () => {
    app = await buildApp();
    db.prepare("INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)")
      .run('user-1', 'Test', 'test@test.com', 'hash');
    db.prepare("INSERT INTO categories (id, user_id, name, type) VALUES (?, ?, ?, ?)")
      .run('cat-income', 'user-1', 'Sueldo', 'income');
    db.prepare("INSERT INTO categories (id, user_id, name, type) VALUES (?, ?, ?, ?)")
      .run('cat-expense', 'user-1', 'Compras', 'expense');
  });

  it('crea una meta y deposita 300000 sin crear gastos ni afectar ingresos', async () => {
    await request(app).post('/api/transactions')
      .set('Authorization', auth())
      .send({ category_id: 'cat-income', amount: 2500000, type: 'income', date: `${YEAR}-${String(MONTH).padStart(2, '0')}-01` })
      .expect(201);
    await request(app).post('/api/transactions')
      .set('Authorization', auth())
      .send({ category_id: 'cat-expense', amount: 650000, type: 'expense', date: `${YEAR}-${String(MONTH).padStart(2, '0')}-01` })
      .expect(201);

    const created = await request(app).post('/api/savings')
      .set('Authorization', auth())
      .send({ name: 'Vacaciones', target_amount: 1000000 })
      .expect(201);
    expect(created.body.current_amount).toBe(0);

    const deposit = await request(app).post(`/api/savings/${created.body.id}/deposit`)
      .set('Authorization', auth())
      .send({ amount: 300000 })
      .expect(200);
    expect(deposit.body.current_amount).toBe(300000);

    const dashboard = await request(app).get(`/api/transactions/dashboard?month=${MONTH}&year=${YEAR}`)
      .set('Authorization', auth())
      .expect(200);
    expect(dashboard.body.income).toBe(2500000);
    expect(dashboard.body.expense).toBe(650000);
    expect(dashboard.body.savings).toBe(300000);
    expect(dashboard.body.balance).toBe(2500000 - 650000 - 300000);

    const txs = await request(app).get('/api/transactions').set('Authorization', auth()).expect(200);
    expect(txs.body).toHaveLength(2);
  });

  it('retira 100000: baja la meta, sube el balance y el historial lo registra', async () => {
    const goals = await request(app).get('/api/savings').set('Authorization', auth()).expect(200);
    const goal = goals.body.find(g => g.name === 'Vacaciones');

    const withdraw = await request(app).post(`/api/savings/${goal.id}/withdraw`)
      .set('Authorization', auth())
      .send({ amount: 100000 })
      .expect(200);
    expect(withdraw.body.current_amount).toBe(200000);

    const dashboard = await request(app).get(`/api/transactions/dashboard?month=${MONTH}&year=${YEAR}`)
      .set('Authorization', auth())
      .expect(200);
    expect(dashboard.body.savings).toBe(200000);
    expect(dashboard.body.balance).toBe(2500000 - 650000 - 200000);

    const history = await request(app).get(`/api/savings/${goal.id}/transactions`)
      .set('Authorization', auth())
      .expect(200);
    expect(history.body).toHaveLength(2);
    expect(history.body[0].type).toBe('withdrawal');
    expect(history.body[0].amount).toBe(100000);
    expect(history.body[1].type).toBe('deposit');
    expect(history.body[1].amount).toBe(300000);

    const txs = await request(app).get('/api/transactions').set('Authorization', auth()).expect(200);
    expect(txs.body).toHaveLength(2);
  });

  it('rechaza un retiro mayor al saldo sin modificar nada', async () => {
    const goals = await request(app).get('/api/savings').set('Authorization', auth()).expect(200);
    const goal = goals.body.find(g => g.name === 'Vacaciones');

    const res = await request(app).post(`/api/savings/${goal.id}/withdraw`)
      .set('Authorization', auth())
      .send({ amount: 300000 })
      .expect(400);
    expect(res.body.error).toBe('No hay suficiente dinero en la meta');

    const after = await request(app).get('/api/savings').set('Authorization', auth()).expect(200);
    expect(after.body.find(g => g.id === goal.id).current_amount).toBe(200000);

    const history = await request(app).get(`/api/savings/${goal.id}/transactions`)
      .set('Authorization', auth())
      .expect(200);
    expect(history.body).toHaveLength(2);
  });

  it('rechaza montos inválidos en depósito y retiro', async () => {
    const goals = await request(app).get('/api/savings').set('Authorization', auth()).expect(200);
    const goal = goals.body.find(g => g.name === 'Vacaciones');

    await request(app).post(`/api/savings/${goal.id}/deposit`)
      .set('Authorization', auth())
      .send({ amount: 0 })
      .expect(400);
    await request(app).post(`/api/savings/${goal.id}/withdraw`)
      .set('Authorization', auth())
      .send({ amount: -5 })
      .expect(400);
  });
});