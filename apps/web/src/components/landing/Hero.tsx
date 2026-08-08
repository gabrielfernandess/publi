import Link from 'next/link';
import { ArrowRight, FileText, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function Hero() {
  return (
    <section className="relative pt-32 lg:pt-40 pb-20 lg:pb-28 overflow-hidden bg-hero-gradient">
      <div className="absolute inset-0 grid-bg-dark opacity-60" />
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-brand-500/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-accent-500/20 rounded-full blur-3xl" />

      <div className="container-page relative">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill glass text-xs font-medium text-accent-300 mb-6 animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            Atendimento para prefeituras, câmaras e autarquias
          </div>

          <h1 className="font-sans text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold text-white text-balance leading-[1.05] animate-fade-up">
            Sua publicação legal, <span className="text-accent-300">sem dor de cabeça</span>.
          </h1>

          <p className="mt-6 text-lg lg:text-xl text-white/70 text-balance max-w-2xl animate-fade-up" style={{ animationDelay: '100ms' }}>
            Cuidamos do envio, confirmação e arquivamento dos seus atos em <strong className="text-white">DOU, DOE e Jornais de Grande Circulação</strong>. Você acompanha cada centímetro pelo sistema, em tempo real.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 animate-fade-up" style={{ animationDelay: '200ms' }}>
            <Link href="/login">
              <Button variant="lime" size="lg" className="rounded-pill text-base">
                Acessar sistema
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <a href="#contato">
              <Button variant="outline" size="lg" className="rounded-pill text-base border-white/20 text-white hover:bg-white/10 hover:border-white/30">
                Falar com a equipe
              </Button>
            </a>
          </div>

          <div className="mt-12 grid grid-cols-3 gap-4 sm:gap-6 max-w-xl animate-fade-up" style={{ animationDelay: '300ms' }}>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white">+20</div>
              <div className="text-xs text-white/60 mt-0.5">prefeituras atendidas</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white">3</div>
              <div className="text-xs text-white/60 mt-0.5">tipos de veículo</div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-bold text-white">100%</div>
              <div className="text-xs text-white/60 mt-0.5">rastreabilidade</div>
            </div>
          </div>
        </div>

        <div className="hidden lg:block absolute right-8 top-32 w-72 animate-float">
          <div className="glass rounded-2xl p-4 shadow-lift">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <div className="text-xs text-white/60">Status do pedido</div>
                <div className="text-sm font-semibold text-white">Publicação confirmada</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5 text-xs text-white/70">
              <div className="flex justify-between"><span>DOU</span><span className="text-emerald-300">✓</span></div>
              <div className="flex justify-between"><span>DOE</span><span className="text-emerald-300">✓</span></div>
              <div className="flex justify-between"><span>Jornal</span><span className="text-amber-300">⏳</span></div>
            </div>
          </div>
        </div>

        <div className="hidden lg:block absolute right-32 bottom-8 w-64 animate-float" style={{ animationDelay: '1s' }}>
          <div className="glass-dark rounded-2xl p-4 shadow-lift">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-accent-300" />
              <span className="text-xs font-medium text-white/80">Saldo contratual</span>
            </div>
            <div className="text-2xl font-bold text-white">68%</div>
            <div className="mt-2 h-1.5 bg-white/10 rounded-pill overflow-hidden">
              <div className="h-full bg-lime-gradient" style={{ width: '68%' }} />
            </div>
            <div className="mt-2 text-[10px] text-white/50">Cidelândia • DOU</div>
          </div>
        </div>
      </div>
    </section>
  );
}
