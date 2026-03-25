'use client'

import { useState, useTransition } from 'react'
import { toggleNicheStatus, deleteNiche } from '@/app/actions/niches'
import { useRouter } from 'next/navigation'

interface NicheCardProps {
  niche: {
    id: string
    name: string
    slug: string
    is_active: boolean
    last_scraped_at: string | null
    icon?: string
    description?: string
    keywords?: string[]
  }
  plan: string
  signalCount?: number
  reportCount?: number
  sourceCount?: number
  onEdit?: () => void
}

function formatLastScraped(date: string | null): string {
  if (!date) return 'Never'
  const now = new Date()
  const scraped = new Date(date)
  const diffMs = now.getTime() - scraped.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

export default function NicheClientCard({ niche, plan, signalCount = 0, reportCount = 0, sourceCount = 18, onEdit }: NicheCardProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const icon = niche.icon || '🎯'
  const isAgency = plan === 'agency'

  const handleToggle = () => {
    startTransition(() => {
      toggleNicheStatus(niche.id, !niche.is_active)
    })
  }

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this niche and all its signals? This cannot be undone.')) {
      startTransition(() => {
        deleteNiche(niche.id)
      })
    }
  }

  return (
    <div className={`bg-white border border-[#E4E4F0] rounded-[13px] overflow-hidden flex flex-col transition-opacity ${!niche.is_active ? 'opacity-60' : ''} ${isPending ? 'pointer-events-none' : ''}`}>
      {/* Top section: icon, name, description, keywords, toggle */}
      <div className="p-3.5 pb-2.5 flex items-start gap-2.5">
        <div
          className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-lg flex-shrink-0"
          style={{
            background: niche.is_active
              ? (isAgency ? 'rgba(245,166,35,0.12)' : '#EEEEFF')
              : '#F7F7FC'
          }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold text-[#1A1A3E] mb-0.5">{niche.name}</div>
          {niche.description && (
            <div className="text-[11px] text-[#6B6B8A] leading-[1.45]">{niche.description}</div>
          )}
          {niche.keywords && niche.keywords.length > 0 && (
            <div className="flex flex-wrap gap-[3px] mt-1.5">
              {niche.keywords.map((kw, i) => (
                <span key={i} className="bg-[#F7F7FC] text-[#6B6B8A] border border-[#E4E4F0] rounded-[5px] text-[10px] px-[5px] py-px">
                  {kw}
                </span>
              ))}
              {isAgency && (
                <span className="bg-[rgba(245,166,35,0.1)] border-[#F5D87A] border text-[#B07A00] rounded-[5px] text-[10px] px-[5px] py-px">
                  Custom signals ✦
                </span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={handleToggle}
          disabled={isPending}
          className={`w-[34px] h-[19px] rounded-full border-none cursor-pointer relative flex-shrink-0 transition-colors ${
            niche.is_active
              ? (isAgency ? 'bg-[#1A1A3E]' : 'bg-[#5B5FC7]')
              : 'bg-[#C5C5E0]'
          }`}
        >
          <div
            className="absolute top-[2px] w-[15px] h-[15px] bg-white rounded-full transition-all"
            style={{ left: niche.is_active ? '17px' : '2px' }}
          />
        </button>
      </div>

      {/* Stats row */}
      <div className="flex border-t border-[#E4E4F0]">
        {[
          { value: signalCount.toLocaleString(), label: 'Signals' },
          { value: reportCount.toString(), label: 'Reports' },
          { value: sourceCount.toString(), label: 'Sources' },
          { value: formatLastScraped(niche.last_scraped_at), label: 'Last scan' },
        ].map((stat, i) => (
          <div key={i} className={`flex-1 py-2 text-center ${i < 3 ? 'border-r border-[#E4E4F0]' : ''}`}>
            <div className={`text-xs font-bold ${!niche.is_active ? 'text-[#A0A0BE]' : 'text-[#1A1A3E]'}`}>
              {stat.value}
            </div>
            <div className="text-[9px] text-[#A0A0BE] uppercase tracking-[0.4px] mt-px">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Actions bar */}
      <div className="flex items-center gap-[3px] px-2.5 py-1.5 bg-[#F7F7FC] border-t border-[#E4E4F0]">
        <span className={`text-[10px] font-semibold px-2 py-[2px] rounded-full ${
          niche.is_active
            ? 'bg-[#E8F7EF] text-[#4CAF82]'
            : 'bg-[#FFF4E0] text-[#F5A623]'
        }`}>
          {niche.is_active ? '● Active' : '⏸ Paused'}
        </span>
        <div className="ml-auto flex gap-px">
          {niche.is_active && (
            <button
              onClick={() => router.push(`/reports?niche=${niche.id}`)}
              className="h-7 px-2 rounded-[7px] bg-transparent text-[#5B5FC7] text-[11px] font-medium border-none cursor-pointer hover:bg-[#EEEEFF] transition-colors"
            >
              Run report
            </button>
          )}
          <button
            onClick={onEdit}
            className="h-7 px-2 rounded-[7px] bg-transparent text-[#5B5FC7] text-[11px] font-medium border-none cursor-pointer hover:bg-[#EEEEFF] transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="h-7 px-1.5 rounded-[7px] bg-transparent text-[#A0A0BE] border-none cursor-pointer hover:bg-[#FDEAEA] hover:text-[#E85757] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-3 h-3">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
