// Router de usuarios (CRUD). Apenas admin pode gerenciar usuarios.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import db from '../db.js';
import { logAudit } from '../lib/audit.js';

const router = Router();

// GET /api/usuarios - lista (sem senha_hash)
router.get('/', (req, res) => {
  if (req.user.papel !== 'admin') return res.status(403).json({ error: 'Apenas administradores.' });
  const rows = db.prepare(`
    SELECT id, email, nome, papel, ativo, created_at
    FROM users
    ORDER BY nome
  `).all();
  res.json({ data: rows });
});

// GET /api/usuarios/:id
router.get('/:id', (req, res) => {
  if (req.user.papel !== 'admin') return res.status(403).json({ error: 'Apenas administradores.' });
  const u = db.prepare(`SELECT id, email, nome, papel, ativo, created_at FROM users WHERE id = ?`).get(req.params.id);
  if (!u) return res.status(404).json({ error: 'Usuario nao encontrado' });
  res.json({ data: u });
});

// POST /api/usuarios - cria
router.post('/',
  [
    body('email').isEmail().withMessage('E-mail invalido'),
    body('nome').isLength({ min: 2 }).withMessage('Nome obrigatorio'),
    body('papel').isIn(['admin', 'user']).withMessage('Papel invalido'),
    body('senha').isLength({ min: 6 }).withMessage('Senha deve ter no minimo 6 caracteres'),
  ],
  (req, res) => {
    if (req.user.papel !== 'admin') return res.status(403).json({ error: 'Apenas administradores.' });
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { email, nome, papel, senha, ativo } = req.body;
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (exists) return res.status(400).json({ error: 'Ja existe um usuario com este e-mail.' });

    const senha_hash = bcrypt.hashSync(senha, 10);
    const result = db.prepare(`
      INSERT INTO users (email, nome, senha_hash, papel, ativo)
      VALUES (?, ?, ?, ?, ?)
    `).run(email.toLowerCase(), nome, senha_hash, papel, ativo === false ? 0 : 1);

    const novo = db.prepare('SELECT id, email, nome, papel, ativo, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    logAudit(req, { acao: 'create', entidade: 'user', entidadeId: novo.id, detalhes: { email: novo.email, papel: novo.papel } });
    res.status(201).json({ data: novo });
  }
);

// PATCH /api/usuarios/:id - atualiza (nome, papel, ativo, e opcionalmente senha)
router.patch('/:id',
  [
    body('email').optional().isEmail().withMessage('E-mail invalido'),
    body('nome').optional().isLength({ min: 2 }).withMessage('Nome muito curto'),
    body('papel').optional().isIn(['admin', 'user']).withMessage('Papel invalido'),
    body('senha').optional().isLength({ min: 6 }).withMessage('Senha deve ter no minimo 6 caracteres'),
  ],
  (req, res) => {
    if (req.user.papel !== 'admin') return res.status(403).json({ error: 'Apenas administradores.' });
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const id = Number(req.params.id);
    const antes = db.prepare('SELECT id, email, nome, papel, ativo FROM users WHERE id = ?').get(id);
    if (!antes) return res.status(404).json({ error: 'Usuario nao encontrado' });

    // Protecao: nao deixa o admin desativar/excluir a si mesmo
    if (Number(id) === Number(req.user.id) && req.body.ativo === false) {
      return res.status(400).json({ error: 'Voce nao pode desativar seu proprio usuario.' });
    }
    if (Number(id) === Number(req.user.id) && req.body.papel && req.body.papel !== 'admin') {
      return res.status(400).json({ error: 'Voce nao pode rebaixar seu proprio papel.' });
    }

    const fields = [];
    const params = [];
    const changes = {};
    for (const f of ['email', 'nome', 'papel', 'ativo']) {
      if (req.body[f] !== undefined) {
        const val = f === 'email' ? req.body[f].toLowerCase() : (f === 'ativo' ? (req.body[f] ? 1 : 0) : req.body[f]);
        fields.push(`${f} = ?`);
        params.push(val);
        if (String(antes[f]) !== String(val)) changes[f] = { de: antes[f], para: val };
      }
    }
    if (req.body.senha) {
      fields.push('senha_hash = ?');
      params.push(bcrypt.hashSync(req.body.senha, 10));
      changes.senha = '(alterada)';
    }
    if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar.' });

    if (req.body.email) {
      const dupe = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(req.body.email.toLowerCase(), id);
      if (dupe) return res.status(400).json({ error: 'Ja existe outro usuario com este e-mail.' });
    }

    params.push(id);
    db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    const depois = db.prepare('SELECT id, email, nome, papel, ativo, created_at FROM users WHERE id = ?').get(id);
    logAudit(req, { acao: 'update', entidade: 'user', entidadeId: id, detalhes: changes });
    res.json({ data: depois });
  }
);

// DELETE /api/usuarios/:id
router.delete('/:id', (req, res) => {
  if (req.user.papel !== 'admin') return res.status(403).json({ error: 'Apenas administradores.' });
  const id = Number(req.params.id);
  if (id === Number(req.user.id)) return res.status(400).json({ error: 'Voce nao pode excluir seu proprio usuario.' });

  const u = db.prepare('SELECT id, email, nome, papel FROM users WHERE id = ?').get(id);
  if (!u) return res.status(404).json({ error: 'Usuario nao encontrado' });

  // Nao deixa excluir o unico admin restante
  const adminsRestantes = db.prepare(`SELECT COUNT(*) AS n FROM users WHERE papel = 'admin' AND ativo = 1 AND id != ?`).get(id).n;
  if (u.papel === 'admin' && adminsRestantes === 0) {
    return res.status(400).json({ error: 'Nao e possivel excluir o unico administrador ativo.' });
  }

  // Soft delete: desativa ao inves de excluir (mantem historico de auditoria)
  db.prepare('UPDATE users SET ativo = 0 WHERE id = ?').run(id);
  logAudit(req, { acao: 'delete', entidade: 'user', entidadeId: id, detalhes: { email: u.email, papel: u.papel, soft: true } });
  res.json({ ok: true });
});

export default router;
