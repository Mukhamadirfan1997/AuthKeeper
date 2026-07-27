import { invoke } from '@tauri-apps/api/core'

export const backupService = {
  async exportBackup(path: string): Promise<boolean> {
    return invoke<boolean>('export_backup', { path })
  },

  async importBackup(path: string): Promise<boolean> {
    return invoke<boolean>('import_backup', { path })
  },
}
