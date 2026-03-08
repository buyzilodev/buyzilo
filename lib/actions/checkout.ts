import { prisma } from '@/lib/prisma'
import { assertRequiredProductsPresent } from '@/lib/actions/requiredProducts'
import { getAvailableSellableStock } from '@/lib/helpers/warehouses'
import { checkoutRequestSchema } from '@/lib/validators/checkout'

type CheckoutResolvedItem = {
  productId: string
  variantId?: string
  variantLabel?: string
  quantity: number
  name: string
  price: number
}

export async function resolveCheckoutItems(input: unknown, userId?: string): Promise<CheckoutResolvedItem[]> {
  const body = checkoutRequestSchema.parse(input)
  const items: CheckoutResolvedItem[] = []

  if (body.useCart && userId) {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: { items: { include: { product: true, variant: true } } },
    })

    if (cart?.items.length) {
      return cart.items.map((item) => ({
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        variantLabel: item.variant?.title ?? undefined,
        quantity: item.quantity,
        name: item.variant?.title ? `${item.product.name} (${item.variant.title})` : item.product.name,
        price: item.variant?.price ?? item.product.price,
      }))
    }
  }

  if (Array.isArray(body.items) && body.items.length > 0) {
    const productIds = [...new Set(body.items.map((item) => item.productId))]
    const variantIds = [...new Set(body.items.map((item) => item.variantId).filter(Boolean))] as string[]
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
        approvalStatus: 'APPROVED',
      },
      include: { variants: true },
    })
    const map = new Map(products.map((product) => [product.id, product]))
    const variantMap = new Map(
      products.flatMap((product) =>
        product.variants
          .filter((variant) => variantIds.length === 0 || variantIds.includes(variant.id))
          .map((variant) => [variant.id, { variant, product }] as const)
      )
    )

    for (const item of body.items) {
      const product = map.get(item.productId)
      if (!product) continue
      const variantEntry = item.variantId ? variantMap.get(item.variantId) : null
      if (item.variantId && (!variantEntry || variantEntry.product.id !== product.id || !variantEntry.variant.isActive)) {
        throw new Error(`Invalid variant for ${product.name}`)
      }
      const availableStock = await getAvailableSellableStock(product.id, variantEntry?.variant.id)
      if (availableStock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`)
      }
      items.push({
        productId: product.id,
        variantId: variantEntry?.variant.id,
        variantLabel: variantEntry?.variant.title,
        quantity: item.quantity,
        name: variantEntry?.variant.title ? `${product.name} (${variantEntry.variant.title})` : product.name,
        price: variantEntry?.variant.price ?? product.price,
      })
    }
  }

  if (Array.isArray(body.lineItems) && body.lineItems.length > 0) {
    body.lineItems.forEach((item) => {
      items.push({
        productId: item.productId ?? '',
        variantId: item.variantId,
        variantLabel: item.variantLabel,
        quantity: item.quantity,
        name: item.name,
        price: item.price,
      })
    })
  }

  await assertRequiredProductsPresent(items.map((item) => item.productId).filter(Boolean))

  return items
}
