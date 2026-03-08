import { NextResponse } from 'next/server'
import { buildEffectiveCategorySchemaMap, getCategoryProductSchemaConfig } from '@/lib/actions/categoryProductSchema'
import { getVendorCategoryFeeMap } from '@/lib/actions/vendorCategoryFees'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const parentId = searchParams.get('parentId') ?? undefined

    const categories = await prisma.category.findMany({
      where: parentId ? { parentId } : { parentId: null },
      include: {
        _count: { select: { products: true } },
        children: { select: { id: true, name: true, slug: true, image: true } },
      },
      orderBy: { name: 'asc' },
    })
    const feeMap = await getVendorCategoryFeeMap()
    const schemaConfig = await getCategoryProductSchemaConfig()
    const effectiveSchemaMap = buildEffectiveCategorySchemaMap(
      categories.map((category) => ({ id: category.id, parentId: category.parentId })),
      schemaConfig,
    )

    return NextResponse.json(
      categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        image: c.image,
        parentId: c.parentId,
        feePercent: feeMap.get(c.id) ?? 0,
        productCount: c._count.products,
        children: c.children,
        featureKeys: effectiveSchemaMap.get(c.id)?.featureKeys ?? [],
        filterKeys: effectiveSchemaMap.get(c.id)?.filterKeys ?? [],
      }))
    )
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
