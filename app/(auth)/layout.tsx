import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In — PulseLoop',
  description: 'Sign in to your PulseLoop Market Intelligence OS account.',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex gradient-dark">
      {/* Left: Auth form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        {children}
      </div>

      {/* Right: Branding panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] flex-col justify-center px-12 py-16 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #6366F1 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute top-[-80px] right-[-80px] w-[300px] h-[300px] rounded-full opacity-10 bg-white" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[200px] h-[200px] rounded-full opacity-10 bg-white" />

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">PulseLoop</span>
          </div>

          <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
            Your weekly<br />intelligence loop<br />starts here.
          </h2>

          <p className="text-white/70 text-sm leading-relaxed mb-8 max-w-sm">
            18 EU signal sources → trend reports, dashboards, signal briefs,
            newsletters, and LinkedIn posts — all in your brand voice.
          </p>

          {/* Testimonial / stat */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
            <p className="text-white/90 text-sm font-medium mb-2">
              &ldquo;Replaced 5 tools and saves me 10+ hours every week.&rdquo;
            </p>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold text-white">
                MC
              </div>
              <span className="text-white/60 text-xs">Marie C. — B2B SaaS Consultant, Paris</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
