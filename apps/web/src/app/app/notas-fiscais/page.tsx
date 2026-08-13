'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, AlertTriangle, Wallet, FileCheck2, Banknote, Receipt, FileText, Building2, Eye, Lock, Filter, Calendar, ChevronDown, Check, X, Download, MoreVertical, Edit2, Trash2, Printer, History, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useIsAdmin } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
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
  data_aprovacao: string | null;
  data_emissao_nf: string | null;
  numero_nf: string | null;
  data_pagamento: string | null;
  forma_cobranca: string | null;
  observacoes: string | null;
  qtd_publicacoes: number;
};

type FaturamentoDetalhe = Faturamento & {
  publicacoes: any[];
  por_veiculo: { veiculo_tipo: string; veiculo_nome: string; total_cm: number; total_valor: number }[];
  info_contrato: any[] | null;
  saldo_anterior_cm: number;
  saldo_apos_cm: number;
};

type Kpis = {
  a_faturar: { count: number; valor: number };
  em_aprovacao: { count: number; valor: number };
  nf_emitidas: { count: number; valor: number };
  a_receber: { count: number; valor: number };
  em_atraso: { count: number; valor: number };
  recebidas_mes: { count: number; valor: number };
};

const STATUS_LABELS: Record<string, { label: string; cor: string; corBg: string; step: number }> = {
  em_aprovacao: { label: 'Em aprovação',  cor: 'text-amber-800',   corBg: 'bg-amber-100',   step: 1 },
  aprovado:     { label: 'Aprovado',       cor: 'text-emerald-800', corBg: 'bg-emerald-100', step: 1 },
  nf_emitida:   { label: 'NF emitida',     cor: 'text-sky-800',     corBg: 'bg-sky-100',     step: 3 },
  em_cobranca:  { label: 'Em cobrança',    cor: 'text-indigo-800',  corBg: 'bg-indigo-100',  step: 4 },
  recebido:     { label: 'Recebido',       cor: 'text-emerald-800', corBg: 'bg-emerald-100', step: 5 },
  cancelado:    { label: 'Cancelado',      cor: 'text-red-800',     corBg: 'bg-red-100',     step: 0 },
};

const VEICULO_CORES: Record<string, { bg: string; text: string }> = {
  dou:    { bg: 'bg-navy-50',     text: 'text-navy-700' },
  doe:    { bg: 'bg-emerald-50',  text: 'text-emerald-700' },
  jornal: { bg: 'bg-amber-50',    text: 'text-amber-700' },
};

function mesAno(iso: string): string {
  // '2026-08' -> 'Agosto/2026'
  if (!iso || !iso.startsWith('-') && iso.length < 7) return iso;
  const [ano, m] = iso.slice(0, 7).split('-');
  const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return `${nomes[Number(m) - 1]}/${ano}`;
}

export default function FaturamentoPage() {
  const isAdmin = useIsAdmin();
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
  const [selected, setSelected] = useState<FaturamentoDetalhe | null>(null);
  const [loadingDet, setLoadingDet] = useState(false);
  const [openNew, setOpenNew] = useState(false);
  const [openMenu, setOpenMenu] = useState<number | null>(null);

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

  const selectFat = async (f: Faturamento) => {
    setLoadingDet(true);
    try {
      const r = await api.get<{ data: FaturamentoDetalhe }>(`/api/faturamentos/${f.id}`);
      setSelected(r.data);
    } finally {
      setLoadingDet(false);
    }
  };

  const clearFilters = () => {
    setPeriodoIni('2026-08-01');
    setPeriodoFim('2026-08-31');
    setFilterCliente('');
    setFilterContrato('');
    setFilterVeiculo('');
    setFilterStatus('');
    setSearch('');
  };

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
              <Button variant="primary" rounded="md" onClick={() => setOpenNew(true)}>
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

      {/* 6 KPIs - Print 1 do cliente */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <KpiCard label="A FATURAR"        value={kpis?.a_faturar.valor ?? 0}    count={kpis?.a_faturar.count ?? 0}    color="lime"    icon={Wallet} />
        <KpiCard label="EM APROVAÇÃO"    value={kpis?.em_aprovacao.valor ?? 0} count={kpis?.em_aprovacao.count ?? 0} color="amber"   icon={AlertTriangle} />
        <KpiCard label="NF EMITIDAS"     value={kpis?.nf_emitidas.valor ?? 0}  count={kpis?.nf_emitidas.count ?? 0}  color="sky"     icon={FileCheck2} />
        <KpiCard label="A RECEBER"       value={kpis?.a_receber.valor ?? 0}    count={kpis?.a_receber.count ?? 0}    color="amber"   icon={Banknote} />
        <KpiCard label="EM ATRASO"       value={kpis?.em_atraso.valor ?? 0}    count={kpis?.em_atraso.count ?? 0}    color="red"     icon={AlertTriangle} />
        <KpiCard label="RECEBIDOS (MÊS)" value={kpis?.recebidas_mes.valor ?? 0} count={kpis?.recebidas_mes.count ?? 0} color="emerald" icon={CheckCircle2} />
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
          <Select label="Cliente / Município" value={filterCliente} onChange={(e) => setFilterCliente(e.target.value)} className="lg:w-44">
            <option value="">Todos</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
          <Select label="Contrato" value={filterContrato} onChange={(e) => setFilterContrato(e.target.value)} className="lg:w-36">
            <option value="">Todos</option>
            {contratos.map((c) => <option key={c.id} value={c.id}>{c.numero || `#${c.id}`}</option>)}
          </Select>
          <Select label="Veículo" value={filterVeiculo} onChange={(e) => setFilterVeiculo(e.target.value)} className="lg:w-32">
            <option value="">Todos</option>
            {veiculos.map((v) => <option key={v.id} value={v.tipo}>{v.tipo.toUpperCase()}</option>)}
          </Select>
          <Select label="Status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="lg:w-36">
            <option value="">Todos</option>
            <option value="em_aprovacao">Em aprovação</option>
            <option value="aprovado">Aprovado</option>
            <option value="nf_emitida">NF emitida</option>
            <option value="em_cobranca">Em cobrança</option>
            <option value="recebido">Recebido</option>
            <option value="cancelado">Cancelado</option>
          </Select>
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
          <Button variant="ghost" rounded="md" onClick={clearFilters}>
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
            action={isAdmin ? <Button onClick={() => setOpenNew(true)}><Plus className="w-4 h-4" />Criar primeiro faturamento</Button> : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Cliente / Município</TH>
                  <TH>Período</TH>
                  <TH>Contrato</TH>
                  <TH className="text-center">Publicações</TH>
                  <TH className="text-center">DOU (cm)</TH>
                  <TH className="text-center">DOE (cm)</TH>
                  <TH className="text-center">Jornal (cm)</TH>
                  <TH className="text-center">Total (cm)</TH>
                  <TH className="text-right">Valor (R$)</TH>
                  <TH>Status</TH>
                  <TH className="w-12 text-right">Ações</TH>
                </TR>
              </THead>
              <TBody>
                {data.map((f) => {
                  const st = STATUS_LABELS[f.status] || STATUS_LABELS.em_aprovacao;
                  const dou = f.cm_total; // simplificado - detalhe vem no expand
                  return (
                    <TR
                      key={f.id}
                      onClick={() => selectFat(f)}
                      className={cn('cursor-pointer hover:bg-ink-50/40 transition-colors', selected?.id === f.id && 'bg-brand-50/30')}
                    >
                      <TD>
                        <div className="font-medium text-ink-900">{f.cliente_nome}</div>
                        <div className="text-xs text-ink-500 mt-0.5">{f.cliente_municipio}{f.cliente_estado ? `/${f.cliente_estado}` : ''}</div>
                      </TD>
                      <TD>
                        <div className="text-sm text-ink-800">{mesAno(f.periodo_inicio)}</div>
                        <div className="text-[10px] text-ink-500 mt-0.5">
                          {format.data(f.periodo_inicio)} → {format.data(f.periodo_fim)}
                        </div>
                      </TD>
                      <TD>
                        <div className="font-mono text-sm text-ink-800">{f.contrato_numero || '—'}</div>
                      </TD>
                      <TD className="text-center">
                        <span className="font-semibold text-ink-900">{f.qtd_publicacoes}</span>
                      </TD>
                      <TD className="text-center font-mono text-sm text-ink-700">—</TD>
                      <TD className="text-center font-mono text-sm text-ink-700">—</TD>
                      <TD className="text-center font-mono text-sm text-ink-700">—</TD>
                      <TD className="text-center font-mono text-sm font-semibold text-ink-900">{f.cm_total}</TD>
                      <TD className="text-right font-semibold text-ink-900">{format.brl(f.valor_total)}</TD>
                      <TD>
                        <span className={cn('inline-flex items-center px-2.5 py-1 rounded-pill text-[10px] font-bold uppercase tracking-wider', st.corBg, st.cor)}>
                          {st.label}
                        </span>
                      </TD>
                      <TD className="text-right">
                        <Eye className="w-4 h-4 text-ink-400 inline" />
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Detalhes do faturamento (Print 1) - aparece embaixo */}
      {selected && (
        <div className="mt-6 space-y-4">
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Card principal - Detalhes do faturamento */}
            <Card className="lg:col-span-2">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base font-bold text-ink-900 truncate">{selected.cliente_nome} – {mesAno(selected.periodo_inicio)}</h2>
                      <p className="text-xs text-ink-500 mt-0.5">Contrato: {selected.contrato_numero || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-pill text-[10px] font-bold uppercase tracking-wider', STATUS_LABELS[selected.status].corBg, STATUS_LABELS[selected.status].cor)}>
                      {STATUS_LABELS[selected.status].label}
                    </span>
                    {isAdmin && (
                      <button className="px-3 py-1 rounded-md border border-ink-200 text-xs font-medium hover:bg-ink-50 flex items-center gap-1">
                        Mais ações
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="mt-3 text-xs text-ink-600">
                  Período: {format.data(selected.periodo_inicio)} a {format.data(selected.periodo_fim)} • <strong className="text-ink-800">{selected.qtd_publicacoes} publicações</strong>
                </p>

                {/* Stepper 5 etapas */}
                <div className="mt-5 mb-2">
                  <FaturamentoStepper status={selected.status} dataAprovacao={selected.data_aprovacao} dataEmissao={selected.data_emissao_nf} dataPagamento={selected.data_pagamento} numeroNf={selected.numero_nf} />
                </div>

                {/* 3 cards: Resumo / Info do contrato / Financeiro */}
                <div className="grid md:grid-cols-3 gap-4 mt-4">
                  <div className="rounded-lg border border-ink-200 overflow-hidden">
                    <div className="px-3 py-2 bg-ink-50 text-[10px] font-bold text-ink-600 uppercase tracking-wider">Resumo do faturamento</div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-ink-100 text-[10px] text-ink-500">
                          <th className="text-left px-3 py-1.5 font-medium">Veículo</th>
                          <th className="text-right px-3 py-1.5 font-medium">CM Total</th>
                          <th className="text-right px-3 py-1.5 font-medium">Valor (R$)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ink-100">
                        {(['dou','doe','jornal'] as const).map((tipo) => {
                          const v = selected.por_veiculo.find(x => x.veiculo_tipo === tipo);
                          if (!v) {
                            return (
                              <tr key={tipo}>
                                <td className="px-3 py-1.5 text-ink-700 font-medium uppercase">{tipo}</td>
                                <td className="px-3 py-1.5 text-right text-ink-300">—</td>
                                <td className="px-3 py-1.5 text-right text-ink-300">R$ 0,00</td>
                              </tr>
                            );
                          }
                          return (
                            <tr key={tipo}>
                              <td className="px-3 py-1.5 text-ink-700 font-medium uppercase">{tipo}</td>
                              <td className="px-3 py-1.5 text-right font-mono text-ink-800">{v.total_cm} cm</td>
                              <td className="px-3 py-1.5 text-right font-mono text-ink-800">{format.brl(v.total_valor)}</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-amber-50">
                          <td className="px-3 py-1.5 text-ink-800 font-bold uppercase">TOTAL</td>
                          <td className="px-3 py-1.5 text-right font-mono font-bold text-ink-900">{selected.cm_total} cm</td>
                          <td className="px-3 py-1.5 text-right font-mono font-bold text-ink-900">{format.brl(selected.valor_total)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="rounded-lg border border-ink-200 overflow-hidden">
                    <div className="px-3 py-2 bg-ink-50 text-[10px] font-bold text-ink-600 uppercase tracking-wider">Informações do contrato</div>
                    <dl className="text-xs divide-y divide-ink-100">
                      <InfoRow label="Saldo anterior (cm)" value={`${selected.saldo_anterior_cm.toFixed(0)} cm`} />
                      <InfoRow label="Total a faturar (cm)" value={`${selected.cm_total} cm`} />
                      <InfoRow label="Saldo após faturamento (cm)" value={`${selected.saldo_apos_cm.toFixed(0)} cm`} />
                      {selected.por_veiculo.map((v) => (
                        <InfoRow key={v.veiculo_tipo} label={`Valor do cm (${v.veiculo_tipo.toUpperCase()})`} value={format.brl(v.total_cm > 0 ? v.total_valor / v.total_cm : 0)} />
                      ))}
                      <InfoRow label="Forma de cobrança" value={selected.forma_cobranca || '—'} />
                    </dl>
                  </div>

                  <div className="rounded-lg border border-ink-200 overflow-hidden">
                    <div className="px-3 py-2 bg-ink-50 text-[10px] font-bold text-ink-600 uppercase tracking-wider">Financeiro</div>
                    <dl className="text-xs divide-y divide-ink-100">
                      <InfoRow label="Valor total" value={format.brl(selected.valor_total)} />
                      <InfoRow label="Valor aprovado" value={selected.data_aprovacao ? format.brl(selected.valor_total) : '—'} />
                      <InfoRow label="NF" value={selected.numero_nf || '—'} />
                      <InfoRow label="Data emissão" value={format.data(selected.data_emissao_nf)} />
                      <InfoRow label="Vencimento" value="—" />
                      <InfoRow label="Pagamento" value={format.data(selected.data_pagamento)} />
                    </dl>
                  </div>
                </div>

                {/* Ações disponíveis */}
                {isAdmin && (
                  <div className="mt-5">
                    <p className="text-[10px] font-bold text-ink-600 uppercase tracking-wider mb-2">Ações disponíveis</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="primary" size="sm" rounded="md" disabled={selected.status !== 'em_aprovacao'}>
                        <Check className="w-3.5 h-3.5" />Aprovar faturamento
                      </Button>
                      <Button variant="outline" size="sm" rounded="md">
                        <Edit2 className="w-3.5 h-3.5" />Editar seleções
                      </Button>
                      <Button variant="outline" size="sm" rounded="md">
                        <Trash2 className="w-3.5 h-3.5" />Excluir faturamento
                      </Button>
                      <Button variant="outline" size="sm" rounded="md">
                        <Printer className="w-3.5 h-3.5" />Imprimir resumo
                      </Button>
                      <Button variant="outline" size="sm" rounded="md">
                        <History className="w-3.5 h-3.5" />Histórico / Observações
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Card direito: Publicações incluídas */}
            <Card>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-ink-900">Publicações incluídas neste faturamento</h3>
                  <button className="text-[10px] text-brand-600 hover:underline font-medium">Visualizar por veículo</button>
                </div>
                {loadingDet ? (
                  <div className="py-8 text-center text-xs text-ink-500">Carregando...</div>
                ) : (
                  <div className="space-y-1.5 max-h-96 overflow-y-auto">
                    {selected.publicacoes.length === 0 ? (
                      <div className="py-6 text-center text-xs text-ink-500">Nenhuma publicação vinculada.</div>
                    ) : selected.publicacoes.map((p, i) => (
                      <div key={p.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-ink-50 last:border-0">
                        <span className="font-mono text-ink-500 w-20 flex-shrink-0">{format.data(p.data_desejada_publicacao || p.data_solicitacao)}</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-ink-800 truncate">{p.categoria_publicacao || p.categoria}</div>
                          <div className="text-[10px] text-ink-500 truncate">#{p.id} • {p.responsavel_nome || '—'}</div>
                        </div>
                        <span className="font-mono text-ink-700 flex-shrink-0">{p.total_cm} cm</span>
                      </div>
                    ))}
                    <div className="pt-2 mt-2 border-t border-ink-200 flex items-center justify-between text-xs font-bold">
                      <span className="text-ink-700">Total de {selected.publicacoes.length} publicações</span>
                      <span className="text-ink-900">{selected.cm_total} cm</span>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Observações */}
          {selected.observacoes && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <strong className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1">Observações</strong>
              {selected.observacoes}
            </div>
          )}
        </div>
      )}

      <Modal open={openNew} onClose={() => setOpenNew(false)} title="Novo faturamento" size="lg" footer={
        <>
          <Button variant="ghost" onClick={() => setOpenNew(false)}>Cancelar</Button>
          <Button variant="primary" disabled>Aprovar e salvar (em construção)</Button>
        </>
      }>
        <div className="text-sm text-ink-500 p-2">
          <p className="mb-2">🚧 Em construção</p>
          <p className="text-xs">A tela de criar faturamento vai listar os pedidos finalizados do mesmo cliente/período/contrato e permitir agrupar.</p>
        </div>
      </Modal>
    </div>
  );
}

function KpiCard({ label, value, count, color, icon: Icon }: { label: string; value: number; count: number; color: 'lime' | 'amber' | 'sky' | 'red' | 'emerald'; icon: any }) {
  const cores: Record<string, { bg: string; icon: string }> = {
    lime:    { bg: 'bg-lime-50',    icon: 'bg-lime-100 text-lime-700' },
    amber:   { bg: 'bg-amber-50',   icon: 'bg-amber-100 text-amber-700' },
    sky:     { bg: 'bg-sky-50',     icon: 'bg-sky-100 text-sky-700' },
    red:     { bg: 'bg-red-50',     icon: 'bg-red-100 text-red-700' },
    emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-700' },
  };
  const c = cores[color];
  return (
    <Card className={cn('p-4', c.bg)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-bold text-ink-700 uppercase tracking-wider">{label}</p>
        {Icon && <div className={cn('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0', c.icon)}><Icon className="w-3.5 h-3.5" /></div>}
      </div>
      <p className="mt-2 text-lg font-bold text-ink-900">{format.brl(value)}</p>
      <p className="text-[10px] text-ink-600 mt-0.5">{count} lotes</p>
    </Card>
  );
}

function FaturamentoStepper({ status, dataAprovacao, dataEmissao, dataPagamento, numeroNf }: { status: string; dataAprovacao: string | null; dataEmissao: string | null; dataPagamento: string | null; numeroNf: string | null }) {
  const isCancelado = status === 'cancelado';
  const etapas = [
    { num: 1, label: 'Aprovação',      sub: dataAprovacao ? `Aprovado em ${format.data(dataAprovacao)}` : 'Em aprovação', done: !!dataAprovacao, current: !dataAprovacao && !isCancelado },
    { num: 2, label: 'Emissão da NF',  sub: dataEmissao ? 'NF emitida' : 'Aguardando',      done: !!dataEmissao,   current: !!dataAprovacao && !dataEmissao },
    { num: 3, label: 'NF Emitida',     sub: numeroNf || (dataEmissao ? 'Emitida' : 'Pendente'), done: !!dataEmissao, current: !!dataAprovacao && !dataEmissao },
    { num: 4, label: 'Pagamento',     sub: dataPagamento ? 'Pago' : 'Em cobrança',     done: !!dataPagamento, current: !!dataEmissao && !dataPagamento },
    { num: 5, label: 'Recebimento',   sub: dataPagamento ? format.data(dataPagamento) : 'Aguardando', done: !!dataPagamento, current: !!dataEmissao && !dataPagamento },
  ];

  return (
    <div className="flex items-start gap-0">
      {etapas.map((e, i) => {
        const isLast = i === etapas.length - 1;
        return (
          <div key={e.num} className="flex-1 flex items-start gap-1.5 min-w-0">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
                e.done ? 'bg-brand-600 text-white border-brand-600' :
                e.current ? 'bg-white text-brand-700 border-brand-500 ring-2 ring-brand-100' :
                'bg-white text-ink-400 border-ink-200',
              )}>
                {e.done ? <Check className="w-3.5 h-3.5" /> : e.num}
              </div>
              {!isLast && <div className={cn('w-px h-6 mt-1', e.done ? 'bg-brand-600' : 'bg-ink-200')} />}
            </div>
            <div className="min-w-0 pb-2 -mt-0.5">
              <div className={cn('text-[10px] font-bold uppercase tracking-wider', e.done ? 'text-brand-700' : e.current ? 'text-brand-600' : 'text-ink-400')}>{e.label}</div>
              <div className={cn('text-[10px] mt-0.5 truncate', e.done ? 'text-emerald-700' : 'text-ink-500')}>{e.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5">
      <dt className="text-ink-600 text-[11px]">{label}</dt>
      <dd className="font-mono font-semibold text-ink-800 text-[11px]">{value}</dd>
    </div>
  );
}
