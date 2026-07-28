import { invoke } from '@tauri-apps/api/core'
import type { SecureNote, CreateNoteDTO, UpdateNoteDTO } from '@/types/note'

export const noteService = {
  async getNotes(): Promise<SecureNote[]> {
    return invoke<SecureNote[]>('get_notes')
  },

  async getNote(id: number): Promise<SecureNote> {
    return invoke<SecureNote>('get_note', { id })
  },

  async createNote(data: CreateNoteDTO): Promise<SecureNote> {
    return invoke<SecureNote>('create_note', { data })
  },

  async updateNote(id: number, data: UpdateNoteDTO): Promise<SecureNote> {
    return invoke<SecureNote>('update_note', { id, data })
  },

  async deleteNote(id: number): Promise<boolean> {
    return invoke<boolean>('delete_note', { id })
  },

  async toggleFavorite(id: number): Promise<boolean> {
    return invoke<boolean>('toggle_note_favorite', { id })
  },

  async searchNotes(q: string): Promise<SecureNote[]> {
    return invoke<SecureNote[]>('search_notes', { q })
  },
}
