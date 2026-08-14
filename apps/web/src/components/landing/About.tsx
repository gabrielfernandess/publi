import { ShieldCheck, FileCheck2, Clock, Users } from 'lucide-react';

const valores = [
  {
    icon: ShieldCheck,
    title: 'Confiabilidade',
    text: 'Protocolos rastreáveis, PDFs arquivados e confirmação de publicação em cada veículo.',
  },
  {
    icon: Clock,
    title: 'Pontualidade',
    text: 'Acompanhamos o tempo certo de envio para garantir que a publicação saia na data desejada.',
  },
  {
    icon: FileCheck2,
    title: 'Conformidade',
    text: 'Cada ato é formatado conforme as exigências de cada veículo (DOU, DOE, Jornal).',
  },
  {
    icon: Users,
    title: 'Atendimento dedicado',
    text: 'Equipe dedicada para entender a demanda do órgão e conduzir o processo até o fim.',
  },
];

export function About() {
  return (
    <section id="sobre" className="py-20 lg:py-28 bg-soft-gradient">
      <div className="container-page">
        <div className="max-w-3xl">
          <h2 className="font-sans text-3xl lg:text-5xl font-extrabold text-ink-900 text-balance">
            Cuidamos da burocracia. <span className="text-brand-600">Você</span> cuida da sua cidade.
          </h2>
          <p className="mt-5 text-lg text-ink-600 text-balance">
            Somos a ponte entre o seu órgão e os veículos oficiais. Recebemos o ato, formatamos, enviamos, conferimos a publicação e arquivamos. Tudo rastreado.
            Sua equipe economiza horas de planilha e garante que nada escapa do prazo legal.
          </p>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {valores.map((v) => (
            <div
              key={v.title}
              className="group bg-white rounded-2xl p-6 border border-ink-100 shadow-soft hover:shadow-lift hover:-translate-y-0.5 transition-all"
            >
              <div className="w-11 h-11 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-colors">
                <v.icon className="w-5 h-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-ink-900">{v.title}</h3>
              <p className="mt-2 text-sm text-ink-600 leading-relaxed">{v.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
