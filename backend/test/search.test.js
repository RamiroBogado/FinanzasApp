import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { describe, it, expect, beforeAll } from 'vitest';

import { parseSearchNumber } from '../src/utils/search.js';

process.env.JWT_SECRET = 'test-secret';
process.env.DB_PATH = ':memory:';

const { default: db } = await import('../src/db.js');
const { default: transactionsRouter } = await import('../src/routes/transactions.js');
const { default: exportRouter } = await import('../src/routes/export.js');

async function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/transactions', transactionsRouter);
  app.use('/api/export', exportRouter);
  return app;
}

function auth(userId) {
  return `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET)}`;
}

const seedTransaction = db.prepare(`
  INSERT INTO transactions (id, user_id, category_id, amount, type, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)
`);

describe('busqueda por descripcion y monto', () => {
  let app;

  beforeAll(async () => {
    app = await buildApp();

    db.prepare("INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)")
      .run('user-1', 'Uno', 'uno@test.com', 'hash');
    db.prepare("INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)")
      .run('user-2', 'Dos', 'dos@test.com', 'hash');

    db.prepare("INSERT INTO categories (id, user_id, name, type) VALUES (?, ?, ?, ?)")
      .run('cat-income', 'user-1', 'Sueldo', 'income');
    db.prepare("INSERT INTO categories (id, user_id, name, type) VALUES (?, ?, ?, ?)")
      .run('cat-expense', 'user-1', 'Compras', 'expense');
    db.prepare("INSERT INTO categories (id, user_id, name, type) VALUES (?, ?, ?, ?)")
      .run('cat-income-2', 'user-2', 'Sueldo', 'income');

    seedTransaction.run('t1', 'user-1', 'cat-income', 500000, 'income', 'Sueldo agosto', '2026-08-05');
    seedTransaction.run('t2', 'user-1', 'cat-expense', 15000, 'expense', 'Supermercado', '2026-08-10');
    seedTransaction.run('t3', 'user-1', 'cat-expense', 150000, 'expense', 'Notebook', '2026-08-12');
    seedTransaction.run('t4', 'user-1', 'cat-expense', 15000.5, 'expense', 'Farmacia', '2026-08-14');
    seedTransaction.run('t5', 'user-1', 'cat-income', 15000.5, 'income', 'Reintegro obra social', '2026-08-20');
    seedTransaction.run('t6', 'user-2', 'cat-income-2', 15000, 'income', 'Sueldo julio', '2026-07-01');
  });

  it('parseSearchNumber: formatos enteros, decimales y argentino', () => {
    expect(parseSearchNumber('15000')).toBe(15000);
    expect(parseSearchNumber('15000.50')).toBe(15000.5);
    expect(parseSearchNumber('15.000,50')).toBe(15000.5);
    expect(parseSearchNumber('15,000.50')).toBe(15000.5);
    expect(parseSearchNumber('15.000')).toBe(15000);
    expect(parseSearchNumber('1500,50')).toBe(1500.5);
    expect(parseSearchNumber('supermercado')).toBeNull();
    expect(parseSearchNumber('')).toBeNull();
  });

  it('buscar por palabra de descripcion sigue funcionando igual', async () => {
    const res = await request(app).get('/api/transactions?search=supermercado')
      .set('Authorization', auth('user-1')).expect(200);
    expect(res.body.map(t => t.id)).toEqual(['t2']);

    const sub = await request(app).get('/api/transactions?search=mercado')
      .set('Authorization', auth('user-1')).expect(200);
    expect(sub.body.map(t => t.id)).toEqual(['t2']);
  });

  it('monto exacto: 15000 encuentra solo la transaccion de 15000 (no 150000)', async () => {
    const res = await request(app).get('/api/transactions?search=15000')
      .set('Authorization', auth('user-1')).expect(200);
    expect(res.body.map(t => t.id)).toEqual(['t2']);
  });

  it('monto decimal: 15000.50 encuentra gasto e ingreso', async () => {
    const res = await request(app).get('/api/transactions?search=15000.50')
      .set('Authorization', auth('user-1')).expect(200);
    expect(res.body.map(t => t.id).sort()).toEqual(['t4', 't5']);
  });

  it('formato argentino: 15.000,50 encuentra las mismas transacciones decimales', async () => {
    const res = await request(app).get('/api/transactions?search=15.000,50')
      .set('Authorization', auth('user-1')).expect(200);
    expect(res.body.map(t => t.id).sort()).toEqual(['t4', 't5']);
  });

  it('monto de un ingreso y monto de un gasto', async () => {
    const income = await request(app).get('/api/transactions?search=500000')
      .set('Authorization', auth('user-1')).expect(200);
    expect(income.body.map(t => t.id)).toEqual(['t1']);
    expect(income.body[0].type).toBe('income');

    const expense = await request(app).get('/api/transactions?search=150000')
      .set('Authorization', auth('user-1')).expect(200);
    expect(expense.body.map(t => t.id)).toEqual(['t3']);
    expect(expense.body[0].type).toBe('expense');
  });

  it('monto combinado con Tipo', async () => {
    const expenses = await request(app).get('/api/transactions?search=15000.5&type=expense')
      .set('Authorization', auth('user-1')).expect(200);
    expect(expenses.body.map(t => t.id)).toEqual(['t4']);

    const incomes = await request(app).get('/api/transactions?search=15000.5&type=income')
      .set('Authorization', auth('user-1')).expect(200);
    expect(incomes.body.map(t => t.id)).toEqual(['t5']);
  });

  it('monto combinado con Categoria', async () => {
    const res = await request(app).get('/api/transactions?search=15000.5&category_id=cat-expense')
      .set('Authorization', auth('user-1')).expect(200);
    expect(res.body.map(t => t.id)).toEqual(['t4']);
  });

  it('monto combinado con Desde/Hasta', async () => {
    const res = await request(app).get('/api/transactions?search=15000.5&start_date=2026-08-15&end_date=2026-08-31')
      .set('Authorization', auth('user-1')).expect(200);
    expect(res.body.map(t => t.id)).toEqual(['t5']);
  });

  it('aislamiento entre usuarios: cada uno ve sus propias transacciones', async () => {
    const res = await request(app).get('/api/transactions?search=15000')
      .set('Authorization', auth('user-2')).expect(200);
    expect(res.body.map(t => t.id)).toEqual(['t6']);
  });

  it('CSV respeta la busqueda por monto', async () => {
    const res = await request(app).get('/api/export/csv?search=15000.5')
      .set('Authorization', auth('user-1')).expect(200);
    expect(res.text).toContain('Farmacia');
    expect(res.text).toContain('Reintegro obra social');
    expect(res.text).not.toContain('Supermercado');
    expect(res.text).not.toContain('Notebook');
  });

  it('CSV combina monto con tipo y mantiene descripcion', async () => {
    const res = await request(app).get('/api/export/csv?search=15000.5&type=expense')
      .set('Authorization', auth('user-1')).expect(200);
    expect(res.text).toContain('Farmacia');
    expect(res.text).not.toContain('Reintegro obra social');

    const desc = await request(app).get('/api/export/csv?search=supermercado')
      .set('Authorization', auth('user-1')).expect(200);
    expect(desc.text).toContain('Supermercado');
    expect(desc.text).not.toContain('Farmacia');
  });
});