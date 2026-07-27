import { useState, useEffect, useCallback } from 'react'
import { totpService } from '@/services/totpService'
import { getRemainingSeconds } from '@/utils/time'
import type { OtpCode } from '@/types/account'

export function useTotp(accountId: number | null, period = 30) {
  const [otp, setOtp] = useState<OtpCode | null>(null)
  const [remaining, setRemaining] = useState(period)

  const refresh = useCallback(async () => {
    if (accountId === null) return
    try {
      const code = await totpService.generateOtp(accountId)
      setOtp(code)
      setRemaining(code.remaining)
    } catch {
      setOtp(null)
    }
  }, [accountId])

  useEffect(() => {
    refresh()
    const interval = setInterval(() => {
      const rem = getRemainingSeconds(period)
      setRemaining(rem)
      if (rem === period || rem === 0) {
        refresh()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [refresh, period])

  return { otp, remaining, refresh }
}
