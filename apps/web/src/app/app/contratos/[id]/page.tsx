'use client';

import { useEffect, useState, use as usePromise } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, AlertTriangle, Package2, MapPin, Receipt } from 'lucide-react';
import { api } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { format, diasAte } from '@/lib/format';
import { cn } from '@/lib/utils';

type ContratoDetalhe = {
  id: number;
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
  status: string;
  dias_para_vencer: number | null;
  itens: Array<{
    id: number;
    descricao: string;
    veiculo_nome: string;
    veiculo_tipo: string;
    cm_contratado: number;
    cm_utilizado: number;
    valor_unitario_venda: number;
    valor_unitario_custo: number;
  }>;
  pedidos: Array<{ id: number; data_solicitacao: string; categoria: string; status: string; descricao: string }>;
};

type Movimentacao = {
  data: string;
  tipo: string;
  veiculo_tipo: string;
  veiculo_nome: string;
  numero_nf: string;
  nf_id: number;
  pedido_id: number;
  cm: number;
  cm_abs: number;
  saldo_apos: number;
  usuario_nome: string;
  observacoes?: string;
};

const STATUS_LABEL: Record<string, { label: string; emoji: string }> = {
  solicitada: { label: 'Solicitada', emoji: '📥' },
  em_preparacao: { label: 'Em preparação', emoji: '📋' },
  aguardando_envio: { label: 'Aguardando envio', emoji: '⏳' },
  enviada: { label: 'Enviada', emoji: '📤' },
  cust_pgtos: { label: 'Custos operacionais', emoji: '💳' },
  aguardando_publicacao: { label: 'Aguardando publicação', emoji: '📰' },
  publicacao_recebida: { label: 'Publicação recebida', emoji: '📄' },
  cliente_atendido: { label: 'Cliente atendido', emoji: '📲' },
  aprovacao_faturamento: { label: 'Aprovação faturamento', emoji: '👩‍💼' },
  aguardando_nf: { label: 'Aguardando NF', emoji: '🧾' },
  nf_emitida: { label: 'NF emitida', emoji: '💰' },
  aguardando_pagamento: { label: 'Aguardando pgto', emoji: '💵' },
  recebido: { label: 'Recebido', emoji: '✅' },
};

export default function ContratoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [data, setData] = useState<ContratoDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [movs, setMovs] = useState<Movimentacao[] | null>(null);

  useEffect(() => {
    api.get<{ data: ContratoDetalhe }>(`/api/contratos/${id}`)
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
    api.get<{ data: Movimentacao[] }>(`/api/contratos/${id}/movimentacoes`)
      .then((r) => setMovs(r.data))
      .catch(() => setMovs([]));
  }, [id]);

  if (loading) return <div className="text-sm text-ink-500">Carregando...</div>;
  if (!data) return <div className="text-sm text-ink-500">Contrato não encontrado.</div>;

  const dias = data.dias_para_vencer;
  const vencido = dias !== null && dias < 0;
  const pertoVencer = dias !== null && dias >= 0 && dias <= 60;

  const totalContratadoCm = data.itens.reduce((acc, i) => acc + i.cm_contratado, 0);
  const totalUtilizadoCm = data.itens.reduce((acc, i) => acc + i.cm_utilizado, 0);
  const totalValorVenda = data.itens.reduce((acc, i) => acc + i.cm_contratado * i.valor_unitario_venda, 0);
  const totalValorUtilizado = data.itens.reduce((acc, i) => acc + i.cm_utilizado * i.valor_unitario_venda, 0);

  return (
    <div>
      <Link href="/app/contratos" className="inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-800 mb-4">
        <ArrowLeft className="w-4 h-4" />
        Voltar para contratos
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-ink-500 mb-1">
            <MapPin className="w-3.5 h-3.5" />
            {data.cliente_nome} • {data.cliente_municipio}/{data.cliente_estado}
          </div>
          <h1 className="text-2xl font-bold text-ink-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-700" />
            Contrato {data.numero || `#${data.id}`}
          </h1>
        </div>
        <Badge variant={data.status === 'ativo' ? 'success' : data.status === 'suspenso' ? 'warning' : 'default'} className="text-sm">
          {data.status}
        </Badge>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <p className="text-xs text-ink-500 uppercase tracking-wider font-medium">Vigência</p>
          <p className="mt-2 text-base font-semibold text-ink-900">{format.data(data.data_inicio)} → {format.data(data.data_fim)}</p>
          {(vencido || pertoVencer) && (
            <p className={cn('mt-2 text-xs flex items-center gap-1', vencido ? 'text-red-600' : 'text-amber-600')}>
              <AlertTriangle className="w-3 h-3" />
              {vencido ? `Vencido há ${Math.abs(dias!)}d` : `Vence em ${dias}d`}
            </p>
          )}
        </Card>
        <Card className="p-5">
          <p className="text-xs text-ink-500 uppercase tracking-wider font-medium">Modalidade</p>
          <p className="mt-2 text-base font-semibold text-ink-900 capitalize">{data.modalidade || '—'}</p>
          {data.processo && <p className="text-xs text-ink-500 mt-1">Processo: {data.processo}</p>}
        </Card>
        <Card className="p-5">
          <p className="text-xs text-ink-500 uppercase tracking-wider font-medium">Valor contratado</p>
          <p className="mt-2 text-2xl font-bold text-brand-800">{format.brl(totalValorVenda)}</p>
          <p className="text-xs text-ink-500 mt-1">{format.cm(totalContratadoCm)} contratados</p>
        </Card>
      </div>

      {data.objeto && (
        <Card className="p-5 mb-6">
          <p className="text-xs text-ink-500 uppercase tracking-wider font-medium mb-1">Objeto</p>
          <p className="text-sm text-ink-700">{data.objeto}</p>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Itens do contrato</CardTitle>
          <CardDescription>Saldo de centímetros por veículo</CardDescription>
        </CardHeader>
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ink-50/70 border-b border-ink-100">
              <tr>
                <th className="text-left font-semibold text-ink-600 px-4 py-3 text-xs uppercase tracking-wider">Veículo</th>
                <th className="text-left font-semibold text-ink-600 px-4 py-3 text-xs uppercase tracking-wider">Descrição</th>
                <th className="text-right font-semibold text-ink-600 px-4 py-3 text-xs uppercase tracking-wider">cm contratado</th>
                <th className="text-right font-semibold text-ink-600 px-4 py-3 text-xs uppercase tracking-wider">cm utilizado</th>
                <th className="text-right font-semibold text-ink-600 px-4 py-3 text-xs uppercase tracking-wider">Saldo</th>
                <th className="text-right font-semibold text-ink-600 px-4 py-3 text-xs uppercase tracking-wider">R$/cm</th>
                <th className="text-right font-semibold text-ink-600 px-4 py-3 text-xs uppercase tracking-wider">Valor contratado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {data.itens.map((it) => {
                const saldoCm = it.cm_contratado - it.cm_utilizado;
                const valorItem = it.cm_contratado * it.valor_unitario_venda;
                const pct = it.cm_contratado > 0 ? (it.cm_utilizado / it.cm_contratado) * 100 : 0;
                return (
                  <tr key={it.id}>
                    <td className="px-4 py-3 font-medium text-ink-800">{it.veiculo_nome}</td>
                    <td className="px-4 py-3 text-ink-600 text-xs">{it.descricao}</td>
                    <td className="px-4 py-3 text-right text-ink-700">{format.cm(it.cm_contratado)}</td>
                    <td className="px-4 py-3 text-right text-ink-700">{format.cm(it.cm_utilizado)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn('font-semibold', saldoCm < 0 ? 'text-red-600' : saldoCm < it.cm_contratado * 0.1 ? 'text-amber-600' : 'text-emerald-600')}>
                        {format.cm(saldoCm)}
                      </span>
                      <div className="mt-1 h-1 bg-ink-100 rounded-full overflow-hidden w-20 ml-auto">
                        <div className="h-full bg-gold-gradient" style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-ink-700">{format.brl(it.valor_unitario_venda)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-ink-900">{format.brl(valorItem)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-ink-50/70 border-t-2 border-ink-200">
              <tr>
                <td colSpan={2} className="px-4 py-3 text-sm font-semibold text-ink-800">Total</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-ink-900">{format.cm(totalContratadoCm)}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-ink-900">{format.cm(totalUtilizadoCm)}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-700">{format.cm(totalContratadoCm - totalUtilizadoCm)}</td>
                <td></td>
                <td className="px-4 py-3 text-right text-sm font-bold text-brand-800">{format.brl(totalValorVenda)}</td>
              </tr>
            </tfoot>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package2 className="w-4 h-4 text-brand-700" />
            Pedidos do contrato
          </CardTitle>
          <CardDescription>{data.pedidos.length} pedido(s) registrado(s)</CardDescription>
        </CardHeader>
        <CardBody className="p-0">
          {data.pedidos.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-500">Nenhum pedido vinculado a este contrato ainda.</div>
          ) : (
            <ul className="divide-y divide-ink-100">
              {data.pedidos.map((p) => {
                const s = STATUS_LABEL[p.status];
                return (
                  <li key={p.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="text-xl">{s?.emoji || '•'}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-ink-900 truncate">{p.descricao || p.categoria}</div>
                      <div className="text-xs text-ink-500 mt-0.5">{format.data(p.data_solicitacao)}</div>
                    </div>
                    <span className="text-xs text-ink-600">{s?.label || p.status}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardBody>
      </Card>

      {/* Movimentações do contrato (ledger) */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-brand-700" />
            Movimentações do contrato
          </CardTitle>
          <CardDescription>
            Baixas e estornos de centímetros por NF emitida
            {movs && movs.length > 0 ? ` · ${movs.length} registro(s)` : ''}
          </CardDescription>
        </CardHeader>
        <CardBody className="p-0">
          {movs === null ? (
            <div className="p-8 text-center text-sm text-ink-500">Carregando movimentações...</div>
          ) : movs.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-500">Nenhuma movimentação registrada neste contrato ainda.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ink-50/70 border-b border-ink-100">
                  <tr>
                    <th className="text-left font-semibold text-ink-600 px-4 py-3 text-xs uppercase tracking-wider">Data</th>
                    <th className="text-left font-semibold text-ink-600 px-4 py-3 text-xs uppercase tracking-wider">Tipo</th>
                    <th className="text-left font-semibold text-ink-600 px-4 py-3 text-xs uppercase tracking-wider">Veículo</th>
                    <th className="text-left font-semibold text-ink-600 px-4 py-3 text-xs uppercase tracking-wider">NF</th>
                    <th className="text-right font-semibold text-ink-600 px-4 py-3 text-xs uppercase tracking-wider">Centímetros</th>
                    <th className="text-left font-semibold text-ink-600 px-4 py-3 text-xs uppercase tracking-wider">Usuário</th>
                    <th className="text-left font-semibold text-ink-600 px-4 py-3 text-xs uppercase tracking-wider">Observações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {movs.map((m, i) => {
                    const isEstorno = m.cm > 0;
                    return (
                      <tr key={i} className="hover:bg-ink-50/40">
                        <td className="px-4 py-2.5 text-ink-700 whitespace-nowrap text-xs">{format.data(m.data)}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-pill text-[10px] font-semibold', isEstorno ? 'bg-amber-100 text-amber-700' : 'bg-brand-100 text-brand-700')}>
                            {m.tipo}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-ink-700 text-xs capitalize">{m.veiculo_tipo}</td>
                        <td className="px-4 py-2.5 font-mono text-ink-800 text-xs">NF {m.numero_nf}</td>
                        <td className={cn('px-4 py-2.5 text-right font-mono font-semibold text-xs', isEstorno ? 'text-amber-600' : 'text-brand-600')}>
                          {m.cm > 0 ? '+' : ''}{m.cm} cm
                        </td>
                        <td className="px-4 py-2.5 text-ink-600 text-xs">{m.usuario_nome}</td>
                        <td className="px-4 py-2.5 text-ink-500 italic text-xs">{m.observacoes || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
