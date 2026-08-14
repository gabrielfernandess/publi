import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-brand-900 text-white pt-16 pb-8">
      <div className="container-page">
        <div className="grid md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
          <div className="md:col-span-2">
            <div>
              <img src="/logo-mark-white.png?v=4" alt="Publi Legal" className="h-14 w-auto" />
            </div>
            <p className="mt-4 text-sm text-white/60 max-w-md leading-relaxed">
              Publicação de atos oficiais em DOU, DOE e Jornais de Grande Circulação. Atendemos prefeituras,
              câmaras e autarquias em todo o Brasil.
            </p>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-widest font-semibold text-accent-300">Navegação</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-white/70">
              <li><a href="#sobre" className="hover:text-white transition-colors">Quem somos</a></li>
              <li><a href="#servicos" className="hover:text-white transition-colors">Serviços</a></li>
              <li><a href="#metodo" className="hover:text-white transition-colors">Método PubliLegal</a></li>
              <li><a href="#resultados" className="hover:text-white transition-colors">Resultados</a></li>
              <li><a href="#contato" className="hover:text-white transition-colors">Contato</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs uppercase tracking-widest font-semibold text-accent-300">Acesso</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-white/70">
              <li><Link href="/login" className="hover:text-white transition-colors">Acessar sistema</Link></li>
              <li><a href="#contato" className="hover:text-white transition-colors">Solicitar proposta</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-white/50">
          <div>© {new Date().getFullYear()} Publi Legal. Todos os direitos reservados.</div>
          <div className="flex items-center gap-4">
            <span>CNPJ: 00.000.000/0001-00</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">Maranhão · Pará · Tocantins</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
