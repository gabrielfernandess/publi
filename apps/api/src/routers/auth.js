import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import db from '../db.js';
import { setAuthCookie, clearAuthCookie, authMiddleware, COOKIE_NAME } from './_middleware.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-trocar-em-prod-min-32-chars';

// 1h
const RESET_TTL_MIN = 60;
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
const isDev = process.env.NODE_ENV !== 'production';

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function sendResetLink(user, rawToken) {
  const link = `${APP_BASE_URL.replace(/\/+$/, '')}/redefinir-senha?token=${rawToken}`;
  // MVP: loga no console. Em prod com SMTP_* configurado, troque por envio real.
  console.log(`[auth/recuperar] link de redefinicao para ${user.email}: ${link}`);
  return link;
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, papel: user.papel },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('E-mail invalido'),
    body('senha').isLength({ min: 3 }).withMessage('Senha obrigatoria'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { email, senha } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ? AND ativo = 1').get(email.toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }

    const ok = bcrypt.compareSync(senha, user.senha_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciais invalidas' });
    }

    const token = signToken(user);
    setAuthCookie(res, token);

    res.json({
      user: { id: user.id, email: user.email, nome: user.nome, papel: user.papel },
      token,
    });
  }
);

router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// ============ Recuperacao de senha ============

// 1) Solicitar redefinicao. Sempre devolve 200 pra nao vazar quais emails existem.
router.post(
  '/recuperar',
  [body('email').isEmail().withMessage('E-mail invalido')],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const email = String(req.body.email).toLowerCase();
    const user = db.prepare('SELECT id, email, nome FROM users WHERE email = ? AND ativo = 1').get(email);

    let devLink = null;
    if (user) {
      const raw = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashToken(raw);
      const expires = new Date(Date.now() + RESET_TTL_MIN * 60 * 1000).toISOString();

      // invalida resets anteriores ainda validos
      db.prepare('UPDATE password_resets SET usado_em = datetime(\'now\') WHERE user_id = ? AND usado_em IS NULL').run(user.id);
      db.prepare('INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (?, ?, ?)').run(user.id, tokenHash, expires);

      const link = sendResetLink(user, raw);
      if (isDev) devLink = link;
    }

    res.json({
      ok: true,
      message: 'Se o e-mail estiver cadastrado, voce recebera as instrucoes em instantes.',
      ...(isDev && devLink ? { devLink } : {}),
    });
  }
);

// 2) Validar token (chamado pela pagina de redefinicao antes de mostrar o form)
router.get('/redefinir/validar', (req, res) => {
  const raw = String(req.query.token || '');
  if (!raw || raw.length < 16) return res.status(400).json({ valid: false, error: 'Token invalido' });

  const tokenHash = hashToken(raw);
  const row = db.prepare(`
    SELECT pr.expires_at, pr.usado_em, u.email
    FROM password_resets pr
    JOIN users u ON u.id = pr.user_id
    WHERE pr.token_hash = ?
  `).get(tokenHash);

  if (!row) return res.status(404).json({ valid: false, error: 'Token nao encontrado' });
  if (row.usado_em) return res.status(410).json({ valid: false, error: 'Este link ja foi utilizado' });
  if (new Date(row.expires_at) < new Date()) return res.status(410).json({ valid: false, error: 'Este link expirou' });

  res.json({ valid: true, email: row.email });
});

// 3) Confirmar nova senha
router.post(
  '/redefinir',
  [
    body('token').isLength({ min: 16 }).withMessage('Token invalido'),
    body('senha').isLength({ min: 6 }).withMessage('Senha deve ter no minimo 6 caracteres'),
    body('confirmar').custom((v, { req }) => v === req.body.senha).withMessage('As senhas nao conferem'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const raw = String(req.body.token);
    const novaSenha = String(req.body.senha);
    const tokenHash = hashToken(raw);

    const row = db.prepare(`
      SELECT pr.id, pr.user_id, pr.expires_at, pr.usado_em
      FROM password_resets pr
      WHERE pr.token_hash = ?
    `).get(tokenHash);

    if (!row) return res.status(404).json({ error: 'Token nao encontrado' });
    if (row.usado_em) return res.status(410).json({ error: 'Este link ja foi utilizado' });
    if (new Date(row.expires_at) < new Date()) return res.status(410).json({ error: 'Este link expirou' });

    const senha_hash = bcrypt.hashSync(novaSenha, 10);

    const tx = db.transaction(() => {
      db.prepare('UPDATE users SET senha_hash = ? WHERE id = ?').run(senha_hash, row.user_id);
      db.prepare('UPDATE password_resets SET usado_em = datetime(\'now\') WHERE id = ?').run(row.id);
    });
    tx();

    res.json({ ok: true, message: 'Senha redefinida com sucesso' });
  }
);

export default router;
