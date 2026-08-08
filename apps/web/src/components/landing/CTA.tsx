'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin, Send, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';

export function CTA() {
  const [enviado, setEnviado] = useState(false);

  return (
    <section id="contato" className="py-20 lg:py-28 bg-white">
      <div className="container-page">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <div>
            <p className="text-sm font-bold text-brand-600 uppercase tracking-widest">Fale com a gente</p>
            <h2 className="mt-3 font-sans text-3xl lg:text-5xl font-extrabold text-ink-900 text-balance">
              Tem uma licitação pra publicar? Conta pra gente.
            </h2>
            <p className="mt-5 text-lg text-ink-600 text-balance">
              Manda mensagem ou e-mail. Respondemos em até 1 dia útil com prazo, custo e plano de publicação.
            </p>

            <div className="mt-10 space-y-4">
              <a href="mailto:contato@publilegal.com.br" className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-ink-500 uppercase tracking-wider">E-mail</div>
                  <div className="text-sm font-medium text-ink-900">contato@publilegal.com.br</div>
                </div>
              </a>
              <a href="https://wa.me/5500900000000" target="_blank" rel="noreferrer" className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white transition-colors">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-ink-500 uppercase tracking-wider">WhatsApp</div>
                  <div className="text-sm font-medium text-ink-900">(00) 00000-0000</div>
                </div>
              </a>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-ink-500 uppercase tracking-wider">Sede</div>
                  <div className="text-sm font-medium text-ink-900">Maranhão, Brasil</div>
                </div>
              </div>
            </div>

            <div className="mt-10 p-5 rounded-xl bg-accent-50 border border-accent-200">
              <p className="text-sm text-ink-700 leading-relaxed">
                <strong className="text-accent-700">Já é cliente?</strong> Entra no sistema pra ver seus pedidos, saldos e NFs em aberto.
              </p>
              <Link href="/login" className="mt-3 inline-block">
                <Button variant="lime" size="sm" rounded="md">Entrar no sistema →</Button>
              </Link>
            </div>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); setEnviado(true); }}
            className="bg-white rounded-2xl p-6 lg:p-8 border border-ink-100 shadow-lift"
          >
            {enviado ? (
              <div className="py-12 text-center">
                <div className="w-16 h-16 mx-auto rounded-pill bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Check className="w-8 h-8" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-ink-900">Mensagem enviada!</h3>
                <p className="mt-2 text-sm text-ink-600">A gente te responde em até 1 dia útil.</p>
                <button
                  type="button"
                  onClick={() => setEnviado(false)}
                  className="mt-6 text-sm text-brand-600 hover:underline"
                >
                  Enviar outra mensagem
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-semibold text-ink-900">Envie sua mensagem</h3>
                <p className="text-sm text-ink-500 mt-1">Responderemos o mais rápido possível.</p>
                <div className="mt-6 space-y-4">
                  <Input label="Nome completo" placeholder="Maria Silva" required rounded="md" />
                  <Input label="E-mail" type="email" placeholder="voce@prefeitura.gov.br" required rounded="md" />
                  <Input label="Órgão" placeholder="Prefeitura / Câmara / Autarquia" rounded="md" />
                  <Textarea label="Mensagem" placeholder="Conte um pouco sobre a demanda de publicação..." required rounded="md" />
                  <Button variant="primary" type="submit" fullWidth size="lg" rounded="pill">
                    <Send className="w-4 h-4" />
                    Enviar mensagem
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
