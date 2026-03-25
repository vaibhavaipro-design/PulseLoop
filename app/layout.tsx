import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PulseLoop — Market Intelligence OS',
  description: 'Weekly Market Intelligence Operating System for French and EU B2B SaaS consultants and agencies. Turn 18 signal sources into trend reports, dashboards, signal briefs, newsletters, and LinkedIn posts.',
  keywords: ['market intelligence', 'B2B SaaS', 'trend report', 'signal brief', 'newsletter', 'LinkedIn', 'EU', 'France'],
  authors: [{ name: 'PulseLoop' }],
  openGraph: {
    title: 'PulseLoop — Market Intelligence OS',
    description: 'Turn 18 signal sources into weekly intelligence for B2B SaaS consultants.',
    type: 'website',
    locale: 'en_EU',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
      </body>
    </html>
  )
}
