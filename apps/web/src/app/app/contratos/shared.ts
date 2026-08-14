// Helpers compartilhados entre a lista e o detalhe de contratos.

export const VEICULO_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  dou:    { bg: 'bg-navy-50',    text: 'text-navy-700',    dot: 'bg-navy-600',    label: 'DOU' },
  doe:    { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-600', label: 'DOE' },
  jornal: { bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-600',   label: 'JORNAL' },
};

// Cor do percentual faturado — semântica: >=90 vermelho, >=70 âmbar, senão esmeralda.
export function corFaturado(pct: number): string {
  if (pct >= 90) return 'text-red-600';
  if (pct >= 70) return 'text-amber-600';
  return 'text-emerald-700';
}

// Cor da barra de progresso — mesmo padrão do corFaturado, em fundo.
export function corBarra(pct: number): string {
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 70) return 'bg-amber-500';
  return 'bg-emerald-500';
}
