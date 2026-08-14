// Formatadores BR
const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtNum = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const fmtInt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const fmtData = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const fmtDataHora = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const format = {
  brl: (v: number | null | undefined) => (v == null || isNaN(v) ? 'R$ —' : fmtBRL.format(v)),
  num: (v: number | null | undefined, dec = 2) => (v == null || isNaN(v) ? '—' : fmtNum.format(v)),
  int: (v: number | null | undefined) => (v == null || isNaN(v) ? '—' : fmtInt.format(v)),
  cm: (v: number | null | undefined) => (v == null || isNaN(v) ? '— cm' : `${fmtNum.format(v)} cm`),
  data: (iso: string | null | undefined) => {
    if (!iso) return '—';
    // DATE-only (YYYY-MM-DD sem hora) deve ser interpretado como LOCAL,
    // não UTC. Senao "2026-08-14" vira 13/08 em timezones UTC- (ex: BRT).
    // Adiciona T00:00:00 (sem Z) pra forcar interpretacao local.
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
    const d = new Date(isDateOnly ? `${iso}T00:00:00` : iso);
    return isNaN(d.getTime()) ? '—' : fmtData.format(d);
  },
  dataHora: (iso: string | null | undefined) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return isNaN(d.getTime()) ? '—' : fmtDataHora.format(d);
  },
  pct: (v: number, total: number) => (total === 0 ? 0 : Math.round((v / total) * 100)),
};

export function diasAte(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function truncate(s: string | null | undefined, n = 60) {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
