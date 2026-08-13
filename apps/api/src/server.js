import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// garante pasta de uploads
const uploadsDir = path.resolve(__dirname, '../uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
console.log(`[publi-legal/api] uploads: ${uploadsDir}`);

import authRouter from './routers/auth.js';
import clientesRouter from './routers/clientes.js';
import veiculosRouter from './routers/veiculos.js';
import contratosRouter from './routers/contratos.js';
import pedidosRouter from './routers/pedidos.js';
import dashboardRouter from './routers/dashboard.js';
import notasFiscaisRouter from './routers/notas-fiscais.js';
import financeiroRouter from './routers/financeiro.js';
import faturamentoRouter from './routers/faturamento.js';
import { authMiddleware } from './routers/_middleware.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const isDev = process.env.NODE_ENV !== 'production';

// Segurança
app.use(helmet({
  contentSecurityPolicy: false, // dev only
}));

// CORS
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('CORS bloqueado: origem nao autorizada'));
  },
  credentials: true,
}));

// Body & cookies
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Rate limit geral
const geralLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisicoes. Tente novamente em instantes.' },
});
app.use(geralLimiter);

// Rate limit agressivo pra auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Tente em 15 min.' },
});

// Health
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// Public
app.use('/api/auth', authLimiter, authRouter);

// Protected
app.use('/api/clientes', authMiddleware, clientesRouter);
app.use('/api/veiculos', authMiddleware, veiculosRouter);
app.use('/api/contratos', authMiddleware, contratosRouter);
app.use('/api/pedidos', authMiddleware, pedidosRouter);
app.use('/api/dashboard', authMiddleware, dashboardRouter);
app.use('/api/notas-fiscais', authMiddleware, notasFiscaisRouter);
app.use('/api/financeiro', authMiddleware, financeiroRouter);
app.use('/api/faturamentos', authMiddleware, faturamentoRouter);

// 404
app.use((_req, res) => res.status(404).json({ error: 'Rota nao encontrada' }));

// Serve arquivos de upload (protegido por auth)
app.use('/uploads', authMiddleware, express.static(uploadsDir));

// Error handler
app.use((err, _req, res, _next) => {
  console.error('[ERRO]', err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Erro interno' });
});

app.listen(PORT, () => {
  console.log(`[publi-legal/api] rodando em http://localhost:${PORT}`);
  console.log(`[publi-legal/api] health: http://localhost:${PORT}/health`);
  console.log(`[publi-legal/api] CORS: ${allowedOrigins.join(', ')}`);
});
