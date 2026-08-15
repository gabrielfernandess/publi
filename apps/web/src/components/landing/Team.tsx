export function Team() {
  return (
    <section id="cobertura-detalhes" className="py-20 lg:py-28 bg-white">
      <div className="container-page">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono tabular-nums tracking-widest uppercase text-brand-600 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-500" />
              6 estados · 1 país
            </div>
            <h2 className="mt-4 font-serif text-3xl lg:text-[2.75rem] font-bold text-ink-900 text-balance leading-[1.1]">
              Cobertura nacional, atendimento regional.
            </h2>
            <p className="mt-5 text-lg text-ink-600 text-balance leading-relaxed">
              Estamos em Pará, Maranhão, Tocantins, Mato Grosso, Paraná e Santa Catarina — com equipes dedicadas
              em cada praça. Por trás de cada protocolo tem gente acompanhando o processo do primeiro contato à
              entrega do PDF.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-6 max-w-sm">
              <div className="border-t-2 border-ink-100 pt-4">
                <div className="font-serif text-2xl font-bold text-ink-900 tabular-nums">6 estados</div>
                <p className="text-xs text-ink-500 mt-1">em operação ativa</p>
              </div>
              <div className="border-t-2 border-ink-100 pt-4">
                <div className="font-serif text-2xl font-bold text-ink-900 tabular-nums">1 dia</div>
                <p className="text-xs text-ink-500 mt-1">útil de resposta no primeiro contato</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <img
              src="/mapa-cobertura.png"
              alt="Mapa de cobertura da Publi Legal — Pará, Maranhão, Tocantins, Mato Grosso, Paraná e Santa Catarina"
              className="w-full h-auto object-contain rounded-2xl border border-ink-100 shadow-soft bg-white p-4"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
