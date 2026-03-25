'use client'

import { useState } from 'react'
import LockedFeature from '@/components/ui/LockedFeature'
import type { Plan } from '@/lib/plans'

const VARIANT_COLORS: Record<string, string> = {
  insight: 'bg-blue-50 text-blue-700 border-blue-100',
  story: 'bg-violet-50 text-violet-700 border-violet-100',
  contrarian: 'bg-rose-50 text-rose-700 border-rose-100',
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className="h-7 px-3 text-[11px] font-bold text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function PostCard({ post }: { post: any }) {
  const [expanded, setExpanded] = useState(false)
  const newsletter = post.newsletters as any
  const report = newsletter?.trend_reports as any
  const niche = report?.niches?.name ?? 'General'
  const title = report?.title ?? 'Trend Report'
  const variants: Array<{ type: string; content: string }> = Array.isArray(post.variants)
    ? post.variants
    : []

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            {niche}
          </span>
          {variants.length > 0 && (
            <span className="text-[10px] text-slate-400 font-semibold">
              {variants.length} variant{variants.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <p className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 mb-3">{title}</p>

        {/* Variant preview chips */}
        <div className="flex gap-2 flex-wrap">
          {variants.map((v, i) => (
            <span
              key={i}
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${VARIANT_COLORS[v.type] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}
            >
              {v.type}
            </span>
          ))}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 mt-3"
        >
          {expanded ? 'Hide posts ↑' : 'View posts ↓'}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 p-5 space-y-4">
          {variants.map((v, i) => (
            <div key={i} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${VARIANT_COLORS[v.type] ?? 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                  {v.type}
                </span>
                <CopyButton text={v.content} />
              </div>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                {v.content}
              </p>
              <div className="flex justify-end mt-3 pt-3 border-t border-slate-100">
                <span className="text-[10px] text-slate-400 font-medium">
                  {v.content.length} characters
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function LinkedInClient({
  posts,
  plan,
  locked,
}: {
  posts: any[]
  plan: Plan
  locked: boolean
}) {
  if (locked) {
    return (
      <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
        <LockedFeature feature="LinkedIn Posts" requiredPlan="Pro">
          <p className="text-xs text-slate-500 mt-2">
            3 post variants per newsletter — insight, story, and contrarian angles — all in your brand voice.
          </p>
        </LockedFeature>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">LinkedIn Posts</h1>
        <p className="text-sm text-slate-500">
          3 variants per newsletter — insight, story, and contrarian angles.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center bg-white border border-slate-200 rounded-xl">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-3xl">💼</div>
          <h2 className="text-lg font-bold text-slate-800">No LinkedIn posts yet</h2>
          <p className="text-sm text-slate-500 max-w-sm">
            LinkedIn posts are automatically generated when you create a newsletter. Head to Newsletters to get started.
          </p>
          <a href="/newsletters" className="mt-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            Go to Newsletters →
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
