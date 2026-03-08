import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAnyAdminApiPermission, requireAdminApiPermission } from '@/lib/admin/api'
import { createModerationNotification } from '@/lib/actions/messages'
import { getProductMetaMap } from '@/lib/helpers/productMeta'
import { getProductCatalogSignals } from '@/lib/helpers/productCatalogSignals'

export async function GET() {
  try {
    const access = await requireAnyAdminApiPermission(['manage_products', 'approve_products'])
    if (!access.ok) {
      return access.response
    }

    const products = await prisma.product.findMany({
      include: {
        store: {
          select: { name: true }
        },
        category: {
          select: { name: true }
        },
        variants: {
          where: { isActive: true },
          select: { id: true, title: true }
        },
      },
      orderBy: { createdAt: 'desc' }
    })
    const metaMap = await getProductMetaMap(products.map((product) => product.id))
    const signalMap = await getProductCatalogSignals(products, metaMap)
    return NextResponse.json(products.map((product) => {
      const meta = metaMap.get(product.id)
      const signals = signalMap.get(product.id)
      return {
        ...product,
        productType: meta?.catalog?.productType ?? 'PHYSICAL',
        listingType: meta?.catalog?.listingType ?? 'FOR_SALE',
        detailsLanguage: meta?.catalog?.detailsLanguage ?? 'English',
        quoteRequestCount: signals?.quoteRequestCount ?? 0,
        openQuoteRequestCount: signals?.openQuoteRequestCount ?? 0,
        availableLicenseKeys: signals?.availableLicenseKeys ?? 0,
        digitalDownloadCount: signals?.digitalDownloadCount ?? 0,
        variantCount: signals?.variantCount ?? product.variants.length,
        riskFlags: signals?.riskFlags ?? [],
      }
    }))
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const access = await requireAdminApiPermission('approve_products')
    if (!access.ok) {
      return access.response
    }
    const actorId = access.identity.id

    const { id, approvalStatus, approvalNote } = await req.json()
    const current = await prisma.product.findUnique({
      where: { id },
      include: {
        store: {
          select: {
            name: true,
            vendor: { select: { id: true } },
          },
        },
      },
    })
    if (!current) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        approvalStatus,
        approvalNote,
        isActive: approvalStatus === 'APPROVED'
      }
    })
    await prisma.activityLog.create({
      data: {
        actorId,
        action: 'product.approval.updated',
        entityType: 'Product',
        entityId: product.id,
        payload: {
          previousStatus: current.approvalStatus,
          nextStatus: approvalStatus,
          approvalNote: approvalNote ?? null,
        },
      },
    })
    await createModerationNotification({
      vendorUserId: current.store.vendor.id,
      actorId,
      subject: `Product review update: ${current.name}`,
      body: `Your product "${current.name}" in store "${current.store.name}" is now ${approvalStatus}.${approvalNote ? ` Note: ${approvalNote}` : ''}`,
      category: 'PRODUCT_REVIEW',
    })

    return NextResponse.json({ success: true, product })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  try {
    const access = await requireAnyAdminApiPermission(['manage_products', 'approve_products'])
    if (!access.ok) {
      return access.response
    }

    const body = await req.json() as {
      ids?: string[]
      action?: 'APPROVE' | 'REJECT' | 'DISABLE' | 'ACTIVATE'
      approvalNote?: string
    }

    const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : []
    if (ids.length === 0 || !body.action) {
      return NextResponse.json({ error: 'Invalid bulk action' }, { status: 400 })
    }

    const nextData =
      body.action === 'APPROVE'
        ? { approvalStatus: 'APPROVED', isActive: true, approvalNote: body.approvalNote ?? null }
        : body.action === 'REJECT'
          ? { approvalStatus: 'REJECTED', isActive: false, approvalNote: body.approvalNote ?? null }
          : body.action === 'ACTIVATE'
            ? { isActive: true }
            : { isActive: false }

    const result = await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: nextData,
    })

    return NextResponse.json({ success: true, count: result.count })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
