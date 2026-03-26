'use client'

import { useEffect, useState } from 'react'

interface Props {
  title: string
  date: string
}

export default function PdfDownloadTrigger({ title, date }: Props) {
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading')

  useEffect(() => {
    const generate = async () => {
      try {
        // Dynamic import — avoids SSR/window issues
        const html2pdf = (await import('html2pdf.js')).default as any
        const element = document.getElementById('report-content')
        if (!element) {
          setStatus('error')
          return
        }

        // Wait for React hydration + ReactMarkdown to fully render in DOM
        await new Promise((resolve) => setTimeout(resolve, 800))

        // Apply inline page-break styles BEFORE html2pdf measures element heights
        // (injecting a <style> tag fires after measurement and has no effect)
        const breakTargets: HTMLElement[] = []
        element.querySelectorAll('table,thead,tbody,tr,blockquote,li,h1,h2,h3,h4,section').forEach(el => {
          const h = el as HTMLElement
          h.style.pageBreakInside = 'avoid'
          h.style.breakInside = 'avoid'
          breakTargets.push(h)
        })

        const safeTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 60)
        const safeDate = date.replace(/[^a-z0-9]/gi, '-').toLowerCase()
        const filename = `${safeTitle}-${safeDate}.pdf`

        await html2pdf()
          .set({
            margin: [12, 14, 12, 14],
            filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
          })
          .from(element)
          .save()

        breakTargets.forEach(el => { el.style.pageBreakInside = ''; el.style.breakInside = '' })

        setStatus('done')
      } catch (err) {
        console.error('PDF generation failed', err)
        setStatus('error')
      }
    }

    generate()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'loading') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-sm font-semibold text-slate-800">Generating PDF…</div>
          <div className="text-xs text-slate-500 mt-1">This may take a few seconds</div>
        </div>
      </div>
    )
  }

  return null
}
