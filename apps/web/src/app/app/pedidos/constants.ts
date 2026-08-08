export const STATUS_LIST = [
  { id: 'solicitada', label: 'Solicitada', emoji: '📥', cor: 'border-t-slate-400' },
  { id: 'em_preparacao', label: 'Em preparação', emoji: '📋', cor: 'border-t-blue-400' },
  { id: 'aguardando_envio', label: 'Aguardando envio', emoji: '⏳', cor: 'border-t-amber-400' },
  { id: 'enviada', label: 'Enviada', emoji: '📤', cor: 'border-t-indigo-400' },
  { id: 'cust_pgtos', label: 'Custos op.', emoji: '💳', cor: 'border-t-orange-400' },
  { id: 'aguardando_publicacao', label: 'Aguardando publ.', emoji: '📰', cor: 'border-t-purple-400' },
  { id: 'publicacao_recebida', label: 'Publicação recebida', emoji: '📄', cor: 'border-t-teal-400' },
  { id: 'cliente_atendido', label: 'Cliente atendido', emoji: '📲', cor: 'border-t-cyan-400' },
  { id: 'aprovacao_faturamento', label: 'Aprovação', emoji: '👩‍💼', cor: 'border-t-pink-400' },
  { id: 'aguardando_nf', label: 'Aguardando NF', emoji: '🧾', cor: 'border-t-rose-400' },
  { id: 'nf_emitida', label: 'NF emitida', emoji: '💰', cor: 'border-t-emerald-400' },
  { id: 'aguardando_pagamento', label: 'Aguardando pgto', emoji: '💵', cor: 'border-t-yellow-400' },
  { id: 'recebido', label: 'Recebido', emoji: '✅', cor: 'border-t-green-500' },
];

export const STATUS_BY_ID = Object.fromEntries(STATUS_LIST.map((s) => [s.id, s]));

export const FRONT_TRANSICOES: Record<string, string[]> = {
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

// Cada papel tem um CONJUNTO de etapas em que pode ESTAR (e mover pedidos pra elas).
// admin: todas
// atendimento: até cliente_atendido (operacional, nao fatura)
// preparacao: solicitada → aguardando_envio
// envio: em_preparacao → aguardando_publicacao
// publicacao: aguardando_publicacao → cliente_atendido
// faturamento: cliente_atendido → nf_emitida (decisao + emissao da NF)
// financeiro: nf_emitida → recebido (baixa da NF)
export const PAPEIS_ETAPAS: Record<string, string[]> = {
  admin: STATUS_LIST.map((s) => s.id),
  atendimento: ['solicitada', 'em_preparacao', 'aguardando_envio', 'enviada', 'cust_pgtos', 'aguardando_publicacao', 'publicacao_recebida', 'cliente_atendido'],
  preparacao: ['solicitada', 'em_preparacao', 'aguardando_envio'],
  envio: ['em_preparacao', 'aguardando_envio', 'enviada', 'cust_pgtos', 'aguardando_publicacao'],
  publicacao: ['aguardando_publicacao', 'publicacao_recebida', 'cliente_atendido'],
  faturamento: ['cliente_atendido', 'aprovacao_faturamento', 'aguardando_nf', 'nf_emitida'],
  financeiro: ['nf_emitida', 'aguardando_pagamento', 'recebido'],
};

export function canMoveFront(papel: string, from: string, to: string): boolean {
  if (papel === 'admin') return true;
  const etapas = PAPEIS_ETAPAS[papel] || [];
  if (!etapas.includes(to)) return false; // papel nao pode estar na etapa destino
  return (FRONT_TRANSICOES[from] || []).includes(to);
}
