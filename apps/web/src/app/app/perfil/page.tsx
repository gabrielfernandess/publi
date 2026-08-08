'use client';

import { useAuth } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { User, Mail, Shield, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const PAPEIS_LABEL: Record<string, { label: string; cor: string; descricao: string }> = {
  admin:       { label: 'Sócia (Admin)', cor: 'bg-brand-100 text-brand-800', descricao: 'Acesso total, aprova tudo.' },
  atendimento: { label: 'Atendimento',  cor: 'bg-sky-100 text-sky-700',   descricao: 'Recebe pedidos dos clientes e cadastra.' },
  preparacao:  { label: 'Preparação',   cor: 'bg-amber-100 text-amber-700', descricao: 'Formata e revisa antes de enviar.' },
  envio:       { label: 'Envio',        cor: 'bg-indigo-100 text-indigo-700', descricao: 'Envia pros veículos oficiais.' },
  publicacao:  { label: 'Publicação',   cor: 'bg-teal-100 text-teal-700', descricao: 'Confere PDFs publicados e arquiva.' },
  faturamento: { label: 'Faturamento',  cor: 'bg-pink-100 text-pink-700', descricao: 'Importa NFs e baixa saldo do contrato.' },
  financeiro:  { label: 'Financeiro',   cor: 'bg-accent-100 text-accent-700', descricao: 'Marca NFs como pagas e controla caixa.' },
};

export default function PerfilPage() {
  const { user } = useAuth();
  if (!user) return null;
  const papel = PAPEIS_LABEL[user.papel] || { label: user.papel, cor: 'bg-ink-100 text-ink-700', descricao: '' };
  const iniciais = user.nome.split(' ').filter(Boolean).slice(0, 2).map((s) => s[0]).join('').toUpperCase();

  return (
    <div>
      <PageHeader title="Meu perfil" description="Suas informações e permissões no sistema." />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card>
          <CardBody className="p-6 text-center">
            <div className="w-24 h-24 mx-auto rounded-pill bg-brand-gradient flex items-center justify-center text-white text-2xl font-bold shadow-lift">
              {iniciais}
            </div>
            <h2 className="mt-4 text-lg font-bold text-ink-900">{user.nome}</h2>
            <p className="text-sm text-ink-500 mt-1">{user.email}</p>
            <span className={cn('inline-block mt-3 text-xs px-2.5 py-1 rounded-pill font-bold uppercase tracking-wider', papel.cor)}>
              {papel.label}
            </span>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-brand-700" />
              O que você pode fazer
            </CardTitle>
            <CardDescription>Seu papel define o que você vê e mexe no sistema.</CardDescription>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-ink-700 leading-relaxed">{papel.descricao}</p>
            <ul className="mt-4 space-y-2 text-sm">
              <PermissaoItem ok={true} texto="Ver dashboard e KPIs" />
              <PermissaoItem ok={true} texto="Acompanhar kanban de pedidos" />
              <PermissaoItem ok={user.papel === 'admin'} texto="Importar NFs e aprovar faturamento" />
              <PermissaoItem ok={user.papel === 'admin'} texto="Marcar NFs como pagas" />
              <PermissaoItem ok={user.papel === 'admin'} texto="Cancelar NFs e excluir registros" />
              <PermissaoItem ok={user.papel === 'admin'} texto="Acessar módulo Financeiro completo" />
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function PermissaoItem({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={cn('w-2 h-2 rounded-full', ok ? 'bg-emerald-500' : 'bg-ink-200')} />
      <span className={ok ? 'text-ink-700' : 'text-ink-400 line-through'}>{texto}</span>
    </li>
  );
}
