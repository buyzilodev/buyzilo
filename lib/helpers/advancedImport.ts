import { prisma } from '@/lib/prisma'
import { getVendorCategoryFeeConfig } from '@/lib/actions/vendorCategoryFees'
import { seedWarehouseInventoryFromProduct } from '@/lib/helpers/warehouses'

type ImportMode = 'categories' | 'products' | 'shopify'

type ParsedCsvRow = {
  rowNumber: number
  values: Record<string, string>
}

type ImportRowResult = {
  rowNumber: number
  action: 'create' | 'update' | 'skip'
  identifier: string
  errors: string[]
  warnings: string[]
}

type ImportSummary = {
  mode: ImportMode
  totalRows: number
  canImport: boolean
  created: number
  updated: number
  skipped: number
  rows: ImportRowResult[]
}

type CategoryImportPreview = ImportSummary
type ProductImportPreview = ImportSummary
type ShopifyImportPreview = ImportSummary

type ProductStatus = 'ACTIVE' | 'DISABLED' | 'HIDDEN'

const PRODUCT_STATUS_MAP: Record<ProductStatus, { isActive: boolean; approvalStatus: string }> = {
  ACTIVE: { isActive: true, approvalStatus: 'APPROVED' },
  DISABLED: { isActive: false, approvalStatus: 'APPROVED' },
  HIDDEN: { isActive: false, approvalStatus: 'PENDING' },
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function splitList(value: string) {
  return value
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return null
  const next = Number(value)
  return Number.isFinite(next) ? next : Number.NaN
}

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function splitCommaList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function toProductStatus(value: string, publishedValue?: string): ProductStatus {
  const normalized = value.trim().toUpperCase()
  if (normalized === 'ACTIVE' || normalized === 'DISABLED' || normalized === 'HIDDEN') {
    return normalized
  }
  if (normalized === 'ARCHIVED' || normalized === 'DRAFT') {
    return 'HIDDEN'
  }
  if (publishedValue?.trim().toUpperCase() === 'FALSE') {
    return 'DISABLED'
  }
  return 'ACTIVE'
}

type ShopifyGroupedProduct = {
  rowNumber: number
  identifier: string
  title: string
  handle: string
  bodyHtml: string
  vendor: string
  categoryLabel: string
  tags: string[]
  status: ProductStatus
  images: string[]
  shortDescription: string
  variants: Array<{
    sku?: string | null
    title: string
    price?: number | null
    comparePrice?: number | null
    stock: number
    image?: string | null
    selections: Record<string, string>
  }>
  options: Array<{ name: string; values: string[] }>
}

function groupShopifyRows(rows: ParsedCsvRow[]) {
  const grouped = new Map<string, ShopifyGroupedProduct>()

  for (const row of rows) {
    const title = row.values.Title?.trim() || row.values.title?.trim() || ''
    const handle = (row.values.Handle?.trim() || row.values.handle?.trim() || slugify(title)).toLowerCase()
    const bodyHtml = row.values['Body (HTML)']?.trim() || row.values.bodyHtml?.trim() || ''
    const vendor = row.values.Vendor?.trim() || row.values.vendor?.trim() || ''
    const categoryLabel =
      row.values['Product Category']?.trim() ||
      row.values.Type?.trim() ||
      row.values.type?.trim() ||
      'Shopify Imports'
    const tags = splitCommaList(row.values.Tags?.trim() || row.values.tags?.trim() || '')
    const status = toProductStatus(row.values.Status?.trim() || '', row.values.Published?.trim())
    const optionPairs = [
      {
        name: row.values['Option1 Name']?.trim() || '',
        value: row.values['Option1 Value']?.trim() || '',
      },
      {
        name: row.values['Option2 Name']?.trim() || '',
        value: row.values['Option2 Value']?.trim() || '',
      },
      {
        name: row.values['Option3 Name']?.trim() || '',
        value: row.values['Option3 Value']?.trim() || '',
      },
    ].filter((entry) => entry.name && entry.value && entry.value.toLowerCase() !== 'default title')

    const selections = Object.fromEntries(optionPairs.map((entry) => [entry.name, entry.value]))
    const variantPrice = parseOptionalNumber(row.values['Variant Price']?.trim() || row.values.price?.trim() || '')
    const variantCompare = parseOptionalNumber(row.values['Variant Compare At Price']?.trim() || '')
    const variantStock = row.values['Variant Inventory Qty']?.trim() ? Number(row.values['Variant Inventory Qty']) : 0
    const variantImage = row.values['Variant Image']?.trim() || row.values['Image Src']?.trim() || ''
    const variantTitle =
      row.values['Variant Title']?.trim() ||
      (optionPairs.length > 0 ? optionPairs.map((entry) => `${entry.name}: ${entry.value}`).join(' / ') : 'Default')

    if (!grouped.has(handle)) {
      grouped.set(handle, {
        rowNumber: row.rowNumber,
        identifier: handle || title || `row-${row.rowNumber}`,
        title,
        handle,
        bodyHtml,
        vendor,
        categoryLabel,
        tags,
        status,
        images: [],
        shortDescription: stripHtml(bodyHtml).slice(0, 180),
        variants: [],
        options: [],
      })
    }

    const current = grouped.get(handle)!
    current.title ||= title
    current.bodyHtml ||= bodyHtml
    current.vendor ||= vendor
    current.categoryLabel ||= categoryLabel
    current.status = current.status === 'ACTIVE' ? status : current.status
    current.tags = Array.from(new Set([...current.tags, ...tags]))

    const imageCandidates = [row.values['Image Src']?.trim(), row.values['Variant Image']?.trim()].filter(Boolean) as string[]
    current.images = Array.from(new Set([...current.images, ...imageCandidates]))

    optionPairs.forEach((entry) => {
      const existingOption = current.options.find((option) => option.name === entry.name)
      if (existingOption) {
        if (!existingOption.values.includes(entry.value)) {
          existingOption.values.push(entry.value)
        }
        return
      }
      current.options.push({ name: entry.name, values: [entry.value] })
    })

    current.variants.push({
      sku: row.values['Variant SKU']?.trim() || null,
      title: variantTitle,
      price: variantPrice == null || Number.isNaN(variantPrice) ? null : variantPrice,
      comparePrice: variantCompare == null || Number.isNaN(variantCompare) ? null : variantCompare,
      stock: Number.isFinite(variantStock) && variantStock >= 0 ? variantStock : 0,
      image: variantImage || null,
      selections,
    })
  }

  return Array.from(grouped.values())
}

function parseCsvLine(line: string) {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
      continue
    }

    current += char
  }

  result.push(current.trim())
  return result
}

export function parseCsvText(csvText: string) {
  const normalized = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!normalized) {
    return { headers: [] as string[], rows: [] as ParsedCsvRow[] }
  }

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return { headers: [] as string[], rows: [] as ParsedCsvRow[] }
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim())
  const rows = lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line)
    const rowRecord: Record<string, string> = {}
    headers.forEach((header, headerIndex) => {
      rowRecord[header] = values[headerIndex] ?? ''
    })
    return {
      rowNumber: index + 2,
      values: rowRecord,
    }
  })

  return { headers, rows }
}

async function getOrCreateAdminStore() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } })
  if (!admin) {
    throw new Error('No admin user found')
  }

  const existing = await prisma.store.findUnique({ where: { vendorId: admin.id } })
  if (existing) {
    return existing
  }

  return prisma.store.create({
    data: {
      vendorId: admin.id,
      name: 'Admin Store',
      slug: `admin-store-${Date.now()}`,
      description: 'Official admin store',
      status: 'APPROVED',
    },
  })
}

async function previewCategoryImport(rows: ParsedCsvRow[]): Promise<CategoryImportPreview> {
  const existingCategories = await prisma.category.findMany({
    select: { id: true, slug: true, name: true, parentId: true },
  })
  const existingBySlug = new Map(existingCategories.map((category) => [category.slug.toLowerCase(), category]))
  const feeConfig = await getVendorCategoryFeeConfig()
  const feeMap = new Map(feeConfig.map((entry) => [entry.categoryId, entry.feePercent]))

  const rowResults = rows.map((row) => {
    const errors: string[] = []
    const warnings: string[] = []
    const name = row.values.name?.trim() ?? ''
    const slug = (row.values.slug?.trim() || slugify(name)).toLowerCase()
    const parentSlug = row.values.parentSlug?.trim().toLowerCase() ?? ''
    const feePercent = row.values.feePercent?.trim() ?? ''

    if (!name) errors.push('name is required')
    if (!slug) errors.push('slug is required')
    if (parentSlug && !existingBySlug.has(parentSlug) && !rows.some((candidate) => (candidate.values.slug?.trim() || slugify(candidate.values.name || '')).toLowerCase() === parentSlug)) {
      warnings.push('parentSlug will only resolve if that category is also in the import batch')
    }
    if (feePercent && Number.isNaN(Number(feePercent))) {
      errors.push('feePercent must be numeric')
    }

    const existing = existingBySlug.get(slug)
    return {
      rowNumber: row.rowNumber,
      action: (errors.length > 0 ? 'skip' : existing ? 'update' : 'create') as 'create' | 'update' | 'skip',
      identifier: slug || name || `row-${row.rowNumber}`,
      errors,
      warnings: existing ? [...warnings, `existing fee ${feeMap.get(existing.id) ?? 0}% will be replaced`] : warnings,
    }
  })

  return {
    mode: 'categories',
    totalRows: rows.length,
    canImport: rowResults.every((row) => row.errors.length === 0),
    created: rowResults.filter((row) => row.action === 'create').length,
    updated: rowResults.filter((row) => row.action === 'update').length,
    skipped: rowResults.filter((row) => row.action === 'skip').length,
    rows: rowResults,
  }
}

async function commitCategoryImport(rows: ParsedCsvRow[]): Promise<CategoryImportPreview> {
  const preview = await previewCategoryImport(rows)
  if (!preview.canImport) {
    return preview
  }

  const existingCategories = await prisma.category.findMany({
    select: { id: true, slug: true },
  })
  const existingBySlug = new Map(existingCategories.map((category) => [category.slug.toLowerCase(), category]))
  const feeConfig = await getVendorCategoryFeeConfig()
  const feeMap = new Map(feeConfig.map((entry) => [entry.categoryId, entry.feePercent]))

  for (const row of rows) {
    const name = row.values.name?.trim() ?? ''
    const slug = (row.values.slug?.trim() || slugify(name)).toLowerCase()
    const image = row.values.image?.trim() || null
    const parentSlug = row.values.parentSlug?.trim().toLowerCase() || null
    const feePercent = Number(row.values.feePercent?.trim() || 0)

    const parentId = parentSlug ? existingBySlug.get(parentSlug)?.id ?? null : null
    const existing = existingBySlug.get(slug)

    const category = existing
      ? await prisma.category.update({
          where: { id: existing.id },
          data: { name, slug, image, parentId },
        })
      : await prisma.category.create({
          data: { name, slug, image, parentId },
        })

    existingBySlug.set(slug, { id: category.id, slug: category.slug })
    feeMap.set(category.id, feePercent)
  }

  const nextFeeConfig = Array.from(feeMap.entries()).map(([categoryId, feePercent]) => ({ categoryId, feePercent }))
  await prisma.siteSettings.upsert({
    where: { key: 'vendorCategoryFeeConfig' },
    update: { value: JSON.stringify(nextFeeConfig) },
    create: { key: 'vendorCategoryFeeConfig', value: JSON.stringify(nextFeeConfig) },
  })

  return preview
}

async function previewProductImport(rows: ParsedCsvRow[]): Promise<ProductImportPreview> {
  const [categories, stores, products] = await Promise.all([
    prisma.category.findMany({ select: { id: true, slug: true, name: true } }),
    prisma.store.findMany({ select: { id: true, slug: true, name: true, status: true } }),
    prisma.product.findMany({ select: { id: true, slug: true, name: true } }),
  ])

  const categoriesBySlug = new Map(categories.map((category) => [category.slug.toLowerCase(), category]))
  const storesBySlug = new Map(stores.map((store) => [store.slug.toLowerCase(), store]))
  const productsBySlug = new Map(products.map((product) => [product.slug.toLowerCase(), product]))

  const rowResults = rows.map((row) => {
    const errors: string[] = []
    const warnings: string[] = []
    const name = row.values.name?.trim() ?? ''
    const slug = (row.values.slug?.trim() || slugify(name)).toLowerCase()
    const categorySlug = row.values.categorySlug?.trim().toLowerCase() ?? ''
    const storeSlug = row.values.storeSlug?.trim().toLowerCase() ?? ''
    const price = row.values.price?.trim() ?? ''
    const stock = row.values.stock?.trim() ?? ''
    const comparePrice = row.values.comparePrice?.trim() ?? ''
    const status = (row.values.status?.trim().toUpperCase() || 'ACTIVE') as ProductStatus

    if (!name) errors.push('name is required')
    if (!slug) errors.push('slug is required')
    if (!categorySlug) errors.push('categorySlug is required')
    if (categorySlug && !categoriesBySlug.has(categorySlug)) errors.push(`unknown categorySlug: ${categorySlug}`)
    if (storeSlug && !storesBySlug.has(storeSlug)) errors.push(`unknown storeSlug: ${storeSlug}`)
    if (!price || Number.isNaN(Number(price)) || Number(price) <= 0) errors.push('price must be a positive number')
    if (stock && (!Number.isInteger(Number(stock)) || Number(stock) < 0)) errors.push('stock must be a non-negative integer')
    if (comparePrice && Number.isNaN(Number(comparePrice))) errors.push('comparePrice must be numeric')
    if (!['ACTIVE', 'DISABLED', 'HIDDEN'].includes(status)) errors.push('status must be ACTIVE, DISABLED, or HIDDEN')
    if (!storeSlug) warnings.push('storeSlug not provided, admin store will be used')

    const existing = productsBySlug.get(slug)
    return {
      rowNumber: row.rowNumber,
      action: (errors.length > 0 ? 'skip' : existing ? 'update' : 'create') as 'create' | 'update' | 'skip',
      identifier: slug || name || `row-${row.rowNumber}`,
      errors,
      warnings,
    }
  })

  return {
    mode: 'products',
    totalRows: rows.length,
    canImport: rowResults.every((row) => row.errors.length === 0),
    created: rowResults.filter((row) => row.action === 'create').length,
    updated: rowResults.filter((row) => row.action === 'update').length,
    skipped: rowResults.filter((row) => row.action === 'skip').length,
    rows: rowResults,
  }
}

async function commitProductImport(rows: ParsedCsvRow[]): Promise<ProductImportPreview> {
  const preview = await previewProductImport(rows)
  if (!preview.canImport) {
    return preview
  }

  const [categories, stores, products, adminStore] = await Promise.all([
    prisma.category.findMany({ select: { id: true, slug: true } }),
    prisma.store.findMany({ select: { id: true, slug: true } }),
    prisma.product.findMany({ select: { id: true, slug: true } }),
    getOrCreateAdminStore(),
  ])

  const categoriesBySlug = new Map(categories.map((category) => [category.slug.toLowerCase(), category]))
  const storesBySlug = new Map(stores.map((store) => [store.slug.toLowerCase(), store]))
  const productsBySlug = new Map(products.map((product) => [product.slug.toLowerCase(), product]))

  for (const row of rows) {
    const name = row.values.name?.trim() ?? ''
    const slug = (row.values.slug?.trim() || slugify(name)).toLowerCase()
    const category = categoriesBySlug.get((row.values.categorySlug?.trim() || '').toLowerCase())
    const store = storesBySlug.get((row.values.storeSlug?.trim() || '').toLowerCase()) ?? adminStore
    const price = Number(row.values.price)
    const comparePrice = parseOptionalNumber(row.values.comparePrice?.trim() ?? '')
    const stock = row.values.stock?.trim() ? Number(row.values.stock) : 0
    const status = (row.values.status?.trim().toUpperCase() || 'ACTIVE') as ProductStatus
    const statusConfig = PRODUCT_STATUS_MAP[status]
    const images = splitList(row.values.images?.trim() ?? '')
    const tags = splitList(row.values.tags?.trim() ?? '')

    const productData = {
      storeId: store.id,
      categoryId: category!.id,
      name,
      slug,
      description: row.values.description?.trim() || '',
      price,
      comparePrice: comparePrice == null || Number.isNaN(comparePrice) ? null : comparePrice,
      stock,
      images,
      isActive: statusConfig.isActive,
      approvalStatus: statusConfig.approvalStatus,
    }

    const existing = productsBySlug.get(slug)
    const product = existing
      ? await prisma.product.update({
          where: { id: existing.id },
          data: productData,
        })
      : await prisma.product.create({
          data: productData,
        })

    productsBySlug.set(slug, { id: product.id, slug: product.slug })

    await prisma.siteSettings.upsert({
      where: { key: `productMeta:${product.id}` },
      update: {
        value: JSON.stringify({
          seo: {},
          quantityDiscounts: [],
          attachments: [],
          addons: {},
          tags,
          requiredProducts: [],
          unitPricing: null,
          shortDescription: row.values.shortDescription?.trim() || '',
          promoText: row.values.promoText?.trim() || '',
          videos: [],
          status,
        }),
      },
      create: {
        key: `productMeta:${product.id}`,
        value: JSON.stringify({
          seo: {},
          quantityDiscounts: [],
          attachments: [],
          addons: {},
          tags,
          requiredProducts: [],
          unitPricing: null,
          shortDescription: row.values.shortDescription?.trim() || '',
          promoText: row.values.promoText?.trim() || '',
          videos: [],
          status,
        }),
      },
    })
    await seedWarehouseInventoryFromProduct(product.id, store.id)
  }

  return preview
}

async function previewShopifyImport(rows: ParsedCsvRow[]): Promise<ShopifyImportPreview> {
  const [stores, products] = await Promise.all([
    prisma.store.findMany({ select: { id: true, slug: true, name: true } }),
    prisma.product.findMany({ select: { id: true, slug: true } }),
  ])

  const storesBySlug = new Map(stores.map((store) => [store.slug.toLowerCase(), store]))
  const productsBySlug = new Map(products.map((product) => [product.slug.toLowerCase(), product]))
  const grouped = groupShopifyRows(rows)

  const rowResults = grouped.map((product) => {
    const errors: string[] = []
    const warnings: string[] = []
    const vendorSlug = slugify(product.vendor || '')

    if (!product.title) errors.push('Title is required')
    if (!product.handle) errors.push('Handle is required')
    if (product.variants.length === 0) warnings.push('No variants detected, importer will create a default product row')
    if (product.options.length === 0) warnings.push('No option columns found, product will import without variations')
    if (vendorSlug && !storesBySlug.has(vendorSlug)) warnings.push(`vendor "${product.vendor}" not matched to a store, admin store will be used`)
    if (!product.categoryLabel) warnings.push('No Shopify product type/category found, fallback category will be created')

    const existing = productsBySlug.get(product.handle)
    return {
      rowNumber: product.rowNumber,
      action: (errors.length > 0 ? 'skip' : existing ? 'update' : 'create') as 'create' | 'update' | 'skip',
      identifier: product.identifier,
      errors,
      warnings,
    }
  })

  return {
    mode: 'shopify',
    totalRows: grouped.length,
    canImport: rowResults.every((row) => row.errors.length === 0),
    created: rowResults.filter((row) => row.action === 'create').length,
    updated: rowResults.filter((row) => row.action === 'update').length,
    skipped: rowResults.filter((row) => row.action === 'skip').length,
    rows: rowResults,
  }
}

async function commitShopifyImport(rows: ParsedCsvRow[]): Promise<ShopifyImportPreview> {
  const preview = await previewShopifyImport(rows)
  if (!preview.canImport) {
    return preview
  }

  const [stores, products, categories, adminStore] = await Promise.all([
    prisma.store.findMany({ select: { id: true, slug: true, name: true } }),
    prisma.product.findMany({ select: { id: true, slug: true } }),
    prisma.category.findMany({ select: { id: true, slug: true, name: true } }),
    getOrCreateAdminStore(),
  ])

  const storesBySlug = new Map(stores.map((store) => [store.slug.toLowerCase(), store]))
  const productsBySlug = new Map(products.map((product) => [product.slug.toLowerCase(), product]))
  const categoriesBySlug = new Map(categories.map((category) => [category.slug.toLowerCase(), category]))
  const grouped = groupShopifyRows(rows)

  for (const groupedProduct of grouped) {
    const vendorSlug = slugify(groupedProduct.vendor || '')
    const store = storesBySlug.get(vendorSlug) ?? adminStore
    const categorySlug = slugify(groupedProduct.categoryLabel || 'shopify-imports')
    let category = categoriesBySlug.get(categorySlug)
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: groupedProduct.categoryLabel || 'Shopify Imports',
          slug: categorySlug || `shopify-imports-${Date.now()}`,
          image: null,
        },
      })
      categoriesBySlug.set(category.slug.toLowerCase(), category)
    }

    const defaultVariantPrice = groupedProduct.variants.find((variant) => variant.price != null)?.price ?? 0
    const defaultComparePrice = groupedProduct.variants.find((variant) => variant.comparePrice != null)?.comparePrice ?? null
    const defaultStock = groupedProduct.variants.reduce((sum, variant) => sum + variant.stock, 0)
    const statusConfig = PRODUCT_STATUS_MAP[groupedProduct.status]
    const existing = productsBySlug.get(groupedProduct.handle)

    const product = existing
      ? await prisma.product.update({
          where: { id: existing.id },
          data: {
            storeId: store.id,
            categoryId: category.id,
            name: groupedProduct.title,
            slug: groupedProduct.handle,
            description: groupedProduct.bodyHtml,
            price: defaultVariantPrice,
            comparePrice: defaultComparePrice,
            stock: defaultStock,
            images: groupedProduct.images,
            isActive: statusConfig.isActive,
            approvalStatus: statusConfig.approvalStatus,
            options: { deleteMany: {} },
            variants: { deleteMany: {} },
          },
        })
      : await prisma.product.create({
          data: {
            storeId: store.id,
            categoryId: category.id,
            name: groupedProduct.title,
            slug: groupedProduct.handle,
            description: groupedProduct.bodyHtml,
            price: defaultVariantPrice,
            comparePrice: defaultComparePrice,
            stock: defaultStock,
            images: groupedProduct.images,
            isActive: statusConfig.isActive,
            approvalStatus: statusConfig.approvalStatus,
          },
        })

    productsBySlug.set(product.slug.toLowerCase(), { id: product.id, slug: product.slug })

    if (groupedProduct.options.length > 0) {
      await prisma.product.update({
        where: { id: product.id },
        data: {
          options: {
            create: groupedProduct.options.map((option, optionIndex) => ({
              name: option.name,
              position: optionIndex,
              values: {
                create: option.values.map((value, valueIndex) => ({
                  value,
                  position: valueIndex,
                })),
              },
            })),
          },
          variants: {
            create: groupedProduct.variants.map((variant, index) => ({
              title: variant.title,
              sku: variant.sku || null,
              price: variant.price ?? null,
              comparePrice: variant.comparePrice ?? null,
              stock: variant.stock,
              image: variant.image || null,
              isDefault: index === 0,
              isActive: true,
              position: index,
              selectedOptions: variant.selections,
            })),
          },
        },
      })
    }

    await prisma.siteSettings.upsert({
      where: { key: `productMeta:${product.id}` },
      update: {
        value: JSON.stringify({
          seo: {},
          quantityDiscounts: [],
          attachments: [],
          addons: {},
          tags: groupedProduct.tags,
          requiredProducts: [],
          unitPricing: null,
          shortDescription: groupedProduct.shortDescription,
          promoText: '',
          videos: [],
          status: groupedProduct.status,
          source: 'shopify_import',
        }),
      },
      create: {
        key: `productMeta:${product.id}`,
        value: JSON.stringify({
          seo: {},
          quantityDiscounts: [],
          attachments: [],
          addons: {},
          tags: groupedProduct.tags,
          requiredProducts: [],
          unitPricing: null,
          shortDescription: groupedProduct.shortDescription,
          promoText: '',
          videos: [],
          status: groupedProduct.status,
          source: 'shopify_import',
        }),
      },
    })

    await seedWarehouseInventoryFromProduct(product.id, store.id)
  }

  return preview
}

export async function runAdvancedImport(input: { mode: ImportMode; csvText: string; dryRun: boolean }) {
  const parsed = parseCsvText(input.csvText)

  if (parsed.headers.length === 0) {
    return {
      mode: input.mode,
      totalRows: 0,
      canImport: false,
      created: 0,
      updated: 0,
      skipped: 0,
      rows: [
        {
          rowNumber: 0,
          action: 'skip' as const,
          identifier: 'file',
          errors: ['CSV is empty'],
          warnings: [],
        },
      ],
    }
  }

  if (input.mode === 'categories') {
    return input.dryRun ? previewCategoryImport(parsed.rows) : commitCategoryImport(parsed.rows)
  }

  if (input.mode === 'shopify') {
    return input.dryRun ? previewShopifyImport(parsed.rows) : commitShopifyImport(parsed.rows)
  }

  return input.dryRun ? previewProductImport(parsed.rows) : commitProductImport(parsed.rows)
}

export async function appendAdvancedImportHistory(entry: Record<string, unknown>) {
  const key = 'advancedImportHistory'
  const existing = await prisma.siteSettings.findUnique({ where: { key } })
  let current: Record<string, unknown>[] = []

  if (existing?.value) {
    try {
      const parsed = JSON.parse(existing.value) as Record<string, unknown>[]
      if (Array.isArray(parsed)) {
        current = parsed
      }
    } catch {
      current = []
    }
  }

  const next = [entry, ...current].slice(0, 20)
  await prisma.siteSettings.upsert({
    where: { key },
    update: { value: JSON.stringify(next) },
    create: { key, value: JSON.stringify(next) },
  })
}

export async function getAdvancedImportHistory() {
  const row = await prisma.siteSettings.findUnique({ where: { key: 'advancedImportHistory' } })
  if (!row?.value) return []
  try {
    const parsed = JSON.parse(row.value) as Record<string, unknown>[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
