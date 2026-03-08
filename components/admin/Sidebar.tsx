'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType } from 'react'
import { hasPermission, type Permission } from '@/lib/permissions'
import {
  CircleHelp,
  Cog,
  Gem,
  Home,
  Megaphone,
  Package,
  ShoppingBag,
  Store,
  Users,
} from 'lucide-react'
import { adminNavSections, type AdminNavSection } from '@/components/admin/navigation'

type SidebarProps = {
  brandName: string
  mobileOpen: boolean
  onClose: () => void
  workspaceSummary?: {
    sectionBadges: Record<string, number>
    pageBadges: Record<string, number>
  } | null
  adminIdentity?: {
    role: string
    permissions?: string[]
  } | null
  addonRuntime?: {
    activeAddonIds: string[]
    adminLinks?: Array<{
      id: string
      addonId?: string
      label: string
      href: string
      description?: string
      category: string
    }>
  } | null
}

export function Sidebar({ brandName, mobileOpen, onClose, workspaceSummary, adminIdentity, addonRuntime }: SidebarProps) {
  const pathname = usePathname()
  const role = adminIdentity?.role ?? 'ADMIN'
  const permissions = adminIdentity?.permissions ?? []
  const activeAddonIds = addonRuntime?.activeAddonIds ?? []
  const addonAdminLinks = addonRuntime?.adminLinks ?? []

  function canAccess(permission?: Permission) {
    if (!permission) return true
    return hasPermission(role, permissions, permission)
  }

  function isAddonEnabled(addonId?: string) {
    if (!addonId) return true
    return activeAddonIds.includes(addonId)
  }

  const filteredSections = adminNavSections
    .map((section) => {
      const staticChildren = section.children?.filter((child) => canAccess(child.requiredPermission) && isAddonEnabled(child.addonId)) ?? []
      const injectedChildren = section.label === 'Add-ons'
        ? addonAdminLinks.map((link) => ({
            label: link.label,
            href: link.href,
            addonId: link.addonId,
          }))
        : []
      const children = [...staticChildren, ...injectedChildren]

      return {
        ...section,
        children: children.length > 0 ? children : undefined,
      }
    })
    .filter((section) => canAccess(section.requiredPermission) && isAddonEnabled(section.addonId))

  const mainSections = filteredSections.filter((section) => section.placement !== 'bottom')
  const bottomSections = filteredSections.filter((section) => section.placement === 'bottom')

  const iconByLabel: Record<string, ComponentType<{ className?: string }>> = {
    Home,
    Orders: ShoppingBag,
    Products: Package,
    Customers: Users,
    Vendors: Store,
    Marketing: Megaphone,
    Website: CircleHelp,
    'Add-ons': Gem,
    Settings: Cog,
  }

  function isSectionActive(section: AdminNavSection) {
    if (pathname === section.href) return true
    if (section.href !== '/admin' && pathname.startsWith(section.href)) return true
    if (section.children?.some((child) => pathname === child.href || pathname.startsWith(`${child.href}/`))) return true
    return false
  }

  const activeMainSection = mainSections.find((section) => isSectionActive(section))

  return (
    <aside className={`fixed left-0 top-0 z-50 h-screen w-72 border-r border-slate-200 bg-[#f7f8fb] text-slate-700 shadow-[6px_0_20px_rgba(15,23,42,0.08)] transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      <div className="border-b border-slate-200 px-5 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-sm font-black text-white shadow-sm">B</div>
          <div>
            <p className="text-base font-black text-slate-900">{brandName}</p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Administration</p>
            {adminIdentity?.role ? <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-600">{adminIdentity.role}</p> : null}
          </div>
        </Link>
      </div>

      <div className="flex h-[calc(100vh-73px)] flex-col justify-between px-2 py-4">
        <nav className="overflow-y-auto pr-1">
          <div className="space-y-1">
            {mainSections.map((section) => {
              const activeSection = isSectionActive(section)
              const Icon = iconByLabel[section.label] ?? CircleHelp

              return (
                <section key={section.label}>
                  <Link
                    href={section.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                      activeSection ? 'bg-slate-200/80 font-semibold text-slate-900' : 'text-slate-800 hover:bg-slate-200/60'
                    }`}
                  >
                    <Icon className="h-4 w-4 text-slate-600" />
                    <span className="flex-1">{section.label}</span>
                    {(workspaceSummary?.sectionBadges?.[section.label] ?? 0) > 0 ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                        {workspaceSummary?.sectionBadges?.[section.label]}
                      </span>
                    ) : null}
                  </Link>

                  {section.children && activeMainSection?.label === section.label && (
                    <div className="mt-1 space-y-0.5 pl-9">
                      {section.children.map((item) => {
                        const activeChild = pathname === item.href || pathname.startsWith(`${item.href}/`)
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={onClose}
                            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[14px] transition ${
                              activeChild ? 'bg-slate-200 font-semibold text-slate-900' : 'text-slate-600 hover:bg-slate-200/60'
                            }`}
                          >
                            <span className="flex-1">{item.label}</span>
                            {(workspaceSummary?.pageBadges?.[item.href] ?? 0) > 0 ? (
                              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">
                                {workspaceSummary?.pageBadges?.[item.href]}
                              </span>
                            ) : null}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </section>
              )
            })}
          </div>
        </nav>

        <div className="space-y-1 border-t border-slate-200 pt-3">
          {bottomSections.map((section) => {
            const active = isSectionActive(section)
            const Icon = iconByLabel[section.label] ?? Cog

            return (
              <Link
                key={section.label}
                href={section.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                  active ? 'bg-slate-200/80 font-semibold text-slate-900' : 'text-slate-800 hover:bg-slate-200/60'
                }`}
              >
                <Icon className="h-4 w-4 text-slate-600" />
                {section.label}
              </Link>
            )
          })}
        </div>
      </div>
    </aside>
  )
}
