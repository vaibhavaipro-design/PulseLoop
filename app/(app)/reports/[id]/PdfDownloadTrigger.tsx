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

        // Inject page-break protection so html2pdf doesn't slice mid-element
        const style = document.createElement('style')
        style.id = 'pdf-pagebreak-style'
        style.textContent = `
          #report-content table,
          #report-content thead,
          #report-content tbody,
          #report-content tr,
          #report-content blockquote,
          #report-content li,
          #report-content h1,
          #report-content h2,
          #report-content h3,
          #report-content h4,
          #report-content section {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        `
        document.head.appendChild(style)

        const safeTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 60)
        const safeDate = date.replace(/[^a-z0-9]/gi, '-').toLowerCase()
        const filename = `${safeTitle}-${safeDate}.pdf`

        await html2pdf()
          .set({
            margin: [12, 14, 12, 14],
            filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
          })
          .from(element)
          .save()

        // Clean up injected style
        document.getElementById('pdf-pagebreak-style')?.remove()

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
