import { useState, useEffect } from 'react'
import { vaultService } from '@/services/vaultService'
import { categoryService } from '@/services/categoryService'
import type { CreateVaultEntryDTO, UpdateVaultEntryDTO } from '@/types/vault'
import type { Category } from '@/types/category'

interface VaultFormProps {
  mode: 'add' | 'edit'
  entryId?: number
  onBack: () => void
  onSaved: () => void
}

export function VaultForm({ mode, entryId, onBack, onSaved }: VaultFormProps) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [favorite, setFavorite] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [showPassword, setShowPassword] = useState(false)
  const [generateLen, setGenerateLen] = useState(16)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    categoryService.getCategories().then(setCategories).catch(() => {})
    if (mode === 'edit' && entryId) {
      vaultService.getEntry(entryId).then((e) => {
        setName(e.name)
        setUsername(e.username || '')
        setPassword(e.password)
        setUrl(e.url || '')
        setNote(e.note || '')
        setCategoryId(e.category_id)
        setFavorite(e.favorite)
      }).catch(() => {})
    }
  }, [mode, entryId])

  const generatePassword = () => {
    setGenerating(true)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-='
    let result = ''
    for (let i = 0; i < generateLen; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setPassword(result)
    setGenerating(false)
  }

  const handleSubmit = async () => {
    if (!name || !password) return
    try {
      if (mode === 'add') {
        const data: CreateVaultEntryDTO = {
          name, username: username || undefined,
          password, url: url || undefined,
          note: note || undefined, category_id: categoryId ?? undefined,
          favorite,
        }
        await vaultService.createEntry(data)
      } else if (entryId) {
        const data: UpdateVaultEntryDTO = {
          name, username: username || undefined,
          password, url: url || undefined,
          note: note || undefined, category_id: categoryId ?? undefined,
          favorite,
        }
        await vaultService.updateEntry(entryId, data)
      }
      onSaved()
    } catch (e) {
      console.error('Failed to save entry', e)
    }
  }

  return (
    <div className="min-h-screen p-4">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-text-secondary text-lg">←</button>
        <h1 className="text-xl font-bold">{mode === 'add' ? 'Tambah Password' : 'Edit Password'}</h1>
        <button onClick={handleSubmit} className="text-accent font-semibold">💾 Save</button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-text-secondary text-sm block mb-1">Nama</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Google, GitHub, dll"
            className="w-full px-4 py-2.5 rounded-xl bg-bg-card text-text-primary placeholder-text-secondary border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>

        <div>
          <label className="text-text-secondary text-sm block mb-1">Username (opsional)</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="user@email.com"
            className="w-full px-4 py-2.5 rounded-xl bg-bg-card text-text-primary placeholder-text-secondary border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>

        <div>
          <label className="text-text-secondary text-sm block mb-1">Password</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 karakter"
                className="w-full px-4 py-2.5 rounded-xl bg-bg-card text-text-primary placeholder-text-secondary border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent font-mono pr-10" />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-accent text-sm"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            <button
              onClick={generatePassword}
              disabled={generating}
              className="bg-bg-card px-3 rounded-xl border border-slate-700 text-sm text-text-secondary hover:text-accent transition-colors disabled:opacity-50"
            >
              🎲
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-text-secondary">Panjang:</span>
            {[8, 12, 16, 20, 24].map((n) => (
              <button
                key={n}
                onClick={() => setGenerateLen(n)}
                className={`px-2 py-0.5 rounded text-xs ${generateLen === n ? 'bg-accent text-white' : 'bg-slate-700 text-text-secondary'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-text-secondary text-sm block mb-1">URL (opsional)</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://"
            className="w-full px-4 py-2.5 rounded-xl bg-bg-card text-text-primary placeholder-text-secondary border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>

        <div>
          <label className="text-text-secondary text-sm block mb-1">Kategori (opsional)</label>
          <select
            value={categoryId ?? ''}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2.5 rounded-xl bg-bg-card text-text-primary border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Tidak ada</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-text-secondary text-sm block mb-1">Catatan (opsional)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3}
            className="w-full px-4 py-2.5 rounded-xl bg-bg-card text-text-primary placeholder-text-secondary border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)}
            className="w-5 h-5 rounded accent-accent" />
          <span className="text-text-primary">Tandai sebagai favorit</span>
        </label>
      </div>
    </div>
  )
}
