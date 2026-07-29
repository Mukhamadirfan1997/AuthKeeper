import { useState, useEffect, useRef } from 'react'
import { Numpad } from '@/components/common/Numpad'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/authService'
import { Shield, Pencil, AlertTriangle, ClipboardList, Check } from 'lucide-react'

export function PinSetup() {
  const { setupPin } = useAuth()
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [step, setStep] = useState<'create' | 'confirm'>('create')
  const [error, setError] = useState('')
  const [recoveryKey, setRecoveryKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [fadeIn, setFadeIn] = useState(false)
  const pageRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTimeout(() => setFadeIn(true), 50)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const handleInput = async (digit: string) => {
    setError('')
    if (step === 'create') {
      const next = pin + digit
      if (next.length <= 6) setPin(next)
      if (next.length === 6) {
        setTimeout(() => {
          setStep('confirm')
          setFadeIn(false)
          setTimeout(() => setFadeIn(true), 50)
          setTimeout(() => inputRef.current?.focus(), 150)
        }, 200)
      }
    } else {
      const next = confirm + digit
      if (next.length <= 6) setConfirm(next)
      if (next.length === 6) {
        if (next === pin) {
          const ok = await setupPin(pin)
          if (ok) {
            try {
              const key = await authService.generateRecoveryKey()
              setRecoveryKey(key)
            } catch {
              setRecoveryKey('Gagal generate')
            }
          } else {
            setError('Gagal menyimpan PIN')
          }
        } else {
          setError('PIN tidak cocok')
          setFadeIn(false)
          setTimeout(() => {
            setConfirm('')
            setPin('')
            setStep('create')
            setFadeIn(true)
            setTimeout(() => inputRef.current?.focus(), 150)
          }, 300)
        }
      }
    }
  }

  const handleDelete = () => {
    setError('')
    if (step === 'create') {
      setPin((p) => p.slice(0, -1))
    } else {
      const n = confirm.slice(0, -1)
      setConfirm(n)
      if (n.length < 6) {
        setFadeIn(false)
        setTimeout(() => {
          setStep('create')
          setFadeIn(true)
          setTimeout(() => inputRef.current?.focus(), 150)
        }, 200)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key >= '0' && e.key <= '9') {
      handleInput(e.key)
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      handleDelete()
    }
  }

  const copyRecovery = async () => {
    try {
      await navigator.clipboard.writeText(recoveryKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      // ignore
    }
  }

  const currentLength = step === 'create' ? pin.length : confirm.length
  const dots = Array.from({ length: 6 }, (_, i) => i < currentLength)

  if (recoveryKey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className={`text-center transition-all duration-500 ${fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="flex items-center justify-center mb-4"><Shield size={48} className="text-accent" /></div>
          <h1 className="text-2xl font-bold text-text-primary">PIN Tersimpan!</h1>
          <p className="text-text-secondary text-sm mt-2 mb-8">
            Simpan kode pemulihan ini di tempat aman.
            <br />Tanpa kode ini, data tidak bisa dibuka kembali jika lupa PIN.
          </p>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 mb-6 max-w-sm mx-auto">
            <p className="text-xs text-amber-400 font-semibold mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <AlertTriangle size={16} className="text-amber-400" />Kode Pemulihan
            </p>
            <p className="text-3xl font-bold text-text-primary tracking-[0.3em] font-mono mb-4">
              {recoveryKey}
            </p>
            <button
              onClick={copyRecovery}
              className="px-6 py-2 rounded-xl bg-amber-500/20 text-amber-400 font-semibold hover:bg-amber-500/30 transition-colors text-sm"
            >
              {copied ? <span className="flex items-center gap-1.5"><Check size={16} /> Tersalin!</span> : <span className="flex items-center gap-1.5"><ClipboardList size={16} /> Salin Kode</span>}
            </button>
          </div>

          <p className="text-text-secondary text-xs mb-8 max-w-xs mx-auto">
            Kode ini hanya ditampilkan sekali.
            Screenshot atau catat sekarang.
          </p>

          <button
            onClick={() => window.location.reload()}
            className="w-full max-w-xs py-3 rounded-xl bg-accent text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Mulai
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={pageRef} className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className={`text-center mb-8 transition-all duration-500 ${fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="text-5xl mb-4">
          {step === 'create' ? <Shield size={48} className="text-accent" /> : <Pencil size={48} className="text-accent" />}
        </div>
        <h1 className="text-2xl font-bold text-text-primary">AuthKeeper</h1>
        <p className="text-text-secondary text-sm mt-1">by MUKHAMAD IRFAN</p>
      </div>

      <div className={`transition-all duration-300 ${fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <p className="text-text-secondary mb-6 text-sm text-center">
          {step === 'create' ? 'Buat PIN 6 angka' : 'Masukkan ulang PIN'}
        </p>

        <div className="flex gap-3 justify-center mb-8">
          {dots.map((filled, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                filled
                  ? 'bg-accent border-accent scale-110'
                  : 'border-slate-500'
              } ${error ? 'border-danger animate-pulse' : ''}`}
              style={{ transitionDelay: `${i * 50}ms` }}
            />
          ))}
        </div>

        {error && (
          <div className="text-danger text-sm mb-4 text-center animate-pulse">
            {error}
          </div>
        )}
      </div>

      <div className={`transition-all duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          readOnly
          onKeyDown={handleKeyDown}
          className="absolute opacity-0 pointer-events-none"
          autoComplete="off"
          aria-label="Input PIN"
        />
        <Numpad onInput={handleInput} onDelete={handleDelete} />
      </div>
    </div>
  )
}
