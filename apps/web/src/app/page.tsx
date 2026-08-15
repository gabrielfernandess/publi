import { LandingHeader } from '@/components/landing/LandingHeader';
import { Hero } from '@/components/landing/Hero';
import { About } from '@/components/landing/About';
import { Services } from '@/components/landing/Services';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Clients } from '@/components/landing/Clients';
import { Team } from '@/components/landing/Team';
import { CTA } from '@/components/landing/CTA';
import { Footer } from '@/components/landing/Footer';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <LandingHeader />
      <Hero />
      <About />
      <Services />
      <HowItWorks />
      <Clients />
      <Team />
      <CTA />
      <Footer />
    </main>
  );
}
