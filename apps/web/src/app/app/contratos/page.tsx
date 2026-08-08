'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, FileText, AlertTriangle, Calendar, Eye, Lock } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useIsAdmin } from '@/lib/auth';
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
    // carrega clientes e veiculos pra selects
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
            <option value="">Todos</option>
            <option value="ativo">Ativo</option>
            <option value="suspenso">Suspenso</option>
            <option value="encerrado">Encerrado</option>
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-500">Carregando...</div>
        ) : data.length === 0 ? (
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
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Cliente</TH>
                <TH>Contrato</TH>
                <TH>Vigência</TH>
                <TH>Status</TH>
                <TH className="text-right">Saldo</TH>
                <TH className="w-24 text-right">Ações</TH>
              </TR>
            </THead>
            <TBody>
              {data.map((c) => {
                const dias = c.dias_para_vencer;
                const vencido = dias !== null && dias < 0;
                const pertoVencer = dias !== null && dias >= 0 && dias <= 60;
                const saldoCm = c.cm_total_contratado - c.cm_total_utilizado;
                const saldoValor = c.valor_total_venda - c.valor_utilizado;
                const pctUsado = c.cm_total_contratado > 0 ? (c.cm_total_utilizado / c.cm_total_contratado) * 100 : 0;
                return (
                  <TR key={c.id}>
                    <TD>
                      <div className="font-medium text-ink-900">{c.cliente_nome}</div>
                      <div className="text-xs text-ink-500 mt-0.5">{c.cliente_municipio}{c.cliente_estado ? `/${c.cliente_estado}` : ''}</div>
                    </TD>
                    <TD>
                      <div className="text-sm text-ink-800">{c.numero || `#${c.id}`}</div>
                      {c.objeto && <div className="text-xs text-ink-500 mt-0.5 max-w-xs truncate">{c.objeto}</div>}
                    </TD>
                    <TD>
                      <div className="text-xs text-ink-600">{format.data(c.data_inicio)} → {format.data(c.data_fim)}</div>
                      {(vencido || pertoVencer) && (
                        <div className={cn('text-xs mt-1 flex items-center gap-1', vencido ? 'text-red-600' : 'text-amber-600')}>
                          <AlertTriangle className="w-3 h-3" />
                          {vencido ? `Vencido há ${Math.abs(dias!)}d` : `Vence em ${dias}d`}
                        </div>
                      )}
                    </TD>
                    <TD>
                      <Badge variant={c.status === 'ativo' ? 'success' : c.status === 'suspenso' ? 'warning' : 'default'}>
                        {c.status}
                      </Badge>
                    </TD>
                    <TD className="text-right">
                      <div className="font-semibold text-ink-900">{format.brl(saldoValor)}</div>
                      <div className="text-xs text-ink-500 mt-0.5">{format.cm(saldoCm)} restantes</div>
                      <div className="mt-1.5 h-1 bg-ink-100 rounded-full overflow-hidden w-24 ml-auto">
                        <div className="h-full bg-gold-gradient" style={{ width: `${pctUsado}%` }} />
                      </div>
                    </TD>
                    <TD>
                      <div className="flex items-center justify-end">
                        <Link href={`/app/contratos/${c.id}`} className="p-1.5 text-ink-500 hover:text-brand-700 hover:bg-brand-50 rounded transition-colors" title="Ver detalhes">
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
        )}
      </Card>

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
