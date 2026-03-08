import { AdminLayout } from '@/components/AdminLayout'
import { ProductWorkspace } from '@/components/product-system/ProductWorkspace'

export default function AdminNewProductPage() {
  return (
    <AdminLayout title="Create Product" subtitle="Structured product authoring workspace rebuilt from the old fragmented editor">
      <ProductWorkspace role="admin" mode="create" apiBasePath="/api/admin/products/editor" catalogHref="/admin/products" />
    </AdminLayout>
  )
}
