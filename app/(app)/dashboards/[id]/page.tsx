import Topbar from '@/components/layout/Topbar'

export default function DashboardDetailPage({ params }: { params: { id: string } }) {
  return (
    <>
      <Topbar title="Dashboard" />
      <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <p className="text-sm text-slate-500">Dashboard ID: {params.id}</p>
        </div>
      </div>
    </>
  )
}
