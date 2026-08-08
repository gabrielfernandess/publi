'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Scale, Eye, EyeOff, LogIn, ArrowLeft, ShieldCheck, FileText, Wallet, Users, Truck, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthProvider, useAuth } from '@/lib/auth';

const CREDENTIALS = [
  { papel: 'Sócia (admin)', email: 'admin@publilegal.com.br', senha: 'admin123', icon: ShieldCheck, cor: 'text-brand-700' },
  { papel: 'Atendimento', email: 'atendimento@publilegal.com.br', senha: 'atend123', icon: Building2, cor: 'text-brand-600' },
  { papel: 'Preparação', email: 'preparacao@publilegal.com.br', senha: 'prep123', icon: FileText, cor: 'text-brand-600' },
  { papel: 'Envio', email: 'envio@publilegal.com.br', senha: 'envio123', icon: Truck, cor: 'text-brand-600' },
  { papel: 'Publicação', email: 'publicacao@publilegal.com.br', senha: 'publi123', icon: FileText, cor: 'text-brand-600' },
  { papel: 'Faturamento', email: 'faturamento@publilegal.com.br', senha: 'fatur123', icon: Wallet, cor: 'text-brand-600' },
  { papel: 'Financeiro', email: 'financeiro@publilegal.com.br', senha: 'finan123', icon: Wallet, cor: 'text-brand-600' },
];

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/app/dashboard';
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [show, setShow] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    try {
      await login(email, senha);
      router.push(next);
    } catch (err: any) {
      setErro(err.message || 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <Input
        label="E-mail"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="voce@publilegal.com.br"
        required
        autoComplete="email"
        rounded="md"
      />
      <div className="relative">
        <Input
          label="Senha"
          type={show ? 'text' : 'password'}
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
          rounded="md"
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-9 text-ink-400 hover:text-ink-600"
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {erro && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {erro}
        </div>
      )}

      <Button type="submit" variant="primary" size="lg" fullWidth loading={loading} rounded="md">
        <LogIn className="w-4 h-4" />
        Entrar no sistema
      </Button>

      <div className="pt-4 border-t border-ink-100">
        <p className="text-xs font-semibold text-ink-600 mb-2 text-center">Credenciais demo (7 papéis):</p>
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {CREDENTIALS.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.email}
                type="button"
                onClick={() => { setEmail(c.email); setSenha(c.senha); }}
                className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded-md hover:bg-ink-50 transition-colors group"
              >
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${c.cor}`} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-ink-800">{c.papel}</div>
                  <div className="text-[10px] text-ink-500 truncate">{c.email} / {c.senha}</div>
                </div>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-ink-400 text-center mt-2">Clique numa credencial pra preencher</p>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex bg-ink-50">
      <div className="hidden lg:flex lg:w-1/2 bg-hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 grid-bg-dark opacity-50" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-brand-500/30 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <Link href="/" className="flex items-center gap-2.5 group w-fit">
            <div className="w-10 h-10 rounded-lg bg-lime-gradient flex items-center justify-center group-hover:scale-105 transition-transform">
              <Scale className="w-5 h-5 text-brand-900" strokeWidth={2.5} />
            </div>
            <div className="leading-none">
              <div className="font-sans font-extrabold text-lg">Publi Legal</div>
              <div className="text-accent-300 text-[10px] uppercase tracking-widest font-semibold">Publicidade Legal</div>
            </div>
          </Link>
          <div>
            <h2 className="font-sans text-4xl font-extrabold text-balance">
              O controle total da sua publicidade legal.
            </h2>
            <p className="mt-4 text-white/70 text-balance max-w-md">
              Contratos, saldos de centímetros, kanban de pedidos, faturamento e financeiro — tudo num sistema só.
            </p>
          </div>
          <p className="text-xs text-white/40">© {new Date().getFullYear()} Publi Legal</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar para o site
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md">
            <div className="lg:hidden mb-8 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-lg bg-lime-gradient flex items-center justify-center">
                <Scale className="w-5 h-5 text-brand-900" strokeWidth={2.5} />
              </div>
              <div className="leading-none">
                <div className="font-sans font-extrabold text-lg text-ink-900">Publi Legal</div>
                <div className="text-brand-600 text-[10px] uppercase tracking-widest font-semibold">Publicidade Legal</div>
              </div>
            </div>

            <h1 className="font-sans text-3xl font-extrabold text-ink-900">Acessar sistema</h1>
            <p className="mt-2 text-sm text-ink-500">Use suas credenciais pra continuar.</p>

            <div className="mt-8">
              <Suspense fallback={<div className="h-96 flex items-center justify-center text-ink-400 text-sm">Carregando...</div>}>
                <AuthProvider>
                  <LoginForm />
                </AuthProvider>
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
