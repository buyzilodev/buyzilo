import { prisma } from '@/lib/prisma'

export type CategoryProductSchemaRule = {
  categoryId: string
  featureKeys: string[]
  filterKeys: string[]
}

function normalizeKeys(values: unknown) {
  return Array.isArray(values)
    ? values.map((value) => String(value).trim()).filter(Boolean)
    : []
}

export async function getCategoryProductSchemaConfig(): Promise<CategoryProductSchemaRule[]> {
  const row = await prisma.siteSettings.findUnique({
    where: { key: 'categoryProductSchemaConfig' },
  })

  if (!row?.value) {
    return []
  }

  try {
    const parsed = JSON.parse(row.value) as CategoryProductSchemaRule[]
    return Array.isArray(parsed)
      ? parsed.map((entry) => ({
          categoryId: String(entry.categoryId || '').trim(),
          featureKeys: normalizeKeys(entry.featureKeys),
          filterKeys: normalizeKeys(entry.filterKeys),
        })).filter((entry) => entry.categoryId)
      : []
  } catch {
    return []
  }
}

export async function saveCategoryProductSchemaRule(input: CategoryProductSchemaRule) {
  const current = await getCategoryProductSchemaConfig()
  const next = [
    ...current.filter((entry) => entry.categoryId !== input.categoryId),
    {
      categoryId: input.categoryId,
      featureKeys: normalizeKeys(input.featureKeys),
      filterKeys: normalizeKeys(input.filterKeys),
    },
  ]

  await prisma.siteSettings.upsert({
    where: { key: 'categoryProductSchemaConfig' },
    update: { value: JSON.stringify(next) },
    create: { key: 'categoryProductSchemaConfig', value: JSON.stringify(next) },
  })
}

export async function removeCategoryProductSchemaRule(categoryId: string) {
  const current = await getCategoryProductSchemaConfig()
  const next = current.filter((entry) => entry.categoryId !== categoryId)

  await prisma.siteSettings.upsert({
    where: { key: 'categoryProductSchemaConfig' },
    update: { value: JSON.stringify(next) },
    create: { key: 'categoryProductSchemaConfig', value: JSON.stringify(next) },
  })
}

export function buildEffectiveCategorySchemaMap(
  categories: Array<{ id: string; parentId: string | null }>,
  rules: CategoryProductSchemaRule[],
) {
  const ruleMap = new Map(rules.map((rule) => [rule.categoryId, rule]))
  const categoryMap = new Map(categories.map((category) => [category.id, category]))
  const resolved = new Map<string, CategoryProductSchemaRule>()

  function resolveCategory(categoryId: string): CategoryProductSchemaRule {
    const cached = resolved.get(categoryId)
    if (cached) return cached

    const category = categoryMap.get(categoryId)
    const ownRule = ruleMap.get(categoryId)
    if (!category) {
      const empty = { categoryId, featureKeys: [], filterKeys: [] }
      resolved.set(categoryId, empty)
      return empty
    }

    if (!category.parentId) {
      const rootRule = {
        categoryId,
        featureKeys: ownRule?.featureKeys ?? [],
        filterKeys: ownRule?.filterKeys ?? [],
      }
      resolved.set(categoryId, rootRule)
      return rootRule
    }

    const parentRule = resolveCategory(category.parentId)
    const nextRule = {
      categoryId,
      featureKeys: ownRule && ownRule.featureKeys.length > 0 ? ownRule.featureKeys : parentRule.featureKeys,
      filterKeys: ownRule && ownRule.filterKeys.length > 0 ? ownRule.filterKeys : parentRule.filterKeys,
    }
    resolved.set(categoryId, nextRule)
    return nextRule
  }

  for (const category of categories) {
    resolveCategory(category.id)
  }

  return resolved
}
