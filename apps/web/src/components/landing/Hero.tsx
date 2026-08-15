import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function Hero() {
  return (
    <section className="relative pt-32 lg:pt-40 pb-20 lg:pb-28 overflow-hidden bg-brand-900">
      {/* Padrão sutil de fundo */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }}
        aria-hidden
      />

      <div className="container-page relative">
        <div className="max-w-4xl">
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-white text-balance leading-[1.08]">
            Publicidade legal,{' '}
            <span className="text-accent-300">descomplicada e especializada</span>.
          </h1>

          <p className="mt-7 text-lg lg:text-xl text-white/70 text-balance max-w-2xl leading-relaxed">
            Cuidamos da publicação dos atos oficiais do seu órgão nos principais veículos —
            <strong className="text-white/90"> DOU, DOE e Jornais de Grande Circulação</strong> —
            garantindo transparência e legalidade dos seus processos licitatórios e administrativos.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3">
            <a href="#contato">
              <Button variant="lime" size="lg" rounded="lg" className="text-base">
                Solicitar proposta
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </a>
            <Link href="/login">
              <Button
                variant="outline"
                size="lg"
                rounded="lg"
                className="text-base border-white/20 text-white hover:bg-white/10 hover:border-white/30"
              >
                Acessar sistema
              </Button>
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-4 sm:gap-6 max-w-xl border-t border-white/10 pt-8">
            <div>
              <div className="font-serif text-2xl sm:text-3xl font-bold text-white tabular-nums">+20</div>
              <p className="text-xs text-white/55 mt-1">órgãos públicos atendidos</p>
            </div>
            <div>
              <div className="font-serif text-2xl sm:text-3xl font-bold text-white tabular-nums">3</div>
              <p className="text-xs text-white/55 mt-1">veículos oficiais</p>
            </div>
            <div>
              <div className="font-serif text-2xl sm:text-3xl font-bold text-white tabular-nums">1 dia</div>
              <p className="text-xs text-white/55 mt-1">útil para o PDF da publicação</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
