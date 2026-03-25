import { redirect } from 'next/navigation'
import { getUser, getWorkspaceWithSub } from '@/lib/data/queries'
import Shell from '@/components/layout/Shell'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUser()
  if (!user) redirect('/login')

  // Single DB round-trip: workspace + subscription via JOIN.
  // React.cache() means child pages that call getWorkspaceWithSub() get this
  // result for free on the initial full-page render.
  const { workspace, subscription } = await getWorkspaceWithSub(user.id)

  const planName = subscription?.plan?.toUpperCase() ?? 'TRIAL'
  const displayName = user.email?.split('@')[0] ?? 'User'

  return (
    <Shell userName={displayName} planName={planName}>
      {children}
    </Shell>
  )
}
