import { useEffect, useRef } from 'react'

export function useAutoLock(
  timeoutMinutes: number,
  onLock: () => void,
  enabled: boolean,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (enabled && timeoutMinutes > 0) {
      timerRef.current = setTimeout(onLock, timeoutMinutes * 60 * 1000)
    }
  }

  useEffect(() => {
    resetTimer()
    const events = ['mousedown', 'keydown', 'touchstart', 'mousemove']
    events.forEach((event) => window.addEventListener(event, resetTimer))
    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer))
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [timeoutMinutes, enabled])

  return { resetTimer }
}
