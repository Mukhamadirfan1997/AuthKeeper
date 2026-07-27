import { useAuth } from '@/contexts/AuthContext'

interface SidebarProps {
  active: string
  onNavigate: (page: string) => void
}

export function Sidebar({ active, onNavigate }: SidebarProps) {
  const { logout } = useAuth()

  const items = [
    { key: 'dashboard', icon: '🏠', label: 'Home' },
    { key: 'favorites', icon: '⭐', label: 'Favorites' },
    { key: 'qr-import', icon: '📷', label: 'Import QR' },
    { key: 'account-form', icon: '➕', label: 'Tambah' },
    { key: 'settings', icon: '⚙️', label: 'Settings' },
  ]

  return (
    <aside className="w-16 lg:w-48 bg-bg-card border-r border-slate-700 flex flex-col items-center lg:items-stretch py-4 gap-1 shrink-0">
      <div className="px-3 lg:px-4 mb-6">
        <h1 className="hidden lg:block text-sm font-bold text-accent">AuthKeeper</h1>
        <p className="hidden lg:block text-xs text-text-secondary mt-0.5">by MUKHAMAD IRFAN</p>
        <span className="lg:hidden text-lg text-accent text-center block">🔐</span>
      </div>

      {items.map((item) => (
        <button
          key={item.key}
          onClick={() => onNavigate(item.key)}
          className={`flex items-center justify-center lg:justify-start gap-3 px-3 lg:px-4 py-2.5 mx-2 rounded-xl transition-colors ${
            active === item.key
              ? 'bg-accent/10 text-accent'
              : 'text-text-secondary hover:text-text-primary hover:bg-slate-700/50'
          }`}
        >
          <span className="text-lg">{item.icon}</span>
          <span className="hidden lg:block text-sm font-medium">{item.label}</span>
        </button>
      ))}

      <div className="flex-1" />

      <button
        onClick={logout}
        className="flex items-center justify-center lg:justify-start gap-3 px-3 lg:px-4 py-2.5 mx-2 mt-4 rounded-xl text-text-secondary hover:text-danger transition-colors"
      >
        <span className="text-lg">🔒</span>
        <span className="hidden lg:block text-sm">Lock</span>
      </button>

      <p className="hidden lg:block text-xs text-text-secondary text-center mt-4 px-4">
        AuthKeeper © Irfan
      </p>
    </aside>
  )
}
