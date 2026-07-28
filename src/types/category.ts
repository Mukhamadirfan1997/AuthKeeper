export interface Category {
  id: number
  name: string
  icon: string | null
  color: string | null
  created_at: string
  updated_at: string
}

export interface CreateCategoryDTO {
  name: string
  icon?: string
  color?: string
}

export interface UpdateCategoryDTO {
  name?: string
  icon?: string
  color?: string
}
