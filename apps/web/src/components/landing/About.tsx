import { Scale, BookOpen, Headphones, Zap } from 'lucide-react';

const entregaveis = [
  { icon: Scale, texto: 'Orientação sobre exigências legais e montagem de avisos e outros documentos oficiais.' },
  { icon: BookOpen, texto: 'Revisão detalhada de prazos legais e conteúdo antes da publicação.' },
  { icon: Headphones, texto: 'Assistência técnica em tempo hábil para resolver qualquer questão de publicação.' },
  { icon: Zap, texto: 'Envio ágil e eficiente aos veículos de comunicação necessários.' },
];

export function About() {
  return (
    <section id="sobre" className="py-20 lg:py-28 bg-soft-gradient">
      <div className="container-page">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Coluna principal */}
          <div>
            <h2 className="font-serif text-3xl lg:text-[2.75rem] font-bold text-ink-900 text-balance leading-[1.1]">
              A ponte entre o seu órgão e os veículos oficiais.
            </h2>
            <p className="mt-6 text-lg text-ink-600 text-balance leading-relaxed">
              Somos uma agência especializada na publicação de atos oficiais — avisos de licitação,
              extratos, editais e outros comunicados. Atuamos nos principais veículos oficiais:
              Diário Oficial da União, Diário Oficial do Estado e Jornais de Grande Circulação.
            </p>

            <div className="mt-10 space-y-4">
              {entregaveis.map((item) => (
                <div key={item.texto} className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <item.icon className="w-4 h-4 text-brand-600" />
                  </div>
                  <p className="text-sm text-ink-700 leading-relaxed">{item.texto}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Base legal — bloco factual */}
          <div className="lg:pt-4">
            <div className="bg-white rounded-xl p-6 lg:p-8 shadow-soft">
              <div className="flex items-center gap-2 mb-4">
                <Scale className="w-4 h-4 text-brand-600" />
                <span className="text-xs font-mono text-brand-700 uppercase tracking-wide">
                  Lei 14.133/21 · Art. 54
                </span>
              </div>
              <h3 className="font-serif text-xl font-semibold text-ink-900 mb-3">
                Nova Lei de Licitações
              </h3>
              <p className="text-sm text-ink-600 leading-relaxed">
                A publicidade do edital de licitação deve ser realizada mediante divulgação completa no{' '}
                <strong className="text-ink-900">Portal Nacional de Contratações Públicas (PNCP)</strong>{' '}
                e publicação de um <strong className="text-ink-900">extrato</strong> no Diário Oficial da
                União, do Estado, do Distrito Federal ou do Município, bem como em jornal de grande
                circulação. Esse procedimento garante a ampla divulgação e o acesso à informação para
                todos os interessados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
