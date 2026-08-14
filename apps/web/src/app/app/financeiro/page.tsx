'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp, TrendingDown, Wallet, AlertTriangle, BarChart3, Users, ArrowUp, ArrowDown, Clock, FileText, ChevronRight, Filter, X, Calendar, CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
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

const STATUS_NF: Record<string, { label: string; corBg: string; corText: string; badge: 'warning' | 'info' | 'success' | 'danger' | 'default' }> = {
  emitida:   { label: 'A receber', corBg: 'bg-amber-100', corText: 'text-amber-800', badge: 'warning' },
  enviada:   { label: 'Em cobrança', corBg: 'bg-sky-100', corText: 'text-sky-800', badge: 'info' },
  paga:      { label: 'Paga', corBg: 'bg-emerald-100', corText: 'text-emerald-800', badge: 'success' },
  cancelada: { label: 'Cancelada', corBg: 'bg-red-100', corText: 'text-red-800', badge: 'danger' },
};

// Cor do valor da NF por status — semântica: pago=emerald, pendente=amber, cancelado=neutro+riscado
const COR_VALOR_NF: Record<string, string> = {
  emitida: 'text-amber-700',
  enviada: 'text-amber-700',
  paga: 'text-emerald-700',
  cancelada: 'text-ink-400 line-through',
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

  // ====== Filtros ======
  type PeriodoTipo = 'mes_atual' | 'mes_anterior' | 'semana_atual' | 'este_ano' | 'ano_passado' | 'personalizado';
  const [filtroPeriodo, setFiltroPeriodo] = useState<PeriodoTipo>('mes_atual');
  // hoje fica null no SSR; é setado no client via useEffect para evitar hydration mismatch
  const [hoje, setHoje] = useState<Date | null>(null);
  const [filtroDataIni, setFiltroDataIni] = useState<string>('');
  const [filtroDataFim, setFiltroDataFim] = useState<string>('');
  const [filtroVeiculo, setFiltroVeiculo] = useState<string>('');
  const [filtroStatusNF, setFiltroStatusNF] = useState<string>('');
  const [filtroCliente, setFiltroCliente] = useState<string>('');

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

  // seta "hoje" só no client para evitar hydration mismatch
  useEffect(() => {
    setHoje(new Date());
  }, []);

  // ====== Período resolvido (data_inicio, data_fim, label) ======
  // usa "hoje" que é null no SSR e setado no client; quando null, usa 1º dia do ano corrente como placeholder
  const periodoResolvido = useMemo(() => {
    const y = hoje ? hoje.getFullYear() : 2025;
    const m = hoje ? hoje.getMonth() : 0;

    if (filtroPeriodo === 'mes_atual') {
      const ini = new Date(y, m, 1);
      const fim = new Date(y, m + 1, 0);
      return { ini, fim, label: `${mesCurto(`${y}-${String(m + 1).padStart(2, '0')}`)}` };
    }
    if (filtroPeriodo === 'mes_anterior') {
      const ref = m === 0 ? 11 : m - 1;
      const yy = m === 0 ? y - 1 : y;
      const ini = new Date(yy, ref, 1);
      const fim = new Date(yy, ref + 1, 0);
      return { ini, fim, label: `${mesCurto(`${yy}-${String(ref + 1).padStart(2, '0')}`)}` };
    }
    if (filtroPeriodo === 'semana_atual') {
      if (!hoje) return { ini: new Date(2025, 0, 1), fim: new Date(2025, 0, 7), label: '...' };
      const d = new Date(hoje);
      const dow = d.getDay() || 7; // dom=0 => 7
      d.setDate(d.getDate() - (dow - 1));
      const ini = new Date(d);
      const fim = new Date(d);
      fim.setDate(ini.getDate() + 6);
      return { ini, fim, label: `Sem ${format.data(ini.toISOString().slice(0, 10))} a ${format.data(fim.toISOString().slice(0, 10))}` };
    }
    if (filtroPeriodo === 'este_ano') {
      return { ini: new Date(y, 0, 1), fim: new Date(y, 11, 31), label: `${y}` };
    }
    if (filtroPeriodo === 'ano_passado') {
      return { ini: new Date(y - 1, 0, 1), fim: new Date(y - 1, 11, 31), label: `${y - 1}` };
    }
    // personalizado — usa datas manuais
    if (filtroDataIni && filtroDataFim) {
      return { ini: new Date(filtroDataIni), fim: new Date(filtroDataFim), label: `${format.data(filtroDataIni)} ? ${format.data(filtroDataFim)}` };
    }
    // fallback: ano corrente completo (1/jan a 31/dez)
    return { ini: new Date(y, 0, 1), fim: new Date(y, 11, 31), label: `${y}` };
  }, [hoje, filtroPeriodo, filtroDataIni, filtroDataFim]);

  const emPeriodo = (iso: string) => {
    if (!iso) return true;
    const d = new Date(iso);
    return d >= periodoResolvido.ini && d <= periodoResolvido.fim;
  };

  // ====== Clientes únicos (do top_clientes + nfs_pendentes) ======
  const clientesUnicos = useMemo(() => {
    const set = new Set<string>();
    if (data) {
      data.top_clientes.forEach((c) => set.add(c.cliente_nome));
      data.nfs_pendentes.forEach((n) => set.add(n.cliente_nome));
    }
    return Array.from(set).sort();
  }, [data]);

  // ====== KPIs filtrados (mês atual sempre do backend, mas filtra por veículo) ======
  const kpisFiltrados = useMemo(() => {
    if (!data) return null;
    // nfs do período para recalcular KPIs por veículo/status
    const nfsPeriodo = data.nfs_pendentes.filter((n) => {
      if (!emPeriodo(n.data_emissao)) return false;
      if (filtroVeiculo && (n as any).veiculo_tipo && (n as any).veiculo_tipo !== filtroVeiculo) return false;
      if (filtroStatusNF && n.status !== filtroStatusNF) return false;
      if (filtroCliente && n.cliente_nome !== filtroCliente) return false;
      return true;
    });
    const nfsPagas = nfsPeriodo.filter((n) => n.status === 'paga').reduce((a, n) => a + n.valor, 0);
    const nfsAReceber = nfsPeriodo.filter((n) => n.status === 'emitida' || n.status === 'enviada').reduce((a, n) => a + n.valor, 0);
    const nfsAtrasadas = nfsPeriodo.filter((n) => {
      const d = new Date(n.data_emissao);
      const dias = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
      return dias > 60;
    });
    // considera "atrasada" como emitida/enviada há mais de 60d
    return {
      faturado: nfsPeriodo.filter((n) => n.status !== 'cancelada').reduce((a, n) => a + n.valor, 0),
      recebido: nfsPagas,
      saldo: nfsPagas - nfsPeriodo.filter((n) => n.status !== 'cancelada' && n.status !== 'paga').reduce((a, n) => a + n.valor, 0),
      atrasadas_qtd: nfsAtrasadas.length,
      atrasadas_valor: nfsAtrasadas.reduce((a, n) => a + n.valor, 0),
    };
  }, [data, filtroVeiculo, filtroStatusNF, filtroCliente, periodoResolvido]);

  // ====== Caixa filtrado por período ======
  const caixaFiltrado = useMemo(() => {
    if (!data) return [];
    return data.caixa_por_mes.filter((m) => {
      const [ano, mm] = m.mes.split('-').map(Number);
      const dIni = new Date(ano, mm - 1, 1);
      const dFim = new Date(ano, mm, 0);
      return dIni <= periodoResolvido.fim && dFim >= periodoResolvido.ini;
    });
  }, [data, periodoResolvido]);

  // ====== NFs pendentes filtradas ======
  const nfsPendentesFiltradas = useMemo(() => {
    if (!data) return [];
    return data.nfs_pendentes.filter((n) => {
      if (!emPeriodo(n.data_emissao)) return false;
      if (filtroStatusNF && n.status !== filtroStatusNF) return false;
      if (filtroCliente && n.cliente_nome !== filtroCliente) return false;
      return true;
    }).slice(0, 6);
  }, [data, filtroStatusNF, filtroCliente, periodoResolvido]);

  // ====== Top clientes filtrados ======
  const topClientesFiltrados = useMemo(() => {
    if (!data) return [];
    return data.top_clientes.filter((c) => !filtroCliente || c.cliente_nome === filtroCliente).slice(0, 6);
  }, [data, filtroCliente]);

  // ====== Top 5 contratos por saldo (filtra por cliente) ======
  const topContratos = useMemo(() => {
    return contratos
      .map((c) => ({ ...c, saldo: c.valor_total_venda - c.valor_utilizado }))
      .filter((c) => c.saldo > 0)
      .filter((c) => !filtroCliente || c.cliente_nome === filtroCliente)
      .sort((a, b) => b.saldo - a.saldo)
      .slice(0, 5);
  }, [contratos, filtroCliente]);

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

  // limite de meses visíveis
  const caixaMostrar = periodo === '6m' ? caixaFiltrado.slice(-6) : caixaFiltrado;
  const caixaFormatado = caixaMostrar.map((m) => ({ ...m, mesLabel: mesCurto(m.mes) }));

  // cálculos
  const totalFaturadoPeriodo = caixaMostrar.reduce((acc, m) => acc + (m.faturado || 0), 0);
  const totalRecebidoPeriodo = caixaMostrar.reduce((acc, m) => acc + (m.recebido || 0), 0);
  const taxaRecebimento = totalFaturadoPeriodo > 0 ? Math.round((totalRecebidoPeriodo / totalFaturadoPeriodo) * 100) : 0;

  // ano de referência pra labels (usa hoje se já foi setado no client, senão o ano corrente do servidor)
  const anoReferencia = hoje ? hoje.getFullYear() : new Date().getFullYear();

  const clearFiltros = () => {
    setFiltroPeriodo('mes_atual');
    setFiltroDataIni('');
    setFiltroDataFim('');
    setFiltroVeiculo('');
    setFiltroStatusNF('');
    setFiltroCliente('');
  };

  const temFiltro = filtroPeriodo !== 'mes_atual' || filtroVeiculo || filtroStatusNF || filtroCliente || filtroDataIni || filtroDataFim;

  return (
    <div>
      <PageHeader
        title="Financeiro"
        description="Faturamento, recebimento e saldo a receber por período, com acompanhamento de cobrança e contratos."
      />

      {/* ============ BARRA DE FILTROS ============ */}
      <Card className="mb-5">
        <div className="p-4 space-y-3">
          {/* Linha 1: Período + Veículo + Status NF + Cliente + Limpar (tudo horizontal) */}
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="flex flex-col gap-1 lg:w-48">
              <label className="text-xs font-medium text-ink-600 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />Período
              </label>
              <Select value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value as PeriodoTipo)}>
                <option value="mes_atual">Mês atual</option>
                <option value="mes_anterior">Mês anterior</option>
                <option value="semana_atual">Semana atual</option>
                <option value="este_ano">Este ano</option>
                <option value="ano_passado">Ano passado</option>
                <option value="personalizado">Personalizado</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1 lg:w-36">
              <label className="text-xs font-medium text-ink-600">Veículo</label>
              <Select value={filtroVeiculo} onChange={(e) => setFiltroVeiculo(e.target.value)}>
                <option value="">Todos</option>
                <option value="dou">DOU</option>
                <option value="doe">DOE</option>
                <option value="jornal">JORNAL</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1 lg:w-40">
              <label className="text-xs font-medium text-ink-600">Status NF</label>
              <Select value={filtroStatusNF} onChange={(e) => setFiltroStatusNF(e.target.value)}>
                <option value="">Todos</option>
                <option value="emitida">A receber</option>
                <option value="enviada">Em cobrança</option>
                <option value="paga">Paga</option>
                <option value="cancelada">Cancelada</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1 lg:flex-1 min-w-0">
              <label className="text-xs font-medium text-ink-600">Cliente</label>
              <Select value={filtroCliente} onChange={(e) => setFiltroCliente(e.target.value)}>
                <option value="">Todos</option>
                {clientesUnicos.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            {temFiltro && (
              <div className="flex flex-col gap-1 lg:flex-none">
                <label className="text-xs font-medium text-transparent select-none">.</label>
                <Button variant="outline" size="sm" onClick={clearFiltros} className="border-ink-300">
                  <X className="w-3.5 h-3.5" />Limpar
                </Button>
              </div>
            )}
          </div>

          {/* Linha 2 (condicional): De/Até só quando "Personalizado" */}
          {filtroPeriodo === 'personalizado' && (
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-1 border-t border-ink-100">
              <div className="flex flex-col gap-1 sm:w-44">
                <label className="text-xs font-medium text-ink-600">De</label>
                <Input type="date" value={filtroDataIni} onChange={(e) => setFiltroDataIni(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1 sm:w-44">
                <label className="text-xs font-medium text-ink-600">Até</label>
                <Input type="date" value={filtroDataFim} onChange={(e) => setFiltroDataFim(e.target.value)} />
              </div>
            </div>
          )}

          <div className="text-xs text-ink-500 flex items-center gap-2 pt-1 border-t border-ink-100">
            <Filter className="w-3 h-3" />
            Período ativo: <strong className="text-ink-700">{periodoResolvido.label}</strong>
            {filtroVeiculo && <span className="text-ink-400">·</span>}
            {filtroVeiculo && <span>Veículo: <strong className="text-ink-700">{filtroVeiculo.toUpperCase()}</strong></span>}
            {filtroStatusNF && <span className="text-ink-400">·</span>}
            {filtroStatusNF && <span>Status: <strong className="text-ink-700">{filtroStatusNF}</strong></span>}
            {filtroCliente && <span className="text-ink-400">·</span>}
            {filtroCliente && <span>Cliente: <strong className="text-ink-700">{filtroCliente}</strong></span>}
          </div>
        </div>
      </Card>

      {/* KPIs filtrados */}
      {kpisFiltrados && (
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Faturado no período"
          value={format.brl(kpisFiltrados.faturado)}
          hint={periodoResolvido.label}
          accent="brand"
        />
        <StatCard
          icon={<Wallet className="w-5 h-5" />}
          label="Recebido no período"
          value={format.brl(kpisFiltrados.recebido)}
          hint={periodoResolvido.label}
          accent="green"
        />
        <StatCard
          icon={kpisFiltrados.saldo >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          label="Saldo do período"
          value={format.brl(kpisFiltrados.saldo)}
          hint="faturado - recebido"
          accent={kpisFiltrados.saldo >= 0 ? 'amber' : 'red'}
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Atrasadas (+60d)"
          value={`${kpisFiltrados.atrasadas_qtd} NF`}
          hint={format.brl(kpisFiltrados.atrasadas_valor)}
          accent={kpisFiltrados.atrasadas_qtd > 0 ? 'red' : 'green'}
        />
      </div>
      )}

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
                <strong className="text-ink-700">{periodoResolvido.label}</strong> — <strong className="text-ink-700">{format.brl(totalFaturadoPeriodo)}</strong> faturado — <strong className="text-emerald-700">{format.brl(totalRecebidoPeriodo)}</strong> recebido — taxa <strong className={taxaRecebimento >= 70 ? 'text-emerald-700' : 'text-amber-700'}>{taxaRecebimento}%</strong>
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
              Sem movimento no período. Importe NFs para começar a ver o gráfico.
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
                <CardDescription>As mais antigas primeiro — para priorizar cobrança</CardDescription>
              </div>
              <Link href="/app/notas-fiscais">
                <Button variant="ghost" size="sm">Ver todas <ChevronRight className="w-3.5 h-3.5" /></Button>
              </Link>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {nfsPendentesFiltradas.length === 0 ? (
              <EmptyState
                className="py-10"
                icon={<CheckCircle2 className="w-9 h-9 text-emerald-400" />}
                title="Tudo em dia"
                description="Nenhuma NF pendente no período selecionado."
              />
            ) : (
              <ul className="divide-y divide-ink-100">
                {nfsPendentesFiltradas.map((nf) => {
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
                          {nf.municipio && <><span>·</span><span>{nf.municipio}</span></>}
                          <span>·</span>
                          <span>{format.data(nf.data_emissao)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn('text-sm font-semibold', COR_VALOR_NF[nf.status] || COR_VALOR_NF.emitida)}>{format.brl(nf.valor)}</div>
                        <div className="mt-1 flex justify-end"><Badge variant={s.badge}>{s.label}</Badge></div>
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
            {topClientesFiltrados.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-ink-500">Sem dados no período.</div>
            ) : (
              <ul className="divide-y divide-ink-100">
                {topClientesFiltrados.map((c, i) => {
                  const max = topClientesFiltrados[0]?.total_faturado || 1;
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
                            <div className="text-sm font-semibold text-ink-900 whitespace-nowrap">{format.brl(c.total_faturado)}</div>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-ink-500 mt-0.5">
                            <span>{c.municipio || '—'}</span>
                            <span>·</span>
                            <span>{c.total_nfs} NF</span>
                          </div>
                          <div className="mt-1.5 h-1 bg-ink-100 rounded-pill overflow-hidden">
                            <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
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
                <CardDescription>Onde tem mais cm/valor para explorar</CardDescription>
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
                            {c.municipio && <><span>·</span><span>{c.municipio}</span></>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-semibold text-ink-900">{format.brl(c.saldo)}</div>
                          <div className="text-xs text-ink-500 mt-0.5">{Math.round(pctUsado)}% utilizado</div>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 bg-ink-100 rounded-pill overflow-hidden">
                        <div className="h-full bg-brand-500" style={{ width: `${pctUsado}%` }} />
                      </div>
                      {venceProx && (
                        <div className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
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
            <CardDescription>Quanto tempo cada NF está em aberto — para priorizar cobrança</CardDescription>
          </CardHeader>
          <CardBody>
            {(() => {
              const a = data.aging;
              const totalValor = a.ate_30_valor + a.de_31_60_valor + a.de_61_90_valor + a.mais_90_valor;
              if (totalValor === 0) {
                return (
                  <EmptyState
                    icon={<CheckCircle2 className="w-9 h-9 text-emerald-400" />}
                    title="Nenhuma NF em aberto"
                    description="Nenhum recebimento pendente no momento."
                  />
                );
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
                            <strong className="text-ink-800">{f.qtd}</strong> NF — <strong className="text-ink-800">{format.brl(f.valor)}</strong> — {pct.toFixed(0)}%
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
                            {v.qtd_pedidos} pedidos — <strong className="text-ink-800">{format.brl(v.total_valor)}</strong>
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
