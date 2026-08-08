import { Building2, ScrollText, MapPin } from 'lucide-react';

const tipos = [
  { icon: Building2, titulo: 'Prefeituras', descricao: 'Atos de licitações, contratos, homologações e publicações oficiais em geral.' },
  { icon: ScrollText, titulo: 'Câmaras Municipais', descricao: 'Atos legislativos, editais, atas e demais publicações oficiais do legislativo.' },
  { icon: MapPin, titulo: 'Autarquias e outros órgãos', descricao: 'Publicação em diário oficial com formatação conforme exigência do veículo.' },
];

export function Clients() {
  return (
    <section id="clientes" className="py-20 lg:py-28 bg-soft-gradient">
      <div className="container-page">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-bold text-brand-600 uppercase tracking-widest">Quem a gente atende</p>
          <h2 className="mt-3 font-sans text-3xl lg:text-5xl font-extrabold text-ink-900 text-balance">
            Prefeituras, câmaras e autarquias
          </h2>
          <p className="mt-5 text-lg text-ink-600">
            Mais de 20 órgãos públicos em todo o Brasil. De câmaras pequenas a prefeituras grandes — a gente cuida do mesmo jeito.
          </p>
        </div>

        <div className="mt-12 grid md:grid-cols-3 gap-6">
          {tipos.map((t) => (
            <div key={t.titulo} className="group bg-white rounded-2xl p-7 border border-ink-100 shadow-soft hover:shadow-lift transition-all">
              <div className="w-12 h-12 rounded-xl bg-brand-600 text-white flex items-center justify-center mb-5 group-hover:bg-lime-gradient group-hover:text-brand-900 transition-all">
                <t.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-ink-900">{t.titulo}</h3>
              <p className="mt-2 text-sm text-ink-600 leading-relaxed">{t.descricao}</p>
            </div>
          ))}
        </div>

        <div className="mt-14 bg-brand-900 rounded-3xl p-8 lg:p-12 text-white relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <p className="text-sm font-bold text-accent-400 uppercase tracking-widest">Estados atendidos</p>
            <h3 className="mt-2 font-sans text-2xl lg:text-3xl font-extrabold text-white text-balance">
              Publicações em todas as regiões do Brasil
            </h3>
            <div className="mt-8 flex flex-wrap gap-2">
              {['MA', 'TO', 'PR', 'PA', 'MT', 'DF', 'SP', 'RJ', 'MG', 'BA', 'PE', 'CE', 'RN', 'PB', 'AL', 'SE', 'PI', 'GO', 'MS', 'RS', 'SC', 'ES', 'AM', 'RO', 'AC', 'AP', 'RR'].map((uf) => (
                <span key={uf} className="px-3 py-1.5 rounded-md glass text-sm font-semibold tracking-wider">
                  {uf}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
