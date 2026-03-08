import { AdminLayout } from '@/components/AdminLayout'
import { SettingKeyEditor } from '@/components/admin/SettingKeyEditor'
import { prisma } from '@/lib/prisma'

const defaultOptionsSchema = JSON.stringify(
  [
    { key: 'size', label: 'Size', type: 'select', values: ['S', 'M', 'L', 'XL'] },
    { key: 'color', label: 'Color', type: 'select', values: ['Black', 'Blue', 'White'] },
  ],
  null,
  2
)

export default async function AdminOptionsPage() {
  const setting = await prisma.siteSettings.findUnique({ where: { key: 'productOptionsSchema' } })

  return (
    <AdminLayout title="Product Options" subtitle="Foundation for variants and selectable product options">
      <SettingKeyEditor
        settingKey="productOptionsSchema"
        label="Options Schema (JSON)"
        description="Define option groups available during product creation/editing."
        multiline
        initialValue={setting?.value ?? defaultOptionsSchema}
      />
    </AdminLayout>
  )
}
