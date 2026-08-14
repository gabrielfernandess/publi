import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function Hero() {
  return (
    <section className="relative pt-32 lg:pt-40 pb-20 lg:pb-28 overflow-hidden bg-hero-gradient">
      <div className="container-page relative">
        <div className="max-w-3xl">
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

          <div className="mt-14 grid grid-cols-3 gap-4 sm:gap-6 max-w-xl">
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
      </div>
    </section>
  );
}
