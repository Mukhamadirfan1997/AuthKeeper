import { useState, useEffect, useRef } from 'react'
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
import { ArrowLeft, Shield, Key, Palette, Database, Download, Upload, Tag, Info, RefreshCw, Loader, LogOut, Check, AlertTriangle } from 'lucide-react'

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
  const [showImportModal, setShowImportModal] = useState(false)
  const [importPath, setImportPath] = useState('')
  const [importKey, setImportKey] = useState('')
  const [importKeyError, setImportKeyError] = useState('')
  const [importConfirming, setImportConfirming] = useState(false)
  const pinInputRef = useRef<HTMLInputElement>(null)
  const oldPinRef = useRef('')
  const newPinRef = useRef('')
  const confirmPinRef = useRef('')
  const changePinKeyRef = useRef((e: KeyboardEvent) => {})

  useEffect(() => {
    authService.hasRecoveryKey().then(setHasRecovery).catch(() => {})
    settingsService.getSettings().then((s) => {
      setAutoLock(s.auto_lock)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!showChangePin) return
    const handler = (e: KeyboardEvent) => changePinKeyRef.current(e)
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showChangePin])

  changePinKeyRef.current = (e: KeyboardEvent) => {
    if (e.key >= '0' && e.key <= '9') {
      handleChangePinInput(e.key)
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      handleChangePinDelete()
    }
  }

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
        setUpdateMsg('Aplikasi sudah versi terbaru')
        return
      }
      setUpdateStatus('available')
      setUpdateMsg(`Versi ${update.version} tersedia!\n${update.body ? update.body : ''}`)
      setUpdateStatus('downloading')
      await update.downloadAndInstall()
      setUpdateMsg('Update berhasil diunduh. Aplikasi akan dimulai ulang...')
      await relaunch()
    } catch (e: any) {
      setUpdateStatus('error')
      setUpdateMsg(`Gagal: ${String(e)}`)
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
      setBackupMsg(`Backup berhasil!\nBackup Key: ${key}\nFile recovery: ${path}.recovery.txt`)
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
      setImportPath(path)
      setImportKey('')
      setImportKeyError('')
      setImportConfirming(false)
      setShowImportModal(true)
    } catch (e: any) {
      setBackupError(String(e))
    }
  }

  const handleImportConfirm = async () => {
    if (importKey.length < 6) {
      setImportKeyError('Backup Key minimal 6 karakter')
      return
    }
    setImportConfirming(true)
    try {
      await invoke('import_backup', { path: importPath, backupKey: importKey })
      setShowImportModal(false)
      setBackupMsg('Restore berhasil! Semua akun telah dipulihkan.')
    } catch (e: any) {
      setImportKeyError(String(e))
    } finally {
      setImportConfirming(false)
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
    oldPinRef.current = ''
    newPinRef.current = ''
    confirmPinRef.current = ''
    setTimeout(() => pinInputRef.current?.focus(), 200)
  }

  const handleChangePinInput = (digit: string) => {
    setChangePinError('')
    setChangePinSuccess('')
    if (changePinStep === 'old') {
      const next = oldPinRef.current + digit
      if (next.length <= 6) { oldPinRef.current = next; setOldPin(next) }
      if (next.length === 6) {
        setTimeout(() => { setChangePinStep('new'); setTimeout(() => pinInputRef.current?.focus(), 200) }, 200)
      }
    } else if (changePinStep === 'new') {
      const next = newPinRef.current + digit
      if (next.length <= 6) { newPinRef.current = next; setNewPin(next) }
      if (next.length === 6) {
        setTimeout(() => { setChangePinStep('confirm'); setTimeout(() => pinInputRef.current?.focus(), 200) }, 200)
      }
    } else {
      const next = confirmPinRef.current + digit
      if (next.length <= 6) { confirmPinRef.current = next; setConfirmPin(next) }
      if (next.length === 6) {
        if (next === newPinRef.current) {
          authService.changePin(oldPinRef.current, newPinRef.current).then((ok) => {
            if (ok) {
              setChangePinSuccess('PIN berhasil diganti')
              setTimeout(() => setShowChangePin(false), 1500)
            } else {
              setChangePinError('PIN lama salah')
              setChangePinStep('old')
              oldPinRef.current = ''; setOldPin('')
              newPinRef.current = ''; setNewPin('')
              confirmPinRef.current = ''; setConfirmPin('')
              setTimeout(() => pinInputRef.current?.focus(), 200)
            }
          }).catch((e) => {
            setChangePinError(String(e))
            setChangePinStep('old')
            oldPinRef.current = ''; setOldPin('')
            newPinRef.current = ''; setNewPin('')
            confirmPinRef.current = ''; setConfirmPin('')
            setTimeout(() => pinInputRef.current?.focus(), 200)
          })
        } else {
          setChangePinError('PIN baru tidak cocok')
          setChangePinStep('new')
          newPinRef.current = ''; setNewPin('')
          confirmPinRef.current = ''; setConfirmPin('')
          setTimeout(() => pinInputRef.current?.focus(), 200)
        }
      }
    }
  }

  const handleChangePinDelete = () => {
    setChangePinError('')
    setChangePinSuccess('')
    if (changePinStep === 'old') {
      const n = oldPinRef.current.slice(0, -1)
      oldPinRef.current = n; setOldPin(n)
    } else if (changePinStep === 'new') {
      const n = newPinRef.current.slice(0, -1)
      newPinRef.current = n; setNewPin(n)
    } else {
      const n = confirmPinRef.current.slice(0, -1)
      confirmPinRef.current = n; setConfirmPin(n)
    }
  }

  const changePinCurrentLength = changePinStep === 'old' ? oldPinRef.current.length : changePinStep === 'new' ? newPinRef.current.length : confirmPinRef.current.length
  const changePinDots = Array.from({ length: 6 }, (_, i) => i < changePinCurrentLength)

  const settingsContent = (
    <div className="flex-1 p-4 overflow-y-auto min-w-0 pb-20">
      <div className="flex items-center gap-3 mb-6">
        {!isLarge && (
          <button onClick={onBack} className="text-text-secondary">
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className="text-xl font-bold">Pengaturan</h1>
      </div>

      <div className="space-y-6 max-w-lg">
        <section>
          <h2 className="text-text-secondary text-sm font-semibold uppercase mb-3 flex items-center gap-1.5"><Shield size={16} /> Keamanan</h2>
          <div className="bg-bg-card rounded-xl p-4 space-y-4 shadow-sm">
            <button
              onClick={openChangePin}
              className="w-full text-left text-text-primary hover:text-accent transition-colors"
            >
              Ganti PIN
            </button>
            <div className="flex items-center justify-between">
              <span className="text-text-primary">Kunci Otomatis</span>
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
                <p className="text-amber-400 text-xs font-semibold mb-1 flex items-center gap-1"><Key size={14} /> Kode Pemulihan Aktif</p>
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
          <h2 className="text-text-secondary text-sm font-semibold uppercase mb-3 flex items-center gap-1.5"><Palette size={16} /> Tampilan</h2>
          <div className="bg-bg-card rounded-xl p-4 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-text-primary">Theme</span>
              <button
                onClick={toggleTheme}
                className="px-4 py-1.5 rounded-lg bg-slate-700 text-text-primary border border-slate-600 hover:bg-slate-600 transition-colors"
              >
                {theme === 'dark' ? 'Dark' : 'Light'}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-primary">Language</span>
              <span className="text-text-secondary">Bahasa Indonesia</span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-text-secondary text-sm font-semibold uppercase mb-3 flex items-center gap-1.5"><Database size={16} /> Data & Cadangan</h2>
          <div className="bg-bg-card rounded-xl p-4 space-y-4 shadow-sm">
            <button
              onClick={handleExport}
              className="w-full text-left text-text-primary hover:text-accent transition-colors"
            >
              <span className="flex items-center gap-1.5"><Download size={16} /> Cadangkan Data</span>
            </button>
            <button
              onClick={handleImport}
              className="w-full text-left text-text-primary hover:text-accent transition-colors"
            >
              <span className="flex items-center gap-1.5"><Upload size={16} /> Pulihkan Data</span>
            </button>
            <hr className="border-slate-700" />
            <button
              onClick={() => setShowCategories(true)}
              className="w-full text-left text-text-primary hover:text-accent transition-colors"
            >
              <span className="flex items-center gap-1.5"><Tag size={16} /> Kelola Kategori</span>
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
          <h2 className="text-text-secondary text-sm font-semibold uppercase mb-3 flex items-center gap-1.5"><Info size={16} /> Tentang</h2>
          <div className="bg-bg-card rounded-xl p-4 space-y-3 shadow-sm">
            <p className="text-text-primary font-semibold">AuthKeeper v1.2.1</p>
            <p className="text-text-secondary text-sm">Created by MUKHAMAD IRFAN</p>
            <p className="text-text-secondary text-sm">Tauri + React + TypeScript</p>
            <hr className="border-slate-700" />
            <button
              onClick={handleCheckUpdate}
              disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
              className="w-full text-left text-accent hover:text-accent/80 transition-colors disabled:text-text-secondary disabled:cursor-not-allowed"
            >
              <span className="flex items-center gap-1.5">{updateStatus === 'checking' ? <><Loader size={16} className="animate-spin" /> Memeriksa...</> : updateStatus === 'downloading' ? <><Download size={16} /> Mengunduh...</> : <><RefreshCw size={16} /> Periksa Pembaruan</>}</span>
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
          <span className="flex items-center gap-1.5"><LogOut size={16} /> Kunci Aplikasi</span>
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
              <p className="text-danger text-sm text-center mb-3">{changePinError}</p>
            )}
            {changePinSuccess && (
              <p className="text-emerald-400 text-sm text-center mb-3">{changePinSuccess}</p>
            )}

            <input
              ref={pinInputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              className="absolute opacity-0"
              autoComplete="off"
              aria-label="Input PIN"
            />
            <Numpad onInput={handleChangePinInput} onDelete={handleChangePinDelete} />
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowImportModal(false)}>
          <div className="bg-bg-primary rounded-2xl p-6 w-[90%] max-w-sm border border-slate-700" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-text-primary text-center mb-2 flex items-center justify-center gap-1.5"><Upload size={20} /> Pulihkan Data</h2>
            <p className="text-text-secondary text-xs text-center mb-2">
              Import akan <span className="text-danger font-semibold">mengganti semua akun yang ada</span>.
              Pastikan Anda sudah mencadangkan data saat ini.
            </p>

            {!importConfirming ? (
              <>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
                  <p className="text-amber-400 text-xs font-semibold mb-1 flex items-center gap-1"><AlertTriangle size={14} className="text-amber-400" /> Backup Key Diperlukan</p>
                  <p className="text-text-secondary text-xs">
                    Masukkan Backup Key dari file <code className="text-accent">.authkeeper.recovery.txt</code>
                  </p>
                </div>
                <input
                  type="text"
                  value={importKey}
                  onChange={(e) => { setImportKey(e.target.value); setImportKeyError('') }}
                  placeholder="cth: aB3xK9mP2cR7vF1n"
                  className="w-full px-4 py-2.5 rounded-xl bg-bg-card text-text-primary placeholder-text-secondary border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent font-mono text-center mb-3"
                  autoFocus
                />
                {importKeyError && <p className="text-danger text-xs text-center mb-3">{importKeyError}</p>}
                <div className="flex gap-2">
                  <button onClick={() => setShowImportModal(false)} className="flex-1 py-2.5 rounded-xl bg-slate-700 text-text-primary font-semibold hover:bg-slate-600 transition-colors">
                    Batal
                  </button>
                  <button onClick={handleImportConfirm} className="flex-1 py-2.5 rounded-xl bg-danger text-white font-semibold hover:opacity-90 transition-opacity">
                    Pulihkan
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-text-secondary">Memulihkan data...</p>
              </div>
            )}
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