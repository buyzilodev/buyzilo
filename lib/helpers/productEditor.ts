import { prisma } from '@/lib/prisma'
import { parseProductMeta } from '@/lib/helpers/productMeta'
import { buildSelectionKey, normalizeProductOptions } from '@/lib/helpers/productVariants'
import { upsertWarehouseStockQuantity, ensureDefaultWarehouse } from '@/lib/helpers/warehouses'
import { getProductLicenseInventory, reconcileLicenseInventoryStock, saveProductLicenseInventory } from '@/lib/actions/licenseKeys'
import type { ProductEditorPayloadInput } from '@/lib/validators/product'

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export async function getProductEditorRecord(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      store: { select: { id: true, name: true, vendorId: true } },
      options: {
        include: {
          values: {
            orderBy: { position: 'asc' },
          },
        },
        orderBy: { position: 'asc' },
      },
      variants: {
        orderBy: [{ isDefault: 'desc' }, { position: 'asc' }],
      },
    },
  })

  if (!product) return null

  const metaRow = await prisma.siteSettings.findUnique({
    where: { key: `productMeta:${product.id}` },
    select: { value: true },
  })
  const meta = parseProductMeta(metaRow?.value)
  const metaStatus = (meta as { status?: 'ACTIVE' | 'DISABLED' | 'HIDDEN' }).status
  const licenseInventory = await getProductLicenseInventory(product.id)

  return {
    id: product.id,
    slug: product.slug,
    store: product.store,
    approval: {
      status: product.approvalStatus,
      note: product.approvalNote ?? null,
    },
    general: {
      name: product.name,
      categoryId: product.categoryId,
      price: product.price,
      comparePrice: product.comparePrice,
      stock: product.stock,
      description: product.description ?? '',
      shortDescription: meta.shortDescription ?? '',
      promoText: meta.promoText ?? '',
      productType: meta.catalog?.productType ?? 'PHYSICAL',
      listingType: meta.catalog?.listingType ?? 'FOR_SALE',
      detailsLanguage: meta.catalog?.detailsLanguage ?? 'English',
      unitQuantity: meta.unitPricing?.quantity ?? null,
      unitName: meta.unitPricing?.unit ?? '',
      status: metaStatus ?? (product.isActive ? 'ACTIVE' : 'DISABLED'),
      images: Array.isArray(product.images) ? product.images : [],
      videos: meta.videos ?? [],
    },
    seo: {
      seoName: meta.seo?.seoName ?? '',
      pageTitle: meta.seo?.pageTitle ?? '',
      metaDescription: meta.seo?.metaDescription ?? '',
      metaKeywords: meta.seo?.metaKeywords ?? '',
    },
    quantityDiscounts: meta.quantityDiscounts ?? [],
    attachments: meta.attachments ?? [],
    digitalDownloads: meta.digitalDownloads ?? [],
    addons: {
      outOfStockAction: meta.addons?.outOfStockAction ?? 'NONE',
      searchWords: meta.addons?.searchWords ?? '',
      popularity: meta.addons?.popularity ?? 0,
    },
    tags: meta.tags ?? [],
    requiredProducts: meta.requiredProducts ?? [],
    unitPricing: meta.unitPricing ?? null,
    customAttributes: meta.customAttributes ?? [],
    licenseKeys: licenseInventory.filter((row) => !row.assignedOrderId).map((row) => ({
      id: row.id,
      code: row.code,
      note: row.note ?? null,
      variantKey: row.variantKey ?? null,
      variantLabel: row.variantLabel ?? null,
      isActive: row.isActive,
    })),
    options: product.options.map((option) => ({
      name: option.name,
      values: option.values.map((value) => value.value),
    })),
    variants: product.variants.map((variant) => ({
      key: buildSelectionKey(variant.selectedOptions as Record<string, string>),
      title: variant.title,
      sku: variant.sku,
      price: variant.price,
      comparePrice: variant.comparePrice,
      stock: variant.stock,
      image: variant.image,
      isDefault: variant.isDefault,
      isActive: variant.isActive,
      selections: variant.selectedOptions as Record<string, string>,
    })),
  }
}

export async function ensureUniqueProductSlug(name: string, ignoreProductId?: string) {
  const baseSlug = slugify(name) || 'product'
  const existing = await prisma.product.findFirst({
    where: {
      slug: baseSlug,
      ...(ignoreProductId ? { id: { not: ignoreProductId } } : {}),
    },
    select: { id: true },
  })

  return existing ? `${baseSlug}-${Date.now()}` : baseSlug
}

export async function saveProductMeta(productId: string, body: ProductEditorPayloadInput) {
  await prisma.siteSettings.upsert({
    where: { key: `productMeta:${productId}` },
    update: {
      value: JSON.stringify({
        seo: body.seo,
        catalog: {
          productType: body.general.productType,
          listingType: body.general.listingType,
          detailsLanguage: body.general.detailsLanguage ?? 'English',
        },
        quantityDiscounts: body.quantityDiscounts,
        attachments: body.attachments ?? [],
        digitalDownloads: body.digitalDownloads ?? [],
        addons: body.addons,
        tags: body.tags,
        requiredProducts: body.requiredProducts ?? [],
        unitPricing: body.unitPricing ?? null,
        customAttributes: body.customAttributes ?? [],
        licenseKeys: body.licenseKeys ?? [],
        shortDescription: body.general.shortDescription ?? '',
        promoText: body.general.promoText ?? '',
        videos: body.general.videos ?? [],
        status: body.general.status,
      }),
    },
    create: {
      key: `productMeta:${productId}`,
      value: JSON.stringify({
        seo: body.seo,
        catalog: {
          productType: body.general.productType,
          listingType: body.general.listingType,
          detailsLanguage: body.general.detailsLanguage ?? 'English',
        },
        quantityDiscounts: body.quantityDiscounts,
        attachments: body.attachments ?? [],
        digitalDownloads: body.digitalDownloads ?? [],
        addons: body.addons,
        tags: body.tags,
        requiredProducts: body.requiredProducts ?? [],
        unitPricing: body.unitPricing ?? null,
        customAttributes: body.customAttributes ?? [],
        licenseKeys: body.licenseKeys ?? [],
        shortDescription: body.general.shortDescription ?? '',
        promoText: body.general.promoText ?? '',
        videos: body.general.videos ?? [],
        status: body.general.status,
      }),
    },
  })
}

export async function syncProductWarehouseInventory(productId: string, storeId: string) {
  const [warehouse, product] = await Promise.all([
    ensureDefaultWarehouse(storeId),
    prisma.product.findUnique({
      where: { id: productId },
      include: { variants: true },
    }),
  ])

  if (!product) return

  await upsertWarehouseStockQuantity({
    warehouseId: warehouse.id,
    productId: product.id,
    quantity: product.stock,
  })

  for (const variant of product.variants) {
    await upsertWarehouseStockQuantity({
      warehouseId: warehouse.id,
      productId: product.id,
      variantId: variant.id,
      quantity: variant.stock,
    })
  }
}

export async function syncProductLicenseCommerce(productId: string, body: ProductEditorPayloadInput) {
  await saveProductLicenseInventory(productId, body.licenseKeys ?? [])
  if (body.general.listingType === 'LICENSE_KEYS') {
    await reconcileLicenseInventoryStock(productId)
  }
}

export async function replaceProductOptions(productId: string, optionsInput: ProductEditorPayloadInput['options']) {
  await prisma.productOption.deleteMany({
    where: { productId },
  })

  const options = normalizeProductOptions(optionsInput)
  if (options.length === 0) return

  await prisma.product.update({
    where: { id: productId },
    data: {
      options: {
        create: options.map((option) => ({
          name: option.name,
          position: option.position,
          values: {
            create: option.values.map((value, index) => ({
              value,
              position: index,
            })),
          },
        })),
      },
    },
  })
}

export async function syncProductVariants(productId: string, variantsInput: ProductEditorPayloadInput['variants']) {
  const desiredVariants = (variantsInput ?? []).filter((variant) => Object.keys(variant.selections).length > 0)
  const existingVariants = await prisma.productVariant.findMany({
    where: { productId },
  })
  const existingByKey = new Map(
    existingVariants.map((variant) => [buildSelectionKey(variant.selectedOptions as Record<string, string>), variant]),
  )
  const desiredKeys = new Set(desiredVariants.map((variant) => variant.key))

  for (let index = 0; index < desiredVariants.length; index += 1) {
    const variant = desiredVariants[index]
    const existing = existingByKey.get(variant.key)
    const data = {
      title: variant.title,
      sku: variant.sku || null,
      price: variant.price ?? null,
      comparePrice: variant.comparePrice ?? null,
      stock: Number(variant.stock ?? 0),
      image: variant.image || null,
      isDefault: Boolean(variant.isDefault) || index === 0,
      isActive: variant.isActive !== false,
      position: index,
      selectedOptions: variant.selections,
    }

    if (existing) {
      await prisma.productVariant.update({
        where: { id: existing.id },
        data,
      })
    } else {
      await prisma.productVariant.create({
        data: {
          productId,
          ...data,
        },
      })
    }
  }

  for (const existing of existingVariants) {
    const key = buildSelectionKey(existing.selectedOptions as Record<string, string>)
    if (!desiredKeys.has(key)) {
      await prisma.productVariant.update({
        where: { id: existing.id },
        data: {
          isActive: false,
          stock: 0,
          isDefault: false,
        },
      })
    }
  }
}
