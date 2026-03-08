import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'
import { acceptVendorTerms, getVendorTermsStatus } from '@/lib/actions/vendorTerms'
import { getStoreLocatorMeta, setStoreLocatorMeta } from '@/lib/actions/storeLocator'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const store = await prisma.store.findUnique({
    where: { vendorId: (session.user as { id: string }).id },
  })
  if (!store) {
    return NextResponse.json(null)
  }
  const locator = await getStoreLocatorMeta(store.id)
  return NextResponse.json({ ...store, locator })
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = (session.user as { id: string }).id
  const existing = await prisma.store.findUnique({ where: { vendorId: userId } })
  if (existing) {
    return NextResponse.json({ error: 'Store already exists' }, { status: 400 })
  }

  const platformSettings = await prisma.siteSettings.findMany({
    where: { key: { in: ['allowVendorRegistration', 'autoApproveVendors', 'commissionRate'] } },
  })
  const map: Record<string, string> = {}
  platformSettings.forEach((s) => { map[s.key] = s.value })

  if (map.allowVendorRegistration === 'false') {
    return NextResponse.json({ error: 'Vendor registration is currently disabled' }, { status: 403 })
  }

  const body = await req.json() as { name: string; slug?: string; description?: string; acceptVendorTerms?: boolean; vendorTermsVersion?: string }
  const slug = (body.slug ?? body.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')) || 'store'
  const autoApproveVendors = map.autoApproveVendors === 'true'
  const commissionRate = Number(map.commissionRate)
  const vendorTermsStatus = await getVendorTermsStatus(userId)

  if (vendorTermsStatus.config.enabled) {
    const acceptedCurrent = vendorTermsStatus.acceptance?.version === vendorTermsStatus.config.version
    if (!acceptedCurrent) {
      if (!body.acceptVendorTerms || body.vendorTermsVersion !== vendorTermsStatus.config.version) {
        return NextResponse.json(
          { error: 'You must accept the current vendor terms before creating a store.' },
          { status: 400 }
        )
      }
      await acceptVendorTerms(userId, vendorTermsStatus.config.version)
    }
  }

  const store = await prisma.store.create({
    data: {
      vendorId: userId,
      name: body.name,
      slug: slug + '-' + userId.slice(-6),
      description: body.description ?? null,
      status: autoApproveVendors ? 'APPROVED' : 'PENDING',
      commissionRate: Number.isFinite(commissionRate) ? commissionRate : 10,
    },
  })
  await prisma.user.update({
    where: { id: userId },
    data: { role: 'VENDOR' },
  })
  return NextResponse.json(store)
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json() as {
    name?: string
    description?: string
    locator?: {
      addressLine1?: string
      addressLine2?: string
      city?: string
      state?: string
      postalCode?: string
      country?: string
      phone?: string
      email?: string
      latitude?: string
      longitude?: string
      hours?: string
    }
  }
  const store = await prisma.store.update({
    where: { vendorId: (session.user as { id: string }).id },
    data: { ...(body.name != null && { name: body.name }), ...(body.description !== undefined && { description: body.description }) },
  })
  if (body.locator) {
    await setStoreLocatorMeta(store.id, body.locator)
  }
  const locator = await getStoreLocatorMeta(store.id)
  return NextResponse.json({ ...store, locator })
}
