import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import ExcelJS from 'exceljs';
import { describe, it, expect, beforeAll } from 'vitest';

process.env.JWT_SECRET = 'test-secret';
process.env.DB_PATH = ':memory:';

const { default: db } = await import('../src/db.js');
const { default: exportRouter } = await import('../src/routes/export.js');

async function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/export', exportRouter);
  return app;
}

function auth(userId = 'user-1') {
  return `Bearer ${jwt.sign({ userId }, process.env.JWT_SECRET)}`;
}

describe('export: csv, pdf y xlsx comparten filtros y resumen', () => {
  let app;

  beforeAll(async () => {
    app = await buildApp();
    db.prepare("INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)")
      .run('user-1', 'Test', 'test@test.com', 'hash');
    db.prepare("INSERT INTO categories (id, user_id, name, type) VALUES (?, ?, ?, ?)")
      .run('cat-food', 'user-1', 'Comida', 'expense');
    db.prepare("INSERT INTO categories (id, user_id, name, type) VALUES (?, ?, ?, ?)")
      .run('cat-salary', 'user-1', 'Sueldo', 'income');

    const tx = db.prepare("INSERT INTO transactions (id, user_id, category_id, amount, type, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)");
    tx.run('tx-1', 'user-1', 'cat-food', 15000, 'expense', 'Super', '2026-08-10');
    tx.run('tx-2', 'user-1', 'cat-food', 8000, 'expense', 'Mercado', '2026-08-15');
    tx.run('tx-3', 'user-1', 'cat-salary', 500000, 'income', '', '2026-08-05');
    tx.run('tx-4', 'user-1', 'cat-food', 5000, 'expense', 'Bondi', '2026-07-20');
  });

  it('csv: respeta rango de fechas y formato de filas', async () => {
    const res = await request(app).get('/api/export/csv?start_date=2026-08-01&end_date=2026-08-31')
      .set('Authorization', auth())
      .expect(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Fecha,Tipo,Categoría,Descripción,Monto');
    expect(res.text).toContain('"2026-08-10","expense","Comida","Super","15000"');
    expect(res.text).not.toContain('Bondi');
    expect(res.text.trim().split('\n')).toHaveLength(4);
  });

  it('csv: sin resultados devuelve solo el header', async () => {
    const res = await request(app).get('/api/export/csv?search=zzz')
      .set('Authorization', auth())
      .expect(200);
    expect(res.text.trim().split('\n')).toHaveLength(1);
  });

  it('pdf: genera un PDF válido con los filtros aplicados', async () => {
    const res = await request(app).get('/api/export/pdf?category_id=cat-food')
      .set('Authorization', auth())
      .expect(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('transacciones.pdf');
    expect(res.body.length).toBeGreaterThan(1000);
    expect(res.body.slice(0, 4).toString('latin1')).toBe('%PDF');
  });

  it('xlsx: genera un Excel con filas, tipos y totales', async () => {
    const res = await request(app).get('/api/export/xlsx')
      .set('Authorization', auth())
      .responseType('arraybuffer')
      .expect(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
    expect(Buffer.from(res.body).slice(0, 2).toString('latin1')).toBe('PK');

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(res.body));
    const ws = wb.getWorksheet('Transacciones');

    const dates = [];
    for (let r = 2; r <= 5; r++) dates.push(ws.getCell(r, 1).value);
    expect(dates).toContain('2026-08-10');
    expect(dates).toContain('2026-07-20');
    expect(ws.getCell(2, 1).value).toBe('2026-08-15');
    expect(ws.getCell(3, 1).value).toBe('2026-08-10');
    expect(ws.getCell(5, 1).value).toBe('2026-07-20');
    expect(ws.getCell(2, 2).value).toBe('Gasto');
    expect(ws.getCell(4, 2).value).toBe('Ingreso');
    expect(ws.getCell(3, 5).value).toBe(15000);

    expect(ws.getCell(7, 4).value).toBe('Total ingresos');
    expect(ws.getCell(7, 5).value).toBe(500000);
    expect(ws.getCell(8, 5).value).toBe(28000);
    expect(ws.getCell(9, 5).value).toBe(472000);
  });

  it('xlsx: respeta los filtros activos', async () => {
    const res = await request(app).get('/api/export/xlsx?type=income')
      .set('Authorization', auth())
      .responseType('arraybuffer')
      .expect(200);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(res.body));
    const ws = wb.getWorksheet('Transacciones');
    expect(ws.getCell(2, 1).value).toBe('2026-08-05');
    expect(ws.getCell(3, 1).value).toBeNull();
    expect(ws.getCell(4, 4).value).toBe('Total ingresos');
    expect(ws.getCell(4, 5).value).toBe(500000);
  });

  it('xlsx: sin resultados agrega aviso y totales cero', async () => {
    const res = await request(app).get('/api/export/xlsx?search=zzz')
      .set('Authorization', auth())
      .responseType('arraybuffer')
      .expect(200);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(Buffer.from(res.body));
    const ws = wb.getWorksheet('Transacciones');
    expect(ws.getCell(2, 1).value).toContain('Sin movimientos');
  });
});