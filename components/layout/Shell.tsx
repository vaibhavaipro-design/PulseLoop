'use client'

import Sidebar from './Sidebar'

interface ShellProps {
  children: React.ReactNode
  userName?: string
  planName?: string
}

export default function Shell({ children, userName = 'User', planName = 'PRO' }: ShellProps) {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar userName={userName} planName={planName} />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {children}
      </main>
    </div>
  )
}
