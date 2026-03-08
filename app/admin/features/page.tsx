import { AdminLayout } from '@/components/AdminLayout'
import { ProductSchemaManager } from '@/components/admin/ProductSchemaManager'
import { prisma } from '@/lib/prisma'

const defaultFeatureSchema = JSON.stringify(
  [
    { key: 'brand', label: 'Brand', type: 'text', required: false },
    { key: 'material', label: 'Material', type: 'text', required: false },
    { key: 'warranty', label: 'Warranty', type: 'text', required: false },
  ],
  null,
  2
)

export default async function AdminFeaturesPage() {
  const setting = await prisma.siteSettings.findUnique({ where: { key: 'productFeaturesSchema' } })
  const initialRows = (() => {
    try {
      return setting?.value ? JSON.parse(setting.value) : JSON.parse(defaultFeatureSchema)
    } catch {
      return JSON.parse(defaultFeatureSchema)
    }
  })()

  return (
    <AdminLayout title="Product Features" subtitle="Reusable feature templates for the rebuilt product workspace">
      <ProductSchemaManager mode="features" initialRows={initialRows} />
    </AdminLayout>
  )
}
