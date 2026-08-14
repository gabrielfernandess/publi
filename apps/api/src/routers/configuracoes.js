// Router de configuracoes (chave/valor). Apenas admin pode alterar.
import { Router } from 'express';
import db from '../db.js';
import { logAudit } from '../lib/audit.js';

const router = Router();

// GET /api/configuracoes - retorna todas as configs como objeto {chave: valor}
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT chave, valor, updated_at, updated_by FROM configuracoes').all();
  // parse valor como JSON quando possivel, mantem string se nao
  const out = {};
  for (const r of rows) {
    try { out[r.chave] = JSON.parse(r.valor); }
    catch { out[r.chave] = r.valor; }
  }
  res.json({ data: out });
});

// PATCH /api/configuracoes - merge de chaves (apenas admin)
router.patch('/', (req, res) => {
  if (req.user.papel !== 'admin') return res.status(403).json({ error: 'Apenas administradores podem alterar configuracoes.' });
  const body = req.body || {};
  if (typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Body deve ser um objeto chave/valor.' });
  }
  const upsert = db.prepare(`
    INSERT INTO configuracoes (chave, valor, updated_at, updated_by)
    VALUES (?, ?, datetime('now'), ?)
    ON CONFLICT(chave) DO UPDATE SET
      valor = excluded.valor,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by
  `);
  const changes = {};
  const tx = db.transaction(() => {
    for (const [k, v] of Object.entries(body)) {
      const valor = typeof v === 'string' ? v : JSON.stringify(v);
      const antes = db.prepare('SELECT valor FROM configuracoes WHERE chave = ?').get(k);
      if (!antes || antes.valor !== valor) {
        changes[k] = { de: antes ? (() => { try { return JSON.parse(antes.valor); } catch { return antes.valor; } })() : null, para: v };
        upsert.run(k, valor, req.user.id);
      }
    }
  });
  tx();

  if (Object.keys(changes).length > 0) {
    logAudit(req, { acao: 'update', entidade: 'config', entidadeId: null, detalhes: changes });
  }
  res.json({ ok: true, changes: Object.keys(changes) });
});

export default router;
