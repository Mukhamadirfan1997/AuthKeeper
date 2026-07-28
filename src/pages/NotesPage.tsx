import { useState, useEffect, useCallback } from 'react'
import { noteService } from '@/services/noteService'
import { categoryService } from '@/services/categoryService'
import { NavBar } from '@/components/dashboard/NavBar'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { useWindowSize } from '@/hooks/useWindowSize'
import type { SecureNote } from '@/types/note'
import type { Category } from '@/types/category'

interface NotesPageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export function NotesPage({ onNavigate }: NotesPageProps) {
  const { isLarge } = useWindowSize()
  const [notes, setNotes] = useState<SecureNote[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [search, setSearch] = useState('')
  const [filterFav, setFilterFav] = useState(false)
  const [selected, setSelected] = useState<SecureNote | null>(null)

  const load = useCallback(async () => {
    try {
      const [n, c] = await Promise.all([noteService.getNotes(), categoryService.getCategories()])
      setNotes(n)
      setCategories(c)
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = notes.filter((n) => {
    const q = search.toLowerCase()
    const match = n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q)
    if (filterFav) return match && n.favorite
    return match
  })

  const getCategoryInfo = (catId: number | null) => categories.find((c) => c.id === catId)

  const preview = (content: string, max = 100) =>
    content.length > max ? content.slice(0, max) + '...' : content

  const noteDetail = selected ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSelected(null)}>
      <div className="bg-bg-primary rounded-2xl p-6 w-[90%] max-w-sm border border-slate-700 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-primary">{selected.icon || '📝'} {selected.title}</h2>
          <button onClick={() => setSelected(null)} className="text-text-secondary text-lg">✕</button>
        </div>
        <div className="bg-bg-card rounded-xl p-4 whitespace-pre-wrap text-text-primary text-sm leading-relaxed">
          {selected.content}
        </div>
        {selected.category_id && (
          <p className="text-text-secondary text-xs mt-3">
            {getCategoryInfo(selected.category_id)?.icon} {getCategoryInfo(selected.category_id)?.name}
          </p>
        )}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => { onNavigate('note-form', { mode: 'edit', id: String(selected.id) }); setSelected(null) }}
            className="flex-1 py-2.5 rounded-xl bg-accent/10 text-accent font-semibold border border-accent/30 hover:bg-accent/20 transition-colors"
          >
            ✏️ Edit
          </button>
          <button
            onClick={async () => { await noteService.toggleFavorite(selected.id); load(); setSelected(null) }}
            className="flex-1 py-2.5 rounded-xl bg-slate-700 text-text-primary font-semibold hover:bg-slate-600 transition-colors"
          >
            {selected.favorite ? '⭐ Unfavorite' : '⭐ Favorite'}
          </button>
        </div>
      </div>
    </div>
  ) : null

  const mainContent = (
    <div className="flex-1 p-4 overflow-y-auto min-w-0 pb-20">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">📝 Secure Notes</h1>
        <button
          onClick={() => onNavigate('note-form', { mode: 'add' })}
          className="bg-accent text-white w-10 h-10 rounded-xl text-2xl flex items-center justify-center hover:opacity-90 transition-opacity"
        >
          +
        </button>
      </div>

      <input
        type="text"
        placeholder="Cari catatan..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl bg-bg-card text-text-primary placeholder-text-secondary border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent mb-3"
      />

      <div className="flex gap-2 mb-4">
        <button onClick={() => setFilterFav(false)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${!filterFav ? 'bg-accent text-white' : 'bg-bg-card text-text-secondary'}`}>Semua</button>
        <button onClick={() => setFilterFav(true)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${filterFav ? 'bg-accent text-white' : 'bg-bg-card text-text-secondary'}`}>⭐ Favorit</button>
      </div>

      <div className="flex flex-col gap-3">
        {filtered.map((note) => {
          const cat = getCategoryInfo(note.category_id)
          return (
            <div
              key={note.id}
              onClick={() => setSelected(note)}
              className="bg-bg-card rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{note.icon || '📝'}</span>
                  <h3 className="text-text-primary font-semibold">{note.title}</h3>
                  {note.favorite && <span className="text-favorite text-xs">★</span>}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); noteService.toggleFavorite(note.id).then(load) }}
                  className={`text-lg ${note.favorite ? 'text-favorite' : 'text-text-secondary'}`}
                >
                  ★
                </button>
              </div>
              <p className="text-text-secondary text-sm ml-8">{preview(note.content)}</p>
              {cat && <span className="text-xs text-text-secondary ml-8 mt-1 inline-block bg-slate-700 px-2 py-0.5 rounded">{cat.icon} {cat.name}</span>}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="text-text-secondary text-center mt-8">
            {notes.length === 0 ? 'Belum ada catatan. Tambah dengan tombol +' : 'Tidak ditemukan'}
          </p>
        )}
      </div>

      {noteDetail}
    </div>
  )

  if (isLarge) {
    return (
      <div className="min-h-screen flex">
        <Sidebar active="notes" onNavigate={onNavigate} />
        {mainContent}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {mainContent}
      <NavBar active="notes" onNavigate={(p) => onNavigate(p)} />
    </div>
  )
}
