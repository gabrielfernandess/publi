'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, LogIn, ArrowLeft, Mail, LifeBuoy, CheckCircle2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AuthProvider, useAuth } from '@/lib/auth';
import { api } from '@/lib/api';

const SUPORTE_EMAIL = 'suporte@publilegal.com.br';

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
  const [lembrar, setLembrar] = useState(true);
  const [recuperarOpen, setRecuperarOpen] = useState(false);
  const [recuperarEmail, setRecuperarEmail] = useState('');
  const [recuperarEnviando, setRecuperarEnviando] = useState(false);
  const [recuperarEnviado, setRecuperarEnviado] = useState(false);
  const [recuperarDevLink, setRecuperarDevLink] = useState<string | null>(null);
  const [recuperarErro, setRecuperarErro] = useState<string | null>(null);

  const onRecuperar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recuperarEmail) return;
    setRecuperarEnviando(true);
    setRecuperarErro(null);
    try {
      const resp = await api.post<{ ok: boolean; devLink?: string }>('/auth/recuperar', { email: recuperarEmail });
      setRecuperarEnviado(true);
      if (resp?.devLink) setRecuperarDevLink(resp.devLink);
    } catch (err: any) {
      setRecuperarErro(err?.message || 'Não foi possível solicitar a recuperação.');
    } finally {
      setRecuperarEnviando(false);
    }
  };

  const abrirModalRecuperar = () => {
    setRecuperarOpen(true);
    setRecuperarEnviado(false);
    setRecuperarDevLink(null);
    setRecuperarErro(null);
    setRecuperarEmail(email);
  };

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
    <>
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

      <div className="flex items-center justify-between pt-1 text-sm">
        <label className="inline-flex items-center gap-2 text-ink-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={lembrar}
            onChange={(e) => setLembrar(e.target.checked)}
            className="w-4 h-4 rounded border-ink-300 text-brand-600 focus:ring-2 focus:ring-brand-200 cursor-pointer"
          />
          Manter conectado
        </label>
        <button
          type="button"
          onClick={abrirModalRecuperar}
          className="text-brand-600 hover:text-brand-700 font-medium hover:underline"
        >
          Esqueci minha senha
        </button>
      </div>

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-ink-100" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-3 text-xs uppercase tracking-wider text-ink-400">suporte</span>
        </div>
      </div>

      <a
        href={`mailto:${SUPORTE_EMAIL}?subject=Problema%20com%20acesso%20ao%20Publi%20Legal`}
        className="flex items-center gap-3 rounded-lg border border-ink-200 bg-ink-50/50 hover:bg-ink-50 hover:border-brand-200 transition-colors px-3.5 py-2.5 group"
      >
        <span className="w-8 h-8 rounded-md bg-white border border-ink-200 flex items-center justify-center group-hover:border-brand-300">
          <LifeBuoy className="w-4 h-4 text-brand-600" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium text-ink-800">Problemas para entrar?</span>
          <span className="block text-xs text-ink-500 truncate">Fale com o suporte — {SUPORTE_EMAIL}</span>
        </span>
        <Mail className="w-4 h-4 text-ink-400 group-hover:text-brand-600" />
      </a>
    </form>

    {recuperarOpen && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4"
        onClick={() => setRecuperarOpen(false)}
      >
        <div
          className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-ink-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 pt-5 pb-3 border-b border-ink-100">
            <h3 className="text-lg font-semibold text-ink-900">Recuperar acesso</h3>
            <p className="text-sm text-ink-500 mt-1">
              Informe seu e-mail e enviaremos as instruções para redefinir sua senha.
            </p>
          </div>

          {recuperarEnviado ? (
            <div className="px-6 py-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-brand-50 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-brand-600" />
                </div>
                <p className="mt-4 text-sm text-ink-800 font-medium">Se o e-mail estiver cadastrado, enviaremos um link</p>
                <p className="mt-1 text-xs text-ink-500 max-w-xs mx-auto">
                  O link expira em 1 hora. Confira também a caixa de spam.
                </p>
              </div>
              {recuperarDevLink && process.env.NODE_ENV !== 'production' && (
                <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left">
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Modo dev — link direto
                  </p>
                  <p className="mt-1 text-xs text-amber-700">
                    Em desenvolvimento, exibimos o link em vez de enviar e-mail. Em produção, esta caixa some.
                  </p>
                  <a
                    href={recuperarDevLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-amber-900 hover:text-amber-700 break-all"
                  >
                    Abrir link de redefinição
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              )}
              <Button
                variant="primary"
                size="md"
                rounded="md"
                className="mt-5 w-full"
                onClick={() => setRecuperarOpen(false)}
              >
                Entendi
              </Button>
            </div>
          ) : (
            <form onSubmit={onRecuperar} className="px-6 py-5 space-y-4">
              <Input
                label="E-mail"
                type="email"
                value={recuperarEmail}
                onChange={(e) => setRecuperarEmail(e.target.value)}
                placeholder="voce@publilegal.com.br"
                required
                autoComplete="email"
                rounded="md"
              />
              {recuperarErro && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {recuperarErro}
                </div>
              )}
              <p className="text-xs text-ink-500">
                Vamos enviar um link para redefinir sua senha. O link expira em 1 hora.
              </p>
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="ghost" size="md" rounded="md" onClick={() => setRecuperarOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="md" rounded="md" loading={recuperarEnviando}>
                  Enviar link
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    )}
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex bg-ink-50">
      <div className="hidden lg:flex lg:w-1/2 bg-brand-900 relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          <Link href="/" className="w-fit">
            <img src="/logo-clean-white.png" alt="Publi Legal" className="h-14 w-auto hover:opacity-90 transition-opacity" />
          </Link>
          <div>
            <h2 className="font-sans text-4xl font-extrabold text-balance text-accent-300">
              O controle total da sua publicidade legal.
            </h2>
            <p className="mt-4 text-white/80 text-balance max-w-md">
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
            <div className="lg:hidden mb-8">
              <img src="/logo-clean.png" alt="Publi Legal" className="h-12 w-auto" />
            </div>

            <h1 className="font-sans text-3xl font-extrabold text-ink-900">Acessar sistema</h1>
            <p className="mt-2 text-sm text-ink-500">Use suas credenciais para continuar.</p>

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
