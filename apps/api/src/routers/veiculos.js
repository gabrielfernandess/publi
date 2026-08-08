import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const { search, tipo, ativo } = req.query;
  let sql = 'SELECT * FROM veiculos WHERE 1=1';
  const params = [];
  if (search) {
    sql += ' AND (LOWER(nome) LIKE ? OR LOWER(estado) LIKE ?)';
    const s = `%${search.toLowerCase()}%`;
    params.push(s, s);
  }
  if (tipo) { sql += ' AND tipo = ?'; params.push(tipo); }
  if (ativo !== undefined) { sql += ' AND ativo = ?'; params.push(ativo === 'true' ? 1 : 0); }
  sql += ' ORDER BY tipo ASC, nome ASC';
  res.json({ data: db.prepare(sql).all(...params) });
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM veiculos WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Veiculo nao encontrado' });
  res.json({ data: row });
});

router.post(
  '/',
  [
    body('nome').isLength({ min: 2 }).withMessage('Nome obrigatorio'),
    body('tipo').isIn(['dou', 'doe', 'jornal']).withMessage('Tipo invalido'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { nome, tipo, estado, custo_cm, observacoes } = req.body;
    const info = db.prepare(`
      INSERT INTO veiculos (nome, tipo, estado, custo_cm, observacoes)
      VALUES (?, ?, ?, ?, ?)
    `).run(nome, tipo, estado || null, Number(custo_cm) || 0, observacoes || null);

    res.status(201).json({ data: db.prepare('SELECT * FROM veiculos WHERE id = ?').get(info.lastInsertRowid) });
  }
);

router.put('/:id',
  [
    body('nome').optional().isLength({ min: 2 }),
    body('tipo').optional().isIn(['dou', 'doe', 'jornal']),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const exists = db.prepare('SELECT id FROM veiculos WHERE id = ?').get(req.params.id);
    if (!exists) return res.status(404).json({ error: 'Veiculo nao encontrado' });

    const fields = ['nome', 'tipo', 'estado', 'custo_cm', 'observacoes', 'ativo'];
    const sets = [];
    const params = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { sets.push(`${f} = ?`); params.push(req.body[f]); }
    }
    if (sets.length === 0) return res.json({ data: db.prepare('SELECT * FROM veiculos WHERE id = ?').get(req.params.id) });
    params.push(req.params.id);
    db.prepare(`UPDATE veiculos SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    res.json({ data: db.prepare('SELECT * FROM veiculos WHERE id = ?').get(req.params.id) });
  }
);

router.delete('/:id', (req, res) => {
  const exists = db.prepare('SELECT id FROM veiculos WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: 'Veiculo nao encontrado' });
  db.prepare('UPDATE veiculos SET ativo = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
