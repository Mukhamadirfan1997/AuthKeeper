import { invoke } from '@tauri-apps/api/core'
import type { Account, CreateAccountDTO, UpdateAccountDTO } from '@/types/account'

export const accountService = {
  async getAccounts(): Promise<Account[]> {
    return invoke<Account[]>('get_accounts')
  },

  async getAccount(id: number): Promise<Account> {
    return invoke<Account>('get_account', { id })
  },

  async createAccount(data: CreateAccountDTO): Promise<Account> {
    return invoke<Account>('create_account', { data })
  },

  async updateAccount(id: number, data: UpdateAccountDTO): Promise<Account> {
    return invoke<Account>('update_account', { id, data })
  },

  async deleteAccount(id: number): Promise<boolean> {
    return invoke<boolean>('delete_account', { id })
  },

  async toggleFavorite(id: number): Promise<boolean> {
    return invoke<boolean>('toggle_favorite', { id })
  },

  async searchAccounts(q: string): Promise<Account[]> {
    return invoke<Account[]>('search_accounts', { q })
  },
}
