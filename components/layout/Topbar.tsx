'use client'

interface TopbarProps {
  title: string
  userName?: string
  actions?: React.ReactNode
}

export default function Topbar({ title, userName = 'User', actions }: TopbarProps) {
  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-5 gap-2 flex-shrink-0">
      <h1 className="text-base font-semibold text-slate-800 flex-1">{title}</h1>
      {actions}
      <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0 ml-2">
        {userName.slice(0, 2).toUpperCase()}
      </div>
    </header>
  )
}
