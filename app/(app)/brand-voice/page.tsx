import Topbar from '@/components/layout/Topbar'

export default function BrandVoicePage() {
  return (
    <>
      <Topbar title="Brand Voice" />
      <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center text-3xl">✍️</div>
          <h2 className="text-lg font-bold text-slate-800">Brand Voice Profile</h2>
          <p className="text-sm text-slate-500 max-w-sm">
            Paste 3–5 writing samples and PulseLoop will extract your unique tone, style, and vocabulary.
            Every output will match your voice.
          </p>
          <button className="inline-flex items-center justify-center h-9 px-5 rounded-lg text-sm font-semibold text-white bg-indigo-500 hover:bg-indigo-600 transition-colors">
            Set Up Brand Voice
          </button>
        </div>
      </div>
    </>
  )
}
