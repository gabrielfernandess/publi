'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent, type DragCancelEvent,
  useDraggable, useDroppable,
} from '@dnd-kit/core';
import { Plus, MoreVertical, Building2, FileText, Truck, Lock, Search, X, GripVertical } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Card } from '@/components/ui/Card';
import { format, truncate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { STATUS_LIST, STATUS_BY_ID, canMoveFront } from './constants';

type Coluna = { id: string; label: string; emoji: string; cor: string; pedidos: any[] };

type Pedido = {
  id: number;
  status: string;
  categoria: string;
  descricao?: string;
  data_solicitacao: string;
  data_desejada_publicacao?: string;
  updated_at: string;
  cliente_nome: string;
  cliente_municipio?: string;
  cliente_estado?: string;
};

type ContratoItem = { id: number; descricao: string; cm_contratado: number; cm_utilizado: number; veiculo_nome: string; veiculo_tipo: string };
type ContratoResumo = { id: number; cliente_id: number; cliente_nome?: string; cliente_municipio?: string };

export default function PedidosPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchFromUrl = searchParams.get('search') || '';
  const [colunas, setColunas] = useState<Coluna[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);

  // estado de drag
  const [activeId, setActiveId] = useState<number | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [deny, setDeny] = useState<string | null>(null); // feedback "nao pode mover pra X"

  // ativa o sensor de pointer (mouse) e touch (mobile/tablet)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  const load = () => {
    setLoading(true);
    const url = searchFromUrl
      ? `/api/pedidos?search=${encodeURIComponent(searchFromUrl)}`
      : '/api/pedidos/kanban';
    const promise = searchFromUrl
      ? api.get<{ data: any[] }>(url).then((r) => {
          const grp = STATUS_LIST.map((s) => ({
            ...s, pedidos: r.data.filter((p) => p.status === s.id),
          }));
          setColunas(grp);
          setFiltered(r.data);
        })
      : api.get<{ data: { colunas: Coluna[]; total: number } }>(url).then((r) => {
          setColunas(r.data.colunas);
          const all = r.data.colunas.flatMap((c) => c.pedidos);
          setFiltered(all);
        });
    promise.finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [searchFromUrl]);

  const onDragStart = (e: DragStartEvent) => {
    setActiveId(Number(e.active.id));
  };

  const onDragOver = (e: any) => {
    const overId = e.over?.id ? String(e.over.id) : null;
    setOverCol(overId);
  };

  const onDragEnd = (e: DragEndEvent) => {
    const pedidoId = Number(e.active.id);
    const overId = e.over?.id ? String(e.over.id) : null;
    setActiveId(null);
    setOverCol(null);

    if (!overId) return;
    const origem = colunas.find((c) => c.pedidos.some((p) => p.id === pedidoId))?.id;
    if (!origem || origem === overId) return;

    // valida RBAC + transicao
    if (!canMoveFront(user?.papel || '', origem, overId)) {
      setDeny(STATUS_BY_ID[overId]?.label || overId);
      setTimeout(() => setDeny(null), 2200);
      return;
    }

    mover(pedidoId, overId);
  };

  const onDragCancel = (_e: DragCancelEvent) => {
    setActiveId(null);
    setOverCol(null);
  };

  const mover = async (pedidoId: number, novoStatus: string) => {
    // otimismo: tira da coluna antiga
    setColunas((prev) => prev.map((c) => ({ ...c, pedidos: c.pedidos.filter((p) => p.id !== pedidoId) })));
    try {
      await api.patch(`/api/pedidos/${pedidoId}/status`, { status: novoStatus });
      load();
    } catch (err) {
      load(); // rollback
    }
  };

  const abrirPedido = (p: Pedido) => {
    router.push(`/app/pedidos/${p.id}`);
  };

  const activePedido = activeId
    ? colunas.flatMap((c) => c.pedidos).find((p) => p.id === activeId)
    : null;

  return (
    <div>
      <PageHeader
        title="Pedidos"
        description={searchFromUrl
          ? `${filtered.length} resultado(s) pra "${searchFromUrl}"`
          : "Kanban operacional — arraste os cards entre as colunas pra mudar o status"}
        actions={
          <div className="flex items-center gap-2">
            {searchFromUrl && (
              <Button variant="outline" onClick={() => router.push('/app/pedidos')}>
                <X className="w-4 h-4" />Limpar busca
              </Button>
            )}
            <Button variant="primary" onClick={() => setOpenNew(true)}>
              <Plus className="w-4 h-4" />Novo pedido
            </Button>
          </div>
        }
      />

      {deny && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          Voce nao pode mover pra <strong className="font-semibold">{deny}</strong> (limite do seu papel ou do fluxo).
        </div>
      )}

      {loading ? (
        <div className="text-sm text-ink-500 py-8 text-center">Carregando kanban...</div>
      ) : filtered.length === 0 && searchFromUrl ? (
        <Card className="p-8 text-center">
          <Search className="w-10 h-10 mx-auto text-ink-300" />
          <p className="mt-3 text-sm font-semibold text-ink-900">Nenhum pedido encontrado</p>
          <p className="text-xs text-ink-500 mt-1">Tente outro termo ou veja todos os pedidos.</p>
          <Button variant="outline" onClick={() => router.push('/app/pedidos')} className="mt-4">
            Ver todos os pedidos
          </Button>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <div className="-mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8">
            <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory">
              {colunas.map((c) => (
                <KanbanColumn
                  key={c.id}
                  coluna={c}
                  onOpenDetail={abrirPedido}
                  onMover={mover}
                  isOver={overCol === c.id && !colunas.find((x) => x.id === c.id)?.pedidos.some((p) => p.id === activeId)}
                  isActiveFromHere={Boolean(activeId) && Boolean(colunas.find((x) => x.id === c.id)?.pedidos.some((p) => p.id === activeId))}
                  idxOf={(s) => STATUS_LIST.findIndex((x) => x.id === s)}
                  papel={user?.papel || ''}
                />
              ))}
            </div>
          </div>

          {/* card "fantasma" que segue o mouse durante o drag */}
          <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}>
            {activePedido ? (
              <div className="w-72 rotate-1 opacity-95 shadow-lift">
                <PedidoCard pedido={activePedido} onOpen={() => {}} onMover={() => {}} dragging />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <NovoPedidoModal
        open={openNew}
        onClose={() => setOpenNew(false)}
        onCreated={() => { setOpenNew(false); load(); }}
      />
    </div>
  );
}

function KanbanColumn({
  coluna, onOpenDetail, onMover, isOver, isActiveFromHere, idxOf, papel,
}: {
  coluna: Coluna;
  onOpenDetail: (p: Pedido) => void;
  onMover: (id: number, status: string) => void;
  isOver: boolean;
  isActiveFromHere: boolean;
  idxOf: (s: string) => number;
  papel: string;
}) {
  const { setNodeRef, isOver: isOverDnd } = useDroppable({ id: coluna.id });
  const highlighted = isOver || (isOverDnd && !isActiveFromHere);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex-shrink-0 w-72 rounded-xl border-t-4 snap-start transition-all duration-150',
        coluna.cor,
        highlighted
          ? 'bg-brand-50 ring-2 ring-brand-300 ring-offset-1'
          : 'bg-ink-50',
      )}
    >
      <div className={cn(
        'px-3 py-3 sticky top-0 rounded-t-xl z-10 flex items-center justify-between',
        highlighted ? 'bg-brand-50' : 'bg-ink-50',
      )}>
        <div className="flex items-center gap-2">
          <span className="text-base">{coluna.emoji}</span>
          <span className="text-xs font-semibold text-ink-800 uppercase tracking-wider">{coluna.label}</span>
        </div>
        <span className="text-xs font-bold text-ink-500 bg-white px-2 py-0.5 rounded-md border border-ink-200">
          {coluna.pedidos.length}
        </span>
      </div>
      <div className="px-2 pb-3 space-y-2 min-h-[200px]">
        {coluna.pedidos.length === 0 ? (
          <div className="text-center py-8 text-xs text-ink-400">
            {highlighted ? 'Solte aqui' : 'Nenhum pedido'}
          </div>
        ) : (
          coluna.pedidos.map((p) => (
            <DraggableCard
              key={p.id}
              pedido={p}
              onOpen={() => onOpenDetail(p)}
              onMover={onMover}
              idxOf={idxOf}
              currentIdx={idxOf(coluna.id)}
              papel={papel}
            />
          ))
        )}
      </div>
    </div>
  );
}

function DraggableCard({
  pedido, onOpen, onMover, idxOf, currentIdx, papel,
}: {
  pedido: Pedido;
  onOpen: () => void;
  onMover: (id: number, status: string) => void;
  idxOf: (s: string) => number;
  currentIdx: number;
  papel: string;
}) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({ id: pedido.id });
  const style: React.CSSProperties = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && 'opacity-30')}
    >
      <PedidoCard
        pedido={pedido}
        onOpen={onOpen}
        onMover={onMover}
        dragHandle={{ attributes, listeners }}
        currentIdx={currentIdx}
        idxOf={idxOf}
        papel={papel}
      />
    </div>
  );
}

function PedidoCard({
  pedido, onOpen, onMover, dragHandle, currentIdx, idxOf, papel, dragging,
}: {
  pedido: Pedido;
  onOpen: () => void;
  onMover: (id: number, status: string) => void;
  dragHandle?: { attributes: any; listeners: any };
  currentIdx?: number;
  idxOf?: (s: string) => number;
  papel?: string;
  dragging?: boolean;
}) {
  const [openMenu, setOpenMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openMenu) return;
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenu(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [openMenu]);

  return (
    <div
      onClick={dragging ? undefined : onOpen}
      className={cn(
        'group bg-white rounded-lg border border-ink-200 shadow-soft hover:shadow-lift hover:border-brand-300 transition-all cursor-pointer overflow-hidden',
        dragging && 'border-brand-300',
      )}
    >
      <div className="p-2.5">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1 text-[10px] text-ink-500">
              <Building2 className="w-3 h-3 flex-shrink-0" />
              <span className="truncate font-medium">{pedido.cliente_nome}</span>
            </div>
            {pedido.cliente_municipio && (
              <div className="text-[10px] text-ink-400 mt-0.5 truncate">
                {pedido.cliente_municipio}{pedido.cliente_estado ? `/${pedido.cliente_estado}` : ''}
              </div>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {dragHandle && (
              <button
                {...dragHandle.attributes}
                {...dragHandle.listeners}
                onClick={(e) => e.stopPropagation()}
                className="p-0.5 -m-0.5 text-ink-300 hover:text-ink-600 cursor-grab active:cursor-grabbing touch-none"
                title="Arraste pra mudar de coluna"
                aria-label="Arraste pra mudar de coluna"
              >
                <GripVertical className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => { e.stopPropagation(); setOpenMenu(!openMenu); }}
                className="p-0.5 -m-0.5 text-ink-400 hover:text-ink-700 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Mover para..."
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>
              {openMenu && (
                <div className="absolute right-0 z-20 mt-1 w-56 bg-white border border-ink-200 rounded-lg shadow-lift py-1" onClick={(e) => e.stopPropagation()}>
                  <div className="px-2 py-1.5 text-[10px] text-ink-500 uppercase tracking-wider font-semibold border-b border-ink-100">
                    Mover para
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {STATUS_LIST.map((s) => {
                      const allowed = s.id === pedido.status || (papel && canMoveFront(papel, pedido.status, s.id));
                      return (
                        <button
                          key={s.id}
                          onClick={() => { if (allowed) { setOpenMenu(false); onMover(pedido.id, s.id); } }}
                          disabled={!allowed}
                          className={cn(
                            'w-full text-left px-3 py-1.5 text-xs flex items-center gap-2',
                            allowed ? 'hover:bg-ink-50' : 'opacity-30 cursor-not-allowed',
                            s.id === pedido.status && 'bg-brand-50 text-brand-800 font-semibold'
                          )}
                        >
                          <span>{s.emoji}</span>
                          <span>{s.label}</span>
                          {s.id === pedido.status && <span className="ml-auto text-[9px] text-brand-600">atual</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-2 text-xs text-ink-800 font-medium line-clamp-2 leading-snug">
          {truncate(pedido.descricao || pedido.categoria, 80)}
        </div>

        <div className="mt-2 flex items-center justify-between text-[10px] text-ink-500">
          <span className="capitalize">{pedido.categoria.replace(/_/g, ' ')}</span>
          {pedido.data_desejada_publicacao && (
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5" />
              {format.data(pedido.data_desejada_publicacao)}
            </span>
          )}
        </div>
      </div>

      <div className="px-2 py-1.5 border-t border-ink-100 bg-ink-50/50 flex items-center justify-between">
        <span className="text-[10px] text-ink-400 flex items-center gap-1">
          #{pedido.id} • {format.data(pedido.data_solicitacao)}
        </span>
      </div>
    </div>
  );
}

function NovoPedidoModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [clientes, setClientes] = useState<any[]>([]);
  const [contratos, setContratos] = useState<ContratoResumo[]>([]);
  const [contrato, setContrato] = useState<ContratoResumo | null>(null);
  const [contratoItens, setContratoItens] = useState<ContratoItem[]>([]);
  const [loadingItens, setLoadingItens] = useState(false);
  const [form, setForm] = useState({
    cliente_id: 0,
    contrato_id: 0,
    data_solicitacao: new Date().toISOString().slice(0, 10),
    data_desejada_publicacao: '',
    categoria: 'aviso_licitacao',
    descricao: '',
    itens: [] as { contrato_item_id: number; cm_publicado: number }[],
  });
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      api.get<{ data: any[] }>('/api/clientes'),
      api.get<{ data: ContratoResumo[] }>('/api/contratos?status=ativo'),
    ]).then(([c, ct]) => {
      setClientes(c.data);
      setContratos(ct.data);
    });
  }, [open]);

  useEffect(() => {
    if (form.cliente_id) {
      const ct = contratos.find((x) => x.cliente_id === form.cliente_id);
      setContrato(ct || null);
      setContratoItens([]);
      setForm((f) => ({ ...f, contrato_id: ct?.id || 0, itens: [] }));

      if (ct) {
        setLoadingItens(true);
        api.get<{ data: { itens: ContratoItem[] } }>(`/api/contratos/${ct.id}`)
          .then((r) => setContratoItens(r.data.itens || []))
          .catch(() => setContratoItens([]))
          .finally(() => setLoadingItens(false));
      }
    } else {
      setContrato(null);
      setContratoItens([]);
    }
  }, [form.cliente_id, contratos]);

  const toggleItem = (itemId: number) => {
    setForm((f) => {
      const exists = f.itens.find((i) => i.contrato_item_id === itemId);
      if (exists) {
        return { ...f, itens: f.itens.filter((i) => i.contrato_item_id !== itemId) };
      }
      return { ...f, itens: [...f.itens, { contrato_item_id: itemId, cm_publicado: 0 }] };
    });
  };

  const updateCm = (itemId: number, cm: number) => {
    setForm((f) => ({ ...f, itens: f.itens.map((i) => i.contrato_item_id === itemId ? { ...i, cm_publicado: cm } : i) }));
  };

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (!form.contrato_id) { setErro('Selecione um contrato'); return; }
    if (form.itens.length === 0) { setErro('Adicione ao menos 1 item com cm'); return; }
    if (form.itens.some((i) => i.cm_publicado <= 0)) { setErro('Todos os itens precisam ter cm > 0'); return; }
    setSaving(true);
    try {
      await api.post('/api/pedidos', form);
      onCreated();
    } catch (err: any) {
      setErro(err.message || 'Erro ao criar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Novo pedido" size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={onSave} loading={saving}>Criar pedido</Button>
        </>
      }
    >
      <form onSubmit={onSave} className="space-y-4">
        {erro && <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</div>}
        <div className="grid sm:grid-cols-2 gap-4">
          <Select label="Cliente" required value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: Number(e.target.value) })}>
            <option value={0}>Selecione...</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
          <Input label="Data da solicitacao" type="date" required value={form.data_solicitacao} onChange={(e) => setForm({ ...form, data_solicitacao: e.target.value })} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Select label="Categoria" required value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
            <option value="aviso_licitacao">Aviso de Licitacao</option>
            <option value="extrato_contrato">Extrato de Contrato</option>
            <option value="homologacao">Homologacao</option>
            <option value="aditamento">Aditamento</option>
            <option value="suspensao">Suspensao</option>
            <option value="outros">Outros</option>
          </Select>
          <Input label="Data desejada de publicacao" type="date" value={form.data_desejada_publicacao} onChange={(e) => setForm({ ...form, data_desejada_publicacao: e.target.value })} />
        </div>
        <Textarea label="Descricao" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Detalhes do pedido..." />

        {contrato ? (
          <div>
            <div className="text-sm font-semibold text-ink-800 mb-2 flex items-center gap-2">
              <Truck className="w-4 h-4 text-brand-700" />
              Itens do contrato #{contrato.id} ({clientes.find((c) => c.id === form.cliente_id)?.nome || ''})
            </div>
            {loadingItens ? (
              <div className="text-sm text-ink-500 py-3 text-center">Carregando itens do contrato...</div>
            ) : contratoItens.length === 0 ? (
              <div className="text-sm text-ink-500 py-3 text-center">Contrato sem itens cadastrados.</div>
            ) : (
              <div className="space-y-2">
                {contratoItens.map((it) => {
                  const selected = form.itens.find((i) => i.contrato_item_id === it.id);
                  const saldo = it.cm_contratado - it.cm_utilizado;
                  return (
                    <label key={it.id} className={cn('flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors', selected ? 'border-brand-500 bg-brand-50/40' : 'border-ink-200 hover:border-ink-300 bg-white')}>
                      <input type="checkbox" checked={!!selected} onChange={() => toggleItem(it.id)} className="w-4 h-4 accent-brand-700" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink-900">{it.veiculo_nome}</div>
                        <div className="text-xs text-ink-500 mt-0.5">{it.descricao} • {format.cm(saldo)} disponiveis</div>
                      </div>
                      {selected && (
                        <div className="w-28">
                          <Input type="number" step="0.01" min="0" max={saldo} placeholder="cm" value={selected.cm_publicado || ''} onChange={(e) => updateCm(it.id, Number(e.target.value))} />
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ) : form.cliente_id > 0 ? (
          <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Este cliente nao tem contrato ativo. Crie um contrato antes de criar pedidos.
          </div>
        ) : null}
      </form>
    </Modal>
  );
}
