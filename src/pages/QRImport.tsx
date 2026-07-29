import { useState, useRef, useEffect } from 'react'
import jsQR from 'jsqr'
import { Html5Qrcode } from 'html5-qrcode'
import { invoke } from '@tauri-apps/api/core'
import { accountService } from '@/services/accountService'
import { parseOtpauthUri } from '@/utils/otpauth'
import type { MigrationAccount, MigrationResult } from '@/types/account'
import { ArrowLeft, Camera, Folder, Square, AlertTriangle, Package, Check } from 'lucide-react'

interface QRImportProps {
  onBack: () => void
  onDone: () => void
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

export function QRImport({ onBack, onDone }: QRImportProps) {
  const [processing, setProcessing] = useState(false)
  const [results, setResults] = useState<MigrationAccount[]>([])
  const [skipped, setSkipped] = useState<string[]>([])
  const [batchSize, setBatchSize] = useState(1)
  const [batchIndex, setBatchIndex] = useState(0)
  const [importing, setImporting] = useState(false)
  const [importCount, setImportCount] = useState(0)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [error, setError] = useState('')
  const [cameraScanning, setCameraScanning] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
      } catch {}
      scannerRef.current = null
    }
    setCameraScanning(false)
  }

  const startCamera = async () => {
    setError('')
    setCameraScanning(true)
    await new Promise((r) => setTimeout(r, 100))

    try {
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner

      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await stopCamera()
          await handleDecoded(decodedText)
        },
        () => {},
      )
    } catch (e: any) {
      const msg = String(e?.message || '')
      const name = String(e?.name || '')
      const detail = msg.includes('NotAllowed') ? 'Izin kamera ditolak. Izinkan akses kamera di pengaturan Windows.'
        : msg.includes('NotFound') ? 'Tidak ada kamera ditemukan'
        : msg.includes('NotReadable') ? 'Kamera sedang digunakan aplikasi lain'
        : `${name}: ${msg}`
      setError(detail)
      setCameraScanning(false)
    }
  }

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setImportErrors([])
    setImportCount(0)
    setProcessing(true)

    try {
      const decodedText = await decodeQRFromImage(file)
      await handleDecoded(decodedText)
    } catch (err: any) {
      setError(err.message || 'Gagal membaca QR code. Pastikan gambar jelas.')
    } finally {
      setProcessing(false)
    }
  }

  const handleDecoded = async (text: string) => {
    if (text.startsWith('otpauth-migration://')) {
      const url = new URL(text)
      const data = url.searchParams.get('data')
      if (!data) {
        setError('Format QR migration tidak valid')
        return
      }
      try {
        const result: MigrationResult = await invoke('parse_migration_qr', { dataB64: data })
        setResults(result.accounts)
        setSkipped(result.skipped)
        setBatchSize(result.batch_size)
        setBatchIndex(result.batch_index)
      } catch (e: any) {
        setError(String(e))
      }
    } else if (text.startsWith('otpauth://')) {
      const parsed = parseOtpauthUri(text)
      if (!parsed) {
        setError('Format QR tidak valid')
        return
      }
      setResults([{
        issuer: parsed.issuer,
        label: parsed.label,
        secret: parsed.secret,
        algorithm: parsed.algorithm,
        digits: parsed.digits,
        period: parsed.period,
      }])
      setSkipped([])
      setBatchSize(1)
      setBatchIndex(0)
    } else {
      setError('QR code bukan format otpauth. Gunakan export dari Google Authenticator.')
    }
  }

  const importAll = async () => {
    setImporting(true)
    setImportErrors([])
    setError('')
    let count = 0
    const errors: string[] = []
    for (const acc of results) {
      try {
        await accountService.createAccount({
          issuer: acc.issuer,
          label: acc.label,
          secret: acc.secret,
          algorithm: acc.algorithm as any,
          digits: acc.digits as 6 | 8,
          period: acc.period as 30 | 60,
        })
        count++
      } catch (e: any) {
        errors.push(`Gagal import ${acc.issuer || acc.label}: ${e}`)
      }
    }
    setImportCount(count)
    setImportErrors(errors)
    setImporting(false)
  }

  const totalFound = results.length + skipped.length
  const showSummary = importCount > 0 || importErrors.length > 0
  const allImported = showSummary && importErrors.length === 0

  return (
    <div className="min-h-screen p-4">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-text-secondary">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Import QR</h1>
      </div>

      {results.length > 0 ? (
        <div>
          <h2 className="text-text-secondary font-semibold mb-3">
            Ditemukan {results.length} akun{totalFound > results.length ? ` (${skipped.length} dilewati)` : ''}:
          </h2>

          {batchSize > 1 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4">
              <p className="text-amber-400 text-sm font-semibold mb-1 flex items-center gap-1.5">
                <Package size={14} /> QR {batchIndex + 1} dari {batchSize}
              </p>
              <p className="text-text-secondary text-xs">
                Google Authenticator membagi export ke {batchSize} QR. 
                Scan semua QR untuk hasil lengkap.
              </p>
            </div>
          )}

          {skipped.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4">
              <p className="text-amber-400 text-sm font-semibold mb-1 flex items-center gap-1.5">
                <AlertTriangle size={14} /> Akun dilewati (HOTP belum didukung):
              </p>
              {skipped.map((s, i) => (
                <p key={i} className="text-text-secondary text-xs ml-2">- {s}</p>
              ))}
            </div>
          )}

          <div className="space-y-2 mb-4">
            {results.map((acc, i) => (
              <div key={i} className="bg-bg-card rounded-xl p-3">
                <p className="text-text-primary font-semibold">{acc.issuer}</p>
                <p className="text-text-secondary text-sm">{acc.label}</p>
                <p className="text-text-secondary text-xs">
                  {acc.algorithm} | {acc.digits} digit | {acc.period}s
                </p>
              </div>
            ))}
          </div>

          {allImported ? (
            <div className="text-center">
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4">
                <p className="text-emerald-400 font-semibold text-lg flex items-center justify-center gap-1.5"><Check size={20} className="text-emerald-400" /> Berhasil</p>
                <p className="text-text-secondary text-sm mt-1">
                  {importCount} dari {results.length} akun berhasil diimport
                  {skipped.length > 0 ? ` (${skipped.length} dilewati)` : ''}
                </p>
              </div>
              <button
                onClick={onDone}
                className="w-full py-3 rounded-xl bg-accent text-white font-semibold hover:opacity-90 transition-opacity"
              >
                Selesai
              </button>
            </div>
          ) : (
            <div>
              <button
                onClick={importAll}
                disabled={importing}
                className="w-full py-3 rounded-xl bg-accent text-white font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {importing ? `Mengimport... (${importCount}/${results.length})` : 'Import Semua Akun'}
              </button>

              {importErrors.length > 0 && (
                <div className="bg-danger/10 border border-danger/30 rounded-xl p-3 mt-4">
                  <p className="text-danger text-sm font-semibold mb-1">
                    {importErrors.length} dari {results.length} gagal:
                  </p>
                  {importErrors.map((err, i) => (
                    <p key={i} className="text-text-secondary text-xs ml-2">- {err}</p>
                  ))}
                </div>
              )}

              {error && <p className="text-danger text-sm mt-2">{error}</p>}
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="text-text-secondary text-sm mb-4">
            Scan QR code dari Google Authenticator, atau upload screenshot
          </p>

          {cameraScanning ? (
            <div className="mb-4">
              <div id="qr-reader" ref={previewRef} className="w-full max-w-xs mx-auto rounded-xl overflow-hidden" />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={stopCamera}
                  className="flex-1 py-2 rounded-xl bg-danger/10 text-danger text-sm font-semibold hover:bg-danger/20 transition-colors"
                >
                  <span className="flex items-center gap-1.5"><Square size={16} /> Berhenti</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-4">
                <button
                  onClick={startCamera}
                  disabled={processing}
                  className="flex-1 py-3 rounded-xl bg-accent text-white font-semibold disabled:opacity-50 hover:opacity-90 transition-colors"
                >
                  <span className="flex items-center gap-1.5"><Camera size={16} /> Scan Kamera</span>
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={processing}
                  className="flex-1 py-3 rounded-xl bg-bg-card text-text-primary border border-slate-700 font-semibold disabled:opacity-50 hover:bg-slate-700/50 transition-colors"
                >
                  <span className="flex items-center gap-1.5"><Folder size={16} /> Pilih File</span>
                </button>
              </div>

              <p className="text-text-secondary text-xs text-center">
                Format: PNG, JPG, atau scan langsung dari kamera.
              </p>
            </>
          )}

          {processing && (
            <div className="w-full max-w-xs mx-auto bg-bg-card rounded-xl mb-4 flex items-center justify-center" style={{ minHeight: 200 }}>
              <p className="text-text-secondary">Memproses gambar...</p>
            </div>
          )}

          {error && <p className="text-danger text-sm mt-2">{error}</p>}

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
        </div>
      )}
    </div>
  )
}