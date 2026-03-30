'use client'

import type { SignalImage } from '@/lib/chart-types'

interface SignalImageGalleryProps {
  images: SignalImage[]
}

const PLATFORM_COLORS: Record<string, string> = {
  techcrunch:   'bg-green-100 text-green-700',
  frenchweb:    'bg-blue-100 text-blue-700',
  maddyness:    'bg-purple-100 text-purple-700',
  hacker_news:  'bg-orange-100 text-orange-700',
  google_news:  'bg-red-100 text-red-700',
  reddit:       'bg-orange-100 text-orange-800',
  bluesky:      'bg-sky-100 text-sky-700',
  producthunt:  'bg-rose-100 text-rose-700',
}

function platformLabel(platform: string): string {
  const labels: Record<string, string> = {
    techcrunch:   'TechCrunch',
    frenchweb:    'FrenchWeb',
    maddyness:    'Maddyness',
    hacker_news:  'Hacker News',
    google_news:  'Google News',
    reddit:       'Reddit',
    bluesky:      'Bluesky',
    producthunt:  'Product Hunt',
    substack:     'Substack',
  }
  return labels[platform] ?? platform
}

export default function SignalImageGallery({ images }: SignalImageGalleryProps) {
  if (!images || images.length === 0) return null

  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4">
        Key Figures from Sources
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((img) => (
          <a
            key={img.signal_id}
            href={img.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="signal-image-card group block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="aspect-video bg-slate-100 dark:bg-slate-700 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.source_image_url}
                alt={img.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  const target = e.currentTarget as HTMLImageElement
                  target.parentElement!.style.display = 'none'
                }}
              />
            </div>
            <div className="p-3">
              <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-snug mb-2">
                {img.title}
              </p>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${PLATFORM_COLORS[img.platform] ?? 'bg-slate-100 text-slate-600'}`}>
                  {platformLabel(img.platform)}
                </span>
                <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-medium group-hover:underline">
                  View source →
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
