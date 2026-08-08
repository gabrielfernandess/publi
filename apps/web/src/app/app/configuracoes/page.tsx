'use client';

import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '@/components/ui/Card';
import { Settings, Database, Bell as BellIcon, Users as UsersIcon, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';

export default function ConfiguracoesPage() {
  const { user } = useAuth();
  const [salvando, setSalvando] = useState(false);
  const [ok, setOk] = useState(false);

  const isAdmin = user?.papel === 'admin';

  const salvar = () => {
    setSalvando(true);
    setTimeout(() => { setSalvando(false); setOk(true); setTimeout(() => setOk(false), 2000); }, 600);
  };

  return (
    <div>
      <PageHeader
        title="Configurações"
        description={isAdmin ? "Ajustes gerais do sistema." : "Você só pode ver; só as sócias alteram."}
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellIcon className="w-4 h-4 text-brand-700" />
              Notificações
            </CardTitle>
            <CardDescription>O que você quer receber de aviso.</CardDescription>
          </CardHeader>
          <CardBody className="space-y-3">
            <ToggleRow label="NFs atrasadas (+60 dias)" descricao="Receber aviso por notificação" defaultChecked={true} />
            <ToggleRow label="Contratos vencendo em 30 dias" descricao="Pra planejar renovação" defaultChecked={true} />
            <ToggleRow label="Novo pedido recebido" descricao="Quando atendimento cria um pedido" defaultChecked={false} />
            <ToggleRow label="NF marcada como paga" descricao="Quando financeiro marca pagamento" defaultChecked={false} />
          </CardBody>
        </Card>

        {isAdmin && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-brand-700" />
                  Sistema
                </CardTitle>
                <CardDescription>Configurações gerais (só sócias).</CardDescription>
              </CardHeader>
              <CardBody className="space-y-3">
                <ToggleRow label="Backup automático" descricao="Backup do banco a cada 24h" defaultChecked={true} disabled={!isAdmin} />
                <ToggleRow label="Logs de auditoria" descricao="Registra todas as ações sensíveis" defaultChecked={true} disabled={!isAdmin} />
                <ToggleRow label="Modo manutenção" descricao="Bloqueia novos logins (emergência)" defaultChecked={false} disabled={!isAdmin} />
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UsersIcon className="w-4 h-4 text-brand-700" />
                  Equipe
                </CardTitle>
                <CardDescription>Gerencie quem acessa o sistema (em construção).</CardDescription>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-ink-600 leading-relaxed">
                  A gestão completa de usuários (criar, convidar, desativar) será disponibilizada na próxima sprint.
                  Por enquanto, novos usuários são cadastrados direto no banco.
                </p>
              </CardBody>
            </Card>
          </>
        )}

        <div className="flex items-center justify-end gap-3 sticky bottom-4">
          {ok && <span className="text-sm text-emerald-700 font-medium animate-fade-in">Preferências salvas ✓</span>}
          <Button variant="primary" onClick={salvar} loading={salvando} rounded="md">
            <Save className="w-4 h-4" />Salvar preferências
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, descricao, defaultChecked, disabled }: { label: string; descricao: string; defaultChecked: boolean; disabled?: boolean }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <div className="text-sm font-medium text-ink-900">{label}</div>
        <div className="text-xs text-ink-500 mt-0.5">{descricao}</div>
      </div>
      <button
        type="button"
        onClick={() => !disabled && setOn(!on)}
        disabled={disabled}
        className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${on ? 'bg-brand-600' : 'bg-ink-200'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        aria-pressed={on}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-soft transition-transform ${on ? 'translate-x-[20px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}
