import { useState, useEffect, useCallback } from 'react'
import { vaultService } from '@/services/vaultService'
import { categoryService } from '@/services/categoryService'
import { NavBar } from '@/components/dashboard/NavBar'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { useWindowSize } from '@/hooks/useWindowSize'
import type { VaultEntry } from '@/types/vault'
import type { Category } from '@/types/category'
import { Lock, Key, Star, Eye, EyeOff, ClipboardList, Pencil, Trash2, X, Check } from 'lucide-react'

interface VaultPageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export function VaultPage({ onNavigate }: VaultPageProps) {
  const { isLarge } = useWindowSize()
  const [entries, setEntries] = useState<VaultEntry[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [filterFav, setFilterFav] = useState(false)
  const [selected, setSelected] = useState<VaultEntry | null>(null)
  const [showPassword, setShowPassword] = useState<Record<number, boolean>>({})
  const [copied, setCopied] = useState<Record<number, boolean>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const [e, c] = await Promise.all([
        vaultService.getEntries(),
        categoryService.getCategories(),
      ])
      setEntries(e)
      setCategories(c)
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase()
    const match = e.name.toLowerCase().includes(q) || (e.username?.toLowerCase().includes(q) ?? false)
    if (filterFav) return match && e.favorite
    return match
  })

  const copyPassword = async (id: number, password: string) => {
    try {
      await navigator.clipboard.writeText(password)
      setCopied((p) => ({ ...p, [id]: true }))
      setTimeout(() => setCopied((p) => ({ ...p, [id]: false })), 2000)
    } catch {}
  }

  const getCategoryInfo = (catId: number | null) =>
    categories.find((c) => c.id === catId)

  const handleDelete = async (id: number) => {
    try {
      await vaultService.deleteEntry(id)
      setDeleteConfirm(null)
      setSelected(null)
      load()
    } catch {}
  }

  const entryDetail = selected ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSelected(null)}>
      <div className="bg-bg-primary rounded-2xl p-6 w-[90%] max-w-sm border border-slate-700" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">{selected.icon || <Key size={20} />} {selected.name}</h2>
          <button onClick={() => setSelected(null)} className="text-text-secondary"><X size={20} /></button>
        </div>
        <div className="space-y-3 text-sm">
          {selected.username && (
            <div>
              <p className="text-text-secondary text-xs">Username</p>
              <p className="text-text-primary">{selected.username}</p>
            </div>
          )}
          <div>
            <p className="text-text-secondary text-xs">Password</p>
            <div className="flex items-center gap-2">
              <p className="text-text-primary font-mono flex-1 break-all">
                {showPassword[selected.id] ? selected.password : '••••••••'}
              </p>
              <button
                onClick={() => setShowPassword((p) => ({ ...p, [selected.id]: !p[selected.id] }))}
                className="text-text-secondary hover:text-accent text-xs"
              >
                {showPassword[selected.id] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
              <button
                onClick={() => copyPassword(selected.id, selected.password)}
                className="text-text-secondary hover:text-accent text-xs"
              >
                {copied[selected.id] ? <Check size={16} /> : <ClipboardList size={16} />}
              </button>
            </div>
          </div>
          {selected.url && (
            <div>
              <p className="text-text-secondary text-xs">URL</p>
              <p className="text-accent text-xs break-all">{selected.url}</p>
            </div>
          )}
          {selected.note && (
            <div>
              <p className="text-text-secondary text-xs">Catatan</p>
              <p className="text-text-primary whitespace-pre-wrap">{selected.note}</p>
            </div>
          )}
          {selected.category_id && (
            <div>
              <p className="text-text-secondary text-xs">Kategori</p>
              <p className="text-text-primary">{getCategoryInfo(selected.category_id)?.icon} {getCategoryInfo(selected.category_id)?.name}</p>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-6">
          <button
            onClick={() => { onNavigate('vault-form', { mode: 'edit', id: String(selected.id) }); setSelected(null) }}
            className="flex-1 py-2.5 rounded-xl bg-accent/10 text-accent font-semibold border border-accent/30 hover:bg-accent/20 transition-colors"
          >
            <span className="flex items-center gap-1.5"><Pencil size={16} /> Ubah</span>
          </button>
          <button
            onClick={async () => {
              await vaultService.toggleFavorite(selected.id)
              load()
            }}
            className="flex-1 py-2.5 rounded-xl bg-slate-700 text-text-primary font-semibold hover:bg-slate-600 transition-colors"
          >
            <span className="flex items-center gap-1.5">{selected.favorite ? <><Star size={16} fill="currentColor" /> Hapus Favorit</> : <><Star size={16} /> Favorit</>}</span>
          </button>
          <button
            onClick={() => setDeleteConfirm(selected.id)}
            className="py-2.5 px-3 rounded-xl bg-danger/10 text-danger font-semibold hover:bg-danger/20 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
        {deleteConfirm === selected.id && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-slate-700">
            <p className="text-xs text-text-secondary flex-1">Hapus entry ini?</p>
            <button onClick={() => handleDelete(selected.id)} className="text-xs text-danger font-semibold hover:opacity-80">Hapus</button>
            <button onClick={() => setDeleteConfirm(null)} className="text-xs text-text-secondary hover:text-text-primary">Batal</button>
          </div>
        )}
      </div>
    </div>
  ) : null

  const mainContent = (
    <div className="flex-1 p-4 overflow-y-auto min-w-0 pb-20">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2"><Lock size={20} /> Kata Sandi</h1>
        <button
          onClick={() => onNavigate('vault-form', { mode: 'add' })}
          className="bg-accent text-white w-10 h-10 rounded-xl text-2xl flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          +
        </button>
      </div>

      <input
        type="text"
        placeholder="Cari kata sandi..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl bg-bg-card text-text-primary placeholder-text-secondary border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent mb-3"
      />

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setFilterFav(false)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${!filterFav ? 'bg-accent text-white' : 'bg-bg-card text-text-secondary'}`}
        >
          Semua
        </button>
        <button
          onClick={() => setFilterFav(true)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterFav ? 'bg-accent text-white' : 'bg-bg-card text-text-secondary'}`}
        >
          <span className="flex items-center gap-1"><Star size={14} /> Favorit</span>
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((entry) => {
          const cat = getCategoryInfo(entry.category_id)
          return (
            <div
              key={entry.id}
              onClick={() => setSelected(entry)}
              className="bg-bg-card rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-transform shadow-sm"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-6 h-6">{entry.icon || <Key size={20} />}</span>
                    <h3 className="text-text-primary font-semibold">{entry.name}</h3>
                    {entry.favorite && <Star size={12} className="text-favorite" fill="currentColor" />}
                  </div>
                  {entry.username && (
                    <p className="text-text-secondary text-sm ml-8">{entry.username}</p>
                  )}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); vaultService.toggleFavorite(entry.id).then(load) }}
                  className={`text-lg ${entry.favorite ? 'text-favorite' : 'text-text-secondary'}`}
                >
                  <Star size={16} fill={entry.favorite ? 'currentColor' : 'none'} />
                </button>
              </div>
              <div className="flex items-center gap-2 ml-8">
                <p className="text-text-secondary font-mono text-sm flex-1">••••••••</p>
                {cat && (
                  <span className="text-xs text-text-secondary bg-slate-700 px-2 py-0.5 rounded">
                    {cat.icon} {cat.name}
                  </span>
                )}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-text-secondary text-center mt-8">
            {entries.length === 0 ? 'Belum ada kata sandi. Tekan + untuk menambah' : 'Tidak ditemukan'}
          </p>
        )}
      </div>

      {entryDetail}
    </div>
  )

  if (isLarge) {
    return (
      <div className="min-h-screen flex">
        <Sidebar active="vault" onNavigate={onNavigate} />
        {mainContent}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {mainContent}
      <NavBar active="vault" onNavigate={(p) => onNavigate(p)} />
    </div>
  )
}
