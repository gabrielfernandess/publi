'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '@/components/ui/Card';
import { Settings, Database, Bell as BellIcon, Users as UsersIcon, Save, Building2, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';

type Config = {
  notif_nf_atrasada?: boolean;
  notif_contrato_vencendo?: boolean;
  notif_novo_pedido?: boolean;
  notif_nf_paga?: boolean;
  sistema_backup_auto?: boolean;
  sistema_logs_auditoria?: boolean;
  sistema_modo_manutencao?: boolean;
  empresa?: { nome?: string; cnpj?: string };
};

const DEFAULTS: Config = {
  notif_nf_atrasada: true,
  notif_contrato_vencendo: true,
  notif_novo_pedido: false,
  notif_nf_paga: false,
  sistema_backup_auto: true,
  sistema_logs_auditoria: true,
  sistema_modo_manutencao: false,
  empresa: { nome: '', cnpj: '' },
};

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
        const merged = { ...DEFAULTS, ...r.data, empresa: { ...DEFAULTS.empresa, ...(r.data.empresa || {}) } };
        setCfg(merged);
        setOriginal(merged);
      })
      .catch(() => setErro('Falha ao carregar configurações.'))
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof Config>(k: K, v: Config[K]) => setCfg((c) => ({ ...c, [k]: v }));
  const setEmpresa = (k: 'nome' | 'cnpj', v: string) => setCfg((c) => ({ ...c, empresa: { ...c.empresa, [k]: v } }));

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
        description={isAdmin ? 'Ajustes gerais do sistema — notificações, empresa e infraestrutura.' : 'Somente leitura — apenas administradores alteram as configurações.'}
      />

      {erro && <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</div>}

      <div className="space-y-6">
        {/* Notificações - todos os users podem ver/alterar (são preferências pessoais) */}
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

        {/* Empresa (admin only) */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-brand-700" />
                Empresa
              </CardTitle>
              <CardDescription>Identificação usada em cabeçalhos de PDFs, faturas e relatórios.</CardDescription>
            </CardHeader>
            <CardBody>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input label="Razão social" value={cfg.empresa?.nome || ''} onChange={(e) => setEmpresa('nome', e.target.value)} placeholder="Publi Legal LTDA" />
                <Input label="CNPJ" value={cfg.empresa?.cnpj || ''} onChange={(e) => setEmpresa('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
              </div>
            </CardBody>
          </Card>
        )}

        {/* Sistema (admin only) */}
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

        {/* Equipe (admin only) — link pra /app/usuarios */}
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

        {/* Botão salvar sticky */}
        {isAdmin && (
          <div className="flex items-center justify-end gap-3 sticky bottom-4">
            {saved && <span className="text-sm text-emerald-700 font-medium flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" />Configurações salvas</span>}
            {mudou && !saving && (
              <Button variant="ghost" onClick={resetar}>Descartar</Button>
            )}
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
