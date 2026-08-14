'use client';

import { useEffect, useState } from 'react';
import { Users as UsersIcon, Plus, Edit2, Trash2, AlertTriangle, Power, PowerOff, Mail, Shield } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth, useIsAdmin } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { format } from '@/lib/format';
import { cn } from '@/lib/utils';

type Usuario = {
  id: number;
  email: string;
  nome: string;
  papel: 'admin' | 'user';
  ativo: 0 | 1;
  created_at: string;
};

const PAPEIS: Record<string, { label: string; cor: string }> = {
  admin: { label: 'Admin', cor: 'bg-brand-100 text-brand-800' },
  user:  { label: 'Usuário', cor: 'bg-sky-100 text-sky-700' },
};

export default function UsuariosPage() {
  const { user: currentUser } = useAuth();
  const isAdmin = useIsAdmin();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [showDelete, setShowDelete] = useState<Usuario | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = async () => {
    setLoading(true);
    try {
      const r = await api.get<{ data: Usuario[] }>('/api/usuarios');
      setUsuarios(r.data || []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { if (isAdmin) carregar(); }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Usuários" description="Gerencie quem tem acesso ao sistema." />
        <Card><CardBody>
          <EmptyState
            icon={<UsersIcon className="w-9 h-9" />}
            title="Acesso restrito"
            description="Apenas administradores podem gerenciar usuários."
          />
        </CardBody></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Usuários"
        description="Gerencie quem tem acesso ao sistema. Apenas administradores."
        actions={
          <Button variant="primary" onClick={() => { setEditing(null); setShowForm(true); setErro(null); }}>
            <Plus className="w-4 h-4" />Novo usuário
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-brand-700" />
            Usuários cadastrados
          </CardTitle>
          <CardDescription>{usuarios.length} usuário(s) no total · {usuarios.filter((u) => u.ativo).length} ativos</CardDescription>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-ink-500">Carregando...</div>
          ) : usuarios.length === 0 ? (
            <EmptyState
              className="py-10"
              icon={<UsersIcon className="w-9 h-9" />}
              title="Nenhum usuário"
              description="Crie o primeiro usuário para começar."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ink-50/70 border-b border-ink-100">
                  <tr>
                    <th className="text-left font-semibold text-ink-600 px-4 py-2.5 text-xs uppercase tracking-wider">Usuário</th>
                    <th className="text-left font-semibold text-ink-600 px-4 py-2.5 text-xs uppercase tracking-wider">E-mail</th>
                    <th className="text-left font-semibold text-ink-600 px-4 py-2.5 text-xs uppercase tracking-wider">Papel</th>
                    <th className="text-left font-semibold text-ink-600 px-4 py-2.5 text-xs uppercase tracking-wider">Status</th>
                    <th className="text-left font-semibold text-ink-600 px-4 py-2.5 text-xs uppercase tracking-wider">Criado em</th>
                    <th className="text-right font-semibold text-ink-600 px-4 py-2.5 text-xs uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {usuarios.map((u) => {
                    const p = PAPEIS[u.papel];
                    return (
                      <tr key={u.id} className="hover:bg-ink-50/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className={cn('w-8 h-8 rounded-pill flex items-center justify-center font-bold text-xs flex-shrink-0', u.ativo ? 'bg-brand-50 text-brand-700' : 'bg-ink-100 text-ink-400')}>
                              {u.nome.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase()}
                            </div>
                            <div className="font-medium text-ink-900">
                              {u.nome}
                              {u.id === currentUser?.id && <span className="ml-2 text-[10px] uppercase tracking-wider text-brand-600">(você)</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-ink-600 text-xs">{u.email}</td>
                        <td className="px-4 py-3">
                          <Badge className={p.cor}>{p.label}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {u.ativo ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><Power className="w-3 h-3" />Ativo</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-ink-400"><PowerOff className="w-3 h-3" />Desativado</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-ink-500 text-xs">{format.data(u.created_at)}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setEditing(u); setShowForm(true); setErro(null); }}>
                              <Edit2 className="w-3.5 h-3.5" />Editar
                            </Button>
                            {u.id !== currentUser?.id && (
                              <Button variant="ghost" size="sm" onClick={() => setShowDelete(u)} className="text-red-700 hover:bg-red-50">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <UsuarioForm
        open={showForm}
        usuario={editing}
        onClose={() => setShowForm(false)}
        onSaved={() => { setShowForm(false); carregar(); }}
        erroExterno={erro}
        setErroExterno={setErro}
      />

      <DeleteConfirm
        usuario={showDelete}
        onClose={() => setShowDelete(null)}
        onDeleted={() => { setShowDelete(null); carregar(); }}
      />
    </div>
  );
}

function UsuarioForm({ open, usuario, onClose, onSaved, erroExterno, setErroExterno }: {
  open: boolean;
  usuario: Usuario | null;
  onClose: () => void;
  onSaved: () => void;
  erroExterno: string | null;
  setErroExterno: (s: string | null) => void;
}) {
  const isEdit = !!usuario;
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [papel, setPapel] = useState<'admin' | 'user'>('user');
  const [senha, setSenha] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNome(usuario?.nome || '');
      setEmail(usuario?.email || '');
      setPapel(usuario?.papel || 'user');
      setSenha('');
      setAtivo(usuario?.ativo ? true : false);
      setErroExterno(null);
    }
  }, [open, usuario, setErroExterno]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErroExterno(null);
    try {
      if (isEdit) {
        const body: any = { nome, email, papel, ativo };
        if (senha) body.senha = senha;
        await api.patch(`/api/usuarios/${usuario!.id}`, body);
      } else {
        await api.post('/api/usuarios', { nome, email, papel, senha, ativo });
      }
      onSaved();
    } catch (err: any) {
      setErroExterno(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title={isEdit ? 'Editar usuário' : 'Novo usuário'}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={submit} loading={saving}>
            {isEdit ? 'Salvar alterações' : 'Criar usuário'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {erroExterno && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erroExterno}</div>}
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Nome completo" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Maria Silva" required />
          <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maria@empresa.com" required />
        </div>
        <Select label="Papel" value={papel} onChange={(e) => setPapel(e.target.value as 'admin' | 'user')}>
          <option value="user">Usuário (operacional — sem financeiro)</option>
          <option value="admin">Admin (acesso total)</option>
        </Select>
        <Input
          label={isEdit ? 'Nova senha (deixe em branco para manter)' : 'Senha'}
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder={isEdit ? '••••••' : 'Mínimo 6 caracteres'}
          required={!isEdit}
        />
        {isEdit && (
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} className="rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
            Usuário ativo (pode fazer login)
          </label>
        )}
        <div className="flex items-start gap-2 p-3 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-800">
          <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <strong>Admin</strong> pode ver tudo: financeiro, faturamento, logs, configurações e gerenciar outros usuários.
            <br />
            <strong>Usuário</strong> opera os pedidos até a etapa "cliente atendido" — sem acesso a faturamento, financeiro, logs, configurações e gerenciamento de usuários.
          </div>
        </div>
      </form>
    </Modal>
  );
}

function DeleteConfirm({ usuario, onClose, onDeleted }: {
  usuario: Usuario | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  if (!usuario) return null;

  const submit = async () => {
    setSaving(true);
    setErro(null);
    try {
      await api.delete(`/api/usuarios/${usuario.id}`);
      onDeleted();
    } catch (err: any) {
      setErro(err.message || 'Erro ao desativar');
      setSaving(false);
    }
  };

  return (
    <Modal
      open={!!usuario}
      onClose={() => !saving && onClose()}
      title="Desativar usuário"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={submit} loading={saving} className="bg-red-600 hover:bg-red-700 text-white">
            <Trash2 className="w-4 h-4" />Desativar
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">
            <p className="font-semibold">Desativar {usuario.nome}?</p>
            <p className="mt-1">O usuário não poderá mais fazer login. O histórico de auditoria e ações continua preservado.</p>
          </div>
        </div>
        {erro && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{erro}</div>}
      </div>
    </Modal>
  );
}
