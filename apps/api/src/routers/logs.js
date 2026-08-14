// Router de Logs (audit log global). Apenas admin pode ler.
import { Router } from 'express';
import db from '../db.js';

const router = Router();

// GET /api/logs - lista audit logs com filtros
// Query params:
//   user_id, acao, entidade, entidade_id, data_ini, data_fim
//   page (default 1), limit (default 50, max 500)
router.get('/', (req, res) => {
  if (req.user.papel !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores podem ver os logs.' });
  }
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 50));
  const offset = (page - 1) * limit;

  const where = [];
  const params = [];
  if (req.query.user_id) { where.push('user_id = ?'); params.push(parseInt(req.query.user_id)); }
  if (req.query.acao) { where.push('acao = ?'); params.push(req.query.acao); }
  if (req.query.entidade) { where.push('entidade = ?'); params.push(req.query.entidade); }
  if (req.query.entidade_id) { where.push('entidade_id = ?'); params.push(parseInt(req.query.entidade_id)); }
  if (req.query.data_ini) { where.push('created_at >= ?'); params.push(req.query.data_ini); }
  if (req.query.data_fim) { where.push('created_at <= ?'); params.push(req.query.data_fim + ' 23:59:59'); }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const total = db.prepare(`SELECT COUNT(*) AS n FROM audit_logs ${whereSql}`).get(...params).n;
  const rows = db.prepare(`
    SELECT id, user_id, user_nome, user_email, acao, entidade, entidade_id, detalhes, ip, user_agent, created_at
    FROM audit_logs
    ${whereSql}
    ORDER BY id DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  // parse detalhes (JSON) — mantem como string pra UI poder mostrar cru se quiser
  res.json({
    data: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

// GET /api/logs/opcoes - lista valores únicos pra popular os filtros
router.get('/opcoes', (req, res) => {
  if (req.user.papel !== 'admin') {
    return res.status(403).json({ error: 'Apenas administradores.' });
  }
  const acoes = db.prepare(`SELECT DISTINCT acao FROM audit_logs ORDER BY acao`).all().map(r => r.acao);
  const entidades = db.prepare(`SELECT DISTINCT entidade FROM audit_logs ORDER BY entidade`).all().map(r => r.entidade);
  const usuarios = db.prepare(`
    SELECT DISTINCT a.user_id, a.user_nome, a.user_email
    FROM audit_logs a
    WHERE a.user_id IS NOT NULL
    ORDER BY a.user_nome
  `).all();
  res.json({ acoes, entidades, usuarios });
});

export default router;
