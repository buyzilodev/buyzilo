import { AdminLayout } from '@/components/AdminLayout'
import { ProductCatalogManager } from '@/components/product-system/ProductCatalogManager'
import { requireAnyAdminPermission } from '@/lib/admin/guards'
import { hasPermission } from '@/lib/permissions'

export default async function AdminProductsManagePage() {
  const identity = await requireAnyAdminPermission(['manage_products', 'approve_products'])
  const canManageProducts = hasPermission(identity.role, identity.permissions, 'manage_products')
  const canApproveProducts = hasPermission(identity.role, identity.permissions, 'approve_products')

  return (
    <AdminLayout title="Product Management" subtitle="Unified catalog workspace for platform products and vendor listings">
      <ProductCatalogManager
        title="Product Catalog"
        subtitle="Search, review, and open the new product workspace from one management surface."
        apiPath="/api/admin/products"
        createHref="/admin/products/new"
        editBaseHref="/admin/products"
        canCreate={canManageProducts}
        canBulkModerate={canManageProducts || canApproveProducts}
        quickLinks={[
          ...(canApproveProducts ? [{ href: '/admin/reviews/discussion', label: 'Discussion queue' }] : []),
          ...(canManageProducts ? [{ href: '/admin/products/quotes', label: 'Quote requests' }] : []),
        ]}
      />
    </AdminLayout>
  )
}
