'use client';

import { useEffect, useState } from 'react';
import {
  Users, FileText, Package2, AlertTriangle, Wallet, TrendingUp, ArrowRight, Plus, Activity, Calendar, CheckCircle2,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { format, diasAte } from '@/lib/format';
import { cn } from '@/lib/utils';
import { STATUS_BY_ID, TONE_CLASSES } from '@/app/app/pedidos/constants';

type Dashboard = {
  totais: {
    clientes_ativos: number;
    contratos_ativos: number;
    pedidos_andamento: number;
    pedidos_concluidos: number;
    saldo_a_faturar_estimado: number;
  };
  deltas: Record<string, { valor: number; anterior: number; pct: number }>;
  serie_pedidos: { dia: string; solicitados: number; andamento: number; concluidos: number }[];
  distribuicao_veiculo: { tipo: string; nome: string; total: number; pct: number }[];
  receita_mensal: { mes: string; valor: number }[];
  alertas_vigencia: any[];
  top_contratos_saldo: any[];
  pedidos_por_status: Record<string, number>;
  pedidos_recentes: any[];
  periodo: { dias: number; inicio: string; fim: string };
};

const PERIODOS = [
  { dias: 7, label: '7 dias' },
  { dias: 30, label: '30 dias' },
  { dias: 90, label: '90 dias' },
];

// Cores pros graficos
const CORES_VEICULO: Record<string, string> = {
  dou: '#0F1F3A',
  doe: '#009B81',
  jornal: '#F4B400',
  outros: '#94A3B8',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [dias, setDias] = useState(30);

  useEffect(() => {
    setLoading(true);
    api.get<{ data: Dashboard }>(`/api/dashboard/stats?dias=${dias}`)
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [dias]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-ink-100 rounded w-64" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0,1,2,3].map((i) => <div key={i} className="h-28 bg-white rounded-xl border border-ink-100" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="h-72 bg-white rounded-xl border border-ink-100" />
          <div className="h-72 bg-white rounded-xl border border-ink-100" />
        </div>
      </div>
    );
  }

  if (!data) return <div className="text-sm text-ink-500">Falha ao carregar.</div>;

  const primeiroNome = user?.nome?.split(' ')[0] || 'você';
  const t = data.totais;
  const d = data.deltas;
  const temAlerta = data.alertas_vigencia.length > 0;
  const temPedidoAndamento = t.pedidos_andamento > 0;

  // Formata label do eixo X da serie (dd/mm)
  const serieFormatada = data.serie_pedidos.map((s) => ({
    ...s,
    diaCurto: s.dia.slice(8, 10) + '/' + s.dia.slice(5, 7),
  }));

  // Formata label do eixo X da receita (mes curto)
  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const receitaFormatada = data.receita_mensal.map((r) => ({
    ...r,
    mesCurto: MESES[parseInt(r.mes.slice(5, 7), 10) - 1] + '/' + r.mes.slice(2, 4),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">
            Olá, {primeiroNome}
          </h1>
          <p className="text-sm text-ink-500 mt-0.5">
            {temPedidoAndamento
              ? `${t.pedidos_andamento} pedidos em andamento agora.`
              : 'Nenhum pedido em andamento no momento.'}
            {temAlerta && (
              <span className="text-amber-600 font-medium">
                {' '}· {data.alertas_vigencia.length} contrato(s) precisam de atenção.
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor de período */}
          <div className="inline-flex rounded-lg border border-ink-200 bg-white p-0.5">
            {PERIODOS.map((p) => (
              <button
                key={p.dias}
                onClick={() => setDias(p.dias)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  dias === p.dias
                    ? 'bg-brand-900 text-white'
                    : 'text-ink-600 hover:text-ink-900'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Link href="/app/pedidos">
            <Button variant="outline" size="sm" rounded="md">
              <Plus className="w-3.5 h-3.5" />Novo pedido
            </Button>
          </Link>
          <Link href="/app/financeiro">
            <Button variant="primary" size="sm" rounded="md">
              Financeiro <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs principais com delta */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Clientes ativos"
          value={t.clientes_ativos}
          hint="prefeituras, câmaras e autarquias"
          trend={{ delta: d.clientes.pct, label: `+${d.clientes.valor} no período` }}
          accent="brand"
        />
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label="Contratos vigentes"
          value={t.contratos_ativos}
          hint={temAlerta ? `${data.alertas_vigencia.length} precisam de atenção` : 'tudo dentro da vigência'}
          trend={{ delta: d.contratos.pct, label: 'vs. período anterior' }}
          accent={temAlerta ? 'amber' : 'brand'}
        />
        <StatCard
          icon={<Package2 className="w-5 h-5" />}
          label="Pedidos criados"
          value={d.pedidos.valor}
          hint={`${t.pedidos_andamento} em andamento · ${d.concluidos.valor} concluídos`}
          trend={{ delta: d.pedidos.pct, label: 'vs. período anterior' }}
          accent="brand"
        />
        <StatCard
          icon={<Wallet className="w-5 h-5" />}
          label="Receita do período"
          value={format.brl(d.receita.valor)}
          hint={`saldo a faturar: ${format.brl(t.saldo_a_faturar_estimado)}`}
          trend={{ delta: d.receita.pct, label: 'vs. período anterior' }}
          accent="green"
        />
      </div>

      {/* Graficos principais */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Line chart: pedidos no periodo */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Movimento de pedidos</CardTitle>
                <CardDescription>
                  Últimos {dias} dias · solicitados, em andamento e concluídos
                </CardDescription>
              </div>
              <Link href="/app/pedidos">
                <Button variant="ghost" size="sm">Ver Kanban <ArrowRight className="w-3.5 h-3.5" /></Button>
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={serieFormatada} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="diaCurto" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#94A3B8" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="solicitados" name="Solicitados" stroke="#0F1F3A" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="andamento" name="Em andamento" stroke="#009B81" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="concluidos" name="Concluídos" stroke="#F4B400" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* Donut: distribuição por veículo */}
        <Card>
          <CardHeader>
            <CardTitle>Por veículo</CardTitle>
            <CardDescription>Distribuição no período</CardDescription>
          </CardHeader>
          <CardBody>
            {data.distribuicao_veiculo.length === 0 ? (
              <div className="text-sm text-ink-500 text-center py-8">Sem pedidos no período.</div>
            ) : (
              <>
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.distribuicao_veiculo}
                        dataKey="total"
                        nameKey="nome"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {data.distribuicao_veiculo.map((d) => (
                          <Cell key={d.tipo} fill={CORES_VEICULO[d.tipo] || '#94A3B8'} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
                        formatter={(v: any, n: any) => [`${v} pedidos`, n]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="mt-4 space-y-1.5">
                  {data.distribuicao_veiculo.map((d) => (
                    <li key={d.tipo} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                          style={{ background: CORES_VEICULO[d.tipo] || '#94A3B8' }}
                        />
                        <span className="text-ink-700 truncate">{d.nome}</span>
                      </div>
                      <span className="font-semibold text-ink-900">{d.pct}%</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Receita mensal + cards laterais */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Bar chart receita 6 meses */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Receita mensal
                </CardTitle>
                <CardDescription>Últimos 6 meses · notas fiscais pagas</CardDescription>
              </div>
              <Link href="/app/financeiro">
                <Button variant="ghost" size="sm">Ver financeiro <ArrowRight className="w-3.5 h-3.5" /></Button>
              </Link>
            </div>
          </CardHeader>
          <CardBody>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={receitaFormatada} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="mesCurto" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="#94A3B8"
                    tickFormatter={(v) => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 12 }}
                    formatter={(v: any) => [format.brl(v), 'Receita']}
                  />
                  <Bar dataKey="valor" name="Receita" fill="#009B81" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>

        {/* Pulso: pedidos por status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-700" />
              Pulso
            </CardTitle>
            <CardDescription>Pedidos por status agora</CardDescription>
          </CardHeader>
          <CardBody>
            {Object.entries(data.pedidos_por_status).length === 0 ? (
              <div className="text-sm text-ink-500 text-center py-4">Nenhum pedido ainda.</div>
            ) : (
              <ul className="space-y-1.5">
                {Object.entries(data.pedidos_por_status).slice(0, 8).map(([k, v]) => {
                  const s = STATUS_BY_ID[k];
                  return (
                    <li key={k} className="flex items-center justify-between text-sm py-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0', s ? TONE_CLASSES[s.tone] : 'bg-ink-100 text-ink-500')}>
                          {s && <s.icon className="w-3.5 h-3.5" />}
                        </span>
                        <span className="text-ink-700 truncate">{s?.label || k}</span>
                      </div>
                      <span className="font-semibold text-ink-900 ml-2">{v}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link href="/app/pedidos" className="block mt-4 pt-3 border-t border-ink-100">
              <Button variant="ghost" size="sm" fullWidth>
                Abrir Kanban <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardBody>
        </Card>
      </div>

      {/* Cards inferiores: alertas + top + recentes */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Alertas de vigência */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Atenção necessária
                </CardTitle>
                <CardDescription>Contratos vencendo em 60 dias ou já vencidos</CardDescription>
              </div>
              {data.alertas_vigencia.length > 0 && (
                <Badge variant="warning">{data.alertas_vigencia.length}</Badge>
              )}
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {data.alertas_vigencia.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <div className="w-12 h-12 mx-auto rounded-pill bg-emerald-100 flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                </div>
                <p className="text-sm font-medium text-ink-700">Tudo certo por aqui</p>
                <p className="text-xs text-ink-500 mt-1">Nenhum contrato precisa de atenção.</p>
              </div>
            ) : (
              <ul className="divide-y divide-ink-100">
                {data.alertas_vigencia.slice(0, 5).map((a: any) => {
                  const dias = diasAte(a.data_fim);
                  const vencido = dias !== null && dias < 0;
                  return (
                    <li key={a.id} className="px-5 py-3 flex items-center justify-between gap-3">
                      <Link href={`/app/contratos/${a.id}`} className="min-w-0 flex-1 hover:text-brand-700 transition-colors">
                        <div className="text-sm font-medium text-ink-900 truncate">{a.cliente_nome}</div>
                        <div className="text-xs text-ink-500 mt-0.5">
                          Contrato {a.numero || `#${a.id}`} • {a.municipio} • {format.data(a.data_fim)}
                        </div>
                      </Link>
                      <Badge variant={vencido ? 'danger' : dias! <= 15 ? 'warning' : 'info'}>
                        {vencido ? `vencido há ${Math.abs(dias!)}d` : `vence em ${dias}d`}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        {/* Top contratos com saldo */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Top contratos com saldo
                </CardTitle>
                <CardDescription>Onde tem mais receita pra explorar</CardDescription>
              </div>
              <Link href="/app/contratos">
                <Button variant="ghost" size="sm">Ver todos <ArrowRight className="w-3.5 h-3.5" /></Button>
              </Link>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {data.top_contratos_saldo.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-ink-500">Nenhum contrato com saldo.</div>
            ) : (
              <ul className="divide-y divide-ink-100">
                {data.top_contratos_saldo.map((c: any) => {
                  const total = c.cm_total_contratado;
                  const usado = c.cm_total_utilizado;
                  const pct = total > 0 ? (usado / total) * 100 : 0;
                  return (
                    <li key={c.id} className="px-5 py-3">
                      <Link href={`/app/contratos/${c.id}`} className="block hover:bg-ink-50/40 -mx-2 px-2 py-1 rounded transition-colors">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-ink-900 truncate">{c.cliente_nome}</div>
                            <div className="text-xs text-ink-500 mt-0.5">{c.municipio}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-emerald-700">{format.brl(c.saldo_valor)}</div>
                            <div className="text-xs text-ink-500 mt-0.5">{Math.round(pct)}% utilizado</div>
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 bg-ink-100 rounded-pill overflow-hidden">
                          <div className="h-full bg-brand-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Movimentação recente */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Movimentação recente</CardTitle>
              <CardDescription>Os pedidos que mexeram por último</CardDescription>
            </div>
            <Link href="/app/pedidos">
              <Button variant="ghost" size="sm">Ver todos <ArrowRight className="w-3.5 h-3.5" /></Button>
            </Link>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {data.pedidos_recentes.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-ink-500">Nenhum pedido ainda.</div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {data.pedidos_recentes.map((p: any) => {
                const s = STATUS_BY_ID[p.status];
                const StatusIcon = s?.icon;
                return (
                  <li key={p.id} className="px-5 py-3 flex items-center gap-3 hover:bg-ink-50/40 transition-colors">
                    <span className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', s ? TONE_CLASSES[s.tone] : 'bg-ink-100 text-ink-500')}>
                      {StatusIcon && <StatusIcon className="w-4 h-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-ink-900 truncate">{p.cliente_nome}</div>
                      <div className="text-xs text-ink-500 mt-0.5 capitalize">
                        {p.categoria.replace(/_/g, ' ')} · {p.municipio || '—'}
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-ink-500 flex items-center gap-1 justify-end">
                        <Calendar className="w-3 h-3" />
                        {format.data(p.updated_at)}
                      </div>
                      <div className="text-[10px] text-ink-400 mt-0.5 uppercase tracking-wider font-semibold">
                        {s?.label}
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
  );
}
