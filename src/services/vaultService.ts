import { invoke } from '@tauri-apps/api/core'
import type { VaultEntry, CreateVaultEntryDTO, UpdateVaultEntryDTO } from '@/types/vault'

export const vaultService = {
  async getEntries(): Promise<VaultEntry[]> {
    return invoke<VaultEntry[]>('get_vault_entries')
  },

  async getEntry(id: number): Promise<VaultEntry> {
    return invoke<VaultEntry>('get_vault_entry', { id })
  },

  async createEntry(data: CreateVaultEntryDTO): Promise<VaultEntry> {
    return invoke<VaultEntry>('create_vault_entry', { data })
  },

  async updateEntry(id: number, data: UpdateVaultEntryDTO): Promise<VaultEntry> {
    return invoke<VaultEntry>('update_vault_entry', { id, data })
  },

  async deleteEntry(id: number): Promise<boolean> {
    return invoke<boolean>('delete_vault_entry', { id })
  },

  async toggleFavorite(id: number): Promise<boolean> {
    return invoke<boolean>('toggle_vault_favorite', { id })
  },

  async searchEntries(q: string): Promise<VaultEntry[]> {
    return invoke<VaultEntry[]>('search_vault_entries', { q })
  },
}
