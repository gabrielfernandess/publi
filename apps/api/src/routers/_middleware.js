import jwt from 'jsonwebtoken';
import db from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-trocar-em-prod-min-32-chars';
const isDev = process.env.NODE_ENV !== 'production';

export const COOKIE_NAME = 'pl_session';

// =================== RBAC ===================
export const PAPEIS_VALIDOS = ['admin', 'atendimento', 'preparacao', 'envio', 'publicacao', 'faturamento', 'financeiro'];

// Cada papel tem um CONJUNTO de etapas em que pode ESTAR (e mover pedidos pra elas).
// admin: todas
// atendimento: até cliente_atendido (operacional, nao fatura)
// preparacao: solicitada → aguardando_envio
// envio: em_preparacao → aguardando_publicacao
// publicacao: aguardando_publicacao → cliente_atendido
// faturamento: cliente_atendido → nf_emitida (decisao + emissao da NF)
// financeiro: nf_emitida → recebido (baixa da NF)
export const TRANSICOES_POR_PAPEL = {
  admin: [], // preenchido abaixo com tudo
  atendimento: ['solicitada', 'em_preparacao', 'aguardando_envio', 'enviada', 'cust_pgtos', 'aguardando_publicacao', 'publicacao_recebida', 'cliente_atendido'],
  preparacao: ['solicitada', 'em_preparacao', 'aguardando_envio'],
  envio: ['em_preparacao', 'aguardando_envio', 'enviada', 'cust_pgtos', 'aguardando_publicacao'],
  publicacao: ['aguardando_publicacao', 'publicacao_recebida', 'cliente_atendido'],
  faturamento: ['cliente_atendido', 'aprovacao_faturamento', 'aguardando_nf', 'nf_emitida'],
  financeiro: ['nf_emitida', 'aguardando_pagamento', 'recebido'],
};

// Mapa de transições válidas no fluxo (de -> para)
export const TRANSICOES_VALIDAS = {
  solicitada: ['em_preparacao'],
  em_preparacao: ['solicitada', 'aguardando_envio'],
  aguardando_envio: ['em_preparacao', 'enviada'],
  enviada: ['aguardando_envio', 'cust_pgtos'],
  cust_pgtos: ['enviada', 'aguardando_publicacao'],
  aguardando_publicacao: ['cust_pgtos', 'publicacao_recebida'],
  publicacao_recebida: ['aguardando_publicacao', 'cliente_atendido'],
  cliente_atendido: ['publicacao_recebida', 'aprovacao_faturamento'],
  aprovacao_faturamento: ['cliente_atendido', 'aguardando_nf', 'nf_emitida'],
  aguardando_nf: ['aprovacao_faturamento', 'nf_emitida'],
  nf_emitida: ['aguardando_nf', 'aguardando_pagamento'],
  aguardando_pagamento: ['nf_emitida', 'recebido'],
  recebido: ['aguardando_pagamento'],
};

// Admin pode tudo (todos os status que aparecem no mapa)
TRANSICOES_POR_PAPEL.admin = Array.from(new Set([].concat(...Object.values(TRANSICOES_POR_PAPEL).filter((a) => a !== TRANSICOES_POR_PAPEL.admin))));

/**
 * Verifica se um papel pode mover um pedido de `fromStatus` para `toStatus`.
 * Admin sempre pode. Demais papéis só podem mover se o destino tá nos
 * status que eles controlam E a transição é válida no fluxo.
 */
export function canMove(papel, fromStatus, toStatus) {
  if (papel === 'admin') return true; // admin pode tudo (pular etapas, voltar, etc)
  const permitidas = TRANSICOES_POR_PAPEL[papel] || [];
  if (!permitidas.includes(toStatus)) return false;
  const transicoes = TRANSICOES_VALIDAS[fromStatus] || [];
  return transicoes.includes(toStatus);
}

export function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !isDev && process.env.COOKIE_INSECURE_DEV !== '1',
    path: '/',
    ...(isDev && process.env.COOKIE_INSECURE_DEV === '1' ? { domain: 'localhost' } : {}),
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
  });
}

export function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

export function authMiddleware(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME] || (req.headers.authorization || '').replace(/^Bearer\s+/i, '');

  if (!token) {
    return res.status(401).json({ error: 'Nao autenticado' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, email, nome, papel, ativo FROM users WHERE id = ?').get(payload.sub);

    if (!user || !user.ativo) {
      return res.status(401).json({ error: 'Sessao invalida' });
    }

    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token invalido ou expirado' });
  }
}

export function requirePapel(...papeis) {
  return (req, res, next) => {
    if (!papeis.includes(req.user.papel)) {
      return res.status(403).json({ error: 'Sem permissao' });
    }
    next();
  };
}
