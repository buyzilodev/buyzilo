import { prisma } from '@/lib/prisma'
import { getRequiredProductIdsMap } from '@/lib/helpers/productMeta'

export type RequiredProductSummary = {
  id: string
  name: string
  slug: string
  price: number
  images: string[]
  hasVariants: boolean
  store?: {
    name: string
    slug: string
  }
}

export async function getRequiredProductsMap(productIds: string[]) {
  const requiredIdsMap = await getRequiredProductIdsMap(productIds)
  const allRequiredIds = Array.from(new Set(Array.from(requiredIdsMap.values()).flat()))

  if (allRequiredIds.length === 0) {
    return new Map<string, RequiredProductSummary[]>()
  }

  const requiredProducts = await prisma.product.findMany({
    where: {
      id: { in: allRequiredIds },
      isActive: true,
      approvalStatus: 'APPROVED',
      store: { status: 'APPROVED' },
    },
    include: {
      store: { select: { name: true, slug: true } },
      variants: {
        where: { isActive: true },
        select: { id: true },
      },
    },
  })

  const summaryMap = new Map<string, RequiredProductSummary>(
    requiredProducts.map((product) => [
      product.id,
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        images: product.images,
        hasVariants: product.variants.length > 0,
        store: product.store,
      },
    ])
  )

  return new Map(
    productIds.map((productId) => [
      productId,
      (requiredIdsMap.get(productId) ?? [])
        .map((requiredId) => summaryMap.get(requiredId))
        .filter(Boolean) as RequiredProductSummary[],
    ])
  )
}

export async function getMissingRequiredProductsMap(productIds: string[]) {
  const requiredProductsMap = await getRequiredProductsMap(productIds)
  const present = new Set(productIds)

  return new Map(
    productIds.map((productId) => [
      productId,
      (requiredProductsMap.get(productId) ?? []).filter((item) => !present.has(item.id)),
    ])
  )
}

export async function assertRequiredProductsPresent(productIds: string[]) {
  const uniqueProductIds = Array.from(new Set(productIds.filter(Boolean)))
  const missingMap = await getMissingRequiredProductsMap(productIds)
  const missingByProduct = Array.from(missingMap.entries()).filter(([, items]) => items.length > 0)

  if (missingByProduct.length === 0) {
    return
  }

  const products = await prisma.product.findMany({
    where: { id: { in: uniqueProductIds } },
    select: { id: true, name: true },
  })
  const productNameMap = new Map(products.map((product) => [product.id, product.name]))

  const messages = missingByProduct.map(([productId, items]) => {
    return `${productNameMap.get(productId) ?? productId}: ${items.map((item) => item.name).join(', ')}`
  })

  throw new Error(`Required products missing from cart: ${messages.join(' | ')}`)
}
