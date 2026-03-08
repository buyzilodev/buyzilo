import { AdminLayout } from '@/components/AdminLayout'
import { ProductWorkspace } from '@/components/product-system/ProductWorkspace'

type AdminProductEditorPageProps = {
  params: {
    id: string
  }
}

export default function AdminProductEditorPage({ params }: AdminProductEditorPageProps) {
  return (
    <AdminLayout title="Edit Product" subtitle="Professional product workspace for catalog, variants, content, and SEO">
      <ProductWorkspace
        role="admin"
        mode="edit"
        productId={params.id}
        apiBasePath="/api/admin/products/editor"
        catalogHref="/admin/products"
      />
    </AdminLayout>
  )
}
