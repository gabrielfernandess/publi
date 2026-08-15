'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const links = [
  { href: '#sobre', label: 'Quem somos' },
  { href: '#servicos', label: 'Serviços' },
  { href: '#metodo', label: 'Método' },
  { href: '#cobertura', label: 'Cobertura' },
  { href: '#equipe', label: 'Equipe' },
  { href: '#contato', label: 'Contato' },
];

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-40 transition-all duration-300',
        scrolled ? 'bg-brand-900 border-b border-white/10 shadow-sm' : 'bg-transparent'
      )}
    >
      <div className="container-page flex items-center justify-between h-16 lg:h-20">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <img
            src="/logo-header.jpg?v=1"
            alt="Publi Legal"
            className="h-10 w-auto hover:opacity-90 transition-opacity"
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-3.5 py-2 text-sm text-white/75 hover:text-white transition-colors rounded-md"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <Link href="/login">
            <Button variant="lime" size="md" rounded="lg">
              Acessar sistema
            </Button>
          </Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="lg:hidden text-white p-2 -mr-2"
          aria-label="Menu"
          aria-expanded={open}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden bg-brand-900 border-t border-white/10">
          <div className="container-page py-4 flex flex-col gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="px-4 py-3 text-white/80 hover:text-white hover:bg-white/5 rounded-md transition-colors"
              >
                {l.label}
              </a>
            ))}
            <Link href="/login" onClick={() => setOpen(false)} className="mt-2">
              <Button variant="lime" fullWidth rounded="lg">
                Acessar sistema
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
