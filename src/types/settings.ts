export interface Settings {
  id: number
  pin_hash: string
  theme: 'dark' | 'light'
  auto_lock: number
  language: 'id' | 'en'
  backup_path: string | null
}

export interface UpdateSettingsDTO {
  theme?: 'dark' | 'light'
  auto_lock?: number
  language?: 'id' | 'en'
  backup_path?: string
}
