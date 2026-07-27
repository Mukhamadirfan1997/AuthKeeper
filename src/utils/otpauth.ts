import type { CreateAccountDTO, Algorithm } from '@/types/account'

export function parseOtpauthUri(uri: string): CreateAccountDTO | null {
  try {
    const url = new URL(uri)
    if (url.protocol !== 'otpauth:' || url.host !== 'totp') return null

    const path = decodeURIComponent(url.pathname.slice(1))
    const labelParts = path.split(':')
    const issuer = labelParts[0]
    const label = labelParts[1] || labelParts[0]

    const params = url.searchParams
    const secret = params.get('secret') || ''
    const algorithm = (params.get('algorithm') || 'SHA1').toUpperCase() as Algorithm
    const digits = parseInt(params.get('digits') || '6') as 6 | 8
    const period = parseInt(params.get('period') || '30') as 30 | 60

    if (!secret) return null

    return { issuer, label, secret, algorithm, digits, period }
  } catch {
    return null
  }
}
