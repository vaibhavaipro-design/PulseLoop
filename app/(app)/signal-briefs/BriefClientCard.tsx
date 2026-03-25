'use client'

import { useState, useTransition } from 'react'
import { toggleBriefShare } from '@/app/actions/briefs'
import Link from 'next/link'

export default function BriefClientCard({ brief, appUrl }: { brief: any, appUrl: string }) {
  const [isPending, startTransition] = useTransition()
  const [copied, setCopied] = useState(false)

  const shareUrl = `${appUrl}/share/${brief.share_id}`

  const handleToggleShare = () => {
    startTransition(() => {
      toggleBriefShare(brief.id, !brief.share_active)
    })
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Extract a tiny snippet of the text
  const snippet = brief.content_md?.slice(0, 100).replace(/#/g, '').trim() + '...'

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col relative group">
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            {((brief.trend_reports as any)?.niches as any)?.name ?? 'General'}
          </span>
        </div>
        
        <h3 className="font-bold text-slate-800 text-base leading-snug mb-2 line-clamp-2">
          {(brief.trend_reports as any)?.title ?? 'Signal Brief'}
        </h3>
        
        <p className="text-xs text-slate-500 mb-4 line-clamp-3">
          {snippet}
        </p>
        
        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={brief.share_active} 
                onChange={handleToggleShare}
                disabled={isPending}
              />
              <div className={`block w-8 h-4.5 rounded-full transition-colors ${brief.share_active ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
              <div className={`dot absolute left-0.5 top-0.5 bg-white w-3.5 h-3.5 rounded-full transition-transform ${brief.share_active ? 'transform translate-x-3.5' : ''}`}></div>
            </div>
            <span className="text-[11px] font-semibold text-slate-600">
              {brief.share_active ? 'Public' : 'Private'}
            </span>
          </label>
          
          <Link href={`/share/${brief.share_id}`} target="_blank" className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
            View preview →
          </Link>
        </div>
        
        {/* Copy Link overlay */}
        {brief.share_active && (
          <div className="mt-3">
            <div className="flex rounded-md overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
              <input 
                type="text" 
                readOnly 
                value={shareUrl} 
                className="flex-1 px-3 py-1.5 bg-slate-50 text-[11px] text-slate-500 outline-none"
              />
              <button 
                onClick={handleCopy}
                className="px-3 py-1.5 bg-white text-[11px] font-bold text-slate-700 hover:bg-slate-50 border-l border-slate-200 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {isPending && (
        <div className="absolute top-0 left-0 w-full h-0.5 bg-slate-100 overflow-hidden">
          <div className="w-1/3 h-full bg-indigo-500 rounded-full animate-ping" />
        </div>
      )}
    </div>
  )
}
