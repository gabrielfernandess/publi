'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText, Lock, ChevronRight } from 'lucide-react';
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

const VEICULO_DOT: Record<string, string> = {
  dou: 'bg-navy-600',
  doe: 'bg-emerald-600',
  jornal: 'bg-amber-600',
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

// Cor do valor "faturado" baseado no percentual de uso
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

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterStatus) params.set('status', filterStatus);
    api.get<{ data: Contrato[] }>(`/api/contratos?${params}`).then((r) => setData(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

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
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH className="w-36">Município</TH>
                  <TH className="w-24">Contrato</TH>
                  <TH className="w-36">Vigência</TH>
                  <TH className="text-center" colSpan={4}><span className="inline-flex items-center gap-1"><span className={cn('w-2 h-2 rounded-sm', VEICULO_DOT.dou)} />DOU</span></TH>
                  <TH className="text-center" colSpan={4}><span className="inline-flex items-center gap-1"><span className={cn('w-2 h-2 rounded-sm', VEICULO_DOT.doe)} />DOE</span></TH>
                  <TH className="text-center" colSpan={4}><span className="inline-flex items-center gap-1"><span className={cn('w-2 h-2 rounded-sm', VEICULO_DOT.jornal)} />JORNAL</span></TH>
                  <TH className="w-24">Status</TH>
                  <TH className="w-6" />
                </TR>
                <TR>
                  <TH />
                  <TH />
                  <TH />
                  {['dou', 'doe', 'jornal'].map((tipo) => (
                    <>
                      <TH key={`${tipo}-c`} className="text-[10px] text-ink-500 font-medium text-center">Contratado</TH>
                      <TH key={`${tipo}-f`} className="text-[10px] text-ink-500 font-medium text-center">Faturado</TH>
                      <TH key={`${tipo}-d`} className="text-[10px] text-ink-500 font-medium text-center">Disponível</TH>
                      <TH key={`${tipo}-u`} className="text-[10px] text-ink-500 font-medium text-center">Utilizado</TH>
                    </>
                  ))}
                  <TH />
                  <TH />
                </TR>
              </THead>
              <TBody>
                {data.map((c) => {
                  const st = statusContrato(c);
                  return (
                    <TR key={c.id} className="hover:bg-ink-50/40 transition-colors group">
                      <TD>
                        <Link href={`/app/contratos/${c.id}`} className="block">
                          <div className="font-medium text-ink-900 text-sm whitespace-nowrap">{c.cliente_municipio}{c.cliente_estado ? ` - ${c.cliente_estado}` : ''}</div>
                          <div className="text-[10px] text-ink-500 truncate max-w-[140px]">{c.cliente_nome}</div>
                        </Link>
                      </TD>
                      <TD>
                        <Link href={`/app/contratos/${c.id}`} className="block">
                          <div className="font-mono text-sm text-ink-800 whitespace-nowrap">{c.numero || `#${c.id}`}</div>
                        </Link>
                      </TD>
                      <TD>
                        <Link href={`/app/contratos/${c.id}`} className="block">
                          <div className="text-xs text-ink-600 whitespace-nowrap">
                            {format.data(c.data_inicio)} a <strong>{format.data(c.data_fim)}</strong>
                          </div>
                          {c.dias_para_vencer !== null && (
                            <div className={cn('text-[10px] mt-0.5', c.dias_para_vencer < 0 ? 'text-red-600' : c.dias_para_vencer <= 60 ? 'text-amber-600' : 'text-ink-400')}>
                              {c.dias_para_vencer < 0 ? `Vencido há ${Math.abs(c.dias_para_vencer)}d` : c.dias_para_vencer <= 60 ? `Vence em ${c.dias_para_vencer}d` : `${c.dias_para_vencer}d restantes`}
                            </div>
                          )}
                        </Link>
                      </TD>
                      {(['dou', 'doe', 'jornal'] as const).map((tipo) => {
                        const v = c.cm_por_veiculo?.[tipo];
                        if (!v) {
                          return (
                            <TD key={tipo} colSpan={4} className="text-center text-ink-300 text-xs">—</TD>
                          );
                        }
                        const pct = v.cm_contratado > 0 ? (v.cm_utilizado / v.cm_contratado) * 100 : 0;
                        return (
                          <TD key={tipo} colSpan={4} className="px-1.5">
                            <div className="grid grid-cols-3 gap-1 text-[11px] font-mono">
                              <div className="text-center"><span className="font-semibold text-ink-900">{format.cm(v.cm_contratado)}</span></div>
                              <div className="text-center"><span className={cn('font-semibold', corFaturado(pct))}>{format.cm(v.cm_utilizado)}</span></div>
                              <div className="text-center"><span className={cn('font-semibold', v.cm_disponivel <= 0 ? 'text-red-600' : 'text-emerald-700')}>{format.cm(v.cm_disponivel)}</span></div>
                            </div>
                            <div className="mt-1 flex items-center gap-1.5">
                              <div className="flex-1 h-1.5 bg-ink-100 rounded-pill overflow-hidden">
                                <div className={cn('h-full', corBarra(pct))} style={{ width: `${Math.min(100, pct)}%` }} />
                              </div>
                              <span className={cn('text-[10px] font-bold w-8 text-right tabular-nums', corFaturado(pct))}>{pct.toFixed(0)}%</span>
                            </div>
                          </TD>
                        );
                      })}
                      <TD>
                        <Link href={`/app/contratos/${c.id}`} className="block">
                          <span className={cn('inline-flex items-center px-2.5 py-1 rounded-pill text-[10px] font-bold uppercase tracking-wider whitespace-nowrap', st.cor)}>
                            {st.label}
                          </span>
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
