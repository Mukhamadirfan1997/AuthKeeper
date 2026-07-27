export interface LockStatus {
  locked: boolean
  remaining_attempts: number
  lock_until: number | null
}

export type Page =
  | 'pin-setup'
  | 'pin-login'
  | 'dashboard'
  | 'account-detail'
  | 'account-form'
  | 'settings'
