export interface VaultEntry {
  id: number
  name: string
  username: string | null
  password: string
  url: string | null
  icon: string | null
  note: string | null
  category_id: number | null
  favorite: boolean
  last_used_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateVaultEntryDTO {
  name: string
  username?: string
  password: string
  url?: string
  icon?: string
  note?: string
  category_id?: number
  favorite?: boolean
}

export interface UpdateVaultEntryDTO {
  name?: string
  username?: string
  password?: string
  url?: string
  icon?: string
  note?: string
  category_id?: number
  favorite?: boolean
}
