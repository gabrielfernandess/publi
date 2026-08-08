'use client';

import { useEffect, useState } from 'react';
import { Save, Plus, Trash2, FileText, AlertCircle, CheckCircle2, Clock, ExternalLink, Receipt, DollarSign, Wand2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { format } from '@/lib/format';
import { cn } from '@/lib/utils';
import { FileUpload } from '@/components/ui/FileUpload';

type Props = {
  pedidoId: number;
  etapaId: string;
  papel: string;
  userId: number;
  onSaved?: () => void;
};

type Boleto = {
  id: number;
  veiculo_tipo: 'dou' | 'doe' | 'jornal';
  valor: number;
  data_vencimento: string;
  data_pagamento: string;
  arquivo_path: string;
  observacoes: string;
};

const CATEGORIAS = [
  { value: 'aviso_licitacao', label: 'Aviso de Licitação' },
  { value: 'extrato_contrato', label: 'Extrato de Contrato' },
  { value: 'homologacao', label: 'Homologação' },
  { value: 'aditamento', label: 'Aditamento' },
  { value: 'suspensao', label: 'Suspensão' },
  { value: 'outros', label: 'Outros' },
];

export function EtapaTabs({ pedidoId, etapaId, papel, userId, onSaved }: Props) {
  const [pedido, setPedido] = useState<any>(null);
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [nfs, setNfs] = useState<any[]>([]);
  const [historico, setHistorico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      // busca NFs vinculadas
      return api.get(`/api/notas-fiscais?pedido_id=${pedidoId}`);
    }).then((n) => {
      setNfs(n.data || []);
    }).catch((err) => {
      console.error('Erro ao carregar etapa:', err);
    }).finally(() => setLoading(false));
  }, [pedidoId]);

  if (loading || !pedido) {
    return <div className="text-sm text-ink-500 py-8 text-center">Carregando dados do pedido...</div>;
  }

  // Render por etapa
  switch (etapaId) {
    case 'solicitada':               return <AbaSolicitacao pedido={pedido} onSaved={onSaved} />;
    case 'em_preparacao':            return <AbaPreparacao pedido={pedido} onSaved={onSaved} />;
    case 'aguardando_envio':         return <AbaAguardandoEnvio pedido={pedido} />;
    case 'enviada':                  return <AbaEnviada pedido={pedido} onSaved={onSaved} />;
    case 'cust_pgtos':               return <AbaCustos pedidoId={pedidoId} papel={papel} boletos={boletos} setBoletos={setBoletos} />;
    case 'aguardando_publicacao':    return <AbaAguardandoPublicacao pedido={pedido} onSaved={onSaved} />;
    case 'publicacao_recebida':      return <AbaPublicacaoRecebida pedido={pedido} onSaved={onSaved} />;
    case 'cliente_atendido':         return <AbaClienteAtendido pedido={pedido} onSaved={onSaved} />;
    case 'aprovacao_faturamento':    return <AbaAprovacaoFaturamento pedido={pedido} papel={papel} userId={userId} onSaved={onSaved} />;
    case 'aguardando_nf':            return <AbaAguardandoNF nfs={nfs} />;
    case 'nf_emitida':               return <AbaNFEmitida nfs={nfs} />;
    case 'aguardando_pagamento':     return <AbaAguardandoPgto nfs={nfs} />;
    case 'recebido':                 return <AbaRecebido nfs={nfs} />;
    default:                         return <div className="text-sm text-ink-500">Etapa desconhecida</div>;
  }
}

// =========== ABAS ===========

function AbaHeader({ icon, title, desc }: { icon: React.ReactNode; title: string; desc?: string }) {
  return (
    <div className="flex items-start gap-3 pb-4 border-b border-ink-100">
      <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
        {desc && <p className="text-xs text-ink-500 mt-0.5">{desc}</p>}
      </div>
    </div>
  );
}

function SaveButton({ onClick, saving, label = 'Salvar dados desta etapa' }: { onClick: () => void; saving: boolean; label?: string }) {
  return (
    <div className="pt-3 flex justify-end">
      <Button onClick={onClick} loading={saving}>
        <Save className="w-4 h-4" />{label}
      </Button>
    </div>
  );
}

function AbaSolicitacao({ pedido, onSaved }: { pedido: any; onSaved?: () => void }) {
  const [form, setForm] = useState({
    descricao: pedido.descricao || '',
    categoria_publicacao: pedido.categoria_publicacao || pedido.categoria || 'aviso_licitacao',
    data_desejada_publicacao: pedido.data_desejada_publicacao || '',
    canal_recebimento: pedido.canal_recebimento || 'whatsapp',
    cliente_contato_nome: pedido.cliente_contato_nome || '',
    cliente_contato_telefone: pedido.cliente_contato_telefone || '',
    cliente_contato_email: pedido.cliente_contato_email || '',
    veiculo_unico: pedido.veiculo_unico || 'dou',
    arquivo_word_recebido_em: pedido.arquivo_word_recebido_em || '',
  });
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/api/pedidos/${pedido.id}/etapa/solicitada`, form);
      onSaved?.();
    } finally { setSaving(false); }
  };

  const CANAIS = [
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'email', label: 'E-mail' },
    { value: 'presencial', label: 'Presencial' },
    { value: 'telefone', label: 'Telefone' },
    { value: 'outros', label: 'Outros' },
  ];

  return (
    <div className="space-y-4">
      <AbaHeader icon={<FileText className="w-4 h-4" />} title="Solicitação" desc="Recebimento da solicitação, arquivo importado, veículo e data desejada." />
      <div className="grid sm:grid-cols-2 gap-4">
        <Select label="Canal de recebimento" value={form.canal_recebimento} onChange={(e) => setForm({ ...form, canal_recebimento: e.target.value })}>
          {CANAIS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </Select>
        <Input label="Data do recebimento" type="date" value={form.arquivo_word_recebido_em} onChange={(e) => setForm({ ...form, arquivo_word_recebido_em: e.target.value })} />
      </div>

      <div>
        <label className="text-xs font-semibold text-ink-700 mb-2 block">Veículo (escolha 1)</label>
        <div className="grid sm:grid-cols-3 gap-2">
          {[
            { value: 'dou', label: 'DOU', desc: 'Diário Oficial da União' },
            { value: 'doe', label: 'DOE', desc: 'Diário Oficial do Estado' },
            { value: 'jornal', label: 'Jornal', desc: 'Jornal de Grande Circulação' },
          ].map((v) => (
            <label key={v.value} className={cn('flex items-center gap-2.5 p-3 rounded-lg border-2 cursor-pointer transition-colors', form.veiculo_unico === v.value ? 'border-brand-500 bg-brand-50/40' : 'border-ink-200 hover:border-ink-300 bg-white')}>
              <input type="radio" name="veiculo_unico" value={v.value} checked={form.veiculo_unico === v.value} onChange={(e) => setForm({ ...form, veiculo_unico: e.target.value })} className="w-4 h-4 accent-brand-700" />
              <div>
                <div className="text-sm font-semibold text-ink-900">{v.label}</div>
                <div className="text-xs text-ink-500">{v.desc}</div>
              </div>
            </label>
          ))}
        </div>
        <p className="text-xs text-ink-500 mt-1.5">⚠️ Cada pedido é de UM veículo (formato é diferente por veículo).</p>
      </div>

      <div>
        <label className="text-xs font-semibold text-ink-700 mb-2 block">Contato do cliente</label>
        <div className="grid sm:grid-cols-3 gap-2">
          <Input label="Nome" value={form.cliente_contato_nome} onChange={(e) => setForm({ ...form, cliente_contato_nome: e.target.value })} placeholder="João Silva" />
          <Input label="Telefone" value={form.cliente_contato_telefone} onChange={(e) => setForm({ ...form, cliente_contato_telefone: e.target.value })} placeholder="(99) 99999-9999" />
          <Input label="E-mail" type="email" value={form.cliente_contato_email} onChange={(e) => setForm({ ...form, cliente_contato_email: e.target.value })} placeholder="contato@prefeitura.gov.br" />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-ink-700 mb-2 block">Arquivo da solicitação</label>
        <FileUpload pedidoId={pedido.id} categoria="solicitacao" onUploaded={() => onSaved?.()} />
        <p className="text-xs text-ink-500 mt-2">📎 Importe o arquivo do Word ou PDF. Os dados são extraídos automaticamente na etapa "Em preparação".</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Select label="Categoria da publicação" value={form.categoria_publicacao} onChange={(e) => setForm({ ...form, categoria_publicacao: e.target.value })}>
          {CATEGORIAS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </Select>
        <Input label="Data desejada de publicação" type="date" value={form.data_desejada_publicacao} onChange={(e) => setForm({ ...form, data_desejada_publicacao: e.target.value })} />
      </div>

      <SaveButton onClick={onSave} saving={saving} />
    </div>
  );
}

      <Textarea label="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Detalhes do que precisa publicar..." />

      <SaveButton onClick={onSave} saving={saving} />
    </div>
  );
}

function AbaPreparacao({ pedido, onSaved }: { pedido: any; onSaved?: () => void }) {
  const [form, setForm] = useState({
    observacoes_preparacao: pedido.observacoes_preparacao || '',
    observacoes_internas: pedido.observacoes_internas || '',
  });
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [procResult, setProcResult] = useState<any>(null);

  const onSave = async () => {
    setSaving(true);
    try { await api.patch(`/api/pedidos/${pedido.id}/etapa/em_preparacao`, form); onSaved?.(); }
    finally { setSaving(false); }
  };

  const onProcessar = async () => {
    setProcessing(true);
    setProcResult(null);
    try {
      const r = await api.post(`/api/pedidos/${pedido.id}/processar`, {});
      setProcResult(r.data);
      onSaved?.();
    } catch (e: any) {
      alert('Erro ao processar: ' + (e.message || 'desconhecido'));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <AbaHeader icon={<FileText className="w-4 h-4" />} title="Em preparação" desc="Processa o arquivo importado: corrige ortografia, formata e extrai dados automaticamente." />

      <div className="rounded-xl border border-brand-200 bg-brand-50/30 p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0">
            <Wand2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-ink-900">Processar arquivo automaticamente</h4>
            <p className="text-xs text-ink-600 mt-0.5">O sistema lê o arquivo Word/PDF, corrige ortografia, aplica formatação padrão e extrai dados (datas, CNPJ, valor, processo).</p>
            {pedido.processado_em && (
              <p className="text-xs text-emerald-700 mt-1.5">✓ Processado em {new Date(pedido.processado_em).toLocaleString('pt-BR')} ({pedido.qtd_correcoes} correções)</p>
            )}
            <div className="mt-3">
              <Button onClick={onProcessar} loading={processing} disabled={!pedido.arquivos_count} size="sm">
                <Wand2 className="w-4 h-4" />{processing ? 'Processando...' : (pedido.processado_em ? 'Reprocessar arquivo' : 'Processar arquivo agora')}
              </Button>
            </div>
          </div>
        </div>

        {procResult && (
          <div className="mt-4 space-y-2 border-t border-brand-200 pt-3">
            {procResult.correcoes > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs">
                <div className="font-semibold text-amber-900">📝 {procResult.correcoes} correções aplicadas</div>
                <div className="text-amber-800 mt-1">Arquivo corrigido salvo: <span className="font-mono">{procResult.arquivo_corrigido || '—'}</span></div>
              </div>
            )}
            {procResult.dados_extraidos && Object.keys(procResult.dados_extraidos).length > 0 && (
              <div className="rounded-lg bg-white border border-ink-200 p-3 text-xs">
                <div className="font-semibold text-ink-900 mb-1">📊 Dados extraídos:</div>
                <pre className="text-ink-700 font-mono text-[11px] overflow-x-auto">{JSON.stringify(procResult.dados_extraidos, null, 2)}</pre>
              </div>
            )}
            {procResult.preview && (
              <div className="rounded-lg bg-white border border-ink-200 p-3 text-xs">
                <div className="font-semibold text-ink-900 mb-1">👀 Preview (antes → depois):</div>
                <div className="text-ink-500">Antes:</div>
                <pre className="text-ink-700 bg-ink-50 rounded p-2 mt-1 whitespace-pre-wrap">{procResult.preview.antes}</pre>
                <div className="text-ink-500 mt-2">Depois:</div>
                <pre className="text-emerald-700 bg-emerald-50 rounded p-2 mt-1 whitespace-pre-wrap">{procResult.preview.depois}</pre>
              </div>
            )}
          </div>
        )}
      </div>

      <Textarea label="Observações de preparação" value={form.observacoes_preparacao} onChange={(e) => setForm({ ...form, observacoes_preparacao: e.target.value })} rows={3} placeholder="Detalhes sobre a formatação, ajustes, etc..." />
      <Textarea label="Observações internas (geral)" value={form.observacoes_internas} onChange={(e) => setForm({ ...form, observacoes_internas: e.target.value })} rows={3} placeholder="Anotações internas da equipe..." />
      <SaveButton onClick={onSave} saving={saving} />
    </div>
  );
}

function AbaAguardandoEnvio({ pedido, onSaved }: { pedido: any; onSaved?: () => void }) {
  const [form, setForm] = useState({
    previsao_envio: pedido.previsao_envio || '',
    janela_envio: pedido.janela_envio || '',
    observacoes_internas: pedido.observacoes_internas || '',
  });
  const [saving, setSaving] = useState(false);
  const onSave = async () => {
    setSaving(true);
    try { await api.patch(`/api/pedidos/${pedido.id}/etapa/aguardando_envio`, form); onSaved?.(); }
    finally { setSaving(false); }
  };
  return (
    <div className="space-y-4">
      <AbaHeader icon={<Clock className="w-4 h-4" />} title="Aguardando momento de envio" desc="Publicação pronta. Aguardando sincronizar com a data desejada de cada veículo." />
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
        <div className="flex items-center gap-2 font-semibold mb-1">
          <AlertCircle className="w-4 h-4" /> Momento ideal
        </div>
        <p className="text-xs">Aguarde o momento certo para enviar conforme o prazo de cada veículo (DOU/DOE/Jornal), visando sincronizar a data desejada de publicação.</p>
        {pedido.data_desejada_publicacao && (
          <p className="text-xs mt-2"><strong>Data desejada:</strong> {format.data(pedido.data_desejada_publicacao)}</p>
        )}
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Previsão de envio" type="date" value={form.previsao_envio} onChange={(e) => setForm({ ...form, previsao_envio: e.target.value })} />
        <Select label="Janela de envio" value={form.janela_envio} onChange={(e) => setForm({ ...form, janela_envio: e.target.value })}>
          <option value="">Selecione...</option>
          <option value="manha">Manhã (8h-12h)</option>
          <option value="tarde">Tarde (13h-18h)</option>
          <option value="comercial">Horário comercial</option>
          <option value="urgente">Urgente (enviar agora)</option>
        </Select>
      </div>
      <Textarea label="Observações" value={form.observacoes_internas} onChange={(e) => setForm({ ...form, observacoes_internas: e.target.value })} rows={3} placeholder="Detalhes do timing, alinhamento com cliente, etc..." />
      <SaveButton onClick={onSave} saving={saving} />
    </div>
  );
}

function AbaEnviada({ pedido, onSaved }: { pedido: any; onSaved?: () => void }) {
  const [itens, setItens] = useState<any[]>(pedido.itens || []);
  const [saving, setSaving] = useState<number | null>(null);

  const updateItem = (id: number, patch: any) => {
    setItens((prev) => prev.map((it) => it.id === id ? { ...it, ...patch } : it));
  };
  const saveItem = async (id: number) => {
    setSaving(id);
    try {
      await api.put(`/api/pedidos/${pedido.id}/itens/${id}`, itens.find((i) => i.id === id));
      onSaved?.();
    } finally { setSaving(null); }
  };

  return (
    <div className="space-y-4">
      <AbaHeader icon={<FileText className="w-4 h-4" />} title="Publicações enviadas" desc="Protocolos de envio por veículo. Adicione o protocolo e a data de envio de cada um." />
      {itens.length === 0 ? (
        <div className="text-sm text-ink-500 py-4 text-center">Nenhum item no pedido.</div>
      ) : (
        <div className="space-y-2">
          {itens.map((it) => (
            <div key={it.id} className="border border-ink-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-ink-900">{it.veiculo_nome}</div>
                <Badge variant="outline">{it.veiculo_tipo.toUpperCase()}</Badge>
              </div>
              <div className="text-xs text-ink-500">{it.item_descricao} • {format.cm(it.cm_publicado)} publicados</div>
              <div className="grid sm:grid-cols-2 gap-2">
                <Input placeholder="Protocolo de envio" value={it.protocolo_envio || ''} onChange={(e) => updateItem(it.id, { protocolo_envio: e.target.value })} />
                <Input type="date" value={it.data_envio || ''} onChange={(e) => updateItem(it.id, { data_envio: e.target.value })} />
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={() => saveItem(it.id)} loading={saving === it.id}>
                  <Save className="w-3.5 h-3.5" />Salvar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AbaCustos({ pedidoId, papel, boletos, setBoletos }: { pedidoId: number; papel: string; boletos: Boleto[]; setBoletos: (b: Boleto[]) => void }) {
  const canEdit = papel === 'admin' || papel === 'envio' || papel === 'financeiro';
  const [novo, setNovo] = useState({ veiculo_tipo: 'dou', valor: 0, data_vencimento: '', observacoes: '' });
  const [saving, setSaving] = useState(false);

  const onAdd = async () => {
    if (novo.valor <= 0) return;
    setSaving(true);
    try {
      const r = await api.post(`/api/pedidos/${pedidoId}/boletos`, novo);
      setBoletos([...boletos, r.data]);
      setNovo({ veiculo_tipo: 'dou', valor: 0, data_vencimento: '', observacoes: '' });
    } finally { setSaving(false); }
  };
  const onPay = async (b: Boleto) => {
    const r = await api.patch(`/api/pedidos/${pedidoId}/boletos/${b.id}`, { data_pagamento: new Date().toISOString().slice(0, 10) });
    setBoletos(boletos.map((x) => x.id === b.id ? r.data : x));
  };
  const onDelete = async (b: Boleto) => {
    if (!confirm('Remover boleto?')) return;
    await api.delete(`/api/pedidos/${pedidoId}/boletos/${b.id}`);
    setBoletos(boletos.filter((x) => x.id !== b.id));
  };

  const total = boletos.reduce((acc, b) => acc + Number(b.valor || 0), 0);
  const pago = boletos.filter((b) => b.data_pagamento).reduce((acc, b) => acc + Number(b.valor || 0), 0);

  return (
    <div className="space-y-4">
      <AbaHeader icon={<DollarSign className="w-4 h-4" />} title="Custos operacionais" desc="Boletos DOU/DOE. Jornal permanece aguardando faturamento quinzenal (quando aplicável)." />
      {canEdit && (
        <div className="border border-dashed border-ink-300 rounded-lg p-3 space-y-2 bg-ink-50/30">
          <div className="text-xs font-semibold text-ink-700 uppercase tracking-wider">Adicionar boleto</div>
          <div className="grid sm:grid-cols-4 gap-2">
            <Select value={novo.veiculo_tipo} onChange={(e) => setNovo({ ...novo, veiculo_tipo: e.target.value })}>
              <option value="dou">DOU</option>
              <option value="doe">DOE</option>
              <option value="jornal">Jornal</option>
            </Select>
            <Input type="number" step="0.01" placeholder="Valor R$" value={novo.valor || ''} onChange={(e) => setNovo({ ...novo, valor: Number(e.target.value) })} />
            <Input type="date" value={novo.data_vencimento} onChange={(e) => setNovo({ ...novo, data_vencimento: e.target.value })} />
            <Button onClick={onAdd} loading={saving}><Plus className="w-4 h-4" />Adicionar</Button>
          </div>
          <Input placeholder="Observações (opcional)" value={novo.observacoes} onChange={(e) => setNovo({ ...novo, observacoes: e.target.value })} />
        </div>
      )}
      <div className="space-y-1.5">
        {boletos.length === 0 ? (
          <div className="text-sm text-ink-500 py-4 text-center">Nenhum boleto cadastrado.</div>
        ) : boletos.map((b) => (
          <div key={b.id} className="flex items-center gap-3 border border-ink-200 rounded-lg p-2.5">
            <Badge variant={b.veiculo_tipo === 'dou' ? 'info' : b.veiculo_tipo === 'doe' ? 'warning' : 'default'}>{b.veiculo_tipo.toUpperCase()}</Badge>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-ink-900">{format.brl(b.valor)}</div>
              <div className="text-xs text-ink-500">
                Vencimento: {format.data(b.data_vencimento) || '—'} • {b.observacoes || ''}
              </div>
            </div>
            {b.data_pagamento ? (
              <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />Pago em {format.data(b.data_pagamento)}
              </span>
            ) : canEdit ? (
              <Button size="sm" variant="outline" onClick={() => onPay(b)}>Marcar pago</Button>
            ) : (
              <span className="text-xs text-amber-700">Pendente</span>
            )}
            {canEdit && (
              <button onClick={() => onDelete(b)} className="p-1 text-ink-400 hover:text-red-600 rounded">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-xs border-t border-ink-100 pt-3">
        <div className="text-ink-500">Total: <span className="font-semibold text-ink-900">{format.brl(total)}</span></div>
        <div className="text-ink-500">Pago: <span className="font-semibold text-emerald-700">{format.brl(pago)}</span></div>
        <div className="text-ink-500">Restante: <span className="font-semibold text-amber-700">{format.brl(total - pago)}</span></div>
      </div>
    </div>
  );
}

function AbaAguardandoPublicacao({ pedido, onSaved }: { pedido: any; onSaved?: () => void }) {
  const [previsao, setPrevisao] = useState(pedido.previsao_publicacao || '');
  const [saving, setSaving] = useState(false);
  const onSave = async () => {
    setSaving(true);
    try { await api.patch(`/api/pedidos/${pedido.id}/etapa/aguardando_publicacao`, { previsao_publicacao: previsao }); onSaved?.(); }
    finally { setSaving(false); }
  };
  return (
    <div className="space-y-4">
      <AbaHeader icon={<Clock className="w-4 h-4" />} title="Aguardando publicação" desc="Acompanhe a previsão de publicação em cada veículo." />
      <Input label="Previsão de publicação" type="date" value={previsao} onChange={(e) => setPrevisao(e.target.value)} />
      <SaveButton onClick={onSave} saving={saving} />
    </div>
  );
}

function AbaPublicacaoRecebida({ pedido, onSaved }: { pedido: any; onSaved?: () => void }) {
  const [form, setForm] = useState({
    data_publicacao_recebida: pedido.data_publicacao_recebida || '',
    data_download_pdf: pedido.data_download_pdf || '',
    pdf_publicacao_path: pedido.pdf_publicacao_path || '',
  });
  const [saving, setSaving] = useState(false);
  const onSave = async () => {
    setSaving(true);
    try { await api.patch(`/api/pedidos/${pedido.id}/etapa/publicacao_recebida`, form); onSaved?.(); }
    finally { setSaving(false); }
  };
  return (
    <div className="space-y-4">
      <AbaHeader icon={<FileText className="w-4 h-4" />} title="Publicação recebida" desc="PDFs publicados foram baixados e organizados na pasta do cliente." />
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Data em que a publicação foi recebida" type="date" value={form.data_publicacao_recebida} onChange={(e) => setForm({ ...form, data_publicacao_recebida: e.target.value })} />
        <Input label="Data do download do PDF" type="date" value={form.data_download_pdf} onChange={(e) => setForm({ ...form, data_download_pdf: e.target.value })} />
      </div>
      <Input label="Caminho do PDF da publicação" value={form.pdf_publicacao_path} onChange={(e) => setForm({ ...form, pdf_publicacao_path: e.target.value })} placeholder="C:\clientes\prefeitura-2026\publicacoes\edital-001.pdf" />
      <p className="text-xs text-ink-500">📎 Upload do PDF será habilitado em sprint futura (hoje você cola o caminho do arquivo).</p>
      <SaveButton onClick={onSave} saving={saving} />
    </div>
  );
}

function AbaClienteAtendido({ pedido, onSaved }: { pedido: any; onSaved?: () => void }) {
  const [form, setForm] = useState({
    data_envio_pdf_cliente: pedido.data_envio_pdf_cliente || '',
    confirmacao_cliente_em: pedido.confirmacao_cliente_em || '',
  });
  const [saving, setSaving] = useState(false);
  const onSave = async () => {
    setSaving(true);
    try { await api.patch(`/api/pedidos/${pedido.id}/etapa/cliente_atendido`, form); onSaved?.(); }
    finally { setSaving(false); }
  };
  return (
    <div className="space-y-4">
      <AbaHeader icon={<CheckCircle2 className="w-4 h-4" />} title="Cliente atendido" desc="PDFs enviados ao cliente + confirmação da conclusão do serviço." />
      <div className="grid sm:grid-cols-2 gap-4">
        <Input label="Data de envio dos PDFs ao cliente" type="date" value={form.data_envio_pdf_cliente} onChange={(e) => setForm({ ...form, data_envio_pdf_cliente: e.target.value })} />
        <Input label="Data da confirmação do cliente" type="date" value={form.confirmacao_cliente_em} onChange={(e) => setForm({ ...form, confirmacao_cliente_em: e.target.value })} />
      </div>
      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-900 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4" />
        <span>Após a confirmação, o pedido pode avançar para aprovação de faturamento.</span>
      </div>
      <SaveButton onClick={onSave} saving={saving} />
    </div>
  );
}

function AbaAprovacaoFaturamento({ pedido, papel, userId, onSaved }: { pedido: any; papel: string; userId: number; onSaved?: () => void }) {
  const [cm, setCm] = useState(pedido.cm_faturado || 0);
  const [saving, setSaving] = useState(false);
  const canApprove = papel === 'admin';
  const jaAprovou = !!pedido.data_aprovacao_faturamento;

  const onSave = async () => {
    setSaving(true);
    try { await api.patch(`/api/pedidos/${pedido.id}/etapa/aprovacao_faturamento`, { cm_faturado: cm }); onSaved?.(); }
    finally { setSaving(false); }
  };
  const onApprove = async () => {
    if (!confirm('Aprovar este faturamento? Após aprovar, a próxima etapa é emitir a NF.')) return;
    setSaving(true);
    try {
      await api.patch(`/api/pedidos/${pedido.id}/etapa/aprovacao_faturamento`, { cm_faturado: cm, aprovar: true });
      onSaved?.();
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <AbaHeader icon={<FileText className="w-4 h-4" />} title="Aprovação de faturamento" desc="Defina os centímetros faturáveis e aprove para liberar a NF." />
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="rounded-lg bg-ink-50 p-3 text-xs">
          <div className="text-ink-500 uppercase tracking-wider">Saldo contratual</div>
          <div className="text-lg font-bold text-ink-900 mt-1">ver contrato</div>
        </div>
        <div className="rounded-lg bg-ink-50 p-3 text-xs">
          <div className="text-ink-500 uppercase tracking-wider">Vigência</div>
          <div className="text-lg font-bold text-ink-900 mt-1">ver contrato</div>
        </div>
        <div className="rounded-lg bg-ink-50 p-3 text-xs">
          <div className="text-ink-500 uppercase tracking-wider">Rentabilidade</div>
          <div className="text-lg font-bold text-ink-900 mt-1">ver contrato</div>
        </div>
      </div>
      <Input label="Centímetros faturáveis" type="number" step="0.01" value={cm || ''} onChange={(e) => setCm(Number(e.target.value))} />
      {jaAprovou && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Faturamento aprovado. Próxima etapa: emitir NF.
        </div>
      )}
      <div className="pt-3 flex items-center justify-end gap-2">
        <Button onClick={onSave} loading={saving} variant="outline">
          <Save className="w-4 h-4" />Salvar cm
        </Button>
        {canApprove && !jaAprovou && (
          <Button onClick={onApprove} loading={saving}>
            <CheckCircle2 className="w-4 h-4" />Aprovar faturamento
          </Button>
        )}
      </div>
    </div>
  );
}

function AbaAguardandoNF({ nfs }: { nfs: any[] }) {
  const jaTem = nfs.length > 0;
  return (
    <div className="space-y-4">
      <AbaHeader icon={<Receipt className="w-4 h-4" />} title="Aguardando emissão da NF" desc="A NF é emitida pelo Conta Azul. Importe aqui assim que chegar." />
      {jaTem ? (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-800">
          Este pedido já tem {nfs.length} NF(s) vinculada(s). Você pode pular pra próxima etapa.
        </div>
      ) : (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
          <p className="font-semibold mb-1">Como importar:</p>
          <ol className="text-xs space-y-1 list-decimal pl-4">
            <li>Emita a NF no Conta Azul normalmente.</li>
            <li>Vá em <a href="/app/notas-fiscais" className="underline font-semibold">Notas Fiscais</a> e importe a NF, vinculando a este pedido.</li>
            <li>Volte aqui e avance pra próxima etapa.</li>
          </ol>
        </div>
      )}
    </div>
  );
}

function AbaNFEmitida({ nfs }: { nfs: any[] }) {
  return (
    <div className="space-y-4">
      <AbaHeader icon={<Receipt className="w-4 h-4" />} title="NF emitida" desc="Notas fiscais vinculadas. Baixa do saldo contratual é automática na importação." />
      {nfs.length === 0 ? (
        <div className="text-sm text-ink-500 py-4 text-center">Nenhuma NF vinculada a este pedido.</div>
      ) : (
        <div className="space-y-1.5">
          {nfs.map((n) => (
            <div key={n.id} className="flex items-center gap-3 border border-ink-200 rounded-lg p-2.5">
              <Badge variant={n.status === 'paga' ? 'success' : n.status === 'cancelada' ? 'danger' : 'warning'}>{n.status}</Badge>
              <div className="flex-1 text-sm">
                <div className="font-semibold text-ink-900">NF {n.numero} • {format.brl(n.valor)}</div>
                <div className="text-xs text-ink-500">Emitida em {format.data(n.data_emissao)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AbaAguardandoPgto({ nfs }: { nfs: any[] }) {
  const abertas = nfs.filter((n) => n.status !== 'paga' && n.status !== 'cancelada');
  return (
    <div className="space-y-4">
      <AbaHeader icon={<Clock className="w-4 h-4" />} title="Aguardando pagamento" desc="Controle das NFs em aberto." />
      {abertas.length === 0 ? (
        <div className="text-sm text-emerald-700 py-4 text-center">Todas as NFs deste pedido já foram pagas ou canceladas.</div>
      ) : (
        <div className="space-y-1.5">
          {abertas.map((n) => (
            <div key={n.id} className="flex items-center gap-3 border border-ink-200 rounded-lg p-2.5">
              <Badge variant="warning">em aberto</Badge>
              <div className="flex-1 text-sm">
                <div className="font-semibold text-ink-900">NF {n.numero} • {format.brl(n.valor)}</div>
                <div className="text-xs text-ink-500">Emitida em {format.data(n.data_emissao)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AbaRecebido({ nfs }: { nfs: any[] }) {
  const pagas = nfs.filter((n) => n.status === 'paga');
  return (
    <div className="space-y-4">
      <AbaHeader icon={<CheckCircle2 className="w-4 h-4" />} title="Recebimento concluído" desc="Pagamento recebido. Processo finalizado." />
      {pagas.length === 0 ? (
        <div className="text-sm text-ink-500 py-4 text-center">Nenhuma NF paga vinculada a este pedido.</div>
      ) : (
        <div className="space-y-1.5">
          {pagas.map((n) => (
            <div key={n.id} className="flex items-center gap-3 border border-emerald-200 bg-emerald-50/30 rounded-lg p-2.5">
              <Badge variant="success">paga</Badge>
              <div className="flex-1 text-sm">
                <div className="font-semibold text-ink-900">NF {n.numero} • {format.brl(n.valor)}</div>
                <div className="text-xs text-emerald-700">Paga em {format.data(n.data_pagamento)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
