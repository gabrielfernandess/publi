'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Scale, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { api } from '@/lib/api';

type Status = 'loading' | 'invalid' | 'valid';

function RedefinirForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get('token') || '';

  const [status, setStatus] = useState<Status>('loading');
  const [motivo, setMotivo] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    let cancelado = false;
    if (!token) {
      setStatus('invalid');
      setMotivo('Link invalido — token ausente.');
      return;
    }
    api
      .get<{ valid: boolean; email?: string; error?: string }>(`/auth/redefinir/validar?token=${encodeURIComponent(token)}`)
      .then((resp) => {
        if (cancelado) return;
        if (resp.valid) {
          setStatus('valid');
          setEmail(resp.email || '');
        } else {
          setStatus('invalid');
          setMotivo(resp.error || 'Link invalido.');
        }
      })
      .catch((err) => {
        if (cancelado) return;
        setStatus('invalid');
        setMotivo(err?.message || 'Nao foi possivel validar o link.');
      });
    return () => { cancelado = true; };
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (senha !== confirmar) {
      setErro('As senhas nao conferem.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/auth/redefinir', { token, senha, confirmar });
      setSucesso(true);
      setTimeout(() => router.push('/login?redefinida=1'), 2500);
    } catch (err: any) {
      setErro(err?.message || 'Erro ao redefinir a senha.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {status === 'loading' && (
        <div className="flex flex-col items-center justify-center py-12 text-ink-500">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
          <p className="mt-3 text-sm">Validando link...</p>
        </div>
      )}

      {status === 'invalid' && (
        <div>
          <div className="w-12 h-12 rounded-full bg-red-50 mx-auto flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-ink-900 text-center">Link nao pode ser usado</h2>
          <p className="mt-2 text-sm text-ink-500 text-center">{motivo}</p>
          <div className="mt-6 flex flex-col gap-2">
            <Link href="/login" className="w-full">
              <Button variant="primary" size="lg" fullWidth rounded="md">Voltar pro login</Button>
            </Link>
            <Link href="/login" className="w-full">
              <Button variant="ghost" size="md" fullWidth rounded="md">Solicitar um novo link</Button>
            </Link>
          </div>
        </div>
      )}

      {status === 'valid' && !sucesso && (
        <>
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-brand-200 bg-brand-50/60 px-3.5 py-2.5">
            <ShieldCheck className="w-4 h-4 text-brand-700 mt-0.5 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink-800">Definindo senha para {email}</p>
              <p className="text-xs text-ink-600">Use no minimo 6 caracteres.</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="relative">
              <Input
                label="Nova senha"
                type={show ? 'text' : 'password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete="new-password"
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

            <Input
              label="Confirmar nova senha"
              type={show ? 'text' : 'password'}
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              autoComplete="new-password"
              rounded="md"
            />

            {erro && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {erro}
              </div>
            )}

            <Button type="submit" variant="primary" size="lg" fullWidth loading={submitting} rounded="md">
              Salvar nova senha
            </Button>
          </form>
        </>
      )}

      {sucesso && (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-brand-50 mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-brand-600" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-ink-900">Senha redefinida</h2>
          <p className="mt-2 text-sm text-ink-500">Tudo certo. Voce sera redirecionado pro login em instantes.</p>
        </div>
      )}
    </div>
  );
}

export default function RedefinirSenhaPage() {
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
            <h2 className="font-sans text-4xl font-extrabold text-balance text-accent-300">
              Defina uma nova senha.
            </h2>
            <p className="mt-4 text-white/80 text-balance max-w-md">
              Use algo que voce consiga lembrar — mas que nao seja facil de adivinhar. Sua conta volta a funcionar na hora.
            </p>
          </div>
          <p className="text-xs text-white/40">© {new Date().getFullYear()} Publi Legal</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-6">
          <Link href="/login" className="inline-flex items-center gap-2 text-sm text-ink-500 hover:text-ink-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar pro login
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

            <h1 className="font-sans text-3xl font-extrabold text-ink-900">Redefinir senha</h1>
            <p className="mt-2 text-sm text-ink-500">Crie uma nova senha pra sua conta.</p>

            <div className="mt-8">
              <Suspense fallback={<div className="h-96 flex items-center justify-center text-ink-400 text-sm">Carregando...</div>}>
                <RedefinirForm />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
