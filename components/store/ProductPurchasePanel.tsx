'use client'

import { useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import ProductThumb from '@/components/ProductThumb'
import AddToCartButton from '@/components/store/AddToCartButton'
import StockAlertButton from '@/components/store/StockAlertButton'
import WishlistButton from '@/components/store/WishlistButton'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { formatUnitPricing, type UnitPricing } from '@/lib/helpers/unitPricing'

type ProductOption = {
  id: string
  name: string
  values: Array<{ id: string; value: string }>
}

type ProductVariant = {
  id: string
  title: string
  price: number | null
  comparePrice: number | null
  stock: number
  image: string | null
  isDefault: boolean
  selectedOptions: Record<string, string>
}

type ProductAttribute = {
  name: string
  displayType?: 'TEXT' | 'IMAGE' | 'COLOR'
  values: Array<{ label: string; value: string; image?: string | null }>
}

type ProductPurchasePanelProps = {
  productId: string
  productName: string
  productPrice: number
  comparePrice?: number | null
  productImage?: string
  storeName?: string
  productCategory?: string
  stock: number
  productType?: 'PHYSICAL' | 'DIGITAL'
  listingType?: 'FOR_SALE' | 'ORDINARY' | 'QUOTE_REQUEST' | 'LICENSE_KEYS'
  unitPricing?: UnitPricing | null
  options?: ProductOption[]
  variants?: ProductVariant[]
  customAttributes?: ProductAttribute[]
}

export default function ProductPurchasePanel({
  productId,
  productName,
  productPrice,
  comparePrice,
  productImage,
  storeName,
  productCategory,
  stock,
  productType = 'PHYSICAL',
  listingType = 'FOR_SALE',
  unitPricing,
  options = [],
  variants = [],
  customAttributes = [],
}: ProductPurchasePanelProps) {
  const { data: session } = useSession()
  const [quantity, setQuantity] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({})
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [quoteName, setQuoteName] = useState('')
  const [quoteEmail, setQuoteEmail] = useState('')
  const [quotePhone, setQuotePhone] = useState('')
  const [quoteMessage, setQuoteMessage] = useState('')
  const [quoteStatus, setQuoteStatus] = useState<{ type: 'idle' | 'error' | 'success'; message: string }>({ type: 'idle', message: '' })
  const [quoteSubmitting, setQuoteSubmitting] = useState(false)

  const activeVariants = useMemo(() => variants.filter((variant) => variant.stock >= 0), [variants])
  const hasVariants = options.length > 0 && activeVariants.length > 0
  const defaultVariant = activeVariants.find((variant) => variant.isDefault) ?? activeVariants[0] ?? null
  const resolvedSelections = useMemo(
    () => (Object.keys(selectedOptions).length > 0 ? selectedOptions : (defaultVariant?.selectedOptions ?? {})),
    [defaultVariant?.selectedOptions, selectedOptions]
  )

  const selectedVariant = useMemo(() => {
    if (!hasVariants) return null
    return (
      activeVariants.find((variant) =>
        options.every((option) => variant.selectedOptions?.[option.name] === resolvedSelections[option.name])
      ) ?? null
    )
  }, [activeVariants, hasVariants, options, resolvedSelections])

  const activeStock = selectedVariant?.stock ?? stock
  const activePrice = selectedVariant?.price ?? productPrice
  const activeComparePrice = selectedVariant?.comparePrice ?? comparePrice
  const activeImage = selectedVariant?.image ?? productImage
  const safeQuantity = Math.min(quantity, Math.max(1, activeStock || 1))
  const activeUnitPricing = formatUnitPricing(activePrice, unitPricing)
  const isDirectPurchase = listingType === 'FOR_SALE' || listingType === 'LICENSE_KEYS'
  const isQuoteRequest = listingType === 'QUOTE_REQUEST'
  const isOrdinaryListing = listingType === 'ORDINARY'
  const quoteIdentityName = (session?.user?.name ?? '').trim()
  const quoteIdentityEmail = (session?.user?.email ?? '').trim()
  const quoteReady = Boolean(
    (!isQuoteRequest || selectedVariant || !hasVariants) &&
    quoteMessage.trim() &&
    (quoteIdentityName || quoteName.trim()) &&
    (quoteIdentityEmail || quoteEmail.trim())
  )
  const attributeMap = useMemo(
    () =>
      new Map(
        customAttributes.map((attribute) => [
          attribute.name.trim().toLowerCase(),
          attribute,
        ])
      ),
    [customAttributes]
  )

  function isOptionValueSelectable(optionName: string, optionValue: string) {
    const candidateSelections = {
      ...resolvedSelections,
      [optionName]: optionValue,
    }

    return activeVariants.some((variant) =>
      options.every((option) => {
        const selection = candidateSelections[option.name]
        return !selection || variant.selectedOptions?.[option.name] === selection
      })
    )
  }

  async function submitQuoteRequest() {
    if (!quoteReady) {
      setQuoteStatus({
        type: 'error',
        message: 'Complete the quote message and buyer contact details first.',
      })
      return
    }

    setQuoteSubmitting(true)
    setQuoteStatus({ type: 'idle', message: '' })
    try {
      const response = await fetch('/api/quote-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          variantId: selectedVariant?.id ?? null,
          buyerName: quoteIdentityName || quoteName.trim(),
          buyerEmail: quoteIdentityEmail || quoteEmail.trim(),
          buyerPhone: quotePhone.trim() || undefined,
          message: quoteMessage.trim(),
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Unable to submit quote request')
      }

      setQuoteMessage('')
      setQuotePhone('')
      setQuoteStatus({
        type: 'success',
        message: 'Quote request sent. The seller can now respond from their product workspace.',
      })
    } catch (error) {
      setQuoteStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to submit quote request',
      })
    } finally {
      setQuoteSubmitting(false)
    }
  }

  if (activeStock < 1 && !hasVariants) {
    return <p className="text-sm font-semibold text-red-600">Out of stock</p>
  }

  return (
    <div className="space-y-3">
      {hasVariants && (
        <div className="space-y-3">
          {options.map((option) => {
            const attribute = attributeMap.get(option.name.trim().toLowerCase())
            const useSwatches = attribute?.displayType === 'COLOR' || attribute?.displayType === 'IMAGE'

            if (!attribute && option.values.length > 6) {
              return (
                <label key={option.id} className="block">
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{option.name}</span>
                  <select
                    value={resolvedSelections[option.name] ?? ''}
                    onChange={(event) => setSelectedOptions((prev) => ({ ...prev, [option.name]: event.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800"
                  >
                    <option value="">Select {option.name}</option>
                    {option.values.map((value) => (
                      <option key={value.id} value={value.value}>{value.value}</option>
                    ))}
                  </select>
                </label>
              )
            }

            return (
              <div key={option.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{option.name}</span>
                  <span className="text-xs font-semibold text-slate-400">{resolvedSelections[option.name] ?? 'Choose'}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {option.values.map((value) => {
                    const selected = resolvedSelections[option.name] === value.value
                    const selectable = isOptionValueSelectable(option.name, value.value)
                    const attributeValue = attribute?.values.find(
                      (item) =>
                        item.value.trim().toLowerCase() === value.value.trim().toLowerCase() ||
                        item.label.trim().toLowerCase() === value.value.trim().toLowerCase()
                    )

                    if (useSwatches) {
                      return (
                        <button
                          key={value.id}
                          type="button"
                          onClick={() => selectable && setSelectedOptions((prev) => ({ ...prev, [option.name]: value.value }))}
                          disabled={!selectable}
                          title={attributeValue?.label || value.value}
                          className={`group relative overflow-hidden rounded-2xl border p-1 transition ${
                            selected
                              ? 'border-slate-900 ring-2 ring-slate-900/10'
                              : 'border-slate-200 hover:border-slate-400'
                          } ${!selectable ? 'cursor-not-allowed opacity-40' : ''}`}
                        >
                          {attribute?.displayType === 'IMAGE' && attributeValue?.image ? (
                            <div className="h-16 w-16 overflow-hidden rounded-xl bg-white">
                              <ProductThumb src={attributeValue.image} alt={attributeValue.label} className="h-full w-full object-cover" />
                            </div>
                          ) : (
                            <div
                              className="h-10 w-10 rounded-xl border border-white/60"
                              style={{ backgroundColor: attributeValue?.value || value.value }}
                            />
                          )}
                          <span className="absolute inset-x-1 bottom-1 rounded-lg bg-white/90 px-1 py-0.5 text-[10px] font-semibold text-slate-700">
                            {attributeValue?.label || value.value}
                          </span>
                        </button>
                      )
                    }

                    return (
                      <button
                        key={value.id}
                        type="button"
                        onClick={() => selectable && setSelectedOptions((prev) => ({ ...prev, [option.name]: value.value }))}
                        disabled={!selectable}
                        className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                          selected
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        } ${!selectable ? 'cursor-not-allowed opacity-40' : ''}`}
                      >
                        {attributeValue?.label || value.value}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {selectedVariant ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
              <div className="flex items-center gap-3">
                {activeImage ? (
                  <div className="h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-white">
                    <ProductThumb src={activeImage} alt={selectedVariant.title} className="h-full w-full object-cover" />
                  </div>
                ) : null}
                <div>
                  <p className="font-semibold text-slate-800">{selectedVariant.title}</p>
                  <p className={selectedVariant.stock > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {selectedVariant.stock > 0 ? `${selectedVariant.stock} available` : 'Out of stock'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm font-semibold text-amber-600">Select all options to continue.</p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
        {isQuoteRequest ? (
          <p className="text-lg font-black text-slate-900">Price on request</p>
        ) : isOrdinaryListing ? (
          <p className="text-lg font-black text-slate-900">Ordinary listing</p>
        ) : (
          <>
            <p className="text-lg font-black text-slate-900">${activePrice.toFixed(2)}</p>
            {activeComparePrice != null && activeComparePrice > activePrice && (
              <p className="text-sm text-slate-400 line-through">${activeComparePrice.toFixed(2)}</p>
            )}
            {activeUnitPricing && (
              <p className="text-xs font-semibold text-slate-500">
                ${(activeUnitPricing.unitPrice).toFixed(2)} per {activeUnitPricing.label}
              </p>
            )}
          </>
        )}
        <p className="mt-1 text-xs font-semibold text-slate-500">
          {productType === 'DIGITAL'
            ? listingType === 'LICENSE_KEYS'
              ? 'Digital license-key fulfillment.'
              : 'Digital delivery after purchase.'
            : 'Physical fulfillment and shipping.'}
        </p>
      </div>

      {isDirectPurchase ? (
        <div className="flex items-center gap-2">
          <div className="flex items-center overflow-hidden rounded-full border border-slate-300 bg-white">
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              className="px-3 py-1.5 text-sm font-bold hover:bg-slate-50"
            >
              -
            </button>
            <span className="min-w-9 px-2 text-center text-sm font-semibold">{safeQuantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((value) => Math.min(Math.max(1, activeStock), value + 1))}
              className="px-3 py-1.5 text-sm font-bold hover:bg-slate-50"
            >
              +
            </button>
          </div>

          <AddToCartButton
            productId={productId}
            productName={productName}
            productPrice={activePrice}
            variantId={selectedVariant?.id}
            variantLabel={selectedVariant?.title}
            productImage={activeImage}
            storeName={storeName}
            unitPricing={unitPricing}
            productCategory={productCategory}
            quantity={safeQuantity}
            disabled={(hasVariants && !selectedVariant) || activeStock < 1}
            className="flex-1 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          />
          <WishlistButton
            productId={productId}
            productName={productName}
            variantId={selectedVariant?.id}
            variantLabel={selectedVariant?.title}
            className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          />
        </div>
      ) : isQuoteRequest ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-black text-slate-900">Request pricing from the seller</p>
              <p className="text-xs text-slate-500">
                Use this listing to send quantity, use case, or specification requirements directly.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setQuoteOpen((value) => !value)}
              className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {quoteOpen ? 'Hide form' : 'Request a quote'}
            </button>
          </div>

          {quoteOpen && (
            <div className="space-y-3">
              {!quoteIdentityName && (
                <input
                  value={quoteName}
                  onChange={(event) => setQuoteName(event.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800"
                />
              )}
              {!quoteIdentityEmail && (
                <input
                  value={quoteEmail}
                  onChange={(event) => setQuoteEmail(event.target.value)}
                  placeholder="Your email"
                  type="email"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800"
                />
              )}
              <input
                value={quotePhone}
                onChange={(event) => setQuotePhone(event.target.value)}
                placeholder="Phone number (optional)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800"
              />
              <RichTextEditor
                value={quoteMessage}
                onChange={setQuoteMessage}
                output="text"
                placeholder="Describe quantity, delivery expectations, custom requirements, or service scope."
                minHeightClassName="min-h-[120px]"
              />
              {quoteStatus.type !== 'idle' && (
                <p className={`text-sm font-semibold ${quoteStatus.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {quoteStatus.message}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void submitQuoteRequest()}
                  disabled={quoteSubmitting || !quoteReady}
                  className="rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {quoteSubmitting ? 'Sending...' : 'Send quote request'}
                </button>
                <WishlistButton
                  productId={productId}
                  productName={productName}
                  variantId={selectedVariant?.id}
                  variantLabel={selectedVariant?.title}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <a href="/dashboard/support" className="rounded-full bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
            {isQuoteRequest ? 'Request a quote' : 'Contact seller'}
          </a>
          <WishlistButton
            productId={productId}
            productName={productName}
            variantId={selectedVariant?.id}
            variantLabel={selectedVariant?.title}
            className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          />
        </div>
      )}

      {activeStock < 1 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-red-600">
            {hasVariants ? 'Selected variant is out of stock' : 'Out of stock'}
          </p>
          <StockAlertButton
            productId={productId}
            productName={productName}
            variantId={selectedVariant?.id}
            variantLabel={selectedVariant?.title}
            disabled={hasVariants && !selectedVariant}
          />
        </div>
      )}
    </div>
  )
}
