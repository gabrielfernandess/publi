import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import db from '../db.js';

const router = Router();

// LISTAR
router.get('/', (req, res) => {
  const { search, tipo, ativo } = req.query;
  let sql = 'SELECT * FROM clientes WHERE 1=1';
  const params = [];
  if (search) {
    sql += ' AND (LOWER(nome) LIKE ? OR LOWER(municipio) LIKE ? OR cnpj LIKE ?)';
    const s = `%${search.toLowerCase()}%`;
    params.push(s, s, s);
  }
  if (tipo) { sql += ' AND tipo = ?'; params.push(tipo); }
  if (ativo !== undefined) { sql += ' AND ativo = ?'; params.push(ativo === 'true' ? 1 : 0); }
  sql += ' ORDER BY nome ASC';
  const rows = db.prepare(sql).all(...params);
  res.json({ data: rows });
});

// OBTER 1
router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Cliente nao encontrado' });

  const contratos = db.prepare(`
    SELECT c.*, COUNT(ci.id) as total_itens
    FROM contratos c
    LEFT JOIN contrato_itens ci ON ci.contrato_id = c.id
    WHERE c.cliente_id = ?
    GROUP BY c.id
    ORDER BY c.data_inicio DESC
  `).all(req.params.id);

  res.json({ data: { ...row, contratos } });
});

// CRIAR
router.post(
  '/',
  [
    body('nome').isLength({ min: 2 }).withMessage('Nome obrigatorio'),
    body('tipo').isIn(['prefeitura', 'camara', 'autarquia', 'outros']).withMessage('Tipo invalido'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { nome, tipo, cnpj, municipio, estado, contato_nome, contato_email, contato_telefone, observacoes } = req.body;
    const info = db.prepare(`
      INSERT INTO clientes (nome, tipo, cnpj, municipio, estado, contato_nome, contato_email, contato_telefone, observacoes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(nome, tipo, cnpj || null, municipio || null, estado || null, contato_nome || null, contato_email || null, contato_telefone || null, observacoes || null);

    const created = db.prepare('SELECT * FROM clientes WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ data: created });
  }
);

// ATUALIZAR
router.put('/:id',
  [
    body('nome').optional().isLength({ min: 2 }),
    body('tipo').optional().isIn(['prefeitura', 'camara', 'autarquia', 'outros']),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const exists = db.prepare('SELECT id FROM clientes WHERE id = ?').get(req.params.id);
    if (!exists) return res.status(404).json({ error: 'Cliente nao encontrado' });

    const fields = ['nome', 'tipo', 'cnpj', 'municipio', 'estado', 'contato_nome', 'contato_email', 'contato_telefone', 'observacoes', 'ativo'];
    const sets = [];
    const params = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { sets.push(`${f} = ?`); params.push(req.body[f]); }
    }
    if (sets.length === 0) return res.json({ data: db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id) });
    params.push(req.params.id);
    db.prepare(`UPDATE clientes SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    res.json({ data: db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id) });
  }
);

// DELETAR (soft delete)
router.delete('/:id', (req, res) => {
  const exists = db.prepare('SELECT id FROM clientes WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: 'Cliente nao encontrado' });
  db.prepare('UPDATE clientes SET ativo = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
