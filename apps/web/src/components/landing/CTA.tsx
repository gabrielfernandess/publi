'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Phone, Instagram, Send, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';

export function CTA() {
  const [enviado, setEnviado] = useState(false);

  return (
    <section id="contato" className="py-20 lg:py-28 bg-soft-gradient">
      <div className="container-page">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
          <div>
            <h2 className="font-serif text-3xl lg:text-[2.75rem] font-bold text-ink-900 text-balance leading-[1.1]">
              Tem uma licitação para publicar? Fale conosco.
            </h2>
            <p className="mt-5 text-lg text-ink-600 text-balance leading-relaxed">
              Envie mensagem ou e-mail. Respondemos em até 1 dia útil com prazo, custo e plano de publicação.
            </p>

            <div className="mt-10 space-y-4">
              <a
                href="https://wa.me/559984205390"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-lg bg-white border border-ink-200 text-brand-700 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white group-hover:border-brand-600 transition-colors">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-ink-500">WhatsApp</div>
                  <div className="text-sm font-medium text-ink-900">(99) 98420-5390</div>
                </div>
              </a>

              <a
                href="mailto:publilegalcomercial@gmail.com"
                className="flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-lg bg-white border border-ink-200 text-brand-700 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white group-hover:border-brand-600 transition-colors">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-ink-500">E-mail</div>
                  <div className="text-sm font-medium text-ink-900">
                    publilegalcomercial@gmail.com
                  </div>
                </div>
              </a>

              <a
                href="https://instagram.com/agenciapublilegal"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-lg bg-white border border-ink-200 text-brand-700 flex items-center justify-center group-hover:bg-brand-600 group-hover:text-white group-hover:border-brand-600 transition-colors">
                  <Instagram className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs text-ink-500">Instagram</div>
                  <div className="text-sm font-medium text-ink-900">@agenciapublilegal</div>
                </div>
              </a>
            </div>

            <div className="mt-10 p-5 rounded-xl bg-white border border-ink-200">
              <p className="text-sm text-ink-700 leading-relaxed">
                <strong className="text-ink-900">Já é cliente?</strong> Entre no sistema para ver seus
                pedidos, saldos e NFs em aberto.
              </p>
              <Link href="/login" className="mt-3 inline-block">
                <Button variant="lime" size="sm" rounded="md">
                  Entrar no sistema
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setEnviado(true);
            }}
            className="bg-white rounded-xl p-6 lg:p-8 shadow-soft"
          >
            {enviado ? (
              <div className="py-12 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Check className="w-7 h-7" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-ink-900">Mensagem enviada!</h3>
                <p className="mt-2 text-sm text-ink-600">Respondemos em até 1 dia útil.</p>
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
                <h3 className="text-lg font-semibold text-ink-900">Envie sua mensagem</h3>
                <p className="text-sm text-ink-500 mt-1">
                  Responderemos o mais rápido possível.
                </p>
                <div className="mt-6 space-y-4">
                  <Input
                    label="Nome completo"
                    placeholder="Maria Silva"
                    required
                    rounded="md"
                  />
                  <Input
                    label="E-mail"
                    type="email"
                    placeholder="voce@prefeitura.gov.br"
                    required
                    rounded="md"
                  />
                  <Input
                    label="Órgão"
                    placeholder="Prefeitura / Câmara / Autarquia"
                    rounded="md"
                  />
                  <Textarea
                    label="Mensagem"
                    placeholder="Conte um pouco sobre a demanda de publicação..."
                    required
                    rounded="md"
                  />
                  <Button variant="primary" type="submit" fullWidth size="lg" rounded="lg">
                    <Send className="w-4 h-4 mr-1.5" />
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
