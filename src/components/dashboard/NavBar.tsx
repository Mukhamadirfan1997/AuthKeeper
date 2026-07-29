import { Home, Lock, FileText, Star, Settings } from 'lucide-react'

interface NavBarProps {
  active: string
  onNavigate: (page: string) => void
}

export function NavBar({ active, onNavigate }: NavBarProps) {
  const tabs = [
    { key: 'dashboard', icon: <Home size={20} />, text: 'Beranda' },
    { key: 'vault', icon: <Lock size={20} />, text: 'Sandi' },
    { key: 'notes', icon: <FileText size={20} />, text: 'Catatan' },
    { key: 'favorites', icon: <Star size={20} />, text: 'Favorit' },
    { key: 'settings', icon: <Settings size={20} />, text: 'Atur' },
  ]

  return (
    <nav className="flex justify-around items-center py-3 px-4 bg-bg-card border-t border-slate-700 fixed bottom-0 left-0 right-0 z-50">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onNavigate(tab.key)}
          className={`flex flex-col items-center gap-1 px-4 py-1 rounded-lg transition-colors ${
            active === tab.key ? 'text-accent' : 'text-text-secondary'
          }`}
        >
          {tab.icon}
          <span className="text-xs">{tab.text}</span>
        </button>
      ))}
    </nav>
  )
}
