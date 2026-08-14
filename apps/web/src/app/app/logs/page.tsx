'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, Filter, X, ChevronLeft, ChevronRight, Search, ScrollText } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useIsAdmin } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardBody, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { format } from '@/lib/format';
import { cn } from '@/lib/utils';

type Log = {
  id: number;
  user_id: number | null;
  user_nome: string | null;
  user_email: string | null;
  acao: string;
  entidade: string;
  entidade_id: number | null;
  detalhes: string | null;
  ip: string | null;
  created_at: string;
};

type Opcoes = { acoes: string[]; entidades: string[]; usuarios: { user_id: number; user_nome: string; user_email: string }[] };

const ACAO_TONE: Record<string, { label: string; cor: string }> = {
  create:        { label: 'Criou',   cor: 'bg-emerald-100 text-emerald-700' },
  update:        { label: 'Editou',  cor: 'bg-sky-100 text-sky-700' },
  update_status: { label: 'Moveu',   cor: 'bg-sky-100 text-sky-700' },
  delete:        { label: 'Excluiu', cor: 'bg-red-100 text-red-700' },
  cancel:        { label: 'Cancelou', cor: 'bg-red-100 text-red-700' },
  approve:       { label: 'Aprovou', cor: 'bg-emerald-100 text-emerald-700' },
  reject:        { label: 'Rejeitou', cor: 'bg-red-100 text-red-700' },
  login:         { label: 'Login',   cor: 'bg-brand-100 text-brand-800' },
  login_fail:    { label: 'Login falhou', cor: 'bg-amber-100 text-amber-700' },
  logout:        { label: 'Logout',  cor: 'bg-ink-100 text-ink-700' },
  export:        { label: 'Exportou', cor: 'bg-violet-100 text-violet-700' },
};

const ENTIDADE_LABEL: Record<string, string> = {
  auth: 'autenticação',
  pedido: 'pedido',
  contrato: 'contrato',
  cliente: 'cliente',
  user: 'usuário',
  nf: 'nota fiscal',
  faturamento: 'faturamento',
  boleto: 'boleto',
  config: 'configuração',
};

function parseDetalhes(d: string | null): string {
  if (!d) return '';
  try {
    const obj = JSON.parse(d);
    if (typeof obj === 'string') return obj;
    // formata como chave: valor
    return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(' · ');
  } catch {
    return d;
  }
}

export default function LogsPage() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const [logs, setLogs] = useState<Log[]>([]);
  const [opcoes, setOpcoes] = useState<Opcoes>({ acoes: [], entidades: [], usuarios: [] });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const limit = 50;

  // Filtros
  const [filtroUser, setFiltroUser] = useState('');
  const [filtroAcao, setFiltroAcao] = useState('');
  const [filtroEntidade, setFiltroEntidade] = useState('');
  const [filtroDataIni, setFiltroDataIni] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [busca, setBusca] = useState('');

  // carrega opcoes uma vez
  useEffect(() => {
    if (!isAdmin) return;
    api.get<Opcoes>('/api/logs/opcoes').then(setOpcoes).catch(() => {});
  }, [isAdmin]);

  // carrega logs quando filtros/pagina mudam
  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    const params = new URLSearchParams();
    if (filtroUser) params.set('user_id', filtroUser);
    if (filtroAcao) params.set('acao', filtroAcao);
    if (filtroEntidade) params.set('entidade', filtroEntidade);
    if (filtroDataIni) params.set('data_ini', filtroDataIni);
    if (filtroDataFim) params.set('data_fim', filtroDataFim);
    params.set('page', String(page));
    params.set('limit', String(limit));
    api.get<{ data: Log[]; pagination: { total: number; totalPages: number } }>(`/api/logs?${params}`)
      .then((r) => {
        setLogs(r.data || []);
        setTotal(r.pagination?.total || 0);
        setTotalPages(r.pagination?.totalPages || 0);
      })
      .finally(() => setLoading(false));
  }, [isAdmin, page, filtroUser, filtroAcao, filtroEntidade, filtroDataIni, filtroDataFim]);

  const clearFiltros = () => {
    setFiltroUser(''); setFiltroAcao(''); setFiltroEntidade(''); setFiltroDataIni(''); setFiltroDataFim(''); setBusca('');
    setPage(1);
  };

  // filtro de busca client-side (em cima do servidor)
  const logsFiltrados = useMemo(() => {
    if (!busca.trim()) return logs;
    const q = busca.toLowerCase();
    return logs.filter((l) =>
      (l.user_nome?.toLowerCase().includes(q)) ||
      (l.user_email?.toLowerCase().includes(q)) ||
      (l.acao.toLowerCase().includes(q)) ||
      (l.entidade.toLowerCase().includes(q)) ||
      (l.detalhes?.toLowerCase().includes(q)) ||
      (l.ip?.includes(q))
    );
  }, [logs, busca]);

  if (!isAdmin) {
    return (
      <div>
        <PageHeader title="Logs" description="Auditoria de ações no sistema." />
        <Card><CardBody>
          <EmptyState
            icon={<ScrollText className="w-9 h-9" />}
            title="Acesso restrito"
            description="Apenas administradores podem ver os logs de auditoria."
          />
        </CardBody></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Logs"
        description="Auditoria de ações no sistema — quem fez o quê, quando e em qual registro."
      />

      {/* Filtros */}
      <Card className="mb-5">
        <div className="p-4 space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="flex flex-col gap-1 lg:flex-1 min-w-0">
              <label className="text-xs font-medium text-ink-600 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5" />Buscar
              </label>
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="usuário, ação, entidade, IP..." />
            </div>
            <div className="flex flex-col gap-1 lg:w-44">
              <label className="text-xs font-medium text-ink-600">Usuário</label>
              <Select value={filtroUser} onChange={(e) => { setFiltroUser(e.target.value); setPage(1); }}>
                <option value="">Todos</option>
                {opcoes.usuarios.map((u) => (
                  <option key={u.user_id} value={u.user_id}>{u.user_nome}</option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1 lg:w-40">
              <label className="text-xs font-medium text-ink-600">Ação</label>
              <Select value={filtroAcao} onChange={(e) => { setFiltroAcao(e.target.value); setPage(1); }}>
                <option value="">Todas</option>
                {opcoes.acoes.map((a) => <option key={a} value={a}>{ACAO_TONE[a]?.label || a}</option>)}
              </Select>
            </div>
            <div className="flex flex-col gap-1 lg:w-40">
              <label className="text-xs font-medium text-ink-600">Entidade</label>
              <Select value={filtroEntidade} onChange={(e) => { setFiltroEntidade(e.target.value); setPage(1); }}>
                <option value="">Todas</option>
                {opcoes.entidades.map((e) => <option key={e} value={e}>{ENTIDADE_LABEL[e] || e}</option>)}
              </Select>
            </div>
            <Button variant="outline" size="sm" onClick={clearFiltros} className="border-ink-300">
              <X className="w-3.5 h-3.5" />Limpar
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 pt-1 border-t border-ink-100">
            <div className="flex flex-col gap-1 sm:w-44">
              <label className="text-xs font-medium text-ink-600">De</label>
              <Input type="date" value={filtroDataIni} onChange={(e) => { setFiltroDataIni(e.target.value); setPage(1); }} />
            </div>
            <div className="flex flex-col gap-1 sm:w-44">
              <label className="text-xs font-medium text-ink-600">Até</label>
              <Input type="date" value={filtroDataFim} onChange={(e) => { setFiltroDataFim(e.target.value); setPage(1); }} />
            </div>
          </div>
          <div className="text-xs text-ink-500 flex items-center gap-2 pt-1 border-t border-ink-100">
            <Activity className="w-3 h-3" />
            <strong className="text-ink-700">{total}</strong> evento(s) no total
          </div>
        </div>
      </Card>

      {/* Tabela de logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-brand-700" />
                Eventos
              </CardTitle>
              <CardDescription>Página {page} de {Math.max(1, totalPages)} · {logsFiltrados.length} nesta página</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="p-8 text-center text-sm text-ink-500">Carregando...</div>
          ) : logsFiltrados.length === 0 ? (
            <EmptyState
              className="py-10"
              icon={<Activity className="w-9 h-9" />}
              title="Nenhum evento"
              description={total === 0 ? 'Ainda não há eventos registrados. Ações como login, criar/editar/excluir pedidos já estão sendo logadas.' : 'Nenhum evento bate com os filtros aplicados.'}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ink-50/70 border-b border-ink-100">
                  <tr>
                    <th className="text-left font-semibold text-ink-600 px-4 py-2.5 text-xs uppercase tracking-wider whitespace-nowrap">Quando</th>
                    <th className="text-left font-semibold text-ink-600 px-4 py-2.5 text-xs uppercase tracking-wider">Usuário</th>
                    <th className="text-left font-semibold text-ink-600 px-4 py-2.5 text-xs uppercase tracking-wider">Ação</th>
                    <th className="text-left font-semibold text-ink-600 px-4 py-2.5 text-xs uppercase tracking-wider">Entidade</th>
                    <th className="text-left font-semibold text-ink-600 px-4 py-2.5 text-xs uppercase tracking-wider">Detalhes</th>
                    <th className="text-left font-semibold text-ink-600 px-4 py-2.5 text-xs uppercase tracking-wider">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {logsFiltrados.map((l) => {
                    const acao = ACAO_TONE[l.acao] || { label: l.acao, cor: 'bg-ink-100 text-ink-700' };
                    const entLabel = ENTIDADE_LABEL[l.entidade] || l.entidade;
                    return (
                      <tr key={l.id} className="hover:bg-ink-50/40">
                        <td className="px-4 py-2.5 text-ink-600 text-xs whitespace-nowrap">{format.dataHora(l.created_at)}</td>
                        <td className="px-4 py-2.5 text-xs">
                          {l.user_nome ? (
                            <div>
                              <div className="font-medium text-ink-800">{l.user_nome}</div>
                              {l.user_email && <div className="text-ink-500">{l.user_email}</div>}
                            </div>
                          ) : (
                            <span className="text-ink-400 italic">anônimo</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-pill text-[10px] font-semibold uppercase tracking-wider', acao.cor)}>
                            {acao.label}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs">
                          <div className="text-ink-800 font-medium">{entLabel}</div>
                          {l.entidade_id != null && (
                            <div className="text-ink-500 text-[10px]">#{l.entidade_id}</div>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-ink-600 max-w-md">
                          {parseDetalhes(l.detalhes) ? (
                            <span className="line-clamp-2">{parseDetalhes(l.detalhes)}</span>
                          ) : (
                            <span className="text-ink-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-ink-500 font-mono whitespace-nowrap">{l.ip || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-ink-100 flex items-center justify-between text-xs">
            <span className="text-ink-500">Página {page} de {totalPages} · {total} total</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
                <ChevronLeft className="w-3.5 h-3.5" />Anterior
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}>
                Próxima<ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
