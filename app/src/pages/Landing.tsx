import { Link } from 'react-router-dom'
import { Upload, Wand2, TrendingUp, ShieldCheck, PieChart, Wallet, ArrowRight, ChevronDown } from 'lucide-react'
import { useThemeStore } from '../stores/theme'
import logoLight from '../../assets/logo-2-light-mode.png'
import logoDark from '../../assets/logo-2-dark-mode.png'
import type { ComponentType } from 'react'
import useInView from '../hooks/useInView'

export default function LandingPage() {
  const { theme } = useThemeStore()
  const DotLottie = 'dotlottie-wc' as unknown as ComponentType<any>
  const [howRef, howInView] = useInView<HTMLDivElement>()
  const [whyRef, whyInView] = useInView<HTMLDivElement>()
  const [ctaRef, ctaInView] = useInView<HTMLDivElement>()
  return (
    <div className="min-h-screen bg-bg text-text">
      {/* Header */}
      <header className="fixed top-4 left-0 right-0 z-50">
        <div className="mx-auto py-2 px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="card h-16 px-4 flex items-center justify-between shadow-lg max-w-screen-xl mx-auto" style={{ background: 'rgb(var(--card) / 0.85)', backdropFilter: 'saturate(180%) blur(8px)' }}>
            <Link to="/" className="flex items-center">
              <img src={theme === 'dark' ? logoDark : logoLight} alt="Coffer" className="h-10 md:h-11 object-contain" />
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/login" className="btn btn-ghost">Log in</Link>
              <Link to="/signup" className="btn btn-primary">Sign up</Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="w-full min-h-[calc(100vh-4rem)] pt-16 flex items-center relative bg-gradient-to-b from-transparent to-muted/20 overflow-hidden">
        {/* Lottie background */}
        <div aria-hidden className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none transform translate-y-8 md:translate-y-14">
          <DotLottie
            src="https://lottie.host/15da3b0d-e1cd-4b62-8468-8f2cacb07826/R62OxN5Zi2.lottie"
            speed="1"
            autoplay
            loop
            style={{ width: 'min(95vw, calc(100vh - 4rem))', height: 'min(95vw, calc(100vh - 4rem))', opacity: 0.2, display: 'block', transform: 'scale(0.8)' }}
          />
        </div>
        <div className="max-w-6xl mx-auto px-6 w-full text-center relative z-10">
          <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight mb-4">Take control of your money</h1>
          <p className="text-subtle text-base md:text-lg max-w-2xl mx-auto mb-8">
            Track spending, budgets, investments, and net worth in one beautiful dashboard.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link to="/signup" className="btn btn-primary">Get started</Link>
            <Link to="/login" className="btn btn-ghost">I already have an account</Link>
          </div>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <FeatureCard icon={Upload} title="Track transactions" desc="Import CSVs, auto-categorize, and see trends." />
            <FeatureCard icon={PieChart} title="Budget smarter" desc="Create budgets by category and monitor spend." />
            <FeatureCard icon={TrendingUp} title="Invest with clarity" desc="See holdings, performance, and allocations." />
          </div>
        </div>
        <a href="#how-it-works" aria-label="Scroll to how it works" className="absolute left-1/2 -translate-x-1/2 bottom-6 text-subtle flex flex-col items-center gap-1 z-10">
          <ChevronDown className="animate-bounce" size={20} />
        </a>
      </section>

      {/* Section: How it works */}
      <section id="how-it-works" className="w-full py-16 md:py-24">
        <div ref={howRef} className={`max-w-6xl mx-auto px-6 w-full grid md:grid-cols-2 items-center gap-10 transition-all duration-700 ${howInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}> 
          <div>
            <div className="mb-6">
              <h2 className="font-display text-2xl md:text-4xl font-bold tracking-tight mb-3 text-left">How it works</h2>
              <p className="text-subtle max-w-xl">Three simple steps to understand your money and make better decisions.</p>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <StepCard number={1} title="Import or connect" desc="Bring in your transactions from CSVs or connect your accounts." icon={Upload} />
              <StepCard number={2} title="Categorize & budget" desc="Auto-categorize with rules, then set monthly budgets by category." icon={Wand2} />
              <StepCard number={3} title="Track & optimize" desc="See trends, allocations, and progress toward goals over time." icon={TrendingUp} />
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <DotLottie
              src="https://lottie.host/61b2d87f-5d93-4049-bee9-bf28d62a7c9d/tyeV4Jodhm.lottie"
              speed="1"
              autoplay
              loop
              style={{ width: 'min(40vw, 28rem)', height: 'min(40vw, 28rem)' }}
            />
          </div>
        </div>
      </section>

      {/* Section: Why Coffer */}
      <section id="why-coffer" className="w-full py-16 md:py-24">
        <div ref={whyRef} className={`max-w-6xl mx-auto px-6 w-full grid md:grid-cols-2 items-center gap-10 transition-all duration-700 ${whyInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}> 
          <div className="flex justify-center md:justify-start">
            <DotLottie
              src="https://lottie.host/8044fb9e-bb4a-44ae-84e3-46bc3a76419b/2eCuFtcWOM.lottie"
              speed="1"
              autoplay
              loop
              style={{ width: 'min(40vw, 28rem)', height: 'min(40vw, 28rem)' }}
            />
          </div>
          <div>
            <div className="mb-6 text-right md:text-right">
              <h2 className="font-display text-2xl md:text-4xl font-bold tracking-tight mb-3">Why Coffer</h2>
              <p className="text-subtle md:ml-auto md:max-w-xl">Privacy-first personal finance with clear insights and a delightful experience.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 text-left md:text-left">
              <FeatureCard icon={Wallet} title="All accounts in one place" desc="Accounts, assets, and liabilities unified for a true net worth view." />
              <FeatureCard icon={ShieldCheck} title="Privacy by default" desc="Your data stays yours. Local-first mindset with secure sync options." />
              <FeatureCard icon={PieChart} title="Beautiful reports" desc="Charts and breakdowns that make it easy to spot trends quickly." />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section id="get-started" className="w-full py-16 md:py-24">
        <div ref={ctaRef} className={`max-w-6xl mx-auto px-6 w-full transition-all duration-700 ${ctaInView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="card p-6 md:p-8 text-center">
            <h3 className="font-display text-xl md:text-2xl font-semibold mb-2">Ready to build better money habits?</h3>
            <p className="text-subtle mb-6">Join Coffer today and start tracking what matters in minutes.</p>
            <Link to="/signup" className="btn btn-primary inline-flex items-center gap-2">
              Get started <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-8 py-8">
        <div className="mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="card p-5 md:p-6 shadow-lg max-w-screen-xl mx-auto" style={{ background: 'rgb(var(--card) / 0.85)', backdropFilter: 'saturate(180%) blur(8px)' }}>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm text-subtle">
              <div className="justify-self-start">© Callum O'Connor 2025</div>
              <div className="flex items-center gap-3 opacity-80 justify-self-center">
                <a href="#how-it-works" className="btn btn-ghost btn-sm">How it works</a>
                <a href="#why-coffer" className="btn btn-ghost btn-sm">Why Coffer</a>
                <a href="#get-started" className="btn btn-ghost btn-sm">Get started</a>
              </div>
              <div className="flex items-center gap-2 justify-self-end">
                <img src={theme === 'dark' ? logoDark : logoLight} alt="Coffer" className="h-7 object-contain" />
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

type IconType = ComponentType<{ size?: number; className?: string }>

function FeatureCard({ icon: Icon, title, desc }: { icon: IconType, title: string, desc: string }) {
  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-muted text-accent">
          <Icon size={18} />
        </span>
        <div>
          <div className="text-base font-semibold mb-1">{title}</div>
          <div className="text-subtle text-sm">{desc}</div>
        </div>
      </div>
    </div>
  )
}

function StepCard({ number, title, desc, icon: Icon }: { number: number, title: string, desc: string, icon: IconType }) {
  return (
    <div className="card p-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-accent text-white font-semibold">{number}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Icon size={16} className="text-accent" />
            <div className="text-base font-semibold">{title}</div>
          </div>
          <div className="text-subtle text-sm">{desc}</div>
        </div>
      </div>
    </div>
  )
}

// Removed backdrop styling per design direction

