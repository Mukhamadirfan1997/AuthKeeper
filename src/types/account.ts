export interface Account {
  id: number
  issuer: string
  label: string
  secret: string
  algorithm: Algorithm
  digits: 6 | 8
  period: 30 | 60
  icon: string | null
  note: string | null
  favorite: boolean
  last_used_at: string | null
  created_at: string
  updated_at: string
}

export type Algorithm = 'SHA1' | 'SHA256' | 'SHA512'

export interface CreateAccountDTO {
  issuer: string
  label: string
  secret: string
  algorithm: Algorithm
  digits: 6 | 8
  period: 30 | 60
  icon?: string
  note?: string
  favorite?: boolean
}

export interface UpdateAccountDTO extends Partial<CreateAccountDTO> {}

export interface MigrationAccount {
  issuer: string
  label: string
  secret: string
  algorithm: string
  digits: number
  period: number
}

export interface MigrationResult {
  accounts: MigrationAccount[]
  skipped: string[]
  batch_size: number
  batch_index: number
}

export interface OtpCode {
  code: string
  code_prev: string
  code_next: string
  remaining: number
  total: number
}

export interface GenerateOtpAllResult {
  codes: Record<number, OtpCode>
  errors: Record<number, string>
}
