'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const links = [
  { href: '#sobre', label: 'Sobre' },
  { href: '#servicos', label: 'Serviços' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#clientes', label: 'Clientes' },
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
        scrolled ? 'bg-brand-900/95 backdrop-blur-md border-b border-white/5' : 'bg-transparent'
      )}
    >
      <div className="container-page flex items-center justify-between h-16 lg:h-20">
        <Link href="/">
          <img src="/logo-clean-white.png" alt="Publi Legal" className="h-9 w-auto hover:opacity-90 transition-opacity" />
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="px-4 py-2 text-sm text-white/80 hover:text-white transition-colors rounded-md"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <Link href="/login">
            <Button variant="lime" size="md" className="rounded-pill">
              Acessar sistema
            </Button>
          </Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="lg:hidden text-white p-2 -mr-2"
          aria-label="Menu"
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden bg-brand-900/95 backdrop-blur-md border-t border-white/5 animate-fade-in">
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
              <Button variant="lime" fullWidth className="rounded-pill">Acessar sistema</Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
