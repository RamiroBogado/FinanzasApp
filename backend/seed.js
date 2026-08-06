import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import db from './src/db.js';

let id = uuid();
const hashed = bcrypt.hashSync('admin', 10);

let existing = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@gmail.com');
if (existing) {
  console.log('El usuario admin ya existe.');
  id = existing.id;
} else {
  db.prepare('INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)').run(id, 'Admin', 'admin@gmail.com', hashed);
  console.log('Usuario admin creado: admin@gmail.com / admin');
}

const cats = [
  { name: 'Sueldo', type: 'income', color: '#10b981' },
  { name: 'Freelance', type: 'income', color: '#3b82f6' },
  { name: 'Inversiones', type: 'income', color: '#8b5cf6' },
  { name: 'Comida', type: 'expense', color: '#ef4444' },
  { name: 'Transporte', type: 'expense', color: '#f59e0b' },
  { name: 'Servicios', type: 'expense', color: '#6366f1' },
  { name: 'Entretenimiento', type: 'expense', color: '#ec4899' },
  { name: 'Salud', type: 'expense', color: '#14b8a6' },
];

const existingCats = db.prepare('SELECT COUNT(*) as count FROM categories WHERE user_id = ?').get(id);
if (existingCats.count === 0) {
  const insert = db.prepare('INSERT INTO categories (id, user_id, name, type, color) VALUES (?, ?, ?, ?, ?)');
  for (const cat of cats) {
    insert.run(uuid(), id, cat.name, cat.type, cat.color);
  }
  console.log('Categorías de ejemplo creadas.');
}

const existingTx = db.prepare('SELECT COUNT(*) as count FROM transactions WHERE user_id = ?').get(id);
if (existingTx.count === 0) {
  const catList = db.prepare('SELECT id, name FROM categories WHERE user_id = ?').all(id);
  const catMap = {};
  for (const c of catList) catMap[c.name] = c.id;

  const txns = [
    { cat: 'Sueldo', amount: 150000, type: 'income', date: '2026-07-01', desc: 'Sueldo mensual' },
    { cat: 'Comida', amount: 25000, type: 'expense', date: '2026-07-02', desc: 'Supermercado' },
    { cat: 'Transporte', amount: 5000, type: 'expense', date: '2026-07-03', desc: 'Uber' },
    { cat: 'Servicios', amount: 12000, type: 'expense', date: '2026-07-05', desc: 'Electricidad' },
    { cat: 'Freelance', amount: 45000, type: 'income', date: '2026-07-10', desc: 'Proyecto web' },
    { cat: 'Entretenimiento', amount: 8000, type: 'expense', date: '2026-07-12', desc: 'Netflix + Spotify' },
    { cat: 'Comida', amount: 15000, type: 'expense', date: '2026-07-15', desc: 'Restaurante' },
    { cat: 'Salud', amount: 7000, type: 'expense', date: '2026-07-18', desc: 'Farmacia' },
    { cat: 'Inversiones', amount: 20000, type: 'income', date: '2026-07-20', desc: 'Dividendos' },
    { cat: 'Comida', amount: 18000, type: 'expense', date: '2026-07-22', desc: 'Delivery' },
  ];

  const insertTx = db.prepare('INSERT INTO transactions (id, user_id, category_id, amount, type, description, date) VALUES (?, ?, ?, ?, ?, ?, ?)');
  for (const tx of txns) {
    const cid = catMap[tx.cat];
    if (cid) insertTx.run(uuid(), id, cid, tx.amount, tx.type, tx.desc, tx.date);
  }
  console.log('Transacciones de ejemplo creadas.');
}

const existingBudget = db.prepare('SELECT COUNT(*) as count FROM budgets WHERE user_id = ?').get(id);
if (existingBudget.count === 0) {
  const catMap = {};
  const catList = db.prepare('SELECT id, name FROM categories WHERE user_id = ? AND type = ?').all(id, 'expense');
  for (const c of catList) catMap[c.name] = c.id;

  const budgets = [
    { cat: 'Comida', amount: 50000 },
    { cat: 'Transporte', amount: 15000 },
    { cat: 'Servicios', amount: 20000 },
    { cat: 'Entretenimiento', amount: 15000 },
  ];

  const insert = db.prepare('INSERT INTO budgets (id, user_id, category_id, month, year, amount) VALUES (?, ?, ?, ?, ?, ?)');
  for (const b of budgets) {
    const cid = catMap[b.cat];
    if (cid) insert.run(uuid(), id, cid, '07', 2026, b.amount);
  }
  console.log('Presupuestos de ejemplo creados.');
}

console.log('Seed completado.');
process.exit(0);
