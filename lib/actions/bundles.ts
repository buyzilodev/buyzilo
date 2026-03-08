import { prisma } from '@/lib/prisma'

export type BundleQuoteLine = {
  productId: string
  variantId?: string
  quantity: number
  price: number
  name?: string
}

type BundleCandidate = {
  id: string
  title: string
  discountType: 'PERCENT' | 'FIXED'
  discountValue: number
  items: Array<{
    productId: string
    variantId?: string | null
    quantity: number
    product: { name: string; slug: string; images: string[] }
    variant?: { title: string; image?: string | null } | null
  }>
}

type MutableLine = BundleQuoteLine & {
  remaining: number
}

function lineMatches(
  line: MutableLine,
  item: { productId: string; variantId?: string | null }
) {
  return line.productId === item.productId && (item.variantId ? line.variantId === item.variantId : true)
}

function calculateBundleApplications(bundle: BundleCandidate, lines: MutableLine[]) {
  let applications = Number.POSITIVE_INFINITY

  for (const item of bundle.items) {
    const available = lines
      .filter((line) => lineMatches(line, item))
      .reduce((sum, line) => sum + line.remaining, 0)

    applications = Math.min(applications, Math.floor(available / item.quantity))
  }

  return Number.isFinite(applications) ? Math.max(0, applications) : 0
}

function consumeBundleLines(bundle: BundleCandidate, lines: MutableLine[], applications: number) {
  let bundleSubtotal = 0

  for (const item of bundle.items) {
    let needed = item.quantity * applications
    const matching = lines.filter((line) => lineMatches(line, item)).sort((a, b) => a.price - b.price)

    for (const line of matching) {
      if (needed <= 0) break
      const take = Math.min(line.remaining, needed)
      if (take > 0) {
        line.remaining -= take
        needed -= take
        bundleSubtotal += take * line.price
      }
    }
  }

  const savings =
    bundle.discountType === 'PERCENT'
      ? (bundleSubtotal * bundle.discountValue) / 100
      : bundle.discountValue * applications

  return {
    applications,
    subtotal: Number(bundleSubtotal.toFixed(2)),
    savings: Number(Math.min(savings, bundleSubtotal).toFixed(2)),
  }
}

export async function getActiveBundles() {
  return prisma.productBundle.findMany({
    where: { isActive: true },
    include: {
      items: {
        include: {
          product: true,
          variant: true,
        },
        orderBy: { position: 'asc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })
}

export async function quoteEligibleBundles(lines: BundleQuoteLine[]) {
  if (lines.length === 0) {
    return { bundles: [], discountAmount: 0 }
  }

  const bundles = await getActiveBundles()
  const mutableLines: MutableLine[] = lines.map((line) => ({ ...line, remaining: line.quantity }))

  const candidates = bundles
    .map((bundle) => ({
      id: bundle.id,
      title: bundle.title,
      discountType: bundle.discountType,
      discountValue: bundle.discountValue,
      items: bundle.items,
    }))
    .sort((a, b) => {
      const aBase = a.items.reduce((sum, item) => sum + item.quantity, 0)
      const bBase = b.items.reduce((sum, item) => sum + item.quantity, 0)
      return b.discountValue - a.discountValue || bBase - aBase
    })

  const applied = []
  let totalDiscount = 0

  for (const bundle of candidates) {
    const applications = calculateBundleApplications(bundle, mutableLines)
    if (applications < 1) continue
    const result = consumeBundleLines(bundle, mutableLines, applications)
    if (result.savings <= 0) continue
    totalDiscount += result.savings
    applied.push({
      bundleId: bundle.id,
      title: bundle.title,
      applications: result.applications,
      subtotal: result.subtotal,
      savings: result.savings,
      discountType: bundle.discountType,
      discountValue: bundle.discountValue,
      items: bundle.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        name: item.variant?.title ? `${item.product.name} (${item.variant.title})` : item.product.name,
        slug: item.product.slug,
        image: item.variant?.image ?? item.product.images?.[0] ?? null,
      })),
    })
  }

  return {
    bundles: applied,
    discountAmount: Number(totalDiscount.toFixed(2)),
  }
}

export async function getBundlesForProduct(productId: string) {
  const bundles = await prisma.productBundle.findMany({
    where: {
      isActive: true,
      items: {
        some: { productId },
      },
    },
    include: {
      items: {
        include: {
          product: true,
          variant: true,
        },
        orderBy: { position: 'asc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 6,
  })

  return bundles.map((bundle) => {
    const subtotal = bundle.items.reduce((sum, item) => {
      const price = item.variant?.price ?? item.product.price
      return sum + price * item.quantity
    }, 0)
    const savings =
      bundle.discountType === 'PERCENT'
        ? (subtotal * bundle.discountValue) / 100
        : bundle.discountValue

    return {
      id: bundle.id,
      title: bundle.title,
      description: bundle.description,
      discountType: bundle.discountType,
      discountValue: bundle.discountValue,
      subtotal: Number(subtotal.toFixed(2)),
      savings: Number(Math.min(savings, subtotal).toFixed(2)),
      total: Number(Math.max(0, subtotal - Math.min(savings, subtotal)).toFixed(2)),
      items: bundle.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        name: item.variant?.title ? `${item.product.name} (${item.variant.title})` : item.product.name,
        slug: item.product.slug,
        image: item.variant?.image ?? item.product.images?.[0] ?? null,
      })),
    }
  })
}
