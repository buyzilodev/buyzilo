import { VendorLayout } from '@/components/vendor/VendorLayout'
import { ProductCatalogManager } from '@/components/product-system/ProductCatalogManager'

export default function VendorProductsPage() {
  return (
    <VendorLayout title="Product Management" subtitle="Unified catalog workspace for your store listings">
      <ProductCatalogManager
        title="My Products"
        subtitle="Open the rebuilt product workspace, monitor approval state, and manage stock posture from one screen."
        apiPath="/api/vendor/products"
        createHref="/vendor/products/new"
        editBaseHref="/vendor/products"
      />
    </VendorLayout>
  )
}
