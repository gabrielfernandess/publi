'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, FileText, Lock, ChevronRight, Edit2, Receipt } from 'lucide-react';
import { api } from '@/lib/api';
import { useIsAdmin } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { format } from '@/lib/format';
import { cn } from '@/lib/utils';

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

const VEICULO_DOT: Record<string, string> = {
  dou: 'bg-navy-600',
  doe: 'bg-emerald-600',
  jornal: 'bg-amber-600',
};

const VEICULO_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  dou:    { bg: 'bg-navy-50',     text: 'text-navy-700',     label: 'DOU' },
  doe:    { bg: 'bg-emerald-50',  text: 'text-emerald-700',  label: 'DOE' },
  jornal: { bg: 'bg-amber-50',    text: 'text-amber-700',    label: 'JORNAL' },
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

export default function ContratosPage() {
  const isAdmin = useIsAdmin();
  const [data, setData] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [movs, setMovs] = useState<Movimentacao[] | null>(null);
  const [loadingMov, setLoadingMov] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterStatus) params.set('status', filterStatus);
    api.get<{ data: Contrato[] }>(`/api/contratos?${params}`).then((r) => setData(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (data.length > 0 && selectedId === null) {
      selectContrato(data[0].id);
    } else if (selectedId !== null && !data.find((c) => c.id === selectedId)) {
      setSelectedId(data[0]?.id ?? null);
      if (data[0]) loadMovs(data[0].id);
    }
  }, [data]);

  const selectContrato = (id: number) => {
    setSelectedId(id);
    loadMovs(id);
  };

  const loadMovs = async (id: number) => {
    setMovs(null);
    setLoadingMov(true);
    try {
      const r = await api.get<{ data: Movimentacao[] }>(`/api/contratos/${id}/movimentacoes`);
      setMovs(r.data);
    } catch {
      setMovs([]);
    } finally {
      setLoadingMov(false);
    }
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
  const selected = data.find((c) => c.id === selectedId) || null;
  const totalPct = selected && selected.cm_total_contratado > 0 ? (selected.cm_total_utilizado / selected.cm_total_contratado) * 100 : 0;

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
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex gap-2">
            <Input placeholder="Buscar por cliente, número ou objeto..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
            <Button variant="outline" onClick={load}><Search className="w-4 h-4" /></Button>
          </div>
          <Select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setTimeout(load, 0); }} className="sm:w-48">
            <option value="">Todos os status</option>
            <option value="ativo">Ativo</option>
            <option value="suspenso">Suspenso</option>
            <option value="encerrado">Encerrado</option>
          </Select>
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
              ? "Cada contrato amarra um cliente a um conjunto de veículos (DOU, DOE, jornal) com centímetro contratado. Cria o primeiro pra começar."
              : "Quando um admin cadastrar o primeiro contrato, ele aparece aqui."}
            action={isAdmin
              ? <Button onClick={openNew}><Plus className="w-4 h-4" />Criar primeiro contrato</Button>
              : undefined}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden mb-5">
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH className="w-32">Município</TH>
                  <TH className="w-20">Contrato</TH>
                  <TH className="w-32">Vigência</TH>
                  <TH className="text-center bg-ink-50/60" colSpan={4}><span className="inline-flex items-center gap-1"><span className={cn('w-2 h-2 rounded-sm', VEICULO_DOT.dou)} />DOU</span></TH>
                  <TH className="text-center" colSpan={4}><span className="inline-flex items-center gap-1"><span className={cn('w-2 h-2 rounded-sm', VEICULO_DOT.doe)} />DOE</span></TH>
                  <TH className="text-center bg-ink-50/60" colSpan={4}><span className="inline-flex items-center gap-1"><span className={cn('w-2 h-2 rounded-sm', VEICULO_DOT.jornal)} />JORNAL</span></TH>
                  <TH className="w-20">Status</TH>
                  <TH className="w-6" />
                </TR>
                <TR>
                  <TH />
                  <TH />
                  <TH />
                  {['dou', 'doe', 'jornal'].map((tipo) => (
                    <>
                      <TH key={`${tipo}-c`} className={cn('text-[10px] text-ink-500 font-medium text-center', tipo !== 'doe' && 'bg-ink-50/60')}>Contratado</TH>
                      <TH key={`${tipo}-f`} className={cn('text-[10px] text-ink-500 font-medium text-center', tipo !== 'doe' && 'bg-ink-50/60')}>Faturado</TH>
                      <TH key={`${tipo}-d`} className={cn('text-[10px] text-ink-500 font-medium text-center', tipo !== 'doe' && 'bg-ink-50/60')}>Disponível</TH>
                      <TH key={`${tipo}-u`} className={cn('text-[10px] text-ink-500 font-medium text-center', tipo !== 'doe' && 'bg-ink-50/60')}>Utilizado</TH>
                    </>
                  ))}
                  <TH />
                  <TH />
                </TR>
              </THead>
              <TBody>
                {data.map((c) => {
                  const st = statusContrato(c);
                  const isSelected = selectedId === c.id;
                  return (
                    <TR
                      key={c.id}
                      onClick={() => selectContrato(c.id)}
                      className={cn('cursor-pointer hover:bg-ink-50/40 transition-colors', isSelected && 'bg-brand-50/40')}
                    >
                      <TD>
                        <div className="font-medium text-ink-900 text-xs whitespace-nowrap">{c.cliente_municipio}{c.cliente_estado ? ` - ${c.cliente_estado}` : ''}</div>
                      </TD>
                      <TD>
                        <div className="font-mono text-xs text-ink-800 whitespace-nowrap">{c.numero || `#${c.id}`}</div>
                      </TD>
                      <TD>
                        <div className="text-[11px] text-ink-600 whitespace-nowrap leading-tight">
                          {format.data(c.data_inicio)}<br />
                          <span className="text-ink-400">a </span><strong className="text-ink-700">{format.data(c.data_fim)}</strong>
                        </div>
                      </TD>
                      {(['dou', 'doe', 'jornal'] as const).map((tipo) => {
                        const v = c.cm_por_veiculo?.[tipo];
                        const cellBg = tipo !== 'doe' ? 'bg-ink-50/60' : '';
                        if (!v) {
                          return (
                            <TD key={tipo} colSpan={4} className={cn('text-center text-ink-300 text-xs', cellBg)}>—</TD>
                          );
                        }
                        const pct = v.cm_contratado > 0 ? (v.cm_utilizado / v.cm_contratado) * 100 : 0;
                        const corDisp = v.cm_disponivel <= 0 ? 'text-red-600' : pct >= 90 ? 'text-amber-600' : 'text-emerald-700';
                        return (
                          <TD key={tipo} colSpan={4} className={cn('px-1', cellBg)}>
                            <div className="grid grid-cols-4 gap-1">
                              <div className="text-center">
                                <div className="text-[9px] text-ink-500 uppercase tracking-wider">Contratado</div>
                                <div className="font-mono text-[11px] font-semibold text-ink-900 mt-0.5">{format.cm(v.cm_contratado)}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-[9px] text-ink-500 uppercase tracking-wider">Faturado</div>
                                <div className="font-mono text-[11px] font-semibold text-ink-900 mt-0.5">{format.cm(v.cm_utilizado)}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-[9px] text-ink-500 uppercase tracking-wider">Disponível</div>
                                <div className={cn('font-mono text-[11px] font-semibold mt-0.5', corDisp)}>{format.cm(v.cm_disponivel)}</div>
                              </div>
                              <div className="text-center">
                                <div className="text-[9px] text-ink-500 uppercase tracking-wider">Utilizado</div>
                                <div className={cn('font-mono text-[11px] font-semibold mt-0.5', corFaturado(pct))}>{pct.toFixed(0)}%</div>
                                <div className="mt-1 h-1.5 bg-ink-100 rounded-pill overflow-hidden">
                                  <div className={cn('h-full', corBarra(pct))} style={{ width: `${Math.min(100, pct)}%` }} />
                                </div>
                              </div>
                            </div>
                          </TD>
                        );
                      })}
                      <TD>
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-pill text-[9px] font-bold uppercase tracking-wider whitespace-nowrap', st.cor)}>
                          {st.label}
                        </span>
                      </TD>
                      <TD>
                        <ChevronRight className={cn('w-4 h-4', isSelected ? 'text-brand-600' : 'text-ink-400')} />
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Painel de detalhes + Movimentações (tudo na mesma página, estilo Publica Mais) */}
      {selected && (
        <>
          <div className="grid lg:grid-cols-3 gap-4 mb-5">
            {/* Detalhes do contrato */}
            <Card>
              <div className="p-5">
                <p className="text-[10px] font-bold text-ink-500 uppercase tracking-widest mb-3">Detalhes do contrato</p>
                <h3 className="text-base font-bold text-ink-900">{selected.cliente_municipio}{selected.cliente_estado ? ` - ${selected.cliente_estado}` : ''}</h3>
                <p className="text-xs text-ink-500 mt-0.5">{selected.cliente_nome}</p>
                <span className={cn('inline-block mt-2 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider', statusContrato(selected).cor)}>
                  {statusContrato(selected).label}
                </span>
                <dl className="mt-4 space-y-2 text-xs">
                  <div className="flex justify-between gap-3"><dt className="text-ink-500 whitespace-nowrap">Contrato</dt><dd className="font-mono text-ink-800">{selected.numero || `#${selected.id}`}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-ink-500 whitespace-nowrap">Vigência</dt><dd className="text-ink-800 text-right">{format.data(selected.data_inicio)} → {format.data(selected.data_fim)}</dd></div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-500 whitespace-nowrap">Dias restantes</dt>
                    <dd className={cn('font-semibold', (selected.dias_para_vencer ?? 0) < 0 ? 'text-red-600' : (selected.dias_para_vencer ?? 0) <= 60 ? 'text-amber-600' : 'text-ink-800')}>
                      {selected.dias_para_vencer !== null
                        ? (selected.dias_para_vencer < 0 ? `${Math.abs(selected.dias_para_vencer)}d vencido` : `${selected.dias_para_vencer}d`)
                        : '—'}
                    </dd>
                  </div>
                  {selected.objeto && (
                    <div className="pt-2 border-t border-ink-100">
                      <dt className="text-ink-500 mb-1">Objeto</dt>
                      <dd className="text-ink-700 leading-relaxed">{selected.objeto}</dd>
                    </div>
                  )}
                </dl>
                {isAdmin && (
                  <Button variant="outline" size="sm" className="mt-4 w-full">
                    <Edit2 className="w-3.5 h-3.5" />Editar contrato
                  </Button>
                )}
              </div>
            </Card>

            {/* Saldos por veículo */}
            <Card>
              <div className="p-5">
                <p className="text-[10px] font-bold text-ink-500 uppercase tracking-widest mb-3">Saldos por veículo</p>
                <div className="space-y-3">
                  {(['dou', 'doe', 'jornal'] as const).map((tipo) => {
                    const v = selected.cm_por_veiculo?.[tipo];
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
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className={cn('w-7 h-7 rounded-md bg-white flex items-center justify-center text-[10px] font-bold', meta.text)}>{meta.label}</span>
                            <span className="text-xs font-semibold text-ink-700">{pct.toFixed(0)}% utilizado</span>
                          </div>
                          <span className={cn('text-sm font-bold', v.cm_disponivel <= 0 ? 'text-red-600' : 'text-emerald-700')}>
                            {format.cm(v.cm_disponivel)} <span className="text-[10px] font-normal text-ink-500">disp</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[11px]">
                          <div>
                            <div className="text-ink-500">Contratado</div>
                            <div className="font-mono font-semibold text-ink-900">{format.cm(v.cm_contratado)}</div>
                          </div>
                          <div>
                            <div className="text-ink-500">Faturado</div>
                            <div className={cn('font-mono font-semibold', corFaturado(pct))}>{format.cm(v.cm_utilizado)}</div>
                          </div>
                          <div>
                            <div className="text-ink-500">Disponível</div>
                            <div className={cn('font-mono font-semibold', v.cm_disponivel <= 0 ? 'text-red-600' : 'text-emerald-700')}>{format.cm(v.cm_disponivel)}</div>
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 bg-white rounded-pill overflow-hidden">
                          <div className={cn('h-full', corBarra(pct))} style={{ width: `${Math.min(100, pct)}%` }} />
                        </div>
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
                  <div className="flex justify-between gap-3"><dt className="text-ink-500">Status</dt><dd className="font-semibold text-ink-800 capitalize">{selected.status}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-ink-500">Modalidade</dt><dd className="text-ink-800 capitalize">{selected.modalidade || '—'}</dd></div>
                  {selected.processo && <div className="flex justify-between gap-3"><dt className="text-ink-500">Processo</dt><dd className="font-mono text-ink-800">{selected.processo}</dd></div>}
                  <div className="flex justify-between gap-3"><dt className="text-ink-500">Valor contratado</dt><dd className="font-semibold text-ink-900">{format.brl(selected.valor_total_venda)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-ink-500">Valor utilizado</dt><dd className="font-semibold text-ink-900">{format.brl(selected.valor_utilizado)}</dd></div>
                  <div className="flex justify-between gap-3"><dt className="text-ink-500">Total cm</dt><dd className="font-mono text-ink-800">{format.cm(selected.cm_total_contratado)}</dd></div>
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
              </div>
            </Card>
          </div>

          {/* Movimentações do contrato (sempre abaixo) */}
          <Card>
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
            {loadingMov ? (
              <div className="p-8 text-center text-sm text-ink-500">Carregando movimentações...</div>
            ) : !movs || movs.length === 0 ? (
              <div className="p-8 text-center text-sm text-ink-500">Nenhuma movimentação registrada neste contrato ainda.</div>
            ) : (
              <>
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
                        const isEstorno = m.cm > 0; // NF cancelada devolve cm (positivo)
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
                <div className="p-4 border-t border-ink-100 text-center">
                  <Button variant="ghost" size="sm">
                    Ver todas as movimentações
                  </Button>
                </div>
              </>
            )}
          </Card>
        </>
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
                  {form.itens.length} item(ns) • {form.itens.reduce((acc, i) => acc + i.cm_contratado, 0).toFixed(0)} cm no total
                </div>
              </div>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
