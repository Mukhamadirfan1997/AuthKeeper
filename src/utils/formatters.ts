export function formatOtpCode(code: string): string {
  const mid = Math.floor(code.length / 2)
  return `${code.slice(0, mid)} ${code.slice(mid)}`
}

export function formatTimestamp(ts: string | null): string {
  if (!ts) return '-'
  return new Date(ts).toLocaleString()
}
