import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { getVendorCategoryFeeConfig, getVendorCategoryFeeMap } from '@/lib/actions/vendorCategoryFees'
import { getCategoryProductSchemaConfig, removeCategoryProductSchemaRule, saveCategoryProductSchemaRule } from '@/lib/actions/categoryProductSchema'
import { prisma } from '@/lib/prisma'
import { authOptions } from '@/lib/auth'

async function requireAdminOrManager() {
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string } | undefined)?.role
  return role === 'ADMIN' || role === 'MANAGER'
}

export async function GET() {
  try {
    if (!(await requireAdminOrManager())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    })
    const feeMap = await getVendorCategoryFeeMap()
    const schemaConfig = await getCategoryProductSchemaConfig()
    const schemaMap = new Map(schemaConfig.map((entry) => [entry.categoryId, entry]))
    return NextResponse.json(categories.map((category) => ({
      ...category,
      feePercent: feeMap.get(category.id) ?? 0,
      featureKeys: schemaMap.get(category.id)?.featureKeys ?? [],
      filterKeys: schemaMap.get(category.id)?.filterKeys ?? [],
    })))
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    if (!(await requireAdminOrManager())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { name, slug, image, icon, parentId, feePercent, featureKeys, filterKeys } = await req.json()

    const category = await prisma.category.create({
      data: { name, slug, image: image ?? icon ?? null, parentId: parentId || null }
    })

    const currentConfig = await getVendorCategoryFeeConfig()
    const nextConfig = [
      ...currentConfig.filter((entry) => entry.categoryId !== category.id),
      { categoryId: category.id, feePercent: Number(feePercent) || 0 },
    ]
    await prisma.siteSettings.upsert({
      where: { key: 'vendorCategoryFeeConfig' },
      update: { value: JSON.stringify(nextConfig) },
      create: { key: 'vendorCategoryFeeConfig', value: JSON.stringify(nextConfig) },
    })
    await saveCategoryProductSchemaRule({
      categoryId: category.id,
      featureKeys: Array.isArray(featureKeys) ? featureKeys : [],
      filterKeys: Array.isArray(filterKeys) ? filterKeys : [],
    })

    return NextResponse.json({ success: true, category: { ...category, feePercent: Number(feePercent) || 0, featureKeys: Array.isArray(featureKeys) ? featureKeys : [], filterKeys: Array.isArray(filterKeys) ? filterKeys : [] } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    if (!(await requireAdminOrManager())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id, name, slug, image, icon, parentId, feePercent, featureKeys, filterKeys } = await req.json()

    const category = await prisma.category.update({
      where: { id },
      data: { name, slug, image: image ?? icon ?? null, parentId: parentId || null }
    })

    const currentConfig = await getVendorCategoryFeeConfig()
    const nextConfig = [
      ...currentConfig.filter((entry) => entry.categoryId !== id),
      { categoryId: id, feePercent: Number(feePercent) || 0 },
    ]
    await prisma.siteSettings.upsert({
      where: { key: 'vendorCategoryFeeConfig' },
      update: { value: JSON.stringify(nextConfig) },
      create: { key: 'vendorCategoryFeeConfig', value: JSON.stringify(nextConfig) },
    })
    await saveCategoryProductSchemaRule({
      categoryId: id,
      featureKeys: Array.isArray(featureKeys) ? featureKeys : [],
      filterKeys: Array.isArray(filterKeys) ? filterKeys : [],
    })

    return NextResponse.json({ success: true, category: { ...category, feePercent: Number(feePercent) || 0, featureKeys: Array.isArray(featureKeys) ? featureKeys : [], filterKeys: Array.isArray(filterKeys) ? filterKeys : [] } })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    if (!(await requireAdminOrManager())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    let id = searchParams.get('id')

    if (!id) {
      try {
        const body = (await req.json()) as { id?: string }
        id = body.id ?? null
      } catch {
        id = null
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    await prisma.category.delete({ where: { id } })
    const currentConfig = await getVendorCategoryFeeConfig()
    const nextConfig = currentConfig.filter((entry) => entry.categoryId !== id)
    await prisma.siteSettings.upsert({
      where: { key: 'vendorCategoryFeeConfig' },
      update: { value: JSON.stringify(nextConfig) },
      create: { key: 'vendorCategoryFeeConfig', value: JSON.stringify(nextConfig) },
    })
    await removeCategoryProductSchemaRule(id)
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
