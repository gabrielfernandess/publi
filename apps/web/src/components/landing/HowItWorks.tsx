import { Send, Wallet, FileCheck2 } from 'lucide-react';

const passos = [
  {
    num: '01',
    icon: Send,
    titulo: 'Você envia o arquivo',
    texto:
      'Mande o documento sem formatação por um único canal da sua escolha — WhatsApp ou e-mail. Pronto, a partir daqui é com a gente.',
  },
  {
    num: '02',
    icon: Wallet,
    titulo: 'Publicamos e pagamos',
    texto:
      'Garantimos a publicação nos diários e jornais necessários e cuidamos de todos os pagamentos dentro do prazo.',
  },
  {
    num: '03',
    icon: FileCheck2,
    titulo: 'No próximo dia útil, você recebe o PDF',
    texto:
      'Enviamos o PDF das publicações para você anexar ao seu processo. Sem gestão manual, sem risco de atrasos ou esquecimentos.',
  },
];

export function HowItWorks() {
  return (
    <section id="metodo" className="py-20 lg:py-28 bg-ink-900 text-white">
      <div className="container-page">
        <div className="max-w-2xl">
          <h2 className="font-serif text-3xl lg:text-[2.75rem] font-bold text-white text-balance leading-[1.1]">
            Método PubliLegal
          </h2>
          <p className="mt-5 text-lg text-white/60 leading-relaxed">
            Três passos, do seu envio ao PDF arquivado — sem gestão manual e sem risco de esquecimentos.
          </p>
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-px bg-white/10 rounded-2xl overflow-hidden border border-white/10">
          {passos.map((p) => (
            <div key={p.num} className="bg-ink-900 p-6 lg:p-8 hover:bg-brand-900/40 transition-colors">
              <div className="flex items-center justify-between mb-5">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  <p.icon className="w-5 h-5 text-accent-300" />
                </div>
                <span className="text-xs font-mono text-white/30">{p.num}</span>
              </div>
              <h3 className="font-serif text-lg font-semibold text-white">{p.titulo}</h3>
              <p className="mt-3 text-sm text-white/60 leading-relaxed">{p.texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
