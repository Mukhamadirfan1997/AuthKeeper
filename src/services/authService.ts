import { invoke } from '@tauri-apps/api/core'

export interface LockStatus {
  locked: boolean
  remaining_attempts: number
  lock_until: number | null
}

export const authService = {
  async checkPinSetup(): Promise<boolean> {
    return invoke<boolean>('check_pin_setup')
  },

  async setupPin(pin: string): Promise<boolean> {
    return invoke<boolean>('setup_pin', { pin })
  },

  async verifyPin(pin: string): Promise<boolean> {
    return invoke<boolean>('verify_pin', { pin })
  },

  async changePin(oldPin: string, newPin: string): Promise<boolean> {
    return invoke<boolean>('change_pin', { oldPin, newPin })
  },

  async getLockStatus(): Promise<LockStatus> {
    return invoke<LockStatus>('get_lock_status')
  },

  async generateRecoveryKey(): Promise<string> {
    return invoke<string>('generate_recovery_key')
  },

  async verifyRecoveryKey(key: string): Promise<boolean> {
    return invoke<boolean>('verify_recovery_key', { key })
  },

  async hasRecoveryKey(): Promise<boolean> {
    return invoke<boolean>('has_recovery_key')
  },
}
