'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Edit2, Trash2, Printer, History, FileText, ChevronDown, AlertTriangle, CheckCircle2, Eye, Lock } from 'lucide-react';
import { api } from '@/lib/api';
import { useIsAdmin } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { Modal } from '@/components/ui/Modal';
import { format } from '@/lib/format';
import { cn } from '@/lib/utils';

type FaturamentoDetalhe = {
  id: number;
  cliente_id: number;
  cliente_nome: string;
  cliente_municipio: string;
  cliente_estado: string;
  contrato_id: number | null;
  contrato_numero: string | null;
  periodo_inicio: string;
  periodo_fim: string;
  valor_total: number;
  cm_total: number;
  status: 'em_aprovacao' | 'aprovado' | 'nf_emitida' | 'em_cobranca' | 'recebido' | 'cancelado';
  data_aprovacao: string | null;
  data_emissao_nf: string | null;
  numero_nf: string | null;
  data_pagamento: string | null;
  forma_cobranca: string | null;
  observacoes: string | null;
  qtd_publicacoes: number;
  publicacoes: any[];
  por_veiculo: { veiculo_tipo: string; veiculo_nome: string; total_cm: number; total_valor: number }[];
  info_contrato: any[] | null;
  saldo_anterior_cm: number;
  saldo_apos_cm: number;
};

const STATUS_LABELS: Record<string, { label: string; corBg: string; corText: string; step: number }> = {
  em_aprovacao: { label: 'Em aprovação',  corBg: 'bg-amber-100',   corText: 'text-amber-800',   step: 1 },
  aprovado:     { label: 'Aprovado',       corBg: 'bg-emerald-100', corText: 'text-emerald-800', step: 1 },
  nf_emitida:   { label: 'NF emitida',     corBg: 'bg-sky-100',     corText: 'text-sky-800',     step: 3 },
  em_cobranca:  { label: 'Em cobrança',    corBg: 'bg-indigo-100',  corText: 'text-indigo-800',  step: 4 },
  recebido:     { label: 'Recebido',       corBg: 'bg-emerald-100', corText: 'text-emerald-800', step: 5 },
  cancelado:    { label: 'Cancelado',      corBg: 'bg-red-100',     corText: 'text-red-800',     step: 0 },
};

function mesAno(iso: string): string {
  if (!iso) return iso;
  const [ano, m] = iso.slice(0, 7).split('-');
  const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  return `${nomes[Number(m) - 1]}/${ano}`;
}

export default function FaturamentoDetalhePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const isAdmin = useIsAdmin();
  const id = Number(params.id);
  const [data, setData] = useState<FaturamentoDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [showExcluir, setShowExcluir] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<{ data: FaturamentoDetalhe }>(`/api/faturamentos/${id}`)
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const aprovar = async () => {
    setActing(true);
    try {
      await api.patch(`/api/faturamentos/${id}`, { status: 'aprovado', data_aprovacao: new Date().toISOString().slice(0, 10) });
      await load();
    } catch (e: any) {
      alert(e.message || 'Erro ao aprovar');
    } finally {
      setActing(false);
    }
  };

  const excluir = async () => {
    setActing(true);
    try {
      await api.delete(`/api/faturamentos/${id}`);
      router.push('/app/notas-fiscais');
    } catch (e: any) {
      alert(e.message || 'Erro ao excluir');
      setActing(false);
    }
  };

  const imprimir = () => {
    window.print();
  };

  if (loading) {
    return <div className="text-sm text-ink-500 py-8 text-center">Carregando faturamento...</div>;
  }
  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-ink-500">Faturamento nao encontrado.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/app/notas-fiscais')}>
          <ArrowLeft className="w-4 h-4" />Voltar pra Faturamento
        </Button>
      </div>
    );
  }

  const st = STATUS_LABELS[data.status] || STATUS_LABELS.em_aprovacao;
  const isCancelado = data.status === 'cancelado';

  return (
    <div>
      <div className="mb-4">
        <Link href="/app/notas-fiscais" className="inline-flex items-center gap-1.5 text-sm text-ink-600 hover:text-ink-900">
          <ArrowLeft className="w-4 h-4" />Voltar pra Faturamento
        </Link>
      </div>

      <PageHeader
        title={`${data.cliente_nome} – ${mesAno(data.periodo_inicio)}`}
        description={`Contrato: ${data.contrato_numero || '—'} • Período: ${format.data(data.periodo_inicio)} a ${format.data(data.periodo_fim)} • ${data.qtd_publicacoes} publicações`}
        actions={
          <div className="flex items-center gap-2">
            <span className={cn('inline-flex items-center px-3 py-1.5 rounded-pill text-xs font-bold uppercase tracking-wider', st.corBg, st.corText)}>
              {st.label}
            </span>
            {isAdmin && (
              <Button variant="outline" rounded="md" onClick={imprimir}>
                <Printer className="w-4 h-4" />Imprimir
              </Button>
            )}
          </div>
        }
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <StatCard
          label="Valor Total"
          value={format.brl(data.valor_total)}
          hint={`${data.cm_total} cm`}
          accent="brand"
          icon={<FileText className="w-5 h-5" />}
        />
        <StatCard
          label="Publicações"
          value={data.qtd_publicacoes}
          hint="inclusas no faturamento"
          accent="green"
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <StatCard
          label="Saldo Contratual"
          value={`${data.saldo_apos_cm.toFixed(0)} cm`}
          hint={`antes: ${data.saldo_anterior_cm.toFixed(0)} cm`}
          accent="amber"
          icon={<FileText className="w-5 h-5" />}
        />
        <StatCard
          label="Status"
          value={st.label}
          hint={data.data_pagamento ? `Pago em ${format.data(data.data_pagamento)}` : 'em andamento'}
          accent={data.status === 'recebido' ? 'green' : data.status === 'em_cobranca' ? 'red' : 'navy'}
          icon={data.status === 'recebido' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
        />
      </div>

      <div className="mb-5">
        <FaturamentoStepper status={data.status} dataAprovacao={data.data_aprovacao} dataEmissao={data.data_emissao_nf} dataPagamento={data.data_pagamento} numeroNf={data.numero_nf} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-5">
        <Card>
          <div className="p-4">
            <h3 className="text-[10px] font-bold text-ink-500 uppercase tracking-wider mb-3">Resumo do Faturamento</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-ink-200 text-[10px] text-ink-500">
                  <th className="text-left py-1.5 font-medium">Veículo</th>
                  <th className="text-right py-1.5 font-medium">CM Total</th>
                  <th className="text-right py-1.5 font-medium">Valor (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {(['dou','doe','jornal'] as const).map((tipo) => {
                  const v = data.por_veiculo.find(x => x.veiculo_tipo === tipo);
                  if (!v) {
                    return (
                      <tr key={tipo}>
                        <td className="py-1.5 text-ink-700 font-medium uppercase">{tipo}</td>
                        <td className="py-1.5 text-right text-ink-300">—</td>
                        <td className="py-1.5 text-right text-ink-300">R$ 0,00</td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={tipo}>
                      <td className="py-1.5 text-ink-700 font-medium uppercase">{tipo}</td>
                      <td className="py-1.5 text-right font-mono text-ink-800">{v.total_cm} cm</td>
                      <td className="py-1.5 text-right font-mono text-ink-800">{format.brl(v.total_valor)}</td>
                    </tr>
                  );
                })}
                <tr className="bg-amber-50 font-bold">
                  <td className="py-1.5 text-ink-800 uppercase">Total</td>
                  <td className="py-1.5 text-right font-mono text-ink-900">{data.cm_total} cm</td>
                  <td className="py-1.5 text-right font-mono text-ink-900">{format.brl(data.valor_total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <h3 className="text-[10px] font-bold text-ink-500 uppercase tracking-wider mb-3">Informações do Contrato</h3>
            <dl className="text-xs divide-y divide-ink-100">
              <InfoRow label="Saldo anterior (cm)" value={`${data.saldo_anterior_cm.toFixed(0)} cm`} />
              <InfoRow label="Total a faturar (cm)" value={`${data.cm_total} cm`} />
              <InfoRow label="Saldo após faturamento" value={`${data.saldo_apos_cm.toFixed(0)} cm`} />
              {data.por_veiculo.map((v) => (
                <InfoRow key={v.veiculo_tipo} label={`Valor do cm (${v.veiculo_tipo.toUpperCase()})`} value={format.brl(v.total_cm > 0 ? v.total_valor / v.total_cm : 0)} />
              ))}
              <InfoRow label="Forma de cobrança" value={data.forma_cobranca || '—'} />
            </dl>
          </div>
        </Card>

        <Card>
          <div className="p-4">
            <h3 className="text-[10px] font-bold text-ink-500 uppercase tracking-wider mb-3">Financeiro</h3>
            <dl className="text-xs divide-y divide-ink-100">
              <InfoRow label="Valor total" value={format.brl(data.valor_total)} />
              <InfoRow label="Valor aprovado" value={data.data_aprovacao ? format.brl(data.valor_total) : '—'} />
              <InfoRow label="NF" value={data.numero_nf || '—'} />
              <InfoRow label="Data emissão" value={format.data(data.data_emissao_nf)} />
              <InfoRow label="Vencimento" value="—" />
              <InfoRow label="Pagamento" value={format.data(data.data_pagamento)} />
            </dl>
          </div>
        </Card>
      </div>

      {isAdmin && (
        <div className="mb-5 flex flex-wrap gap-2">
          <Button variant="primary" size="sm" rounded="md" disabled={data.status !== 'em_aprovacao' || acting} loading={acting} onClick={aprovar}>
            <Check className="w-3.5 h-3.5" />Aprovar faturamento
          </Button>
          <Button variant="outline" size="sm" rounded="md" disabled>
            <Edit2 className="w-3.5 h-3.5" />Editar seleções
            <span className="ml-1 text-[10px] text-ink-400">(em breve)</span>
          </Button>
          <Button variant="outline" size="sm" rounded="md" disabled={acting} onClick={() => setShowExcluir(true)}>
            <Trash2 className="w-3.5 h-3.5" />Excluir faturamento
          </Button>
          <Button variant="outline" size="sm" rounded="md" onClick={imprimir}>
            <Printer className="w-3.5 h-3.5" />Imprimir resumo
          </Button>
          <Button variant="outline" size="sm" rounded="md" disabled>
            <History className="w-3.5 h-3.5" />Histórico / Observações
            <span className="ml-1 text-[10px] text-ink-400">(em breve)</span>
          </Button>
        </div>
      )}

      <Card>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-ink-900">Publicações incluídas neste faturamento</h3>
            <button className="text-[10px] text-brand-600 hover:underline font-medium">Visualizar por veículo</button>
          </div>
          {data.publicacoes.length === 0 ? (
            <div className="py-8 text-center text-xs text-ink-500">Nenhuma publicação vinculada.</div>
          ) : (
            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {data.publicacoes.map((p: any) => (
                <div key={p.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-ink-50 last:border-0">
                  <span className="font-mono text-ink-500 w-20 flex-shrink-0">{format.data(p.data_desejada_publicacao || p.data_solicitacao)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-ink-800 truncate">{p.categoria_publicacao || p.categoria}</div>
                    <div className="text-[10px] text-ink-500 truncate">#{p.id} • {p.responsavel_nome || '—'}</div>
                  </div>
                  <span className="font-mono text-ink-700 flex-shrink-0">{p.total_cm} cm</span>
                </div>
              ))}
              <div className="pt-2 mt-2 border-t border-ink-200 flex items-center justify-between text-xs font-bold">
                <span className="text-ink-700">Total de {data.publicacoes.length} publicações</span>
                <span className="text-ink-900">{data.cm_total} cm</span>
              </div>
            </div>
          )}
        </div>
      </Card>

      {data.observacoes && (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <strong className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1">Observações</strong>
          {data.observacoes}
        </div>
      )}

      <Modal
        open={showExcluir}
        onClose={() => setShowExcluir(false)}
        title="Excluir faturamento"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowExcluir(false)}>Cancelar</Button>
            <Button variant="primary" onClick={excluir} loading={acting} className="bg-red-600 hover:bg-red-700">Excluir</Button>
          </>
        }
      >
        <div className="text-sm text-ink-600 space-y-2">
          <p>Tem certeza que quer excluir o faturamento de <strong>{data.cliente_nome}</strong> ({mesAno(data.periodo_inicio)})?</p>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
            Os pedidos vinculados serão desvinculados (não excluídos). A ação não pode ser desfeita.
          </p>
        </div>
      </Modal>
    </div>
  );
}

function FaturamentoStepper({ status, dataAprovacao, dataEmissao, dataPagamento, numeroNf }: { status: string; dataAprovacao: string | null; dataEmissao: string | null; dataPagamento: string | null; numeroNf: string | null }) {
  const isCancelado = status === 'cancelado';
  const etapas = [
    { num: 1, label: 'Aprovação',      sub: dataAprovacao ? `Aprovado em ${format.data(dataAprovacao)}` : 'Em aprovação', done: !!dataAprovacao, current: !dataAprovacao && !isCancelado },
    { num: 2, label: 'Emissão da NF',  sub: dataEmissao ? 'NF emitida' : 'Aguardando',      done: !!dataEmissao,   current: !!dataAprovacao && !dataEmissao },
    { num: 3, label: 'NF Emitida',     sub: numeroNf || (dataEmissao ? 'Emitida' : 'Pendente'), done: !!dataEmissao, current: !!dataAprovacao && !dataEmissao },
    { num: 4, label: 'Pagamento',     sub: dataPagamento ? 'Pago' : 'Em cobrança',     done: !!dataPagamento, current: !!dataEmissao && !dataPagamento },
    { num: 5, label: 'Recebimento',   sub: dataPagamento ? format.data(dataPagamento) : 'Aguardando', done: !!dataPagamento, current: !!dataEmissao && !dataPagamento },
  ];

  return (
    <div className="flex items-start gap-0 bg-white rounded-lg border border-ink-200 p-4">
      {etapas.map((e, i) => {
        const isLast = i === etapas.length - 1;
        return (
          <div key={e.num} className="flex-1 flex items-start gap-1.5 min-w-0">
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={cn(
                'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors',
                e.done ? 'bg-brand-600 text-white border-brand-600' :
                e.current ? 'bg-white text-brand-700 border-brand-500 ring-2 ring-brand-100' :
                'bg-white text-ink-400 border-ink-200',
              )}>
                {e.done ? <Check className="w-3.5 h-3.5" /> : e.num}
              </div>
              {!isLast && <div className={cn('w-px h-6 mt-1', e.done ? 'bg-brand-600' : 'bg-ink-200')} />}
            </div>
            <div className="min-w-0 pb-2 -mt-0.5">
              <div className={cn('text-[10px] font-bold uppercase tracking-wider', e.done ? 'text-brand-700' : e.current ? 'text-brand-600' : 'text-ink-400')}>{e.label}</div>
              <div className={cn('text-[10px] mt-0.5 truncate', e.done ? 'text-emerald-700' : 'text-ink-500')}>{e.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <dt className="text-ink-600 text-[11px]">{label}</dt>
      <dd className="font-mono font-semibold text-ink-800 text-[11px]">{value}</dd>
    </div>
  );
}
