const etapas = [
  { num: '01', titulo: 'Você manda o pedido', texto: 'WhatsApp, e-mail ou pelo próprio sistema. A gente já puxa o contrato e vê o saldo.' },
  { num: '02', titulo: 'A gente formata', texto: 'Cada veículo (DOU, DOE, Jornal) tem um padrão. A gente adapta pra cada um e revisa tudo.' },
  { num: '03', titulo: 'A gente envia', texto: 'Enviamos pro DOU/DOE e protocolamos nos jornais. No timing certo pra data que você pediu.' },
  { num: '04', titulo: 'A gente confere', texto: 'Baixamos o PDF publicado, salvamos o protocolo e arquivamos na pasta do órgão.' },
  { num: '05', titulo: 'Você recebe', texto: 'Mandamos os PDFs pra você com a confirmação de que tá tudo certo.' },
  { num: '06', titulo: 'A gente fatura', texto: 'NF sai do Conta Azul. Você importa no sistema, a gente baixa o saldo e acompanha o pagamento.' },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="py-20 lg:py-28 bg-ink-900 text-white relative overflow-hidden">
      <div className="absolute inset-0 grid-bg-dark opacity-40" />
      <div className="container-page relative">
        <div className="max-w-2xl">
          <p className="text-sm font-bold text-accent-400 uppercase tracking-widest">Como funciona</p>
          <h2 className="mt-3 font-sans text-3xl lg:text-5xl font-extrabold text-white text-balance">
            Da sua mensagem ao PDF arquivado, em <span className="text-accent-400">6 passos</span>.
          </h2>
          <p className="mt-5 text-lg text-white/70">
            Você vê cada passo no sistema — status em tempo real, PDFs salvos, saldo atualizado. Sem planilha, sem ligação perdida.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10">
          {etapas.map((e) => (
            <div key={e.num} className="bg-ink-900 p-6 lg:p-8 group hover:bg-brand-900/30 transition-colors">
              <div className="text-accent-400 font-sans font-extrabold text-3xl lg:text-4xl">{e.num}</div>
              <h3 className="mt-3 text-lg font-semibold text-white">{e.titulo}</h3>
              <p className="mt-2 text-sm text-white/60 leading-relaxed">{e.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
