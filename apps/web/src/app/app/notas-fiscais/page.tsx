'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Plus, Search, AlertTriangle, Wallet, FileCheck2, Banknote, Receipt, Eye, Lock, Filter, ChevronRight, Download } from 'lucide-react';
import { api } from '@/lib/api';
import { useIsAdmin } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCard } from '@/components/ui/StatCard';
import { format } from '@/lib/format';
import { cn } from '@/lib/utils';

type Faturamento = {
  id: number;
  cliente_id: number;
  cliente_nome: string;
  cliente_municipio: string;
  cliente_estado: string;
  contrato_id: number | null;
  contrato_numero: string | null;
  periodo_inicio: string;
  periodo_fim: string;
  valor_total: number;
  cm_total: number;
  status: 'em_aprovacao' | 'aprovado' | 'nf_emitida' | 'em_cobranca' | 'recebido' | 'cancelado';
  data_pagamento: string | null;
  qtd_publicacoes: number;
};

type Kpis = {
  a_faturar: { count: number; valor: number };
  em_aprovacao: { count: number; valor: number };
  nf_emitidas: { count: number; valor: number };
  a_receber: { count: number; valor: number };
  em_atraso: { count: number; valor: number };
  recebidas_mes: { count: number; valor: number };
};

const STATUS_LABELS: Record<string, { label: string; corBg: string; corText: string }> = {
  em_aprovacao: { label: 'Em aprovação',  corBg: 'bg-amber-100',   corText: 'text-amber-800' },
  aprovado:     { label: 'Aprovado',       corBg: 'bg-emerald-100', corText: 'text-emerald-800' },
  nf_emitida:   { label: 'NF emitida',     corBg: 'bg-sky-100',     corText: 'text-sky-800' },
  em_cobranca:  { label: 'Em cobrança',    corBg: 'bg-indigo-100',  corText: 'text-indigo-800' },
  recebido:     { label: 'Recebido',       corBg: 'bg-emerald-100', corText: 'text-emerald-800' },
  cancelado:    { label: 'Cancelado',      corBg: 'bg-red-100',     corText: 'text-red-800' },
};

function mesAno(iso: string): string {
  if (!iso) return iso;
  const [ano, m] = iso.slice(0, 7).split('-');
  const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return `${nomes[Number(m) - 1]}/${ano}`;
}

export default function FaturamentoPage() {
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const [data, setData] = useState<Faturamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [periodoIni, setPeriodoIni] = useState('2026-08-01');
  const [periodoFim, setPeriodoFim] = useState('2026-08-31');
  const [filterCliente, setFilterCliente] = useState('');
  const [filterContrato, setFilterContrato] = useState('');
  const [filterVeiculo, setFilterVeiculo] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [clientes, setClientes] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [veiculos, setVeiculos] = useState<any[]>([]);

  const buildUrl = () => {
    const params = new URLSearchParams();
    if (periodoIni) params.set('data_inicio', periodoIni);
    if (periodoFim) params.set('data_fim', periodoFim);
    if (filterCliente) params.set('cliente_id', filterCliente);
    if (filterContrato) params.set('contrato_id', filterContrato);
    if (filterVeiculo) params.set('veiculo', filterVeiculo);
    if (filterStatus) params.set('status', filterStatus);
    if (search) params.set('search', search);
    return `/api/faturamentos?${params}`;
  };

  const load = async () => {
    setLoading(true);
    try {
      const [lista, k] = await Promise.all([
        api.get<{ data: Faturamento[] }>(buildUrl()),
        api.get<{ data: Kpis }>('/api/faturamentos/kpis'),
      ]);
      setData(lista.data);
      setKpis(k.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filterCliente, filterContrato, filterVeiculo, filterStatus]);
  useEffect(() => { load(); }, []); // eslint-disable-line

  useEffect(() => {
    api.get<{ data: any[] }>('/api/clientes').then((r) => setClientes(r.data));
    api.get<{ data: any[] }>('/api/contratos').then((r) => setContratos(r.data));
    api.get<{ data: any[] }>('/api/veiculos').then((r) => setVeiculos(r.data));
  }, []);

  const clearFilters = () => {
    setPeriodoIni('2026-08-01');
    setPeriodoFim('2026-08-31');
    setFilterCliente('');
    setFilterContrato('');
    setFilterVeiculo('');
    setFilterStatus('');
    setSearch('');
  };

  const abrirDetalhes = (id: number) => router.push(`/app/faturamentos/${id}`);

  return (
    <div>
      <PageHeader
        title="MÓDULO 2 - FATURAMENTO E FINANCEIRO"
        description="Painel de faturamento e acompanhamento financeiro"
        actions={
          isAdmin ? (
            <>
              <Button variant="outline" rounded="md">
                <Download className="w-4 h-4" />Exportar
              </Button>
              <Button variant="primary" rounded="md">
                <Plus className="w-4 h-4" />Novo faturamento
              </Button>
            </>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-500 bg-ink-100 px-2.5 py-1.5 rounded-md">
              <Lock className="w-3.5 h-3.5" />Somente admin pode criar
            </span>
          )
        }
      />

      {/* 6 KPIs - sem cor de fundo (estilo StatCard do /app/financeiro) */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-5">
        <StatCard
          icon={<Wallet className="w-5 h-5" />}
          label="A Faturar"
          value={kpis ? format.brl(kpis.a_faturar.valor) : '—'}
          hint={kpis ? `${kpis.a_faturar.count} lotes` : ''}
          accent="brand"
          size="sm"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Em Aprovação"
          value={kpis ? format.brl(kpis.em_aprovacao.valor) : '—'}
          hint={kpis ? `${kpis.em_aprovacao.count} lotes` : ''}
          accent="amber"
          size="sm"
        />
        <StatCard
          icon={<FileCheck2 className="w-5 h-5" />}
          label="NF Emitidas"
          value={kpis ? format.brl(kpis.nf_emitidas.valor) : '—'}
          hint={kpis ? `${kpis.nf_emitidas.count} lotes` : ''}
          accent="green"
          size="sm"
        />
        <StatCard
          icon={<Banknote className="w-5 h-5" />}
          label="A Receber"
          value={kpis ? format.brl(kpis.a_receber.valor) : '—'}
          hint={kpis ? `${kpis.a_receber.count} lotes` : ''}
          accent="amber"
          size="sm"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Em Atraso"
          value={kpis ? format.brl(kpis.em_atraso.valor) : '—'}
          hint={kpis ? `${kpis.em_atraso.count} lotes` : ''}
          accent="red"
          size="sm"
        />
        <StatCard
          icon={<Banknote className="w-5 h-5" />}
          label="Recebidos (Mês)"
          value={kpis ? format.brl(kpis.recebidas_mes.valor) : '—'}
          hint={kpis ? `${kpis.recebidas_mes.count} lotes` : ''}
          accent="green"
          size="sm"
        />
      </div>

      {/* Filtros (Print 1) */}
      <Card className="mb-5">
        <div className="p-4 flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-600">Período</label>
            <div className="flex items-center gap-1.5">
              <input type="date" value={periodoIni} onChange={(e) => setPeriodoIni(e.target.value)} className="px-2.5 py-1.5 rounded-md border border-ink-200 bg-white text-sm" />
              <span className="text-ink-500 text-xs">até</span>
              <input type="date" value={periodoFim} onChange={(e) => setPeriodoFim(e.target.value)} className="px-2.5 py-1.5 rounded-md border border-ink-200 bg-white text-sm" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-600">Cliente / Município</label>
            <select value={filterCliente} onChange={(e) => setFilterCliente(e.target.value)} className="px-2.5 py-1.5 rounded-md border border-ink-200 bg-white text-sm min-w-[180px]">
              <option value="">Todos</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-600">Contrato</label>
            <select value={filterContrato} onChange={(e) => setFilterContrato(e.target.value)} className="px-2.5 py-1.5 rounded-md border border-ink-200 bg-white text-sm min-w-[140px]">
              <option value="">Todos</option>
              {contratos.map((c) => <option key={c.id} value={c.id}>{c.numero || `#${c.id}`}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-600">Veículo</label>
            <select value={filterVeiculo} onChange={(e) => setFilterVeiculo(e.target.value)} className="px-2.5 py-1.5 rounded-md border border-ink-200 bg-white text-sm min-w-[120px]">
              <option value="">Todos</option>
              {veiculos.map((v) => <option key={v.id} value={v.tipo}>{v.tipo.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-ink-600">Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-2.5 py-1.5 rounded-md border border-ink-200 bg-white text-sm min-w-[140px]">
              <option value="">Todos</option>
              <option value="em_aprovacao">Em aprovação</option>
              <option value="aprovado">Aprovado</option>
              <option value="nf_emitida">NF emitida</option>
              <option value="em_cobranca">Em cobrança</option>
              <option value="recebido">Recebido</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
              <input
                type="text"
                placeholder="Buscar faturamento..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && load()}
                className="w-full pl-10 pr-3 py-2 rounded-md border border-ink-200 bg-white text-sm"
              />
            </div>
            <Button variant="outline" rounded="md" onClick={load}>
              <Filter className="w-4 h-4" />
            </Button>
          </div>
          <Button variant="outline" rounded="md" onClick={clearFilters} className="border-ink-300">
            Limpar filtros
          </Button>
        </div>
      </Card>

      {/* Tabela de faturamentos (Print 1) */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-500">Carregando faturamentos...</div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-12 h-12" />}
            title="Nenhum faturamento no período"
            description="Os faturamentos agrupam publicações de um cliente/período. Quando o admin fechar um ciclo, aparece aqui."
            action={isAdmin ? <Button><Plus className="w-4 h-4" />Criar primeiro faturamento</Button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-[10px] uppercase tracking-wider text-ink-600">
                <tr>
                  <th className="text-left px-3 py-2.5 font-semibold">Cliente / Município</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Período</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Contrato</th>
                  <th className="text-center px-3 py-2.5 font-semibold">Publicações</th>
                  <th className="text-center px-3 py-2.5 font-semibold">Total (cm)</th>
                  <th className="text-right px-3 py-2.5 font-semibold">Valor (R$)</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Status</th>
                  <th className="w-12 text-right px-3 py-2.5 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {data.map((f) => {
                  const st = STATUS_LABELS[f.status] || STATUS_LABELS.em_aprovacao;
                  return (
                    <tr
                      key={f.id}
                      onClick={() => abrirDetalhes(f.id)}
                      className="hover:bg-ink-50/40 transition-colors cursor-pointer"
                    >
                      <td className="px-3 py-3">
                        <div className="font-medium text-ink-900">{f.cliente_nome}</div>
                        <div className="text-xs text-ink-500 mt-0.5">{f.cliente_municipio}{f.cliente_estado ? `/${f.cliente_estado}` : ''}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-sm text-ink-800">{mesAno(f.periodo_inicio)}</div>
                        <div className="text-[10px] text-ink-500 mt-0.5">
                          {format.data(f.periodo_inicio)} → {format.data(f.periodo_fim)}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-mono text-sm text-ink-800">{f.contrato_numero || '—'}</div>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <span className="font-semibold text-ink-900">{f.qtd_publicacoes}</span>
                      </td>
                      <td className="px-3 py-3 text-center font-mono text-sm font-semibold text-ink-900">{f.cm_total}</td>
                      <td className="px-3 py-3 text-right font-semibold text-ink-900">{format.brl(f.valor_total)}</td>
                      <td className="px-3 py-3">
                        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-pill text-[10px] font-bold uppercase tracking-wider', st.corBg, st.corText)}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <ChevronRight className="w-4 h-4 text-ink-400 inline" />
                      </td>
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
