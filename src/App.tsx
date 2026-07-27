import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { useAutoLock } from '@/hooks/useAutoLock'
import { settingsService } from '@/services/settingsService'
import { PinSetup } from '@/pages/PinSetup'
import { PinLogin } from '@/pages/PinLogin'
import { Dashboard } from '@/pages/Dashboard'
import { AccountDetail } from '@/pages/AccountDetail'
import { AccountForm } from '@/pages/AccountForm'
import { Settings as SettingsPage } from '@/pages/Settings'
import { QRImport } from '@/pages/QRImport'
import type { Settings } from '@/types/settings'

type AppPage =
  | { name: 'loading' }
  | { name: 'pin-setup' }
  | { name: 'pin-login' }
  | { name: 'dashboard' }
  | { name: 'account-detail'; id: number }
  | { name: 'account-form'; mode: 'add' | 'edit'; id?: number }
  | { name: 'settings' }
  | { name: 'qr-import' }

function AppContent() {
  const { isAuthenticated, isFirstRun, isLoading, logout } = useAuth()
  const [page, setPage] = useState<AppPage>({ name: 'loading' })
  const [settings, setSettings] = useState<Settings | null>(null)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      settingsService.getSettings().then(setSettings).catch(() => {})
    }
  }, [isLoading, isAuthenticated])

  useAutoLock(settings?.auto_lock ?? 5, logout, isAuthenticated && !!settings)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-secondary">Loading...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    if (isFirstRun) return <PinSetup />
    return <PinLogin />
  }

  const navigate = (name: string, params?: Record<string, string>) => {
    switch (name) {
      case 'dashboard':
        setPage({ name: 'dashboard' })
        break
      case 'account-detail':
        setPage({ name: 'account-detail', id: Number(params?.id) })
        break
      case 'account-form':
        setPage({
          name: 'account-form',
          mode: (params?.mode as 'add' | 'edit') || 'add',
          id: params?.id ? Number(params.id) : undefined,
        })
        break
      case 'settings':
        setPage({ name: 'settings' })
        break
      case 'qr-import':
        setPage({ name: 'qr-import' })
        break
    }
  }

  switch (page.name) {
    case 'account-detail':
      return (
        <AccountDetail
          accountId={page.id}
          onBack={() => setPage({ name: 'dashboard' })}
          onEdit={(id) => setPage({ name: 'account-form', mode: 'edit', id })}
        />
      )
    case 'account-form':
      return (
        <AccountForm
          mode={page.mode}
          accountId={page.id}
          onBack={() => setPage({ name: 'dashboard' })}
          onSaved={() => setPage({ name: 'dashboard' })}
        />
      )
    case 'settings':
      return (
        <SettingsPage
          onBack={() => setPage({ name: 'dashboard' })}
          onNavigate={navigate}
        />
      )
    case 'qr-import':
      return (
        <QRImport
          onBack={() => setPage({ name: 'dashboard' })}
          onDone={() => setPage({ name: 'dashboard' })}
        />
      )
    default:
      return <Dashboard onNavigate={navigate} />
  }
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  )
}
