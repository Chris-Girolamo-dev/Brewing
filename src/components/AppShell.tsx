'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FlaskConical, LayoutDashboard, Menu, MoreHorizontal, Plus, PlusCircle, Sun, Moon, Database, HardDrive } from 'lucide-react'
import { NAV_FOOTER, NAV_PRIMARY, NAV_RECORDS, type NavItem } from '@/lib/nav'
import { useStore } from '@/lib/store'
import { cn, WORDMARK } from '@/lib/utils'
import { ToastProvider } from '@/components/ui/Toast'
import { LogActivityDialog } from '@/components/LogActivityDialog'
import { SplitDialog } from '@/components/batch/SplitDialog'
import { StatusPill } from '@/components/ui/Badge'

interface ShellCtx {
  openLog: (batchId?: string, preset?: string) => void
  openSplit: (batchId: string) => void
}
const Ctx = React.createContext<ShellCtx>({ openLog: () => {}, openSplit: () => {} })
export const useShell = () => React.useContext(Ctx)

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [navOpen, setNavOpen] = React.useState(false)
  const [log, setLog] = React.useState<{ open: boolean; batchId?: string; preset?: string }>({ open: false })
  const [split, setSplit] = React.useState<string | null>(null)
  const { mode, error } = useStore()

  React.useEffect(() => setNavOpen(false), [pathname])

  const openLog = React.useCallback((batchId?: string, preset?: string) => setLog({ open: true, batchId, preset }), [])
  const openSplit = React.useCallback((batchId: string) => {
    setLog({ open: false })
    setSplit(batchId)
  }, [])

  return (
    <ToastProvider>
      <Ctx.Provider value={{ openLog, openSplit }}>
        <div className="app-layout">
          <MobileHeader onMenu={() => setNavOpen(true)} />
          <Sidebar open={navOpen} pathname={pathname} mode={mode} />
          {navOpen && <div className="mobile-backdrop" onClick={() => setNavOpen(false)} aria-hidden />}
          <main className="app-layout__main">
            {error && (
              <div className="mb-4 rounded-xl border border-[color-mix(in_oklab,var(--crit)_40%,transparent)] bg-[color-mix(in_oklab,var(--crit)_10%,transparent)] px-4 py-3 text-sm text-crit">
                <strong>Data error:</strong> {error}
                {mode === 'supabase' && (
                  <span className="text-text-2">
                    {' '}
                    Check that the migration in <code className="font-mono">supabase/migrations/0001_init.sql</code> has been applied.
                  </span>
                )}
              </div>
            )}
            {children}
          </main>
          <BottomNav pathname={pathname} onMore={() => setNavOpen(true)} onLog={() => openLog()} />
          <LogActivityDialog
            open={log.open}
            batchId={log.batchId}
            preset={log.preset}
            onClose={() => setLog({ open: false })}
          />
          <SplitDialog batchId={split} open={split !== null} onClose={() => setSplit(null)} />
        </div>
      </Ctx.Provider>
    </ToastProvider>
  )
}

function Wordmark({ size = 20 }: { size?: number }) {
  return (
    <Link href="/" className="wordmark" style={{ fontSize: size }} aria-label="Home">
      {WORDMARK.lead}
      <span className="wordmark__accent">{WORDMARK.accent}</span>
    </Link>
  )
}

function Sidebar({ open, pathname, mode }: { open: boolean; pathname: string; mode: 'supabase' | 'demo' }) {
  return (
    <aside className={cn('sidebar', open && 'sidebar--open')}>
      <div className="sidebar__brand">
        <Wordmark />
      </div>
      <nav className="sidebar__nav">
        <div className="sidebar__section-title">Workspace</div>
        {NAV_PRIMARY.map((n) => (
          <SideItem key={n.href} item={n} pathname={pathname} />
        ))}
        <div className="sidebar__section-title">Records</div>
        {NAV_RECORDS.map((n) => (
          <SideItem key={n.href} item={n} pathname={pathname} />
        ))}
      </nav>
      <div className="sidebar__footer">
        {NAV_FOOTER.map((n) => (
          <SideItem key={n.href} item={n} pathname={pathname} />
        ))}
        <div className="flex items-center justify-between px-3 pb-1 pt-2">
          <StatusPill tone={mode === 'supabase' ? 'ok' : 'warn'}>
            {mode === 'supabase' ? (
              <>
                <Database size={10} /> Supabase
              </>
            ) : (
              <>
                <HardDrive size={10} /> Demo · local
              </>
            )}
          </StatusPill>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  )
}

function SideItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = item.href === '/' ? pathname === '/' : pathname === item.href || (pathname.startsWith(item.href + '/') && item.href !== '/batches') || (item.href === '/batches' && pathname.startsWith('/batches/') && pathname !== '/batches/new')
  const Icon = item.icon
  return (
    <Link href={item.href} className={cn('sidebar__item', active && 'sidebar__item--active')}>
      <Icon size={15} />
      {item.label}
    </Link>
  )
}

function MobileHeader({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="mobile-header">
      <button className="mobile-header__btn" onClick={onMenu} aria-label="Open navigation">
        <Menu size={22} />
      </button>
      <Wordmark size={18} />
      <Link href="/batches/new" className="mobile-header__btn" aria-label="New batch">
        <PlusCircle size={20} />
      </Link>
    </header>
  )
}

function BottomNav({ pathname, onMore, onLog }: { pathname: string; onMore: () => void; onLog: () => void }) {
  const item = (href: string, label: string, Icon: React.ComponentType<{ size?: number }>) => {
    const active = href === '/' ? pathname === '/' : pathname.startsWith(href)
    return (
      <Link href={href} className={cn('bottom-nav__item', active && 'bottom-nav__item--active')}>
        <Icon size={20} />
        {label}
      </Link>
    )
  }
  return (
    <nav className="bottom-nav">
      {item('/', 'Dashboard', LayoutDashboard)}
      {item('/batches', 'Batches', FlaskConical)}
      <button className="bottom-nav__item" onClick={onLog} aria-label="Log activity">
        <span className="bottom-nav__fab">
          <Plus size={24} />
        </span>
        <span className="mt-0.5">Log</span>
      </button>
      {item('/batches/new', 'New', PlusCircle)}
      <button className="bottom-nav__item" onClick={onMore}>
        <MoreHorizontal size={20} />
        More
      </button>
    </nav>
  )
}

function ThemeToggle() {
  const [theme, setTheme] = React.useState<'dark' | 'light'>('dark')
  React.useEffect(() => {
    const t = document.documentElement.getAttribute('data-theme')
    if (t === 'light' || t === 'dark') setTheme(t)
  }, [])
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem('fbm_theme', next)
    } catch {
      /* ignore */
    }
    setTheme(next)
  }
  return (
    <button onClick={toggle} className="rounded-md p-1.5 text-text-3 hover:bg-[#181d28] hover:text-white" aria-label="Toggle theme">
      {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  )
}
