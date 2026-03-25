import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gradient-dark">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto px-6 animate-fade-in">
        {/* Logo / Brand */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-lg">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gradient">PulseLoop</h1>
          </div>
        </div>

        {/* Tagline */}
        <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
          Your Weekly
          <br />
          <span className="text-gradient">Market Intelligence OS</span>
        </h2>

        <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
          Turn 18 EU signal sources into trend reports, dashboards, signal briefs,
          newsletters, and LinkedIn posts — all in your brand voice, all cited.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl font-semibold text-white gradient-primary hover:opacity-90 transition-opacity shadow-lg"
            style={{ boxShadow: 'var(--shadow-glow)' }}
          >
            Start Free Trial →
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl font-semibold glass hover:bg-opacity-90 transition-all"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Sign In
          </Link>
        </div>

        {/* Trust indicators */}
        <p className="mt-8 text-sm" style={{ color: 'var(--color-text-tertiary)' }}>
          7-day full Pro trial · No credit card required · EU-hosted data
        </p>
      </div>

      {/* Feature highlights */}
      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto px-6 animate-slide-up">
        {[
          {
            icon: '📊',
            title: 'Trend Reports',
            description: '1,200+ word weekly briefs from 18 signal sources, every claim cited',
          },
          {
            icon: '✉️',
            title: 'Newsletter + LinkedIn',
            description: 'Full newsletter and 3 LinkedIn post variants in your brand voice',
          },
          {
            icon: '📈',
            title: 'Visual Dashboards',
            description: 'Client-ready dashboards with shareable links and PDF export',
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className="glass rounded-xl p-6 hover:border-opacity-30 transition-all"
            style={{ borderColor: 'var(--color-primary)' }}
          >
            <div className="text-3xl mb-4">{feature.icon}</div>
            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
