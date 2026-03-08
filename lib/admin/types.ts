export type DashboardRecentOrder = {
  id: string
  createdAt: string
  customer: string
  total: number
  status: string
}

export type DashboardTrendPoint = {
  day: string
  sales: number
}

export type DashboardTaskItem = {
  label: string
  count: number
  href: string
  tone: 'amber' | 'rose' | 'blue' | 'emerald' | 'violet' | 'slate'
  description: string
}

export type DashboardData = {
  totalSales: number
  totalOrders: number
  totalVendors: number
  activeProducts: number
  registeredCustomers: number
  completeOrders: number
  openOrders: number
  vendorSalesTotal: number
  overdueProcurement: number
  procurementAlertThreads: number
  loyaltyCoupons: number
  referredSignups: number
  outstandingStoreCredit: number
  recentOrders: DashboardRecentOrder[]
  salesTrend: DashboardTrendPoint[]
  operationsQueue: DashboardTaskItem[]
  merchandisingQueue: DashboardTaskItem[]
  contentQueue: DashboardTaskItem[]
}
