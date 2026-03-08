export const ORDER_STATUSES = [
  'PENDING',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
] as const

export const VENDOR_STATUSES = ['PENDING', 'APPROVED', 'BANNED'] as const
export const PRODUCT_APPROVAL_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]
export type VendorStatus = (typeof VENDOR_STATUSES)[number]
export type ProductApprovalStatus = (typeof PRODUCT_APPROVAL_STATUSES)[number]
