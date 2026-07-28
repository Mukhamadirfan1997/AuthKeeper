import { useState, useEffect } from 'react'
import { categoryService } from '@/services/categoryService'
import type { Category } from '@/types/category'

const ICON_OPTIONS = ['📁', '📧', '🌐', '💰', '💼', '🎓', '🏥', '🛒', '🎮', '📡', '🔧', '🎵', '📸', '🏠', '❤️', '⭐', '🔒', '📊', '✈️', '🎯']
const COLOR_OPTIONS = ['#6366f1', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316', '#84cc16']

interface CategoryManagerProps {
  onClose: () => void
}

export function CategoryManager({ onClose }: CategoryManagerProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editIcon, setEditIcon] = useState('📁')
  const [editColor, setEditColor] = useState('#6366f1')
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('📁')
  const [newColor, setNewColor] = useState('#6366f1')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  useEffect(() => {
    categoryService.getCategories().then(setCategories).catch(() => {})
  }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      await categoryService.createCategory({ name: newName.trim(), icon: newIcon, color: newColor })
      setNewName('')
      setNewIcon('📁')
      setNewColor('#6366f1')
      const list = await categoryService.getCategories()
      setCategories(list)
    } catch {}
  }

  const handleUpdate = async (id: number) => {
    if (!editName.trim()) return
    try {
      await categoryService.updateCategory(id, { name: editName.trim(), icon: editIcon, color: editColor })
      setEditingId(null)
      const list = await categoryService.getCategories()
      setCategories(list)
    } catch {}
  }

  const handleDelete = async (id: number) => {
    try {
      await categoryService.deleteCategory(id)
      setDeleteConfirm(null)
      const list = await categoryService.getCategories()
      setCategories(list)
    } catch {}
  }

  const startEdit = (cat: Category) => {
    setEditingId(cat.id)
    setEditName(cat.name)
    setEditIcon(cat.icon || '📁')
    setEditColor(cat.color || '#6366f1')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-bg-primary rounded-2xl p-6 w-[90%] max-w-md border border-slate-700 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-text-primary">🏷️ Atur Kategori</h2>
          <button onClick={onClose} className="text-text-secondary text-lg">✕</button>
        </div>

        <div className="space-y-3 mb-6">
          <p className="text-text-secondary text-xs">Buat kategori baru</p>
          <div className="flex gap-2">
            <div className="relative">
              <select value={newIcon} onChange={(e) => setNewIcon(e.target.value)}
                className="appearance-none bg-bg-card border border-slate-700 rounded-xl px-3 py-2.5 text-lg cursor-pointer">
                {ICON_OPTIONS.map((ico) => <option key={ico} value={ico}>{ico}</option>)}
              </select>
            </div>
            <input value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="Nama kategori"
              className="flex-1 px-3 py-2.5 rounded-xl bg-bg-card text-text-primary placeholder-text-secondary border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent text-sm" />
            <button onClick={handleCreate}
              disabled={!newName.trim()}
              className="px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50">
              Tambah
            </button>
          </div>
          <div className="flex gap-1">
            {COLOR_OPTIONS.map((c) => (
              <button key={c} onClick={() => setNewColor(c)}
                className={`w-6 h-6 rounded-full border-2 ${newColor === c ? 'border-white scale-110' : 'border-transparent'} transition-transform`}
                style={{ backgroundColor: c }} />
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-bg-card rounded-xl p-3">
              {editingId === cat.id ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select value={editIcon} onChange={(e) => setEditIcon(e.target.value)}
                      className="appearance-none bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-lg cursor-pointer">
                      {ICON_OPTIONS.map((ico) => <option key={ico} value={ico}>{ico}</option>)}
                    </select>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1.5 rounded-lg bg-slate-700 text-text-primary border border-slate-600 focus:outline-none focus:ring-2 focus:ring-accent text-sm" />
                  </div>
                  <div className="flex gap-1">
                    {COLOR_OPTIONS.map((c) => (
                      <button key={c} onClick={() => setEditColor(c)}
                        className={`w-5 h-5 rounded-full border-2 ${editColor === c ? 'border-white scale-110' : 'border-transparent'} transition-transform`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(cat.id)}
                      className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold">Simpan</button>
                    <button onClick={() => setEditingId(null)}
                      className="px-3 py-1.5 rounded-lg bg-slate-700 text-text-secondary text-xs">Batal</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{cat.icon || '📁'}</span>
                    <div>
                      <p className="text-text-primary text-sm font-semibold">{cat.name}</p>
                      <p className="text-text-secondary text-xs">{cat.color}</p>
                    </div>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color || '#6366f1' }} />
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(cat)}
                      className="text-text-secondary hover:text-accent text-xs px-2 py-1">✏️</button>
                    {deleteConfirm === cat.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(cat.id)}
                          className="text-danger text-xs px-2 py-1 bg-danger/10 rounded">Hapus</button>
                        <button onClick={() => setDeleteConfirm(null)}
                          className="text-text-secondary text-xs px-2 py-1">Batal</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(cat.id)}
                        className="text-text-secondary hover:text-danger text-xs px-2 py-1">🗑️</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-text-secondary text-center text-sm">Belum ada kategori</p>
          )}
        </div>
      </div>
    </div>
  )
}
