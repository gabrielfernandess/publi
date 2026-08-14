'use client';

import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, MapPin, Mail, Phone, Building2, Lock } from 'lucide-react';
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

type Cliente = {
  id: number;
  nome: string;
  tipo: 'prefeitura' | 'camara' | 'autarquia' | 'outros';
  cnpj?: string;
  municipio?: string;
  estado?: string;
  contato_nome?: string;
  contato_email?: string;
  contato_telefone?: string;
  observacoes?: string;
  ativo: number;
};

const tipoLabel: Record<string, { label: string; cor: string }> = {
  prefeitura: { label: 'Prefeitura', cor: 'navy' },
  camara: { label: 'Câmara', cor: 'gold' },
  autarquia: { label: 'Autarquia', cor: 'info' },
  outros: { label: 'Outros', cor: 'default' },
};

const estados = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const emptyForm = {
  nome: '', tipo: 'prefeitura' as Cliente['tipo'], cnpj: '', municipio: '', estado: '',
  contato_nome: '', contato_email: '', contato_telefone: '', observacoes: '',
};

export default function ClientesPage() {
  const isAdmin = useIsAdmin();
  const [data, setData] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filterTipo) params.set('tipo', filterTipo);
    api.get<{ data: Cliente[] }>(`/api/clientes?${params}`)
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onSearch = () => load();

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setErro(null);
    setOpenForm(true);
  };

  const openEdit = (c: Cliente) => {
    setEditing(c);
    setForm({
      nome: c.nome,
      tipo: c.tipo,
      cnpj: c.cnpj || '',
      municipio: c.municipio || '',
      estado: c.estado || '',
      contato_nome: c.contato_nome || '',
      contato_email: c.contato_email || '',
      contato_telefone: c.contato_telefone || '',
      observacoes: c.observacoes || '',
    });
    setErro(null);
    setOpenForm(true);
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/api/clientes/${editing.id}`, form);
      } else {
        await api.post('/api/clientes', form);
      }
      setOpenForm(false);
      load();
    } catch (err: any) {
      setErro(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (c: Cliente) => {
    if (!confirm(`Excluir "${c.nome}"?`)) return;
    await api.delete(`/api/clientes/${c.id}`);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Clientes"
        description="Prefeituras, câmaras e demais órgãos públicos atendidos"
        actions={
          isAdmin ? (
            <Button variant="primary" onClick={openNew}>
              <Plus className="w-4 h-4" />
              Novo cliente
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
            <Input
              placeholder="Buscar por nome, município ou CNPJ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            />
            <Button variant="outline" onClick={onSearch}>
              <Search className="w-4 h-4" />
            </Button>
          </div>
          <Select value={filterTipo} onChange={(e) => { setFilterTipo(e.target.value); setTimeout(load, 0); }} className="sm:w-48">
            <option value="">Todos os tipos</option>
            <option value="prefeitura">Prefeitura</option>
            <option value="camara">Câmara</option>
            <option value="autarquia">Autarquia</option>
            <option value="outros">Outros</option>
          </Select>
        </div>
      </Card>

      <Card>
        {loading ? (
          <div className="p-8 text-center text-sm text-ink-500">Carregando...</div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={<Building2 className="w-12 h-12" />}
            title="Nenhum cliente cadastrado"
            description={isAdmin
              ? "Cadastre o primeiro órgão público (prefeitura, câmara ou autarquia) para iniciar o atendimento."
              : "Quando um admin cadastrar o primeiro cliente, ele aparece aqui."}
            action={isAdmin
              ? <Button onClick={openNew}><Plus className="w-4 h-4" />Cadastrar primeiro cliente</Button>
              : undefined}
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Nome</TH>
                <TH>Tipo</TH>
                <TH>Localização</TH>
                <TH>Contato</TH>
                <TH className="w-32 text-right">Ações</TH>
              </TR>
            </THead>
            <TBody>
              {data.map((c) => {
                const t = tipoLabel[c.tipo];
                return (
                  <TR key={c.id}>
                    <TD>
                      <div className="font-medium text-ink-900">{c.nome}</div>
                      {c.cnpj && <div className="text-xs text-ink-500 mt-0.5">{c.cnpj}</div>}
                    </TD>
                    <TD><Badge variant={t.cor as any}>{t.label}</Badge></TD>
                    <TD>
                      {c.municipio ? (
                        <div className="flex items-center gap-1.5 text-sm text-ink-600">
                          <MapPin className="w-3.5 h-3.5 text-ink-400" />
                          {c.municipio}{c.estado ? `/${c.estado}` : ''}
                        </div>
                      ) : <span className="text-ink-400">—</span>}
                    </TD>
                    <TD>
                      {c.contato_email ? (
                        <div className="text-xs text-ink-600 space-y-0.5">
                          <div className="flex items-center gap-1.5"><Mail className="w-3 h-3 text-ink-400" />{c.contato_email}</div>
                          {c.contato_telefone && <div className="flex items-center gap-1.5"><Phone className="w-3 h-3 text-ink-400" />{c.contato_telefone}</div>}
                        </div>
                      ) : <span className="text-ink-400">—</span>}
                    </TD>
                    <TD>
                      {isAdmin ? (
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(c)} className="p-1.5 text-ink-500 hover:text-brand-700 hover:bg-brand-50 rounded transition-colors" title="Editar">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => onDelete(c)} className="p-1.5 text-ink-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Excluir">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-ink-400 justify-end w-full">
                          <Lock className="w-3 h-3" />
                          Somente leitura
                        </span>
                      )}
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
        title={editing ? 'Editar cliente' : 'Novo cliente'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpenForm(false)}>Cancelar</Button>
            <Button onClick={onSave} loading={saving}>{editing ? 'Salvar alterações' : 'Criar cliente'}</Button>
          </>
        }
      >
        <form onSubmit={onSave} className="space-y-4">
          {erro && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</div>}
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <Input label="Nome" required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Prefeitura Municipal de..." />
            </div>
            <Select label="Tipo" required value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as any })}>
              <option value="prefeitura">Prefeitura</option>
              <option value="camara">Câmara</option>
              <option value="autarquia">Autarquia</option>
              <option value="outros">Outros</option>
            </Select>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Input label="CNPJ" value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
            <Input label="Município" value={form.municipio} onChange={(e) => setForm({ ...form, municipio: e.target.value })} />
            <Select label="Estado" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
              <option value="">Selecione...</option>
              {estados.map((e) => <option key={e} value={e}>{e}</option>)}
            </Select>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Input label="Contato (nome)" value={form.contato_nome} onChange={(e) => setForm({ ...form, contato_nome: e.target.value })} />
            <Input label="E-mail" type="email" value={form.contato_email} onChange={(e) => setForm({ ...form, contato_email: e.target.value })} />
            <Input label="Telefone" value={form.contato_telefone} onChange={(e) => setForm({ ...form, contato_telefone: e.target.value })} placeholder="(99) 99999-9999" />
          </div>
          <Textarea label="Observações" value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} placeholder="Anotações internas..." />
        </form>
      </Modal>
    </div>
  );
}
