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

function auth(userId) {
  return `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET)}`;
}

const seedTransaction = db.prepare(`
  INSERT INTO transactions (id, user_id, category_id, amount, type, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const seedGoal = db.prepare(`
  INSERT INTO savings_goals (id, user_id, name, target_amount, current_amount) VALUES (?, ?, ?, ?, ?)
`);

const seedMovement = db.prepare(`
  INSERT INTO savings_goal_transactions (id, goal_id, amount, type, created_at) VALUES (?, ?, ?, ?, ?)
`);

describe('balance anterior: arrastre mensual virtual', () => {
  let app;

  beforeAll(async () => {
    app = await buildApp();

    db.prepare("INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)")
      .run('user-1', 'Uno', 'uno@test.com', 'hash');
    db.prepare("INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)")
      .run('user-neg', 'Neg', 'neg@test.com', 'hash');
    db.prepare("INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)")
      .run('user-zero', 'Zero', 'zero@test.com', 'hash');

    db.prepare("INSERT INTO categories (id, user_id, name, type) VALUES (?, ?, ?, ?)")
      .run('cat-income', 'user-1', 'Sueldo', 'income');
    db.prepare("INSERT INTO categories (id, user_id, name, type) VALUES (?, ?, ?, ?)")
      .run('cat-expense', 'user-1', 'Compras', 'expense');
    db.prepare("INSERT INTO categories (id, user_id, name, type) VALUES (?, ?, ?, ?)")
      .run('cat-income-n', 'user-neg', 'Sueldo', 'income');
    db.prepare("INSERT INTO categories (id, user_id, name, type) VALUES (?, ?, ?, ?)")
      .run('cat-expense-n', 'user-neg', 'Compras', 'expense');

    seedTransaction.run('t1', 'user-1', 'cat-income', 500000, 'income', '', '2026-08-05');
    seedTransaction.run('t2', 'user-1', 'cat-expense', 150000, 'expense', '', '2026-08-10');
    seedTransaction.run('t3', 'user-1', 'cat-income', 200000, 'income', '', '2026-09-05');
    seedTransaction.run('t4', 'user-1', 'cat-expense', 100000, 'expense', '', '2026-09-10');

    seedTransaction.run('t5', 'user-neg', 'cat-income-n', 100000, 'income', '', '2026-07-05');
    seedTransaction.run('t6', 'user-neg', 'cat-expense-n', 150000, 'expense', '', '2026-07-10');

    seedGoal.run('g1', 'user-1', 'Vacaciones', 1000000, 70000);
    seedMovement.run('m1', 'g1', 50000, 'deposit', '2026-08-15 10:00:00');
    seedMovement.run('m2', 'g1', 20000, 'deposit', '2026-09-05 10:00:00');
  });

  it('mes anterior positivo: agosto cierra +300000 y septiembre arranca desde ahi', async () => {
    const prev = await request(app).get('/api/transactions/previous-balance?month=9&year=2026')
      .set('Authorization', auth('user-1')).expect(200);
    expect(prev.body.amount).toBe(300000);

    const dash = await request(app).get('/api/transactions/dashboard?month=9&year=2026')
      .set('Authorization', auth('user-1')).expect(200);
    expect(dash.body.income).toBe(200000);
    expect(dash.body.expense).toBe(100000);
    expect(dash.body.savings).toBe(70000);
    expect(dash.body.previousBalance).toBe(300000);
    expect(dash.body.balance).toBe(300000 + 200000 - 100000 - 20000);
  });

  it('mes anterior negativo: el deficit se traslada', async () => {
    const prev = await request(app).get('/api/transactions/previous-balance?month=8&year=2026')
      .set('Authorization', auth('user-neg')).expect(200);
    expect(prev.body.amount).toBe(-50000);

    const dash = await request(app).get('/api/transactions/dashboard?month=8&year=2026')
      .set('Authorization', auth('user-neg')).expect(200);
    expect(dash.body.previousBalance).toBe(-50000);
    expect(dash.body.balance).toBe(-50000);
  });

  it('sin historial previo: balance anterior $0', async () => {
    const prev = await request(app).get('/api/transactions/previous-balance?month=9&year=2026')
      .set('Authorization', auth('user-zero')).expect(200);
    expect(prev.body.amount).toBe(0);

    const prevUser1 = await request(app).get('/api/transactions/previous-balance?month=8&year=2026')
      .set('Authorization', auth('user-1')).expect(200);
    expect(prevUser1.body.amount).toBe(0);
  });

  it('balance anterior no se persiste como transaccion real', async () => {
    const rows = db.prepare('SELECT COUNT(*) as n FROM transactions').get();
    expect(rows.n).toBe(6);

    const virtual = db.prepare("SELECT COUNT(*) as n FROM transactions WHERE description LIKE '%alance anterior%'").get();
    expect(virtual.n).toBe(0);
  });

  it('no se duplica al recargar o cambiar de mes', async () => {
    const a = await request(app).get('/api/transactions/previous-balance?month=9&year=2026')
      .set('Authorization', auth('user-1')).expect(200);
    const b = await request(app).get('/api/transactions/previous-balance?month=9&year=2026')
      .set('Authorization', auth('user-1')).expect(200);
    expect(a.body.amount).toBe(300000);
    expect(b.body.amount).toBe(300000);

    const dashA = await request(app).get('/api/transactions/dashboard?month=9&year=2026')
      .set('Authorization', auth('user-1')).expect(200);
    const dashB = await request(app).get('/api/transactions/dashboard?month=9&year=2026')
      .set('Authorization', auth('user-1')).expect(200);
    expect(dashA.body.balance).toBe(dashB.body.balance);

    const rows = db.prepare('SELECT COUNT(*) as n FROM transactions').get();
    expect(rows.n).toBe(6);
  });

  it('encadenamiento ago -> sep -> oct: el arrastre es el balance final del mes previo', async () => {
    const aug = await request(app).get('/api/transactions/dashboard?month=8&year=2026')
      .set('Authorization', auth('user-1')).expect(200);
    expect(aug.body.previousBalance).toBe(0);
    expect(aug.body.balance).toBe(500000 - 150000 - 50000);

    const sepCarry = await request(app).get('/api/transactions/previous-balance?month=9&year=2026')
      .set('Authorization', auth('user-1')).expect(200);
    expect(sepCarry.body.amount).toBe(aug.body.balance);

    const sep = await request(app).get('/api/transactions/dashboard?month=9&year=2026')
      .set('Authorization', auth('user-1')).expect(200);
    expect(sep.body.balance).toBe(300000 + 200000 - 100000 - 20000);

    const octCarry = await request(app).get('/api/transactions/previous-balance?month=10&year=2026')
      .set('Authorization', auth('user-1')).expect(200);
    expect(octCarry.body.amount).toBe(sep.body.balance);
  });
});