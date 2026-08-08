'use client';

import { useEffect, useState } from 'react';
import {
  Users, FileText, Package2, AlertTriangle, Wallet, TrendingUp, Building2, ArrowRight, Plus, Activity, Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { format, diasAte } from '@/lib/format';
import { cn } from '@/lib/utils';

type Dashboard = {
  totais: {
    clientes_ativos: number;
    contratos_ativos: number;
    pedidos_andamento: number;
    pedidos_concluidos: number;
    saldo_a_faturar_estimado: number;
  };
  alertas_vigencia: any[];
  top_contratos_saldo: any[];
  pedidos_por_status: Record<string, number>;
  pedidos_recentes: any[];
};

const STATUS_LABEL: Record<string, { label: string; emoji: string }> = {
  solicitada: { label: 'Solicitada', emoji: '📥' },
  em_preparacao: { label: 'Em preparação', emoji: '📋' },
  aguardando_envio: { label: 'Aguardando envio', emoji: '⏳' },
  enviada: { label: 'Enviada', emoji: '📤' },
  cust_pgtos: { label: 'Custos op.', emoji: '💳' },
  aguardando_publicacao: { label: 'Aguardando publ.', emoji: '📰' },
  publicacao_recebida: { label: 'Publicação recebida', emoji: '📄' },
  cliente_atendido: { label: 'Cliente atendido', emoji: '📲' },
  aprovacao_faturamento: { label: 'Aprovação', emoji: '👩‍💼' },
  aguardando_nf: { label: 'Aguardando NF', emoji: '🧾' },
  nf_emitida: { label: 'NF emitida', emoji: '💰' },
  aguardando_pagamento: { label: 'Aguardando pgto', emoji: '💵' },
  recebido: { label: 'Recebido', emoji: '✅' },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: Dashboard }>('/api/dashboard/stats')
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
  const temAlerta = data.alertas_vigencia.length > 0;
  const temPedidoAndamento = t.pedidos_andamento > 0;

  return (
    <div className="space-y-6">
      {/* Saudação */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">
            Olá, {primeiroNome} 👋
          </h1>
          <p className="text-sm text-ink-500 mt-0.5">
            {temPedidoAndamento
              ? `${t.pedidos_andamento} pedido(s) em andamento agora.`
              : 'Nenhum pedido em andamento no momento.'}
            {temAlerta && (
              <span className="text-amber-600 font-medium">
                {' '}· {data.alertas_vigencia.length} contrato(s) precisam de atenção.
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/app/pedidos">
            <Button variant="outline" size="sm" rounded="md">
              <Plus className="w-3.5 h-3.5" />Novo pedido
            </Button>
          </Link>
          <Link href="/app/financeiro">
            <Button variant="primary" size="sm" rounded="md">
              Ver financeiro <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* KPIs principais */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Clientes ativos"
          value={t.clientes_ativos}
          hint={t.clientes_ativos > 0 ? 'prefeituras, câmaras e autarquias' : 'cadastre seu primeiro cliente'}
          accent="brand"
        />
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label="Contratos vigentes"
          value={t.contratos_ativos}
          hint={temAlerta ? `${data.alertas_vigencia.length} precisam de atenção` : 'tudo dentro da vigência'}
          accent={temAlerta ? 'amber' : 'brand'}
        />
        <StatCard
          icon={<Package2 className="w-5 h-5" />}
          label="Pedidos em andamento"
          value={t.pedidos_andamento}
          hint={`${t.pedidos_concluidos} concluídos até agora`}
          accent="brand"
        />
        <StatCard
          icon={<Wallet className="w-5 h-5" />}
          label="Saldo a faturar"
          value={format.brl(t.saldo_a_faturar_estimado)}
          hint="cm contratado × valor unitário"
          accent="green"
        />
      </div>

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
                  <span className="text-2xl">👍</span>
                </div>
                <p className="text-sm font-medium text-ink-700">Tudo certo por aqui</p>
                <p className="text-xs text-ink-500 mt-1">Nenhum contrato precisa de atenção.</p>
              </div>
            ) : (
              <ul className="divide-y divide-ink-100">
                {data.alertas_vigencia.map((a: any) => {
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
                          <div className="h-full bg-brand-gradient transition-all" style={{ width: `${pct}%` }} />
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Resumo Kanban */}
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
                {Object.entries(data.pedidos_por_status).map(([k, v]) => {
                  const s = STATUS_LABEL[k];
                  return (
                    <li key={k} className="flex items-center justify-between text-sm py-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">{s?.emoji || '•'}</span>
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

        {/* Pedidos recentes */}
        <Card className="lg:col-span-2">
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
                  const s = STATUS_LABEL[p.status];
                  return (
                    <li key={p.id} className="px-5 py-3 flex items-center gap-3 hover:bg-ink-50/40 transition-colors">
                      <div className="text-2xl flex-shrink-0">{s?.emoji || '•'}</div>
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
    </div>
  );
}
