import { useState, useEffect, useCallback } from 'react'
import { AccountCard } from '@/components/dashboard/AccountCard'
import { NavBar } from '@/components/dashboard/NavBar'
import { Sidebar } from '@/components/dashboard/Sidebar'
import { useWindowSize } from '@/hooks/useWindowSize'
import { accountService } from '@/services/accountService'
import { totpService } from '@/services/totpService'
import { categoryService } from '@/services/categoryService'
import { getRemainingSeconds } from '@/utils/time'
import type { Account, OtpCode, GenerateOtpAllResult } from '@/types/account'
import type { Category } from '@/types/category'

interface DashboardProps {
  onNavigate: (page: string, params?: Record<string, string>) => void
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { isLarge } = useWindowSize()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [otpMap, setOtpMap] = useState<Record<number, OtpCode>>({})
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'favorites'>('all')
  const [remainingMap, setRemainingMap] = useState<Record<number, number>>({})
  const [errorMap, setErrorMap] = useState<Record<number, string>>({})
  const [accountCategories, setAccountCategories] = useState<Record<number, Category[]>>({})
  const [showWelcome, setShowWelcome] = useState(!localStorage.getItem('welcome_shown'))

  const loadAccounts = useCallback(async () => {
    try {
      const [data, catMap] = await Promise.all([
        accountService.getAccounts(),
        categoryService.getAllAccountCategories(),
      ])
      setAccounts(data)
      setAccountCategories(catMap)
    } catch (e) {
      console.error('Failed to load accounts', e)
    }
  }, [])

  const refreshOtps = useCallback(async () => {
    try {
      const result: GenerateOtpAllResult = await totpService.generateOtpAll()
      setOtpMap(result.codes)
      setErrorMap(result.errors)
      const rems: Record<number, number> = {}
      Object.entries(result.codes).forEach(([id, code]) => {
        rems[Number(id)] = code.remaining
      })
      setRemainingMap(rems)
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    loadAccounts()
    refreshOtps()
    const interval = setInterval(() => {
      const rem = getRemainingSeconds(30)
      setRemainingMap((prev) => {
        const next: Record<number, number> = {}
        Object.keys(prev).forEach((id) => {
          next[Number(id)] = rem
        })
        return next
      })
      if (rem === 30) {
        refreshOtps()
      }
    }, 1000)

    return () => {
      clearInterval(interval)
    }
  }, [loadAccounts, refreshOtps])

  const filtered = accounts.filter((a) => {
    const q = search.toLowerCase()
    const matchSearch = a.issuer.toLowerCase().includes(q) || a.label.toLowerCase().includes(q)
    if (filter === 'favorites') return matchSearch && a.favorite
    return matchSearch
  })

  const handleSidebarNav = (page: string) => {
    if (page === 'favorites') {
      setFilter(filter === 'favorites' ? 'all' : 'favorites')
    } else {
      onNavigate(page)
    }
  }

  const dismissWelcome = () => {
    localStorage.setItem('welcome_shown', 'true')
    setShowWelcome(false)
  }

  const mainContent = (
    <div className="flex-1 p-4 overflow-y-auto min-w-0 pb-20">
      <div className="flex items-center justify-between mb-4">
        <div>
          {!isLarge && <h1 className="text-xl font-bold">AuthKeeper</h1>}
          {isLarge && <h1 className="text-xl font-bold">
            {filter === 'favorites' ? '⭐ Favorit' : '🏠 Beranda'}
          </h1>}
          {accounts.length > 0 && (
            <p className="text-text-secondary text-xs mt-0.5">{accounts.length} akun tersimpan</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate('qr-import')}
            className="bg-bg-card text-text-primary w-10 h-10 rounded-xl text-lg flex items-center justify-center border border-slate-700 hover:bg-slate-700/50 transition-colors"
          >
            📷
          </button>
          <button
            onClick={() => onNavigate('account-form', { mode: 'add' })}
            className="bg-accent text-white w-10 h-10 rounded-xl text-2xl flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            +
          </button>
        </div>
      </div>

      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={dismissWelcome}>
          <div
            className="bg-bg-primary rounded-2xl p-6 w-full max-w-sm border border-slate-700 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="text-4xl mb-3">🔐</div>
              <h2 className="text-xl font-bold text-text-primary">AuthKeeper</h2>
              <p className="text-text-secondary text-xs">by MUKHAMAD IRFAN</p>
            </div>

            <p className="text-text-secondary text-sm mb-5 text-center">
              Aplikasi offline untuk mengelola kode OTP/TOTP.
              Semua data tersimpan aman di perangkat Anda sendiri.
            </p>

            <div className="bg-bg-card rounded-xl p-4 text-sm space-y-2 mb-4">
              <p className="text-text-primary font-semibold">📖 Panduan:</p>
              <p className="text-text-secondary">1. Tambah akun → tombol <strong>+</strong> atau scan QR</p>
              <p className="text-text-secondary">2. Salin kode → tekan <strong>📋</strong> di kartu akun</p>
              <p className="text-text-secondary">3. Cari akun → gunakan kolom pencarian</p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm mb-5">
              <p className="text-amber-400 font-semibold mb-1">⚠️ Backup Data Berkala!</p>
              <p className="text-text-secondary">
                Settings → Export Backup. Jika laptop rusak atau aplikasi error, 
                backup bisa dipulihkan kapan saja.
              </p>
            </div>

            <button
              onClick={dismissWelcome}
              className="w-full py-3 rounded-xl bg-accent text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Mulai
            </button>
          </div>
        </div>
      )}

      <input
        type="text"
        placeholder="Cari akun..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl bg-bg-card text-text-primary placeholder-text-secondary border border-slate-700 focus:outline-none focus:ring-2 focus:ring-accent mb-4"
      />

      <div className="flex flex-col gap-3">
        {(() => {
          const grouped: Record<string, Account[]> = {}
          filtered.forEach((acc) => {
            const g = acc.issuer || '(Tanpa Issuer)'
            if (!grouped[g]) grouped[g] = []
            grouped[g].push(acc)
          })
          return Object.keys(grouped).sort().map((issuer) => (
            <div key={issuer}>
              <h2 className="text-text-secondary font-semibold text-sm px-1 mb-2 mt-4 first:mt-0">{issuer}</h2>
              {grouped[issuer].map((acc) => (
                <div key={acc.id} className="mb-3 last:mb-0">
                  <AccountCard
                    account={acc}
                    otp={otpMap[acc.id] || null}
                    error={errorMap[acc.id]}
                    remaining={remainingMap[acc.id] ?? 30}
                    showIssuer={false}
                    categories={accountCategories[acc.id]}
                    onClick={() => onNavigate('account-detail', { id: String(acc.id) })}
                    onToggleFavorite={async () => {
                      await accountService.toggleFavorite(acc.id)
                      loadAccounts()
                    }}
                  />
                </div>
              ))}
            </div>
          ))
        })()}
        {filtered.length === 0 && (
          <p className="text-text-secondary text-center mt-8">
            {accounts.length === 0
              ? 'Belum ada akun. Tekan + untuk menambah'
              : 'Tidak ada akun ditemukan'}
          </p>
        )}
      </div>
    </div>
  )

  if (isLarge) {
    return (
      <div className="min-h-screen flex">
        <Sidebar active={filter === 'favorites' ? 'favorites' : 'dashboard'} onNavigate={handleSidebarNav} />
        {mainContent}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {mainContent}
      <NavBar
        active={filter === 'favorites' ? 'favorites' : 'dashboard'}
        onNavigate={(page) => {
          if (page === 'favorites') {
            setFilter(filter === 'favorites' ? 'all' : 'favorites')
          } else {
            onNavigate(page)
          }
        }}
      />
    </div>
  )
}
