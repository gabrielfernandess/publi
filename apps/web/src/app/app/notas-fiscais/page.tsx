'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Receipt, Calendar, AlertTriangle, Check, X, Download, MoreVertical, ChevronDown, Filter } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { format, diasAte } from '@/lib/format';
import { cn } from '@/lib/utils';

type NF = {
  id: number;
  numero: string;
  data_emissao: string;
  data_pagamento?: string;
  valor: number;
  status: 'emitida' | 'enviada' | 'cancelada' | 'paga';
  observacoes?: string;
  cliente_nome: string;
  cliente_tipo: string;
  cliente_municipio?: string;
  cliente_estado?: string;
  pedido_id?: number;
  pedido_descricao?: string;
  contrato_id?: number;
  contrato_numero?: string;
};

const STATUS_NF: Record<string, { label: string; variant: any; icon: any; corBg: string; corText: string }> = {
  emitida:   { label: 'A receber',  variant: 'warning', icon: Receipt,   corBg: 'bg-amber-100', corText: 'text-amber-800' },
  enviada:   { label: 'Em cobrança', variant: 'info',    icon: Download,  corBg: 'bg-sky-100',   corText: 'text-sky-800' },
  paga:      { label: 'Paga',        variant: 'success', icon: Check,      corBg: 'bg-emerald-100', corText: 'text-emerald-800' },
  cancelada: { label: 'Cancelada',   variant: 'danger',  icon: X,          corBg: 'bg-red-100',   corText: 'text-red-800' },
};

const emptyForm = {
  cliente_id: 0,
  pedido_id: null as number | null,
  numero: '',
  data_emissao: new Date().toISOString().slice(0, 10),
  valor: 0,
  observacoes: '',
};

export default function NotasFiscaisPage() {
  const { user } = useAuth();
  const [data, setData] = useState<NF[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAtrasada, setFilterAtrasada] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [openPagar, setOpenPagar] = useState<NF | null>(null);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [openDetalhes, setOpenDetalhes] = useState<NF | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [clientes, setClientes] = useState<any[]>([]);
  const [pedidos, setPedidos] = useState<any[]>([]);

  const canImport = user?.papel === 'admin' || user?.papel === 'faturamento';
  const canPagar = user?.papel === 'admin' || user?.papel === 'financeiro';
  const canCancelar = user?.papel === 'admin';

  // busca direto quando muda o filtro (sem depender de state assíncrono)
  const buscar = (s: string, st: string, atr: boolean) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (s) params.set('search', s);
    if (st) params.set('status', st);
    if (atr) params.set('atrasada', '1');
    const url = params.toString() ? `/api/notas-fiscais?${params}` : '/api/notas-fiscais';
    api.get<{ data: NF[] }>(url)
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  };

  // primeira carga
  useEffect(() => { buscar('', '', false); }, []);

  const onSearchKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') buscar(search, filterStatus, filterAtrasada);
  };

  const onFilterStatus = (novo: string) => {
    setFilterStatus(novo);
    buscar(search, novo, filterAtrasada);
  };

  const onFilterAtrasada = (novo: boolean) => {
    setFilterAtrasada(novo);
    buscar(search, filterStatus, novo);
  };

  const openNew = async () => {
    setForm(emptyForm);
    setErro(null);
    const [c, p] = await Promise.all([
      api.get<{ data: any[] }>('/api/clientes'),
      api.get<{ data: any[] }>('/api/pedidos?status=aprovacao_faturamento'),
    ]);
    setClientes(c.data);
    setPedidos(p.data);
    setOpenForm(true);
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!form.cliente_id) { setErro('Selecione um cliente'); return; }
    if (!form.numero) { setErro('Informe o número da NF'); return; }
    if (form.valor <= 0) { setErro('Valor deve ser maior que zero'); return; }
    setSaving(true);
    try {
      await api.post('/api/notas-fiscais', form);
      setOpenForm(false);
      buscar(search, filterStatus, filterAtrasada);
    } catch (err: any) {
      setErro(err.message || 'Erro ao importar NF');
    } finally {
      setSaving(false);
    }
  };

  const onPagar = async () => {
    if (!openPagar) return;
    setSaving(true);
    try {
      await api.patch(`/api/notas-fiscais/${openPagar.id}`, { status: 'paga', data_pagamento: dataPagamento });
      setOpenPagar(null);
      buscar(search, filterStatus, filterAtrasada);
    } catch (err: any) {
      alert(err.message || 'Erro ao marcar como paga');
    } finally {
      setSaving(false);
    }
  };

  const onCancelar = async (nf: NF) => {
    if (!confirm(`Cancelar a NF ${nf.numero}? O saldo do contrato será estornado automaticamente.`)) return;
    try {
      await api.patch(`/api/notas-fiscais/${nf.id}`, { status: 'cancelada' });
      setOpenMenu(null);
      buscar(search, filterStatus, filterAtrasada);
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar');
    }
  };

  // totais
  const totalAReceber = data.filter((n) => n.status === 'emitida' || n.status === 'enviada').reduce((acc, n) => acc + n.valor, 0);
  const totalRecebido = data.filter((n) => n.status === 'paga').reduce((acc, n) => acc + n.valor, 0);
  const totalCancelado = data.filter((n) => n.status === 'cancelada').reduce((acc, n) => acc + n.valor, 0);
  const nfsAtrasadas = data.filter((n) => (n.status === 'emitida' || n.status === 'enviada') && diasAte(n.data_emissao) !== null && diasAte(n.data_emissao)! < -60).length;
  const nfsVisiveis = data.filter((n) => !filterAtrasada || ((n.status === 'emitida' || n.status === 'enviada') && diasAte(n.data_emissao) !== null && diasAte(n.data_emissao)! < -60));

  return (
    <div>
      <PageHeader
        title="Notas fiscais"
        description="Aqui você importa e acompanha as NFs emitidas pelo Conta Azul — sem digitar duas vezes."
        actions={
          canImport && (
            <Button variant="primary" onClick={openNew} rounded="md">
              <Plus className="w-4 h-4" />Importar NF
            </Button>
          )
        }
      />

      {/* KPIs no topo — visão executiva do caixa */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <Card className="p-5">
          <p className="text-xs text-ink-500 uppercase tracking-wider font-medium">A receber</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{format.brl(totalAReceber)}</p>
          <p className="text-xs text-ink-500 mt-1">
            {data.filter((n) => n.status === 'emitida' || n.status === 'enviada').length} NF(s) em aberto
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-ink-500 uppercase tracking-wider font-medium">Já recebido</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{format.brl(totalRecebido)}</p>
          <p className="text-xs text-ink-500 mt-1">
            {data.filter((n) => n.status === 'paga').length} NF(s) pagas
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-ink-500 uppercase tracking-wider font-medium">Atrasadas (+60d)</p>
          <p className={cn('mt-2 text-2xl font-bold', nfsAtrasadas > 0 ? 'text-red-600' : 'text-ink-900')}>
            {nfsAtrasadas}
          </p>
          <p className="text-xs text-ink-500 mt-1">
            {nfsAtrasadas > 0 ? 'precisam de cobrança ativa' : 'nenhuma atrasada'}
          </p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-ink-500 uppercase tracking-wider font-medium">Canceladas</p>
          <p className="mt-2 text-2xl font-bold text-ink-500">{format.brl(totalCancelado)}</p>
          <p className="text-xs text-ink-500 mt-1">
            {data.filter((n) => n.status === 'cancelada').length} NF(s) canceladas
          </p>
        </Card>
      </div>

      {/* Filtros funcionais */}
      <Card className="mb-5">
        <div className="p-4 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
                <input
                  type="text"
                  placeholder="Buscar por número, cliente ou observação..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={onSearchKey}
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg border border-ink-200 bg-white text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <Button variant="outline" onClick={() => buscar(search, filterStatus, filterAtrasada)} rounded="md">
                Buscar
              </Button>
            </div>
            <Select
              value={filterStatus}
              onChange={(e) => onFilterStatus(e.target.value)}
              className="sm:w-48"
            >
              <option value="">Todos os status</option>
              <option value="emitida">A receber</option>
              <option value="enviada">Em cobrança</option>
              <option value="paga">Paga</option>
              <option value="cancelada">Cancelada</option>
            </Select>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-2 cursor-pointer text-ink-600 hover:text-ink-900">
              <input
                type="checkbox"
                checked={filterAtrasada}
                onChange={(e) => onFilterAtrasada(e.target.checked)}
                className="w-4 h-4 accent-brand-600"
              />
              <span>Mostrar só atrasadas (+60d)</span>
            </label>
            {(search || filterStatus || filterAtrasada) && (
              <button
                onClick={() => { setSearch(''); setFilterStatus(''); setFilterAtrasada(false); buscar('', '', false); }}
                className="text-xs text-brand-600 hover:underline"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-500">Carregando...</div>
        ) : nfsVisiveis.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-12 h-12" />}
            title={data.length === 0 ? "Nenhuma NF importada" : "Nenhuma NF com esses filtros"}
            description={
              data.length === 0
                ? "Importe a primeira NF emitida pelo Conta Azul pra começar a controlar pagamentos."
                : "Tente ajustar os filtros ou limpar a busca."
            }
            action={data.length === 0 && canImport && (
              <Button onClick={openNew}><Plus className="w-4 h-4" />Importar NF</Button>
            )}
          />
        ) : (
          <>
            <div className="px-4 py-2.5 border-b border-ink-100 bg-ink-50/50 text-xs text-ink-600 flex items-center justify-between">
              <span>
                {nfsVisiveis.length} NF(s) {filterAtrasada && 'atrasadas '}
                {(search || filterStatus) && '(filtrado)'}
              </span>
              <span className="text-ink-500">Total a receber: <strong className="text-amber-700">{format.brl(nfsVisiveis.filter((n) => n.status === 'emitida' || n.status === 'enviada').reduce((acc, n) => acc + n.valor, 0))}</strong></span>
            </div>
            <Table>
              <THead>
                <TR>
                  <TH>NF</TH>
                  <TH>Cliente / Pedido</TH>
                  <TH>Emissão</TH>
                  <TH>Pagamento</TH>
                  <TH className="text-right">Valor</TH>
                  <TH>Status</TH>
                  <TH className="w-12 text-right">Ações</TH>
                </TR>
              </THead>
              <TBody>
                {nfsVisiveis.map((nf) => {
                  const s = STATUS_NF[nf.status];
                  const Icon = s.icon;
                  const dias = diasAte(nf.data_emissao);
                  const atrasada = (nf.status === 'emitida' || nf.status === 'enviada') && dias !== null && dias < -60;
                  const isPaga = nf.status === 'paga';
                  const isCancelada = nf.status === 'cancelada';
                  return (
                    <TR
                      key={nf.id}
                      className={cn(
                        atrasada && 'bg-red-50/40',
                        isPaga && 'opacity-70',
                        isCancelada && 'opacity-60 line-through decoration-1'
                      )}
                    >
                      <TD>
                        <button
                          onClick={() => setOpenDetalhes(nf)}
                          className="flex items-center gap-2 group"
                        >
                          <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', s.corBg)}>
                            <Icon className={cn('w-4 h-4', s.corText)} />
                          </div>
                          <div className="text-left">
                            <div className="font-mono font-semibold text-ink-900 group-hover:text-brand-700">#{nf.numero}</div>
                            {atrasada && (
                              <div className="text-[10px] text-red-600 mt-0.5 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Atrasada {Math.abs(dias!)}d
                              </div>
                            )}
                          </div>
                        </button>
                      </TD>
                      <TD>
                        <div className="font-medium text-ink-900">{nf.cliente_nome}</div>
                        {(nf.cliente_municipio || nf.pedido_id) && (
                          <div className="text-xs text-ink-500 mt-0.5 flex items-center gap-2">
                            {nf.cliente_municipio && <span>{nf.cliente_municipio}{nf.cliente_estado ? `/${nf.cliente_estado}` : ''}</span>}
                            {nf.pedido_id && <span className="text-brand-600">• Pedido #{nf.pedido_id}</span>}
                          </div>
                        )}
                      </TD>
                      <TD>
                        <div className="text-sm text-ink-700">{format.data(nf.data_emissao)}</div>
                        {dias !== null && !isPaga && !isCancelada && (
                          <div className={cn(
                            'text-[10px] mt-0.5',
                            atrasada ? 'text-red-600 font-semibold' : dias < 0 ? 'text-amber-600' : 'text-ink-400'
                          )}>
                            {dias < 0 ? `${Math.abs(dias)}d atrás` : `em ${dias}d`}
                          </div>
                        )}
                      </TD>
                      <TD>
                        {nf.data_pagamento ? (
                          <>
                            <div className="text-sm text-emerald-700 font-medium">{format.data(nf.data_pagamento)}</div>
                            {isPaga && nf.data_emissao && (
                              <div className="text-[10px] text-ink-500 mt-0.5">
                                {Math.round((new Date(nf.data_pagamento).getTime() - new Date(nf.data_emissao).getTime()) / (1000 * 60 * 60 * 24))}d após emissão
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-ink-400">—</span>
                        )}
                      </TD>
                      <TD className="text-right">
                        <span className="font-semibold text-ink-900">{format.brl(nf.valor)}</span>
                      </TD>
                      <TD>
                        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-semibold', s.corBg, s.corText)}>
                          <Icon className="w-3 h-3" />
                          {s.label}
                        </span>
                      </TD>
                      <TD className="relative">
                        <div className="flex items-center justify-end">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === nf.id ? null : nf.id); }}
                            className="p-1.5 text-ink-500 hover:text-ink-900 hover:bg-ink-100 rounded transition-colors"
                            aria-label="Ações"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                        {openMenu === nf.id && (
                          <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-white border border-ink-200 rounded-lg shadow-lift py-1" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => { setOpenMenu(null); setOpenDetalhes(nf); }}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-ink-50 flex items-center gap-2"
                            >
                              <Receipt className="w-3.5 h-3.5" />Ver detalhes
                            </button>
                            {(nf.status === 'emitida' || nf.status === 'enviada') && canPagar && (
                              <button
                                onClick={() => { setOpenMenu(null); setOpenPagar(nf); setDataPagamento(new Date().toISOString().slice(0, 10)); }}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-emerald-50 text-emerald-700 flex items-center gap-2"
                              >
                                <Check className="w-3.5 h-3.5" />Marcar como paga
                              </button>
                            )}
                            {!isPaga && !isCancelada && canCancelar && (
                              <button
                                onClick={() => onCancelar(nf)}
                                className="w-full text-left px-3 py-1.5 text-xs hover:bg-red-50 text-red-600 flex items-center gap-2"
                              >
                                <X className="w-3.5 h-3.5" />Cancelar NF
                              </button>
                            )}
                          </div>
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </>
        )}
      </Card>

      {/* Modal: Importar NF */}
      <Modal
        open={openForm}
        onClose={() => setOpenForm(false)}
        title="Importar NF"
        description="Pegue os dados do Conta Azul e traga pra cá. Você só precisa preencher uma vez."
        size="lg"
        footer={
          <>
            <Button variant="ghost" rounded="md" onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button variant="primary" rounded="md" onClick={onSave} loading={saving}>Importar</Button>
          </>
        }
      >
        <form onSubmit={onSave} className="space-y-4">
          {erro && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</div>}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 leading-relaxed">
            <strong>Como funciona:</strong> a NF sai do Conta Azul, você cadastra aqui só os dados principais.
            Se tiver pedido vinculado, o saldo do contrato baixa na hora da importação (não do pagamento).
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Select label="Cliente" required value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: Number(e.target.value) })}>
              <option value={0}>Selecione...</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </Select>
            <Input label="Número da NF" required value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} placeholder="20260045" rounded="md" />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Data de emissão" type="date" required value={form.data_emissao} onChange={(e) => setForm({ ...form, data_emissao: e.target.value })} rounded="md" />
            <Input label="Valor (R$)" type="number" step="0.01" required value={form.valor} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} rounded="md" />
          </div>
          <Select label="Pedido vinculado (opcional)" value={form.pedido_id || ''} onChange={(e) => setForm({ ...form, pedido_id: e.target.value ? Number(e.target.value) : null })}>
            <option value="">(sem pedido)</option>
            {pedidos.map((p) => <option key={p.id} value={p.id}>#{p.id} - {p.cliente_nome} ({p.categoria})</option>)}
          </Select>
          <Textarea label="Observações" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Anotações internas..." rounded="md" />
        </form>
      </Modal>

      {/* Modal: Marcar como paga */}
      <Modal
        open={!!openPagar}
        onClose={() => setOpenPagar(null)}
        title="Marcar NF como paga"
        description="Confirma a data em que o pagamento caiu na conta."
        footer={
          <>
            <Button variant="ghost" rounded="md" onClick={() => setOpenPagar(null)}>Cancelar</Button>
            <Button variant="primary" rounded="md" onClick={onPagar} loading={saving}>Confirmar pagamento</Button>
          </>
        }
      >
        {openPagar && (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <div className="text-xs text-emerald-700 uppercase tracking-wider font-semibold">NF</div>
                <div className="text-lg font-bold text-emerald-900">#{openPagar.numero}</div>
                <div className="text-sm text-emerald-700">{openPagar.cliente_nome} • {format.brl(openPagar.valor)}</div>
              </div>
            </div>
            <Input label="Data do pagamento" type="date" required value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} rounded="md" />
          </div>
        )}
      </Modal>

      {/* Modal: Detalhes */}
      {openDetalhes && (
        <Modal
          open
          onClose={() => setOpenDetalhes(null)}
          title={`NF #${openDetalhes.numero}`}
          size="lg"
          footer={
            <Button variant="primary" rounded="md" onClick={() => setOpenDetalhes(null)}>Fechar</Button>
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className={cn('inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-sm font-semibold', STATUS_NF[openDetalhes.status].corBg, STATUS_NF[openDetalhes.status].corText)}>
                {(() => { const Icon = STATUS_NF[openDetalhes.status].icon; return <Icon className="w-3.5 h-3.5" />; })()}
                {STATUS_NF[openDetalhes.status].label}
              </span>
              <span className="text-2xl font-bold text-ink-900">{format.brl(openDetalhes.valor)}</span>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div><div className="text-xs text-ink-500 uppercase tracking-wider">Cliente</div><div className="font-medium text-ink-900">{openDetalhes.cliente_nome}</div></div>
              <div><div className="text-xs text-ink-500 uppercase tracking-wider">Localização</div><div className="font-medium text-ink-900">{openDetalhes.cliente_municipio}{openDetalhes.cliente_estado ? `/${openDetalhes.cliente_estado}` : '—'}</div></div>
              <div><div className="text-xs text-ink-500 uppercase tracking-wider">Emissão</div><div className="font-medium text-ink-900">{format.data(openDetalhes.data_emissao)}</div></div>
              <div><div className="text-xs text-ink-500 uppercase tracking-wider">Pagamento</div><div className="font-medium text-ink-900">{format.data(openDetalhes.data_pagamento)}</div></div>
              {openDetalhes.pedido_id && (
                <div><div className="text-xs text-ink-500 uppercase tracking-wider">Pedido</div><div className="font-medium text-ink-900">#{openDetalhes.pedido_id}</div></div>
              )}
              {openDetalhes.contrato_numero && (
                <div><div className="text-xs text-ink-500 uppercase tracking-wider">Contrato</div><div className="font-medium text-ink-900">{openDetalhes.contrato_numero}</div></div>
              )}
            </div>
            {openDetalhes.observacoes && (
              <div>
                <div className="text-xs text-ink-500 uppercase tracking-wider mb-1">Observações</div>
                <div className="text-sm text-ink-800 bg-ink-50 rounded-lg p-3 leading-relaxed">{openDetalhes.observacoes}</div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
