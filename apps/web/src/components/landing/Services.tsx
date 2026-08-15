import { Newspaper, Globe2, Building2, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '@/components/ui/Card';

const servicos = [
  {
    icon: Globe2,
    cor: 'bg-brand-600 text-white',
    titulo: 'DOU',
    subtitulo: 'Diário Oficial da União',
    descricao: 'Atos com abrangência federal — licitações, contratos e homologações que exigem visibilidade nacional.',
    bullets: ['Editais de licitação federal', 'Extratos de contrato', 'Prazo de 1 dia útil'],
  },
  {
    icon: Building2,
    cor: 'bg-lime-gradient text-brand-900',
    titulo: 'DOE',
    subtitulo: 'Diário Oficial do Estado',
    descricao: 'Atos oficiais do estado — licitações, homologações e extratos de contrato com força legal local.',
    bullets: ['Cobertura em múltiplos estados', 'Formatação por padrão estadual', 'Envio diário'],
  },
  {
    icon: Newspaper,
    cor: 'bg-ink-900 text-white',
    titulo: 'Jornal',
    subtitulo: 'Grande Circulação',
    descricao: 'Publicação em jornais regionais de grande circulação — essencial para licitações de maior valor.',
    bullets: ['O Imparcial, O Pará e outros', 'Jornal Pequeno, Primeira Página', 'Faturamento quinzenal'],
  },
];

export function Services() {
  return (
    <section id="servicos" className="py-20 lg:py-28 bg-white">
      <div className="container-page">
        <div className="max-w-2xl">
          <h2 className="font-serif text-3xl lg:text-[2.75rem] font-bold text-ink-900 text-balance leading-[1.1]">
            Três veículos, um único processo
          </h2>
          <p className="mt-5 text-lg text-ink-600">
            DOU, DOE e os principais jornais de grande circulação. Você escolhe onde o ato precisa sair; cuidamos do envio, da conferência e do protocolo.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {servicos.map((s) => (
            <Card key={s.titulo} className="group hover:shadow-lift transition-all">
              <CardHeader>
                <div className={`w-12 h-12 rounded-xl ${s.cor} flex items-center justify-center mb-3`}>
                  <s.icon className="w-6 h-6" />
                </div>
                <CardTitle className="text-2xl font-serif">{s.titulo}</CardTitle>
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
