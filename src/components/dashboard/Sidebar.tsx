import { Home, Star, Lock, FileText, Camera, Plus, Settings, LogOut, Shield } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface SidebarItem {
  key: string
  icon: React.ReactNode
  label: string
}

interface SidebarProps {
  active: string
  onNavigate: (page: string) => void
}

export function Sidebar({ active, onNavigate }: SidebarProps) {
  const { logout } = useAuth()

  const items: SidebarItem[] = [
    { key: 'dashboard', icon: <Home size={20} />, label: 'Beranda' },
    { key: 'favorites', icon: <Star size={20} />, label: 'Favorit' },
    { key: 'vault', icon: <Lock size={20} />, label: 'Kata Sandi' },
    { key: 'notes', icon: <FileText size={20} />, label: 'Catatan' },
    { key: 'qr-import', icon: <Camera size={20} />, label: 'Impor QR' },
    { key: 'account-form', icon: <Plus size={20} />, label: 'Tambah' },
    { key: 'settings', icon: <Settings size={20} />, label: 'Pengaturan' },
  ]

  return (
    <aside className="w-16 lg:w-48 bg-bg-card border-r border-slate-700 flex flex-col items-center lg:items-stretch py-4 gap-1 shrink-0 shadow-sm">
      <div className="px-3 lg:px-4 mb-6">
        <h1 className="hidden lg:block text-sm font-bold text-accent">AuthKeeper</h1>
        <p className="hidden lg:block text-xs text-text-secondary mt-0.5">by MUKHAMAD IRFAN</p>
        <span className="lg:hidden flex justify-center text-accent"><Shield size={22} /></span>
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
          <span className="flex items-center">{item.icon}</span>
          <span className="hidden lg:block text-sm font-medium">{item.label}</span>
        </button>
      ))}

      <div className="flex-1" />

      <button
        onClick={logout}
        className="flex items-center justify-center lg:justify-start gap-3 px-3 lg:px-4 py-2.5 mx-2 mt-4 rounded-xl text-text-secondary hover:text-danger transition-colors"
      >
        <LogOut size={20} />
        <span className="hidden lg:block text-sm">Kunci</span>
      </button>

      <p className="hidden lg:block text-xs text-text-secondary text-center mt-4 px-4">
        AuthKeeper © Irfan
      </p>
    </aside>
  )
}
