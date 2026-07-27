import { useState, useEffect } from 'react'
import { Numpad } from '@/components/common/Numpad'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/authService'

export function PinLogin() {
  const { login } = useAuth()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [showRecovery, setShowRecovery] = useState(false)
  const [recoveryInput, setRecoveryInput] = useState('')
  const [hasRecovery, setHasRecovery] = useState(false)
  const [recoveryError, setRecoveryError] = useState('')
  const [recoverySuccess, setRecoverySuccess] = useState(false)
  const [fadeIn, setFadeIn] = useState(false)

  useEffect(() => {
    setTimeout(() => setFadeIn(true), 50)
    authService.hasRecoveryKey().then(setHasRecovery).catch(() => {})
  }, [])

  const handleInput = async (digit: string) => {
    setError('')
    const next = pin + digit
    if (next.length <= 6) setPin(next)

    if (next.length === 6) {
      const ok = await login(next)
      if (!ok) {
        setError('PIN salah')
        setPin('')
      }
    }
  }

  const handleDelete = () => {
    setError('')
    setPin((p) => p.slice(0, -1))
  }

  const handleRecoverySubmit = async () => {
    setRecoveryError('')
    if (recoveryInput.length < 6) {
      setRecoveryError('Kode pemulihan minimal 6 karakter')
      return
    }
    try {
      const ok = await authService.verifyRecoveryKey(recoveryInput)
      if (ok) {
        setRecoverySuccess(true)
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setRecoveryError('Kode pemulihan salah')
      }
    } catch (e: any) {
      setRecoveryError(String(e))
    }
  }

  const dots = Array.from({ length: 6 }, (_, i) => i < pin.length)

  if (recoverySuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-text-primary mb-2">Kode Valid!</h1>
          <p className="text-text-secondary text-sm">
            PIN telah direset. Buat PIN baru...
          </p>
        </div>
      </div>
    )
  }

  if (showRecovery) {
    if (!hasRecovery) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center px-6">
          <div className={`text-center mb-8 transition-all duration-500 ${fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="text-5xl mb-4">🔑</div>
            <h1 className="text-2xl font-bold text-text-primary">Lupa PIN</h1>
            <p className="text-text-secondary text-sm mt-2 mb-6 max-w-xs">
              Kode pemulihan tidak ditemukan.
            </p>
            <div className="bg-bg-card rounded-xl p-4 text-left text-sm space-y-2 mb-6 max-w-xs">
              <p className="text-text-primary font-semibold">Reset manual:</p>
              <p className="text-text-secondary">
                1. Buka folder <code className="text-accent text-xs">%APPDATA%\com.authkeeper.app\</code>
              </p>
              <p className="text-text-secondary">
                2. Backup file <code className="text-accent text-xs">authkeeper.db</code>
              </p>
              <p className="text-text-secondary">3. Hapus file <code className="text-accent text-xs">authkeeper.db</code></p>
              <p className="text-text-secondary">4. Jalankan ulang AuthKeeper → setup PIN baru</p>
            </div>
            <button
              onClick={() => { setShowRecovery(false); setRecoveryInput(''); setRecoveryError('') }}
              className="w-full max-w-xs py-2 text-text-secondary text-sm hover:text-text-primary transition-colors"
            >
              ← Kembali ke login
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className={`text-center mb-8 transition-all duration-500 ${fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="text-5xl mb-4">🔑</div>
          <h1 className="text-2xl font-bold text-text-primary">Kode Pemulihan</h1>
          <p className="text-text-secondary text-sm mt-2 mb-8 max-w-xs">
            Masukkan kode pemulihan dari file
            <br />
            <code className="text-accent text-xs">.authkeeper.recovery.txt</code>
          </p>

          <input
            type="text"
            value={recoveryInput}
            onChange={(e) => setRecoveryInput(e.target.value.toUpperCase())}
            placeholder="cth: A3F89C2B"
            className="w-full max-w-xs px-4 py-3 rounded-xl bg-bg-card text-text-primary text-center font-mono text-lg tracking-[0.2em] border border-slate-600 focus:outline-none focus:ring-2 focus:ring-accent mb-4"
            autoFocus
          />

          {recoveryError && (
            <p className="text-danger text-sm mb-4">{recoveryError}</p>
          )}

          <button
            onClick={handleRecoverySubmit}
            disabled={recoveryInput.length < 6}
            className="w-full max-w-xs py-3 rounded-xl bg-accent text-white font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity mb-3"
          >
            Verifikasi
          </button>

          <button
            onClick={() => { setShowRecovery(false); setRecoveryInput(''); setRecoveryError('') }}
            className="w-full max-w-xs py-2 text-text-secondary text-sm hover:text-text-primary transition-colors"
          >
            ← Kembali ke login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className={`text-center mb-8 transition-all duration-500 ${fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-accent/20">
          <span className="text-3xl">🔐</span>
        </div>
        <h1 className="text-2xl font-bold text-text-primary">AuthKeeper</h1>
        <p className="text-text-secondary text-sm mt-1">by MUKHAMAD IRFAN</p>
      </div>

      <div className={`transition-all duration-300 ${fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`} style={{ transitionDelay: '100ms' }}>
        <p className="text-text-secondary mb-6 text-sm text-center">Masukkan PIN</p>

        <div className="flex gap-3 justify-center mb-8">
          {dots.map((filled, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                filled
                  ? 'bg-accent border-accent scale-110'
                  : 'border-slate-500'
              } ${error ? 'border-danger' : ''}`}
              style={{ transitionDelay: `${i * 50}ms` }}
            />
          ))}
        </div>

        {error && (
          <div className="text-danger text-sm mb-4 text-center animate-pulse">
            ❌ {error}
          </div>
        )}
      </div>

      <div className={`transition-all duration-500 ${fadeIn ? 'opacity-100' : 'opacity-0'}`} style={{ transitionDelay: '200ms' }}>
        <Numpad onInput={handleInput} onDelete={handleDelete} />

        <button
          onClick={() => { setShowRecovery(true); setRecoveryInput(''); setRecoveryError('') }}
          className="w-full text-center mt-6 text-sm text-text-secondary hover:text-accent transition-colors"
        >
          Lupa PIN?
        </button>
      </div>
    </div>
  )
}
