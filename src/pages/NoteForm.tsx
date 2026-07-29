import { useState, useEffect } from 'react'
import { noteService } from '@/services/noteService'
import { categoryService } from '@/services/categoryService'
import type { CreateNoteDTO, UpdateNoteDTO } from '@/types/note'
import type { Category } from '@/types/category'
import { ArrowLeft, Save } from 'lucide-react'

interface NoteFormProps {
  mode: 'add' | 'edit'
  noteId?: number
  onBack: () => void
  onSaved: () => void
}

export function NoteForm({ mode, noteId, onBack, onSaved }: NoteFormProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [favorite, setFavorite] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    categoryService.getCategories().then(setCategories).catch(() => {})
    if (mode === 'edit' && noteId) {
      noteService.getNote(noteId).then((n) => {
        setTitle(n.title)
        setContent(n.content)
        setCategoryId(n.category_id)
        setFavorite(n.favorite)
      }).catch(() => {})
    }
  }, [mode, noteId])

  const handleSubmit = async () => {
    if (!title || !content) return
    try {
      if (mode === 'add') {
        const data: CreateNoteDTO = {
          title, content, category_id: categoryId ?? undefined, favorite,
        }
        await noteService.createNote(data)
      } else if (noteId) {
        const data: UpdateNoteDTO = {
          title, content, category_id: categoryId ?? undefined, favorite,
        }
        await noteService.updateNote(noteId, data)
      }
      onSaved()
    } catch (e) {
      console.error('Failed to save note', e)
    }
  }

  return (
    <div className="min-h-screen p-4 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-text-secondary"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold">{mode === 'add' ? 'Tambah Catatan' : 'Ubah Catatan'}</h1>
        <button onClick={handleSubmit} className="text-accent font-semibold"><span className="flex items-center gap-1.5"><Save size={16} /> Simpan</span></button>
      </div>

      <div className="space-y-4 flex-1 flex flex-col">
        <div>
          <label className="text-text-secondary text-sm block mb-1">Judul</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul catatan"
            className="w-full px-4 py-2.5 rounded-xl bg-bg-card text-text-primary placeholder-text-secondary border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent" />
        </div>

        <div className="flex-1 flex flex-col">
          <label className="text-text-secondary text-sm block mb-1">Isi Catatan</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Tulis catatan di sini..."
            className="flex-1 w-full px-4 py-2.5 rounded-xl bg-bg-card text-text-primary placeholder-text-secondary border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent resize-none min-h-[200px]" />
        </div>

        <div>
          <label className="text-text-secondary text-sm block mb-1">Kategori (opsional)</label>
          <select value={categoryId ?? ''}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2.5 rounded-xl bg-bg-card text-text-primary border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Tidak ada</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)}
            className="w-5 h-5 rounded accent-accent" />
          <span className="text-text-primary">Tandai sebagai favorit</span>
        </label>

        <button onClick={handleSubmit}
          className="w-full py-3 rounded-xl bg-accent text-white font-semibold hover:opacity-90 transition-opacity mt-2">
          <span className="flex items-center gap-1.5"><Save size={16} /> Simpan</span>
        </button>
      </div>
    </div>
  )
}
