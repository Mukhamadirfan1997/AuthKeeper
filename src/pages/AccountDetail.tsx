import { useState, useEffect } from 'react'
import { ArrowLeft, Trash2, Pencil, ClipboardList, Clock, AlertTriangle } from 'lucide-react'
import { useTotp } from '@/hooks/useTotp'
import { accountService } from '@/services/accountService'
import type { Account } from '@/types/account'

interface AccountDetailProps {
  accountId: number
  onBack: () => void
  onEdit: (id: number) => void
}

export function AccountDetail({ accountId, onBack, onEdit }: AccountDetailProps) {
  const [account, setAccount] = useState<Account | null>(null)
  const [copied, setCopied] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleted, setDeleted] = useState(false)
  const { otp, remaining } = useTotp(accountId, account?.period || 30)

  useEffect(() => {
    accountService.getAccount(accountId).then(setAccount)
  }, [accountId])

  const progress = otp ? (remaining / otp.total) * 100 : 100
  const barColor =
    remaining > 10 ? 'bg-emerald-500' : remaining > 5 ? 'bg-amber-500' : 'bg-red-500'

  const hasClockSkew = otp && (otp.code_prev === otp.code_next)

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable
    }
  }

  const handleDelete = async () => {
    try {
      await accountService.deleteAccount(accountId)
      setDeleted(true)
      setTimeout(onBack, 500)
    } catch {
      setShowDeleteConfirm(false)
    }
  }

  if (deleted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-secondary">Akun terhapus...</p>
      </div>
    )
  }

    if (!account) return <div className="p-4 text-text-secondary">Memuat...</div>

  return (
    <div className="min-h-screen p-4 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-text-secondary flex items-center gap-1 text-sm">
          <ArrowLeft size={18} /> Kembali
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-danger text-sm flex items-center gap-1"
          >
            <Trash2 size={16} /> Hapus
          </button>
          <button
            onClick={() => onEdit(account.id)}
            className="text-accent text-sm flex items-center gap-1"
          >
            <Pencil size={16} /> Ubah
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <p className="text-text-secondary text-sm">{account.issuer}</p>
        <h1 className="text-2xl font-bold text-text-primary mb-2">{account.label}</h1>

        {otp && (
          <>
            <div className="flex items-center gap-3 mb-2">
              <p className="text-otp-code text-6xl font-bold tracking-[0.15em] font-[monospace] my-8">
                {otp.code.slice(0, 3)} {otp.code.slice(3)}
              </p>
              {hasClockSkew && (
                <span className="text-amber-400 text-sm bg-amber-500/10 px-2 py-1 rounded-lg flex items-center gap-1">
                  <Clock size={14} /> Clock skew
                </span>
              )}
            </div>

            <button
              onClick={() => copyCode(otp.code)}
              className="w-full max-w-xs py-3 rounded-xl bg-accent/10 text-accent font-semibold border border-accent/30 hover:bg-accent/20 transition-colors mb-4 flex items-center justify-center gap-2"
            >
              {copied ? <><span className="text-emerald-400">✓</span> Tersalin!</> : <><ClipboardList size={18} /> Salin Kode</>}
            </button>

            <div className="flex gap-4 mb-4">
              <div className="text-center">
                <p className="text-text-secondary text-xs mb-1">-30s</p>
                <p className="text-text-secondary font-mono text-sm">
                  {otp.code_prev.slice(0, 3)} {otp.code_prev.slice(3)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-text-secondary text-xs mb-1">+30s</p>
                <p className="text-text-secondary font-mono text-sm">
                  {otp.code_next.slice(0, 3)} {otp.code_next.slice(3)}
                </p>
              </div>
            </div>

            <div className="w-full max-w-xs h-2 bg-slate-600 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${barColor}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-text-secondary">{remaining}s</p>
          </>
        )}

        <div className="mt-8 text-center text-text-secondary text-sm space-y-1">
          <p>Algorithm: {account.algorithm}</p>
          <p>Digits: {account.digits}</p>
          <p>Period: {account.period}s</p>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowDeleteConfirm(false)}>
          <div
            className="bg-bg-primary rounded-2xl p-6 w-[90%] max-w-sm border border-slate-700 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex justify-center"><AlertTriangle size={40} className="text-amber-400" /></div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Hapus Akun?</h3>
            <p className="text-text-secondary text-sm mb-6">
              {account.issuer} - {account.label}<br />
              Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-700 text-text-primary font-semibold hover:bg-slate-600 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-danger text-white font-semibold hover:opacity-90 transition-opacity"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}