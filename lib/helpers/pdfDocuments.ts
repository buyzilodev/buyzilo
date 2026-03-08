import { NextResponse } from 'next/server'

type InvoiceItem = {
  id: string
  quantity: number
  price: number
  productName: string
  productSlug?: string | null
  variantTitle?: string | null
  storeName?: string | null
}

type InvoiceShipment = {
  status: string
  carrier?: string | null
  trackingNumber?: string | null
}

type InvoiceOrder = {
  id: string
  status: string
  total: number
  shippingAmount: number
  shippingMethodLabel?: string | null
  buyerName?: string | null
  buyerEmail?: string | null
  createdAt: Date
  shippingAddress?: unknown
  items: InvoiceItem[]
  shipments?: InvoiceShipment[]
}

type InvoiceDocumentInput = {
  title: string
  subtitle: string
  order: InvoiceOrder
  items?: InvoiceItem[]
  totalOverride?: number
  includeShipping?: boolean
  note?: string | null
}

type ShippingAddress = {
  name?: string | null
  email?: string | null
  phone?: string | null
  line1?: string | null
  line2?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  country?: string | null
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function parseShippingAddress(value: unknown): ShippingAddress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as ShippingAddress
}

function formatAddressLines(value: unknown) {
  const address = parseShippingAddress(value)
  const cityLine = [address.city, address.state, address.postal_code].filter(Boolean).join(', ')
  return [
    address.name,
    address.email,
    address.phone,
    address.line1,
    address.line2,
    cityLine,
    address.country,
  ].filter(Boolean) as string[]
}

export function buildInvoiceDocument(input: InvoiceDocumentInput) {
  const items = input.items ?? input.order.items
  const subtotal = Number(items.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2))
  const shippingAmount = input.includeShipping === false ? 0 : input.order.shippingAmount
  const total = input.totalOverride ?? Number((subtotal + shippingAmount).toFixed(2))
  const shipmentSummary = input.order.shipments?.[0]
  const addressLines = formatAddressLines(input.order.shippingAddress)
  const orderDate = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(input.order.createdAt)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(input.title)} ${escapeHtml(input.order.id)}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: Arial, Helvetica, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      padding: 32px;
    }
    .sheet {
      max-width: 920px;
      margin: 0 auto;
      background: white;
      border: 1px solid #cbd5e1;
      border-radius: 18px;
      padding: 32px;
    }
    .header, .meta, .totals, .footer {
      display: flex;
      justify-content: space-between;
      gap: 24px;
    }
    .title {
      font-size: 28px;
      font-weight: 800;
      margin: 0;
    }
    .subtitle {
      color: #475569;
      margin-top: 6px;
      font-size: 14px;
    }
    .section {
      margin-top: 28px;
    }
    .label {
      display: block;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 8px;
    }
    .value {
      font-size: 14px;
      line-height: 1.6;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      text-align: left;
      padding: 12px 10px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
      font-size: 14px;
    }
    th {
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 11px;
      color: #64748b;
    }
    .money, .qty {
      text-align: right;
      white-space: nowrap;
    }
    .totals {
      margin-top: 20px;
      align-items: flex-start;
    }
    .totals-card {
      min-width: 280px;
      margin-left: auto;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 16px 18px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 6px 0;
      font-size: 14px;
    }
    .totals-row.total {
      padding-top: 12px;
      margin-top: 8px;
      border-top: 1px solid #cbd5e1;
      font-weight: 800;
      font-size: 16px;
    }
    .note {
      margin-top: 20px;
      padding: 14px 16px;
      border: 1px solid #dbeafe;
      background: #eff6ff;
      color: #1d4ed8;
      border-radius: 14px;
      font-size: 13px;
      line-height: 1.6;
    }
    .status {
      display: inline-block;
      padding: 6px 10px;
      border-radius: 999px;
      background: #e2e8f0;
      font-size: 12px;
      font-weight: 700;
    }
    @media print {
      body { background: white; padding: 0; }
      .sheet { border: 0; border-radius: 0; padding: 0; max-width: none; }
    }
  </style>
</head>
<body>
  <main class="sheet">
    <section class="header">
      <div>
        <h1 class="title">${escapeHtml(input.title)}</h1>
        <div class="subtitle">${escapeHtml(input.subtitle)}</div>
      </div>
      <div>
        <span class="label">Order Status</span>
        <span class="status">${escapeHtml(input.order.status)}</span>
      </div>
    </section>

    <section class="section meta">
      <div>
        <span class="label">Order</span>
        <div class="value">#${escapeHtml(input.order.id)}<br/>Placed ${escapeHtml(orderDate)}</div>
      </div>
      <div>
        <span class="label">Customer</span>
        <div class="value">${escapeHtml(input.order.buyerName || input.order.buyerEmail || 'Guest')}</div>
      </div>
      <div>
        <span class="label">Shipping</span>
        <div class="value">${escapeHtml(input.order.shippingMethodLabel || 'Not set')}</div>
      </div>
    </section>

    <section class="section meta">
      <div>
        <span class="label">Ship To</span>
        <div class="value">${addressLines.length > 0 ? addressLines.map((line) => escapeHtml(line)).join('<br/>') : 'No shipping address recorded'}</div>
      </div>
      <div>
        <span class="label">Shipment</span>
        <div class="value">${shipmentSummary ? escapeHtml(shipmentSummary.status) : 'Pending'}${shipmentSummary?.carrier ? `<br/>Carrier: ${escapeHtml(shipmentSummary.carrier)}` : ''}${shipmentSummary?.trackingNumber ? `<br/>Tracking: ${escapeHtml(shipmentSummary.trackingNumber)}` : ''}</div>
      </div>
    </section>

    <section class="section">
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Store</th>
            <th class="qty">Qty</th>
            <th class="money">Unit Price</th>
            <th class="money">Line Total</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item) => `
            <tr>
              <td>${escapeHtml(item.productName)}${item.variantTitle ? `<br/><span style="color:#64748b;font-size:12px;">${escapeHtml(item.variantTitle)}</span>` : ''}</td>
              <td>${escapeHtml(item.storeName || '-')}</td>
              <td class="qty">${item.quantity}</td>
              <td class="money">${escapeHtml(formatCurrency(item.price))}</td>
              <td class="money">${escapeHtml(formatCurrency(item.price * item.quantity))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>

    <section class="totals">
      <div></div>
      <div class="totals-card">
        <div class="totals-row"><span>Subtotal</span><strong>${escapeHtml(formatCurrency(subtotal))}</strong></div>
        <div class="totals-row"><span>Shipping</span><strong>${escapeHtml(formatCurrency(shippingAmount))}</strong></div>
        <div class="totals-row total"><span>Total</span><strong>${escapeHtml(formatCurrency(total))}</strong></div>
      </div>
    </section>

    ${input.note ? `<section class="note">${escapeHtml(input.note)}</section>` : ''}

    <section class="section footer">
      <div class="value" style="color:#64748b;">Generated by Buyzilo on ${escapeHtml(new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date()))}</div>
    </section>
  </main>
</body>
</html>`
}

export function createInvoiceHtmlResponse(filename: string, html: string) {
  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
