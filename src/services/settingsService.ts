import { invoke } from '@tauri-apps/api/core'
import type { Settings, UpdateSettingsDTO } from '@/types/settings'

export const settingsService = {
  async getSettings(): Promise<Settings> {
    return invoke<Settings>('get_settings')
  },

  async updateSettings(data: UpdateSettingsDTO): Promise<Settings> {
    return invoke<Settings>('update_settings', { data })
  },
}
