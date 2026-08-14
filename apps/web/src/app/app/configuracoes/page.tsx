'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '@/components/ui/Card';
import { Settings, Database, Bell as BellIcon, Users as UsersIcon, Save, Building2, CheckCircle2, AlertTriangle, ExternalLink, Truck, Activity, FileCheck2, Calendar, Globe, MapPin, Hash } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';

type Config = {
  // Notificacoes
  notif_nf_atrasada?: boolean;
  notif_contrato_vencendo?: boolean;
  notif_novo_pedido?: boolean;
  notif_nf_paga?: boolean;
  // Sistema
  sistema_backup_auto?: boolean;
  sistema_logs_auditoria?: boolean;
  sistema_modo_manutencao?: boolean;
  // Entidade (Orgao Publico)
  entidade?: {
    razao_social?: string;
    cnpj?: string;
    telefone?: string;
    email?: string;
    logradouro?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    brasao_url?: string;
    fuso_horario?: 'America/Sao_Paulo' | 'UTC';
    expediente_inicio?: string;
    expediente_fim?: string;
    expediente_dias?: ('seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom')[];
  };
  // Veiculos (cm/col) - valores padrao por tipo
  veiculos_valor_cm?: { dou?: number; doe?: number; jornal?: number };
  // Kanban - SLA em horas por etapa
  kanban_sla_horas?: Record<string, number>;
  // Liquidacao - docs obrigatorios
  liquidacao_exigir_pdf_pagina?: boolean;
  liquidacao_exigir_nf_vinculada?: boolean;
  liquidacao_exigir_boleto?: boolean;
  liquidacao_observacao_padrao?: string;
};

const DEFAULTS: Config = {
  notif_nf_atrasada: true,
  notif_contrato_vencendo: true,
  notif_novo_pedido: false,
  notif_nf_paga: false,
  sistema_backup_auto: true,
  sistema_logs_auditoria: true,
  sistema_modo_manutencao: false,
  entidade: { razao_social: '', cnpj: '', telefone: '', email: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '', brasao_url: '', fuso_horario: 'America/Sao_Paulo', expediente_inicio: '08:00', expediente_fim: '18:00', expediente_dias: ['seg', 'ter', 'qua', 'qui', 'sex'] },
  veiculos_valor_cm: { dou: 0, doe: 0, jornal: 0 },
  kanban_sla_horas: {},
  liquidacao_exigir_pdf_pagina: true,
  liquidacao_exigir_nf_vinculada: true,
  liquidacao_exigir_boleto: false,
  liquidacao_observacao_padrao: '',
};

const DIAS_SEMANA: { id: 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom'; label: string }[] = [
  { id: 'seg', label: 'Seg' },
  { id: 'ter', label: 'Ter' },
  { id: 'qua', label: 'Qua' },
  { id: 'qui', label: 'Qui' },
  { id: 'sex', label: 'Sex' },
  { id: 'sab', label: 'Sáb' },
  { id: 'dom', label: 'Dom' },
];

// 13 etapas do Kanban (mesmo do backend STATUS_PEDIDO)
const ETAPAS_KANBAN = [
  { id: 'solicitada', label: 'Solicitada' },
  { id: 'em_preparacao', label: 'Em preparação' },
  { id: 'aguardando_envio', label: 'Aguardando envio' },
  { id: 'enviada', label: 'Enviada' },
  { id: 'cust_pgtos', label: 'Custódia/Pgtos' },
  { id: 'aguardando_publicacao', label: 'Aguardando publicação' },
  { id: 'publicacao_recebida', label: 'Publicação recebida' },
  { id: 'cliente_atendido', label: 'Cliente atendido' },
  { id: 'aprovacao_faturamento', label: 'Aprovação faturamento' },
  { id: 'aguardando_nf', label: 'Aguardando NF' },
  { id: 'nf_emitida', label: 'NF emitida' },
  { id: 'aguardando_pagamento', label: 'Aguardando pagamento' },
  { id: 'recebido', label: 'Recebido' },
];

const VEICULOS: { id: 'dou' | 'doe' | 'jornal'; label: string; cor: string }[] = [
  { id: 'dou', label: 'DOU — Diário Oficial da União', cor: 'text-navy-700' },
  { id: 'doe', label: 'DOE — Diário Oficial do Estado', cor: 'text-emerald-700' },
  { id: 'jornal', label: 'Jornal de Grande Circulação', cor: 'text-amber-700' },
];

export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const isAdmin = user?.papel === 'admin';

  const [cfg, setCfg] = useState<Config>(DEFAULTS);
  const [original, setOriginal] = useState<Config>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ data: Config }>('/api/configuracoes')
      .then((r) => {
        // merge profundo pra defaults nao perderem campos
        const merged: Config = {
          ...DEFAULTS,
          ...r.data,
          entidade: { ...DEFAULTS.entidade, ...(r.data.entidade || {}) },
          veiculos_valor_cm: { ...DEFAULTS.veiculos_valor_cm, ...(r.data.veiculos_valor_cm || {}) },
          kanban_sla_horas: { ...DEFAULTS.kanban_sla_horas, ...(r.data.kanban_sla_horas || {}) },
        };
        setCfg(merged);
        setOriginal(merged);
      })
      .catch(() => setErro('Falha ao carregar configurações.'))
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof Config>(k: K, v: Config[K]) => setCfg((c) => ({ ...c, [k]: v }));
  const setEntidade = (k: keyof NonNullable<Config['entidade']>, v: any) => setCfg((c) => ({ ...c, entidade: { ...c.entidade, [k]: v } }));
  const setVeiculoCm = (tipo: 'dou' | 'doe' | 'jornal', v: number) => setCfg((c) => ({ ...c, veiculos_valor_cm: { ...c.veiculos_valor_cm, [tipo]: v } }));
  const setSla = (etapa: string, horas: number) => setCfg((c) => ({ ...c, kanban_sla_horas: { ...c.kanban_sla_horas, [etapa]: horas } }));

  const toggleDia = (dia: 'seg' | 'ter' | 'qua' | 'qui' | 'sex' | 'sab' | 'dom') => {
    const dias = cfg.entidade?.expediente_dias || [];
    const novo = dias.includes(dia) ? dias.filter((d) => d !== dia) : [...dias, dia];
    setEntidade('expediente_dias', novo);
  };

  const mudou = JSON.stringify(cfg) !== JSON.stringify(original);

  const salvar = async () => {
    setSaving(true);
    setErro(null);
    try {
      await api.patch('/api/configuracoes', cfg);
      setOriginal(cfg);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setErro(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const resetar = () => setCfg(original);

  return (
    <div>
      <PageHeader
        title="Configurações"
        description={isAdmin ? 'Ajustes gerais do sistema — entidade, contratos, kanban, liquidação, notificações.' : 'Somente leitura — apenas administradores alteram as configurações.'}
      />

      {erro && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</div>}

      <div className="space-y-6">
        {/* ==== 1. Entidade (Orgao Publico) ==== */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand-700" />
                Entidade (Órgão Público)
              </CardTitle>
              <CardDescription>Dados oficiais usados em cabeçalhos de PDFs, faturas, e-mails e relatórios.</CardDescription>
            </CardHeader>
            <CardBody className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <Input label="Razão social" value={cfg.entidade?.razao_social || ''} onChange={(e) => setEntidade('razao_social', e.target.value)} placeholder="Prefeitura Municipal de..." />
                </div>
                <Input label="CNPJ" value={cfg.entidade?.cnpj || ''} onChange={(e) => setEntidade('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input label="Telefone" value={cfg.entidade?.telefone || ''} onChange={(e) => setEntidade('telefone', e.target.value)} placeholder="(11) 1234-5678" />
                <Input label="E-mail institucional" type="email" value={cfg.entidade?.email || ''} onChange={(e) => setEntidade('email', e.target.value)} placeholder="contato@orgao.gov.br" />
              </div>
              <div className="grid grid-cols-6 gap-3">
                <div className="col-span-6 sm:col-span-3">
                  <Input label="Logradouro" value={cfg.entidade?.logradouro || ''} onChange={(e) => setEntidade('logradouro', e.target.value)} placeholder="Rua das Flores" />
                </div>
                <Input label="Número" value={cfg.entidade?.numero || ''} onChange={(e) => setEntidade('numero', e.target.value)} placeholder="123" />
                <Input label="Bairro" value={cfg.entidade?.bairro || ''} onChange={(e) => setEntidade('bairro', e.target.value)} placeholder="Centro" />
                <Input label="Cidade" value={cfg.entidade?.cidade || ''} onChange={(e) => setEntidade('cidade', e.target.value)} placeholder="São Paulo" />
                <Input label="UF" value={cfg.entidade?.uf || ''} onChange={(e) => setEntidade('uf', e.target.value.toUpperCase().slice(0, 2))} placeholder="SP" maxLength={2} />
              </div>
              <Input label="Brasão oficial (URL)" value={cfg.entidade?.brasao_url || ''} onChange={(e) => setEntidade('brasao_url', e.target.value)} placeholder="https://.../brasao.png" />

              <div className="pt-3 border-t border-ink-100 space-y-3">
                <p className="text-xs font-semibold text-ink-700 uppercase tracking-wider flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" />Fuso e expediente</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ink-600 mb-1">Fuso horário</label>
                    <select value={cfg.entidade?.fuso_horario || 'America/Sao_Paulo'} onChange={(e) => setEntidade('fuso_horario', e.target.value)} className="w-full px-3 py-2 border border-ink-200 rounded-lg text-sm bg-white">
                      <option value="America/Sao_Paulo">Brasília (BRT, UTC-3)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>
                  <Input label="Início do expediente" type="time" value={cfg.entidade?.expediente_inicio || '08:00'} onChange={(e) => setEntidade('expediente_inicio', e.target.value)} />
                  <Input label="Fim do expediente" type="time" value={cfg.entidade?.expediente_fim || '18:00'} onChange={(e) => setEntidade('expediente_fim', e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-600 mb-1.5">Dias de expediente</label>
                  <div className="flex flex-wrap gap-1.5">
                    {DIAS_SEMANA.map((d) => {
                      const ativo = cfg.entidade?.expediente_dias?.includes(d.id);
                      return (
                        <button key={d.id} type="button" onClick={() => toggleDia(d.id)} className={`px-3 py-1 rounded-pill text-xs font-semibold transition-colors ${ativo ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500 hover:bg-ink-200'}`}>
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* ==== 2. Veiculos (cm/col) ==== */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-brand-700" />
                Veículos — Valor padrão por cm/col
              </CardTitle>
              <CardDescription>Valor de referência por centímetro ou coluna de cada veículo. Usado para cálculo automático de saldo quando não houver valor específico no contrato.</CardDescription>
            </CardHeader>
            <CardBody className="space-y-3">
              {VEICULOS.map((v) => (
                <div key={v.id} className="flex items-center gap-3">
                  <div className={`w-32 flex-shrink-0 text-sm font-semibold ${v.cor}`}>{v.label.split(' — ')[0]}</div>
                  <div className="flex-1 max-w-xs">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cfg.veiculos_valor_cm?.[v.id] ?? 0}
                      onChange={(e) => setVeiculoCm(v.id, Number(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                  <span className="text-xs text-ink-500">R$ / cm</span>
                </div>
              ))}
            </CardBody>
          </Card>
        )}

        {/* ==== 3. Kanban (SLAs) ==== */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-700" />
                Kanban — Prazos (SLA) por etapa
              </CardTitle>
              <CardDescription>Tempo limite (em horas) que um pedido pode ficar em cada etapa antes de gerar alerta de atraso. 0 = sem alerta.</CardDescription>
            </CardHeader>
            <CardBody>
              <div className="grid sm:grid-cols-2 gap-3">
                {ETAPAS_KANBAN.map((e) => (
                  <div key={e.id} className="flex items-center gap-3">
                    <div className="flex-1 text-sm text-ink-800">{e.label}</div>
                    <div className="w-24">
                      <Input
                        type="number"
                        min="0"
                        value={cfg.kanban_sla_horas?.[e.id] ?? 0}
                        onChange={(ev) => setSla(e.id, Number(ev.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    <span className="text-xs text-ink-500 w-8">h</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* ==== 4. Liquidacao (docs obrigatorios) ==== */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-brand-700" />
                Liquidação — Documentos obrigatórios
              </CardTitle>
              <CardDescription>Regras para confirmar o recebimento de uma publicação. Bloqueia o avanço de etapa se a regra não for atendida.</CardDescription>
            </CardHeader>
            <CardBody className="space-y-3">
              <ToggleRow label="Exigir PDF da página inteira" descricao="Anexar PDF do recorte do jornal/DOE/DOU para comprovar publicação" checked={!!cfg.liquidacao_exigir_pdf_pagina} onChange={(v) => set('liquidacao_exigir_pdf_pagina', v)} />
              <ToggleRow label="Exigir NF vinculada" descricao="Pedido só pode ser faturado quando houver NF emitida" checked={!!cfg.liquidacao_exigir_nf_vinculada} onChange={(v) => set('liquidacao_exigir_nf_vinculada', v)} />
              <ToggleRow label="Exigir boleto" descricao="Bloquear liquidação sem boleto anexado" checked={!!cfg.liquidacao_exigir_boleto} onChange={(v) => set('liquidacao_exigir_boleto', v)} />
              <div className="pt-2">
                <label className="block text-xs font-medium text-ink-600 mb-1">Observação padrão para NFs (opcional)</label>
                <textarea value={cfg.liquidacao_observacao_padrao || ''} onChange={(e) => set('liquidacao_observacao_padrao', e.target.value)} placeholder="Referente à prestação de serviços de publicação oficial..." rows={2} className="w-full px-3 py-2 border border-ink-200 rounded-lg text-sm bg-white resize-y" />
              </div>
            </CardBody>
          </Card>
        )}

        {/* ==== 5. Notificacoes ==== */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellIcon className="w-4 h-4 text-brand-700" />
              Notificações
            </CardTitle>
            <CardDescription>Eventos que geram aviso no sino de notificações.</CardDescription>
          </CardHeader>
          <CardBody className="space-y-3">
            <ToggleRow label="NFs atrasadas (+60 dias)" descricao="Avisar quando uma NF passar de 60 dias em aberto" checked={!!cfg.notif_nf_atrasada} onChange={(v) => set('notif_nf_atrasada', v)} />
            <ToggleRow label="Contratos vencendo em 30 dias" descricao="Para planejar a renovação" checked={!!cfg.notif_contrato_vencendo} onChange={(v) => set('notif_contrato_vencendo', v)} />
            <ToggleRow label="Novo pedido recebido" descricao="Quando o atendimento cria um pedido" checked={!!cfg.notif_novo_pedido} onChange={(v) => set('notif_novo_pedido', v)} />
            <ToggleRow label="NF marcada como paga" descricao="Quando o financeiro registra o pagamento" checked={!!cfg.notif_nf_paga} onChange={(v) => set('notif_nf_paga', v)} />
          </CardBody>
        </Card>

        {/* ==== 6. Sistema ==== */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-4 h-4 text-brand-700" />
                Sistema
              </CardTitle>
              <CardDescription>Configurações de infraestrutura (acesso restrito a administradores).</CardDescription>
            </CardHeader>
            <CardBody className="space-y-3">
              <ToggleRow label="Backup automático" descricao="Backup do banco a cada 24h" checked={!!cfg.sistema_backup_auto} onChange={(v) => set('sistema_backup_auto', v)} />
              <ToggleRow label="Logs de auditoria" descricao="Registra todas as ações sensíveis" checked={!!cfg.sistema_logs_auditoria} onChange={(v) => set('sistema_logs_auditoria', v)} />
              <div className="pt-1">
                <ToggleRow label="Modo manutenção" descricao="Bloqueia novos logins (emergência)" checked={!!cfg.sistema_modo_manutencao} onChange={(v) => set('sistema_modo_manutencao', v)} />
                {cfg.sistema_modo_manutencao && (
                  <div className="mt-2 flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Com o modo manutenção ativo, novos logins são bloqueados. Usuários já logados continuam funcionando até expirar a sessão.</span>
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        )}

        {/* ==== 7. Equipe ==== */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="w-4 h-4 text-brand-700" />
                Equipe
              </CardTitle>
              <CardDescription>Gerencie quem tem acesso ao sistema.</CardDescription>
            </CardHeader>
            <CardBody>
              <Link href="/app/usuarios" className="inline-flex items-center justify-between gap-3 w-full sm:w-auto px-4 py-3 bg-ink-50 hover:bg-ink-100 border border-ink-200 rounded-lg transition-colors">
                <div className="flex items-center gap-2.5">
                  <UsersIcon className="w-4 h-4 text-ink-700" />
                  <div>
                    <div className="text-sm font-semibold text-ink-900">Gerenciar usuários</div>
                    <div className="text-xs text-ink-500">Criar, editar, ativar e desativar contas</div>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-ink-500" />
              </Link>
            </CardBody>
          </Card>
        )}

        {/* Botao salvar sticky */}
        {isAdmin && (
          <div className="flex items-center justify-end gap-3 sticky bottom-4">
            {saved && <span className="text-sm text-emerald-700 font-medium flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />Configurações salvas</span>}
            {mudou && !saving && <Button variant="ghost" onClick={resetar}>Descartar</Button>}
            <Button variant="primary" onClick={salvar} loading={saving} disabled={!mudou || loading}>
              <Save className="w-4 h-4" />Salvar configurações
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleRow({ label, descricao, checked, onChange }: { label: string; descricao: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink-900">{label}</div>
        <div className="text-xs text-ink-500 mt-0.5">{descricao}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 cursor-pointer ${checked ? 'bg-brand-600' : 'bg-ink-200'}`}
        aria-pressed={checked}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-soft transition-transform ${checked ? 'translate-x-[20px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}
