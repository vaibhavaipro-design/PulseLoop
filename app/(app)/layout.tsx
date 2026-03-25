import { redirect } from 'next/navigation'
import { getUser, getWorkspace, getSubscription } from '@/lib/data/queries'
import Shell from '@/components/layout/Shell'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()
  if (!user) redirect('/login')

  // workspace + subscription: subscription depends on workspace.id so these
  // must be sequential, but React.cache() means child pages pay nothing for
  // these same calls.
  const workspace = await getWorkspace(user.id)
  const subscription = workspace ? await getSubscription(workspace.id) : null

  const planName = subscription?.plan?.toUpperCase() ?? 'TRIAL'
  const displayName = user.email?.split('@')[0] ?? 'User'

  return (
    <Shell userName={displayName} planName={planName}>
      {children}
    </Shell>
  )
}
