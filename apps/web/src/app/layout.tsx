import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Publi Legal — Publicidade Legal em Diários Oficiais',
  description: 'Publicação de atos oficiais em DOU, DOE e Jornais de Grande Circulação para prefeituras, câmaras e órgãos públicos.',
  keywords: ['publicidade legal', 'diário oficial', 'DOU', 'DOE', 'jornal de grande circulação', 'licitação', 'prefeitura', 'câmara'],
  authors: [{ name: 'Publi Legal' }],
  openGraph: {
    title: 'Publi Legal',
    description: 'Publicidade legal em Diários Oficiais para prefeituras e câmaras',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Sora:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
