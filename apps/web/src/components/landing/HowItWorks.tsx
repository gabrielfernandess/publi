const etapas = [
  { num: '01', titulo: 'Você envia o pedido', texto: 'Por WhatsApp, e-mail ou pelo próprio sistema. Verificamos o contrato e o saldo disponível.' },
  { num: '02', titulo: 'Formatamos o ato', texto: 'Cada veículo (DOU, DOE, Jornal) tem um padrão. Adaptamos para cada um e revisamos tudo.' },
  { num: '03', titulo: 'Enviamos e protocolamos', texto: 'Envio para DOU/DOE e protocolo nos jornais, no tempo certo para a data solicitada.' },
  { num: '04', titulo: 'Conferimos a publicação', texto: 'Baixamos o PDF publicado, salvamos o protocolo e arquivamos na pasta do órgão.' },
  { num: '05', titulo: 'Você recebe os PDFs', texto: 'Enviamos os PDFs com a confirmação de que a publicação está correta.' },
  { num: '06', titulo: 'Faturamento', texto: 'A NF sai do Conta Azul. Importação no sistema, baixa do saldo e acompanhamento do pagamento.' },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="py-20 lg:py-28 bg-ink-900 text-white relative overflow-hidden">
      <div className="container-page relative">
        <div className="max-w-2xl">
          <h2 className="font-sans text-3xl lg:text-5xl font-extrabold text-white text-balance">
            Da sua mensagem ao PDF arquivado, em <span className="text-accent-400">6 passos</span>.
          </h2>
          <p className="mt-5 text-lg text-white/70">
            Você acompanha cada passo no sistema — status em tempo real, PDFs salvos, saldo atualizado. Sem planilha, sem ligação perdida.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10">
          {etapas.map((e) => (
            <div key={e.num} className="bg-ink-900 p-6 lg:p-8 group hover:bg-brand-900/30 transition-colors">
              <div className="flex items-baseline gap-3">
                <span className="text-xs font-mono font-semibold text-accent-400/80">{e.num}</span>
                <h3 className="text-lg font-semibold text-white">{e.titulo}</h3>
              </div>
              <p className="mt-3 text-sm text-white/60 leading-relaxed">{e.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
