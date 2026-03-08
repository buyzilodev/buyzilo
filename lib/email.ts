import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

interface OrderItem {
  name: string
  quantity: number
  price: number
}

interface SendWelcomeEmailParams {
  to: string
  name: string
}

interface SendOrderConfirmationParams {
  to: string
  name: string
  orderId: string
  items: OrderItem[]
  total: number
}

interface SendVendorOrderAlertParams {
  to: string
  storeName: string
  orderId: string
  items: OrderItem[]
  total: number
}

interface SendPasswordResetParams {
  to: string
  name: string
  resetLink: string
}

interface SendOrderDeliveredParams {
  to: string
  name: string
  orderId: string
}

interface SendBuyerDigestEmailParams {
  to: string
  name: string
  digest: {
    generatedAt: string
    summary: {
      unreadAlerts: number
      unreadRetentionNotifications?: number
      savedSearchesWithNewResults: number
      cartValue: number
      wishlistItems: number
      cartItems: number
      recentOrders: number
    }
  }
}

interface SendMarketingCampaignEmailParams {
  to: string
  subject: string
  html: string
}

interface SendGiftCertificateEmailParams {
  to: string
  recipientName: string
  senderName: string
  code: string
  amount: number
  message?: string
  expiresAt?: string | null
}

export async function sendWelcomeEmail({ to, name }: SendWelcomeEmailParams) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: '🎉 Welcome to Buyzilo!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2563eb, #7c3aed); padding: 40px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 32px;">Buyzilo</h1>
          <p style="color: #bfdbfe; margin: 8px 0 0;">Your marketplace for everything</p>
        </div>
        <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #1e293b;">Welcome, ${name}! 👋</h2>
          <p style="color: #64748b; line-height: 1.6;">
            Thank you for joining Buyzilo! We're excited to have you on board.
            Start exploring thousands of products from verified vendors.
          </p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #1e293b; margin: 0 0 12px;">What you can do:</h3>
            <p style="color: #64748b; margin: 4px 0;">🛍️ Browse thousands of products</p>
            <p style="color: #64748b; margin: 4px 0;">💳 Secure checkout with Stripe</p>
            <p style="color: #64748b; margin: 4px 0;">🏪 Become a vendor and start selling</p>
            <p style="color: #64748b; margin: 4px 0;">⭐ Leave reviews for products</p>
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/products"
            style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 8px;">
            Start Shopping →
          </a>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 32px;">
            © 2026 Buyzilo. All rights reserved.
          </p>
        </div>
      </div>
    `
  })
}

export async function sendOrderConfirmation({
  to, name, orderId, items, total
}: SendOrderConfirmationParams) {
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #f1f5f9;">${item.name}</td>
      <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px; border-bottom: 1px solid #f1f5f9; text-align: right; font-weight: bold;">$${item.price}</td>
    </tr>
  `).join('')

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `📦 Order Confirmed - ${orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0;">Buyzilo</h1>
        </div>
        <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 32px;">
            <div style="font-size: 48px;">🎉</div>
            <h2 style="color: #1e293b;">Order Confirmed!</h2>
            <p style="color: #64748b;">Hi ${name}, your order has been placed successfully.</p>
          </div>
          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="margin: 0; color: #64748b; font-size: 14px;">Order Number</p>
            <p style="margin: 4px 0 0; font-size: 20px; font-weight: bold; color: #2563eb;">${orderId}</p>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f8fafc;">
                <th style="padding: 12px; text-align: left; color: #64748b; font-size: 14px;">Product</th>
                <th style="padding: 12px; text-align: center; color: #64748b; font-size: 14px;">Qty</th>
                <th style="padding: 12px; text-align: right; color: #64748b; font-size: 14px;">Price</th>
              </tr>
            </thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div style="text-align: right; margin-top: 16px; padding-top: 16px; border-top: 2px solid #f1f5f9;">
            <span style="font-size: 18px; font-weight: bold; color: #2563eb;">Total: $${total}</span>
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
            style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 24px;">
            Track Your Order →
          </a>
        </div>
      </div>
    `
  })
}

export async function sendVendorOrderAlert({
  to, storeName, orderId, items, total
}: SendVendorOrderAlertParams) {
  const itemsHtml = items.map(item => `
    <p style="color: #1e293b; margin: 4px 0;">• ${item.name} x${item.quantity} — $${item.price}</p>
  `).join('')

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `💰 New Order Received - ${orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #7c3aed; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0;">Buyzilo Vendor</h1>
        </div>
        <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #1e293b;">💰 New Order for ${storeName}!</h2>
          <p style="color: #64748b;">You have received a new order. Please process it as soon as possible.</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0 0 8px; font-weight: bold; color: #1e293b;">Order: ${orderId}</p>
            ${itemsHtml}
            <p style="margin: 12px 0 0; font-weight: bold; color: #7c3aed;">Total: $${total}</p>
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/vendor"
            style="display: inline-block; background: #7c3aed; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            View Order →
          </a>
        </div>
      </div>
    `
  })
}

export async function sendOrderDelivered({ to, name, orderId }: SendOrderDeliveredParams) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `✅ Order Delivered - ${orderId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #16a34a; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0;">Buyzilo</h1>
        </div>
        <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <div style="text-align: center;">
            <div style="font-size: 64px;">📦</div>
            <h2 style="color: #1e293b;">Your Order Has Been Delivered!</h2>
            <p style="color: #64748b;">Hi ${name}, your order ${orderId} has been delivered successfully.</p>
          </div>
          <div style="background: #f0fdf4; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center;">
            <p style="color: #16a34a; font-weight: bold; margin: 0;">We hope you love your purchase! 🎉</p>
          </div>
          <div style="text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/products"
              style="display: inline-block; background: #16a34a; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Leave a Review ⭐
            </a>
          </div>
        </div>
      </div>
    `
  })
}

export async function sendPasswordReset({ to, name, resetLink }: SendPasswordResetParams) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: '🔐 Reset Your Password - Buyzilo',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #dc2626; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0;">Buyzilo</h1>
        </div>
        <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #1e293b;">Password Reset Request 🔐</h2>
          <p style="color: #64748b;">Hi ${name}, we received a request to reset your password.</p>
          <p style="color: #64748b;">Click the button below to reset your password. This link expires in 1 hour.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetLink}"
              style="display: inline-block; background: #dc2626; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
              Reset Password →
            </a>
          </div>
          <p style="color: #94a3b8; font-size: 12px;">
            If you didn't request this, please ignore this email. Your password will not be changed.
          </p>
        </div>
      </div>
    `
  })
}

export async function sendBuyerDigestEmail({ to, name, digest }: SendBuyerDigestEmailParams) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: 'Buyzilo Buyer Digest',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0f172a; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0;">Buyzilo Digest</h1>
        </div>
        <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #1e293b;">Hello ${name || 'Buyer'}</h2>
          <p style="color: #64748b;">Here is your latest buyer digest generated on ${new Date(digest.generatedAt).toLocaleString()}.</p>
          <div style="display: grid; gap: 12px; margin: 24px 0;">
            <div style="background: #f8fafc; border-radius: 8px; padding: 16px;">
              <strong>Unread alerts:</strong> ${digest.summary.unreadAlerts}
            </div>
            <div style="background: #f8fafc; border-radius: 8px; padding: 16px;">
              <strong>Retention notifications:</strong> ${digest.summary.unreadRetentionNotifications ?? 0}
            </div>
            <div style="background: #f8fafc; border-radius: 8px; padding: 16px;">
              <strong>Saved searches with new results:</strong> ${digest.summary.savedSearchesWithNewResults}
            </div>
            <div style="background: #f8fafc; border-radius: 8px; padding: 16px;">
              <strong>Wishlist / Cart:</strong> ${digest.summary.wishlistItems} / ${digest.summary.cartItems}
            </div>
            <div style="background: #f8fafc; border-radius: 8px; padding: 16px;">
              <strong>Cart value:</strong> $${digest.summary.cartValue.toFixed(2)}
            </div>
            <div style="background: #f8fafc; border-radius: 8px; padding: 16px;">
              <strong>Recent orders:</strong> ${digest.summary.recentOrders}
            </div>
          </div>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/digest"
            style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Open Buyer Digest
          </a>
        </div>
      </div>
    `,
  })
}

export async function sendMarketingCampaignEmail({ to, subject, html }: SendMarketingCampaignEmailParams) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  })
}

export async function sendGiftCertificateEmail({
  to,
  recipientName,
  senderName,
  code,
  amount,
  message,
  expiresAt,
}: SendGiftCertificateEmailParams) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `You received a Buyzilo gift certificate`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #111827, #2563eb); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0;">Buyzilo Gift Certificate</h1>
        </div>
        <div style="background: white; padding: 40px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <h2 style="color: #1e293b;">Hello ${recipientName}</h2>
          <p style="color: #64748b; line-height: 1.6;">
            ${senderName} sent you a Buyzilo gift certificate worth <strong>$${amount.toFixed(2)}</strong>.
          </p>
          ${message ? `<div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; color: #475569;">${message}</div>` : ''}
          <div style="background: #eff6ff; border-radius: 10px; padding: 20px; margin: 24px 0; text-align: center;">
            <p style="margin: 0; color: #64748b; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;">Gift certificate code</p>
            <p style="margin: 8px 0 0; font-size: 28px; font-weight: bold; color: #1d4ed8;">${code}</p>
            ${expiresAt ? `<p style="margin: 12px 0 0; color: #92400e; font-size: 13px;">Expires on ${new Date(expiresAt).toLocaleDateString()}</p>` : ''}
          </div>
          <p style="color: #64748b; line-height: 1.6;">
            Redeem the code inside your Buyzilo store-credit page after signing in.
          </p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/store-credit"
            style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-top: 16px;">
            Redeem gift certificate
          </a>
        </div>
      </div>
    `,
  })
}
