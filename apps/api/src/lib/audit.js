// Helper de audit log. Registra acoes sensiveis em audit_logs para auditoria.
// Uso: logAudit(req, { acao: 'delete', entidade: 'pedido', entidadeId: 12, detalhes: { ... } })
// Onde req e' o request do Express (pra pegar user, ip, user-agent).
import db from '../db.js';

const stmt = db.prepare(`
  INSERT INTO audit_logs (user_id, user_nome, user_email, acao, entidade, entidade_id, detalhes, ip, user_agent)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

/**
 * Registra um evento de auditoria.
 * @param {object|null} req - request do Express (opcional)
 * @param {object} ev
 * @param {string} ev.acao         - 'create' | 'update' | 'delete' | 'login' | 'login_fail' | 'export' | 'cancel' | 'restore' | 'approve' | 'reject'
 * @param {string} ev.entidade     - 'pedido' | 'contrato' | 'cliente' | 'user' | 'nf' | 'auth' | 'faturamento' | 'boleto' | 'config'
 * @param {number|null} ev.entidadeId
 * @param {object|string|null} ev.detalhes - objeto (sera JSON.stringify) ou string
 * @param {object|null} ev.user    - override do user (caso nao tenha req.user)
 */
export function logAudit(req, { acao, entidade, entidadeId, detalhes, user } = {}) {
  try {
    const u = user || req?.user || null;
    const ip = (req?.headers?.['x-forwarded-for']?.toString().split(',')[0].trim()) || req?.ip || null;
    const userAgent = req?.headers?.['user-agent'] || null;
    const detalhesStr = detalhes == null
      ? null
      : typeof detalhes === 'string' ? detalhes : JSON.stringify(detalhes);
    stmt.run(
      u?.id || null,
      u?.nome || null,
      u?.email || null,
      acao,
      entidade,
      entidadeId ?? null,
      detalhesStr,
      ip,
      userAgent,
    );
  } catch (e) {
    // nao derruba a request se audit falhar
    console.error('[audit] erro ao registrar:', e?.message || e);
  }
}
