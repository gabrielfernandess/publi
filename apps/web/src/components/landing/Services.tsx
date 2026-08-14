import { Newspaper, Globe2, Building2, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '@/components/ui/Card';

const servicos = [
  {
    icon: Globe2,
    cor: 'bg-brand-600 text-white',
    titulo: 'DOU',
    subtitulo: 'Diário Oficial da União',
    descricao: 'Publicação de atos com abrangência federal — licitações, contratos e homologações que exigem visibilidade nacional.',
    bullets: ['Atos federais', 'Visão nacional', 'Prazo de 1 dia útil'],
  },
  {
    icon: Building2,
    cor: 'bg-lime-gradient text-brand-900',
    titulo: 'DOE',
    subtitulo: 'Diário Oficial do Estado',
    descricao: 'Atos oficiais do estado — licitações estaduais, homologações e extratos de contrato com força legal local.',
    bullets: ['Múltiplos estados', 'Atos locais', 'Envio diário'],
  },
  {
    icon: Newspaper,
    cor: 'bg-ink-900 text-white',
    titulo: 'Jornal',
    subtitulo: 'Grande Circulação',
    descricao: 'Publicação em jornais de grande circulação regional — essencial para licitações de maior valor e ampla divulgação.',
    bullets: ['O Imparcial, O Pará...', 'Jornal Pequeno, Primeira Página', 'Faturamento quinzenal'],
  },
];

export function Services() {
  return (
    <section id="servicos" className="py-20 lg:py-28 bg-white">
      <div className="container-page">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-sans text-3xl lg:text-5xl font-extrabold text-ink-900 text-balance">
            Publicamos onde sua licitação precisa aparecer
          </h2>
          <p className="mt-5 text-lg text-ink-600">
            DOU, DOE e os principais jornais de grande circulação. Você escolhe o veículo; cuidamos do envio.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {servicos.map((s) => (
            <Card key={s.titulo} className="group hover:shadow-lift transition-all">
              <CardHeader>
                <div className={`w-12 h-12 rounded-xl ${s.cor} flex items-center justify-center mb-3`}>
                  <s.icon className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl font-sans">{s.titulo}</CardTitle>
                <CardDescription>{s.subtitulo}</CardDescription>
              </CardHeader>
              <CardBody>
                <p className="text-sm text-ink-600 leading-relaxed mb-4">{s.descricao}</p>
                <ul className="space-y-2">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm text-ink-700">
                      <ArrowRight className="w-4 h-4 text-accent-500 mt-0.5 flex-shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
