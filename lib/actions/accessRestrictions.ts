import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export type AccessRestrictionMode = 'AUTHENTICATED' | 'USER_GROUPS'
export type AccessRestrictionTarget = 'CATALOG' | 'CATEGORY' | 'PRODUCT' | 'STORE' | 'PAGE'

export type AccessRestrictionRule = {
  id: string
  name: string
  target: AccessRestrictionTarget
  value: string
  mode: AccessRestrictionMode
  allowedGroupIds: string[]
}

type AccessRestrictionsConfig = {
  rules: AccessRestrictionRule[]
}

export type AccessViewerContext = {
  userId: string | null
  isAuthenticated: boolean
  groupIds: string[]
}

export type AccessDecision = {
  allowed: boolean
  matchedRule: AccessRestrictionRule | null
}

const defaultConfig: AccessRestrictionsConfig = {
  rules: [],
}

export async function getAccessRestrictionsConfig(): Promise<AccessRestrictionsConfig> {
  const row = await prisma.siteSettings.findUnique({
    where: { key: 'accessRestrictionsConfig' },
  })

  if (!row?.value) {
    return defaultConfig
  }

  try {
    const parsed = JSON.parse(row.value) as Partial<AccessRestrictionsConfig>
    return {
      rules: Array.isArray(parsed.rules)
        ? parsed.rules
            .filter(
              (rule): rule is AccessRestrictionRule =>
                typeof rule?.id === 'string' &&
                typeof rule?.name === 'string' &&
                typeof rule?.target === 'string' &&
                typeof rule?.value === 'string' &&
                typeof rule?.mode === 'string' &&
                Array.isArray(rule?.allowedGroupIds)
            )
            .map((rule) => ({
              ...rule,
              value: rule.value.trim(),
              allowedGroupIds: rule.allowedGroupIds.filter((groupId) => typeof groupId === 'string' && groupId.trim()),
            }))
        : [],
    }
  } catch {
    return defaultConfig
  }
}

export async function getSessionAccessViewerContext(): Promise<AccessViewerContext> {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string } | null)?.id ?? null
  return getAccessViewerContext(userId)
}

export async function getAccessViewerContext(userId: string | null | undefined): Promise<AccessViewerContext> {
  if (!userId) {
    return {
      userId: null,
      isAuthenticated: false,
      groupIds: [],
    }
  }

  const memberships = await prisma.userGroupMembership.findMany({
    where: { userId },
    select: { groupId: true },
  })

  return {
    userId,
    isAuthenticated: true,
    groupIds: memberships.map((membership) => membership.groupId),
  }
}

function getRuleWeight(rule: AccessRestrictionRule) {
  switch (rule.target) {
    case 'PRODUCT':
    case 'STORE':
    case 'PAGE':
    case 'CATEGORY':
      return 2
    case 'CATALOG':
      return 1
    default:
      return 0
  }
}

function canViewerSatisfyRule(rule: AccessRestrictionRule, viewer: AccessViewerContext) {
  if (rule.mode === 'AUTHENTICATED') {
    return viewer.isAuthenticated
  }

  if (rule.mode === 'USER_GROUPS') {
    if (!viewer.isAuthenticated) {
      return false
    }
    if (rule.allowedGroupIds.length === 0) {
      return false
    }
    return rule.allowedGroupIds.some((groupId) => viewer.groupIds.includes(groupId))
  }

  return true
}

function getBestMatchingRule(rules: AccessRestrictionRule[], viewer: AccessViewerContext): AccessDecision {
  if (rules.length === 0) {
    return { allowed: true, matchedRule: null }
  }

  const ordered = [...rules].sort((left, right) => getRuleWeight(right) - getRuleWeight(left))
  const matchedRule = ordered[0] ?? null
  if (!matchedRule) {
    return { allowed: true, matchedRule: null }
  }

  return {
    allowed: canViewerSatisfyRule(matchedRule, viewer),
    matchedRule,
  }
}

export async function getCatalogAccessDecision(viewer: AccessViewerContext, categorySlug?: string | null) {
  const config = await getAccessRestrictionsConfig()
  const rules = config.rules.filter((rule) => {
    if (rule.target === 'CATEGORY' && categorySlug) {
      return rule.value === categorySlug
    }
    return rule.target === 'CATALOG' && rule.value === '*'
  })
  return getBestMatchingRule(rules, viewer)
}

export async function getProductAccessDecision(
  viewer: AccessViewerContext,
  input: { productSlug: string; categorySlug?: string | null }
) {
  const config = await getAccessRestrictionsConfig()
  const rules = config.rules.filter((rule) => {
    if (rule.target === 'PRODUCT') {
      return rule.value === input.productSlug
    }
    if (rule.target === 'CATEGORY' && input.categorySlug) {
      return rule.value === input.categorySlug
    }
    return rule.target === 'CATALOG' && rule.value === '*'
  })
  return getBestMatchingRule(rules, viewer)
}

export async function getStoreAccessDecision(viewer: AccessViewerContext, storeSlug: string) {
  const config = await getAccessRestrictionsConfig()
  const rules = config.rules.filter((rule) => rule.target === 'STORE' && rule.value === storeSlug)
  return getBestMatchingRule(rules, viewer)
}

export async function getPageAccessDecision(viewer: AccessViewerContext, pageSlug: string) {
  const config = await getAccessRestrictionsConfig()
  const rules = config.rules.filter((rule) => rule.target === 'PAGE' && rule.value === pageSlug)
  return getBestMatchingRule(rules, viewer)
}

export async function filterProductsByAccess<
  T extends {
    slug: string
    category?: { slug?: string | null } | null
  },
>(products: T[], viewer: AccessViewerContext) {
  const decisions = await Promise.all(
    products.map(async (product) => ({
      product,
      decision: await getProductAccessDecision(viewer, {
        productSlug: product.slug,
        categorySlug: product.category?.slug ?? null,
      }),
    }))
  )

  return decisions.filter((entry) => entry.decision.allowed).map((entry) => entry.product)
}

export async function filterStoresByAccess<
  T extends {
    slug: string
  },
>(stores: T[], viewer: AccessViewerContext) {
  const decisions = await Promise.all(
    stores.map(async (store) => ({
      store,
      decision: await getStoreAccessDecision(viewer, store.slug),
    }))
  )

  return decisions.filter((entry) => entry.decision.allowed).map((entry) => entry.store)
}
