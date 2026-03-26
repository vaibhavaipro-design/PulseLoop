'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PLAN_LIMITS } from '@/lib/plans'
import {
  updateDisplayName,
  changePassword,
  deleteAccount,
} from '@/app/actions/settings'
import {
  updateWorkspaceName,
  createWorkspace,
  deleteWorkspace,
} from '@/app/actions/workspaces'

interface Workspace {
  id: string
  name: string
}

interface Props {
  plan: string
  displayName: string
  allWorkspaces: Workspace[]
}

// ── Workspace Management (Agency only) ───────────────────────────

function WorkspaceManagement({ allWorkspaces }: { allWorkspaces: Workspace[] }) {
  const [workspaces, setWorkspaces] = useState(allWorkspaces)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState<string | null>(null)
  const [newWsName, setNewWsName] = useState('')
  const [addError, setAddError] = useState<string | null>(null)
  const [addSuccess, setAddSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  const startRename = (ws: Workspace) => {
    setRenamingId(ws.id)
    setRenameValue(ws.name)
    setRenameError(null)
  }

  const handleRename = (workspaceId: string) => {
    const trimmed = renameValue.trim()
    if (!trimmed) { setRenameError('Name cannot be empty'); return }
    setRenameError(null)
    startTransition(async () => {
      const res = await updateWorkspaceName(workspaceId, trimmed).catch(() => ({ error: 'Failed to rename workspace' }))
      if (res && 'error' in res) {
        setRenameError(res.error as string)
      } else {
        setWorkspaces(prev => prev.map(w => w.id === workspaceId ? { ...w, name: trimmed } : w))
        setRenamingId(null)
      }
    })
  }

  const handleDelete = (workspaceId: string, wsName: string) => {
    if (!confirm(`Are you sure? This will delete all data in "${wsName}".`)) return
    startTransition(async () => {
      try {
        await deleteWorkspace(workspaceId)
        setWorkspaces(prev => prev.filter(w => w.id !== workspaceId))
      } catch (err: any) {
        alert(err.message ?? 'Failed to delete workspace')
      }
    })
  }

  const handleAdd = () => {
    const trimmed = newWsName.trim()
    if (!trimmed) { setAddError('Name cannot be empty'); return }
    setAddError(null)
    setAddSuccess(false)
    startTransition(async () => {
      const res = await createWorkspace(trimmed)
      if (res && 'error' in res) {
        setAddError(res.error as string)
      } else {
        setNewWsName('')
        setAddSuccess(true)
        setTimeout(() => setAddSuccess(false), 3000)
      }
    })
  }

  const atMax = workspaces.length >= PLAN_LIMITS['agency'].workspaces

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-slate-800 mb-1">Workspace Management</h3>
      <p className="text-sm text-slate-500 mb-6 border-b border-slate-100 pb-4">
        Manage your Agency workspaces. Each workspace is fully isolated.
      </p>

      <div className="space-y-2 mb-4">
        {workspaces.map(ws => (
          <div key={ws.id} className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg">
            {renamingId === ws.id ? (
              <>
                <input
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(ws.id); if (e.key === 'Escape') setRenamingId(null) }}
                  className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-md outline-none focus:border-indigo-400"
                  autoFocus
                />
                <button
                  onClick={() => handleRename(ws.id)}
                  disabled={isPending}
                  className="h-7 px-3 text-[12px] font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setRenamingId(null)}
                  className="h-7 px-2 text-[12px] text-slate-500 rounded-md hover:bg-slate-200"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm font-medium text-slate-700">{ws.name}</span>
                <button
                  onClick={() => startRename(ws)}
                  className="h-7 px-2 text-[12px] text-slate-500 rounded-md hover:bg-slate-200 transition-colors"
                >
                  Rename
                </button>
                <button
                  onClick={() => handleDelete(ws.id, ws.name)}
                  disabled={isPending || workspaces.length <= 1}
                  className="h-7 px-2 text-[12px] text-red-500 rounded-md hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        ))}
        {renameError && (
          <p className="text-[12px] text-red-600 mt-1">{renameError}</p>
        )}
      </div>

      {/* Add workspace */}
      {!atMax && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              value={newWsName}
              onChange={e => setNewWsName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              placeholder="New workspace name"
              className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md outline-none focus:border-indigo-400"
            />
            <button
              onClick={handleAdd}
              disabled={isPending}
              className="h-9 px-4 text-sm font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50"
            >
              Add workspace
            </button>
          </div>
          {addError && <p className="text-[12px] text-red-600">{addError}</p>}
          {addSuccess && <p className="text-[12px] text-emerald-600">Workspace created successfully.</p>}
          <p className="text-[11px] text-slate-400">{workspaces.length} of {PLAN_LIMITS['agency'].workspaces} workspaces used</p>
        </div>
      )}
      {atMax && (
        <p className="text-[12px] text-slate-500">Maximum of {PLAN_LIMITS['agency'].workspaces} workspaces reached on Agency plan.</p>
      )}
    </div>
  )
}

// ── Profile Section ───────────────────────────────────────────────

function ProfileSection({ displayName }: { displayName: string }) {
  const [nameValue, setNameValue] = useState(displayName)
  const [nameMsg, setNameMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSaveName = () => {
    setNameMsg(null)
    startTransition(async () => {
      const res = await updateDisplayName(nameValue)
      if (res && 'error' in res) {
        setNameMsg({ type: 'error', text: res.error as string })
      } else {
        setNameMsg({ type: 'success', text: 'Display name updated.' })
        setTimeout(() => setNameMsg(null), 3000)
      }
    })
  }

  const handleChangePassword = () => {
    setPasswordMsg(null)
    if (!newPassword) { setPasswordMsg({ type: 'error', text: 'Enter a new password.' }); return }
    if (newPassword !== confirmPassword) { setPasswordMsg({ type: 'error', text: 'Passwords do not match.' }); return }
    startTransition(async () => {
      const res = await changePassword(newPassword)
      if (res && 'error' in res) {
        setPasswordMsg({ type: 'error', text: res.error as string })
      } else {
        setNewPassword('')
        setConfirmPassword('')
        setPasswordMsg({ type: 'success', text: 'Password changed successfully.' })
        setTimeout(() => setPasswordMsg(null), 3000)
      }
    })
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-slate-800 mb-1">Profile</h3>
      <p className="text-sm text-slate-500 mb-6 border-b border-slate-100 pb-4">
        Update your display name and password.
      </p>

      {/* Display name */}
      <div className="space-y-1 mb-5">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Display Name</label>
        <div className="flex gap-2">
          <input
            value={nameValue}
            onChange={e => setNameValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveName() }}
            placeholder="Your name"
            className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md outline-none focus:border-indigo-400"
          />
          <button
            onClick={handleSaveName}
            disabled={isPending}
            className="h-9 px-4 text-sm font-semibold bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            Save
          </button>
        </div>
        {nameMsg && (
          <p className={`text-[12px] ${nameMsg.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
            {nameMsg.text}
          </p>
        )}
      </div>

      {/* Change password */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Change Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={e => setNewPassword(e.target.value)}
          placeholder="New password (min 8 characters)"
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md outline-none focus:border-indigo-400"
        />
        <input
          type="password"
          value={confirmPassword}
          onChange={e => setConfirmPassword(e.target.value)}
          placeholder="Confirm new password"
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md outline-none focus:border-indigo-400"
        />
        <button
          onClick={handleChangePassword}
          disabled={isPending}
          className="h-9 px-4 text-sm font-semibold bg-slate-800 text-white rounded-md hover:bg-slate-900 disabled:opacity-50"
        >
          Change Password
        </button>
        {passwordMsg && (
          <p className={`text-[12px] ${passwordMsg.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
            {passwordMsg.text}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Danger Zone ───────────────────────────────────────────────────

function DangerZone() {
  const router = useRouter()
  const [confirmText, setConfirmText] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleDeleteAccount = () => {
    if (confirmText !== 'DELETE') { setError('Type DELETE to confirm.'); return }
    setError(null)
    startTransition(async () => {
      const res = await deleteAccount()
      if (res && 'error' in res) {
        setError(res.error as string)
      } else {
        router.push('/login')
      }
    })
  }

  return (
    <div className="bg-white border-2 border-red-200 rounded-xl p-6 shadow-sm">
      <h3 className="text-lg font-bold text-red-700 mb-1">Danger Zone</h3>
      <p className="text-sm text-slate-500 mb-6 border-b border-red-100 pb-4">
        Destructive actions. These cannot be undone.
      </p>

      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="h-9 px-4 text-sm font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
        >
          Delete Account
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-700">
            This will permanently delete your account and all workspace data. Type{' '}
            <strong className="font-bold text-red-600">DELETE</strong> to confirm.
          </p>
          <input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder="Type DELETE to confirm"
            className="w-full px-3 py-2 text-sm border border-red-300 rounded-md outline-none focus:border-red-500"
          />
          {error && <p className="text-[12px] text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleDeleteAccount}
              disabled={isPending || confirmText !== 'DELETE'}
              className="h-9 px-4 text-sm font-semibold bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Deleting…' : 'Permanently Delete Account'}
            </button>
            <button
              onClick={() => { setShowConfirm(false); setConfirmText(''); setError(null) }}
              className="h-9 px-4 text-sm font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────

export default function SettingsClient({ plan, displayName, allWorkspaces }: Props) {
  const isAgency = plan === 'agency'

  return (
    <>
      {/* Workspace Management — Agency only */}
      {isAgency && (
        <WorkspaceManagement allWorkspaces={allWorkspaces} />
      )}

      {/* Profile */}
      <ProfileSection displayName={displayName} />

      {/* Danger Zone */}
      <DangerZone />
    </>
  )
}
