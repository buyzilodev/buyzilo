import { VendorLayout } from '@/components/vendor/VendorLayout'
import { ProductWorkspace } from '@/components/product-system/ProductWorkspace'

export default function VendorNewProductPage() {
  return (
    <VendorLayout title="Create Product" subtitle="Professional vendor product workspace for content, variants, merchandising, and SEO">
      <ProductWorkspace role="vendor" mode="create" apiBasePath="/api/vendor/products/editor" catalogHref="/vendor/products" />
    </VendorLayout>
  )
}
