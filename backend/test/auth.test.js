import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { describe, it, expect } from 'vitest';
import { authenticate } from '../src/middleware/auth.js';

const SECRET = 'test-secret';

process.env.JWT_SECRET = SECRET;

function buildApp() {
  const app = express();
  app.get('/protected', authenticate, (req, res) => res.json({ userId: req.userId }));
  return app;
}

describe('authenticate', () => {
  it('devuelve 401 si falta el header', async () => {
    const res = await request(buildApp()).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token requerido');
  });

  it('devuelve 401 con token inválido', async () => {
    const res = await request(buildApp())
      .get('/protected')
      .set('Authorization', 'Bearer token-invalido');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Token inválido');
  });

  it('deja pasar con token válido y fija userId', async () => {
    const token = jwt.sign({ userId: 'user-1' }, SECRET);
    const res = await request(buildApp())
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.userId).toBe('user-1');
  });
});