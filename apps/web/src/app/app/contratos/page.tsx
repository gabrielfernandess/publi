'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText, Lock, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { api } from '@/lib/api';
import { useIsAdmin } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { format } from '@/lib/format';
import { cn } from '@/lib/utils';
import { VEICULO_STYLE, corFaturado, corBarra } from './shared';

type VeiculoResumo = { cm_contratado: number; cm_utilizado: number; cm_disponivel: number };
type CmPorVeiculo = { dou?: VeiculoResumo; doe?: VeiculoResumo; jornal?: VeiculoResumo };

type Contrato = {
  id: number;
  cliente_id: number;
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
  status: 'ativo' | 'encerrado' | 'suspenso';
  total_itens: number;
  cm_total_contratado: number;
  cm_total_utilizado: number;
  valor_total_venda: number;
  valor_utilizado: number;
  dias_para_vencer: number | null;
  cm_por_veiculo?: CmPorVeiculo;
};

const VEICULO_DOT: Record<string, string> = {
  dou: VEICULO_STYLE.dou.dot,
  doe: VEICULO_STYLE.doe.dot,
  jornal: VEICULO_STYLE.jornal.dot,
};

// Prioridade do status pra ordenação (menor = primeiro)
const STATUS_PRIORITY: Record<string, number> = {
  'Vigente': 1,
  'Atenção': 2,
  'A vencer': 3,
  'Esgotado': 4,
  'Vencido': 5,
  'Encerrado': 6,
};

type SortBy = 'vigencia' | 'municipio' | 'status' | 'valor';
const SORT_LABELS: Record<SortBy, string> = {
  vigencia: 'Vigência',
  municipio: 'Município',
  status: 'Status',
  valor: 'Valor',
};

type Cliente = { id: number; nome: string; municipio?: string; estado?: string };
type Veiculo = { id: number; nome: string; tipo: string; estado?: string };

type ItemForm = {
  veiculo_id: number | '';
  descricao: string;
  cm_contratado: number;
  valor_unitario_venda: number;
  valor_unitario_custo: number;
};

const emptyForm = {
  cliente_id: 0,
  numero: '',
  objeto: '',
  data_inicio: '',
  data_fim: '',
  modalidade: 'licitacao',
  processo: '',
  observacoes: '',
  itens: [] as ItemForm[],
};

function statusContrato(c: Contrato): { label: string; cor: string } {
  const dias = c.dias_para_vencer;
  if (c.status !== 'ativo') return { label: 'Encerrado', cor: 'bg-ink-100 text-ink-700' };
  const totalDisp = c.cm_total_contratado - c.cm_total_utilizado;
  if (totalDisp <= 0) return { label: 'Esgotado', cor: 'bg-red-100 text-red-700' };
  if (dias !== null && dias < 0) return { label: 'Vencido', cor: 'bg-red-100 text-red-700' };
  if (dias !== null && dias <= 60) return { label: 'A vencer', cor: 'bg-sky-100 text-sky-700' };
  const pct = c.cm_total_contratado > 0 ? (c.cm_total_utilizado / c.cm_total_contratado) * 100 : 0;
  if (pct >= 95) return { label: 'Atenção', cor: 'bg-amber-100 text-amber-700' };
  return { label: 'Vigente', cor: 'bg-emerald-100 text-emerald-700' };
}

export default function ContratosPage() {
  const isAdmin = useIsAdmin();
  const [data, setData] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAno, setFilterAno] = useState('');
  const [filterVigencia, setFilterVigencia] = useState('');
  const [filterVeiculo, setFilterVeiculo] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('vigencia');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterStatus) params.set('status', filterStatus);
    api.get<{ data: Contrato[] }>(`/api/contratos?${params}`).then((r) => setData(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Anos disponíveis derivados dos contratos carregados
  const anos = useMemo(() => {
    const set = new Set<number>();
    data.forEach((c) => {
      const a = new Date(c.data_inicio).getFullYear();
      if (!isNaN(a)) set.add(a);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [data]);

  // Filtros client-side (ano, vigência, veículo) + search/status (server-side via load)
  const filtered = useMemo(() => {
    const out = data.filter((c) => {
      if (filterAno) {
        const a = new Date(c.data_inicio).getFullYear();
        if (a !== Number(filterAno)) return false;
      }
      if (filterVigencia === 'vigentes' && c.dias_para_vencer !== null && c.dias_para_vencer < 0) return false;
      if (filterVigencia === 'vencidos' && (c.dias_para_vencer === null || c.dias_para_vencer >= 0)) return false;
      if (filterVigencia === 'a_vencer' && (c.dias_para_vencer === null || c.dias_para_vencer < 0 || c.dias_para_vencer > 60)) return false;
      if (filterVeiculo && !c.cm_por_veiculo?.[filterVeiculo as 'dou' | 'doe' | 'jornal']) return false;
      return true;
    });
    // Ordenação client-side
    const sorted = [...out].sort((a, b) => {
      if (sortBy === 'municipio') {
        return (a.cliente_municipio || '').localeCompare(b.cliente_municipio || '');
      }
      if (sortBy === 'status') {
        const sa = STATUS_PRIORITY[statusContrato(a).label] ?? 99;
        const sb = STATUS_PRIORITY[statusContrato(b).label] ?? 99;
        if (sa !== sb) return sa - sb;
        return a.data_fim.localeCompare(b.data_fim);
      }
      if (sortBy === 'valor') {
        return (b.valor_total_venda || 0) - (a.valor_total_venda || 0);
      }
      // 'vigencia' (default): contratos com data_fim mais próxima primeiro
      return a.data_fim.localeCompare(b.data_fim);
    });
    return sorted;
  }, [data, filterAno, filterVigencia, filterVeiculo, sortBy]);

  // Paginação client-side
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // Reset página quando filtros mudam
  useEffect(() => { setPage(1); }, [filterAno, filterVigencia, filterVeiculo, sortBy, search, filterStatus]);

  const clearFilters = () => {
    setSearch('');
    setFilterStatus('');
    setFilterAno('');
    setFilterVigencia('');
    setFilterVeiculo('');
    setTimeout(load, 0);
  };

  const openNew = async () => {
    setForm({ ...emptyForm, data_inicio: new Date().toISOString().slice(0, 10) });
    setErro(null);
    const [c, v] = await Promise.all([
      api.get<{ data: Cliente[] }>('/api/clientes'),
      api.get<{ data: Veiculo[] }>('/api/veiculos'),
    ]);
    setClientes(c.data);
    setVeiculos(v.data);
    setOpenForm(true);
  };

  const addItem = () => {
    setForm({ ...form, itens: [...form.itens, { veiculo_id: '', descricao: '', cm_contratado: 0, valor_unitario_venda: 0, valor_unitario_custo: 0 }] });
  };

  const updateItem = (idx: number, patch: Partial<ItemForm>) => {
    const next = [...form.itens];
    next[idx] = { ...next[idx], ...patch };
    setForm({ ...form, itens: next });
  };

  const removeItem = (idx: number) => {
    setForm({ ...form, itens: form.itens.filter((_, i) => i !== idx) });
  };

  const onVeiculoChange = (idx: number, veiculoId: number | '') => {
    const v = veiculos.find((x) => x.id === veiculoId);
    const desc = v ? (v.tipo === 'dou' ? 'DOU' : v.tipo === 'doe' ? `DOE/${v.estado || '?'}` : 'Jornal de Grande Circulação') : '';
    updateItem(idx, { veiculo_id: veiculoId, descricao: desc });
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (form.itens.length === 0) { setErro('Adicione ao menos 1 item ao contrato'); return; }
    if (form.itens.some((i) => !i.veiculo_id || i.cm_contratado <= 0)) { setErro('Todos os itens precisam ter veículo e cm contratado'); return; }
    setSaving(true);
    try {
      await api.post('/api/contratos', form);
      setOpenForm(false);
      load();
    } catch (err: any) {
      setErro(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const totalContratado = form.itens.reduce((acc, i) => acc + (i.cm_contratado * i.valor_unitario_venda), 0);

  return (
    <div>
      <PageHeader
        title="Contratos"
        description="Acompanhe vigência, saldos de centímetros e valor contratado"
        actions={
          isAdmin ? (
            <Button variant="primary" onClick={openNew}>
              <Plus className="w-4 h-4" />Novo contrato
            </Button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-500 bg-ink-100 px-2.5 py-1.5 rounded-md">
              <Lock className="w-3.5 h-3.5" />
              Somente admin pode cadastrar
            </span>
          )
        }
      />

      <Card className="mb-5">
        <div className="p-4 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex gap-2">
              <Input placeholder="Buscar por cliente, número ou objeto..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
              <Button variant="outline" onClick={load}><Search className="w-4 h-4" /></Button>
            </div>
            <Button variant="outline" onClick={clearFilters} className="border-ink-300">Limpar filtros</Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-600">Status</label>
              <Select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setTimeout(load, 0); }}>
                <option value="">Todos</option>
                <option value="ativo">Ativo</option>
                <option value="suspenso">Suspenso</option>
                <option value="encerrado">Encerrado</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-600">Ano</label>
              <Select value={filterAno} onChange={(e) => setFilterAno(e.target.value)}>
                <option value="">Todos</option>
                {anos.map((a) => <option key={a} value={a}>{a}</option>)}
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-600">Vigência</label>
              <Select value={filterVigencia} onChange={(e) => setFilterVigencia(e.target.value)}>
                <option value="">Todos</option>
                <option value="vigentes">Vigentes</option>
                <option value="a_vencer">A vencer (60d)</option>
                <option value="vencidos">Vencidos</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-600">Veículo</label>
              <Select value={filterVeiculo} onChange={(e) => setFilterVeiculo(e.target.value)}>
                <option value="">Todos</option>
                <option value="dou">DOU</option>
                <option value="doe">DOE</option>
                <option value="jornal">JORNAL</option>
              </Select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-ink-600">Ordenar por</label>
              <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
                <option value="vigencia">Vigência</option>
                <option value="status">Status</option>
                <option value="municipio">Município</option>
                <option value="valor">Valor</option>
              </Select>
            </div>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card className="p-8 text-center text-sm text-ink-500">Carregando contratos...</Card>
      ) : data.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="w-12 h-12" />}
            title="Nenhum contrato por aqui"
            description={isAdmin
              ? "Cada contrato vincula um cliente a um conjunto de veículos (DOU, DOE, jornal) com centímetro contratado. Crie o primeiro para começar."
              : "Quando um admin cadastrar o primeiro contrato, ele aparece aqui."}
            action={isAdmin
              ? <Button onClick={openNew}><Plus className="w-4 h-4" />Criar primeiro contrato</Button>
              : undefined}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="px-4 py-2 border-b border-ink-100 text-xs text-ink-500 flex items-center justify-between gap-3 flex-wrap">
            <span>Mostrando <strong className="text-ink-700">{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)}</strong> de <strong className="text-ink-700">{filtered.length}</strong> contratos {data.length !== filtered.length && <span className="text-ink-400">(filtro aplicado, {data.length} total)</span>}</span>
            <div className="flex items-center gap-2">
              <span className="text-ink-500">Por página:</span>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="px-2 py-1 rounded border border-ink-200 bg-white text-xs">
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <THead className="bg-transparent">
                <TR className="bg-ink-100/50 hover:bg-ink-100/50">
                  <TH className="w-32">Município</TH>
                  <TH className="w-20">Contrato</TH>
                  <TH className="w-32">Vigência</TH>
                  <TH className="text-center" colSpan={4}><span className="inline-flex items-center gap-1"><span className={cn('w-2 h-2 rounded-sm', VEICULO_DOT.dou)} />DOU</span></TH>
                  <TH className="text-center" colSpan={4}><span className="inline-flex items-center gap-1"><span className={cn('w-2 h-2 rounded-sm', VEICULO_DOT.doe)} />DOE</span></TH>
                  <TH className="text-center" colSpan={4}><span className="inline-flex items-center gap-1"><span className={cn('w-2 h-2 rounded-sm', VEICULO_DOT.jornal)} />JORNAL</span></TH>
                  <TH className="w-20">Status</TH>
                  <TH className="w-6" />
                </TR>
                <TR className="hover:bg-transparent">
                  <TH />
                  <TH />
                  <TH />
                  {['dou', 'doe', 'jornal'].map((tipo) => (
                    <>
                      <TH key={`${tipo}-c`} className={cn('px-2 text-xs text-ink-500 font-medium text-center', tipo !== 'doe' && 'bg-ink-100/50')}>Contratado</TH>
                      <TH key={`${tipo}-f`} className={cn('px-2 text-xs text-ink-500 font-medium text-center', tipo !== 'doe' && 'bg-ink-100/50')}>Faturado</TH>
                      <TH key={`${tipo}-d`} className={cn('px-2 text-xs text-ink-500 font-medium text-center', tipo !== 'doe' && 'bg-ink-100/50')}>Disponível</TH>
                      <TH key={`${tipo}-u`} className={cn('px-2 text-xs text-ink-500 font-medium text-center', tipo !== 'doe' && 'bg-ink-100/50')}>Utilizado</TH>
                    </>
                  ))}
                  <TH />
                  <TH />
                </TR>
              </THead>
              <TBody>
                {paged.map((c, idx) => {
                  const st = statusContrato(c);
                  return (
                    <TR key={c.id} className={cn('hover:bg-brand-50/40 transition-colors group', idx % 2 === 1 && 'bg-ink-100/50')}>
                      <TD>
                        <Link href={`/app/contratos/${c.id}`} className="block">
                          <div className="text-sm font-medium text-ink-900 whitespace-nowrap">{c.cliente_municipio}{c.cliente_estado ? ` - ${c.cliente_estado}` : ''}</div>
                        </Link>
                      </TD>
                      <TD>
                        <Link href={`/app/contratos/${c.id}`} className="block">
                          <div className="font-mono text-xs text-ink-800 whitespace-nowrap">{c.numero || `#${c.id}`}</div>
                        </Link>
                      </TD>
                      <TD>
                        <Link href={`/app/contratos/${c.id}`} className="block">
                          <div className="text-xs text-ink-600 whitespace-nowrap leading-tight">
                            {format.data(c.data_inicio)}<br />
                            <span className="text-ink-400">a </span><strong className="text-ink-700">{format.data(c.data_fim)}</strong>
                          </div>
                        </Link>
                      </TD>
                      {(['dou', 'doe', 'jornal'] as const).map((tipo) => {
                        const v = c.cm_por_veiculo?.[tipo];
                        const cellBg = tipo !== 'doe' ? 'bg-ink-100/50' : '';
                        if (!v) {
                          return (
                            <TD key={tipo} colSpan={4} className={cn('text-center text-ink-300 text-xs whitespace-nowrap', cellBg)}>—</TD>
                          );
                        }
                        const pct = v.cm_contratado > 0 ? (v.cm_utilizado / v.cm_contratado) * 100 : 0;
                        const corDisp = v.cm_disponivel <= 0 ? 'text-red-600' : pct >= 90 ? 'text-amber-600' : 'text-emerald-700';
                        // 4 TDs alinhados 1:1 com os 4 THs do header — sem labels redundantes
                        return (
                          <Fragment key={tipo}>
                            <TD className={cn('px-2 text-center whitespace-nowrap', cellBg)}>
                              <span className="font-mono text-xs font-semibold text-ink-900">{format.cm(v.cm_contratado)}</span>
                            </TD>
                            <TD className={cn('px-2 text-center whitespace-nowrap', cellBg)}>
                              <span className="font-mono text-xs font-semibold text-ink-900">{format.cm(v.cm_utilizado)}</span>
                            </TD>
                            <TD className={cn('px-2 text-center whitespace-nowrap', cellBg)}>
                              <span className={cn('font-mono text-xs font-semibold', corDisp)}>{format.cm(v.cm_disponivel)}</span>
                            </TD>
                            <TD className={cn('px-2 text-center', cellBg)}>
                              <div className={cn('font-mono text-xs font-semibold whitespace-nowrap', corFaturado(pct))}>{pct.toFixed(0)}%</div>
                              <div className="mt-1 h-1.5 bg-ink-100 rounded-pill overflow-hidden">
                                <div className={cn('h-full', corBarra(pct))} style={{ width: `${Math.min(100, pct)}%` }} />
                              </div>
                            </TD>
                          </Fragment>
                        );
                      })}
                      <TD>
                        <Link href={`/app/contratos/${c.id}`} className="block">
                          <Badge className={st.cor}>{st.label}</Badge>
                        </Link>
                      </TD>
                      <TD>
                        <Link href={`/app/contratos/${c.id}`} className="block text-right">
                          <ChevronRight className="w-4 h-4 text-ink-400 group-hover:text-brand-600 inline" />
                        </Link>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-ink-100 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs text-ink-500">
                Página <strong className="text-ink-700">{page}</strong> de <strong className="text-ink-700">{totalPages}</strong>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="p-1.5 rounded border border-ink-200 text-ink-600 hover:bg-ink-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Primeira página"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded border border-ink-200 text-ink-600 hover:bg-ink-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Anterior"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                {(() => {
                  const pages: (number | '...')[] = [];
                  const max = totalPages;
                  const cur = page;
                  if (max <= 7) {
                    for (let i = 1; i <= max; i++) pages.push(i);
                  } else {
                    pages.push(1);
                    if (cur > 3) pages.push('...');
                    for (let i = Math.max(2, cur - 1); i <= Math.min(max - 1, cur + 1); i++) pages.push(i);
                    if (cur < max - 2) pages.push('...');
                    pages.push(max);
                  }
                  return pages.map((p, i) =>
                    p === '...' ? (
                      <span key={`d-${i}`} className="px-2 text-ink-400 text-xs">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={cn(
                          'min-w-[2rem] h-8 px-2 rounded text-xs font-semibold transition-colors',
                          page === p
                            ? 'bg-brand-600 text-white'
                            : 'border border-ink-200 text-ink-700 hover:bg-ink-50'
                        )}
                      >
                        {p}
                      </button>
                    )
                  );
                })()}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded border border-ink-200 text-ink-600 hover:bg-ink-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Próxima"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="p-1.5 rounded border border-ink-200 text-ink-600 hover:bg-ink-50 disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Última página"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </Card>
      )}

      <Modal
        open={openForm}
        onClose={() => setOpenForm(false)}
        title="Novo contrato"
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button onClick={onSave} loading={saving}>Criar contrato</Button>
          </>
        }
      >
        <form onSubmit={onSave} className="space-y-5">
          {erro && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</div>}

          <div className="grid sm:grid-cols-2 gap-4">
            <Select label="Cliente" required value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: Number(e.target.value) })}>
              <option value={0}>Selecione...</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome} ({c.municipio}/{c.estado})</option>)}
            </Select>
            <Input label="Número do contrato" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="063/2025" />
          </div>

          <Input label="Objeto" value={form.objeto} onChange={(e) => setForm({ ...form, objeto: e.target.value })} placeholder="Publicidade legal em DOU, DOE e Jornal..." />

          <div className="grid sm:grid-cols-4 gap-4">
            <Input label="Data início" type="date" required value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
            <Input label="Data fim" type="date" required value={form.data_fim} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} />
            <Select label="Modalidade" value={form.modalidade} onChange={(e) => setForm({ ...form, modalidade: e.target.value })}>
              <option value="licitacao">Licitação</option>
              <option value="adesao">Adesão (ata)</option>
              <option value="contrato_direto">Contrato direto</option>
            </Select>
            <Input label="Nº do processo" value={form.processo} onChange={(e) => setForm({ ...form, processo: e.target.value })} placeholder="091/2025" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-ink-800">Itens do contrato</h3>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-3.5 h-3.5" /> Adicionar item
              </Button>
            </div>
            {form.itens.length === 0 ? (
              <div className="text-center py-8 text-sm text-ink-500 bg-ink-50 rounded-lg">
                Nenhum item. Adicione ao menos DOU, DOE ou Jornal.
              </div>
            ) : (
              <div className="space-y-3">
                {form.itens.map((it, idx) => (
                  <div key={idx} className="bg-ink-50 rounded-lg p-3 space-y-3 border border-ink-100">
                    <div className="grid sm:grid-cols-6 gap-3">
                      <div className="sm:col-span-2">
                        <Select label="Veículo" value={it.veiculo_id} onChange={(e) => onVeiculoChange(idx, e.target.value ? Number(e.target.value) : '')}>
                          <option value="">Selecione...</option>
                          {veiculos.map((v) => <option key={v.id} value={v.id}>{v.nome} ({v.estado || v.tipo.toUpperCase()})</option>)}
                        </Select>
                      </div>
                      <Input label="Descrição" value={it.descricao} onChange={(e) => updateItem(idx, { descricao: e.target.value })} placeholder="DOU" />
                      <Input label="cm contratado" type="number" step="0.01" value={it.cm_contratado} onChange={(e) => updateItem(idx, { cm_contratado: Number(e.target.value) })} />
                      <Input label="Venda R$/cm" type="number" step="0.01" value={it.valor_unitario_venda} onChange={(e) => updateItem(idx, { valor_unitario_venda: Number(e.target.value) })} />
                      <Input label="Custo R$/cm" type="number" step="0.01" value={it.valor_unitario_custo} onChange={(e) => updateItem(idx, { valor_unitario_custo: Number(e.target.value) })} />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-ink-500">Total do item: <strong className="text-ink-800">{format.brl(it.cm_contratado * it.valor_unitario_venda)}</strong></span>
                      <button type="button" onClick={() => removeItem(idx)} className="text-red-600 hover:underline">Remover</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {form.itens.length > 0 && (
            <div className="bg-brand-50 rounded-lg p-4 border border-brand-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-brand-600 uppercase tracking-wider font-semibold">Total contratado</div>
                  <div className="text-2xl font-bold text-brand-800 mt-1">{format.brl(totalContratado)}</div>
                </div>
                <div className="text-right text-xs text-brand-600">
                  {form.itens.length} {form.itens.length === 1 ? 'item' : 'itens'} · {form.itens.reduce((acc, i) => acc + i.cm_contratado, 0).toFixed(0)} cm no total
                </div>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
