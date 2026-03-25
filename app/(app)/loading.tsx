/**
 * Shown immediately inside the Shell's <main> area while any (app) page
 * fetches its server data. The sidebar is already visible because it lives
 * in the layout — this only covers the content slot.
 */
export default function AppLoading() {
  return (
    <div className="flex-1 flex flex-col overflow-hidden animate-pulse">
      {/* Topbar skeleton */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center px-5 gap-3 flex-shrink-0">
        <div className="h-4 w-36 bg-slate-200 rounded-md" />
        <div className="flex-1" />
        <div className="w-7 h-7 rounded-full bg-slate-200" />
      </div>

      {/* Content area skeleton */}
      <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
        {/* Stat cards row */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-3.5">
              <div className="h-2.5 w-24 bg-slate-200 rounded mb-3" />
              <div className="h-7 w-12 bg-slate-200 rounded mb-2" />
              <div className="h-2 w-20 bg-slate-100 rounded mb-3" />
              <div className="h-1.5 w-full bg-slate-100 rounded-full" />
            </div>
          ))}
        </div>

        {/* Usage bar panel */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-5">
          <div className="h-2.5 w-28 bg-slate-200 rounded mb-4" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <div className="flex justify-between mb-1.5">
                  <div className="h-2.5 w-16 bg-slate-200 rounded" />
                  <div className="h-2.5 w-8 bg-slate-100 rounded" />
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Two-column lower section */}
        <div className="grid grid-cols-[1fr_320px] gap-3.5">
          {/* Left: list cards */}
          <div className="space-y-2.5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-slate-200 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 w-40 bg-slate-200 rounded mb-2" />
                    <div className="h-2.5 w-24 bg-slate-100 rounded" />
                  </div>
                  <div className="h-5 w-14 bg-slate-100 rounded-full" />
                </div>
              </div>
            ))}
          </div>

          {/* Right: activity panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-3.5">
            <div className="h-3 w-28 bg-slate-200 rounded mb-4" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-2.5 mb-3">
                <div className="w-6 h-6 rounded-full bg-slate-200 flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-2.5 w-full bg-slate-100 rounded mb-1.5" />
                  <div className="h-2 w-16 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
