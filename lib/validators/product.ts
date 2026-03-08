import { z } from 'zod'

export const productListQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  tag: z.string().optional(),
  sort: z.enum(['default', 'price-low', 'price-high', 'newest']).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  inStock: z
    .union([z.literal('true'), z.literal('false')])
    .transform((value) => value === 'true')
    .optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
})

export type ProductListQueryInput = z.infer<typeof productListQuerySchema>

export const productOptionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  values: z.array(z.string().trim().min(1).max(80)).min(1).max(30),
})

export const productAttributeValueSchema = z.object({
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(120),
  image: z.string().trim().max(500).optional().nullable(),
})

export const productAttributeSchema = z.object({
  name: z.string().trim().min(1).max(80),
  displayType: z.enum(['TEXT', 'IMAGE', 'COLOR']).default('TEXT'),
  values: z.array(productAttributeValueSchema).min(1).max(40),
})

export const productLicenseKeySchema = z.object({
  id: z.string().trim().max(80).optional(),
  code: z.string().trim().min(1).max(500),
  note: z.string().trim().max(500).optional().nullable(),
  variantKey: z.string().trim().max(500).optional().nullable(),
  variantLabel: z.string().trim().max(180).optional().nullable(),
  isActive: z.boolean().optional(),
})

export const productDigitalDownloadSchema = z.object({
  name: z.string().trim().min(1).max(180),
  url: z.string().trim().min(1).max(500),
  note: z.string().trim().max(500).optional().nullable(),
})

export const productVariantSchema = z.object({
  key: z.string().trim().min(1).max(500),
  title: z.string().trim().min(1).max(180),
  sku: z.string().trim().max(80).optional().nullable(),
  price: z.number().nonnegative().optional().nullable(),
  comparePrice: z.number().nonnegative().optional().nullable(),
  stock: z.number().int().min(0).max(999999),
  image: z.string().trim().max(500).optional().nullable(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  selections: z.record(z.string(), z.string()),
})

export const productEditorPayloadSchema = z.object({
  general: z.object({
    name: z.string().trim().min(1).max(180),
    categoryId: z.string().trim().min(1),
    price: z.number().nonnegative(),
    comparePrice: z.number().nonnegative().nullable().optional(),
    stock: z.number().int().min(0).max(999999).optional(),
    description: z.string().optional(),
    shortDescription: z.string().optional(),
    promoText: z.string().optional(),
    productType: z.enum(['PHYSICAL', 'DIGITAL']).default('PHYSICAL'),
    listingType: z.enum(['FOR_SALE', 'ORDINARY', 'QUOTE_REQUEST', 'LICENSE_KEYS']).default('FOR_SALE'),
    detailsLanguage: z.string().trim().max(32).optional(),
    status: z.enum(['ACTIVE', 'DISABLED', 'HIDDEN']),
    images: z.array(z.string()).optional(),
    videos: z.array(z.object({ url: z.string(), host: z.string() })).optional(),
  }),
  seo: z.object({
    seoName: z.string().optional(),
    pageTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    metaKeywords: z.string().optional(),
  }),
  quantityDiscounts: z.array(
    z.object({
      quantity: z.number().int().min(0),
      value: z.number().nonnegative(),
      type: z.enum(['ABSOLUTE', 'PERCENT']),
      userGroup: z.string(),
    })
  ),
  attachments: z.array(
    z.object({
      name: z.string().trim().min(1).max(180),
      url: z.string().trim().min(1).max(500),
    })
  ).optional(),
  addons: z.object({
    outOfStockAction: z.string().optional(),
    searchWords: z.string().optional(),
    popularity: z.number().optional(),
  }),
  tags: z.array(z.string()),
  requiredProducts: z.array(z.string()).optional(),
  unitPricing: z.object({
    quantity: z.number().positive(),
    unit: z.string().trim().min(1).max(32),
  }).optional(),
  customAttributes: z.array(productAttributeSchema).optional(),
  licenseKeys: z.array(productLicenseKeySchema).optional(),
  digitalDownloads: z.array(productDigitalDownloadSchema).optional(),
  options: z.array(productOptionSchema).optional(),
  variants: z.array(productVariantSchema).optional(),
})

export type ProductEditorPayloadInput = z.infer<typeof productEditorPayloadSchema>
