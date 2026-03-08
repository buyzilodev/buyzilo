'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { mergeGeneratedVariants, type ProductOptionInput, type ProductVariantInput } from '@/lib/helpers/productVariants'
import { RichTextEditor } from '@/components/editor/RichTextEditor'

type WorkspaceRole = 'admin' | 'vendor'

type Category = { id: string; name: string; feePercent?: number }
type ProductOptionRef = { id: string; name: string; slug: string }
type DiscountRow = { quantity: number; value: number; type: 'ABSOLUTE' | 'PERCENT'; userGroup: string }
type VideoRow = { url: string; host: string }
type AttachmentRow = { name: string; url: string }
type DigitalDownloadRow = { name: string; url: string; note?: string | null }
type CustomAttributeValueRow = { label: string; value: string; image?: string | null }
type CustomAttributeRow = { name: string; displayType: 'TEXT' | 'IMAGE' | 'COLOR'; values: CustomAttributeValueRow[] }
type LicenseKeyRow = { id?: string; code: string; note?: string | null; variantKey?: string | null; variantLabel?: string | null; isActive?: boolean }
type FeatureTemplateRow = { key: string; label: string; type: 'text' | 'number' | 'color' | 'image'; required?: boolean; filterable?: boolean }
type CategorySchemaRule = { featureKeys: string[]; filterKeys: string[] }

type ProductEditorRecord = {
  id: string
  slug?: string
  store?: { id: string; name: string; vendorId?: string } | null
  approval?: {
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    note?: string | null
  }
  general: {
    name: string
    categoryId: string
    price: number
    comparePrice?: number | null
    stock?: number
    description?: string
    shortDescription?: string
    promoText?: string
    productType?: 'PHYSICAL' | 'DIGITAL'
    listingType?: 'FOR_SALE' | 'ORDINARY' | 'QUOTE_REQUEST' | 'LICENSE_KEYS'
    detailsLanguage?: string
    status: 'ACTIVE' | 'DISABLED' | 'HIDDEN'
    images?: string[]
    videos?: VideoRow[]
  }
  seo: { seoName?: string; pageTitle?: string; metaDescription?: string; metaKeywords?: string }
  quantityDiscounts: DiscountRow[]
  attachments?: AttachmentRow[]
  digitalDownloads?: DigitalDownloadRow[]
  addons: { outOfStockAction?: string; searchWords?: string; popularity?: number }
  tags: string[]
  requiredProducts?: string[]
  unitPricing?: { quantity: number; unit: string } | null
  customAttributes?: CustomAttributeRow[]
  licenseKeys?: LicenseKeyRow[]
  options?: ProductOptionInput[]
  variants?: ProductVariantInput[]
}

type ProductWorkspaceProps = {
  role: WorkspaceRole
  mode: 'create' | 'edit'
  productId?: string
  apiBasePath: string
  catalogHref: string
}

const sections = [
  { id: 'catalog', label: 'Catalog' },
  { id: 'content', label: 'Content' },
  { id: 'merchandising', label: 'Merchandising' },
  { id: 'variants', label: 'Variants' },
  { id: 'seo', label: 'SEO' },
] as const

function emptyDiscount(): DiscountRow {
  return { quantity: 0, value: 0, type: 'ABSOLUTE', userGroup: 'ALL' }
}

function emptyAttributeValue(): CustomAttributeValueRow {
  return { label: '', value: '', image: '' }
}

function emptyAttribute(): CustomAttributeRow {
  return { name: '', displayType: 'TEXT', values: [emptyAttributeValue()] }
}

function emptyLicenseKey(): LicenseKeyRow {
  return { code: '', note: '', variantKey: null, variantLabel: null, isActive: true }
}

function toNumber(value: string, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseList(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function ProductWorkspace({
  role,
  mode,
  productId,
  apiBasePath,
  catalogHref,
}: ProductWorkspaceProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeSection, setActiveSection] = useState<(typeof sections)[number]['id']>('catalog')
  const [loading, setLoading] = useState(mode === 'edit')
  const [bootstrapping, setBootstrapping] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [productOptions, setProductOptions] = useState<ProductOptionRef[]>([])
  const [featureTemplates, setFeatureTemplates] = useState<FeatureTemplateRow[]>([])
  const [categorySchemaMap, setCategorySchemaMap] = useState<Record<string, CategorySchemaRule>>({})
  const [general, setGeneral] = useState({
    name: '',
    categoryId: '',
    price: '',
    comparePrice: '',
    stock: '0',
    description: '',
    shortDescription: '',
    promoText: '',
    productType: 'PHYSICAL' as 'PHYSICAL' | 'DIGITAL',
    listingType: 'FOR_SALE' as 'FOR_SALE' | 'ORDINARY' | 'QUOTE_REQUEST' | 'LICENSE_KEYS',
    detailsLanguage: 'English',
    unitQuantity: '',
    unitName: '',
    status: 'ACTIVE' as 'ACTIVE' | 'DISABLED' | 'HIDDEN',
    images: [] as string[],
    videos: [] as VideoRow[],
  })
  const [seo, setSeo] = useState({ seoName: '', pageTitle: '', metaDescription: '', metaKeywords: '' })
  const [quantityDiscounts, setQuantityDiscounts] = useState<DiscountRow[]>([emptyDiscount()])
  const [attachments, setAttachments] = useState<AttachmentRow[]>([])
  const [digitalDownloads, setDigitalDownloads] = useState<DigitalDownloadRow[]>([])
  const [addons, setAddons] = useState({ outOfStockAction: 'NONE', searchWords: '', popularity: '0' })
  const [tagsInput, setTagsInput] = useState('')
  const [requiredProducts, setRequiredProducts] = useState<string[]>([])
  const [requiredSearch, setRequiredSearch] = useState('')
  const [customAttributes, setCustomAttributes] = useState<CustomAttributeRow[]>([])
  const [licenseKeys, setLicenseKeys] = useState<LicenseKeyRow[]>([])
  const [options, setOptions] = useState<ProductOptionInput[]>([])
  const [variants, setVariants] = useState<ProductVariantInput[]>([])
  const [storeSummary, setStoreSummary] = useState<{ id: string; name: string; vendorId?: string } | null>(null)
  const [approval, setApproval] = useState<{ status: 'PENDING' | 'APPROVED' | 'REJECTED'; note?: string | null } | null>(null)
  const [moderating, setModerating] = useState(false)
  const [productSlug, setProductSlug] = useState<string>('')

  const tags = useMemo(() => parseList(tagsInput), [tagsInput])
  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === general.categoryId) ?? null,
    [categories, general.categoryId],
  )

  useEffect(() => {
    setVariants((prev) => mergeGeneratedVariants(options, prev, { stock: toNumber(general.stock, 0) }))
  }, [general.stock, options])

  useEffect(() => {
    async function bootstrap() {
      setBootstrapping(true)
      try {
        const [categoryResponse, productResponse, publicSettingsResponse] = await Promise.all([
          fetch(role === 'admin' ? '/api/admin/categories' : '/api/categories'),
          fetch(role === 'admin' ? '/api/admin/products' : '/api/vendor/products'),
          fetch('/api/settings/public'),
        ])
        const categoryData = await categoryResponse.json()
        const productData = await productResponse.json()
        const publicSettingsData = await publicSettingsResponse.json()
        setCategories(Array.isArray(categoryData) ? categoryData : [])
        const sourceProducts = Array.isArray(productData)
          ? productData
          : Array.isArray(productData?.products)
            ? productData.products
            : []
        setProductOptions(sourceProducts.map((product: ProductOptionRef) => ({ id: product.id, name: product.name, slug: product.slug })))
        setFeatureTemplates(Array.isArray(publicSettingsData?.productFeaturesSchema) ? publicSettingsData.productFeaturesSchema : [])
        setCategorySchemaMap(publicSettingsData?.categoryProductSchema && typeof publicSettingsData.categoryProductSchema === 'object' ? publicSettingsData.categoryProductSchema : {})
      } catch {
        setCategories([])
        setProductOptions([])
        setFeatureTemplates([])
        setCategorySchemaMap({})
      } finally {
        setBootstrapping(false)
      }
    }

    void bootstrap()
  }, [role])

  useEffect(() => {
    if (mode !== 'edit' || !productId) return

    async function loadRecord() {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`${apiBasePath}?id=${productId}`)
        const data = await response.json()
        if (!response.ok || !data?.product) {
          setError(data?.error ?? 'Unable to load product')
          return
        }

        const record = data.product as ProductEditorRecord
        setProductSlug(record.slug ?? '')
        setStoreSummary(record.store ?? null)
        setApproval(record.approval ?? null)
        setGeneral({
          name: record.general.name ?? '',
          categoryId: record.general.categoryId ?? '',
          price: String(record.general.price ?? ''),
          comparePrice: record.general.comparePrice == null ? '' : String(record.general.comparePrice),
          stock: String(record.general.stock ?? 0),
          description: record.general.description ?? '',
          shortDescription: record.general.shortDescription ?? '',
          promoText: record.general.promoText ?? '',
          productType: record.general.productType ?? 'PHYSICAL',
          listingType: record.general.listingType ?? 'FOR_SALE',
          detailsLanguage: record.general.detailsLanguage ?? 'English',
          unitQuantity: record.unitPricing?.quantity == null ? '' : String(record.unitPricing.quantity),
          unitName: record.unitPricing?.unit ?? '',
          status: record.general.status ?? 'ACTIVE',
          images: record.general.images ?? [],
          videos: record.general.videos ?? [],
        })
        setSeo({
          seoName: record.seo.seoName ?? '',
          pageTitle: record.seo.pageTitle ?? '',
          metaDescription: record.seo.metaDescription ?? '',
          metaKeywords: record.seo.metaKeywords ?? '',
        })
        setQuantityDiscounts(record.quantityDiscounts?.length ? record.quantityDiscounts : [emptyDiscount()])
        setAttachments(record.attachments ?? [])
        setDigitalDownloads(record.digitalDownloads ?? [])
        setAddons({
          outOfStockAction: record.addons?.outOfStockAction ?? 'NONE',
          searchWords: record.addons?.searchWords ?? '',
          popularity: String(record.addons?.popularity ?? 0),
        })
        setTagsInput((record.tags ?? []).join(', '))
        setRequiredProducts(record.requiredProducts ?? [])
        setCustomAttributes(record.customAttributes ?? [])
        setLicenseKeys(record.licenseKeys ?? [])
        setOptions(record.options ?? [])
        setVariants(record.variants ?? [])
      } catch {
        setError('Unable to load product')
      } finally {
        setLoading(false)
      }
    }

    void loadRecord()
  }, [apiBasePath, mode, productId])

  async function uploadFiles(files: FileList, folder = 'products') {
    const formData = new FormData()
    formData.append('folder', folder)
    Array.from(files).forEach((file) => formData.append('files', file))
    const response = await fetch('/api/admin/upload', { method: 'POST', body: formData })
    const data = await response.json()
    if (!response.ok || !Array.isArray(data.urls)) {
      throw new Error(data?.error ?? 'Upload failed')
    }
    return data.urls as string[]
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const payload = {
        ...(mode === 'edit' && productId ? { id: productId } : {}),
        general: {
          ...general,
          price: toNumber(general.price),
          comparePrice: general.comparePrice ? toNumber(general.comparePrice) : null,
          stock: toNumber(general.stock),
        },
        seo,
        quantityDiscounts,
        attachments: attachments.filter((attachment) => attachment.name.trim() && attachment.url.trim()),
        digitalDownloads: digitalDownloads
          .map((file) => ({
            name: file.name.trim(),
            url: file.url.trim(),
            note: file.note?.trim() || null,
          }))
          .filter((file) => file.name && file.url),
        addons: { ...addons, popularity: toNumber(addons.popularity) },
        tags,
        requiredProducts,
        customAttributes: customAttributes
          .map((attribute) => ({
            ...attribute,
            name: attribute.name.trim(),
            values: attribute.values
              .map((value) => ({
                label: value.label.trim(),
                value: value.value.trim(),
                image: value.image?.trim() || null,
              }))
              .filter((value) => value.label && value.value),
          }))
          .filter((attribute) => attribute.name && attribute.values.length > 0),
        licenseKeys: licenseKeys
          .map((row) => ({
            id: row.id,
            code: row.code.trim(),
            note: row.note?.trim() || null,
            variantKey: row.variantKey?.trim() || null,
            variantLabel: row.variantLabel?.trim() || null,
            isActive: row.isActive !== false,
          }))
          .filter((row) => row.code),
        unitPricing:
          general.unitQuantity && general.unitName
            ? { quantity: toNumber(general.unitQuantity), unit: general.unitName.trim() }
            : undefined,
        options,
        variants,
      }

      const response = await fetch(apiBasePath, {
        method: mode === 'edit' ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error ?? 'Failed to save product')
        return
      }

      const nextId = data?.product?.id ?? productId
      setSuccess(mode === 'edit' ? 'Product updated.' : 'Product created.')
      if (mode === 'create' && nextId) {
        router.replace(`${catalogHref}/${nextId}`)
      }
      router.refresh()
    } catch {
      setError('Failed to save product')
    } finally {
      setSaving(false)
    }
  }

  async function handleModeration(status: 'APPROVED' | 'REJECTED') {
    if (role !== 'admin' || !productId) return
    const moderationNote = window.prompt(
      status === 'APPROVED' ? 'Approval note (optional)' : 'Rejection note',
      approval?.note ?? ''
    ) ?? ''

    setModerating(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: productId,
          approvalStatus: status,
          approvalNote: moderationNote.trim() || null,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data?.error ?? 'Unable to update moderation state')
        return
      }
      setApproval({ status, note: moderationNote.trim() || null })
      setSuccess(status === 'APPROVED' ? 'Product approved.' : 'Product rejected.')
      router.refresh()
    } catch {
      setError('Unable to update moderation state')
    } finally {
      setModerating(false)
    }
  }

  const requiredCandidates = useMemo(() => {
    const term = requiredSearch.trim().toLowerCase()
    return productOptions.filter((product) => {
      if (product.id === productId) return false
      if (!term) return true
      return product.name.toLowerCase().includes(term) || product.slug.toLowerCase().includes(term)
    })
  }, [productId, productOptions, requiredSearch])

  const effectiveFeatureTemplates = useMemo(() => {
    const selectedRule = categorySchemaMap[general.categoryId]
    if (!selectedRule?.featureKeys?.length) {
      return featureTemplates
    }
    const keySet = new Set(selectedRule.featureKeys.map((item) => item.toLowerCase()))
    return featureTemplates.filter((feature) => keySet.has(feature.key.toLowerCase()))
  }, [categorySchemaMap, featureTemplates, general.categoryId])

  const licenseVariantChoices = useMemo(() => {
    if (variants.length === 0) return []
    return variants.map((variant) => ({
      key: variant.key,
      title: variant.title,
    }))
  }, [variants])

  if (loading || bootstrapping) {
    return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">Loading product workspace...</div>
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-24 xl:h-fit">
        <div className="mb-4 border-b border-slate-100 pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{role === 'admin' ? 'Admin product desk' : 'Vendor product desk'}</p>
          <h2 className="mt-2 text-lg font-black text-slate-900">{mode === 'edit' ? 'Edit Product' : 'Create Product'}</h2>
          <p className="mt-1 text-sm text-slate-500">One workspace for catalog, content, variants, merchandising, and SEO.</p>
        </div>

        <nav className="space-y-2">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => setActiveSection(section.id)}
              className={`flex w-full rounded-2xl px-3 py-2.5 text-left text-sm font-semibold ${
                activeSection === section.id ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <div className="mt-6 space-y-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={() => void handleSave()} disabled={saving} className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Saving...' : mode === 'edit' ? 'Save changes' : 'Create product'}
          </button>
          <Link href={catalogHref} className="block rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Back to catalog
          </Link>
          {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        </div>
      </aside>

      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Workspace</p>
              <h1 className="mt-1 text-2xl font-black text-slate-900">{general.name || (mode === 'edit' ? 'Untitled product' : 'New catalog product')}</h1>
              <p className="mt-1 text-sm text-slate-500">Structured management replacing the old fragmented product forms.</p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">{general.status}</span>
              {selectedCategory ? <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-700">{selectedCategory.name}</span> : null}
              {approval ? (
                <span className={`rounded-full px-3 py-1.5 ${
                  approval.status === 'APPROVED'
                    ? 'bg-emerald-50 text-emerald-700'
                    : approval.status === 'PENDING'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-rose-50 text-rose-700'
                }`}>
                  Review {approval.status}
                </span>
              ) : null}
            </div>
          </div>
        </section>

        {role === 'admin' && mode === 'edit' ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Admin Review</p>
                <h3 className="mt-1 text-lg font-black text-slate-900">Moderation and intervention</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Review listing readiness, moderate publication state, and jump into related admin queues.
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  {storeSummary ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
                      Store {storeSummary.name}
                    </span>
                  ) : null}
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
                    {general.productType === 'DIGITAL' ? 'Digital' : 'Physical'}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
                    {general.listingType.replaceAll('_', ' ')}
                  </span>
                  {general.listingType === 'LICENSE_KEYS' ? (
                    <span className="rounded-full bg-violet-50 px-3 py-1.5 text-violet-700">
                      {licenseKeys.length} keys loaded
                    </span>
                  ) : null}
                  {general.productType === 'DIGITAL' && general.listingType !== 'LICENSE_KEYS' ? (
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
                      {digitalDownloads.length} download files
                    </span>
                  ) : null}
                  {general.listingType === 'QUOTE_REQUEST' ? (
                    <span className="rounded-full bg-sky-50 px-3 py-1.5 text-sky-700">
                      Quote-request listing
                    </span>
                  ) : null}
                  {approval?.note ? (
                    <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-700">
                      Note attached
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void handleModeration('APPROVED')}
                  disabled={moderating}
                  className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {moderating ? 'Saving...' : 'Approve listing'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleModeration('REJECTED')}
                  disabled={moderating}
                  className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                >
                  Reject listing
                </button>
                <Link href={productSlug ? `/products/${productSlug}` : catalogHref} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Preview storefront
                </Link>
                <Link href="/admin/products/quotes" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Quote queue
                </Link>
                <Link href="/admin/reviews/discussion" className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                  Discussion queue
                </Link>
              </div>
            </div>

            {approval?.note ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Review note: {approval.note}
              </div>
            ) : null}
          </section>
        ) : null}

        {activeSection === 'catalog' && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-slate-900">Catalog foundation</h3>
            <p className="mt-1 text-sm text-slate-500">Core product identity, pricing, visibility, and inventory.</p>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Product name</span>
                <input value={general.name} onChange={(event) => setGeneral((prev) => ({ ...prev, name: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Premium espresso beans" />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Category</span>
                <select value={general.categoryId} onChange={(event) => setGeneral((prev) => ({ ...prev, categoryId: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                  <option value="">Select a category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                      {role === 'vendor' && category.feePercent ? ` (${category.feePercent}% fee)` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Product type</span>
                <select value={general.productType} onChange={(event) => setGeneral((prev) => ({ ...prev, productType: event.target.value as 'PHYSICAL' | 'DIGITAL' }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                  <option value="PHYSICAL">Physical</option>
                  <option value="DIGITAL">Digital</option>
                </select>
                <p className="text-xs text-slate-500">{general.productType === 'DIGITAL' ? 'A digital file that buyers will download.' : 'A tangible product that you will ship to buyers.'}</p>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Listing type</span>
                <select value={general.listingType} onChange={(event) => setGeneral((prev) => ({ ...prev, listingType: event.target.value as 'FOR_SALE' | 'ORDINARY' | 'QUOTE_REQUEST' | 'LICENSE_KEYS' }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                  <option value="FOR_SALE">Add a product for sale</option>
                  <option value="ORDINARY">Ordinary listing</option>
                  <option value="QUOTE_REQUEST">Receive quote requests</option>
                  <option value="LICENSE_KEYS">Sell license keys</option>
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Price</span>
                <input type="number" value={general.price} onChange={(event) => setGeneral((prev) => ({ ...prev, price: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="0.00" />
                <p className="text-xs text-slate-500">
                  {general.listingType === 'QUOTE_REQUEST'
                    ? 'Leave at 0 if you want buyers to request pricing instead of buying directly.'
                    : general.listingType === 'ORDINARY'
                      ? 'Ordinary listings can stay informational without direct buy behavior.'
                      : general.listingType === 'LICENSE_KEYS'
                        ? 'Used when this product is sold as license-key fulfillment.'
                        : 'Direct sale price shown to buyers.'}
                </p>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Compare-at price</span>
                <input type="number" value={general.comparePrice} onChange={(event) => setGeneral((prev) => ({ ...prev, comparePrice: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="0.00" />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Base stock</span>
                <input type="number" value={general.stock} onChange={(event) => setGeneral((prev) => ({ ...prev, stock: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="0" />
                {general.listingType === 'LICENSE_KEYS' ? (
                  <p className="text-xs text-slate-500">For license-key products, stock is reconciled automatically from active unassigned keys when you save.</p>
                ) : null}
              </label>

              <div className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Visibility</span>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(['ACTIVE', 'DISABLED', 'HIDDEN'] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setGeneral((prev) => ({ ...prev, status }))}
                      className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                        general.status === status ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Unit quantity</span>
                <input value={general.unitQuantity} onChange={(event) => setGeneral((prev) => ({ ...prev, unitQuantity: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="750" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Unit name</span>
                <input value={general.unitName} onChange={(event) => setGeneral((prev) => ({ ...prev, unitName: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="ml" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Details language</span>
                <input value={general.detailsLanguage} onChange={(event) => setGeneral((prev) => ({ ...prev, detailsLanguage: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="English" />
              </label>
            </div>
          </section>
        )}

        {activeSection === 'content' && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-slate-900">Content and media</h3>
            <p className="mt-1 text-sm text-slate-500">Descriptions, galleries, downloadable files, and supporting media.</p>

            <div className="mt-6 space-y-4">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Short description</span>
                <RichTextEditor value={general.shortDescription} onChange={(value) => setGeneral((prev) => ({ ...prev, shortDescription: value }))} placeholder="Short merchandising summary" minHeightClassName="min-h-[120px]" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Full description</span>
                <RichTextEditor value={general.description} onChange={(value) => setGeneral((prev) => ({ ...prev, description: value }))} placeholder="Long-form product description, specs, and selling points" minHeightClassName="min-h-[260px]" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Promo text</span>
                <RichTextEditor value={general.promoText} onChange={(value) => setGeneral((prev) => ({ ...prev, promoText: value }))} placeholder="Highlight offer details or seasonal messaging" minHeightClassName="min-h-[120px]" />
              </label>
            </div>

            <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Product gallery</p>
                  <p className="text-sm text-slate-500">Upload primary product images and merchandising shots.</p>
                </div>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                  Upload images
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={async (event) => {
                  if (!event.target.files) return
                  try {
                    const urls = await uploadFiles(event.target.files, 'products')
                    setGeneral((prev) => ({ ...prev, images: [...prev.images, ...urls] }))
                  } catch (uploadError) {
                    setError(uploadError instanceof Error ? uploadError.message : 'Upload failed')
                  }
                }}
              />

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {general.images.map((image, index) => (
                  <div key={`${image}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="truncate text-xs text-slate-500">{image}</p>
                    <button type="button" onClick={() => setGeneral((prev) => ({ ...prev, images: prev.images.filter((_, currentIndex) => currentIndex !== index) }))} className="mt-3 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">
                      Remove
                    </button>
                  </div>
                ))}
                {general.images.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">No gallery images yet.</div> : null}
              </div>
            </div>

            {general.productType === 'DIGITAL' && general.listingType !== 'LICENSE_KEYS' && (
              <div className="mt-6 rounded-3xl border border-slate-200 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Digital downloads</p>
                    <p className="mt-1 text-sm text-slate-500">Files delivered to buyers after successful payment.</p>
                  </div>
                  <label className="cursor-pointer rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                    Upload files
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={async (event) => {
                        if (!event.target.files) return
                        try {
                          const urls = await uploadFiles(event.target.files, 'downloads')
                          setDigitalDownloads((prev) => [
                            ...prev,
                            ...urls.map((url, index) => ({
                              name: event.target.files?.[index]?.name || `Download ${prev.length + index + 1}`,
                              url,
                              note: '',
                            })),
                          ])
                        } catch (uploadError) {
                          setError(uploadError instanceof Error ? uploadError.message : 'Upload failed')
                        }
                      }}
                    />
                  </label>
                </div>
                <div className="mt-4 space-y-3">
                  {digitalDownloads.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No digital files attached yet.</div>
                  ) : (
                    digitalDownloads.map((file, index) => (
                      <div key={`${file.url}-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
                        <input value={file.name} onChange={(event) => setDigitalDownloads((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, name: event.target.value } : row))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Download name" />
                        <input value={file.url} onChange={(event) => setDigitalDownloads((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, url: event.target.value } : row))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="/uploads/downloads/..." />
                        <input value={file.note ?? ''} onChange={(event) => setDigitalDownloads((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, note: event.target.value } : row))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Optional note" />
                        <button type="button" onClick={() => setDigitalDownloads((prev) => prev.filter((_, rowIndex) => rowIndex !== index))} className="rounded-2xl border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-700">
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                  <button type="button" onClick={() => setDigitalDownloads((prev) => [...prev, { name: '', url: '', note: '' }])} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                    Add download row
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {activeSection === 'merchandising' && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-slate-900">Merchandising and dependencies</h3>
            <p className="mt-1 text-sm text-slate-500">Tags, discounts, search signals, attachments, and required-product rules.</p>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="space-y-4 rounded-3xl border border-slate-200 p-5">
                <p className="text-sm font-semibold text-slate-800">Tags and search</p>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Tags</span>
                  <input value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="organic, coffee, arabica" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Search words</span>
                  <textarea rows={4} value={addons.searchWords} onChange={(event) => setAddons((prev) => ({ ...prev, searchWords: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Popularity score</span>
                  <input type="number" value={addons.popularity} onChange={(event) => setAddons((prev) => ({ ...prev, popularity: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-slate-600">Out-of-stock behavior</span>
                  <select value={addons.outOfStockAction} onChange={(event) => setAddons((prev) => ({ ...prev, outOfStockAction: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                    <option value="NONE">Do nothing</option>
                    <option value="BUY_IN_ADVANCE">Allow buy in advance</option>
                    <option value="SIGNUP_NOTICE">Collect back-in-stock signup</option>
                  </select>
                </label>
              </div>

              <div className="space-y-4 rounded-3xl border border-slate-200 p-5">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Required products</p>
                  <p className="mt-1 text-sm text-slate-500">Force related items into the cart before checkout.</p>
                </div>
                <input value={requiredSearch} onChange={(event) => setRequiredSearch(event.target.value)} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Search products" />
                <div className="max-h-72 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 p-3">
                  {requiredCandidates.map((product) => (
                    <label key={product.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 px-3 py-3 text-sm">
                      <div>
                        <p className="font-semibold text-slate-800">{product.name}</p>
                        <p className="text-xs text-slate-500">{product.slug}</p>
                      </div>
                      <input type="checkbox" checked={requiredProducts.includes(product.id)} onChange={(event) => setRequiredProducts((prev) => event.target.checked ? [...prev, product.id] : prev.filter((item) => item !== product.id))} />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Custom attributes</p>
                  <p className="mt-1 text-sm text-slate-500">Add advanced product details such as color, size, material, packaging, or any custom specification. Attribute values can include images.</p>
                </div>
                <button type="button" onClick={() => setCustomAttributes((prev) => [...prev, emptyAttribute()])} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                  Add attribute
                </button>
              </div>

              {effectiveFeatureTemplates.length > 0 && (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Feature templates</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {effectiveFeatureTemplates.map((feature) => (
                      <button
                        key={feature.key}
                        type="button"
                        onClick={() =>
                          setCustomAttributes((prev) => {
                            if (prev.some((item) => item.name.trim().toLowerCase() === feature.label.trim().toLowerCase())) {
                              return prev
                            }
                            return [
                              ...prev,
                              {
                                name: feature.label,
                                displayType: feature.type === 'color' ? 'COLOR' : feature.type === 'image' ? 'IMAGE' : 'TEXT',
                                values: [emptyAttributeValue()],
                              },
                            ]
                          })
                        }
                        className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        {feature.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 space-y-4">
                {customAttributes.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No custom attributes added yet.</div>
                ) : (
                  customAttributes.map((attribute, attributeIndex) => (
                    <div key={`attribute-${attributeIndex}`} className="rounded-2xl border border-slate-200 p-4">
                      <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_auto]">
                        <input
                          value={attribute.name}
                          onChange={(event) => setCustomAttributes((prev) => prev.map((item, itemIndex) => itemIndex === attributeIndex ? { ...item, name: event.target.value } : item))}
                          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                          placeholder="Attribute name, e.g. Color or Size"
                        />
                        <select
                          value={attribute.displayType}
                          onChange={(event) => setCustomAttributes((prev) => prev.map((item, itemIndex) => itemIndex === attributeIndex ? { ...item, displayType: event.target.value as 'TEXT' | 'IMAGE' | 'COLOR' } : item))}
                          className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                        >
                          <option value="TEXT">Text</option>
                          <option value="IMAGE">Image</option>
                          <option value="COLOR">Color</option>
                        </select>
                        <button type="button" onClick={() => setCustomAttributes((prev) => prev.filter((_, itemIndex) => itemIndex !== attributeIndex))} className="rounded-2xl border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-700">
                          Remove
                        </button>
                      </div>

                      <div className="mt-4 space-y-3">
                        {attribute.values.map((value, valueIndex) => (
                          <div key={`attribute-${attributeIndex}-value-${valueIndex}`} className="grid gap-3 lg:grid-cols-[1fr_1fr_1.4fr_auto]">
                            <input
                              value={value.label}
                              onChange={(event) => setCustomAttributes((prev) => prev.map((item, itemIndex) => itemIndex === attributeIndex ? {
                                ...item,
                                values: item.values.map((row, rowIndex) => rowIndex === valueIndex ? { ...row, label: event.target.value } : row),
                              } : item))}
                              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                              placeholder="Label"
                            />
                            <input
                              value={value.value}
                              onChange={(event) => setCustomAttributes((prev) => prev.map((item, itemIndex) => itemIndex === attributeIndex ? {
                                ...item,
                                values: item.values.map((row, rowIndex) => rowIndex === valueIndex ? { ...row, value: event.target.value } : row),
                              } : item))}
                              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                              placeholder={attribute.displayType === 'COLOR' ? '#1d4ed8' : 'Value'}
                            />
                            <div className="flex gap-2">
                              <input
                                value={value.image ?? ''}
                                onChange={(event) => setCustomAttributes((prev) => prev.map((item, itemIndex) => itemIndex === attributeIndex ? {
                                  ...item,
                                  values: item.values.map((row, rowIndex) => rowIndex === valueIndex ? { ...row, image: event.target.value } : row),
                                } : item))}
                                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                                placeholder="Optional image URL"
                              />
                              <label className="cursor-pointer rounded-2xl border border-slate-200 px-4 py-3 text-xs font-semibold text-slate-700">
                                Upload
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (event) => {
                                    if (!event.target.files) return
                                    try {
                                      const urls = await uploadFiles(event.target.files, 'attributes')
                                      const nextUrl = urls[0] ?? ''
                                      setCustomAttributes((prev) => prev.map((item, itemIndex) => itemIndex === attributeIndex ? {
                                        ...item,
                                        values: item.values.map((row, rowIndex) => rowIndex === valueIndex ? { ...row, image: nextUrl } : row),
                                      } : item))
                                    } catch (uploadError) {
                                      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed')
                                    }
                                  }}
                                />
                              </label>
                            </div>
                            <button type="button" onClick={() => setCustomAttributes((prev) => prev.map((item, itemIndex) => itemIndex === attributeIndex ? { ...item, values: item.values.filter((_, rowIndex) => rowIndex !== valueIndex) } : item))} className="rounded-2xl border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-700">
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>

                      <button type="button" onClick={() => setCustomAttributes((prev) => prev.map((item, itemIndex) => itemIndex === attributeIndex ? { ...item, values: [...item.values, emptyAttributeValue()] } : item))} className="mt-4 rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                        Add attribute value
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">License key inventory</p>
                  <p className="mt-1 text-sm text-slate-500">Used when this listing sells digital keys. Keys are assigned automatically on paid orders and removed from available inventory.</p>
                </div>
                <button type="button" onClick={() => setLicenseKeys((prev) => [...prev, emptyLicenseKey()])} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                  Add license key
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {licenseKeys.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">No license keys loaded yet.</div>
                ) : (
                  licenseKeys.map((row, index) => (
                    <div key={row.id ?? `license-${index}`} className="grid gap-3 rounded-2xl border border-slate-200 p-4 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
                      <div className="space-y-3">
                        <input
                          value={row.code}
                          onChange={(event) => setLicenseKeys((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, code: event.target.value } : item))}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                          placeholder="License key / serial / activation token"
                        />
                        <input
                          value={row.note ?? ''}
                          onChange={(event) => setLicenseKeys((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, note: event.target.value } : item))}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                          placeholder="Optional note or entitlement details"
                        />
                      </div>
                      <select
                        value={row.variantKey ?? ''}
                        onChange={(event) => {
                          const selected = licenseVariantChoices.find((choice) => choice.key === event.target.value)
                          setLicenseKeys((prev) => prev.map((item, itemIndex) => itemIndex === index ? {
                            ...item,
                            variantKey: event.target.value || null,
                            variantLabel: selected?.title ?? null,
                          } : item))
                        }}
                        className="rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                      >
                        <option value="">Applies to base product</option>
                        {licenseVariantChoices.map((choice) => (
                          <option key={choice.key} value={choice.key}>{choice.title}</option>
                        ))}
                      </select>
                      <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={row.isActive !== false}
                          onChange={(event) => setLicenseKeys((prev) => prev.map((item, itemIndex) => itemIndex === index ? { ...item, isActive: event.target.checked } : item))}
                        />
                        Active
                      </label>
                      <button type="button" onClick={() => setLicenseKeys((prev) => prev.filter((_, itemIndex) => itemIndex !== index))} className="rounded-2xl border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-700">
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Quantity discounts</p>
                  <p className="mt-1 text-sm text-slate-500">Configure tiered pricing by quantity and audience.</p>
                </div>
                <button type="button" onClick={() => setQuantityDiscounts((prev) => [...prev, emptyDiscount()])} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                  Add discount
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {quantityDiscounts.map((discount, index) => (
                  <div key={`${discount.quantity}-${index}`} className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_auto]">
                    <input type="number" value={discount.quantity} onChange={(event) => setQuantityDiscounts((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: toNumber(event.target.value) } : row))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Quantity" />
                    <input type="number" value={discount.value} onChange={(event) => setQuantityDiscounts((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, value: toNumber(event.target.value) } : row))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Value" />
                    <select value={discount.type} onChange={(event) => setQuantityDiscounts((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, type: event.target.value as 'ABSOLUTE' | 'PERCENT' } : row))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                      <option value="ABSOLUTE">Fixed</option>
                      <option value="PERCENT">Percent</option>
                    </select>
                    <select value={discount.userGroup} onChange={(event) => setQuantityDiscounts((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, userGroup: event.target.value } : row))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                      <option value="ALL">All customers</option>
                      <option value="GUEST">Guests</option>
                      <option value="REGISTERED">Registered</option>
                    </select>
                    <button type="button" onClick={() => setQuantityDiscounts((prev) => prev.filter((_, rowIndex) => rowIndex !== index))} className="rounded-2xl border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-700">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-3xl border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Attachments</p>
                  <p className="mt-1 text-sm text-slate-500">Manuals, specifications, certificates, or downloads.</p>
                </div>
                <label className="cursor-pointer rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                  Upload files
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={async (event) => {
                      if (!event.target.files) return
                      try {
                        const urls = await uploadFiles(event.target.files, 'attachments')
                        setAttachments((prev) => [
                          ...prev,
                          ...urls.map((url, index) => ({
                            name: event.target.files?.[index]?.name || `Attachment ${prev.length + index + 1}`,
                            url,
                          })),
                        ])
                      } catch (uploadError) {
                        setError(uploadError instanceof Error ? uploadError.message : 'Upload failed')
                      }
                    }}
                  />
                </label>
              </div>
              <div className="mt-4 space-y-3">
                {attachments.map((attachment, index) => (
                  <div key={`${attachment.url}-${index}`} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <input value={attachment.name} onChange={(event) => setAttachments((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, name: event.target.value } : row))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Attachment name" />
                    <input value={attachment.url} onChange={(event) => setAttachments((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, url: event.target.value } : row))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="/uploads/attachments/..." />
                    <button type="button" onClick={() => setAttachments((prev) => prev.filter((_, rowIndex) => rowIndex !== index))} className="rounded-2xl border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-700">
                      Remove
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => setAttachments((prev) => [...prev, { name: '', url: '' }])} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                  Add attachment row
                </button>
              </div>
            </div>
          </section>
        )}

        {activeSection === 'variants' && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-slate-900">Options and variants</h3>
            <p className="mt-1 text-sm text-slate-500">Rebuild the product matrix with option groups and controlled variants.</p>

            <div className="mt-6 space-y-4 rounded-3xl border border-slate-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Option groups</p>
                  <p className="mt-1 text-sm text-slate-500">Example: Size, Color, Material.</p>
                </div>
                <button type="button" onClick={() => setOptions((prev) => [...prev, { name: '', values: [] }])} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700">
                  Add option
                </button>
              </div>

              {options.map((option, index) => (
                <div key={`${option.name}-${index}`} className="grid gap-3 lg:grid-cols-[1fr_2fr_auto]">
                  <input value={option.name} onChange={(event) => setOptions((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, name: event.target.value } : row))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Option name" />
                  <input value={option.values.join(', ')} onChange={(event) => setOptions((prev) => prev.map((row, rowIndex) => rowIndex === index ? { ...row, values: parseList(event.target.value) } : row))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Small, Medium, Large" />
                  <button type="button" onClick={() => setOptions((prev) => prev.filter((_, rowIndex) => rowIndex !== index))} className="rounded-2xl border border-rose-200 px-4 py-3 text-xs font-semibold text-rose-700">
                    Remove
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3 rounded-3xl border border-slate-200 p-5">
              <div>
                <p className="text-sm font-semibold text-slate-800">Generated variants</p>
                <p className="mt-1 text-sm text-slate-500">Each row can override pricing, stock, image, and SKU.</p>
              </div>
              {variants.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Add option groups to generate variant combinations.</div>
              ) : (
                variants.map((variant, index) => (
                  <div key={variant.key} className="rounded-2xl border border-slate-200 p-4">
                    <div className="grid gap-3 xl:grid-cols-6">
                      <input value={variant.title} readOnly className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm xl:col-span-2" />
                      <input value={variant.sku ?? ''} onChange={(event) => setVariants((prev) => prev.map((row) => row.key === variant.key ? { ...row, sku: event.target.value } : row))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="SKU" />
                      <input type="number" value={variant.price ?? ''} onChange={(event) => setVariants((prev) => prev.map((row) => row.key === variant.key ? { ...row, price: event.target.value ? toNumber(event.target.value) : null } : row))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Price" />
                      <input type="number" value={variant.comparePrice ?? ''} onChange={(event) => setVariants((prev) => prev.map((row) => row.key === variant.key ? { ...row, comparePrice: event.target.value ? toNumber(event.target.value) : null } : row))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Compare-at" />
                      <input type="number" value={variant.stock ?? 0} onChange={(event) => setVariants((prev) => prev.map((row) => row.key === variant.key ? { ...row, stock: toNumber(event.target.value) } : row))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Stock" />
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_auto_auto]">
                      <input value={variant.image ?? ''} onChange={(event) => setVariants((prev) => prev.map((row) => row.key === variant.key ? { ...row, image: event.target.value } : row))} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Variant image URL" />
                      <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                        <input type="radio" checked={variant.isDefault === true} onChange={() => setVariants((prev) => prev.map((row, rowIndex) => ({ ...row, isDefault: rowIndex === index })))} />
                        Default
                      </label>
                      <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
                        <input type="checkbox" checked={variant.isActive !== false} onChange={(event) => setVariants((prev) => prev.map((row) => row.key === variant.key ? { ...row, isActive: event.target.checked } : row))} />
                        Active
                      </label>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {activeSection === 'seo' && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-black text-slate-900">Search and metadata</h3>
            <p className="mt-1 text-sm text-slate-500">Control searchable names, titles, descriptions, and keyword hints.</p>

            <div className="mt-6 grid gap-4">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">SEO name</span>
                <input value={seo.seoName} onChange={(event) => setSeo((prev) => ({ ...prev, seoName: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="seo-friendly-product-name" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Page title</span>
                <input value={seo.pageTitle} onChange={(event) => setSeo((prev) => ({ ...prev, pageTitle: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Premium Espresso Beans | Buyzilo" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Meta description</span>
                <RichTextEditor value={seo.metaDescription} onChange={(value) => setSeo((prev) => ({ ...prev, metaDescription: value }))} output="text" placeholder="Concise search snippet for this product" minHeightClassName="min-h-[120px]" />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Meta keywords</span>
                <textarea rows={3} value={seo.metaKeywords} onChange={(event) => setSeo((prev) => ({ ...prev, metaKeywords: event.target.value }))} className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
              </label>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
