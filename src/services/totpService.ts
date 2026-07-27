import { invoke } from '@tauri-apps/api/core'
import type { OtpCode, GenerateOtpAllResult } from '@/types/account'

export const totpService = {
  async generateOtp(accountId: number): Promise<OtpCode> {
    return invoke<OtpCode>('generate_otp', { accountId })
  },

  async generateOtpAll(): Promise<GenerateOtpAllResult> {
    return invoke<GenerateOtpAllResult>('generate_otp_all')
  },
}
