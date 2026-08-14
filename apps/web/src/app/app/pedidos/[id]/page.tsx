'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Building2, MapPin, Calendar, FileText, Lock, History, Trash2, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth, useIsAdmin } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { format, truncate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { STATUS_LIST, STATUS_BY_ID, TONE_CLASSES, canMoveFront } from '../constants';
import { Stepper } from '../Stepper';
import { EtapaTabs } from '../EtapaTabs';

type Boleto = {
  id: number; veiculo_tipo: 'dou' | 'doe' | 'jornal'; valor: number;
  data_vencimento: string; data_pagamento: string; arquivo_path: string; observacoes: string;
};

export default function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const pedidoId = Number(id);
  const etapaFromUrl = searchParams.get('etapa');

  const [pedido, setPedido] = useState<any>(null);
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [nfs, setNfs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/api/pedidos/${pedidoId}`),
      api.get(`/api/pedidos/${pedidoId}/boletos`),
      api.get(`/api/pedidos/${pedidoId}/historico`),
    ]).then(([p, b, h]) => {
      setPedido(p.data);
      setBoletos(b.data || []);
      setHistorico(h.data || []);
      return api.get(`/api/notas-fiscais?pedido_id=${pedidoId}`);
    }).then((n) => {
      setNfs(n.data || []);
    }).catch((err) => {
      console.error('Erro ao carregar pedido:', err);
    }).finally(() => setLoading(false));
  }, [pedidoId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-ink-500">
        Carregando pedido...
      </div>
    );
  }

  if (!pedido) {
    return (
      <div className="text-center py-20">
        <h2 className="text-lg font-semibold text-ink-900">Pedido não encontrado</h2>
        <p className="text-sm text-ink-500 mt-2">Pode ter sido excluído ou você não tem acesso.</p>
        <Button onClick={() => router.push('/app/pedidos')} variant="outline" className="mt-4">
          <ChevronLeft className="w-4 h-4" />Voltar ao Kanban
        </Button>
      </div>
    );
  }

  const etapaAtiva = etapaFromUrl && STATUS_BY_ID[etapaFromUrl] ? etapaFromUrl : pedido.status;
  const s = STATUS_BY_ID[pedido.status];
  const idx = STATUS_LIST.findIndex((x) => x.id === pedido.status);
  const canGoPrev = idx > 0 && canMoveFront(user?.papel || '', pedido.status, STATUS_LIST[idx - 1].id);
  const canGoNext = idx < STATUS_LIST.length - 1 && canMoveFront(user?.papel || '', pedido.status, STATUS_LIST[idx + 1].id);
  const podeMover = user?.papel === 'admin' || (PAPEIS_ALLOWED_LIST as any)[user?.papel || '']?.includes(pedido.status);

  const onMoverStatus = async (novoStatus: string) => {
    try {
      await api.patch(`/api/pedidos/${pedidoId}/status`, { status: novoStatus });
      // atualiza dados
      const p = await api.get(`/api/pedidos/${pedidoId}`);
      setPedido(p.data);
      const h = await api.get(`/api/pedidos/${pedidoId}/historico`);
      setHistorico(h.data || []);
    } catch (err: any) {
      alert(err.message || 'Erro ao mover');
    }
  };

  const onExcluir = async () => {
    setDeleteError(null);
    setDeleting(true);
    try {
      await api.delete(`/api/pedidos/${pedidoId}`);
      router.push('/app/pedidos');
    } catch (err: any) {
      setDeleteError(err.message || 'Erro ao excluir');
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header do pedido */}
      <div className="flex flex-wrap items-start gap-3">
        <Link href="/app/pedidos" className="text-sm text-ink-500 hover:text-brand-700 flex items-center gap-1 mt-1">
          <ChevronLeft className="w-4 h-4" />Kanban
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {s && (
              <span className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', TONE_CLASSES[s.tone])}>
                <s.icon className="w-5 h-5" />
              </span>
            )}
            <h1 className="text-2xl font-bold text-ink-900">Pedido #{pedido.id}</h1>
            <Badge variant="default">{s?.label}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-ink-600">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-ink-400" />
              <span className="font-medium text-ink-900">{pedido.cliente_nome}</span>
            </span>
            {pedido.cliente_municipio && (
              <span className="flex items-center gap-1.5 text-ink-500">
                <MapPin className="w-3.5 h-3.5 text-ink-400" />
                {pedido.cliente_municipio}{pedido.cliente_estado ? `/${pedido.cliente_estado}` : ''}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-ink-500">
              <Calendar className="w-3.5 h-3.5 text-ink-400" />
              Solicitado em {format.data(pedido.data_solicitacao)}
            </span>
            {pedido.contrato_numero && (
              <span className="flex items-center gap-1.5 text-ink-500">
                <FileText className="w-3.5 h-3.5 text-ink-400" />
                Contrato #{pedido.contrato_numero || pedido.contrato_id}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canGoPrev && (
            <Button variant="outline" onClick={() => onMoverStatus(STATUS_LIST[idx - 1].id)}>
              <ChevronLeft className="w-4 h-4" />{STATUS_LIST[idx - 1].label}
            </Button>
          )}
          {canGoNext && (
            <Button variant="primary" onClick={() => onMoverStatus(STATUS_LIST[idx + 1].id)}>
              Avançar: {STATUS_LIST[idx + 1].label}<ChevronRight className="w-4 h-4" />
            </Button>
          )}
          {isAdmin && (
            <Button variant="outline" onClick={() => setShowDeleteConfirm(true)} className="text-red-700 border-red-200 hover:bg-red-50 hover:border-red-300">
              <Trash2 className="w-4 h-4" />Excluir
            </Button>
          )}
          {!podeMover && !canGoPrev && !canGoNext && !isAdmin && (
            <span className="text-xs text-ink-500 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />Seu papel não pode mover este pedido
            </span>
          )}
        </div>
      </div>

      {/* Stepper clicável (currentId = status real do pedido, não etapa da URL) */}
      <Card className="p-3">
        <Stepper
          currentId={pedido.status}
          onSelect={(id) => router.push(`/app/pedidos/${pedidoId}?etapa=${id}`)}
        />
      </Card>

      {/* Layout 2 colunas: conteúdo da etapa + sidebar histórico */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-5">
        {/* Conteúdo da etapa */}
        <div>
          <EtapaTabs
            pedidoId={pedidoId}
            etapaId={etapaAtiva}
            papel={user?.papel || ''}
            userId={user?.id || 0}
            onSaved={async () => {
              const p = await api.get(`/api/pedidos/${pedidoId}`);
              setPedido(p.data);
              const h = await api.get(`/api/pedidos/${pedidoId}/historico`);
              setHistorico(h.data || []);
              const b = await api.get(`/api/pedidos/${pedidoId}/boletos`);
              setBoletos(b.data || []);
            }}
          />
        </div>

        {/* Sidebar: histórico */}
        <aside>
          <Card>
            <div className="p-4 border-b border-ink-100 flex items-center gap-2">
              <History className="w-4 h-4 text-brand-700" />
              <h3 className="text-sm font-semibold text-ink-900">Histórico</h3>
              <span className="ml-auto text-xs text-ink-500">{historico.length}</span>
            </div>
            <div className="p-3 max-h-[600px] overflow-y-auto space-y-2">
              {historico.length === 0 ? (
                <div className="py-4">
                  <EmptyState
                    icon={<History className="w-8 h-8" />}
                    title="Sem movimentações"
                    description="As alterações de etapa aparecerão aqui."
                    className="py-4"
                  />
                </div>
              ) : historico.map((h) => (
                <div key={h.id} className="text-xs border border-ink-100 rounded-lg p-2.5 bg-ink-50/30">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-ink-800">{h.user_nome || 'Sistema'}</span>
                    <span className="text-ink-400">·</span>
                    <span className="text-ink-500">{format.data(h.created_at)}</span>
                  </div>
                  <div className="text-ink-700 mt-0.5">{EVENTO_LABEL[h.evento] || h.evento}</div>
                  {h.detalhes && h.detalhes !== 'null' && h.detalhes !== '{}' && (
                    <div className="text-ink-500 mt-0.5 truncate" title={h.detalhes}>{h.detalhes}</div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </aside>
      </div>

      {/* Modal de confirmação de exclusão (somente admin) */}
      <Modal
        open={showDeleteConfirm}
        onClose={() => !deleting && setShowDeleteConfirm(false)}
        title="Excluir pedido"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>Cancelar</Button>
            <Button variant="primary" onClick={onExcluir} loading={deleting} className="bg-red-600 hover:bg-red-700 text-white">
              <Trash2 className="w-4 h-4" />Excluir permanentemente
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-semibold">Esta ação não pode ser desfeita.</p>
              <p className="mt-1">O pedido <strong>#{pedidoId}</strong> e todas as suas dependências (itens, boletos, histórico, arquivos) serão removidos permanentemente.</p>
            </div>
          </div>
          {nfs.length > 0 && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                Este pedido possui <strong>{nfs.length} NF(s) vinculada(s)</strong>. Cancele a(s) NF(s) antes de excluir o pedido.
              </div>
            </div>
          )}
          {deleteError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{deleteError}</div>
          )}
        </div>
      </Modal>
    </div>
  );
}

const PAPEIS_ALLOWED_LIST: Record<string, string[]> = {
  atendimento: ['solicitada', 'em_preparacao'],
  preparacao: ['em_preparacao', 'aguardando_envio'],
  envio: ['aguardando_envio', 'enviada', 'cust_pgtos', 'aguardando_publicacao'],
  publicacao: ['aguardando_publicacao', 'publicacao_recebida', 'cliente_atendido'],
  faturamento: ['cliente_atendido', 'aprovacao_faturamento', 'aguardando_nf', 'nf_emitida'],
  financeiro: ['nf_emitida', 'aguardando_pagamento', 'recebido'],
};

const EVENTO_LABEL: Record<string, string> = {
  etapa_solicitada: 'Atualizou dados da solicitação',
  etapa_em_preparacao: 'Atualizou preparação',
  etapa_aguardando_envio: 'Atualizou momento de envio',
  etapa_aguardando_publicacao: 'Atualizou previsão de publicação',
  etapa_publicacao_recebida: 'Marcou publicação como recebida',
  etapa_cliente_atendido: 'Marcou cliente como atendido',
  etapa_aprovacao_faturamento: 'Atualizou aprovação de faturamento',
  boleto_criado: 'Adicionou boleto',
  boleto_atualizado: 'Atualizou boleto',
  boleto_removido: 'Removeu boleto',
};
