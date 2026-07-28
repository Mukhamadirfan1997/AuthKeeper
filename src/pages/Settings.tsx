import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { authService } from '@/services/authService'
import { settingsService } from '@/services/settingsService'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { Numpad } from '@/components/common/Numpad'
import { CategoryManager } from '@/pages/CategoryManager'
import { useWindowSize } from '@/hooks/useWindowSize'
import { invoke } from '@tauri-apps/api/core'
import { save, open } from '@tauri-apps/plugin-dialog'
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

interface SettingsProps {
  onBack: () => void
  onNavigate: (page: string) => void
}

export function Settings({ onBack, onNavigate }: SettingsProps) {
  const { logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [autoLock, setAutoLock] = useState(5)
  const { isLarge } = useWindowSize()
  const [hasRecovery, setHasRecovery] = useState(false)
  const [backupMsg, setBackupMsg] = useState('')
  const [backupError, setBackupError] = useState('')
  const [showChangePin, setShowChangePin] = useState(false)
  const [changePinStep, setChangePinStep] = useState<'old' | 'new' | 'confirm'>('old')
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [changePinError, setChangePinError] = useState('')
  const [changePinSuccess, setChangePinSuccess] = useState('')
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'uptodate' | 'error'>('idle')
  const [updateMsg, setUpdateMsg] = useState('')
  const [showCategories, setShowCategories] = useState(false)

  useEffect(() => {
    authService.hasRecoveryKey().then(setHasRecovery).catch(() => {})
    settingsService.getSettings().then((s) => {
      setAutoLock(s.auto_lock)
    }).catch(() => {})
  }, [])

  const handleAutoLockChange = async (val: number) => {
    setAutoLock(val)
    try {
      await settingsService.updateSettings({ auto_lock: val })
    } catch {}
  }

  const handleCheckUpdate = async () => {
    setUpdateStatus('checking')
    setUpdateMsg('')
    try {
      const update = await check()
      if (!update) {
        setUpdateStatus('uptodate')
        setUpdateMsg('✅ Aplikasi sudah versi terbaru')
        return
      }
      setUpdateStatus('available')
      setUpdateMsg(`Versi ${update.version} tersedia!\n${update.body ? update.body : ''}`)
      setUpdateStatus('downloading')
      await update.downloadAndInstall()
      setUpdateMsg('✅ Update berhasil diunduh. Aplikasi akan dimulai ulang...')
      await relaunch()
    } catch (e: any) {
      setUpdateStatus('error')
      setUpdateMsg(`❌ Gagal: ${String(e)}`)
    }
  }

  const handleExport = async () => {
    setBackupMsg('')
    setBackupError('')
    try {
      const path = await save({
        defaultPath: `AuthKeeper-${new Date().toISOString().slice(0, 10)}.authkeeper`,
        filters: [{ name: 'AuthKeeper Backup', extensions: ['authkeeper'] }],
      })
      if (!path) return
      const key = await invoke<string>('export_backup', { path })
      setBackupMsg(`✅ Backup berhasil!\nBackup Key: ${key}\nFile recovery: ${path}.recovery.txt`)
    } catch (e: any) {
      setBackupError(String(e))
    }
  }

  const handleImport = async () => {
    setBackupMsg('')
    setBackupError('')
    try {
      const path = await open({
        filters: [{ name: 'AuthKeeper Backup', extensions: ['authkeeper'] }],
        multiple: false,
      })
      if (!path) return

      const key = prompt('Masukkan Backup Key (dari file .recovery.txt):')
      if (!key || key.length < 6) {
        setBackupError('Backup Key tidak valid')
        return
      }

      if (!confirm('Import akan mengganti semua akun yang ada. Lanjutkan?')) return

      await invoke('import_backup', { path, backupKey: key })
      setBackupMsg('✅ Restore berhasil! Semua akun telah dipulihkan.')
    } catch (e: any) {
      setBackupError(String(e))
    }
  }

  const openChangePin = () => {
    setShowChangePin(true)
    setChangePinStep('old')
    setOldPin('')
    setNewPin('')
    setConfirmPin('')
    setChangePinError('')
    setChangePinSuccess('')
  }

  const handleChangePinInput = (digit: string) => {
    setChangePinError('')
    setChangePinSuccess('')
    if (changePinStep === 'old') {
      const next = oldPin + digit
      if (next.length <= 6) setOldPin(next)
      if (next.length === 6) {
        setTimeout(() => setChangePinStep('new'), 200)
      }
    } else if (changePinStep === 'new') {
      const next = newPin + digit
      if (next.length <= 6) setNewPin(next)
      if (next.length === 6) {
        setTimeout(() => setChangePinStep('confirm'), 200)
      }
    } else {
      const next = confirmPin + digit
      if (next.length <= 6) setConfirmPin(next)
      if (next.length === 6) {
        if (next === newPin) {
          authService.changePin(oldPin, newPin).then((ok) => {
            if (ok) {
              setChangePinSuccess('✅ PIN berhasil diganti')
              setTimeout(() => setShowChangePin(false), 1500)
            } else {
              setChangePinError('PIN lama salah')
              setChangePinStep('old')
              setOldPin('')
              setNewPin('')
              setConfirmPin('')
            }
          }).catch((e) => {
            setChangePinError(String(e))
            setChangePinStep('old')
            setOldPin('')
            setNewPin('')
            setConfirmPin('')
          })
        } else {
          setChangePinError('PIN baru tidak cocok')
          setChangePinStep('new')
          setNewPin('')
          setConfirmPin('')
        }
      }
    }
  }

  const handleChangePinDelete = () => {
    setChangePinError('')
    setChangePinSuccess('')
    if (changePinStep === 'old') {
      const n = oldPin.slice(0, -1)
      setOldPin(n)
      if (n.length < 6 && oldPin.length === 6) setChangePinStep('old')
    } else if (changePinStep === 'new') {
      const n = newPin.slice(0, -1)
      setNewPin(n)
      if (n.length < 6 && newPin.length === 6) setChangePinStep('old')
    } else {
      const n = confirmPin.slice(0, -1)
      setConfirmPin(n)
      if (n.length < 6 && confirmPin.length === 6) setChangePinStep('new')
    }
  }

  const changePinCurrentLength = changePinStep === 'old' ? oldPin.length : changePinStep === 'new' ? newPin.length : confirmPin.length
  const changePinDots = Array.from({ length: 6 }, (_, i) => i < changePinCurrentLength)

  const settingsContent = (
    <div className="flex-1 p-4 overflow-y-auto min-w-0 pb-20">
      <div className="flex items-center gap-3 mb-6">
        {!isLarge && (
          <button onClick={onBack} className="text-text-secondary text-lg">
            ←
          </button>
        )}
        <h1 className="text-xl font-bold">Settings</h1>
      </div>

      <div className="space-y-6 max-w-lg">
        <section>
          <h2 className="text-text-secondary text-sm font-semibold uppercase mb-3">🔒 Security</h2>
          <div className="bg-bg-card rounded-xl p-4 space-y-4">
            <button
              onClick={openChangePin}
              className="w-full text-left text-text-primary hover:text-accent transition-colors"
            >
              Ganti PIN
            </button>
            <div className="flex items-center justify-between">
              <span className="text-text-primary">Auto Lock</span>
              <select
                value={autoLock}
                onChange={(e) => handleAutoLockChange(Number(e.target.value))}
                className="px-3 py-1.5 rounded-lg bg-slate-700 text-text-primary border border-slate-600"
              >
                <option value={1}>1 menit</option>
                <option value={5}>5 menit</option>
                <option value={15}>15 menit</option>
                <option value={30}>30 menit</option>
                <option value={0}>Never</option>
              </select>
            </div>
            {hasRecovery && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                <p className="text-amber-400 text-xs font-semibold mb-1">🔑 Kode Pemulihan Aktif</p>
                <p className="text-text-secondary text-xs">
                  Kode pemulihan sudah dibuat saat setup PIN. 
                  Cek file <code className="text-accent">.authkeeper.recovery.txt</code> 
                  jika Anda membuat backup.
                </p>
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-text-secondary text-sm font-semibold uppercase mb-3">🎨 Appearance</h2>
          <div className="bg-bg-card rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-text-primary">Theme</span>
              <button
                onClick={toggleTheme}
                className="px-4 py-1.5 rounded-lg bg-slate-700 text-text-primary border border-slate-600 hover:bg-slate-600 transition-colors"
              >
                {theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-primary">Language</span>
              <span className="text-text-secondary">Bahasa Indonesia</span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-text-secondary text-sm font-semibold uppercase mb-3">💾 Data</h2>
          <div className="bg-bg-card rounded-xl p-4 space-y-4">
            <button
              onClick={handleExport}
              className="w-full text-left text-text-primary hover:text-accent transition-colors"
            >
              📥 Export Backup
            </button>
            <button
              onClick={handleImport}
              className="w-full text-left text-text-primary hover:text-accent transition-colors"
            >
              📤 Import Backup
            </button>
            <hr className="border-slate-700" />
            <button
              onClick={() => setShowCategories(true)}
              className="w-full text-left text-text-primary hover:text-accent transition-colors"
            >
              🏷️ Kelola Kategori
            </button>
            {backupMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                <p className="text-emerald-400 text-xs whitespace-pre-line">{backupMsg}</p>
              </div>
            )}
            {backupError && (
              <div className="bg-danger/10 border border-danger/30 rounded-xl p-3">
                <p className="text-danger text-xs">{backupError}</p>
              </div>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-text-secondary text-sm font-semibold uppercase mb-3">ℹ️ About</h2>
          <div className="bg-bg-card rounded-xl p-4 space-y-3">
            <p className="text-text-primary font-semibold">AuthKeeper v1.0.0</p>
            <p className="text-text-secondary text-sm">Created by MUKHAMAD IRFAN</p>
            <p className="text-text-secondary text-sm">Tauri + React + TypeScript</p>
            <hr className="border-slate-700" />
            <button
              onClick={handleCheckUpdate}
              disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
              className="w-full text-left text-accent hover:text-accent/80 transition-colors disabled:text-text-secondary disabled:cursor-not-allowed"
            >
              {updateStatus === 'checking' ? '⏳ Memeriksa...' : updateStatus === 'downloading' ? '📥 Mengunduh...' : '🔄 Check for Updates'}
            </button>
            {updateMsg && (
              <div className={`rounded-xl p-3 ${
                updateStatus === 'error' ? 'bg-danger/10 border border-danger/30' :
                updateStatus === 'uptodate' ? 'bg-emerald-500/10 border border-emerald-500/30' :
                updateStatus === 'available' || updateStatus === 'downloading' ? 'bg-blue-500/10 border border-blue-500/30' :
                ''
              }`}>
                <p className={`text-xs whitespace-pre-line ${
                  updateStatus === 'error' ? 'text-danger' :
                  updateStatus === 'uptodate' ? 'text-emerald-400' :
                  updateStatus === 'available' || updateStatus === 'downloading' ? 'text-blue-400' :
                  'text-text-secondary'
                }`}>{updateMsg}</p>
              </div>
            )}
          </div>
        </section>

        <button
          onClick={logout}
          className="w-full py-3 rounded-xl bg-danger/10 text-danger font-semibold hover:bg-danger/20 transition-colors"
        >
          🔒 Lock App
        </button>
      </div>

      {showCategories && <CategoryManager onClose={() => setShowCategories(false)} />}

      {showChangePin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowChangePin(false)}>
          <div
            className="bg-bg-primary rounded-2xl p-6 w-[90%] max-w-sm border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-text-primary text-center mb-2">
              {changePinStep === 'old' ? 'PIN Lama' : changePinStep === 'new' ? 'PIN Baru' : 'Konfirmasi PIN Baru'}
            </h2>
            <p className="text-text-secondary text-xs text-center mb-4">
              {changePinStep === 'old' ? 'Masukkan PIN saat ini' : changePinStep === 'new' ? 'Masukkan PIN baru 6 digit' : 'Masukkan ulang PIN baru'}
            </p>

            <div className="flex gap-3 justify-center mb-6">
              {changePinDots.map((filled, i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                    filled ? 'bg-accent border-accent scale-110' : 'border-slate-500'
                  } ${changePinError ? 'border-danger' : ''}`}
                  style={{ transitionDelay: `${i * 50}ms` }}
                />
              ))}
            </div>

            {changePinError && (
              <p className="text-danger text-sm text-center mb-3">❌ {changePinError}</p>
            )}
            {changePinSuccess && (
              <p className="text-emerald-400 text-sm text-center mb-3">{changePinSuccess}</p>
            )}

            <Numpad onInput={handleChangePinInput} onDelete={handleChangePinDelete} />
          </div>
        </div>
      )}
    </div>
  )

  if (isLarge) {
    return (
      <div className="min-h-screen flex">
        <Sidebar active="settings" onNavigate={onNavigate} />
        {settingsContent}
      </div>
    )
  }

  return settingsContent
}