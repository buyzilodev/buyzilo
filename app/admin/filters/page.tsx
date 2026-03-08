import { AdminLayout } from '@/components/AdminLayout'
import { ProductSchemaManager } from '@/components/admin/ProductSchemaManager'
import { prisma } from '@/lib/prisma'

const defaultFilterSchema = JSON.stringify(
  [
    { key: 'price', type: 'range', label: 'Price' },
    { key: 'rating', type: 'rating', label: 'Rating' },
    { key: 'availability', type: 'boolean', label: 'In stock only' },
  ],
  null,
  2
)

export default async function AdminFiltersPage() {
  const setting = await prisma.siteSettings.findUnique({ where: { key: 'catalogFilterSchema' } })
  const initialRows = (() => {
    try {
      return setting?.value ? JSON.parse(setting.value) : JSON.parse(defaultFilterSchema)
    } catch {
      return JSON.parse(defaultFilterSchema)
    }
  })()

  return (
    <AdminLayout title="Catalog Filters" subtitle="Structured filter definitions for layered navigation and facet strategy">
      <ProductSchemaManager mode="filters" initialRows={initialRows} />
    </AdminLayout>
  )
}
