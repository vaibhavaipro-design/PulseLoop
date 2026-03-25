'use client'

import { useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import { createNiche } from '@/app/actions/niches'

export default function NewNichePage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setName(val)
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))
  }

  const handleSubmit = async (formData: FormData) => {
    setError(null)
    setLoading(true)
    try {
      await createNiche(formData)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <>
      <Topbar title="Create Niche" />
      <div className="flex-1 overflow-y-auto p-5 bg-slate-50 flex justify-center">
        <div className="w-full max-w-lg mt-8">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-2">Define new niche</h2>
            <p className="text-sm text-slate-500 mb-6">
              A niche acts as a container for signals. Trend Reports are generated based on the data specific to each niche.
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <form action={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Niche Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={name}
                  onChange={handleNameChange}
                  required
                  placeholder="e.g. B2B SaaS Marketing"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                />
              </div>

              <div>
                <label htmlFor="slug" className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>URL Slug</span>
                  <span className="text-xs font-normal text-slate-400">Auto-generated</span>
                </label>
                <div className="flex rounded-lg overflow-hidden border border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                  <div className="bg-slate-50 px-3 py-2.5 text-slate-400 text-sm font-medium border-r border-slate-200">
                    pulseloop.io/n/
                  </div>
                  <input
                    type="text"
                    id="slug"
                    name="slug"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                    pattern="^[a-z0-9-]+$"
                    title="Lowercase letters, numbers, and hyphens only"
                    className="flex-1 px-3 py-2.5 bg-white text-sm text-slate-800 focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-6 flex items-center justify-end gap-3">
                <a href="/niches" className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800">
                  Cancel
                </a>
                <button
                  type="submit"
                  disabled={loading || !name || !slug}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {loading && (
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  Create Niche
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}
