import { invoke } from '@tauri-apps/api/core'
import type { Category, CreateCategoryDTO, UpdateCategoryDTO } from '@/types/category'

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    return invoke<Category[]>('get_categories')
  },

  async createCategory(data: CreateCategoryDTO): Promise<Category> {
    return invoke<Category>('create_category', { data })
  },

  async updateCategory(id: number, data: UpdateCategoryDTO): Promise<Category> {
    return invoke<Category>('update_category', { id, data })
  },

  async deleteCategory(id: number): Promise<boolean> {
    return invoke<boolean>('delete_category', { id })
  },

  async getAccountCategories(accountId: number): Promise<Category[]> {
    return invoke<Category[]>('get_account_categories', { accountId })
  },

  async assignCategoryToAccount(accountId: number, categoryId: number): Promise<boolean> {
    return invoke<boolean>('assign_category_to_account', { accountId, categoryId })
  },

  async unassignCategoryFromAccount(accountId: number, categoryId: number): Promise<boolean> {
    return invoke<boolean>('unassign_category_from_account', { accountId, categoryId })
  },
}
