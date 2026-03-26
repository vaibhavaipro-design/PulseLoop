'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import NicheClientCard from './NicheClientCard'
import { createNiche, updateNiche } from '@/app/actions/niches'
import { createWorkspace, updateWorkspaceName, deleteWorkspace } from '@/app/actions/workspaces'
import Link from 'next/link'

interface NichesClientShellProps {
  user: any
  plan: string
  limits: any
  niches: any[]
  totalCount: number
  activeCount: number
  pausedCount: number
  totalSignals: number
  signalCountMap: Record<string, number>
  reportCountMap: Record<string, number>
  scrapeFreq: string
  workspaceName: string
  allWorkspaces?: { id: string; name: string }[]
  activeWorkspace?: { id: string; name: string }
}

export default function NichesClientShell({
  user, plan, limits, niches, totalCount, activeCount, pausedCount,
  totalSignals, signalCountMap, reportCountMap, scrapeFreq, workspaceName,
  allWorkspaces, activeWorkspace
}: NichesClientShellProps) {
  const [filter, setFilter] = useState<'all' | 'active' | 'paused'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [editingNicheId, setEditingNicheId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('🤖')
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [customSignalTypes, setCustomSignalTypes] = useState('')
  const [sources, setSources] = useState<string[]>(['googlenews', 'hackernews', 'reddit', 'github'])
  const [modalScrapeFreq, setModalScrapeFreq] = useState(plan === 'starter' || plan === 'trial' ? 'Every 6 hours (Starter)' : plan === 'pro' ? 'Every 2 hours (Pro)' : 'Every hour (Agency)')
  const [signalMemory, setSignalMemory] = useState('90 days')
  const [activateImmediately, setActivateImmediately] = useState(true)

  const [workspaceLoading, setWorkspaceLoading] = useState(false)

  const openNewModal = () => {
    setEditingNicheId(null)
    setName('')
    setSlug('')
    setDescription('')
    setKeywords([])
    setKeywordInput('')
    setCustomSignalTypes('')
    setIcon('🤖')
    setSources(['googlenews', 'hackernews', 'reddit', 'github'])
    setActivateImmediately(true)
    setShowModal(true)
  }

  const openEditModal = (niche: any) => {
    setEditingNicheId(niche.id)
    setName(niche.name)
    setSlug(niche.slug)
    setDescription(niche.description || '')
    setKeywords(niche.keywords || [])
    setKeywordInput('')
    setCustomSignalTypes(niche.custom_signal_types || '')
    setIcon(niche.icon || '🤖')
    setSources(niche.sources || ['googlenews', 'hackernews', 'reddit', 'github'])
    setActivateImmediately(niche.is_active ?? true)
    setShowModal(true)
  }

  const emojis = ['🤖','📊','🚀','🇫🇷','💡','🔍','📋','⚡','🎯','💼']

  type SourceEntry = { label: string; key: string; comingSoon?: true }
  const sourcesT1: SourceEntry[] = [
    { label: 'LinkedIn',    key: 'linkedin',    comingSoon: true },
    { label: 'Google News', key: 'googlenews'  },
    { label: 'Hacker News', key: 'hackernews'  },
    { label: 'Reddit',      key: 'reddit'      },
    { label: 'X/Twitter',   key: 'twitter',     comingSoon: true },
    { label: 'Medium',      key: 'medium'      },
  ]
  const sourcesT2: SourceEntry[] = [
    { label: 'FrenchWeb',   key: 'frenchweb'   },
    { label: 'Maddyness',   key: 'maddyness'   },
    { label: 'Malt.fr',     key: 'malt'        },
    { label: 'Dealroom',    key: 'dealroom'    },
    { label: 'ProductHunt', key: 'producthunt' },
    { label: 'Substack',    key: 'substack'    },
    { label: 'Crunchbase',  key: 'crunchbase'  },
  ]
  const sourcesT3: SourceEntry[] = [
    { label: 'GitHub',       key: 'github'       },
    { label: 'EU Parliament',key: 'euparliament' },
    { label: 'CNIL',         key: 'cnil'         },
    { label: 'Dev.to',       key: 'devto'        },
    { label: 'Polymarket',   key: 'polymarket'   },
  ]

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()])
      setKeywordInput('')
    }
  }

  const toggleSource = (source: string) => {
    if (sources.includes(source)) {
      setSources(sources.filter(s => s !== source))
    } else {
      setSources([...sources, source])
    }
  }
  const router = useRouter()

  const limitReached = totalCount >= limits.nichesPerWorkspace
  const isStarter = plan === 'starter' || plan === 'trial'
  const isAgency = plan === 'agency'
  const isPro = plan === 'pro'

  const filteredNiches = niches.filter(n => {
    if (filter === 'active' && !n.is_active) return false
    if (filter === 'paused' && n.is_active) return false
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      if (!n.name.toLowerCase().includes(q) && !(n.description || '').toLowerCase().includes(q)) {
        return false
      }
    }
    
    return true
  })

  const handleNameChange = (val: string) => {
    setName(val)
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setModalError(null)
    setModalLoading(true)
    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('slug', slug)
      // Note: Backend might not use these currently, but we send them
      formData.append('description', description)
      formData.append('icon', icon)
      formData.append('keywords', JSON.stringify(keywords))
      formData.append('sources', JSON.stringify(sources))
      formData.append('scrapeFreq', modalScrapeFreq)
      formData.append('signalMemory', signalMemory)
      formData.append('activateImmediately', activateImmediately.toString())
      if (isAgency) formData.append('customSignalTypes', customSignalTypes)
      if (activeWorkspace) formData.append('workspaceId', activeWorkspace.id)

      if (editingNicheId) {
        await updateNiche(editingNicheId, formData)
      } else {
        await createNiche(formData)
      }

      setShowModal(false)
    } catch (err: any) {
      setModalError(err.message)
    } finally {
      setModalLoading(false)
    }
  }

  const handleAddWorkspace = async () => {
    const wsName = window.prompt("Enter name for a new Workspace:")
    if (!wsName || !wsName.trim()) return
    
    if (allWorkspaces && allWorkspaces.length >= limits.workspaces) {
      alert(`Limit reached. Agency plan allows up to ${limits.workspaces} workspaces.`)
      return
    }

    try {
      setWorkspaceLoading(true)
      const res = await createWorkspace(wsName.trim())
      if (res.workspaceId) {
        router.push(`/niches?ws=${res.workspaceId}`)
      }
    } catch (e: any) {
      alert(e.message)
    } finally {
      setWorkspaceLoading(false)
    }
  }

  const handleEditWorkspace = async (w: {id: string; name: string}, e: React.MouseEvent) => {
    e.stopPropagation()
    const wsName = window.prompt("Edit workspace name:", w.name)
    if (!wsName || !wsName.trim() || wsName === w.name) return
    
    try {
      setWorkspaceLoading(true)
      await updateWorkspaceName(w.id, wsName.trim())
    } catch (e: any) {
      alert(e.message)
    } finally {
      setWorkspaceLoading(false)
    }
  }

  const handleDeleteWorkspace = async (w: {id: string; name: string}, e: React.MouseEvent) => {
    e.stopPropagation()
    const isConfirmed = window.confirm(`WARNING: You are about to permanently delete the "${w.name}" workspace.\n\nAll niches and signal data collected inside this workspace will be PERMANENTLY ERASED.\n\nAre you absolutely sure?`)
    if (!isConfirmed) return
    
    try {
      setWorkspaceLoading(true)
      await deleteWorkspace(w.id)
      router.push('/niches') // removes ?ws query param to load default
    } catch (e: any) {
      alert(e.message)
    } finally {
      setWorkspaceLoading(false)
    }
  }

  const planBarColor = isStarter
    ? (limitReached ? 'border-[#FBBF9E]' : 'border-[#E4E4F0]')
    : isAgency
      ? 'border-[#F5D87A] bg-[#FFFDF4]'
      : 'border-[#E4E4F0]'

  const fillWidth = `${Math.min(100, (totalCount / limits.nichesPerWorkspace) * 100)}%`

  const userInitials = (user?.email?.slice(0, 2) || 'VB').toUpperCase()

  return (
    <>
      {/* Topbar */}
      <header className="h-[58px] bg-white border-b border-[#E4E4F0] flex items-center px-[22px] gap-2.5 flex-shrink-0">
        <div className="text-[17px] font-semibold text-[#1A1A3E] flex-1">Niches</div>
        <div className="flex items-center gap-[7px] bg-[#F7F7FC] border border-[#E4E4F0] rounded-[9px] px-2.5 h-[33px]">
          <svg viewBox="0 0 24 24" className="w-[13px] h-[13px] stroke-[#A0A0BE] fill-none" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search niches…"
            className="w-[160px] bg-transparent border-none outline-none text-xs text-[#1A1A3E] placeholder:text-[#A0A0BE]"
          />
        </div>
        <div className="w-[33px] h-[33px] rounded-full bg-[#EEEEFF] flex items-center justify-center text-[11px] font-semibold text-[#5B5FC7]">
          {userInitials}
        </div>
      </header>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-5 px-[22px] bg-[#F7F7FC]">
        {/* Upgrade banner for Starter */}
        {isStarter && (
          <div className="rounded-xl p-[13px] px-4 flex items-center gap-3 mb-[18px] bg-[#EEEEFF] border border-[#A3A6E8]">
            <div className="w-[38px] h-[38px] rounded-[10px] bg-[#EEEEFF] flex items-center justify-center text-lg flex-shrink-0">🚀</div>
            <div className="flex-1">
              <div className="text-[13px] font-bold text-[#5B5FC7]">Unlock the full weekly loop — upgrade to Pro</div>
              <div className="text-[11px] text-[#6B6B8A] mt-0.5">You&apos;re limited to {limits.nichesPerWorkspace} niches and Trend Reports only. Signal Briefs, Newsletters &amp; LinkedIn Posts are locked.</div>
              <div className="flex gap-1.5 flex-wrap mt-1.5">
                {['7 niches', 'Signal Briefs', 'Newsletters', 'Scan every 2h'].map(tag => (
                  <span key={tag} className="text-[10px] font-semibold py-0.5 px-2 rounded-full bg-[#EEEEFF] text-[#5B5FC7]">{tag}</span>
                ))}
              </div>
            </div>
            <Link href="/settings" className="h-[26px] px-[11px] rounded-full bg-[#5B5FC7] text-white text-[11px] font-semibold border-none cursor-pointer whitespace-nowrap inline-flex items-center no-underline">
              Upgrade to Pro →
            </Link>
          </div>
        )}

        {/* Upgrade banner for Pro */}
        {isPro && (
          <div className="rounded-xl p-[13px] px-4 flex items-center gap-3 mb-[18px] bg-[#1A1A3E] border border-[#3D3D7E]">
            <div className="w-[38px] h-[38px] rounded-[10px] bg-[rgba(245,166,35,0.15)] flex items-center justify-center text-lg flex-shrink-0">🏢</div>
            <div className="flex-1">
              <div className="text-[13px] font-bold text-white">Managing multiple clients? You need Agency.</div>
              <div className="text-[11px] text-white/55 mt-0.5">Pro = 1 workspace. Agency = 5 isolated environments, each with its own niches, brand voice and white-label exports.</div>
              <div className="flex gap-1.5 flex-wrap mt-1.5">
                {['5 workspaces', '25 niches', 'Custom signals', 'White-label'].map(tag => (
                  <span key={tag} className="text-[10px] font-semibold py-0.5 px-2 rounded-full bg-[rgba(245,166,35,0.15)] text-[#F5A623]">{tag}</span>
                ))}
              </div>
            </div>
            <Link href="/settings" className="h-[26px] px-[11px] rounded-full bg-[#1A1A3E] text-[#F5A623] text-[11px] font-semibold border-none cursor-pointer whitespace-nowrap inline-flex items-center no-underline">
              Upgrade to Agency →
            </Link>
          </div>
        )}

        {/* Workspace Selector (Agency Only) */}
        {isAgency && allWorkspaces && activeWorkspace && (
          <div className="mb-5">
            <div className="text-[10px] font-bold text-[#A0A0BE] tracking-[0.6px] uppercase mb-2">Workspaces</div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {allWorkspaces.map(w => (
                <button
                  key={w.id}
                  onClick={() => router.push(`/niches?ws=${w.id}`)}
                  className={`h-[34px] px-3.5 pr-2.5 rounded-[9px] text-xs font-semibold border border-[#E4E4F0] cursor-pointer inline-flex items-center gap-[5px] whitespace-nowrap transition-colors group ${
                    w.id === activeWorkspace.id
                      ? 'bg-[#1A1A3E] text-white'
                      : 'bg-white text-[#1A1A3E] hover:bg-[#F7F7FC]'
                  }`}
                >
                  <span className="opacity-70">🏢</span> 
                  {w.name}
                  <div className="ml-1 flex items-center">
                    <div 
                      onClick={(e) => handleEditWorkspace(w, e)}
                      className={`flex items-center justify-center w-5 h-5 rounded hover:bg-white/20 hover:text-white transition-colors ${w.id === activeWorkspace.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} text-[#A0A0BE]`}
                      title="Rename workspace"
                    >
                      <svg viewBox="0 0 24 24" className="w-[11px] h-[11px] fill-current" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    </div>
                    {allWorkspaces && allWorkspaces.length > 1 && (
                      <div 
                        onClick={(e) => handleDeleteWorkspace(w, e)}
                        className={`flex items-center justify-center w-5 h-5 rounded hover:bg-[#E85757] hover:text-white transition-colors ${w.id === activeWorkspace.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} text-[#A0A0BE]`}
                        title="Delete workspace"
                      >
                        <svg viewBox="0 0 24 24" className="w-[11px] h-[11px] fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
              <button
                onClick={handleAddWorkspace}
                disabled={workspaceLoading}
                className="h-[34px] px-3.5 rounded-[9px] text-xs font-semibold border-2 border-dashed border-[#C5C5E0] bg-transparent text-[#5B5FC7] cursor-pointer inline-flex items-center gap-[5px] whitespace-nowrap hover:bg-[#EEEEFF] transition-colors disabled:opacity-50"
              >
                {workspaceLoading ? 'Processing...' : '+ Add workspace'}
              </button>
            </div>
          </div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2.5 mb-4">
          <div className="bg-white border border-[#E4E4F0] rounded-[11px] p-3 px-3.5">
            <div className="text-[10px] font-medium text-[#6B6B8A] uppercase tracking-[0.5px] mb-1">
              {isAgency ? 'This workspace' : 'Total niches'}
            </div>
            <div className="text-xl font-bold text-[#1A1A3E]">{totalCount}</div>
            <div className="text-[11px] text-[#A0A0BE] mt-px">
              {limitReached && isStarter ? (
                <span className="text-[#E85757]">Limit reached</span>
              ) : (
                `of ${limits.nichesPerWorkspace}${isPro ? ' (Pro)' : isAgency ? ' slots' : ''}`
              )}
            </div>
          </div>
          <div className="bg-white border border-[#E4E4F0] rounded-[11px] p-3 px-3.5">
            <div className="text-[10px] font-medium text-[#6B6B8A] uppercase tracking-[0.5px] mb-1">Active</div>
            <div className="text-xl font-bold text-[#4CAF82]">{activeCount}</div>
            <div className="text-[11px] text-[#A0A0BE] mt-px">{scrapeFreq}</div>
          </div>
          <div className="bg-white border border-[#E4E4F0] rounded-[11px] p-3 px-3.5">
            <div className="text-[10px] font-medium text-[#6B6B8A] uppercase tracking-[0.5px] mb-1">
              {isAgency ? 'All workspaces' : 'Paused'}
            </div>
            <div className={`text-xl font-bold ${isAgency ? 'text-[#1A1A3E]' : 'text-[#F5A623]'}`}>
              {isAgency ? totalCount : pausedCount}
            </div>
            <div className="text-[11px] text-[#A0A0BE] mt-px">
              {isAgency ? `of ${limits.workspaces} used` : 'no new signals'}
            </div>
          </div>
          <div className="bg-white border border-[#E4E4F0] rounded-[11px] p-3 px-3.5">
            <div className="text-[10px] font-medium text-[#6B6B8A] uppercase tracking-[0.5px] mb-1">
              {isAgency ? 'Total signals / wk' : 'Signals / week'}
            </div>
            <div className="text-xl font-bold text-[#1A1A3E]">{totalSignals.toLocaleString()}</div>
            <div className="text-[11px] text-[#A0A0BE] mt-px">
              {isAgency ? 'all workspaces' : 'across active'}
            </div>
          </div>
        </div>

        {/* Plan bar */}
        <div className={`bg-white border rounded-[11px] p-2.5 px-3.5 flex items-center gap-3 mb-4 ${planBarColor}`}>
          <div className="flex-1">
            <div className={`text-xs font-medium ${limitReached && isStarter ? 'text-[#E85757]' : 'text-[#1A1A3E]'}`}>
              {limitReached && isStarter
                ? `⚠ All ${limits.nichesPerWorkspace} Starter slots used`
                : isAgency
                  ? `${workspaceName} — Agency plan`
                  : `Niche slots — ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan`
              }
            </div>
            <div className="text-[11px] text-[#A0A0BE] mt-px">
              {isStarter
                ? 'Upgrade to Pro for 7 niches, or Agency for 25'
                : isAgency
                  ? `Hourly scan · Custom signals enabled · ${totalCount} of ${limits.nichesPerWorkspace} niche slots used`
                  : `Agency: ${limits.workspaces} workspaces × 5 niches each`
              }
            </div>
          </div>
          <div className="flex-[0_0_120px]">
            <div className="h-[5px] rounded-full bg-[#F0F0F7] overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  isStarter ? 'bg-[#E85757]' : isAgency ? 'bg-[#F5A623]' : 'bg-[#5B5FC7]'
                }`}
                style={{ width: fillWidth }}
              />
            </div>
            <div className={`text-[10px] mt-[3px] text-right ${limitReached && isStarter ? 'text-[#E85757]' : 'text-[#6B6B8A]'}`}>
              {totalCount} of {limits.nichesPerWorkspace}
            </div>
          </div>
          {!isAgency && (
            <Link
              href="/settings"
              className={`h-[28px] px-3 rounded-[9px] text-[11px] font-semibold border-none cursor-pointer inline-flex items-center whitespace-nowrap no-underline ${
                isStarter
                  ? 'bg-[#5B5FC7] text-white rounded-full'
                  : 'bg-[#1A1A3E] text-[#F5A623]'
              }`}
            >
              Upgrade →
            </Link>
          )}
        </div>

        {/* Filter bar */}
        <div className="flex gap-1.5 mb-3.5">
          {(['all', 'active', 'paused'] as const).map(f => {
            const count = f === 'all' ? totalCount : f === 'active' ? activeCount : pausedCount
            const isOn = filter === f
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`h-[27px] px-3 rounded-full text-[11px] font-semibold cursor-pointer border-none transition-colors ${
                  isOn
                    ? (isAgency ? 'bg-[#1A1A3E] text-white' : 'bg-[#5B5FC7] text-white')
                    : 'bg-white text-[#6B6B8A] border border-[#E4E4F0]'
                }`}
                style={!isOn ? { borderWidth: '1px', borderStyle: 'solid', borderColor: '#E4E4F0' } : undefined}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
              </button>
            )
          })}
        </div>

        {/* Niche grid */}
        <div className="grid grid-cols-2 gap-3">
          {filteredNiches.map(niche => (
            <NicheClientCard
              key={niche.id}
              niche={niche}
              plan={plan}
              signalCount={signalCountMap[niche.id] || 0}
              reportCount={reportCountMap[niche.id] || 0}
              sourceCount={niche.sources ? niche.sources.length : (niche.is_active ? 18 : 0)}
              onEdit={() => openEditModal(niche)}
            />
          ))}

          {/* Locked card for Starter at limit */}
          {limitReached && isStarter && (
            <div className="border-2 border-dashed border-[#C5C5E0] rounded-[13px] flex flex-col items-center justify-center gap-[7px] p-6 min-h-[185px]">
              <div className="w-[38px] h-[38px] rounded-[10px] bg-[#F0F0F7] flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[#A0A0BE] fill-none" strokeWidth="1.5" strokeLinecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <div className="text-xs font-semibold text-[#6B6B8A]">Slot limit reached</div>
              <div className="text-[11px] text-[#A0A0BE] text-center leading-[1.4]">
                Starter: {limits.nichesPerWorkspace} niches max.<br />Pro unlocks 7 slots.
              </div>
              <Link href="/settings" className="h-[26px] mt-1 px-[11px] rounded-full bg-[#5B5FC7] text-white text-[11px] font-semibold border-none cursor-pointer whitespace-nowrap inline-flex items-center no-underline">
                Upgrade to Pro →
              </Link>
            </div>
          )}

          {/* Add card for Pro/Agency when not at limit and at least 1 niche exists */}
          {!limitReached && totalCount > 0 && (
            <button
              onClick={openNewModal}
              className="border-2 border-dashed border-[#C5C5E0] rounded-[13px] cursor-pointer flex flex-col items-center justify-center gap-[7px] p-6 min-h-[185px] bg-transparent transition-all hover:border-[#5B5FC7] hover:bg-[#EEEEFF] group"
            >
              <div className="w-[38px] h-[38px] rounded-[10px] bg-[#F7F7FC] flex items-center justify-center transition-colors group-hover:bg-[#5B5FC7]">
                <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[#6B6B8A] fill-none transition-colors group-hover:stroke-white" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <div className="text-xs font-semibold text-[#6B6B8A] group-hover:text-[#5B5FC7] transition-colors">
                {isAgency ? `Add niche to ${workspaceName}` : 'Add a new niche'}
              </div>
              <div className="text-[11px] text-[#A0A0BE] text-center">
                {limits.nichesPerWorkspace - totalCount} slots remaining{isPro ? ' on Pro' : isAgency ? ' in this workspace' : ''}
              </div>
            </button>
          )}
        </div>

        {/* Empty state */}
        {totalCount === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 py-16 text-center bg-white border border-[#E4E4F0] rounded-xl mt-4">
            <div className="w-16 h-16 rounded-2xl bg-[#EEEEFF] flex items-center justify-center text-3xl">🔍</div>
            <h2 className="text-lg font-bold text-[#1A1A3E]">Define your market niches</h2>
            <p className="text-sm text-[#6B6B8A] max-w-sm">
              Each niche connects to 18 signal sources. PulseLoop scrapes, embeds, and tracks trends automatically.
            </p>
            <button
              onClick={openNewModal}
              className="h-9 px-5 rounded-[9px] text-sm font-semibold text-white bg-[#5B5FC7] hover:bg-[#4A4EB3] transition-colors border-none cursor-pointer mt-2"
            >
              + Create Niche
            </button>
          </div>
        )}
      </div>

      {/* Create Niche Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-[rgba(26,26,62,0.4)] flex items-center justify-center z-50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false) }}
        >
          <div className="bg-white rounded-[18px] w-[520px] max-w-[calc(100%-40px)] flex flex-col max-h-[660px] overflow-hidden shadow-2xl">
            {/* Modal header */}
            <div className="p-[18px] px-[22px] pb-3.5 border-b border-[#E4E4F0] flex items-center justify-between flex-shrink-0">
              <div>
                <div className="text-[15px] font-bold text-[#1A1A3E]">
                  {editingNicheId ? 'Edit niche' : 'Add new niche'}
                </div>
                <div className="text-[11px] text-[#6B6B8A] mt-px">Define what PulseLoop should track</div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="w-7 h-7 rounded-full bg-[#F7F7FC] border-none cursor-pointer flex items-center justify-center text-sm text-[#6B6B8A] hover:bg-[#FDEAEA] hover:text-[#E85757] transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-[18px] px-[22px] overflow-y-auto flex-1">
                {/* Limit warning for Starter */}
                {isStarter && limitReached && !editingNicheId && (
                  <div className="bg-[#FDEAEA] border border-[#FBBF9E] rounded-[10px] p-3 px-3.5 mb-4 flex gap-2.5 items-start">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-[#E85757] fill-none flex-shrink-0 mt-px" strokeWidth="1.5" strokeLinecap="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                    <div className="text-xs text-[#8B1A1A]">
                      <div className="font-bold mb-0.5">All {limits.nichesPerWorkspace} Starter slots used</div>
                      You can&apos;t create a new niche until you upgrade to Pro.
                    </div>
                  </div>
                )}

                {modalError && (
                  <div className="bg-[#FDEAEA] border border-[#FBBF9E] rounded-[10px] p-3 px-3.5 mb-4 text-xs text-[#8B1A1A] font-medium">
                    {modalError}
                  </div>
                )}

                {/* Progress bar */}
                <div className="flex items-center mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#4CAF82] flex items-center justify-center text-white text-[10px] font-bold">✓</div>
                    <span className="text-[13px] font-bold text-[#1A1A3E]">Basics</span>
                  </div>
                  <div className="flex-1 h-px bg-[#E4E4F0] mx-3"></div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-[#5B5FC7] flex items-center justify-center text-white text-[11px] font-bold">2</div>
                    <span className="text-[13px] font-bold text-[#5B5FC7]">Keywords</span>
                  </div>
                  <div className="flex-1 h-px bg-[#E4E4F0] mx-3"></div>
                  <div className="flex items-center gap-2 opacity-50">
                    <div className="w-5 h-5 rounded-full bg-[#F0F0F7] flex items-center justify-center text-[#A0A0BE] text-[11px] font-bold">3</div>
                    <span className="text-[13px] font-bold text-[#A0A0BE]">Sources</span>
                  </div>
                  <div className="flex-1 h-px bg-[#E4E4F0] mx-3"></div>
                  <div className="flex items-center gap-2 opacity-50">
                    <div className="w-5 h-5 rounded-full bg-[#F0F0F7] flex items-center justify-center text-[#A0A0BE] text-[11px] font-bold">4</div>
                    <span className="text-[13px] font-bold text-[#A0A0BE]">Schedule</span>
                  </div>
                </div>

                {/* Niche name */}
                <div className="mb-4">
                  <label className="text-[13px] font-bold text-[#1A1A3E] mb-1.5 block">
                    Niche name <span className="text-[#5B5FC7]">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    placeholder="e.g. AI Tooling for B2B SaaS"
                    className="w-full h-[40px] border border-[#E4E4F0] rounded-[9px] px-3 text-[14px] text-[#1A1A3E] font-[inherit] outline-none focus:border-[#5B5FC7] focus:border-[1.5px] placeholder:text-[#A0A0BE]"
                  />
                </div>

                {/* Description */}
                <div className="mb-4">
                  <label className="text-[13px] font-bold text-[#1A1A3E] mb-1.5 block">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    placeholder="What market are you tracking and for whom?"
                    className="w-full border border-[#E4E4F0] rounded-[9px] p-2.5 px-3 text-[14px] text-[#1A1A3E] font-[inherit] outline-none resize-none leading-[1.5] focus:border-[#5B5FC7] focus:border-[1.5px] placeholder:text-[#A0A0BE]"
                  />
                  <div className="text-[11px] text-[#A0A0BE] mt-1">Claude uses this context when generating reports and content</div>
                </div>

                {/* Icon */}
                <div className="mb-6">
                  <label className="text-[13px] font-bold text-[#1A1A3E] mb-1.5 block">Icon</label>
                  <div className="flex flex-wrap gap-2">
                    {emojis.map((e, index) => (
                      <div
                        key={index}
                        onClick={() => setIcon(e)}
                        className={`w-10 h-10 rounded-[9px] flex items-center justify-center text-xl cursor-pointer transition-all border ${
                          icon === e 
                            ? 'border-[#5B5FC7] bg-[#EEEEFF]' 
                            : 'border-[#E4E4F0] hover:border-[#A3A6E8]'
                        }`}
                      >
                        {e}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-[#E4E4F0] w-full mb-6 relative"></div>

                {/* Keywords */}
                <div className="mb-6">
                  <h3 className="text-[15px] font-bold text-[#1A1A3E] mb-3">Keywords to track</h3>
                  <label className="text-[13px] font-bold text-[#1A1A3E] mb-1.5 block flex items-center gap-1">
                    Add keywords <span className="text-[#5B5FC7]">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddKeyword()
                        }
                      }}
                      placeholder="Type keyword, press Enter..."
                      className="flex-1 h-[40px] border border-[#E4E4F0] rounded-[9px] px-3 text-[14px] text-[#1A1A3E] font-[inherit] outline-none focus:border-[#5B5FC7] focus:border-[1.5px] placeholder:text-[#A0A0BE]"
                    />
                    <button
                      type="button"
                      onClick={handleAddKeyword}
                      className="h-[40px] px-4 rounded-[9px] bg-[#5B5FC7] text-white text-[13px] font-bold cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                  {keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {keywords.map((kw, idx) => (
                        <div key={idx} className="bg-[#EEEEFF] text-[#5B5FC7] px-2.5 py-1 rounded-[7px] text-[13px] flex items-center gap-1.5 font-medium">
                          {kw}
                          <button
                            type="button"
                            onClick={() => setKeywords(keywords.filter((_, i) => i !== idx))}
                            className="bg-transparent border-none text-[14px] leading-none cursor-pointer text-[#5B5FC7] hover:opacity-70 pb-[1px]"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Custom signal types (Agency only) */}
                {isAgency && (
                  <div className="mb-6">
                    <label className="text-[15px] font-bold text-[#1A1A3E] mb-1.5 flex items-center gap-2">
                      Custom signal types
                      <span className="bg-[#FFF4E0] text-[#F5A623] text-[10px] px-1.5 py-[1px] rounded-[5px] uppercase tracking-wide">Agency only ✦</span>
                    </label>
                    <p className="text-[11px] text-[#A0A0BE] mb-2 leading-tight">Define sub-topics beyond standard keyword matching</p>
                    <input
                      type="text"
                      value={customSignalTypes}
                      onChange={(e) => setCustomSignalTypes(e.target.value)}
                      placeholder="e.g. Hiring signals, Product launches, Pricing changes..."
                      className="w-full h-[40px] border border-[#E4E4F0] rounded-[9px] px-3 text-[14px] text-[#1A1A3E] font-[inherit] outline-none focus:border-[#5B5FC7] focus:border-[1.5px] placeholder:text-[#A0A0BE]"
                    />
                  </div>
                )}

                <div className="h-px bg-[#E4E4F0] w-full mb-6 relative"></div>

                {/* Sources */}
                <div className="mb-6">
                  <h3 className="text-[15px] font-bold text-[#1A1A3E] mb-4">Sources to monitor</h3>
                  
                  {/* Tier 1 */}
                  <div className="mb-3">
                    <div className="text-[10px] font-bold text-[#A0A0BE] tracking-[0.6px] uppercase mb-2">Tier 1 — Core</div>
                    <div className="grid grid-cols-3 gap-2">
                      {sourcesT1.map((s) => {
                        const isSelected = sources.includes(s.key)
                        if (s.comingSoon) {
                          return (
                            <div key={s.key} className="flex justify-between items-center px-3 h-[36px] rounded-[7px] border border-[#E4E4F0] bg-[#F7F7FC] opacity-60 cursor-not-allowed" title="Coming Soon">
                              <span className="text-[12px] text-[#A0A0BE]">{s.label}</span>
                              <span className="text-[9px] font-bold text-amber-500 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-px">Soon</span>
                            </div>
                          )
                        }
                        return (
                          <div
                            key={s.key}
                            onClick={() => toggleSource(s.key)}
                            className={`flex justify-between items-center px-3 h-[36px] rounded-[7px] border cursor-pointer border-[#E4E4F0] hover:border-[#5B5FC7] ${isSelected ? 'bg-[#EEEEFF] border-[#5B5FC7]' : 'bg-white'}`}
                          >
                            <span className={`text-[13px] ${isSelected ? 'text-[#5B5FC7] font-medium' : 'text-[#6B6B8A]'}`}>{s.label}</span>
                            <div className={`w-[17px] h-[17px] rounded-[4px] border flex items-center justify-center ${isSelected ? 'bg-[#5B5FC7] border-[#5B5FC7]' : 'bg-white border-[#E4E4F0]'}`}>
                              {isSelected && <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-white fill-none" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Tier 2 */}
                  <div className="mb-3">
                    <div className="text-[10px] font-bold text-[#A0A0BE] tracking-[0.6px] uppercase mb-2">Tier 2 — EU Edge</div>
                    <div className="grid grid-cols-3 gap-2">
                      {sourcesT2.map((s) => {
                        const isSelected = sources.includes(s.key)
                        return (
                          <div
                            key={s.key}
                            onClick={() => toggleSource(s.key)}
                            className={`flex justify-between items-center px-3 h-[36px] rounded-[7px] border cursor-pointer border-[#E4E4F0] hover:border-[#5B5FC7] ${isSelected ? 'bg-[#EEEEFF] border-[#5B5FC7]' : 'bg-white'}`}
                          >
                            <span className={`text-[13px] ${isSelected ? 'text-[#5B5FC7] font-medium' : 'text-[#6B6B8A]'}`}>{s.label}</span>
                            <div className={`w-[17px] h-[17px] rounded-[4px] border flex items-center justify-center ${isSelected ? 'bg-[#5B5FC7] border-[#5B5FC7]' : 'bg-white border-[#E4E4F0]'}`}>
                              {isSelected && <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-white fill-none" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Tier 3 */}
                  <div className="mb-3">
                    <div className="text-[10px] font-bold text-[#A0A0BE] tracking-[0.6px] uppercase mb-2">Tier 3 — Deep Intel</div>
                    <div className="grid grid-cols-3 gap-2">
                      {sourcesT3.map((s) => {
                        const isSelected = sources.includes(s.key)
                        return (
                          <div
                            key={s.key}
                            onClick={() => toggleSource(s.key)}
                            className={`flex justify-between items-center px-3 h-[36px] rounded-[7px] border cursor-pointer border-[#E4E4F0] hover:border-[#5B5FC7] ${isSelected ? 'bg-[#EEEEFF] border-[#5B5FC7]' : 'bg-white'}`}
                          >
                            <span className={`text-[13px] ${isSelected ? 'text-[#5B5FC7] font-medium' : 'text-[#6B6B8A]'}`}>{s.label}</span>
                            <div className={`w-[17px] h-[17px] rounded-[4px] border flex items-center justify-center ${isSelected ? 'bg-[#5B5FC7] border-[#5B5FC7]' : 'bg-white border-[#E4E4F0]'}`}>
                              {isSelected && <svg viewBox="0 0 24 24" className="w-3 h-3 stroke-white fill-none" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="h-px bg-[#E4E4F0] w-full mb-6 relative"></div>

                {/* Schedule & Activation */}
                <div className="mb-4">
                  <h3 className="text-[15px] font-bold text-[#1A1A3E] mb-3">Scan schedule</h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="text-[13px] font-bold text-[#1A1A3E] mb-1.5 block">Scrape frequency</label>
                      <select 
                        value={modalScrapeFreq}
                        onChange={(e) => setModalScrapeFreq(e.target.value)}
                        className="w-full h-[40px] border border-[#E4E4F0] rounded-[9px] px-3 text-[14px] text-[#1A1A3E] font-[inherit] outline-none focus:border-[#5B5FC7] focus:border-[1.5px] bg-white"
                        disabled={isStarter}
                      >
                        <option value="Every hour (Agency)">Every hour (Agency)</option>
                        <option value="Every 2 hours (Pro)">Every 2 hours (Pro)</option>
                        <option value="Every 6 hours (Starter)">Every 6 hours (Starter)</option>
                      </select>
                      <div className="text-[11px] text-[#A0A0BE] mt-1">{isStarter ? 'Locked on Starter' : `Your plan allows up to ${plan === 'pro' ? 'Every 2 hours' : 'Every hour'}`}</div>
                    </div>
                    <div>
                      <label className="text-[13px] font-bold text-[#1A1A3E] mb-1.5 block">Signal memory</label>
                      <select 
                        value={signalMemory}
                        onChange={(e) => setSignalMemory(e.target.value)}
                        className="w-full h-[40px] border border-[#E4E4F0] rounded-[9px] px-3 text-[14px] text-[#1A1A3E] font-[inherit] outline-none focus:border-[#5B5FC7] focus:border-[1.5px] bg-white"
                      >
                        <option value="90 days">90 days</option>
                        <option value="30 days">30 days</option>
                        <option value="7 days">7 days</option>
                      </select>
                      <div className="text-[11px] text-[#A0A0BE] mt-1">How far back RAG context is kept</div>
                    </div>
                  </div>

                  <div className="mb-2">
                    <label className="text-[13px] font-bold text-[#1A1A3E] mb-1.5 block">Activate immediately</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActivateImmediately(!activateImmediately)}
                        className={`w-[44px] h-[24px] rounded-full border-none cursor-pointer relative flex-shrink-0 transition-colors ${
                          activateImmediately ? 'bg-[#5B5FC7]' : 'bg-[#C5C5E0]'
                        }`}
                      >
                        <div
                          className="absolute top-[2.5px] w-[19px] h-[19px] bg-white rounded-full transition-all"
                          style={{ left: activateImmediately ? '22px' : '2.5px' }}
                        />
                      </button>
                      <span className="text-[13px] text-[#6B6B8A]">
                        {activateImmediately ? 'Niche starts scanning right after saving' : 'Saved but paused'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* URL Slug (Hidden but submitted) */}
                <input type="hidden" name="slug" value={slug} />

              </div>

              {/* Modal footer */}
              <div className="p-3 px-[22px] border-t border-[#E4E4F0] flex items-center justify-between flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-[34px] px-3 rounded-[9px] bg-white text-[#1A1A3E] text-xs font-medium border border-[#E4E4F0] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading || !name || !slug || (limitReached && isStarter && !editingNicheId)}
                  className={`h-[34px] px-3.5 rounded-[9px] text-white text-xs font-semibold border-none cursor-pointer inline-flex items-center gap-[5px] disabled:opacity-50 ${
                    isAgency ? 'bg-[#1A1A3E]' : 'bg-[#5B5FC7]'
                  }`}
                >
                  {modalLoading ? 'Saving…' : (editingNicheId ? 'Update niche' : 'Save niche')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
