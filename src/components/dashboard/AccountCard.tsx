import { useState } from 'react'
import { Star, ClipboardList, AlertTriangle, Clock } from 'lucide-react'
import type { Account, OtpCode } from '@/types/account'
import type { Category } from '@/types/category'

interface AccountCardProps {
  account: Account
  otp: OtpCode | null
  error?: string
  remaining: number
  onClick: () => void
  onToggleFavorite: () => void
  showIssuer?: boolean
  categories?: Category[]
}

export function AccountCard({ account, otp, error, remaining, onClick, onToggleFavorite, showIssuer = true, categories }: AccountCardProps) {
  const [copied, setCopied] = useState(false)

  const copyCode = async (e: React.MouseEvent, code: string) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable
    }
  }

  const progress = otp ? (remaining / otp.total) * 100 : 100
  const barColor =
    remaining > 10 ? 'bg-emerald-500' : remaining > 5 ? 'bg-amber-500' : 'bg-red-500'

  const hasClockSkew = otp && (otp.code_prev === otp.code_next)

  return (
    <div
      onClick={onClick}
      className="bg-bg-card rounded-xl p-4 cursor-pointer active:scale-[0.98] transition-transform shadow-sm"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            {showIssuer && <h3 className="text-text-primary font-semibold">{account.issuer}</h3>}
            {hasClockSkew && (
              <span className="text-xs bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded flex items-center" title="Clock skew detected">
                <Clock size={12} />
              </span>
            )}
          </div>
          <p className="text-text-secondary text-sm">{account.label}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
          className={account.favorite ? 'text-favorite' : 'text-text-secondary'}
        >
          <Star size={18} fill={account.favorite ? 'currentColor' : 'none'} />
        </button>
      </div>
      {categories && categories.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {categories.slice(0, 3).map((cat) => (
            <span key={cat.id} className="text-xs bg-slate-700/50 text-text-secondary px-1.5 py-0.5 rounded">
              {cat.icon} {cat.name}
            </span>
          ))}
          {categories.length > 3 && (
            <span className="text-xs text-text-secondary">+{categories.length - 3}</span>
          )}
        </div>
      )}
      {error ? (
        <div className="mt-2 text-danger text-sm flex items-center gap-1">
          <AlertTriangle size={14} /> {error}
        </div>
      ) : otp && (
        <div className="mt-2">
          <div className="flex items-center gap-2">
            <p className="text-otp-code text-3xl font-bold tracking-[0.25em] font-[monospace] flex-1">
              {otp.code.slice(0, 3)} {otp.code.slice(3)}
            </p>
            <button
              onClick={(e) => copyCode(e, otp.code)}
              className="text-text-secondary hover:text-accent transition-colors px-2 py-1 rounded-lg hover:bg-slate-700/50"
              title="Salin kode"
            >
              {copied ? <span className="text-emerald-400 text-xs font-semibold">Tersalin</span> : <ClipboardList size={16} />}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-slate-600 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-text-secondary text-xs w-8 text-right">{remaining}s</span>
          </div>
        </div>
      )}
    </div>
  )
}
