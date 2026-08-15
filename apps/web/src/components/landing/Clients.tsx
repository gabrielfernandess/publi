import { Building2, ScrollText, MapPin } from 'lucide-react';

const tipos = [
  { icon: Building2, titulo: 'Prefeituras', descricao: 'Editais de licitação, extratos de contrato, homologações e publicações oficiais em geral.' },
  { icon: ScrollText, titulo: 'Câmaras Municipais', descricao: 'Atos legislativos, editais, atas e demais publicações oficiais do legislativo.' },
  { icon: MapPin, titulo: 'Autarquias e outros órgãos', descricao: 'Publicação em diário oficial com formatação conforme a exigência do veículo.' },
];

const estadosAtivos = ['PA', 'MA', 'TO', 'MT', 'PR', 'SC'];

export function Clients() {
  return (
    <section id="cobertura" className="py-20 lg:py-28 bg-soft-gradient">
      <div className="container-page">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="font-serif text-3xl lg:text-[2.75rem] font-bold text-ink-900 text-balance leading-[1.1]">
            Prefeituras, câmaras e autarquias
          </h2>
          <p className="mt-5 text-lg text-ink-600 text-balance leading-relaxed">
            Mais de 20 órgãos públicos em todo o Brasil. Das câmaras menores às prefeituras de maior porte — o mesmo padrão de atendimento.
          </p>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {tipos.map((t) => (
            <div key={t.titulo} className="group bg-white rounded-2xl p-7 border border-ink-100 shadow-soft hover:shadow-lift transition-all">
              <div className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center mb-5">
                <t.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-ink-900">{t.titulo}</h3>
              <p className="mt-2 text-sm text-ink-600 leading-relaxed">{t.descricao}</p>
            </div>
          ))}
        </div>

        {/* Badges de estados em operação */}
        <div className="mt-14 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-mono tabular-nums tracking-widest uppercase text-brand-600 font-semibold">
            <MapPin className="w-4 h-4" />
            {estadosAtivos.length} estados em operação
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {estadosAtivos.map((uf) => (
              <span key={uf} className="px-3 py-1.5 rounded-md bg-accent-400 text-brand-900 text-sm font-bold tracking-wider">
                {uf}
              </span>
            ))}
          </div>
          <p className="mt-5 text-sm text-ink-500 max-w-md mx-auto leading-relaxed">
            Atendemos solicitações de todo o Brasil — fale com a equipe para confirmar prazo no seu estado.
          </p>
        </div>
      </div>
    </section>
  );
}
