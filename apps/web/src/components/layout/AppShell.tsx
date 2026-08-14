'use client';

import { ReactNode, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, Truck, FileText, Package2, LogOut, Menu, X, Scale, Receipt, BarChart3,
  Bell, Search, Settings, User as UserIcon, ChevronDown, LogIn, AlertTriangle, CheckCircle2, Info, HelpCircle, ScrollText,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
// (sem dependências extras; navFiltrada no shell)

type NavItem = { href: string; label: string; icon: any; papel?: string[]; badge?: string };

const nav: NavItem[] = [
  { href: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/pedidos', label: 'Pedidos', icon: Package2 },
  { href: '/app/contratos', label: 'Contratos', icon: FileText },
  { href: '/app/clientes', label: 'Clientes', icon: Users },
  { href: '/app/veiculos', label: 'Veículos', icon: Truck },
  { href: '/app/notas-fiscais', label: 'Faturamento', icon: Receipt, papel: ['admin'] },
  { href: '/app/financeiro', label: 'Financeiro', icon: BarChart3, papel: ['admin'] },
  { href: '/app/logs', label: 'Logs', icon: ScrollText, papel: ['admin'] },
  { href: '/app/usuarios', label: 'Usuários', icon: Users, papel: ['admin'] },
];

const PAPEIS_LABEL: Record<string, { label: string; cor: string }> = {
  admin: { label: 'Admin',  cor: 'bg-brand-100 text-brand-800' },
  user:  { label: 'Usuário', cor: 'bg-sky-100 text-sky-700' },
};

// notificações mock (futuramente viriam do backend)
const MOCK_NOTIFS = [
  { id: 1, tipo: 'warning' as const, titulo: 'NF atrasada', texto: 'Cidelândia — NF #20260042 vencida há 97 dias', tempo: '5min' },
  { id: 2, tipo: 'info' as const,    titulo: 'Contrato vence em 30 dias', texto: 'Tibagi/PR — Contrato 030/2025', tempo: '2h' },
  { id: 3, tipo: 'success' as const, titulo: 'NF paga', texto: 'Tibagi/PR — NF #20260011 recebida', tempo: 'ontem' },
];

const NOTIF_ICONS = {
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
};
const NOTIF_CORES = {
  warning: 'text-amber-600 bg-amber-100',
  info: 'text-sky-600 bg-sky-100',
  success: 'text-emerald-600 bg-emerald-100',
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [openSidebar, setOpenSidebar] = useState(false);
  const [openNotif, setOpenNotif] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // fecha dropdowns ao clicar fora
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setOpenNotif(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setOpenProfile(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');
  const navFiltrada = nav.filter((n) => !n.papel || n.papel.includes(user?.papel || ''));
  const papelInfo = PAPEIS_LABEL[user?.papel || ''] || { label: user?.papel || '—', cor: 'bg-ink-100 text-ink-700' };

  const onLogout = async () => {
    setOpenProfile(false);
    await logout();
    router.push('/login');
  };

  const iniciais = (user?.nome || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-ink-50/50 flex">
      {/* ============== SIDEBAR ============== */}
      <aside
        className={cn(
          'fixed lg:sticky top-0 left-0 z-40 lg:z-auto w-64 h-screen bg-brand-900 text-white',
          'flex flex-col transition-transform flex-shrink-0',
          openSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="px-5 py-5 flex items-center justify-between">
          <Link href="/app/dashboard" className="flex items-center gap-2.5 group" onClick={() => setOpenSidebar(false)}>
            <div className="w-9 h-9 rounded-lg bg-lime-gradient flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <Scale className="w-4.5 h-4.5 text-brand-900" strokeWidth={2.5} />
            </div>
            <div className="leading-none">
              <div className="font-serif font-extrabold text-white text-[15px] tracking-tight">Publi Legal</div>
              <div className="text-[9px] text-lime-300 uppercase tracking-widest font-bold mt-0.5">Sistema</div>
            </div>
          </Link>
          <button onClick={() => setOpenSidebar(false)} className="lg:hidden text-white/70 hover:text-white p-1 -mr-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          <p className="px-3 mb-2 text-[10px] font-bold text-white/50 uppercase tracking-widest">Operação</p>
          {navFiltrada.map((n) => {
            const active = isActive(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpenSidebar(false)}
                className={cn(
                  'group flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  active
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-white/85 hover:bg-white/10 hover:text-white'
                )}
              >
                <n.icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-white' : 'text-white/70 group-hover:text-white')} />
                <span className="flex-1 truncate">{n.label}</span>
                {n.badge && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-amber-400 text-amber-900 font-bold uppercase">{n.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer do sidebar: usuário logado */}
        <div className="p-3">
          <div className="px-3 py-2.5 rounded-lg bg-white/10 mb-2">
            <div className="text-[10px] text-white/60 uppercase tracking-wider font-semibold">Logado como</div>
            <div className="text-sm font-semibold text-white truncate mt-0.5">{user?.nome}</div>
            <span className={cn('inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider', papelInfo.cor)}>
              {papelInfo.label}
            </span>
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {openSidebar && (
        <div
          className="lg:hidden fixed inset-0 bg-ink-900/40 backdrop-blur-sm z-30"
          onClick={() => setOpenSidebar(false)}
        />
      )}

      {/* ============== COLUNA PRINCIPAL (header + main) ============== */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* ============== TOP BAR ============== */}
        <header className="sticky top-0 z-30 bg-brand-900 text-white">
          <div className="h-16 px-4 sm:px-6 flex items-center gap-3">
            {/* Mobile menu */}
            <button onClick={() => setOpenSidebar(true)} className="lg:hidden p-2 -ml-2 text-ink-700 hover:text-ink-900">
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex-1" />

            {/* Search (alinhado à direita) */}
            <div className="hidden md:block w-72 lg:w-96">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
                <input
                  type="text"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQ.trim()) {
                      router.push(`/app/pedidos?search=${encodeURIComponent(searchQ.trim())}`);
                    }
                  }}
                  placeholder="Buscar pedido, cliente, NF... (Enter)"
                  className="w-full pl-10 pr-3 py-2 rounded-pill bg-white/10 border border-white/20 focus:bg-white/20 focus:border-white/40 focus:outline-none text-sm text-white placeholder:text-white/50 transition-all"
                />

              </div>
            </div>

            {/* Notificações */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setOpenNotif(!openNotif); setOpenProfile(false); }}
                className="relative p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-pill transition-colors"
                aria-label="Notificações"
              >
                <Bell className="w-5 h-5" />
                {MOCK_NOTIFS.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-brand-900" />
                )}
              </button>
              {openNotif && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-ink-200 rounded-xl shadow-lift overflow-hidden animate-fade-in">
                  <div className="px-4 py-3 border-b border-ink-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ink-900">Notificações</h3>
                    <span className="text-[10px] text-ink-500">{MOCK_NOTIFS.length} novas</span>
                  </div>
                  <ul className="max-h-80 overflow-y-auto divide-y divide-ink-100">
                    {MOCK_NOTIFS.map((n) => {
                      const Icon = NOTIF_ICONS[n.tipo];
                      return (
                        <li key={n.id} className="px-4 py-3 hover:bg-ink-50 cursor-pointer transition-colors">
                          <div className="flex items-start gap-2.5">
                            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', NOTIF_CORES[n.tipo])}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-ink-900">{n.titulo}</div>
                              <div className="text-xs text-ink-600 mt-0.5">{n.texto}</div>
                              <div className="text-[10px] text-ink-400 mt-1">{n.tempo}</div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <Link href="/app/notas-fiscais" className="block px-4 py-2.5 text-center text-xs font-semibold text-brand-600 hover:bg-ink-50 border-t border-ink-100">
                    Ver todas
                  </Link>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => { setOpenProfile(!openProfile); setOpenNotif(false); }}
                className="flex items-center gap-2 p-1 pr-2 hover:bg-white/10 rounded-pill transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-sm">
                  {iniciais || <UserIcon className="w-4 h-4" />}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-xs font-semibold text-white leading-tight">{user?.nome?.split(' ')[0]}</div>
                  <div className="text-[10px] text-white/60 leading-tight">{papelInfo.label}</div>
                </div>
                <ChevronDown className={cn('w-3.5 h-3.5 text-white/70 transition-transform', openProfile && 'rotate-180')} />
              </button>
              {openProfile && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-ink-200 rounded-xl shadow-lift overflow-hidden animate-fade-in">
                  <div className="px-4 py-3 border-b border-ink-100 bg-gradient-to-br from-brand-50 to-white">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold">
                        {iniciais || <UserIcon className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-ink-900 truncate">{user?.nome}</div>
                        <div className="text-xs text-ink-500 truncate">{user?.email}</div>
                        <span className={cn('inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider', papelInfo.cor)}>
                          {papelInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ul className="py-1">
                    <li>
                      <Link
                        href="/app/perfil"
                        onClick={() => setOpenProfile(false)}
                        className="w-full text-left px-4 py-2 text-sm text-ink-700 hover:bg-ink-50 flex items-center gap-2.5"
                      >
                        <UserIcon className="w-4 h-4 text-ink-500" />Meu perfil
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/app/configuracoes"
                        onClick={() => setOpenProfile(false)}
                        className="w-full text-left px-4 py-2 text-sm text-ink-700 hover:bg-ink-50 flex items-center gap-2.5"
                      >
                        <Settings className="w-4 h-4 text-ink-500" />Configurações
                      </Link>
                    </li>
                    <li>
                      <a
                        href="https://github.com"
                        target="_blank"
                        rel="noreferrer"
                        onClick={() => setOpenProfile(false)}
                        className="w-full text-left px-4 py-2 text-sm text-ink-700 hover:bg-ink-50 flex items-center gap-2.5"
                      >
                        <HelpCircle className="w-4 h-4 text-ink-500" />Ajuda
                      </a>
                    </li>
                  </ul>
                  <div className="border-t border-ink-100 py-1">
                    <button
                      onClick={onLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 font-medium"
                    >
                      <LogOut className="w-4 h-4" />Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ============== MAIN CONTENT ============== */}
        <main className="flex-1 min-w-0">
          <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
