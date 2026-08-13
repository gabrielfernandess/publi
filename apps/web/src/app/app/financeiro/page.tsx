'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp, TrendingDown, Wallet, AlertTriangle, BarChart3, Users, ArrowUp, ArrowDown, Clock, FileText, Building2, ChevronRight, Download, Filter,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { format, diasAte } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
} from 'recharts';

type Mes = { mes: string; faturado: number; recebido: number; a_receber: number };
type NFResumo = { id: number; numero: string; data_emissao: string; valor: number; status: string; cliente_nome: string; municipio?: string };
type ClienteResumo = { cliente_nome: string; municipio?: string; total_faturado: number; total_nfs: number };
type ContratoResumo = { id: number; numero?: string; cliente_nome: string; municipio?: string; data_fim: string; valor_total_venda: number; valor_utilizado: number; cm_total_contratado: number; cm_total_utilizado: number; dias_para_vencer: number | null };
type AgingFaixa = { ate_30_qtd: number; ate_30_valor: number; de_31_60_qtd: number; de_31_60_valor: number; de_61_90_qtd: number; de_61_90_valor: number; mais_90_qtd: number; mais_90_valor: number };
type VeiculoResumo = { veiculo_tipo: 'dou' | 'doe' | 'jornal'; qtd_pedidos: number; total_cm: number; total_valor: number };

type Fin = {
  caixa_por_mes: Mes[];
  kpis_mes: { mes: string; faturado_mes: number; recebido_mes: number; saldo_mes: number; total_recebido: number; total_a_receber: number; total_cancelado: number };
  nfs_pendentes: NFResumo[];
  nfs_atrasadas: { qtd: number; valor_total: number };
  top_clientes: ClienteResumo[];
  aging: AgingFaixa;
  dist_veiculo: VeiculoResumo[];
};

const STATUS_NF: Record<string, { label: string; corBg: string; corText: string }> = {
  emitida:   { label: 'A receber', corBg: 'bg-amber-100', corText: 'text-amber-800' },
  enviada:   { label: 'Em cobrança', corBg: 'bg-sky-100', corText: 'text-sky-800' },
  paga:      { label: 'Paga', corBg: 'bg-emerald-100', corText: 'text-emerald-800' },
  cancelada: { label: 'Cancelada', corBg: 'bg-red-100', corText: 'text-red-800' },
};

function mesCurto(mes: string): string {
  // '2026-08' -> 'Ago/26'
  const [ano, m] = mes.split('-');
  const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${nomes[parseInt(m, 10) - 1]}/${ano.slice(2)}`;
}

export default function FinanceiroPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Fin | null>(null);
  const [contratos, setContratos] = useState<ContratoResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<'6m' | '12m'>('12m');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<{ data: Fin }>('/api/financeiro/dashboard'),
      api.get<{ data: ContratoResumo[] }>('/api/contratos?status=ativo'),
    ]).then(([d, c]) => {
      setData(d.data);
      setContratos(c.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-ink-100 rounded w-64" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map((i) => <div key={i} className="h-28 bg-white rounded-xl border border-ink-100" />)}
        </div>
        <div className="h-80 bg-white rounded-xl border border-ink-100" />
      </div>
    );
  }

  if (!data) return <div className="text-sm text-ink-500">Falha ao carregar.</div>;

  const caixaFiltrado = periodo === '6m' ? data.caixa_por_mes.slice(-6) : data.caixa_por_mes;
  const caixaFormatado = caixaFiltrado.map((m) => ({ ...m, mesLabel: mesCurto(m.mes) }));

  // cálculos
  const totalFaturadoPeriodo = caixaFiltrado.reduce((acc, m) => acc + (m.faturado || 0), 0);
  const totalRecebidoPeriodo = caixaFiltrado.reduce((acc, m) => acc + (m.recebido || 0), 0);
  const taxaRecebimento = totalFaturadoPeriodo > 0 ? Math.round((totalRecebidoPeriodo / totalFaturadoPeriodo) * 100) : 0;

  // top 5 contratos por saldo a faturar
  const topContratos = contratos
    .map((c) => ({ ...c, saldo: c.valor_total_venda - c.valor_utilizado }))
    .filter((c) => c.saldo > 0)
    .sort((a, b) => b.saldo - a.saldo)
    .slice(0, 5);

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="O caixa da Publi Legal: o que saiu, o que entrou e o que falta receber."
      />

      {/* KPIs do mês atual */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Faturado no mês"
          value={format.brl(data.kpis_mes.faturado_mes)}
          hint={data.kpis_mes.mes}
          accent="brand"
        />
        <StatCard
          icon={<Wallet className="w-5 h-5" />}
          label="Recebido no mês"
          value={format.brl(data.kpis_mes.recebido_mes)}
          hint={data.kpis_mes.mes}
          accent="green"
        />
        <StatCard
          icon={data.kpis_mes.saldo_mes >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          label="Saldo do mês"
          value={format.brl(data.kpis_mes.saldo_mes)}
          hint="faturado - recebido"
          accent={data.kpis_mes.saldo_mes >= 0 ? 'amber' : 'red'}
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Atrasadas (+60d)"
          value={`${data.nfs_atrasadas.qtd} NF(s)`}
          hint={format.brl(data.nfs_atrasadas.valor_total)}
          accent={data.nfs_atrasadas.qtd > 0 ? 'red' : 'brand'}
        />
      </div>

      {/* Resumo do período (6 ou 12 meses) */}
      <Card className="mb-5">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-700" />
                Faturado vs Recebido
              </CardTitle>
              <CardDescription>
                Período: <strong className="text-ink-700">{format.brl(totalFaturadoPeriodo)}</strong> faturado · <strong className="text-emerald-700">{format.brl(totalRecebidoPeriodo)}</strong> recebido · taxa de recebimento <strong className={taxaRecebimento >= 70 ? 'text-emerald-700' : 'text-amber-700'}>{taxaRecebimento}%</strong>
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 p-1 bg-ink-100 rounded-pill">
              <button
                onClick={() => setPeriodo('6m')}
                className={cn('px-3 py-1 text-xs font-semibold rounded-pill transition-colors', periodo === '6m' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-600 hover:text-ink-900')}
              >
                6 meses
              </button>
              <button
                onClick={() => setPeriodo('12m')}
                className={cn('px-3 py-1 text-xs font-semibold rounded-pill transition-colors', periodo === '12m' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-600 hover:text-ink-900')}
              >
                12 meses
              </button>
            </div>
          </div>
        </CardHeader>
        <CardBody>
          {caixaFiltrado.length === 0 ? (
            <div className="py-16 text-center text-sm text-ink-500">
              <BarChart3 className="w-12 h-12 mx-auto text-ink-300 mb-3" />
              Sem movimento no período. Importe NFs pra começar a ver o gráfico.
            </div>
          ) : (
            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={caixaFormatado} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="mesLabel" tick={{ fontSize: 11, fill: '#6B7A8C' }} tickLine={false} axisLine={{ stroke: '#E5E7EB' }} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#6B7A8C' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(0,155,129,0.05)' }}
                    formatter={(value: number) => format.brl(value)}
                    labelStyle={{ color: '#0B1620', fontWeight: 600 }}
                    contentStyle={{ borderRadius: 12, border: '1px solid #E5E7EB', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.15)' }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                    formatter={(value) => <span className="text-ink-700">{value}</span>}
                  />
                  <Bar dataKey="faturado" name="Faturado" fill="#009B81" radius={[6, 6, 0, 0]} maxBarSize={50} />
                  <Bar dataKey="recebido" name="Recebido" fill="#02C549" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Seção 1: NFs pendentes + Top clientes */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  NFs em aberto
                </CardTitle>
                <CardDescription>As mais antigas primeiro — pra priorizar cobrança</CardDescription>
              </div>
              <Link href="/app/notas-fiscais">
                <Button variant="ghost" size="sm">Ver todas <ChevronRight className="w-3.5 h-3.5" /></Button>
              </Link>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {data.nfs_pendentes.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <div className="w-12 h-12 mx-auto rounded-pill bg-emerald-100 flex items-center justify-center mb-3">
                  <Wallet className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-sm font-medium text-ink-700">Tudo em dia! 🎉</p>
                <p className="text-xs text-ink-500 mt-1">Nenhuma NF pendente de recebimento.</p>
              </div>
            ) : (
              <ul className="divide-y divide-ink-100">
                {data.nfs_pendentes.slice(0, 6).map((nf) => {
                  const s = STATUS_NF[nf.status] || STATUS_NF.emitida;
                  return (
                    <li key={nf.id} className="px-5 py-3 flex items-center gap-3 hover:bg-ink-50/40 transition-colors">
                      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', s.corBg)}>
                        <Wallet className={cn('w-4 h-4', s.corText)} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-ink-900 truncate">{nf.cliente_nome}</div>
                        <div className="text-xs text-ink-500 mt-0.5 flex items-center gap-1.5">
                          <span>NF #{nf.numero}</span>
                          {nf.municipio && <><span>•</span><span>{nf.municipio}</span></>}
                          <span>•</span>
                          <span>{format.data(nf.data_emissao)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-amber-700">{format.brl(nf.valor)}</div>
                        <div className="text-[10px] text-ink-500 mt-0.5 uppercase tracking-wider font-semibold">{s.label}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-700" />
              Top clientes
            </CardTitle>
            <CardDescription>Quem mais gera receita acumulada</CardDescription>
          </CardHeader>
          <CardBody className="p-0">
            {data.top_clientes.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-ink-500">Sem dados ainda.</div>
            ) : (
              <ul className="divide-y divide-ink-100">
                {data.top_clientes.slice(0, 6).map((c, i) => {
                  const max = data.top_clientes[0]?.total_faturado || 1;
                  const pct = (c.total_faturado / max) * 100;
                  return (
                    <li key={c.cliente_nome} className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-pill bg-brand-50 text-brand-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          #{i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium text-ink-900 truncate">{c.cliente_nome}</div>
                            <div className="text-sm font-semibold text-brand-700 whitespace-nowrap">{format.brl(c.total_faturado)}</div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-ink-500 mt-0.5">
                            <span>{c.municipio || '—'}</span>
                            <span>•</span>
                            <span>{c.total_nfs} NF(s)</span>
                          </div>
                          <div className="mt-1.5 h-1 bg-ink-100 rounded-pill overflow-hidden">
                            <div className="h-full bg-brand-gradient" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Seção 2: Contratos com saldo + visão geral */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-700" />
                  Contratos com saldo a faturar
                </CardTitle>
                <CardDescription>Onde tem mais cm/valor pra explorar</CardDescription>
              </div>
              <Link href="/app/contratos">
                <Button variant="ghost" size="sm">Ver contratos <ChevronRight className="w-3.5 h-3.5" /></Button>
              </Link>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {topContratos.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-ink-500">Nenhum contrato com saldo.</div>
            ) : (
              <ul className="divide-y divide-ink-100">
                {topContratos.map((c) => {
                  const pctUsado = c.cm_total_contratado > 0 ? (c.cm_total_utilizado / c.cm_total_contratado) * 100 : 0;
                  const dias = c.dias_para_vencer;
                  const venceProx = dias !== null && dias >= 0 && dias <= 60;
                  return (
                    <li key={c.id} className="px-5 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-ink-900 truncate">{c.cliente_nome}</div>
                          <div className="text-xs text-ink-500 mt-0.5 flex items-center gap-2">
                            <span>{c.numero || `Contrato #${c.id}`}</span>
                            {c.municipio && <><span>•</span><span>{c.municipio}</span></>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-semibold text-brand-700">{format.brl(c.saldo)}</div>
                          <div className="text-[10px] text-ink-500 mt-0.5">{Math.round(pctUsado)}% utilizado</div>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 bg-ink-100 rounded-pill overflow-hidden">
                        <div className="h-full bg-brand-gradient" style={{ width: `${pctUsado}%` }} />
                      </div>
                      {venceProx && (
                        <div className="mt-1.5 text-[10px] text-amber-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Vence em {dias}d — planejar renovações
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-emerald-600" />
              Resumo geral
            </CardTitle>
            <CardDescription>Acumulado desde o começo</CardDescription>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg">
                <div className="flex items-center gap-2 text-emerald-700">
                  <ArrowUp className="w-4 h-4" />
                  <span className="text-sm font-semibold uppercase tracking-wider">Total recebido</span>
                </div>
                <div className="text-2xl font-bold text-emerald-800">{format.brl(data.kpis_mes.total_recebido)}</div>
              </div>
              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-2 text-amber-700">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-semibold uppercase tracking-wider">A receber</span>
                </div>
                <div className="text-2xl font-bold text-amber-800">{format.brl(data.kpis_mes.total_a_receber)}</div>
              </div>
              <div className="flex items-center justify-between p-4 bg-ink-50 rounded-lg">
                <div className="flex items-center gap-2 text-ink-500">
                  <ArrowDown className="w-4 h-4" />
                  <span className="text-sm font-semibold uppercase tracking-wider">Cancelado</span>
                </div>
                <div className="text-2xl font-bold text-ink-700">{format.brl(data.kpis_mes.total_cancelado)}</div>
              </div>
              <div className="pt-3 border-t border-ink-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-600">Taxa de recebimento geral</span>
                  <span className={cn('font-bold', data.kpis_mes.total_a_receber === 0 ? 'text-emerald-600' : (data.kpis_mes.total_recebido / (data.kpis_mes.total_recebido + data.kpis_mes.total_a_receber)) >= 0.7 ? 'text-emerald-600' : 'text-amber-600')}>
                    {data.kpis_mes.total_recebido + data.kpis_mes.total_a_receber > 0
                      ? Math.round((data.kpis_mes.total_recebido / (data.kpis_mes.total_recebido + data.kpis_mes.total_a_receber)) * 100)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Seção 2.5: Aging de NFs + Distribuição por veículo */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Aging de NFs a receber
            </CardTitle>
            <CardDescription>Quanto tempo cada NF tá em aberto — pra priorizar cobrança</CardDescription>
          </CardHeader>
          <CardBody>
            {(() => {
              const a = data.aging;
              const totalValor = a.ate_30_valor + a.de_31_60_valor + a.de_61_90_valor + a.mais_90_valor;
              if (totalValor === 0) {
                return <div className="py-10 text-center text-sm text-ink-500">Nenhuma NF em aberto. 🎉</div>;
              }
              const agingData = [
                { faixa: '0-30d',  qtd: a.ate_30_qtd,  valor: a.ate_30_valor,  cor: '#10B981' },
                { faixa: '31-60d', qtd: a.de_31_60_qtd, valor: a.de_31_60_valor, cor: '#F59E0B' },
                { faixa: '61-90d', qtd: a.de_61_90_qtd, valor: a.de_61_90_valor, cor: '#F97316' },
                { faixa: '90+d',   qtd: a.mais_90_qtd,  valor: a.mais_90_valor,  cor: '#EF4444' },
              ];
              return (
                <div className="space-y-3">
                  {agingData.map((f) => {
                    const pct = (f.valor / totalValor) * 100;
                    return (
                      <div key={f.faixa}>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="font-semibold text-ink-700">{f.faixa}</span>
                          <span className="text-ink-500">
                            <strong className="text-ink-800">{f.qtd}</strong> NF(s) · <strong className="text-ink-800">{format.brl(f.valor)}</strong> · {pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="h-3 bg-ink-100 rounded-pill overflow-hidden">
                          <div className="h-full rounded-pill transition-all" style={{ width: `${pct}%`, backgroundColor: f.cor }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-3 mt-3 border-t border-ink-100 flex items-center justify-between text-xs">
                    <span className="text-ink-500">Total em aberto</span>
                    <span className="font-bold text-ink-900">{format.brl(totalValor)}</span>
                  </div>
                </div>
              );
            })()}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-brand-700" />
              Mix por veículo
            </CardTitle>
            <CardDescription>Onde está concentrado o faturamento (DOU, DOE, Jornal)</CardDescription>
          </CardHeader>
          <CardBody>
            {data.dist_veiculo.length === 0 ? (
              <div className="py-10 text-center text-sm text-ink-500">Sem pedidos faturados ainda.</div>
            ) : (() => {
              const cores: Record<string, string> = { dou: '#1E3A8A', doe: '#009B81', jornal: '#F59E0B' };
              const labels: Record<string, string> = { dou: 'DOU', doe: 'DOE', jornal: 'Jornal' };
              const total = data.dist_veiculo.reduce((acc, v) => acc + v.total_valor, 0);
              const dataChart = data.dist_veiculo.map((v) => ({
                name: labels[v.veiculo_tipo] || v.veiculo_tipo,
                value: v.total_valor,
                cor: cores[v.veiculo_tipo] || '#94A3B8',
              }));
              return (
                <div className="flex items-center gap-4">
                  <div className="w-32 h-32 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={dataChart} dataKey="value" innerRadius={36} outerRadius={56} paddingAngle={2}>
                          {dataChart.map((entry, i) => <Cell key={i} fill={entry.cor} stroke="none" />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => format.brl(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    {data.dist_veiculo.map((v) => {
                      const pct = total > 0 ? (v.total_valor / total) * 100 : 0;
                      return (
                        <div key={v.veiculo_tipo} className="flex items-center gap-2 text-xs">
                          <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: cores[v.veiculo_tipo] || '#94A3B8' }} />
                          <span className="font-semibold text-ink-800 flex-1">{labels[v.veiculo_tipo] || v.veiculo_tipo}</span>
                          <span className="text-ink-500 whitespace-nowrap">
                            {v.qtd_pedidos} pedidos · <strong className="text-ink-800">{format.brl(v.total_valor)}</strong>
                          </span>
                          <span className="font-semibold text-ink-700 w-10 text-right">{pct.toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </CardBody>
        </Card>
      </div>

      {/* Seção 3: Distribuição por veículo + resumo status */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs text-ink-500 uppercase tracking-wider font-medium">Faturado total</p>
          <p className="mt-2 text-2xl font-bold text-ink-900">
            {format.brl(data.kpis_mes.total_recebido + data.kpis_mes.total_a_receber)}
          </p>
          <p className="text-xs text-ink-500 mt-1">emitido + cancelado</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-ink-500 uppercase tracking-wider font-medium">% já recebido</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {data.kpis_mes.total_recebido + data.kpis_mes.total_a_receber > 0
              ? Math.round((data.kpis_mes.total_recebido / (data.kpis_mes.total_recebido + data.kpis_mes.total_a_receber)) * 100)
              : 0}%
          </p>
          <p className="text-xs text-ink-500 mt-1">do total faturado</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-ink-500 uppercase tracking-wider font-medium">% cancelado</p>
          <p className="mt-2 text-2xl font-bold text-ink-500">
            {(data.kpis_mes.total_recebido + data.kpis_mes.total_a_receber + data.kpis_mes.total_cancelado) > 0
              ? Math.round((data.kpis_mes.total_cancelado / (data.kpis_mes.total_recebido + data.kpis_mes.total_a_receber + data.kpis_mes.total_cancelado)) * 100)
              : 0}%
          </p>
          <p className="text-xs text-ink-500 mt-1">do total emitido</p>
        </Card>
      </div>
    </div>
  );
}
