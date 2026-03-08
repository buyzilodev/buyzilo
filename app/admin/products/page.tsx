import { AdminLayout } from '@/components/AdminLayout'
import { ProductCatalogManager } from '@/components/product-system/ProductCatalogManager'

export default function AdminProductsPage() {
  return (
    <AdminLayout title="Products" subtitle="Rebuilt product management workspace with professional catalog controls">
      <ProductCatalogManager
        title="Products"
        subtitle="Manage product records, moderation state, stock posture, and workspace access in one place."
        apiPath="/api/admin/products"
        createHref="/admin/products/new"
        editBaseHref="/admin/products"
      />
    </AdminLayout>
  )
}
