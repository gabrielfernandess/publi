import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import db from '../db.js';
import { setAuthCookie, clearAuthCookie, authMiddleware, COOKIE_NAME } from './_middleware.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-trocar-em-prod-min-32-chars';

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

export default router;
