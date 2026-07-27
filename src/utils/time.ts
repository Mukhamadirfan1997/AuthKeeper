export function formatCountdown(seconds: number): string {
  return `${seconds}s`
}

export function getRemainingSeconds(period: number): number {
  return period - (Math.floor(Date.now() / 1000) % period)
}
