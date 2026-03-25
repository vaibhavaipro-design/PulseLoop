import Topbar from '@/components/layout/Topbar'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import BrandVoiceForm from './BrandVoiceForm'

export default async function SettingsPage() {
  const supabase = createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get workspace
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('user_id', user.id)
    .single()

  // Get brand voice from brand_voice_profiles (the table all generation routes read)
  const { data: brandVoiceProfile } = workspace
    ? await supabase
        .from('brand_voice_profiles')
        .select('content')
        .eq('workspace_id', workspace.id)
        .maybeSingle()
    : { data: null }

  // Get subscription
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('plan, current_period_end')
    .eq('workspace_id', workspace?.id)
    .single()

  const planName = sub?.plan ?? 'trial'
  const isTrial = planName === 'trial'

  return (
    <>
      <Topbar title="Settings" />
      <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
        <div className="max-w-2xl space-y-6 mx-auto mt-4">
          
          {/* Brand Voice Section */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Brand Voice</h3>
            <p className="text-sm text-slate-500 mb-6 border-b border-slate-100 pb-4">
              Train PulseLoop to write reports and newsletters in your exact tone of voice.
            </p>
            <BrandVoiceForm initialVoice={brandVoiceProfile?.content ?? null} />
          </div>

          {/* Plan section */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">Current Plan</h3>
                <p className="text-sm text-slate-500">Manage your subscription and billing.</p>
              </div>
              <div className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold text-sm uppercase tracking-wider rounded-md border border-indigo-100">
                {planName}
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {isTrial ? 'Trial active' : 'Subscription active'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Next billing cycle begins {new Date(sub?.current_period_end ?? new Date()).toLocaleDateString()}
                </p>
              </div>
              {isTrial || planName !== 'agency' ? (
                <a
                  href="/upgrade"
                  className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center"
                >
                  {isTrial ? 'Choose a plan →' : 'Upgrade plan →'}
                </a>
              ) : (
                <span className="text-xs text-slate-400 font-medium">Agency plan active</span>
              )}
            </div>
          </div>

          {/* Account section */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-1">Account</h3>
            <p className="text-sm text-slate-500 mb-4 border-b border-slate-100 pb-4">Email and profile settings.</p>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Email</label>
                <div className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 mt-1">
                  {user.email}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
