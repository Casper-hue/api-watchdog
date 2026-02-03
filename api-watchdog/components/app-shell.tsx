"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FolderKanban,
  BarChart3,
  Settings,
  Terminal,
  Bell,
  Menu,
  X,
  Power,
} from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { LanguageToggle } from "@/components/language-toggle"
import { useI18n } from "@/contexts/i18n-context"



export function AppShell({ children, onRefreshSign }: { children: React.ReactNode, onRefreshSign?: () => void }) {
  const { t } = useI18n();
  const pathname = usePathname()
  const [open, setOpen] = React.useState(false)
  
  const navigation = [
    { name: t('dashboard').toUpperCase(), href: "/", icon: LayoutDashboard },
    { name: t('projects').toUpperCase(), href: "/projects", icon: FolderKanban },
    { name: t('statistics').toUpperCase(), href: "/statistics", icon: BarChart3 },
    { name: t('settings').toUpperCase(), href: "/settings", icon: Settings },
  ];

  return (
    <div className="relative flex min-h-screen flex-col bg-background industrial-grid">
      {/* CRT Scanline Overlay */}
      <div className="pointer-events-none fixed inset-0 z-[100] crt-scanlines" />
      
      {/* Desktop Header */}
      <header className="sticky top-0 z-50 hidden border-b-2 border-border bg-card lg:block">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link 
              href="/"
              onClick={(e) => {
                // Only trigger the sign refresh if we're specifically clicking the logo
                // when already on the homepage, not during route changes
                if (pathname === '/') {
                  e.preventDefault();
                  e.stopPropagation();
                  onRefreshSign?.();
                }
              }}
              className="flex items-center gap-3"
            >
              <div className="industrial-panel flex h-10 w-10 items-center justify-center">
                <Terminal className="h-5 w-5 text-primary text-glow-amber" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold tracking-widest text-primary text-glow-amber">
                  API_MONITOR
                </span>
                <span className="embossed-label text-muted-foreground">
                  SYS v1.0.0
                </span>
              </div>
            </Link>
            
            {/* Navigation */}
            <nav className="flex items-center gap-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-xs font-medium tracking-wider transition-all",
                      isActive
                        ? "industrial-button-primary text-primary-foreground"
                        : "industrial-button text-muted-foreground hover:text-primary"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                )
              })}
            </nav>
          </div>
          
          {/* Status indicators */}
          <div className="flex items-center gap-4">
            {/* Language Toggle */}
            <LanguageToggle />
            
            {/* Notification icon (static, no interaction) */}
            <div className="industrial-panel p-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
            </div>
            
            {/* Status panel */}
            <div className="industrial-panel flex items-center gap-3 px-4 py-2">
              <div className="led-indicator led-on-green" />
              <span className="text-xs font-medium tracking-wider text-success text-glow-green">
                {t('recording')}
              </span>
            </div>
            
            {/* Power indicator */}
            <div className="industrial-panel p-2">
              <Power className="h-5 w-5 text-primary text-glow-amber" />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b-2 border-border bg-card px-4 lg:hidden">
        <Link 
          href="/" 
          onClick={(e) => {
            // Only trigger the sign refresh if we're specifically clicking the logo
            // when already on the homepage, not during route changes
            if (pathname === '/') {
              e.preventDefault();
              e.stopPropagation();
              onRefreshSign?.();
            }
          }}
          className="flex items-center gap-2"
        >
          <div className="industrial-panel flex h-9 w-9 items-center justify-center">
            <Terminal className="h-4 w-4 text-primary text-glow-amber" />
          </div>
          <span className="text-xs font-bold tracking-widest text-primary text-glow-amber">
            API_MONITOR
          </span>
        </Link>
        
        <div className="flex items-center gap-2">
          <div className="led-indicator led-on-green" />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button className="industrial-button p-2">
                <Menu className="h-5 w-5 text-muted-foreground" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 border-l-2 border-border bg-card p-0">
              <div className="flex h-14 items-center justify-between border-b-2 border-border px-4">
                <span className="text-xs font-bold tracking-widest text-primary">MENU</span>
                <button className="industrial-button p-2" onClick={() => setOpen(false)}>
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>
              <nav className="flex flex-col gap-2 p-4">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-xs font-medium tracking-wider transition-all",
                        isActive
                          ? "industrial-button-primary text-primary-foreground"
                          : "industrial-button text-muted-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </Link>
                  )
                })}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-6 lg:py-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t-2 border-border bg-card lg:hidden">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 transition-colors",
                isActive 
                  ? "text-primary text-glow-amber" 
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[9px] font-medium tracking-wider">{item.name}</span>
            </Link>
          )
        })}
      </nav>
      
      {/* Mobile bottom padding */}
      <div className="h-16 lg:hidden" />
    </div>
  )
}
