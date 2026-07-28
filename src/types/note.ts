export interface SecureNote {
  id: number
  title: string
  content: string
  icon: string | null
  category_id: number | null
  favorite: boolean
  created_at: string
  updated_at: string
}

export interface CreateNoteDTO {
  title: string
  content: string
  icon?: string
  category_id?: number
  favorite?: boolean
}

export interface UpdateNoteDTO {
  title?: string
  content?: string
  icon?: string
  category_id?: number
  favorite?: boolean
}
