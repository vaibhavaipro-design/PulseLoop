'use client'

import { useState } from 'react'
import { analyzeBrandVoice, saveManualBrandVoice } from '@/app/actions/brand-voice'

export default function BrandVoiceForm({ initialVoice }: { initialVoice: string | null }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [sample, setSample] = useState('')
  const [voicePrompt, setVoicePrompt] = useState(initialVoice ?? '')

  const handleAnalyze = async () => {
    if (!sample || sample.length < 50) {
      setError('Please provide a longer writing sample (at least 50 characters).')
      return
    }

    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const extracted = await analyzeBrandVoice(sample)
      setVoicePrompt(extracted)
      setSample('') // clear the sample field
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveManual = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      await saveManualBrandVoice(voicePrompt)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-emerald-50 text-emerald-600 text-sm font-medium rounded-lg border border-emerald-100">
          Brand voice updated successfully.
        </div>
      )}

      {/* AI Analyzer */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-5">
        <h4 className="font-bold text-indigo-900 text-sm mb-2">Automated Analysis (Claude 3.5 Sonnet)</h4>
        <p className="text-xs text-indigo-700/80 leading-relaxed mb-4">
          Paste a sample of your best writing (e.g., a newsletter or LinkedIn post). We&apos;ll extract the core style rules to apply to all future documents.
        </p>
        <textarea
          value={sample}
          onChange={(e) => setSample(e.target.value)}
          placeholder="Paste 1-3 paragraphs of your best writing here..."
          rows={4}
          className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 mb-3 block font-medium resize-none shadow-sm"
        />
        <button
          onClick={handleAnalyze}
          disabled={loading || sample.length === 0}
          className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          {loading && sample.length > 0 ? 'Analyzing Style...' : 'Extract Brand Voice'}
        </button>
      </div>

      {/* Manual Prompt */}
      <div>
        <label className="block text-sm font-semibold text-slate-800 mb-1.5 flex items-center justify-between">
          <span>Current Brand Voice Rules</span>
        </label>
        <textarea
          value={voicePrompt}
          onChange={(e) => setVoicePrompt(e.target.value)}
          placeholder="e.g., Concise and punchy. Short sentences. Authoritative tone."
          rows={5}
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium resize-none"
        />
        <div className="flex justify-end mt-3">
          <button
            onClick={handleSaveManual}
            disabled={loading}
            className="h-8 px-4 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {loading && sample.length === 0 ? 'Saving...' : 'Save Manual Edits'}
          </button>
        </div>
      </div>
    </div>
  )
}
