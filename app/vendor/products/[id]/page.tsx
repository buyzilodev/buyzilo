import { VendorLayout } from '@/components/vendor/VendorLayout'
import { ProductWorkspace } from '@/components/product-system/ProductWorkspace'

type VendorProductEditorPageProps = {
  params: {
    id: string
  }
}

export default function VendorProductEditorPage({ params }: VendorProductEditorPageProps) {
  return (
    <VendorLayout title="Edit Product" subtitle="Rebuilt vendor product workspace with structured catalog controls">
      <ProductWorkspace
        role="vendor"
        mode="edit"
        productId={params.id}
        apiBasePath="/api/vendor/products/editor"
        catalogHref="/vendor/products"
      />
    </VendorLayout>
  )
}
