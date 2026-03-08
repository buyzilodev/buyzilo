import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'
import { isAddonActive } from '@/lib/addons/manager'

export async function requireActiveAddon(addonId: string) {
  if (!(await isAddonActive(addonId))) {
    redirect('/admin/addons')
  }
}

export async function requireActiveAddonApi(addonId: string) {
  if (!(await isAddonActive(addonId))) {
    return NextResponse.json({ error: `Addon "${addonId}" is inactive` }, { status: 409 })
  }
  return null
}
