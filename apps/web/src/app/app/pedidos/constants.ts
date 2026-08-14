import {
  Inbox, ClipboardList, Clock, Send, CreditCard, Newspaper, FileText, PhoneCall,
  ClipboardCheck, Receipt, Banknote, Wallet, CheckCircle2,
  type LucideIcon,
} from 'lucide-react';

export type Tone =
  | 'slate' | 'blue' | 'amber' | 'indigo' | 'orange' | 'purple'
  | 'teal' | 'cyan' | 'pink' | 'rose' | 'emerald' | 'yellow' | 'green';

export type StatusMeta = {
  id: string;
  label: string;
  icon: LucideIcon;
  tone: Tone;
};

export const STATUS_LIST: StatusMeta[] = [
  { id: 'solicitada', label: 'Solicitada', icon: Inbox, tone: 'slate' },
  { id: 'em_preparacao', label: 'Em preparação', icon: ClipboardList, tone: 'blue' },
  { id: 'aguardando_envio', label: 'Aguardando envio', icon: Clock, tone: 'amber' },
  { id: 'enviada', label: 'Enviada', icon: Send, tone: 'indigo' },
  { id: 'cust_pgtos', label: 'Custos operacionais', icon: CreditCard, tone: 'orange' },
  { id: 'aguardando_publicacao', label: 'Aguardando publicação', icon: Newspaper, tone: 'purple' },
  { id: 'publicacao_recebida', label: 'Publicação recebida', icon: FileText, tone: 'teal' },
  { id: 'cliente_atendido', label: 'Cliente atendido', icon: PhoneCall, tone: 'cyan' },
  { id: 'aprovacao_faturamento', label: 'Aprovação', icon: ClipboardCheck, tone: 'pink' },
  { id: 'aguardando_nf', label: 'Aguardando NF', icon: Receipt, tone: 'rose' },
  { id: 'nf_emitida', label: 'NF emitida', icon: Banknote, tone: 'emerald' },
  { id: 'aguardando_pagamento', label: 'Aguardando pagamento', icon: Wallet, tone: 'yellow' },
  { id: 'recebido', label: 'Recebido', icon: CheckCircle2, tone: 'green' },
];

export const STATUS_BY_ID = Object.fromEntries(STATUS_LIST.map((s) => [s.id, s])) as Record<string, StatusMeta>;

// Par de classes (bg + text) para o ícone tingido de cada tom. Strings literais
// para o purge do Tailwind detectar todas as classes usadas.
export const TONE_CLASSES: Record<Tone, string> = {
  slate: 'bg-slate-50 text-slate-600',
  blue: 'bg-blue-50 text-blue-600',
  amber: 'bg-amber-50 text-amber-700',
  indigo: 'bg-indigo-50 text-indigo-600',
  orange: 'bg-orange-50 text-orange-700',
  purple: 'bg-purple-50 text-purple-600',
  teal: 'bg-teal-50 text-teal-700',
  cyan: 'bg-cyan-50 text-cyan-700',
  pink: 'bg-pink-50 text-pink-700',
  rose: 'bg-rose-50 text-rose-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  yellow: 'bg-yellow-50 text-yellow-700',
  green: 'bg-green-50 text-green-700',
};

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
// user: ate cliente_atendido (operacional, NAO fatura nem baixa NF)
export const PAPEIS_ETAPAS: Record<string, string[]> = {
  admin: STATUS_LIST.map((s) => s.id),
  user: ['solicitada', 'em_preparacao', 'aguardando_envio', 'enviada', 'cust_pgtos', 'aguardando_publicacao', 'publicacao_recebida', 'cliente_atendido'],
};

export function canMoveFront(papel: string, from: string, to: string): boolean {
  if (papel === 'admin') return true;
  const etapas = PAPEIS_ETAPAS[papel] || [];
  if (!etapas.includes(to)) return false; // papel nao pode estar na etapa destino
  return (FRONT_TRANSICOES[from] || []).includes(to);
}
