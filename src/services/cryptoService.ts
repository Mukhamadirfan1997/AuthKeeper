import { invoke } from '@tauri-apps/api/core'

export const cryptoService = {
  async parseQrFile(path: string): Promise<string> {
    return invoke<string>('parse_qr_file', { path })
  },

  async parseOtpauth(uri: string): Promise<string> {
    return invoke<string>('parse_otpauth', { uri })
  },
}
