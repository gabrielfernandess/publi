'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Truck, Globe2, Building2, Newspaper } from 'lucide-react';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/Table';
import { format } from '@/lib/format';

type Veiculo = {
  id: number;
  nome: string;
  tipo: 'dou' | 'doe' | 'jornal';
  estado?: string;
  custo_cm: number;
  ativo: number;
};

const tipoMeta: Record<string, { label: string; icon: any; cor: string }> = {
  dou: { label: 'DOU', icon: Globe2, cor: 'navy' },
  doe: { label: 'DOE', icon: Building2, cor: 'gold' },
  jornal: { label: 'Jornal', icon: Newspaper, cor: 'info' },
};

const estados = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const emptyForm = { nome: '', tipo: 'jornal' as Veiculo['tipo'], estado: '', custo_cm: 0 };

export default function VeiculosPage() {
  const [data, setData] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Veiculo | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterTipo) params.set('tipo', filterTipo);
    api.get<{ data: Veiculo[] }>(`/api/veiculos?${params}`)
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setErro(null); setOpenForm(true); };
  const openEdit = (v: Veiculo) => {
    setEditing(v);
    setForm({ nome: v.nome, tipo: v.tipo, estado: v.estado || '', custo_cm: v.custo_cm });
    setErro(null);
    setOpenForm(true);
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSaving(true);
    try {
      if (editing) await api.put(`/api/veiculos/${editing.id}`, form);
      else await api.post('/api/veiculos', form);
      setOpenForm(false);
      load();
    } catch (err: any) {
      setErro(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (v: Veiculo) => {
    if (!confirm(`Excluir "${v.nome}"?`)) return;
    await api.delete(`/api/veiculos/${v.id}`);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Veículos"
        description="Diários Oficiais e Jornais de Grande Circulação"
        actions={
          <Button variant="primary" onClick={openNew}><Plus className="w-4 h-4" />Novo veículo</Button>
        }
      />

      <Card className="mb-5">
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex gap-2">
            <Input placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
            <Button variant="outline" onClick={load}><Search className="w-4 h-4" /></Button>
          </div>
          <Select value={filterTipo} onChange={(e) => { setFilterTipo(e.target.value); setTimeout(load, 0); }} className="sm:w-48">
            <option value="">Todos os tipos</option>
            <option value="dou">DOU</option>
            <option value="doe">DOE</option>
            <option value="jornal">Jornal</option>
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-500">Carregando...</div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={<Truck className="w-12 h-12" />}
            title="Nenhum veículo cadastrado"
            description="Aqui entram os diários onde vocês publicam: DOU, DOE e os jornais de grande circulação de cada estado."
            action={<Button onClick={openNew}><Plus className="w-4 h-4" />Cadastrar primeiro veículo</Button>}
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Veículo</TH>
                <TH>Tipo</TH>
                <TH>UF</TH>
                <TH>Custo/cm</TH>
                <TH className="w-32 text-right">Ações</TH>
              </TR>
            </THead>
            <TBody>
              {data.map((v) => {
                const t = tipoMeta[v.tipo];
                const Icon = t.icon;
                return (
                  <TR key={v.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-ink-50 text-ink-700 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="font-medium text-ink-900">{v.nome}</div>
                      </div>
                    </TD>
                    <TD><Badge variant={t.cor as any}>{t.label}</Badge></TD>
                    <TD>{v.estado ? <Badge variant="outline">{v.estado}</Badge> : <span className="text-ink-400 text-sm">—</span>}</TD>
                    <TD><span className="font-semibold text-ink-900">{format.brl(v.custo_cm)}</span></TD>
                    <TD>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(v)} className="p-1.5 text-ink-500 hover:text-brand-700 hover:bg-brand-50 rounded transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => onDelete(v)} className="p-1.5 text-ink-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
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
        title={editing ? 'Editar veículo' : 'Novo veículo'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button onClick={onSave} loading={saving}>{editing ? 'Salvar' : 'Criar'}</Button>
          </>
        }
      >
        <form onSubmit={onSave} className="space-y-4">
          {erro && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</div>}
          <Input label="Nome" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Diário Oficial da União" />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Tipo" required value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as any })}>
              <option value="dou">DOU (federal)</option>
              <option value="doe">DOE (estadual)</option>
              <option value="jornal">Jornal de Grande Circulação</option>
            </Select>
            <Select label="UF" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              <option value="">(sem UF)</option>
              {estados.map((e) => <option key={e} value={e}>{e}</option>)}
            </Select>
          </div>
          <Input label="Custo por cm (R$)" type="number" step="0.01" required value={form.custo_cm} onChange={(e) => setForm({ ...form, custo_cm: Number(e.target.value) })} />
        </form>
      </Modal>
    </div>
  );
}
