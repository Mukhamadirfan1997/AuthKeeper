import { useState, useEffect, useRef } from 'react'
import jsQR from 'jsqr'
import { invoke } from '@tauri-apps/api/core'
import { accountService } from '@/services/accountService'
import { parseOtpauthUri } from '@/utils/otpauth'
import type { Algorithm, CreateAccountDTO, MigrationAccount, MigrationResult } from '@/types/account'

interface AccountFormProps {
  mode: 'add' | 'edit'
  accountId?: number
  onBack: () => void
  onSaved: () => void
}

export function AccountForm({ mode, accountId, onBack, onSaved }: AccountFormProps) {
  const [issuer, setIssuer] = useState('')
  const [label, setLabel] = useState('')
  const [secret, setSecret] = useState('')
  const [algorithm, setAlgorithm] = useState<Algorithm>('SHA1')
  const [digits, setDigits] = useState<6 | 8>(6)
  const [period, setPeriod] = useState<30 | 60>(30)
  const [note, setNote] = useState('')
  const [favorite, setFavorite] = useState(false)
  const [scanningQr, setScanningQr] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (mode === 'edit' && accountId) {
      accountService.getAccount(accountId).then((acc) => {
        setIssuer(acc.issuer)
        setLabel(acc.label)
        setSecret('')
        setAlgorithm(acc.algorithm)
        setDigits(acc.digits)
        setPeriod(acc.period)
        setNote(acc.note || '')
        setFavorite(acc.favorite)
      })
    }
  }, [mode, accountId])

  const handleSubmit = async () => {
    if (!issuer || !label) return
    const data: CreateAccountDTO = {
      issuer,
      label,
      secret,
      algorithm,
      digits,
      period,
      note: note || undefined,
      favorite,
    }

    try {
      if (mode === 'add') {
        await accountService.createAccount(data)
      } else if (accountId) {
        await accountService.updateAccount(accountId, data)
      }
      onSaved()
    } catch (e) {
      console.error('Failed to save account', e)
    }
  }

  const handleScanQr = () => {
    fileRef.current?.click()
  }

  const handleQrFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScanningQr(true)

    try {
      const text = await decodeQRFromImage(file)
      await fillFromQr(text)
    } catch (err: any) {
      console.error('QR scan failed', err)
    } finally {
      setScanningQr(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const fillFromQr = async (text: string) => {
    if (text.startsWith('otpauth-migration://')) {
      const url = new URL(text)
      const data = url.searchParams.get('data')
      if (!data) return
      const result: MigrationResult = await invoke('parse_migration_qr', { dataB64: data })
      if (result.accounts.length > 0) {
        fillAccount(result.accounts[0])
      }
    } else if (text.startsWith('otpauth://')) {
      const parsed = parseOtpauthUri(text)
      if (parsed) {
        setIssuer(parsed.issuer)
        setLabel(parsed.label)
        setSecret(parsed.secret)
        setAlgorithm(parsed.algorithm as Algorithm)
        setDigits(parsed.digits as 6 | 8)
        setPeriod(parsed.period as 30 | 60)
      }
    }
  }

  const fillAccount = (acc: MigrationAccount) => {
    setIssuer(acc.issuer)
    setLabel(acc.label)
    setSecret(acc.secret)
    setAlgorithm(acc.algorithm as Algorithm)
    setDigits(acc.digits as 6 | 8)
    setPeriod(acc.period as 30 | 60)
  }

  return (
    <div className="min-h-screen p-4">
      <div className="flex items-center justify-between mb-6">
        <button onClick={onBack} className="text-text-secondary text-lg">
          ←
        </button>
        <h1 className="text-xl font-bold">
          {mode === 'add' ? 'Tambah Akun' : 'Edit Akun'}
        </h1>
        <button onClick={handleSubmit} className="text-accent font-semibold">
          💾 Save
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-text-secondary text-sm block mb-1">Issuer</label>
          <input
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            placeholder="Google, GitHub, dll"
            className="w-full px-4 py-2.5 rounded-xl bg-bg-card text-text-primary placeholder-text-secondary border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        <div>
          <label className="text-text-secondary text-sm block mb-1">Label</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="user@email.com"
            className="w-full px-4 py-2.5 rounded-xl bg-bg-card text-text-primary placeholder-text-secondary border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {mode === 'add' && (
          <div>
            <label className="text-text-secondary text-sm block mb-1">Secret Key</label>
            <div className="flex gap-2">
              <input
                value={secret}
                onChange={(e) => setSecret(e.target.value.toUpperCase())}
                placeholder="JBSWY3DP..."
                className="flex-1 px-4 py-2.5 rounded-xl bg-bg-card text-text-primary placeholder-text-secondary border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent font-mono"
              />
              <button
                onClick={handleScanQr}
                disabled={scanningQr}
                className="bg-bg-card px-3 rounded-xl border border-slate-700 text-lg hover:bg-slate-700/50 transition-colors disabled:opacity-50"
              >
                {scanningQr ? '⏳' : '📷'}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleQrFile}
              className="hidden"
            />
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-text-secondary text-sm block mb-1">Algorithm</label>
            <select
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
              className="w-full px-3 py-2.5 rounded-xl bg-bg-card text-text-primary border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="SHA1">SHA1</option>
              <option value="SHA256">SHA256</option>
              <option value="SHA512">SHA512</option>
            </select>
          </div>

          <div>
            <label className="text-text-secondary text-sm block mb-1">Digits</label>
            <select
              value={digits}
              onChange={(e) => setDigits(Number(e.target.value) as 6 | 8)}
              className="w-full px-3 py-2.5 rounded-xl bg-bg-card text-text-primary border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value={6}>6</option>
              <option value={8}>8</option>
            </select>
          </div>

          <div>
            <label className="text-text-secondary text-sm block mb-1">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value) as 30 | 60)}
              className="w-full px-3 py-2.5 rounded-xl bg-bg-card text-text-primary border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value={30}>30s</option>
              <option value={60}>60s</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-text-secondary text-sm block mb-1">Note (opsional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl bg-bg-card text-text-primary placeholder-text-secondary border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={favorite}
            onChange={(e) => setFavorite(e.target.checked)}
            className="w-5 h-5 rounded accent-accent"
          />
          <span className="text-text-primary">Tandai sebagai favorit</span>
        </label>
      </div>
    </div>
  )
}

function decodeQRFromImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas 2D context tidak tersedia'))
          return
        }
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        })
        if (code) {
          resolve(code.data)
        } else {
          reject(new Error('QR code tidak ditemukan dalam gambar'))
        }
      }
      img.onerror = () => reject(new Error('Gagal memuat gambar'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('Gagal membaca file'))
    reader.readAsDataURL(file)
  })
}