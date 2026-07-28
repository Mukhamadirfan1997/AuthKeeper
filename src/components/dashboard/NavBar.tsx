interface NavBarProps {
  active: string
  onNavigate: (page: string) => void
}

export function NavBar({ active, onNavigate }: NavBarProps) {
  const tabs = [
    { key: 'dashboard', label: '🏠', text: 'Home' },
    { key: 'vault', label: '🔐', text: 'Vault' },
    { key: 'notes', label: '📝', text: 'Notes' },
    { key: 'favorites', label: '⭐', text: 'Fav' },
    { key: 'settings', label: '⚙️', text: 'Settings' },
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
          <span className="text-lg">{tab.label}</span>
          <span className="text-xs">{tab.text}</span>
        </button>
      ))}
    </nav>
  )
}
