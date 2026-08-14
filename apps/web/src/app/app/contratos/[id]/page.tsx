'use client';

import { useEffect, useState, use as usePromise } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, AlertTriangle, Edit2, Receipt, Building2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useIsAdmin } from '@/lib/auth';
import { format } from '@/lib/format';
import { cn } from '@/lib/utils';

type VeiculoResumo = { cm_contratado: number; cm_utilizado: number; cm_disponivel: number };
type CmPorVeiculo = { dou?: VeiculoResumo; doe?: VeiculoResumo; jornal?: VeiculoResumo };

type ContratoDetalhe = {
  id: number;
  cliente_nome: string;
  cliente_tipo: string;
  cliente_municipio: string;
  cliente_estado: string;
  numero?: string;
  objeto?: string;
  data_inicio: string;
  data_fim: string;
  modalidade?: string;
  processo?: string;
  status: string;
  dias_para_vencer: number | null;
  itens: Array<{
    id: number;
    descricao: string;
    veiculo_nome: string;
    veiculo_tipo: string;
    cm_contratado: number;
    cm_utilizado: number;
    valor_unitario_venda: number;
    valor_unitario_custo: number;
  }>;
  pedidos: Array<{ id: number; data_solicitacao: string; categoria: string; status: string; descricao: string }>;
};

type Movimentacao = {
  data: string;
  tipo: string;
  veiculo_tipo: string;
  veiculo_nome: string;
  numero_nf: string;
  nf_id: number;
  pedido_id: number;
  cm: number;
  cm_abs: number;
  saldo_apos: number;
  usuario_nome: string;
  observacoes?: string;
};

const VEICULO_STYLE: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  dou:    { bg: 'bg-navy-50',     text: 'text-navy-700',     dot: 'bg-navy-600',     label: 'DOU' },
  doe:    { bg: 'bg-emerald-50',  text: 'text-emerald-700',  dot: 'bg-emerald-600',  label: 'DOE' },
  jornal: { bg: 'bg-amber-50',    text: 'text-amber-700',    dot: 'bg-amber-600',    label: 'JORNAL' },
};

function corFaturado(pct: number): string {
  if (pct >= 90) return 'text-red-600';
  if (pct >= 70) return 'text-amber-600';
  return 'text-emerald-700';
}

function corBarra(pct: number): string {
  if (pct >= 90) return 'bg-red-500';
  if (pct >= 70) return 'bg-amber-500';
  return 'bg-emerald-500';
}

function statusContrato(c: { status: string; dias_para_vencer: number | null; itens?: any[]; cm_total_contratado?: number; cm_total_utilizado?: number }): { label: string; cor: string } {
  const dias = c.dias_para_vencer;
  if (c.status !== 'ativo') return { label: 'Encerrado', cor: 'bg-ink-100 text-ink-700' };
  if (dias !== null && dias < 0) return { label: 'Vencido', cor: 'bg-red-100 text-red-700' };
  if (dias !== null && dias <= 60) return { label: 'A vencer', cor: 'bg-sky-100 text-sky-700' };
  return { label: 'Vigente', cor: 'bg-emerald-100 text-emerald-700' };
}

export default function ContratoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const isAdmin = useIsAdmin();
  const [data, setData] = useState<ContratoDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [movs, setMovs] = useState<Movimentacao[] | null>(null);

  useEffect(() => {
    api.get<{ data: ContratoDetalhe }>(`/api/contratos/${id}`)
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
    api.get<{ data: Movimentacao[] }>(`/api/contratos/${id}/movimentacoes`)
      .then((r) => setMovs(r.data))
      .catch(() => setMovs([]));
  }, [id]);

  if (loading) return <div className="p-8 text-sm text-ink-500">Carregando contrato...</div>;
  if (!data) return <div className="p-8 text-sm text-ink-500">Contrato não encontrado.</div>;

  // Calcular cm_por_veiculo a partir dos itens
  const cmPorVeiculo: CmPorVeiculo = (() => {
    const out: CmPorVeiculo = {};
    (['dou', 'doe', 'jornal'] as const).forEach((tipo) => {
      const itensTipo = data.itens.filter((i) => i.veiculo_tipo === tipo);
      if (itensTipo.length > 0) {
        const cm_contratado = itensTipo.reduce((acc, i) => acc + i.cm_contratado, 0);
        const cm_utilizado = itensTipo.reduce((acc, i) => acc + i.cm_utilizado, 0);
        out[tipo] = { cm_contratado, cm_utilizado, cm_disponivel: cm_contratado - cm_utilizado };
      }
    });
    return out;
  })();

  const totalContratado = data.itens.reduce((acc, i) => acc + i.cm_contratado, 0);
  const totalUtilizado = data.itens.reduce((acc, i) => acc + i.cm_utilizado, 0);
  const totalValorVenda = data.itens.reduce((acc, i) => acc + i.cm_contratado * i.valor_unitario_venda, 0);
  const totalValorUtilizado = data.itens.reduce((acc, i) => acc + i.cm_utilizado * i.valor_unitario_venda, 0);
  const totalPct = totalContratado > 0 ? (totalUtilizado / totalContratado) * 100 : 0;
  const st = statusContrato(data);

  return (
    <div>
      <Link href="/app/contratos" className="inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-800 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Voltar para contratos
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-ink-500 mb-1">
            <Building2 className="w-3.5 h-3.5" />
            {data.cliente_nome} • {data.cliente_municipio}/{data.cliente_estado}
          </div>
          <h1 className="text-2xl font-bold text-ink-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-700" />
            Contrato {data.numero || `#${data.id}`}
          </h1>
        </div>
        <span className={cn('inline-flex items-center px-3 py-1.5 rounded-pill text-xs font-bold uppercase tracking-wider', st.cor)}>
          {st.label}
        </span>
      </div>

      {/* 3 cards: Detalhes / Saldos por Veículo / Informações */}
      <div className="grid lg:grid-cols-3 gap-4 mb-5">
        {/* Detalhes do contrato */}
        <Card>
          <div className="p-5">
            <p className="text-[10px] font-bold text-ink-500 uppercase tracking-widest mb-3">Detalhes do contrato</p>
            <h3 className="text-base font-bold text-ink-900">{data.cliente_municipio}{data.cliente_estado ? ` - ${data.cliente_estado}` : ''}</h3>
            <span className={cn('inline-block mt-2 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider', st.cor)}>
              {st.label}
            </span>
            <dl className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between gap-3"><dt className="text-ink-500 whitespace-nowrap">Contrato</dt><dd className="font-mono text-ink-800">{data.numero || `#${data.id}`}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink-500 whitespace-nowrap">Vigência</dt><dd className="text-ink-800 text-right">{format.data(data.data_inicio)} a {format.data(data.data_fim)}</dd></div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500 whitespace-nowrap">Dias restantes</dt>
                <dd className={cn('font-semibold', (data.dias_para_vencer ?? 0) < 0 ? 'text-red-600' : (data.dias_para_vencer ?? 0) <= 60 ? 'text-amber-600' : 'text-ink-800')}>
                  {data.dias_para_vencer !== null
                    ? (data.dias_para_vencer < 0 ? `${Math.abs(data.dias_para_vencer)}d vencido` : `${data.dias_para_vencer}d`)
                    : '—'}
                </dd>
              </div>
              <div className="flex justify-between gap-3"><dt className="text-ink-500 whitespace-nowrap">Data de assinatura</dt><dd className="text-ink-800">{format.data(data.data_inicio)}</dd></div>
              <div className="pt-2 border-t border-ink-100">
                <dt className="text-ink-500 mb-1">Observações</dt>
                <dd className="text-ink-700 leading-relaxed">{data.objeto || '—'}</dd>
              </div>
            </dl>
          </div>
        </Card>

        {/* Saldos por veículo */}
        <Card>
          <div className="p-5">
            <p className="text-[10px] font-bold text-ink-500 uppercase tracking-widest mb-3">Saldos por veículo</p>
            <div className="space-y-3">
              {(['dou', 'doe', 'jornal'] as const).map((tipo) => {
                const v = cmPorVeiculo[tipo];
                const meta = VEICULO_STYLE[tipo];
                if (!v) {
                  return (
                    <div key={tipo} className={cn('rounded-lg border border-ink-200 p-3 opacity-50', meta.bg)}>
                      <div className="flex items-center gap-2">
                        <span className={cn('w-7 h-7 rounded-md bg-white border border-ink-200 flex items-center justify-center text-[10px] font-bold', meta.text)}>{meta.label}</span>
                        <span className="text-xs text-ink-400">não contratado</span>
                      </div>
                    </div>
                  );
                }
                const pct = v.cm_contratado > 0 ? (v.cm_utilizado / v.cm_contratado) * 100 : 0;
                return (
                  <div key={tipo} className={cn('rounded-lg border border-ink-200 p-3', meta.bg)}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={cn('w-7 h-7 rounded-md bg-white flex items-center justify-center text-[10px] font-bold', meta.text)}>{meta.label}</span>
                      <span className="text-sm font-bold text-ink-900">{meta.label}</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-ink-600">Contratado</span><span className="font-mono font-semibold text-ink-900">{format.cm(v.cm_contratado)}</span></div>
                      <div className="flex justify-between"><span className="text-ink-600">Faturado</span><span className={cn('font-mono font-semibold', corFaturado(pct))}>{format.cm(v.cm_utilizado)}</span></div>
                      <div className="flex justify-between"><span className="text-ink-600">Disponível</span><span className={cn('font-mono font-semibold', v.cm_disponivel <= 0 ? 'text-red-600' : 'text-emerald-700')}>{format.cm(v.cm_disponivel)}</span></div>
                      <div className="flex justify-between items-center pt-1">
                        <span className="text-ink-600">Utilizado</span>
                        <span className={cn('font-mono font-semibold', corFaturado(pct))}>{pct.toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 bg-white rounded-pill overflow-hidden">
                      <div className={cn('h-full', corBarra(pct))} style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <a
                      href="#movimentacoes"
                      className="mt-2 inline-flex items-center justify-center gap-1 w-full text-xs text-brand-700 hover:text-brand-900 border border-brand-200 hover:border-brand-300 rounded-md py-1 transition-colors"
                    >
                      Ver movimentações <span>→</span>
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Informações do contrato */}
        <Card>
          <div className="p-5">
            <p className="text-[10px] font-bold text-ink-500 uppercase tracking-widest mb-3">Informações do contrato</p>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between gap-3"><dt className="text-ink-500">Forma de faturamento</dt><dd className="text-ink-800">—</dd></div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Veículos contratados</dt>
                <dd className="flex items-center gap-1">
                  {(['dou', 'doe', 'jornal'] as const).map((tipo) => {
                    const ativo = !!cmPorVeiculo[tipo];
                    return (
                      <span
                        key={tipo}
                        className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                          ativo
                            ? (tipo === 'dou' ? 'bg-navy-100 text-navy-700' : tipo === 'doe' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')
                            : 'bg-ink-100 text-ink-400 line-through'
                        )}
                      >
                        {tipo}
                      </span>
                    );
                  })}
                </dd>
              </div>
              <div className="flex justify-between gap-3"><dt className="text-ink-500">Valor do centímetro</dt><dd className="font-semibold text-ink-900">{totalContratado > 0 ? format.brl(totalValorVenda / totalContratado) : '—'}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink-500">Índice de reajuste</dt><dd className="text-ink-800">—</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink-500">Contato responsável</dt><dd className="text-ink-800">—</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink-500">E-mail</dt><dd className="text-ink-800">—</dd></div>
              <div className="pt-3 border-t border-ink-100">
                <dt className="text-ink-500 mb-1">Uso total do contrato</dt>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-ink-100 rounded-pill overflow-hidden">
                    <div className={cn('h-full', corBarra(totalPct))} style={{ width: `${Math.min(100, totalPct)}%` }} />
                  </div>
                  <span className={cn('text-xs font-bold', corFaturado(totalPct))}>{totalPct.toFixed(0)}%</span>
                </div>
              </div>
            </dl>
            {isAdmin && (
              <Button variant="outline" size="sm" className="mt-4 w-full">
                <Edit2 className="w-3.5 h-3.5" />Editar contrato
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Movimentações do contrato */}
      <Card id="movimentacoes">
        <div className="p-5 border-b border-ink-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-ink-900 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-brand-700" />
              Movimentações do contrato
            </h3>
            <p className="text-xs text-ink-500 mt-0.5">
              Baixas e estornos de centímetros por NF emitida
              {movs && movs.length > 0 ? ` · ${movs.length} registro(s)` : ''}
            </p>
          </div>
        </div>
        {movs === null ? (
          <div className="p-8 text-center text-sm text-ink-500">Carregando movimentações...</div>
        ) : movs.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-500">Nenhuma movimentação registrada neste contrato ainda.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50/70 border-b border-ink-100">
                <tr>
                  <th className="text-left font-semibold text-ink-600 px-4 py-3 text-xs uppercase tracking-wider">Data</th>
                  <th className="text-left font-semibold text-ink-600 px-4 py-3 text-xs uppercase tracking-wider">Tipo</th>
                  <th className="text-left font-semibold text-ink-600 px-4 py-3 text-xs uppercase tracking-wider">Veículo</th>
                  <th className="text-left font-semibold text-ink-600 px-4 py-3 text-xs uppercase tracking-wider">Número/NF</th>
                  <th className="text-right font-semibold text-ink-600 px-4 py-3 text-xs uppercase tracking-wider">Centímetros</th>
                  <th className="text-right font-semibold text-ink-600 px-4 py-3 text-xs uppercase tracking-wider">Saldo após operação</th>
                  <th className="text-left font-semibold text-ink-600 px-4 py-3 text-xs uppercase tracking-wider">Usuário</th>
                  <th className="text-left font-semibold text-ink-600 px-4 py-3 text-xs uppercase tracking-wider">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {movs.map((m, i) => {
                  const isEstorno = m.cm > 0;
                  return (
                    <tr key={i} className="hover:bg-ink-50/40">
                      <td className="px-4 py-2.5 text-ink-700 whitespace-nowrap text-xs">{format.data(m.data)}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-semibold uppercase tracking-wider', isEstorno ? 'bg-red-100 text-red-700' : 'bg-brand-100 text-brand-700')}>
                          {m.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-ink-700 text-xs uppercase">{m.veiculo_tipo}</td>
                      <td className="px-4 py-2.5 font-mono text-ink-800 text-xs">NF {m.numero_nf}{isEstorno ? ' (Cancelada)' : ''}</td>
                      <td className={cn('px-4 py-2.5 text-right font-mono font-semibold text-xs', isEstorno ? 'text-emerald-600' : 'text-red-600')}>
                        {m.cm > 0 ? '+' : ''}{m.cm} cm
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-ink-700 text-xs">{format.cm(m.saldo_apos)}</td>
                      <td className="px-4 py-2.5 text-ink-600 text-xs">{m.usuario_nome}</td>
                      <td className="px-4 py-2.5 text-ink-500 italic text-xs">{m.observacoes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
