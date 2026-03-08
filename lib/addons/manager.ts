import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'
import packageJson from '@/package.json'
import { prisma } from '@/lib/prisma'
import type {
  AddonAdminPage,
  AddonAuditAction,
  AddonAuditEntry,
  AddonPackageApproval,
  AddonCatalogItem,
  AddonCompatibility,
  AddonConflictRule,
  AddonDeploymentReadiness,
  AddonDashboardWidget,
  AddonDocumentation,
  AddonHookDeclaration,
  AddonHookTraceEntry,
  AddonLifecycleTask,
  AddonManifest,
  AddonOverrideExecutionAction,
  AddonOverrideRequest,
  AddonOperators,
  AddonPackageTrust,
  AddonPackageVerification,
  AddonPrerequisite,
  AddonUpgradeMigration,
  AddonReleaseChannel,
  AddonRegistryEntry,
  AddonRuntimePreview,
  AddonRuntimePreviewEntry,
  AddonSchemeMeta,
  AddonSmokeTestCheck,
  AddonSmokeTestReport,
  AddonSettingsField,
  AddonSnapshot,
  AddonStorefrontPage,
  AddonStorefrontRuntimePreviewEntry,
  AddonStorefrontBlock,
  AddonVisibility,
} from '@/lib/addons/types'

const ADDON_REGISTRY_KEY = 'addonRegistry:v1'
const ADDON_PACKAGE_META_KEY = 'addonPackageMeta:v1'
const ADDON_TRUST_POLICY_KEY = 'addonTrustPolicy:v1'
const ADDON_CHANNEL_POLICY_KEY = 'addonChannelPolicy:v1'
const ADDON_SNAPSHOTS_KEY = 'addonSnapshots:v1'
const ADDON_AUDIT_LOG_KEY = 'addonAuditLog:v1'
const ADDON_OVERRIDE_REQUESTS_KEY = 'addonOverrideRequests:v1'
const ADDON_PACKAGES_DIR = path.join(process.cwd(), 'addons', 'packages')
const ADDON_RUNTIME_DIR = path.join(process.cwd(), 'addons', 'runtime')
const APP_VERSION = packageJson.version

type AddonRegistryMap = Record<string, AddonRegistryEntry>
type AddonPackageMetaMap = Record<
  string,
  {
    fingerprint: string
    uploadedAt: string
    verifiedAt: string
    sourceType: 'builtin' | 'uploaded'
    approvedAt?: string
    approvedBy?: string
    approvedFingerprint?: string
  }
>
type AddonTrustPolicyMap = Record<
  string,
  {
    fingerprint: string
    trustedAt: string
  }
>
type AddonAuditLogMap = Record<string, AddonAuditEntry[]>
type AddonOverrideRequestMap = Record<string, AddonOverrideRequest[]>
type AddonChannelPolicy = {
  allowBeta: boolean
  allowPrivate: boolean
  requireReady: boolean
  allowReadinessOverride: boolean
  overrideRoles: string[]
  requireOverrideApproval: boolean
}
type AddonOperatorIdentity = {
  id?: string
  role: string
  permissions: string[]
}
type AddonStorefrontViewer = {
  isAuthenticated: boolean
}

type AddonTemplateDefinition = {
  id: string
  label: string
  description: string
  category: string
  preset: 'marketing' | 'content' | 'operations' | 'integration'
  manifest: AddonManifest
}

type AddonTemplateInput = {
  addonId?: string
  name?: string
  description?: string
  adminHref?: string
  storefrontHref?: string
}

type AddonManifestCoreInput = {
  name?: string
  description?: string
  category?: string
  author?: string
  tags?: string[]
  adminHref?: string
  storefrontHref?: string
  docsHref?: string
  adminPageLabel?: string
  adminPageDescription?: string
  storefrontPageTitle?: string
  storefrontPageSubtitle?: string
  widgetTitle?: string
  widgetSubtitle?: string
  widgetHref?: string
  blockTitle?: string
  blockSubtitle?: string
  blockHref?: string
  settingsSchema?: {
    sections: Array<{
      id: string
      label: string
      description?: string
      fields: Array<{
        id: string
        label: string
        type: 'text' | 'textarea' | 'checkbox' | 'number' | 'select' | 'json' | 'url'
        description?: string
        defaultValue?: string | number | boolean | Record<string, unknown> | Array<unknown> | null
        options?: Array<{ value: string; label: string }>
        siteSettingKey?: string
      }>
    }>
  }
  releaseChannel?: AddonReleaseChannel
  releaseNotes?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function normalizeDocumentation(input: unknown): AddonDocumentation | undefined {
  if (!isRecord(input)) return undefined

  const screenshots = Array.isArray(input.screenshots)
    ? input.screenshots
        .filter((item) => isRecord(item) && typeof item.src === 'string')
        .map((item) => ({
          src: item.src as string,
          caption: typeof item.caption === 'string' ? item.caption : undefined,
        }))
    : undefined

  const documentation: AddonDocumentation = {
    readmePath: typeof input.readmePath === 'string' ? input.readmePath : undefined,
    readmeContent: typeof input.readmeContent === 'string' ? input.readmeContent : undefined,
    screenshots: screenshots?.length ? screenshots : undefined,
  }

  return documentation.readmePath || documentation.readmeContent || documentation.screenshots?.length
    ? documentation
    : undefined
}

function normalizeOperators(input: unknown): AddonOperators | undefined {
  if (!isRecord(input)) return undefined

  const operators: AddonOperators = {
    allowedRoles: Array.isArray(input.allowedRoles)
      ? input.allowedRoles.filter((item): item is string => typeof item === 'string')
      : undefined,
    requiredPermissions: Array.isArray(input.requiredPermissions)
      ? input.requiredPermissions.filter((item): item is string => typeof item === 'string')
      : undefined,
  }

  return operators.allowedRoles?.length || operators.requiredPermissions?.length ? operators : undefined
}

function normalizeVisibility(input: unknown): AddonVisibility | undefined {
  if (!isRecord(input)) return undefined

  const visibility: AddonVisibility = {
    roles: Array.isArray(input.roles)
      ? input.roles.filter((item): item is string => typeof item === 'string')
      : undefined,
    permissions: Array.isArray(input.permissions)
      ? input.permissions.filter((item): item is string => typeof item === 'string')
      : undefined,
    audiences: Array.isArray(input.audiences)
      ? input.audiences.filter((item): item is 'guest' | 'authenticated' => item === 'guest' || item === 'authenticated')
      : undefined,
  }

  return visibility.roles?.length || visibility.permissions?.length || visibility.audiences?.length
    ? visibility
    : undefined
}

function normalizeScheme(input: unknown): AddonSchemeMeta | undefined {
  if (!isRecord(input)) return undefined

  const editionType = Array.isArray(input.editionType)
    ? input.editionType.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : undefined
  const coreEditions = Array.isArray(input.coreEditions)
    ? input.coreEditions.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : undefined

  const scheme: AddonSchemeMeta = {
    format: input.format === 'addon.xml' ? 'addon.xml' : 'addon.json',
    priority: typeof input.priority === 'number' ? input.priority : undefined,
    status: input.status === 'active' ? 'active' : input.status === 'disabled' ? 'disabled' : undefined,
    defaultLanguage: typeof input.defaultLanguage === 'string' ? input.defaultLanguage : undefined,
    autoInstall: typeof input.autoInstall === 'boolean' ? input.autoInstall : undefined,
    editionType: editionType?.length ? editionType : undefined,
    supplier: typeof input.supplier === 'string' ? input.supplier : undefined,
    supplierLink: typeof input.supplierLink === 'string' ? input.supplierLink : undefined,
    coreVersion: typeof input.coreVersion === 'string' ? input.coreVersion : undefined,
    coreEditions: coreEditions?.length ? coreEditions : undefined,
  }

  return scheme
}

function normalizeHooks(input: unknown): AddonHookDeclaration[] | undefined {
  if (!Array.isArray(input)) return undefined

  const hooks = input
    .filter((item) => isRecord(item) && typeof item.id === 'string' && typeof item.name === 'string')
    .map((item) => ({
      id: item.id as string,
      name: item.name as string,
      type:
        item.type === 'php' || item.type === 'template' || item.type === 'schema' || item.type === 'event' || item.type === 'route'
          ? item.type
          : 'event',
      target: typeof item.target === 'string' ? item.target : undefined,
      description: typeof item.description === 'string' ? item.description : undefined,
    }))

  return hooks.length > 0 ? hooks : undefined
}

function normalizeLifecycleTasks(input: unknown): AddonLifecycleTask[] | undefined {
  if (!Array.isArray(input)) return undefined

  const tasks = input
    .filter((item) => isRecord(item) && typeof item.id === 'string' && typeof item.label === 'string' && typeof item.type === 'string')
    .map((item) => ({
      id: item.id as string,
      label: item.label as string,
      type:
        item.type === 'upsertSiteSetting' || item.type === 'deleteSiteSetting' || item.type === 'ensureDirectory'
          ? item.type
          : 'upsertSiteSetting',
      key: typeof item.key === 'string' ? item.key : undefined,
      value: item.value,
      path: typeof item.path === 'string' ? item.path : undefined,
      description: typeof item.description === 'string' ? item.description : undefined,
    }))

  return tasks.length > 0 ? tasks : undefined
}

function normalizeCompatibility(input: unknown): AddonCompatibility | undefined {
  if (!isRecord(input)) return undefined

  const addonVersionConstraints = isRecord(input.addonVersionConstraints)
      ? Object.fromEntries(
        Object.entries(input.addonVersionConstraints)
          .filter(([, value]) => isRecord(value))
          .map(([key, value]) => {
            const constraint = value as Record<string, unknown>
            return [
              key,
              {
                min: typeof constraint.min === 'string' ? constraint.min : undefined,
                max: typeof constraint.max === 'string' ? constraint.max : undefined,
              },
            ]
          })
      )
    : undefined

  const compatibility: AddonCompatibility = {
    minAppVersion: typeof input.minAppVersion === 'string' ? input.minAppVersion : undefined,
    maxAppVersion: typeof input.maxAppVersion === 'string' ? input.maxAppVersion : undefined,
    addonVersionConstraints:
      addonVersionConstraints && Object.keys(addonVersionConstraints).length > 0
        ? addonVersionConstraints
        : undefined,
  }

  return compatibility.minAppVersion || compatibility.maxAppVersion || compatibility.addonVersionConstraints
    ? compatibility
    : undefined
}

function normalizeConflicts(input: unknown): AddonConflictRule[] | undefined {
  if (!Array.isArray(input)) return undefined

  const conflicts = input
    .filter((item) => isRecord(item) && typeof item.addonId === 'string')
    .map((item) => ({
      addonId: (item.addonId as string).trim(),
      reason: typeof item.reason === 'string' ? item.reason : undefined,
      mode:
        item.mode === 'install' || item.mode === 'activate' || item.mode === 'both'
          ? item.mode
          : 'both',
    }))
    .filter((item) => item.addonId.length > 0)

  return conflicts.length > 0 ? conflicts : undefined
}

function normalizeRelease(input: unknown): AddonManifest['release'] | undefined {
  if (!isRecord(input)) return undefined
  return {
    channel: input.channel === 'beta' || input.channel === 'private' ? input.channel : 'stable',
    notes: typeof input.notes === 'string' ? input.notes : undefined,
  }
}

function normalizeDataGovernance(input: unknown): AddonManifest['dataGovernance'] | undefined {
  if (!isRecord(input)) return undefined
  const exportSiteSettings = Array.isArray(input.exportSiteSettings)
    ? input.exportSiteSettings.filter((item): item is string => typeof item === 'string')
    : undefined
  const cleanupSiteSettings = Array.isArray(input.cleanupSiteSettings)
    ? input.cleanupSiteSettings.filter((item): item is string => typeof item === 'string')
    : undefined
  const retentionNote = typeof input.retentionNote === 'string' ? input.retentionNote : undefined

  return exportSiteSettings?.length || cleanupSiteSettings?.length || retentionNote
    ? {
        exportSiteSettings,
        cleanupSiteSettings,
        retentionNote,
      }
    : undefined
}

function normalizeUpgradeMigrations(input: unknown): AddonUpgradeMigration[] | undefined {
  if (!Array.isArray(input)) return undefined

  const migrations = input
    .filter((item) => isRecord(item) && typeof item.toVersion === 'string')
    .map((item) => ({
      toVersion: item.toVersion as string,
      description: typeof item.description === 'string' ? item.description : undefined,
      seedSiteSettings: isRecord(item.seedSiteSettings) ? item.seedSiteSettings : undefined,
      removeSiteSettings: Array.isArray(item.removeSiteSettings)
        ? item.removeSiteSettings.filter((entry: unknown): entry is string => typeof entry === 'string')
        : undefined,
      setAddonSettings: isRecord(item.setAddonSettings) ? item.setAddonSettings : undefined,
      extensionMigrations: isRecord(item.extensionMigrations)
        ? {
            adminPages: Array.isArray(item.extensionMigrations.adminPages)
              ? item.extensionMigrations.adminPages.filter((entry: unknown): entry is string => typeof entry === 'string')
              : undefined,
            storefrontPages: Array.isArray(item.extensionMigrations.storefrontPages)
              ? item.extensionMigrations.storefrontPages.filter((entry: unknown): entry is string => typeof entry === 'string')
              : undefined,
            dashboardWidgets: Array.isArray(item.extensionMigrations.dashboardWidgets)
              ? item.extensionMigrations.dashboardWidgets.filter((entry: unknown): entry is string => typeof entry === 'string')
              : undefined,
            storefrontBlocks: Array.isArray(item.extensionMigrations.storefrontBlocks)
              ? item.extensionMigrations.storefrontBlocks.filter((entry: unknown): entry is string => typeof entry === 'string')
              : undefined,
            notes: typeof item.extensionMigrations.notes === 'string' ? item.extensionMigrations.notes : undefined,
          }
        : undefined,
    }))

  return migrations.length > 0
    ? migrations.sort((left, right) => compareVersions(left.toVersion, right.toVersion))
    : undefined
}

function isSafeRelativeAddonPath(relativePath: string) {
  return Boolean(relativePath) && !path.isAbsolute(relativePath) && !relativePath.includes('..')
}

function getAddonDir(addonId: string) {
  return path.join(ADDON_PACKAGES_DIR, addonId)
}

const APP_DIR = path.join(process.cwd(), 'app')

const ADDON_TEMPLATES: AddonTemplateDefinition[] = [
  {
    id: 'marketing-campaign',
    label: 'Marketing Campaign Addon',
    description: 'Scaffold a marketing-focused addon with admin page, dashboard widget, homepage block, and mapped settings.',
    category: 'Marketing',
    preset: 'marketing',
    manifest: {
      id: 'campaign-addon',
      name: 'Campaign Addon',
      version: '1.0.0',
      description: 'Reusable marketing addon scaffold.',
      category: 'Marketing',
      sourceType: 'uploaded',
      tags: ['template', 'marketing'],
      release: { channel: 'stable', notes: 'Template scaffold' },
      entrypoints: {
        adminPages: [
          {
            id: 'workspace',
            label: 'Campaign Workspace',
            href: '/admin/addons/campaign-addon',
            description: 'Manage campaign addon settings and operations.',
            title: 'Campaign Workspace',
          },
        ],
      },
      settings: {
        sections: [
          {
            id: 'general',
            label: 'General',
            fields: [
              {
                id: 'enabled',
                label: 'Enabled',
                type: 'checkbox',
                defaultValue: true,
                siteSettingKey: 'addon:campaign-addon:enabled',
              },
              {
                id: 'headline',
                label: 'Headline',
                type: 'text',
                defaultValue: 'Launch your next campaign',
                siteSettingKey: 'addon:campaign-addon:headline',
              },
            ],
          },
        ],
      },
      extensions: {
        dashboardWidgets: [
          {
            id: 'campaign-health',
            title: 'Campaign Health',
            subtitle: 'Track rollout posture for this addon',
            href: '/admin/addons/campaign-addon',
            tone: 'violet',
          },
        ],
        storefrontBlocks: [
          {
            id: 'campaign-hero',
            title: 'Campaign spotlight',
            subtitle: 'Rendered from addon-managed storefront content',
            href: '/campaigns/sample',
            page: 'home',
            tone: 'amber',
          },
        ],
      },
      dataGovernance: {
        exportSiteSettings: ['addon:campaign-addon:enabled', 'addon:campaign-addon:headline'],
        cleanupSiteSettings: ['addon:campaign-addon:enabled', 'addon:campaign-addon:headline'],
        retentionNote: 'Exports and cleans the scaffolded campaign settings.',
      },
    },
  },
  {
    id: 'content-knowledge',
    label: 'Content Knowledge Addon',
    description: 'Scaffold a content/help style addon with admin and storefront pages plus documentation settings.',
    category: 'Content',
    preset: 'content',
    manifest: {
      id: 'knowledge-addon',
      name: 'Knowledge Addon',
      version: '1.0.0',
      description: 'Reusable content addon scaffold.',
      category: 'Content',
      sourceType: 'uploaded',
      tags: ['template', 'content'],
      entrypoints: {
        adminPages: [
          {
            id: 'content-admin',
            label: 'Knowledge Manager',
            href: '/admin/addons/knowledge-addon',
            description: 'Manage knowledge-base style content.',
            title: 'Knowledge Manager',
          },
        ],
        storefrontPages: [
          {
            id: 'knowledge-home',
            href: '/knowledge-addon',
            title: 'Knowledge Center',
            subtitle: 'Public addon-powered content landing page.',
          },
        ],
      },
      settings: {
        sections: [
          {
            id: 'content',
            label: 'Content Settings',
            fields: [
              {
                id: 'publicTitle',
                label: 'Public Title',
                type: 'text',
                defaultValue: 'Knowledge Center',
                siteSettingKey: 'addon:knowledge-addon:title',
              },
            ],
          },
        ],
      },
      dataGovernance: {
        exportSiteSettings: ['addon:knowledge-addon:title'],
        cleanupSiteSettings: ['addon:knowledge-addon:title'],
      },
    },
  },
  {
    id: 'operations-queue',
    label: 'Operations Queue Addon',
    description: 'Scaffold an operations addon with admin workspace, queue widget, and operator-scoped settings.',
    category: 'Operations',
    preset: 'operations',
    manifest: {
      id: 'ops-addon',
      name: 'Operations Addon',
      version: '1.0.0',
      description: 'Reusable operations addon scaffold.',
      category: 'Operations',
      sourceType: 'uploaded',
      tags: ['template', 'operations'],
      operators: {
        requiredPermissions: ['manage_orders'],
      },
      entrypoints: {
        adminPages: [
          {
            id: 'ops-admin',
            label: 'Operations Queue',
            href: '/admin/addons/ops-addon',
            description: 'Queue-focused addon workspace.',
            title: 'Operations Queue',
          },
        ],
      },
      extensions: {
        dashboardWidgets: [
          {
            id: 'ops-queue',
            title: 'Operations Queue',
            subtitle: 'Pending addon workload',
            href: '/admin/addons/ops-addon',
            tone: 'emerald',
          },
        ],
      },
      settings: {
        sections: [
          {
            id: 'queue',
            label: 'Queue Settings',
            fields: [
              {
                id: 'queueName',
                label: 'Queue Name',
                type: 'text',
                defaultValue: 'Primary queue',
                siteSettingKey: 'addon:ops-addon:queueName',
              },
            ],
          },
        ],
      },
    },
  },
]

function getAddonChannel(manifest: AddonManifest): AddonReleaseChannel {
  return manifest.release?.channel ?? 'stable'
}

async function readAddonTextAsset(addonId: string, relativePath: string) {
  if (!isSafeRelativeAddonPath(relativePath)) return null
  const addonDir = getAddonDir(addonId)
  const targetPath = path.join(addonDir, relativePath)
  const resolved = path.resolve(targetPath)
  const base = path.resolve(addonDir)
  if (!resolved.startsWith(base)) return null
  try {
    return await fs.readFile(resolved, 'utf8')
  } catch {
    return null
  }
}

async function addonAssetExists(addonId: string, relativePath: string) {
  if (!isSafeRelativeAddonPath(relativePath)) return false
  const addonDir = getAddonDir(addonId)
  const targetPath = path.join(addonDir, relativePath)
  const resolved = path.resolve(targetPath)
  const base = path.resolve(addonDir)
  if (!resolved.startsWith(base)) return false
  try {
    await fs.access(resolved)
    return true
  } catch {
    return false
  }
}

async function hydrateManifestDocumentation(manifest: AddonManifest) {
  if (!manifest.documentation) return manifest

  const documentation: AddonDocumentation = { ...manifest.documentation }
  if (!documentation.readmeContent && documentation.readmePath) {
    documentation.readmeContent = (await readAddonTextAsset(manifest.id, documentation.readmePath)) ?? undefined
  }

  return {
    ...manifest,
    documentation,
  }
}

function evaluateAddonOperators(operators: AddonOperators | undefined, identity?: AddonOperatorIdentity) {
  if (!operators) {
    return {
      canOperate: true,
      operatorStatus: {
        roleAllowed: true,
        permissionsAllowed: true,
      },
    }
  }

  const roleAllowed = !operators.allowedRoles?.length || Boolean(identity && operators.allowedRoles.includes(identity.role))
  const permissionsAllowed =
    !operators.requiredPermissions?.length ||
    Boolean(identity && operators.requiredPermissions.every((permission) => identity.permissions.includes(permission)))

  return {
    canOperate: roleAllowed && permissionsAllowed,
    operatorStatus: {
      roleAllowed,
      permissionsAllowed,
    },
  }
}

function isVisibilityMatch(
  visibility: AddonVisibility | undefined,
  identity?: AddonOperatorIdentity,
  viewer?: AddonStorefrontViewer
) {
  if (!visibility) return true

  const roleAllowed = !visibility.roles?.length || Boolean(identity && visibility.roles.includes(identity.role))
  const permissionsAllowed =
    !visibility.permissions?.length ||
    Boolean(identity && visibility.permissions.every((permission) => identity.permissions.includes(permission)))

  const audienceAllowed =
    !visibility.audiences?.length ||
    Boolean(
      viewer &&
        visibility.audiences.includes(viewer.isAuthenticated ? 'authenticated' : 'guest')
    )

  return roleAllowed && permissionsAllowed && audienceAllowed
}

function normalizeRuntimePreviewVisibility(
  visibility: AddonVisibility | undefined
): {
  roles: string[]
  permissions: string[]
  audiences: Array<'guest' | 'authenticated'>
} {
  return {
    roles: visibility?.roles ?? [],
    permissions: visibility?.permissions ?? [],
    audiences: visibility?.audiences ?? [],
  }
}

function buildAdminRuntimePreviewEntry(
  item: { id: string; label: string; href: string; description?: string; visibility?: AddonVisibility },
  identity?: AddonOperatorIdentity
): AddonRuntimePreviewEntry {
  return {
    id: item.id,
    label: item.label,
    href: item.href,
    description: item.description,
    visible: isVisibilityMatch(item.visibility, identity),
    visibility: normalizeRuntimePreviewVisibility(item.visibility),
  }
}

function buildStorefrontRuntimePreviewEntry(
  item: { id: string; href: string; title?: string; subtitle?: string; description?: string; visibility?: AddonVisibility }
): AddonStorefrontRuntimePreviewEntry {
  return {
    id: item.id,
    label: item.title ?? item.id,
    href: item.href,
    description: item.subtitle ?? item.description,
    visible: true,
    guestVisible: isVisibilityMatch(item.visibility, undefined, { isAuthenticated: false }),
    authenticatedVisible: isVisibilityMatch(item.visibility, undefined, { isAuthenticated: true }),
    visibility: normalizeRuntimePreviewVisibility(item.visibility),
  }
}

function normalizeManifest(input: unknown): AddonManifest | null {
  if (!isRecord(input)) return null
  if (typeof input.id !== 'string' || !input.id.trim()) return null
  if (typeof input.name !== 'string' || !input.name.trim()) return null
  if (typeof input.version !== 'string' || !input.version.trim()) return null
  if (typeof input.description !== 'string') return null
  if (typeof input.category !== 'string' || !input.category.trim()) return null

  const settingsSections = Array.isArray((input.settings as Record<string, unknown> | undefined)?.sections)
    ? ((input.settings as { sections: unknown[] }).sections as unknown[])
        .filter((section) => isRecord(section) && typeof section.id === 'string' && typeof section.label === 'string' && Array.isArray(section.fields))
        .map((section) => {
          const sectionRecord = section as Record<string, unknown>
          return {
          id: sectionRecord.id as string,
          label: sectionRecord.label as string,
          description: typeof sectionRecord.description === 'string' ? sectionRecord.description : undefined,
          fields: ((sectionRecord.fields as unknown[]) ?? [])
            .filter((field) => isRecord(field) && typeof field.id === 'string' && typeof field.label === 'string' && typeof field.type === 'string')
            .map((field) => {
              const fieldRecord = field as Record<string, unknown>
              return {
              id: fieldRecord.id as string,
              label: fieldRecord.label as string,
              type: fieldRecord.type as AddonSettingsField['type'],
              description: typeof fieldRecord.description === 'string' ? fieldRecord.description : undefined,
              defaultValue: (fieldRecord.defaultValue ?? null) as AddonSettingsField['defaultValue'],
              options: Array.isArray(fieldRecord.options)
                ? (fieldRecord.options as unknown[])
                    .filter((option) => isRecord(option) && typeof option.value === 'string' && typeof option.label === 'string')
                    .map((option) => {
                      const optionRecord = option as Record<string, unknown>
                      return { value: optionRecord.value as string, label: optionRecord.label as string }
                    })
                : undefined,
              siteSettingKey: typeof fieldRecord.siteSettingKey === 'string' ? fieldRecord.siteSettingKey : undefined,
            }
            }),
        }
        })
    : []

  return {
    id: input.id.trim(),
    name: input.name.trim(),
    version: input.version.trim(),
    description: input.description,
    category: input.category.trim(),
    author: typeof input.author === 'string' ? input.author : undefined,
    icon: typeof input.icon === 'string' ? input.icon : undefined,
    sourceType: input.sourceType === 'uploaded' ? 'uploaded' : 'builtin',
    dependencies: Array.isArray(input.dependencies) ? input.dependencies.filter((item): item is string => typeof item === 'string') : [],
    tags: Array.isArray(input.tags) ? input.tags.filter((item): item is string => typeof item === 'string') : [],
    scheme: normalizeScheme(input.scheme),
    hooks: normalizeHooks(input.hooks),
    documentation: normalizeDocumentation(input.documentation),
    operators: normalizeOperators(input.operators),
    compatibility: normalizeCompatibility(input.compatibility),
    conflicts: normalizeConflicts(input.conflicts),
    exclusiveGroups: Array.isArray(input.exclusiveGroups)
      ? input.exclusiveGroups.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : undefined,
    release: normalizeRelease(input.release),
    dataGovernance: normalizeDataGovernance(input.dataGovernance),
    entrypoints: isRecord(input.entrypoints)
      ? {
          adminHref: typeof input.entrypoints.adminHref === 'string' ? input.entrypoints.adminHref : undefined,
          docsHref: typeof input.entrypoints.docsHref === 'string' ? input.entrypoints.docsHref : undefined,
          visibility: normalizeVisibility(input.entrypoints.visibility),
          adminPages: Array.isArray(input.entrypoints.adminPages)
            ? input.entrypoints.adminPages
                .filter((page) => isRecord(page) && typeof page.id === 'string' && typeof page.label === 'string' && typeof page.href === 'string')
                .map((page) => ({
                  id: page.id as string,
                  label: page.label as string,
                  href: page.href as string,
                  description: typeof page.description === 'string' ? page.description : undefined,
                  title: typeof page.title === 'string' ? page.title : undefined,
                  subtitle: typeof page.subtitle === 'string' ? page.subtitle : undefined,
                  inactiveTitle: typeof page.inactiveTitle === 'string' ? page.inactiveTitle : undefined,
                  inactiveDescription: typeof page.inactiveDescription === 'string' ? page.inactiveDescription : undefined,
                  visibility: normalizeVisibility(page.visibility),
                } satisfies AddonAdminPage))
            : undefined,
          storefrontPages: Array.isArray(input.entrypoints.storefrontPages)
            ? input.entrypoints.storefrontPages
                .filter((page) => isRecord(page) && typeof page.id === 'string' && typeof page.href === 'string')
                .map((page) => {
                  const pageRecord = page as Record<string, unknown>
                  return {
                    id: pageRecord.id as string,
                    href: pageRecord.href as string,
                    title: typeof pageRecord.title === 'string' ? pageRecord.title : undefined,
                    subtitle: typeof pageRecord.subtitle === 'string' ? pageRecord.subtitle : undefined,
                    inactiveTitle: typeof pageRecord.inactiveTitle === 'string' ? pageRecord.inactiveTitle : undefined,
                    inactiveDescription: typeof pageRecord.inactiveDescription === 'string' ? pageRecord.inactiveDescription : undefined,
                    visibility: normalizeVisibility(pageRecord.visibility),
                  } satisfies AddonStorefrontPage
                })
            : undefined,
        }
      : undefined,
    settings: settingsSections.length > 0 ? { sections: settingsSections } : undefined,
    extensions: {
      dashboardWidgets: Array.isArray(input.extensions && (input.extensions as Record<string, unknown>).dashboardWidgets)
        ? (((input.extensions as { dashboardWidgets: unknown[] }).dashboardWidgets) as unknown[])
            .filter((widget) => isRecord(widget) && typeof widget.id === 'string' && typeof widget.title === 'string' && typeof widget.subtitle === 'string' && typeof widget.href === 'string')
            .map((widget) => {
              const widgetRecord = widget as Record<string, unknown>
              return {
                id: widgetRecord.id as string,
                title: widgetRecord.title as string,
                subtitle: widgetRecord.subtitle as string,
                href: widgetRecord.href as string,
                tone: typeof widgetRecord.tone === 'string' ? widgetRecord.tone as AddonDashboardWidget['tone'] : 'slate',
                visibility: normalizeVisibility(widgetRecord.visibility),
              }
            })
        : undefined,
      storefrontBlocks: Array.isArray(input.extensions && (input.extensions as Record<string, unknown>).storefrontBlocks)
        ? (((input.extensions as { storefrontBlocks: unknown[] }).storefrontBlocks) as unknown[])
            .filter((block) => isRecord(block) && typeof block.id === 'string' && typeof block.title === 'string' && typeof block.subtitle === 'string' && typeof block.href === 'string')
            .map((block) => {
              const blockRecord = block as Record<string, unknown>
              return {
                id: blockRecord.id as string,
                title: blockRecord.title as string,
                subtitle: blockRecord.subtitle as string,
                href: blockRecord.href as string,
                page: (blockRecord.page as 'home' | undefined) ?? 'home',
                tone: typeof blockRecord.tone === 'string' ? blockRecord.tone as AddonStorefrontBlock['tone'] : 'slate',
                visibility: normalizeVisibility(blockRecord.visibility),
              }
            })
        : undefined,
    },
    lifecycle: isRecord(input.lifecycle)
      ? {
          install: isRecord(input.lifecycle.install)
            ? {
                seedSiteSettings: isRecord(input.lifecycle.install.seedSiteSettings)
                  ? input.lifecycle.install.seedSiteSettings
                  : undefined,
                prerequisites: Array.isArray(input.lifecycle.install.prerequisites)
                  ? input.lifecycle.install.prerequisites
                      .filter((item) => isRecord(item) && typeof item.id === 'string' && typeof item.label === 'string' && typeof item.type === 'string' && typeof item.key === 'string')
                      .map((item) => {
                        const itemRecord = item as Record<string, unknown>
                        return {
                          id: itemRecord.id as string,
                          label: itemRecord.label as string,
                          type: itemRecord.type as AddonPrerequisite['type'],
                          key: itemRecord.key as string,
                          description: typeof itemRecord.description === 'string' ? itemRecord.description : undefined,
                        }
                      })
                  : undefined,
                tasks: normalizeLifecycleTasks(input.lifecycle.install.tasks),
              }
            : undefined,
          upgrade: isRecord(input.lifecycle.upgrade)
            ? {
                migrations: normalizeUpgradeMigrations(input.lifecycle.upgrade.migrations),
              }
            : undefined,
          uninstall: isRecord(input.lifecycle.uninstall) && Array.isArray(input.lifecycle.uninstall.removeSiteSettings)
            ? {
                removeSiteSettings: input.lifecycle.uninstall.removeSiteSettings.filter((item): item is string => typeof item === 'string'),
                tasks: normalizeLifecycleTasks(input.lifecycle.uninstall.tasks),
              }
            : isRecord(input.lifecycle.uninstall)
              ? {
                  tasks: normalizeLifecycleTasks(input.lifecycle.uninstall.tasks),
                }
            : undefined,
        }
      : undefined,
  }
}

function decodeXmlText(value: string) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .trim()
}

function readXmlTag(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match ? decodeXmlText(match[1]) : undefined
}

function readXmlTags(xml: string, tag: string) {
  return Array.from(xml.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi'))).map((match) => decodeXmlText(match[1]))
}

function readXmlBoolean(xml: string, tag: string) {
  const value = readXmlTag(xml, tag)?.toLowerCase()
  if (!value) return undefined
  return value === 'true' || value === 'yes' || value === '1' || value === 'a'
}

function readXmlNumber(xml: string, tag: string) {
  const value = Number(readXmlTag(xml, tag) ?? '')
  return Number.isFinite(value) ? value : undefined
}

function readXmlBlock(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'))
  return match?.[1]
}

function parseAddonXmlManifest(contents: string, sourceType: 'builtin' | 'uploaded'): AddonManifest | null {
  const addonBody = readXmlBlock(contents, 'addon')
  if (!addonBody) return null

  const dependenciesBlock = readXmlBlock(addonBody, 'dependencies')
  const compatibilityBlock = readXmlBlock(addonBody, 'compatibility')
  const hooksBlock = readXmlBlock(addonBody, 'hooks')

  const manifest = normalizeManifest({
    id: readXmlTag(addonBody, 'id') ?? readXmlTag(addonBody, 'addon_id'),
    name: readXmlTag(addonBody, 'name'),
    version: readXmlTag(addonBody, 'version'),
    description: readXmlTag(addonBody, 'description') ?? '',
    category: readXmlTag(addonBody, 'category') ?? 'Add-ons',
    author: readXmlTag(addonBody, 'supplier'),
    sourceType,
    dependencies: dependenciesBlock ? readXmlTags(dependenciesBlock, 'item') : [],
    tags: readXmlTag(addonBody, 'tags')?.split(',').map((item) => item.trim()).filter(Boolean) ?? [],
    scheme: {
      format: 'addon.xml',
      priority: readXmlNumber(addonBody, 'priority'),
      status: readXmlTag(addonBody, 'status')?.toLowerCase() === 'active' || readXmlTag(addonBody, 'status') === 'A' ? 'active' : 'disabled',
      defaultLanguage: readXmlTag(addonBody, 'default_language'),
      autoInstall: readXmlBoolean(addonBody, 'auto_install'),
      editionType: readXmlTag(addonBody, 'edition_type')?.split(',').map((item) => item.trim()).filter(Boolean),
      supplier: readXmlTag(addonBody, 'supplier'),
      supplierLink: readXmlTag(addonBody, 'supplier_link'),
      coreVersion: compatibilityBlock ? readXmlTag(compatibilityBlock, 'core_version') : undefined,
      coreEditions: compatibilityBlock ? readXmlTags(compatibilityBlock, 'edition') : undefined,
    },
    compatibility: compatibilityBlock ? {
      minAppVersion: readXmlTag(compatibilityBlock, 'core_version'),
    } : undefined,
    hooks: hooksBlock ? [
      ...readXmlTags(hooksBlock, 'php').map((name, index) => ({
        id: `php-${index}-${name}`,
        name,
        type: 'php',
      })),
      ...readXmlTags(hooksBlock, 'template').map((name, index) => ({
        id: `template-${index}-${name}`,
        name,
        type: 'template',
      })),
      ...readXmlTags(hooksBlock, 'event').map((name, index) => ({
        id: `event-${index}-${name}`,
        name,
        type: 'event',
      })),
    ] : undefined,
  })

  return manifest
}

function toStoredString(value: unknown) {
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

function readStoredSetting(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function getDefaultSettings(manifest: AddonManifest) {
  const defaults: Record<string, unknown> = {}
  for (const section of manifest.settings?.sections ?? []) {
    for (const field of section.fields) {
      defaults[field.id] = field.defaultValue ?? (field.type === 'checkbox' ? false : '')
    }
  }
  return defaults
}

function getManifestAdminPages(manifest: AddonManifest) {
  return manifest.entrypoints?.adminPages?.length
    ? manifest.entrypoints.adminPages
    : manifest.entrypoints?.adminHref
      ? [{
          id: 'main',
          label: manifest.name,
          href: manifest.entrypoints.adminHref,
          description: `${manifest.name} workspace`,
          title: manifest.name,
          visibility: manifest.entrypoints.visibility,
        }]
      : []
}

function getManifestStorefrontPages(manifest: AddonManifest) {
  return manifest.entrypoints?.storefrontPages ?? []
}

function isValidAddonHref(href: string) {
  return href.startsWith('/')
}

function getRouteCandidateFiles(href: string) {
  const cleanHref = href.split('?')[0].split('#')[0]
  const segments = cleanHref.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
  const basePath = path.join(APP_DIR, ...segments)
  return [
    path.join(basePath, 'page.tsx'),
    path.join(basePath, 'page.ts'),
    path.join(basePath, 'route.ts'),
    path.join(basePath, 'route.tsx'),
  ]
}

async function routeExistsForHref(href: string) {
  if (!isValidAddonHref(href)) return false
  if (href === '/') {
    try {
      await fs.access(path.join(APP_DIR, 'page.tsx'))
      return true
    } catch {
      return false
    }
  }

  for (const candidate of getRouteCandidateFiles(href)) {
    try {
      await fs.access(candidate)
      return true
    } catch {
      continue
    }
  }
  return false
}

function collectSettingsSchemaIssues(manifest: AddonManifest) {
  const issues: string[] = []
  const sectionIds = new Set<string>()
  for (const section of manifest.settings?.sections ?? []) {
    if (sectionIds.has(section.id)) {
      issues.push(`Duplicate settings section id "${section.id}"`)
    }
    sectionIds.add(section.id)

    const fieldIds = new Set<string>()
    for (const field of section.fields) {
      if (fieldIds.has(field.id)) {
        issues.push(`Duplicate field id "${field.id}" in section "${section.id}"`)
      }
      fieldIds.add(field.id)

      if (!field.label.trim()) {
        issues.push(`Field "${field.id}" in section "${section.id}" is missing a label`)
      }
      if (field.type === 'select' && !(field.options?.length)) {
        issues.push(`Select field "${field.id}" in section "${section.id}" has no options`)
      }
    }
  }
  return issues
}

function parseVersion(version: string) {
  return version
    .replace(/^[^\d]*/, '')
    .split('.')
    .map((part) => Number.parseInt(part.replace(/\D.*$/, ''), 10) || 0)
}

function compareVersions(left: string, right: string) {
  const a = parseVersion(left)
  const b = parseVersion(right)
  const length = Math.max(a.length, b.length)
  for (let index = 0; index < length; index += 1) {
    const leftPart = a[index] ?? 0
    const rightPart = b[index] ?? 0
    if (leftPart > rightPart) return 1
    if (leftPart < rightPart) return -1
  }
  return 0
}

function getCompatibilityStatus(manifest: AddonManifest, registry: AddonRegistryMap) {
  const appSatisfied =
    (!manifest.compatibility?.minAppVersion || compareVersions(APP_VERSION, manifest.compatibility.minAppVersion) >= 0) &&
    (!manifest.compatibility?.maxAppVersion || compareVersions(APP_VERSION, manifest.compatibility.maxAppVersion) <= 0)

  const addonConstraints = Object.entries(manifest.compatibility?.addonVersionConstraints ?? {}).map(([addonId, constraint]) => {
    const installedVersion = registry[addonId]?.version
    const satisfied = Boolean(
      installedVersion &&
        (!constraint.min || compareVersions(installedVersion, constraint.min) >= 0) &&
        (!constraint.max || compareVersions(installedVersion, constraint.max) <= 0)
    )

    return {
      addonId,
      min: constraint.min,
      max: constraint.max,
      installedVersion,
      satisfied,
    }
  })

  return {
    appVersion: APP_VERSION,
    appSatisfied,
    addonConstraints,
  }
}

function getManifestValidationIssues(manifest: AddonManifest, manifests: AddonManifest[]) {
  const issues: string[] = []
  const otherManifests = manifests.filter((item) => item.id !== manifest.id)

  const adminPages = getManifestAdminPages(manifest)
  const storefrontPages = getManifestStorefrontPages(manifest)
  const widgetIds = new Set<string>()
  const blockIds = new Set<string>()

  for (const page of adminPages) {
    if (!isValidAddonHref(page.href)) {
      issues.push(`Invalid admin page route: ${page.href}`)
    }
    const conflict = otherManifests.some((item) => getManifestAdminPages(item).some((candidate) => candidate.href === page.href))
    if (conflict) {
      issues.push(`Duplicate admin route: ${page.href}`)
    }
  }

  for (const page of storefrontPages) {
    if (!isValidAddonHref(page.href)) {
      issues.push(`Invalid storefront page route: ${page.href}`)
    }
    const conflict = otherManifests.some((item) => getManifestStorefrontPages(item).some((candidate) => candidate.href === page.href))
    if (conflict) {
      issues.push(`Duplicate storefront route: ${page.href}`)
    }
  }

  for (const widget of manifest.extensions?.dashboardWidgets ?? []) {
    if (!isValidAddonHref(widget.href)) {
      issues.push(`Invalid dashboard widget route: ${widget.href}`)
    }
    if (widgetIds.has(widget.id)) {
      issues.push(`Duplicate dashboard widget id: ${widget.id}`)
    }
    widgetIds.add(widget.id)
  }

  for (const block of manifest.extensions?.storefrontBlocks ?? []) {
    if (!isValidAddonHref(block.href)) {
      issues.push(`Invalid storefront block route: ${block.href}`)
    }
    if (blockIds.has(block.id)) {
      issues.push(`Duplicate storefront block id: ${block.id}`)
    }
    blockIds.add(block.id)
  }

  const conflictIds = new Set<string>()
  for (const conflict of manifest.conflicts ?? []) {
    if (conflict.addonId === manifest.id) {
      issues.push(`Addon cannot conflict with itself: ${conflict.addonId}`)
    }
    if (conflictIds.has(conflict.addonId)) {
      issues.push(`Duplicate conflict rule: ${conflict.addonId}`)
    }
    if (!manifests.some((item) => item.id === conflict.addonId)) {
      issues.push(`Unknown conflicting addon: ${conflict.addonId}`)
    }
    conflictIds.add(conflict.addonId)
  }

  const exclusiveGroups = new Set<string>()
  for (const group of manifest.exclusiveGroups ?? []) {
    if (exclusiveGroups.has(group)) {
      issues.push(`Duplicate exclusive group: ${group}`)
    }
    exclusiveGroups.add(group)
  }

  return issues
}

function getEffectiveConflictRules(manifest: AddonManifest, manifests: AddonManifest[]) {
  const direct = manifest.conflicts ?? []
  const reverse = manifests
    .filter((candidate) => candidate.id !== manifest.id)
    .flatMap((candidate) =>
      (candidate.conflicts ?? [])
        .filter((rule) => rule.addonId === manifest.id)
        .map((rule) => ({
          addonId: candidate.id,
          reason: rule.reason,
          mode: rule.mode ?? 'both',
        }))
    )
  const exclusive = manifests
    .filter((candidate) => candidate.id !== manifest.id)
    .filter((candidate) =>
      (candidate.exclusiveGroups ?? []).some((group) => (manifest.exclusiveGroups ?? []).includes(group))
    )
    .map((candidate) => ({
      addonId: candidate.id,
      reason: `Mutually exclusive group: ${
        (candidate.exclusiveGroups ?? []).filter((group) => (manifest.exclusiveGroups ?? []).includes(group)).join(', ')
      }`,
      mode: 'activate' as const,
    }))

  const merged = new Map<string, { addonId: string; reason?: string; mode: 'install' | 'activate' | 'both' }>()
  for (const rule of [...direct, ...reverse, ...exclusive]) {
    const existing = merged.get(rule.addonId)
    const mode = rule.mode ?? 'both'
    if (!existing) {
      merged.set(rule.addonId, {
        addonId: rule.addonId,
        reason: rule.reason,
        mode,
      })
      continue
    }

    merged.set(rule.addonId, {
      addonId: rule.addonId,
      reason: existing.reason ?? rule.reason,
      mode:
        existing.mode === 'both' || mode === 'both' || existing.mode !== mode
          ? 'both'
          : existing.mode,
    })
  }

  return [...merged.values()]
}

function collectReplacementPlan(manifest: AddonManifest, manifests: AddonManifest[], registry: AddonRegistryMap) {
  const conflictStatus = getConflictStatus(manifest, manifests, registry)
  const deactivateChain = [...new Set(conflictStatus.activate.map((item) => item.addonId))]
  const blockers = deactivateChain.flatMap((addonId) => {
    const activeDependents = manifests
      .filter((candidate) => (candidate.dependencies ?? []).includes(addonId) && registry[candidate.id]?.status === 'active')
      .map((candidate) => candidate.name)

    return activeDependents.length > 0
      ? [`Disable dependents of ${addonId} first: ${activeDependents.join(', ')}`]
      : []
  })

  const effects = deactivateChain.map((addonId) => `Deactivate conflicting addon ${addonId}`)
  return {
    canReplace: deactivateChain.length > 0 && blockers.length === 0,
    deactivateChain,
    blockers,
    effects,
  }
}

function getConflictStatus(manifest: AddonManifest, manifests: AddonManifest[], registry: AddonRegistryMap) {
  const rules = getEffectiveConflictRules(manifest, manifests)
  const install = rules
    .map((rule) => ({
      addonId: rule.addonId,
      reason: rule.reason,
      mode: rule.mode,
      installed: Boolean(registry[rule.addonId]),
      active: registry[rule.addonId]?.status === 'active',
    }))
    .filter((rule) => rule.installed && (rule.mode === 'install' || rule.mode === 'both'))

  const activate = rules
    .map((rule) => ({
      addonId: rule.addonId,
      reason: rule.reason,
      mode: rule.mode,
      installed: Boolean(registry[rule.addonId]),
      active: registry[rule.addonId]?.status === 'active',
    }))
    .filter((rule) => rule.active && (rule.mode === 'activate' || rule.mode === 'both'))

  return { install, activate }
}

function formatConflictMessage(
  action: 'install' | 'activate' | 'upgrade',
  conflicts: Array<{ addonId: string; reason?: string; mode: 'install' | 'activate' | 'both' }>
) {
  const label = action === 'activate' ? 'activation' : action === 'upgrade' ? 'upgrade' : 'installation'
  return `Addon ${label} conflicts with: ${conflicts.map((item) => (
    item.reason ? `${item.addonId} (${item.reason})` : item.addonId
  )).join(', ')}`
}

function assertAddonConflicts(
  manifest: AddonManifest,
  manifests: AddonManifest[],
  registry: AddonRegistryMap,
  action: 'install' | 'activate' | 'upgrade'
) {
  const conflictStatus = getConflictStatus(manifest, manifests, registry)
  const relevant = action === 'install'
    ? conflictStatus.install
    : action === 'activate'
      ? conflictStatus.activate
      : [...new Map(
          [...conflictStatus.install, ...conflictStatus.activate].map((item) => [item.addonId, item])
        ).values()]

  if (relevant.length > 0) {
    throw new Error(formatConflictMessage(action, relevant))
  }
}

async function getSiteSettingsMap(keys: string[]) {
  if (keys.length === 0) return new Map<string, unknown>()
  const rows = await prisma.siteSettings.findMany({
    where: {
      key: { in: keys },
    },
  })
  return new Map(rows.map((row) => [row.key, readStoredSetting(row.value)]))
}

async function getAddonOwnedData(manifest: AddonManifest) {
  const exportSiteSettings = manifest.dataGovernance?.exportSiteSettings ?? []
  const cleanupSiteSettings = manifest.dataGovernance?.cleanupSiteSettings ?? []
  const retentionNote = manifest.dataGovernance?.retentionNote
  const siteSettings = await getSiteSettingsMap(exportSiteSettings)

  return {
    exportSiteSettings,
    cleanupSiteSettings,
    retentionNote,
    availableExportCount: exportSiteSettings.filter((key) => siteSettings.has(key)).length,
  }
}

function isPrerequisiteValuePresent(value: unknown) {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return !Number.isNaN(value)
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0
  return true
}

async function getAddonPrerequisiteStatus(manifest: AddonManifest, registryEntry?: AddonRegistryEntry) {
  const prerequisites = manifest.lifecycle?.install?.prerequisites ?? []
  if (prerequisites.length === 0) return []

  const siteSettingKeys = prerequisites.filter((item) => item.type === 'siteSetting').map((item) => item.key)
  const siteSettings = await getSiteSettingsMap(siteSettingKeys)

  return prerequisites.map((item) => {
    const value =
      item.type === 'siteSetting'
        ? siteSettings.get(item.key)
        : registryEntry?.settings?.[item.key]

    return {
      ...item,
      satisfied: isPrerequisiteValuePresent(value),
    }
  })
}

async function assertAddonInstallPrerequisites(manifest: AddonManifest, registryEntry?: AddonRegistryEntry) {
  const prerequisites = await getAddonPrerequisiteStatus(manifest, registryEntry)
  const missing = prerequisites.filter((item) => !item.satisfied)
  if (missing.length > 0) {
    throw new Error(`Missing prerequisites: ${missing.map((item) => item.label).join(', ')}`)
  }
}

function assertAddonCompatibility(manifest: AddonManifest, registry: AddonRegistryMap) {
  const compatibility = getCompatibilityStatus(manifest, registry)
  if (!compatibility.appSatisfied) {
    throw new Error(`Addon requires app version compatibility with ${manifest.compatibility?.minAppVersion ?? '*'} - ${manifest.compatibility?.maxAppVersion ?? '*'}`)
  }

  const incompatibleAddons = compatibility.addonConstraints.filter((item) => !item.satisfied)
  if (incompatibleAddons.length > 0) {
    throw new Error(`Incompatible addon dependency versions: ${incompatibleAddons.map((item) => item.addonId).join(', ')}`)
  }
}

async function getAddonPackageFingerprint(manifest: AddonManifest) {
  const addonDir = path.join(ADDON_PACKAGES_DIR, manifest.id)
  const assets = await collectAddonAssets(addonDir)
  return getAddonBundleFingerprint(manifest, assets)
}

function getAddonBundleFingerprint(manifest: AddonManifest, assets: Record<string, string>) {
  const payload = JSON.stringify({
    manifest,
    assets: Object.fromEntries(
      Object.entries(assets).sort(([left], [right]) => left.localeCompare(right))
    ),
  })
  return crypto.createHash('sha256').update(payload).digest('hex')
}

function getAddonVerificationStatus(
  manifest: AddonManifest,
  fingerprint: string,
  packageMetaEntry?: AddonPackageMetaMap[string]
): AddonPackageVerification {
  if (manifest.sourceType !== 'uploaded') {
    return {
      sourceType: 'builtin',
      fingerprint,
      status: 'builtin',
      verifiedAt: packageMetaEntry?.verifiedAt,
      uploadedAt: packageMetaEntry?.uploadedAt,
    }
  }

  if (!packageMetaEntry) {
    return {
      sourceType: 'uploaded',
      fingerprint,
      status: 'uploaded-untracked',
    }
  }

  return {
    sourceType: 'uploaded',
    fingerprint,
    verifiedAt: packageMetaEntry.verifiedAt,
    uploadedAt: packageMetaEntry.uploadedAt,
    status: packageMetaEntry.fingerprint === fingerprint ? 'verified-upload' : 'package-changed',
  }
}

function getAddonTrustStatus(
  manifest: AddonManifest,
  fingerprint: string,
  trustEntry?: AddonTrustPolicyMap[string]
): AddonPackageTrust {
  if (manifest.sourceType !== 'uploaded') {
    return {
      status: 'builtin',
      fingerprint,
    }
  }

  if (!trustEntry) {
    return {
      status: 'untrusted',
      fingerprint,
    }
  }

  return {
    status: trustEntry.fingerprint === fingerprint ? 'trusted' : 'trust-mismatch',
    fingerprint: trustEntry.fingerprint,
    trustedAt: trustEntry.trustedAt,
  }
}

function getAddonApprovalStatus(
  manifest: AddonManifest,
  fingerprint: string,
  packageMetaEntry?: AddonPackageMetaMap[string]
): AddonPackageApproval {
  if (manifest.sourceType !== 'uploaded') {
    return {
      status: 'builtin',
      fingerprint,
    }
  }

  if (!packageMetaEntry?.approvedAt || !packageMetaEntry?.approvedFingerprint) {
    return {
      status: 'unapproved',
      fingerprint,
    }
  }

  return {
    status: packageMetaEntry.approvedFingerprint === fingerprint ? 'approved' : 'approval-stale',
    fingerprint: packageMetaEntry.approvedFingerprint,
    approvedAt: packageMetaEntry.approvedAt,
    approvedBy: packageMetaEntry.approvedBy,
  }
}

async function getAddonDiagnostics(
  manifest: AddonManifest,
  manifests: AddonManifest[],
  registry: AddonRegistryMap,
  registryEntry: AddonRegistryEntry | undefined,
  verification: AddonPackageVerification,
  trust: AddonPackageTrust,
  approval: AddonPackageApproval
) {
  const adminPages = getManifestAdminPages(manifest)
  const storefrontPages = getManifestStorefrontPages(manifest)
  const dashboardWidgets = manifest.extensions?.dashboardWidgets ?? []
  const storefrontBlocks = manifest.extensions?.storefrontBlocks ?? []
  const hooks = manifest.hooks ?? []
  const settingsFields = (manifest.settings?.sections ?? []).flatMap((section) => section.fields)
  const mappedSettingCount = settingsFields.filter((field) => Boolean(field.siteSettingKey)).length
  const upgradeMigrationCount = manifest.lifecycle?.upgrade?.migrations?.length ?? 0
  const lifecycleTaskCount =
    (manifest.lifecycle?.install?.tasks?.length ?? 0) +
    (manifest.lifecycle?.uninstall?.tasks?.length ?? 0)
  const extensionMigrationCount = (manifest.lifecycle?.upgrade?.migrations ?? []).reduce((total, migration) => (
    total +
    (migration.extensionMigrations?.adminPages?.length ?? 0) +
    (migration.extensionMigrations?.storefrontPages?.length ?? 0) +
    (migration.extensionMigrations?.dashboardWidgets?.length ?? 0) +
    (migration.extensionMigrations?.storefrontBlocks?.length ?? 0)
  ), 0)
  const governedExportCount = manifest.dataGovernance?.exportSiteSettings?.length ?? 0
  const governedCleanupCount = manifest.dataGovernance?.cleanupSiteSettings?.length ?? 0
  const conflictStatus = getConflictStatus(manifest, manifests, registry)
  const hasReadme = Boolean(manifest.documentation?.readmeContent || manifest.documentation?.readmePath)
  const screenshotCount = manifest.documentation?.screenshots?.length ?? 0
  const prerequisites = await getAddonPrerequisiteStatus(manifest, registryEntry)
  const compatibility = getCompatibilityStatus(manifest, registry)
  const hookTrace = await getAddonHookTraceEntries(manifest, registryEntry?.status === 'active')

  const issues: string[] = []
  if (!hasReadme) issues.push('Missing package README')
  if (adminPages.length === 0 && storefrontPages.length === 0) issues.push('No registered addon pages')
  if (dashboardWidgets.length === 0 && storefrontBlocks.length === 0) issues.push('No extension surfaces declared')
  if (settingsFields.length > 0 && mappedSettingCount === 0) issues.push('Settings do not map to site settings')
  if (manifest.dataGovernance && governedExportCount === 0 && governedCleanupCount === 0 && !manifest.dataGovernance.retentionNote) {
    issues.push('Data governance declared without owned keys')
  }
  if (manifest.sourceType === 'uploaded' && screenshotCount === 0) issues.push('Uploaded package has no preview assets')
  if (prerequisites.some((item) => !item.satisfied)) issues.push('Missing install prerequisites')
  if (!compatibility.appSatisfied) issues.push('Incompatible app version')
  if (compatibility.addonConstraints.some((item) => !item.satisfied)) issues.push('Incompatible addon dependency version')
  if (conflictStatus.install.length > 0) issues.push('Conflicts with installed addons')
  if (conflictStatus.activate.length > 0) issues.push('Conflicts with active addons')
  if (hookTrace.some((hook) => hook.targetExists === false)) issues.push('Hook target routes are missing')
  if (verification.status === 'package-changed') issues.push('Uploaded package differs from verified bundle')
  if (verification.status === 'uploaded-untracked') issues.push('Uploaded package has no verification baseline')
  if (trust.status === 'untrusted') issues.push('Uploaded package is not trusted')
  if (trust.status === 'trust-mismatch') issues.push('Trusted fingerprint does not match current package')
  if (approval.status === 'unapproved') issues.push('Uploaded package is not approved')
  if (approval.status === 'approval-stale') issues.push('Approved fingerprint does not match current package')
  issues.push(...getManifestValidationIssues(manifest, manifests))

  return {
    adminPageCount: adminPages.length,
    storefrontPageCount: storefrontPages.length,
    dashboardWidgetCount: dashboardWidgets.length,
    storefrontBlockCount: storefrontBlocks.length,
    settingsFieldCount: settingsFields.length,
    mappedSettingCount,
    upgradeMigrationCount,
    extensionMigrationCount,
    governedExportCount,
    governedCleanupCount,
    conflictCount: manifest.conflicts?.length ?? 0,
    exclusiveGroupCount: manifest.exclusiveGroups?.length ?? 0,
    hookCount: hooks.length,
    lifecycleTaskCount,
    schemeFormat: manifest.scheme?.format ?? 'addon.json',
    hasReadme,
    screenshotCount,
    health: issues.length === 0 ? 'healthy' as const : 'warning' as const,
    issues,
    prerequisites,
    compatibility,
    conflicts: getEffectiveConflictRules(manifest, manifests).map((rule) => ({
      addonId: rule.addonId,
      reason: rule.reason,
      mode: rule.mode,
      installed: Boolean(registry[rule.addonId]),
      active: registry[rule.addonId]?.status === 'active',
    })),
  }
}

async function ensurePackagesDirectory() {
  await fs.mkdir(ADDON_PACKAGES_DIR, { recursive: true })
}

function getAddonRuntimePath(addonId: string, relativePath: string) {
  if (!relativePath || path.isAbsolute(relativePath) || relativePath.includes('..')) {
    throw new Error(`Unsafe addon runtime path "${relativePath}"`)
  }
  return path.join(ADDON_RUNTIME_DIR, addonId, relativePath)
}

async function runAddonLifecycleTasks(addonId: string, tasks: AddonLifecycleTask[] | undefined) {
  for (const task of tasks ?? []) {
    if (task.type === 'upsertSiteSetting') {
      if (!task.key) {
        throw new Error(`Lifecycle task "${task.id}" is missing key`)
      }
      await prisma.siteSettings.upsert({
        where: { key: task.key },
        update: { value: toStoredString(task.value ?? null) },
        create: { key: task.key, value: toStoredString(task.value ?? null) },
      })
      continue
    }

    if (task.type === 'deleteSiteSetting') {
      if (!task.key) {
        throw new Error(`Lifecycle task "${task.id}" is missing key`)
      }
      await prisma.siteSettings.deleteMany({
        where: { key: task.key },
      })
      continue
    }

    if (!task.path) {
      throw new Error(`Lifecycle task "${task.id}" is missing path`)
    }
    await fs.mkdir(getAddonRuntimePath(addonId, task.path), { recursive: true })
  }
}

function inferHookScope(target?: string): AddonHookTraceEntry['scope'] {
  if (!target) return 'system'
  if (target.startsWith('/admin')) return 'admin'
  if (target.startsWith('/')) return 'storefront'
  return 'system'
}

async function getAddonHookTraceEntries(
  manifest: AddonManifest,
  active: boolean
): Promise<AddonHookTraceEntry[]> {
  return Promise.all(
    (manifest.hooks ?? []).map(async (hook) => {
      const targetExists =
        hook.target && hook.target.startsWith('/') ? await routeExistsForHref(hook.target) : null

      return {
        addonId: manifest.id,
        addonName: manifest.name,
        ...hook,
        active,
        scope: inferHookScope(hook.target),
        targetExists,
        status: !active ? 'inactive' : targetExists === false ? 'missing-target' : 'bound',
      }
    })
  )
}

async function collectAddonAssets(addonDir: string, baseDir = addonDir) {
  const entries = await fs.readdir(addonDir, { withFileTypes: true })
  const assets: Record<string, string> = {}

  for (const entry of entries) {
    const fullPath = path.join(addonDir, entry.name)
    if (entry.isDirectory()) {
      Object.assign(assets, await collectAddonAssets(fullPath, baseDir))
      continue
    }
    if (entry.name === 'addon.json') continue
    const relativePath = path.relative(baseDir, fullPath).replaceAll('\\', '/')
    assets[relativePath] = await fs.readFile(fullPath, 'utf8')
  }

  return assets
}

async function writeAddonAssets(addonDir: string, assets: Record<string, string>) {
  await Promise.all(
    Object.entries(assets).map(async ([relativePath, contents]) => {
      const targetPath = path.join(addonDir, relativePath)
      await fs.mkdir(path.dirname(targetPath), { recursive: true })
      await fs.writeFile(targetPath, contents, 'utf8')
    })
  )
}

async function readPackageMeta(): Promise<AddonPackageMetaMap> {
  const row = await prisma.siteSettings.findUnique({
    where: { key: ADDON_PACKAGE_META_KEY },
  })
  if (!row) return {}
  try {
    const parsed = JSON.parse(row.value) as AddonPackageMetaMap
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

async function writePackageMeta(packageMeta: AddonPackageMetaMap) {
  await prisma.siteSettings.upsert({
    where: { key: ADDON_PACKAGE_META_KEY },
    update: { value: JSON.stringify(packageMeta) },
    create: { key: ADDON_PACKAGE_META_KEY, value: JSON.stringify(packageMeta) },
  })
}

async function readTrustPolicy(): Promise<AddonTrustPolicyMap> {
  const row = await prisma.siteSettings.findUnique({
    where: { key: ADDON_TRUST_POLICY_KEY },
  })
  if (!row) return {}
  try {
    const parsed = JSON.parse(row.value) as AddonTrustPolicyMap
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

async function writeTrustPolicy(policy: AddonTrustPolicyMap) {
  await prisma.siteSettings.upsert({
    where: { key: ADDON_TRUST_POLICY_KEY },
    update: { value: JSON.stringify(policy) },
    create: { key: ADDON_TRUST_POLICY_KEY, value: JSON.stringify(policy) },
  })
}

async function readAuditLog(): Promise<AddonAuditLogMap> {
  const row = await prisma.siteSettings.findUnique({
    where: { key: ADDON_AUDIT_LOG_KEY },
  })
  if (!row) return {}
  try {
    const parsed = JSON.parse(row.value) as AddonAuditLogMap
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

async function writeAuditLog(auditLog: AddonAuditLogMap) {
  await prisma.siteSettings.upsert({
    where: { key: ADDON_AUDIT_LOG_KEY },
    update: { value: JSON.stringify(auditLog) },
    create: { key: ADDON_AUDIT_LOG_KEY, value: JSON.stringify(auditLog) },
  })
}

async function readOverrideRequests(): Promise<AddonOverrideRequestMap> {
  const row = await prisma.siteSettings.findUnique({
    where: { key: ADDON_OVERRIDE_REQUESTS_KEY },
  })
  if (!row) return {}
  try {
    const parsed = JSON.parse(row.value) as AddonOverrideRequestMap
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

async function writeOverrideRequests(requests: AddonOverrideRequestMap) {
  await prisma.siteSettings.upsert({
    where: { key: ADDON_OVERRIDE_REQUESTS_KEY },
    update: { value: JSON.stringify(requests) },
    create: { key: ADDON_OVERRIDE_REQUESTS_KEY, value: JSON.stringify(requests) },
  })
}

async function readChannelPolicy(): Promise<AddonChannelPolicy> {
  const row = await prisma.siteSettings.findUnique({
    where: { key: ADDON_CHANNEL_POLICY_KEY },
  })
  if (!row) {
    return {
      allowBeta: false,
      allowPrivate: false,
      requireReady: false,
      allowReadinessOverride: true,
      overrideRoles: ['ADMIN', 'MANAGER'],
      requireOverrideApproval: true,
    }
  }
  try {
    const parsed = JSON.parse(row.value) as Partial<AddonChannelPolicy>
    return {
      allowBeta: Boolean(parsed.allowBeta),
      allowPrivate: Boolean(parsed.allowPrivate),
      requireReady: Boolean(parsed.requireReady),
      allowReadinessOverride: parsed.allowReadinessOverride !== false,
      overrideRoles: Array.isArray(parsed.overrideRoles)
        ? parsed.overrideRoles.filter((item): item is string => typeof item === 'string')
        : ['ADMIN', 'MANAGER'],
      requireOverrideApproval: parsed.requireOverrideApproval !== false,
    }
  } catch {
    return {
      allowBeta: false,
      allowPrivate: false,
      requireReady: false,
      allowReadinessOverride: true,
      overrideRoles: ['ADMIN', 'MANAGER'],
      requireOverrideApproval: true,
    }
  }
}

async function writeChannelPolicy(policy: AddonChannelPolicy) {
  await prisma.siteSettings.upsert({
    where: { key: ADDON_CHANNEL_POLICY_KEY },
    update: { value: JSON.stringify(policy) },
    create: { key: ADDON_CHANNEL_POLICY_KEY, value: JSON.stringify(policy) },
  })
}

function isChannelAllowed(channel: AddonReleaseChannel, policy: AddonChannelPolicy) {
  if (channel === 'beta') return policy.allowBeta
  if (channel === 'private') return policy.allowPrivate
  return true
}

function canUseReadinessOverride(policy: AddonChannelPolicy, identity?: AddonOperatorIdentity) {
  if (!policy.allowReadinessOverride) return false
  if (!identity) return false
  return policy.overrideRoles.includes(identity.role)
}

function getPlanActionForExecutionAction(action: AddonOverrideExecutionAction): 'install' | 'activate' | 'upgrade' {
  if (action === 'upgrade') return 'upgrade'
  if (action === 'install' || action === 'resolve-install' || action === 'resolve-replace-install') {
    return 'install'
  }
  return 'activate'
}

async function appendAddonAuditEntry(
  addonId: string,
  action: AddonAuditAction,
  identity: AddonOperatorIdentity | undefined,
  details?: Record<string, unknown>
) {
  const auditLog = await readAuditLog()
  const entry: AddonAuditEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    addonId,
    action,
    createdAt: new Date().toISOString(),
    operatorId: identity?.id ?? 'system',
    operatorRole: identity?.role ?? 'system',
    details,
  }
  auditLog[addonId] = [entry, ...(auditLog[addonId] ?? [])].slice(0, 20)
  await writeAuditLog(auditLog)
}

async function readRegistry(): Promise<AddonRegistryMap> {
  const row = await prisma.siteSettings.findUnique({
    where: { key: ADDON_REGISTRY_KEY },
  })
  if (!row) return {}
  try {
    const parsed = JSON.parse(row.value) as AddonRegistryMap
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

async function writeRegistry(registry: AddonRegistryMap) {
  await prisma.siteSettings.upsert({
    where: { key: ADDON_REGISTRY_KEY },
    update: { value: JSON.stringify(registry) },
    create: { key: ADDON_REGISTRY_KEY, value: JSON.stringify(registry) },
  })
}

async function readSnapshots(): Promise<Record<string, AddonSnapshot[]>> {
  const row = await prisma.siteSettings.findUnique({
    where: { key: ADDON_SNAPSHOTS_KEY },
  })
  if (!row) return {}
  try {
    const parsed = JSON.parse(row.value) as Record<string, AddonSnapshot[]>
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

async function writeSnapshots(snapshots: Record<string, AddonSnapshot[]>) {
  await prisma.siteSettings.upsert({
    where: { key: ADDON_SNAPSHOTS_KEY },
    update: { value: JSON.stringify(snapshots) },
    create: { key: ADDON_SNAPSHOTS_KEY, value: JSON.stringify(snapshots) },
  })
}

async function syncMappedSiteSettings(manifest: AddonManifest, settings: Record<string, unknown>) {
  const updates: Array<Promise<unknown>> = []
  for (const section of manifest.settings?.sections ?? []) {
    for (const field of section.fields) {
      if (!field.siteSettingKey) continue
      const value = settings[field.id]
      updates.push(
        prisma.siteSettings.upsert({
          where: { key: field.siteSettingKey },
          update: { value: toStoredString(value) },
          create: { key: field.siteSettingKey, value: toStoredString(value) },
        })
      )
    }
  }
  await Promise.all(updates)
}

async function applyInstallSeeds(manifest: AddonManifest) {
  const seeds = manifest.lifecycle?.install?.seedSiteSettings ?? {}
  await Promise.all(
    Object.entries(seeds).map(([key, value]) =>
      prisma.siteSettings.upsert({
        where: { key },
        update: { value: toStoredString(value) },
        create: { key, value: toStoredString(value) },
      })
      )
  )
  await runAddonLifecycleTasks(manifest.id, manifest.lifecycle?.install?.tasks)
}

async function applyUninstallCleanup(manifest: AddonManifest) {
  const removeKeys = manifest.lifecycle?.uninstall?.removeSiteSettings ?? []
  if (removeKeys.length > 0) {
    await prisma.siteSettings.deleteMany({
      where: { key: { in: removeKeys } },
    })
  }
  await runAddonLifecycleTasks(manifest.id, manifest.lifecycle?.uninstall?.tasks)
}

function getApplicableUpgradeMigrations(
  manifest: AddonManifest,
  fromVersion: string,
  toVersion: string
) {
  return (manifest.lifecycle?.upgrade?.migrations ?? []).filter(
    (migration) =>
      compareVersions(fromVersion, migration.toVersion) < 0 &&
      compareVersions(toVersion, migration.toVersion) >= 0
  )
}

async function applyUpgradeMigrations(
  manifest: AddonManifest,
  currentSettings: Record<string, unknown>,
  fromVersion: string,
  toVersion: string
) {
  const migrations = getApplicableUpgradeMigrations(manifest, fromVersion, toVersion)
  let nextSettings = { ...currentSettings }

  for (const migration of migrations) {
    if (migration.seedSiteSettings) {
      await Promise.all(
        Object.entries(migration.seedSiteSettings).map(([key, value]) =>
          prisma.siteSettings.upsert({
            where: { key },
            update: { value: toStoredString(value) },
            create: { key, value: toStoredString(value) },
          })
        )
      )
    }

    if (migration.removeSiteSettings?.length) {
      await prisma.siteSettings.deleteMany({
        where: { key: { in: migration.removeSiteSettings } },
      })
    }

    if (migration.setAddonSettings) {
      nextSettings = {
        ...nextSettings,
        ...migration.setAddonSettings,
      }
    }
  }

  return {
    migrations,
    nextSettings,
  }
}

export async function listAddonManifests(): Promise<AddonManifest[]> {
  await ensurePackagesDirectory()
  const entries = await fs.readdir(ADDON_PACKAGES_DIR, { withFileTypes: true })
  const manifests: AddonManifest[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const jsonPath = path.join(ADDON_PACKAGES_DIR, entry.name, 'addon.json')
    const xmlPath = path.join(ADDON_PACKAGES_DIR, entry.name, 'addon.xml')
    let normalized: AddonManifest | null = null

    try {
      const xmlRaw = await fs.readFile(xmlPath, 'utf8')
      normalized = parseAddonXmlManifest(xmlRaw, 'builtin')
    } catch {
      normalized = null
    }

    if (!normalized) {
      try {
        const raw = await fs.readFile(jsonPath, 'utf8')
        normalized = normalizeManifest(JSON.parse(raw))
      } catch {
        normalized = null
      }
    }

    if (!normalized) continue
    const parsed = await hydrateManifestDocumentation(normalized)
    if (parsed) manifests.push(parsed)
  }

  return manifests.sort((left, right) => left.name.localeCompare(right.name))
}

export async function getAddonTemplates() {
  const manifests = await listAddonManifests()
  const manifestIds = new Set(manifests.map((item) => item.id))
  return ADDON_TEMPLATES.map((template) => ({
    id: template.id,
    label: template.label,
    description: template.description,
    category: template.category,
    preset: template.preset,
    manifest: template.manifest,
    defaults: {
      addonId: template.manifest.id,
      name: template.manifest.name,
      description: template.manifest.description,
      adminHref: template.manifest.entrypoints?.adminPages?.[0]?.href ?? template.manifest.entrypoints?.adminHref ?? '',
      storefrontHref: template.manifest.entrypoints?.storefrontPages?.[0]?.href ?? '',
    },
    available: !manifestIds.has(template.manifest.id),
  }))
}

function sanitizeTemplateAddonId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
}

function applyTemplateInput(template: AddonTemplateDefinition, input?: AddonTemplateInput) {
  const addonId = sanitizeTemplateAddonId(input?.addonId || template.manifest.id)
  if (!addonId) {
    throw new Error('Template addon id is required')
  }

  const name = input?.name?.trim() || template.manifest.name
  const description = input?.description?.trim() || template.manifest.description
  const adminHref = input?.adminHref?.trim()
  const storefrontHref = input?.storefrontHref?.trim()

  return {
    ...template.manifest,
    id: addonId,
    name,
    description,
    sourceType: 'uploaded' as const,
    documentation: {
      readmePath: 'README.md',
      screenshots: [
        {
          src: 'preview.svg',
          caption: `${name} package preview`,
        },
      ],
    },
    entrypoints: template.manifest.entrypoints
      ? {
          ...template.manifest.entrypoints,
          adminHref: adminHref || template.manifest.entrypoints.adminHref,
          adminPages: template.manifest.entrypoints.adminPages?.map((page, index) => ({
            ...page,
            href:
              index === 0 && adminHref
                ? adminHref
                : page.href.replaceAll(template.manifest.id, addonId),
          })),
          storefrontPages: template.manifest.entrypoints.storefrontPages?.map((page, index) => ({
            ...page,
            href:
              index === 0 && storefrontHref
                ? storefrontHref
                : page.href.replaceAll(template.manifest.id, addonId),
          })),
        }
      : undefined,
    settings: template.manifest.settings
      ? {
          sections: template.manifest.settings.sections.map((section) => ({
            ...section,
            fields: section.fields.map((field) => ({
              ...field,
              siteSettingKey: field.siteSettingKey?.replaceAll(template.manifest.id, addonId),
            })),
          })),
        }
      : undefined,
    dataGovernance: template.manifest.dataGovernance
      ? {
          exportSiteSettings: template.manifest.dataGovernance.exportSiteSettings?.map((key) =>
            key.replaceAll(template.manifest.id, addonId)
          ),
          cleanupSiteSettings: template.manifest.dataGovernance.cleanupSiteSettings?.map((key) =>
            key.replaceAll(template.manifest.id, addonId)
          ),
          retentionNote: template.manifest.dataGovernance.retentionNote,
        }
      : undefined,
  }
}

function buildTemplateReadme(template: AddonTemplateDefinition, manifest: AddonManifest) {
  const adminPage = manifest.entrypoints?.adminPages?.[0]?.href ?? manifest.entrypoints?.adminHref
  const storefrontPage = manifest.entrypoints?.storefrontPages?.[0]?.href

  return `# ${manifest.name}

${manifest.description}

## Template

- Template id: \`${template.id}\`
- Preset: \`${template.preset}\`
- Category: \`${template.category}\`
- Package id: \`${manifest.id}\`
- Version: \`${manifest.version}\`

## Entrypoints

${adminPage ? `- Admin page: \`${adminPage}\`` : '- Admin page: none'}
${storefrontPage ? `- Storefront page: \`${storefrontPage}\`` : '- Storefront page: none'}

## Settings

${(manifest.settings?.sections ?? [])
  .flatMap((section) => section.fields.map((field) => `- \`${field.id}\` (${field.type})`))
  .join('\n') || '- No settings fields declared'}

## Governance

${manifest.dataGovernance?.retentionNote ?? 'No retention note declared.'}

Generated by the Buyzilo addon template scaffolder.
`
}

function buildTemplatePreviewSvg(template: AddonTemplateDefinition, manifest: AddonManifest) {
  const tone =
    template.preset === 'marketing'
      ? ['#f59e0b', '#1f2937']
      : template.preset === 'content'
        ? ['#2563eb', '#0f172a']
        : template.preset === 'operations'
          ? ['#10b981', '#111827']
          : ['#7c3aed', '#111827']

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630" fill="none">
  <rect width="1200" height="630" rx="28" fill="${tone[1]}"/>
  <rect x="32" y="32" width="1136" height="566" rx="24" fill="url(#g)"/>
  <text x="72" y="150" fill="white" font-family="Arial, sans-serif" font-size="34" font-weight="700">${manifest.name}</text>
  <text x="72" y="202" fill="#E2E8F0" font-family="Arial, sans-serif" font-size="22">${manifest.description}</text>
  <text x="72" y="300" fill="#F8FAFC" font-family="Arial, sans-serif" font-size="18">Preset: ${template.preset}</text>
  <text x="72" y="336" fill="#F8FAFC" font-family="Arial, sans-serif" font-size="18">Package: ${manifest.id}</text>
  <text x="72" y="372" fill="#F8FAFC" font-family="Arial, sans-serif" font-size="18">Version: ${manifest.version}</text>
  <defs>
    <linearGradient id="g" x1="32" y1="32" x2="1168" y2="598" gradientUnits="userSpaceOnUse">
      <stop stop-color="${tone[0]}"/>
      <stop offset="1" stop-color="${tone[1]}"/>
    </linearGradient>
  </defs>
</svg>`
}

export async function createAddonFromTemplate(
  templateId: string,
  input?: AddonTemplateInput,
  identity?: AddonOperatorIdentity
) {
  const template = ADDON_TEMPLATES.find((item) => item.id === templateId)
  if (!template) {
    throw new Error('Addon template not found')
  }

  const manifest = applyTemplateInput(template, input)
  await saveAddonManifestFile(JSON.stringify(manifest, null, 2))
  const addonDir = path.join(ADDON_PACKAGES_DIR, manifest.id)
  await writeAddonAssets(addonDir, {
    'README.md': buildTemplateReadme(template, manifest),
    'preview.svg': buildTemplatePreviewSvg(template, manifest),
  })
  await appendAddonAuditEntry(manifest.id, 'install', identity, {
    templateId,
    templatePreset: template.preset,
    scaffoldOnly: true,
    configuredAddonId: manifest.id,
  })
  return manifest
}

export async function getAddonCatalog(identity?: AddonOperatorIdentity): Promise<AddonCatalogItem[]> {
  const [manifests, registry, packageMeta, trustPolicy, channelPolicy, snapshots, auditLog, overrideRequests] = await Promise.all([
    listAddonManifests(),
    readRegistry(),
    readPackageMeta(),
    readTrustPolicy(),
    readChannelPolicy(),
    readSnapshots(),
    readAuditLog(),
    readOverrideRequests(),
  ])
  return Promise.all(manifests.map(async (manifest) => {
    const entry = registry[manifest.id]
    const missing = (manifest.dependencies ?? []).filter((dependency) => !registry[dependency])
    const inactive = (manifest.dependencies ?? []).filter((dependency) => registry[dependency] && registry[dependency].status !== 'active')
    const activeDependents = manifests
      .filter((item) => (item.dependencies ?? []).includes(manifest.id) && registry[item.id]?.status === 'active')
      .map((item) => item.id)
    const { canOperate, operatorStatus } = evaluateAddonOperators(manifest.operators, identity)
    const fingerprint = await getAddonPackageFingerprint(manifest)
    const verification = getAddonVerificationStatus(manifest, fingerprint, packageMeta[manifest.id])
    const trust = getAddonTrustStatus(manifest, fingerprint, trustPolicy[manifest.id])
    const approval = getAddonApprovalStatus(manifest, fingerprint, packageMeta[manifest.id])
    const ownedData = await getAddonOwnedData(manifest)
    const diagnostics = await getAddonDiagnostics(manifest, manifests, registry, entry, verification, trust, approval)
    const hookTrace = await getAddonHookTraceEntries(manifest, entry?.status === 'active')
    const smokeTest = await getAddonSmokeTestReport(manifest.id)
    const updateStatus = entry
      ? {
          currentVersion: entry.version,
          availableVersion: manifest.version,
          updateAvailable:
            compareVersions(manifest.version, entry.version) > 0 &&
            isChannelAllowed(getAddonChannel(manifest), channelPolicy),
          channel: getAddonChannel(manifest),
        }
      : undefined
    return {
      manifest,
      installed: Boolean(entry),
      active: entry?.status === 'active',
      registry: entry,
      verification,
      trust,
      approval,
      updateStatus,
      ownedData,
      canOperate,
      operatorStatus,
      dependencyStatus: {
        missing,
        inactive,
        activeDependents,
      },
      diagnostics,
      hookTrace,
      smokeTest,
      readiness: getAddonReadiness({
        diagnostics,
        verification,
        trust,
        approval,
        smokeTest,
        updateStatus,
        canOperate,
      }),
      auditLog: auditLog[manifest.id] ?? [],
      snapshots: snapshots[manifest.id] ?? [],
      overrideRequests: overrideRequests[manifest.id] ?? [],
    }
  }))
}

export async function getActiveAddonIds(): Promise<string[]> {
  const registry = await readRegistry()
  return Object.values(registry)
    .filter((entry) => entry.status === 'active')
    .map((entry) => entry.id)
}

export async function getActiveAddonManifests(): Promise<AddonManifest[]> {
  const [manifests, registry] = await Promise.all([listAddonManifests(), readRegistry()])
  return manifests.filter((manifest) => registry[manifest.id]?.status === 'active')
}

export async function getActiveAddonExtensions(options?: {
  identity?: AddonOperatorIdentity
  viewer?: AddonStorefrontViewer
}) {
  const manifests = await getActiveAddonManifests()
  return {
    adminLinks: manifests.flatMap((manifest) => {
      const pages = getManifestAdminPages(manifest)

      return pages
        .filter((page) => isVisibilityMatch(page.visibility ?? manifest.entrypoints?.visibility, options?.identity))
        .map((page) => ({
          id: `${manifest.id}:${page.id}`,
          addonId: manifest.id,
          label: page.label,
          href: page.href,
          description: page.description,
          category: manifest.category,
        }))
    }),
    dashboardWidgets: manifests.flatMap((manifest) =>
      (manifest.extensions?.dashboardWidgets ?? []).map((widget) => ({
        ...widget,
        addonId: manifest.id,
      }))
      .filter((widget) => isVisibilityMatch(widget.visibility, options?.identity))
    ),
    storefrontBlocks: manifests.flatMap((manifest) =>
      (manifest.extensions?.storefrontBlocks ?? []).map((block) => ({
        ...block,
        addonId: manifest.id,
      }))
      .filter((block) => isVisibilityMatch(block.visibility, options?.identity, options?.viewer))
    ),
  }
}

export async function getActiveAddonHookRegistry() {
  const manifests = await getActiveAddonManifests()
  const traces = await Promise.all(manifests.map((manifest) => getAddonHookTraceEntries(manifest, true)))
  return traces.flat()
}

export async function getAddonAdminPageRuntime(
  href: string,
  identity?: AddonOperatorIdentity
) {
  const [manifests, registry] = await Promise.all([listAddonManifests(), readRegistry()])

  for (const manifest of manifests) {
    const pages = getManifestAdminPages(manifest)

    const page = pages.find((item) => item.href === href)
    if (!page) continue

    return {
      addonId: manifest.id,
      manifest,
      page,
      active: registry[manifest.id]?.status === 'active',
      visible: isVisibilityMatch(page.visibility ?? manifest.entrypoints?.visibility, identity),
    }
  }

  return null
}

export async function getAddonStorefrontPageRuntime(
  href: string,
  viewer?: AddonStorefrontViewer
) {
  const [manifests, registry] = await Promise.all([listAddonManifests(), readRegistry()])

  for (const manifest of manifests) {
    const pages = manifest.entrypoints?.storefrontPages ?? []
    const page = pages.find((item) => item.href === href)
    if (!page) continue

    return {
      addonId: manifest.id,
      manifest,
      page,
      active: registry[manifest.id]?.status === 'active',
      visible: isVisibilityMatch(page.visibility, undefined, viewer),
    }
  }

  return null
}

export async function getAddonRuntimePreview(
  addonId: string,
  identity?: AddonOperatorIdentity
): Promise<AddonRuntimePreview> {
  const [manifest, registry] = await Promise.all([getManifestById(addonId), readRegistry()])
  if (!manifest) {
    throw new Error('Addon package not found')
  }

  return {
    addonId: manifest.id,
    addonName: manifest.name,
    installed: Boolean(registry[addonId]),
    active: registry[addonId]?.status === 'active',
    adminPages: getManifestAdminPages(manifest).map((page) =>
      buildAdminRuntimePreviewEntry(
        {
          ...page,
          visibility: page.visibility ?? manifest.entrypoints?.visibility,
        },
        identity
      )
    ),
    storefrontPages: getManifestStorefrontPages(manifest).map((page) =>
      buildStorefrontRuntimePreviewEntry(page)
    ),
    dashboardWidgets: (manifest.extensions?.dashboardWidgets ?? []).map((widget) =>
      buildAdminRuntimePreviewEntry(
        {
          id: widget.id,
          label: widget.title,
          href: widget.href,
          description: widget.subtitle,
          visibility: widget.visibility,
        },
        identity
      )
    ),
    storefrontBlocks: (manifest.extensions?.storefrontBlocks ?? []).map((block) => ({
      ...buildStorefrontRuntimePreviewEntry({
        id: block.id,
        href: block.href,
        title: block.title,
        subtitle: block.subtitle,
        visibility: block.visibility,
      }),
      page: block.page,
      tone: block.tone,
    })),
  }
}

export async function getAddonSmokeTestReport(addonId: string): Promise<AddonSmokeTestReport> {
  const [manifest, registry] = await Promise.all([getManifestById(addonId), readRegistry()])
  if (!manifest) {
    throw new Error('Addon package not found')
  }

  const checks: AddonSmokeTestCheck[] = []
  const pushCheck = (check: AddonSmokeTestCheck) => checks.push(check)

  const adminPages = getManifestAdminPages(manifest)
  for (const page of adminPages) {
    const exists = await routeExistsForHref(page.href)
    pushCheck({
      id: `admin-page:${page.id}`,
      label: `Admin route ${page.href}`,
      status: exists ? 'pass' : 'warn',
      detail: exists ? 'Matching app route file found.' : 'No matching app route file found for this admin page.',
    })
  }

  const storefrontPages = getManifestStorefrontPages(manifest)
  for (const page of storefrontPages) {
    const exists = await routeExistsForHref(page.href)
    pushCheck({
      id: `storefront-page:${page.id}`,
      label: `Storefront route ${page.href}`,
      status: exists ? 'pass' : 'warn',
      detail: exists ? 'Matching app route file found.' : 'No matching app route file found for this storefront page.',
    })
  }

  for (const widget of manifest.extensions?.dashboardWidgets ?? []) {
    const exists = await routeExistsForHref(widget.href)
    pushCheck({
      id: `widget:${widget.id}`,
      label: `Dashboard widget target ${widget.href}`,
      status: exists ? 'pass' : 'warn',
      detail: exists ? 'Widget target route exists.' : 'Widget target route could not be resolved to an app file.',
    })
  }

  for (const block of manifest.extensions?.storefrontBlocks ?? []) {
    const exists = await routeExistsForHref(block.href)
    pushCheck({
      id: `block:${block.id}`,
      label: `Storefront block target ${block.href}`,
      status: exists ? 'pass' : 'warn',
      detail: exists ? 'Storefront block target route exists.' : 'Storefront block target route could not be resolved to an app file.',
    })
  }

  if (manifest.documentation?.readmePath) {
    const exists = await addonAssetExists(manifest.id, manifest.documentation.readmePath)
    pushCheck({
      id: 'documentation:readme',
      label: `README asset ${manifest.documentation.readmePath}`,
      status: exists ? 'pass' : 'fail',
      detail: exists ? 'README asset is present in the addon package.' : 'README asset is missing from the addon package.',
    })
  } else {
    pushCheck({
      id: 'documentation:readme',
      label: 'README documentation',
      status: manifest.documentation?.readmeContent ? 'pass' : 'warn',
      detail: manifest.documentation?.readmeContent
        ? 'README content is embedded in the manifest payload.'
        : 'No README path or embedded README content is declared.',
    })
  }

  for (const screenshot of manifest.documentation?.screenshots ?? []) {
    const exists = await addonAssetExists(manifest.id, screenshot.src)
    pushCheck({
      id: `documentation:screenshot:${screenshot.src}`,
      label: `Preview asset ${screenshot.src}`,
      status: exists ? 'pass' : 'fail',
      detail: exists ? 'Preview asset is present in the addon package.' : 'Preview asset is missing from the addon package.',
    })
  }

  const schemaIssues = collectSettingsSchemaIssues(manifest)
  pushCheck({
    id: 'settings-schema',
    label: 'Settings schema integrity',
    status: schemaIssues.length ? 'fail' : 'pass',
    detail: schemaIssues.length ? schemaIssues.join('; ') : 'No duplicate ids or invalid select fields detected.',
  })

  const mappedFields = (manifest.settings?.sections ?? []).flatMap((section) => section.fields).filter((field) => field.siteSettingKey)
  pushCheck({
    id: 'settings-mapping',
    label: 'Mapped settings coverage',
    status: mappedFields.length || !(manifest.settings?.sections?.length) ? 'pass' : 'warn',
    detail: mappedFields.length
      ? `${mappedFields.length} field(s) map to site settings.`
      : manifest.settings?.sections?.length
        ? 'Settings exist but none map to site settings.'
        : 'No settings schema declared.',
  })

  const summary = checks.reduce(
    (totals, check) => {
      totals[check.status] += 1
      return totals
    },
    { pass: 0, warn: 0, fail: 0 }
  )

  return {
    addonId: manifest.id,
    addonName: manifest.name,
    installed: Boolean(registry[addonId]),
    active: registry[addonId]?.status === 'active',
    summary,
    checks,
  }
}

function getAddonReadiness(input: {
  diagnostics: NonNullable<AddonCatalogItem['diagnostics']>
  verification: NonNullable<AddonCatalogItem['verification']>
  trust: NonNullable<AddonCatalogItem['trust']>
  approval: NonNullable<AddonCatalogItem['approval']>
  smokeTest: AddonSmokeTestReport
  updateStatus?: AddonCatalogItem['updateStatus']
  canOperate?: boolean
}): AddonDeploymentReadiness {
  const reasons: string[] = []
  let score = 100

  if (input.approval.status !== 'builtin' && input.approval.status !== 'approved') {
    reasons.push('Package approval is not current.')
    score -= 25
  }
  if (input.trust.status === 'untrusted' || input.trust.status === 'trust-mismatch') {
    reasons.push('Package trust is missing or mismatched.')
    score -= 25
  }
  if (input.verification.status === 'package-changed' || input.verification.status === 'uploaded-untracked') {
    reasons.push('Package verification baseline is not clean.')
    score -= 20
  }
  if (input.diagnostics.prerequisites.some((entry) => !entry.satisfied)) {
    reasons.push('Required install prerequisites are missing.')
    score -= 15
  }
  if (
    !input.diagnostics.compatibility.appSatisfied ||
    input.diagnostics.compatibility.addonConstraints.some((entry) => !entry.satisfied)
  ) {
    reasons.push('Compatibility requirements are not satisfied.')
    score -= 20
  }
  if (input.diagnostics.conflicts.some((entry) => entry.installed || entry.active)) {
    reasons.push('Package conflicts with current addon state.')
    score -= 20
  }
  if (input.smokeTest.summary.fail > 0) {
    reasons.push('Smoke tests include failing checks.')
    score -= 20
  }
  if (input.smokeTest.summary.warn > 0) {
    reasons.push('Smoke tests include warnings.')
    score -= 10
  }
  if (input.diagnostics.issues.length > 0) {
    reasons.push('Diagnostics report package issues.')
    score -= 10
  }
  if (input.updateStatus?.updateAvailable) {
    reasons.push('A newer package version is available.')
    score -= 5
  }
  if (input.canOperate === false) {
    reasons.push('Current operator is outside addon policy scope.')
    score -= 10
  }

  score = Math.max(0, score)
  const status: AddonDeploymentReadiness['status'] =
    input.approval.status !== 'builtin' && input.approval.status !== 'approved'
      ? 'blocked'
      : input.trust.status === 'untrusted' || input.trust.status === 'trust-mismatch'
        ? 'blocked'
        : input.diagnostics.prerequisites.some((entry) => !entry.satisfied) ||
            !input.diagnostics.compatibility.appSatisfied ||
            input.diagnostics.compatibility.addonConstraints.some((entry) => !entry.satisfied) ||
            input.diagnostics.conflicts.some((entry) => entry.installed || entry.active) ||
            input.smokeTest.summary.fail > 0
          ? 'blocked'
          : input.smokeTest.summary.warn > 0 || input.diagnostics.issues.length > 0 || Boolean(input.updateStatus?.updateAvailable)
            ? 'risky'
            : 'ready'

  return { status, score, reasons }
}

export async function isAddonActive(addonId: string) {
  const registry = await readRegistry()
  return registry[addonId]?.status === 'active'
}

async function getManifestById(addonId: string) {
  const manifests = await listAddonManifests()
  return manifests.find((item) => item.id === addonId) ?? null
}

function collectDependencyResolutionPlan(
  manifest: AddonManifest,
  manifests: AddonManifest[],
  registry: AddonRegistryMap
) {
  const manifestMap = new Map(manifests.map((item) => [item.id, item]))
  const visited = new Set<string>()
  const installChain: string[] = []
  const activateChain: string[] = []
  const missingPackages: string[] = []

  function visit(current: AddonManifest) {
    for (const dependencyId of current.dependencies ?? []) {
      if (visited.has(dependencyId)) continue
      visited.add(dependencyId)

      const dependencyManifest = manifestMap.get(dependencyId)
      if (!dependencyManifest) {
        missingPackages.push(dependencyId)
        continue
      }

      visit(dependencyManifest)

      if (!registry[dependencyId]) {
        installChain.push(dependencyId)
        activateChain.push(dependencyId)
      } else if (registry[dependencyId]?.status !== 'active') {
        activateChain.push(dependencyId)
      }
    }
  }

  visit(manifest)

  return {
    installChain,
    activateChain,
    missingPackages,
  }
}

export async function getAddonActionPlan(
  addonId: string,
  action: 'install' | 'activate' | 'deactivate' | 'uninstall' | 'save-settings' | 'upgrade',
  options?: {
    overrideReadiness?: boolean
    identity?: AddonOperatorIdentity
    allowApprovedOverrideExecution?: boolean
  }
) {
  const [manifest, manifests, registry, channelPolicy] = await Promise.all([
    getManifestById(addonId),
    listAddonManifests(),
    readRegistry(),
    readChannelPolicy(),
  ])

  if (!manifest) {
    throw new Error('Addon package not found')
  }

  const entry = registry[addonId]
  const blockers: string[] = []
  const warnings: string[] = []
  const effects: string[] = []
  const compatibility = getCompatibilityStatus(manifest, registry)
  const prerequisites = await getAddonPrerequisiteStatus(manifest, entry)
  const [fingerprint, packageMeta, trustPolicy] = await Promise.all([
    getAddonPackageFingerprint(manifest),
    readPackageMeta(),
    readTrustPolicy(),
  ])
  const approval = getAddonApprovalStatus(manifest, fingerprint, packageMeta[addonId])
  const trust = getAddonTrustStatus(manifest, fingerprint, trustPolicy[addonId])
  const verification = getAddonVerificationStatus(manifest, fingerprint, packageMeta[addonId])
  const dependencyResolution = collectDependencyResolutionPlan(manifest, manifests, registry)
  const conflictStatus = getConflictStatus(manifest, manifests, registry)
  const replacementPlan = collectReplacementPlan(manifest, manifests, registry)
  const channel = getAddonChannel(manifest)
  const diagnostics = await getAddonDiagnostics(manifest, manifests, registry, entry, verification, trust, approval)
  const smokeTest = await getAddonSmokeTestReport(manifest.id)
  const updateStatus = entry
    ? {
        currentVersion: entry.version,
        availableVersion: manifest.version,
        updateAvailable:
          compareVersions(manifest.version, entry.version) > 0 &&
          isChannelAllowed(getAddonChannel(manifest), channelPolicy),
        channel: getAddonChannel(manifest),
      }
    : undefined
  const readiness = getAddonReadiness({
    diagnostics,
    verification,
    trust,
    approval,
    smokeTest,
    updateStatus,
    canOperate: true,
  })
  const activeDependents = manifests
    .filter((item) => (item.dependencies ?? []).includes(addonId) && registry[item.id]?.status === 'active')
    .map((item) => item.name)

  if ((action === 'install' || action === 'activate' || action === 'upgrade') && !compatibility.appSatisfied) {
    blockers.push(`Current app version ${APP_VERSION} is outside this package compatibility range`)
  }

  if ((action === 'install' || action === 'upgrade') && !isChannelAllowed(channel, channelPolicy)) {
    blockers.push(`Addon channel "${channel}" is blocked by current channel policy`)
  }

  if (action === 'install' || action === 'activate' || action === 'upgrade') {
    const incompatibleDeps = compatibility.addonConstraints.filter((item) => !item.satisfied)
    if (incompatibleDeps.length > 0) {
      blockers.push(`Incompatible addon dependency versions: ${incompatibleDeps.map((item) => item.addonId).join(', ')}`)
    }

    const missingPrereqs = prerequisites.filter((item) => !item.satisfied)
    if (missingPrereqs.length > 0) {
      blockers.push(`Missing prerequisites: ${missingPrereqs.map((item) => item.label).join(', ')}`)
    }
    if (approval.status !== 'builtin' && approval.status !== 'approved') {
      blockers.push('Approve this uploaded package before install, activation, or upgrade')
    }
    if (trust.status !== 'builtin' && trust.status !== 'trusted') {
      warnings.push('Package is not currently trusted')
    }
    if (channel !== 'stable') {
      warnings.push(`Package is in ${channel} channel`)
    }
    if (channelPolicy.requireReady && readiness.status !== 'ready') {
      if (options?.overrideReadiness && channelPolicy.requireOverrideApproval && !options.allowApprovedOverrideExecution) {
        blockers.push('Readiness override requires a secondary approval request before execution')
      } else if (options?.overrideReadiness && channelPolicy.requireOverrideApproval && options.allowApprovedOverrideExecution) {
        warnings.push(`Approved readiness override applied for ${readiness.status} package`)
      } else if (options?.overrideReadiness && canUseReadinessOverride(channelPolicy, options.identity)) {
        warnings.push(`Readiness override applied for ${readiness.status} package`)
      } else if (options?.overrideReadiness && !canUseReadinessOverride(channelPolicy, options.identity)) {
        blockers.push(`Current operator role ${options.identity?.role ?? 'unknown'} cannot use readiness override`)
      } else {
        blockers.push(`Deployment readiness policy requires READY status. Current status: ${readiness.status.toUpperCase()}`)
      }
    }
  }

  if (action === 'install') {
    if (conflictStatus.install.length > 0) {
      blockers.push(formatConflictMessage('install', conflictStatus.install))
    }
    const missingDeps = dependencyResolution.missingPackages
    if (missingDeps.length > 0) {
      blockers.push(`Missing dependency packages: ${missingDeps.join(', ')}`)
    }
    if (dependencyResolution.installChain.length > 0) {
      warnings.push(`Install chain required before target package: ${dependencyResolution.installChain.join(' -> ')}`)
    }
    const seeds = Object.keys(manifest.lifecycle?.install?.seedSiteSettings ?? {})
    if (seeds.length > 0) {
      effects.push(`Seeds ${seeds.length} site settings on install`)
    }
    const installTasks = manifest.lifecycle?.install?.tasks?.length ?? 0
    if (installTasks > 0) {
      effects.push(`Runs ${installTasks} declarative install lifecycle task${installTasks === 1 ? '' : 's'}`)
    }
    effects.push('Installs package and marks it active immediately')
  }

  if (action === 'activate') {
    if (conflictStatus.activate.length > 0) {
      blockers.push(formatConflictMessage('activate', conflictStatus.activate))
    }
    const inactiveDeps = dependencyResolution.missingPackages
    if (inactiveDeps.length > 0) {
      blockers.push(`Missing dependency packages: ${inactiveDeps.join(', ')}`)
    }
    if (dependencyResolution.activateChain.length > 0) {
      warnings.push(`Activate chain required before target package: ${dependencyResolution.activateChain.join(' -> ')}`)
    }
    effects.push('Marks installed package active for runtime surfaces')
  }

  if (action === 'deactivate') {
    if (activeDependents.length > 0) {
      blockers.push(`Active dependent addons must be disabled first: ${activeDependents.join(', ')}`)
    }
    warnings.push('Admin and storefront extension surfaces from this addon will disappear')
    effects.push('Marks package inactive without removing settings')
  }

  if (action === 'uninstall') {
    if (activeDependents.length > 0) {
      blockers.push(`Active dependent addons must be disabled first: ${activeDependents.join(', ')}`)
    }
    const cleanupKeys = manifest.lifecycle?.uninstall?.removeSiteSettings ?? []
    if (cleanupKeys.length > 0) {
      warnings.push(`Removes ${cleanupKeys.length} mapped site settings during uninstall`)
    }
    const uninstallTasks = manifest.lifecycle?.uninstall?.tasks?.length ?? 0
    if (uninstallTasks > 0) {
      warnings.push(`Runs ${uninstallTasks} declarative uninstall lifecycle task${uninstallTasks === 1 ? '' : 's'}`)
    }
    warnings.push('Package registry entry will be removed')
    effects.push('Uninstalls package and drops addon runtime state')
  }

  if (action === 'save-settings') {
    effects.push('Writes addon settings to registry and mapped site settings')
  }

  if (action === 'upgrade') {
    if (!entry) {
      blockers.push('Install this package before upgrade')
    } else if (compareVersions(manifest.version, entry.version) <= 0) {
      blockers.push('No newer addon version is available')
    } else {
      const upgradeConflicts = [...new Map(
        [...conflictStatus.install, ...conflictStatus.activate].map((item) => [item.addonId, item])
      ).values()]
      if (upgradeConflicts.length > 0) {
        blockers.push(formatConflictMessage('upgrade', upgradeConflicts))
      }
      const migrations = getApplicableUpgradeMigrations(manifest, entry.version, manifest.version)
      effects.push(`Upgrade addon from ${entry.version} to ${manifest.version}`)
      if (migrations.length > 0) {
        effects.push(`Apply ${migrations.length} upgrade migration${migrations.length === 1 ? '' : 's'}`)
        const extensionChanges = migrations.reduce((total, migration) => (
          total +
          (migration.extensionMigrations?.adminPages?.length ?? 0) +
          (migration.extensionMigrations?.storefrontPages?.length ?? 0) +
          (migration.extensionMigrations?.dashboardWidgets?.length ?? 0) +
          (migration.extensionMigrations?.storefrontBlocks?.length ?? 0)
        ), 0)
        if (extensionChanges > 0) {
          effects.push(`Apply ${extensionChanges} extension-surface migration note${extensionChanges === 1 ? '' : 's'}`)
        }
      }
      warnings.push('Upgrade will snapshot current addon state before applying the new version')
    }
  }

  return {
    addonId,
    addonName: manifest.name,
    action,
    blockers,
    warnings,
    effects,
    compatibility,
    prerequisites,
    dependencyStatus: {
      dependencies: manifest.dependencies ?? [],
      activeDependents,
    },
    dependencyResolution,
    conflictStatus,
    replacementPlan,
    channelPolicy,
    channel,
    readiness,
    overrideReadiness: Boolean(options?.overrideReadiness),
  }
}

export async function executeAddonDependencyPlan(
  addonId: string,
  action: 'install' | 'activate',
  identity?: AddonOperatorIdentity,
  options?: {
    overrideReadiness?: boolean
    allowApprovedOverrideExecution?: boolean
  }
) {
  const plan = await getAddonActionPlan(addonId, action, { ...options, identity })
  if (plan.blockers.length > 0) {
    throw new Error(plan.blockers.join('; '))
  }

  const executed: string[] = []
  const registryBefore = await readRegistry()

  for (const dependencyId of plan.dependencyResolution.installChain) {
    if (!registryBefore[dependencyId]) {
      await installAddon(dependencyId, identity, options)
      executed.push(`install:${dependencyId}`)
    }
  }

  let registry = await readRegistry()
  for (const dependencyId of plan.dependencyResolution.activateChain) {
    if (!registry[dependencyId]) {
      await installAddon(dependencyId, identity, options)
      executed.push(`install:${dependencyId}`)
    } else if (registry[dependencyId]?.status !== 'active') {
      await activateAddon(dependencyId, identity, options)
      executed.push(`activate:${dependencyId}`)
    }
    registry = await readRegistry()
  }

  registry = await readRegistry()
  if (!registry[addonId]) {
    await installAddon(addonId, identity, options)
    executed.push(`install:${addonId}`)
  } else if (action === 'activate' && registry[addonId]?.status !== 'active') {
    await activateAddon(addonId, identity, options)
    executed.push(`activate:${addonId}`)
  }

  return {
    success: true,
    addonId,
    action,
    executed,
  }
}

export async function executeAddonReplacementPlan(
  addonId: string,
  action: 'install' | 'activate',
  identity?: AddonOperatorIdentity,
  options?: {
    overrideReadiness?: boolean
    allowApprovedOverrideExecution?: boolean
  }
) {
  const plan = await getAddonActionPlan(addonId, action, { ...options, identity })
  const nonConflictBlockers = plan.blockers.filter((item) => !item.startsWith('Addon installation conflicts with:') && !item.startsWith('Addon activation conflicts with:'))
  if (nonConflictBlockers.length > 0) {
    throw new Error(nonConflictBlockers.join('; '))
  }
  if (!plan.replacementPlan.canReplace) {
    throw new Error(
      plan.replacementPlan.blockers.length > 0
        ? plan.replacementPlan.blockers.join('; ')
        : 'No guided replacement plan is available'
    )
  }

  const executed: string[] = []
  for (const conflictingAddonId of plan.replacementPlan.deactivateChain) {
    await deactivateAddon(conflictingAddonId, identity)
    executed.push(`deactivate:${conflictingAddonId}`)
  }

  const dependencyResult = await executeAddonDependencyPlan(addonId, action, identity, options)
  return {
    ...dependencyResult,
    executed: [...executed, ...dependencyResult.executed],
  }
}

async function executeApprovedOverrideAction(
  addonId: string,
  action: AddonOverrideExecutionAction,
  identity?: AddonOperatorIdentity
) {
  const options = { overrideReadiness: true, allowApprovedOverrideExecution: true as const }
  if (action === 'install') {
    return installAddon(addonId, identity, options)
  }
  if (action === 'activate') {
    return activateAddon(addonId, identity, options)
  }
  if (action === 'upgrade') {
    return upgradeAddon(addonId, identity, options)
  }
  if (action === 'resolve-install') {
    return executeAddonDependencyPlan(addonId, 'install', identity, options)
  }
  if (action === 'resolve-activate') {
    return executeAddonDependencyPlan(addonId, 'activate', identity, options)
  }
  if (action === 'resolve-replace-install') {
    return executeAddonReplacementPlan(addonId, 'install', identity, options)
  }
  return executeAddonReplacementPlan(addonId, 'activate', identity, options)
}

export async function createAddonOverrideRequest(
  addonId: string,
  executionAction: AddonOverrideExecutionAction,
  identity?: AddonOperatorIdentity
) {
  if (!identity?.id) {
    throw new Error('Signed-in operator identity is required')
  }

  const channelPolicy = await readChannelPolicy()
  if (!channelPolicy.requireReady || !channelPolicy.allowReadinessOverride) {
    throw new Error('Readiness override requests are not enabled by current policy')
  }

  const planAction = getPlanActionForExecutionAction(executionAction)
  const plan = await getAddonActionPlan(addonId, planAction, { identity })
  if (plan.readiness.status === 'ready') {
    throw new Error('This package does not need a readiness override')
  }

  const requests = await readOverrideRequests()
  const existingPending = (requests[addonId] ?? []).find((request) =>
    request.executionAction === executionAction &&
    request.status === 'pending'
  )
  if (existingPending) {
    throw new Error('A pending override request already exists for this addon action')
  }

  const request: AddonOverrideRequest = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    addonId,
    executionAction,
    requestedAt: new Date().toISOString(),
    requestedById: identity.id,
    requestedByRole: identity.role,
    status: 'pending',
    readinessStatus: plan.readiness.status,
    readinessScore: plan.readiness.score,
    readinessReasons: plan.readiness.reasons,
  }

  requests[addonId] = [request, ...(requests[addonId] ?? [])].slice(0, 20)
  await writeOverrideRequests(requests)
  await appendAddonAuditEntry(addonId, 'request-override', identity, {
    requestId: request.id,
    executionAction,
    readinessStatus: request.readinessStatus,
    readinessScore: request.readinessScore,
  })

  return request
}

export async function approveAddonOverrideRequest(
  addonId: string,
  requestId: string,
  identity?: AddonOperatorIdentity
) {
  const channelPolicy = await readChannelPolicy()
  if (!canUseReadinessOverride(channelPolicy, identity)) {
    throw new Error('Current operator cannot approve readiness overrides')
  }

  const requests = await readOverrideRequests()
  const request = (requests[addonId] ?? []).find((entry) => entry.id === requestId)
  if (!request) {
    throw new Error('Override request not found')
  }
  if (request.status !== 'pending') {
    throw new Error('Override request is no longer pending')
  }
  if (identity?.id && request.requestedById === identity.id) {
    throw new Error('A second operator must approve this override request')
  }

  const executionResult = await executeApprovedOverrideAction(addonId, request.executionAction, identity)
  request.status = 'executed'
  request.approvedAt = new Date().toISOString()
  request.approvedById = identity?.id ?? 'system'
  request.approvedByRole = identity?.role ?? 'system'
  request.executedAt = request.approvedAt
  request.executionDetails = {
    executionAction: request.executionAction,
  }
  await writeOverrideRequests(requests)
  await appendAddonAuditEntry(addonId, 'approve-override', identity, {
    requestId,
    executionAction: request.executionAction,
  })

  return {
    success: true,
    request,
    executionResult,
  }
}

export async function rejectAddonOverrideRequest(
  addonId: string,
  requestId: string,
  identity?: AddonOperatorIdentity
) {
  const channelPolicy = await readChannelPolicy()
  if (!canUseReadinessOverride(channelPolicy, identity)) {
    throw new Error('Current operator cannot reject readiness overrides')
  }

  const requests = await readOverrideRequests()
  const request = (requests[addonId] ?? []).find((entry) => entry.id === requestId)
  if (!request) {
    throw new Error('Override request not found')
  }
  if (request.status !== 'pending') {
    throw new Error('Override request is no longer pending')
  }

  request.status = 'rejected'
  request.rejectedAt = new Date().toISOString()
  request.rejectedById = identity?.id ?? 'system'
  request.rejectedByRole = identity?.role ?? 'system'
  await writeOverrideRequests(requests)
  await appendAddonAuditEntry(addonId, 'reject-override', identity, {
    requestId,
    executionAction: request.executionAction,
  })

  return {
    success: true,
    request,
  }
}

export async function upgradeAddon(
  addonId: string,
  identity?: AddonOperatorIdentity,
  options?: {
    overrideReadiness?: boolean
    allowApprovedOverrideExecution?: boolean
  }
) {
  const [manifest, registry] = await Promise.all([getManifestById(addonId), readRegistry()])
  if (!manifest || !registry[addonId]) {
    throw new Error('Addon must be installed before upgrade')
  }

  const plan = await getAddonActionPlan(addonId, 'upgrade', { ...options, identity })
  if (plan.blockers.length > 0) {
    throw new Error(plan.blockers.join('; '))
  }

  const fromVersion = registry[addonId].version
  await captureAddonSnapshot(addonId, 'save-settings', registry[addonId])
  const migrationResult = await applyUpgradeMigrations(
    manifest,
    registry[addonId].settings,
    fromVersion,
    manifest.version
  )
  registry[addonId] = {
    ...registry[addonId],
    version: manifest.version,
    settings: migrationResult.nextSettings,
    updatedAt: new Date().toISOString(),
  }
  await writeRegistry(registry)
  await syncMappedSiteSettings(manifest, registry[addonId].settings)
  await appendAddonAuditEntry(addonId, 'upgrade', identity, {
    fromVersion,
    toVersion: manifest.version,
    migrationVersions: migrationResult.migrations.map((migration) => migration.toVersion),
    extensionMigrations: migrationResult.migrations.flatMap((migration) => [
      ...(migration.extensionMigrations?.adminPages ?? []).map((entry) => `admin:${entry}`),
      ...(migration.extensionMigrations?.storefrontPages ?? []).map((entry) => `storefront:${entry}`),
      ...(migration.extensionMigrations?.dashboardWidgets ?? []).map((entry) => `widget:${entry}`),
      ...(migration.extensionMigrations?.storefrontBlocks ?? []).map((entry) => `block:${entry}`),
    ]),
  })
  return registry[addonId]
}

async function validateManifestBeforeSave(manifest: AddonManifest) {
  const manifests = await listAddonManifests()
  const issues = getManifestValidationIssues(manifest, manifests)
  if (issues.length > 0) {
    throw new Error(issues.join('; '))
  }
}

export async function saveAddonManifestFile(contents: string) {
  await ensurePackagesDirectory()
  const trimmed = contents.trim()
  const manifest = trimmed.startsWith('<')
    ? parseAddonXmlManifest(trimmed, 'uploaded')
    : normalizeManifest({
        ...JSON.parse(contents),
        sourceType: 'uploaded',
      })
  if (!manifest) {
    throw new Error('Invalid addon manifest')
  }
  await validateManifestBeforeSave(manifest)

  const addonDir = path.join(ADDON_PACKAGES_DIR, manifest.id)
  await fs.mkdir(addonDir, { recursive: true })
  await fs.writeFile(path.join(addonDir, 'addon.json'), JSON.stringify(manifest, null, 2), 'utf8')
  if (manifest.scheme?.format === 'addon.xml') {
    await fs.writeFile(path.join(addonDir, 'addon.xml'), contents, 'utf8')
  }
  const [fingerprint, packageMeta] = await Promise.all([getAddonPackageFingerprint(manifest), readPackageMeta()])
  const now = new Date().toISOString()
  packageMeta[manifest.id] = {
    fingerprint,
    uploadedAt: packageMeta[manifest.id]?.uploadedAt ?? now,
    verifiedAt: now,
    sourceType: 'uploaded',
  }
  await writePackageMeta(packageMeta)
  return manifest
}

export async function updateAddonManifestCore(
  addonId: string,
  input: AddonManifestCoreInput,
  identity?: AddonOperatorIdentity
) {
  const manifest = await getManifestById(addonId)
  if (!manifest) {
    throw new Error('Addon package not found')
  }
  if (manifest.sourceType !== 'uploaded') {
    throw new Error('Only uploaded addons can be edited in the workbench')
  }

  const nextManifestDraft = {
    ...manifest,
    name: input.name?.trim() || manifest.name,
    description: input.description?.trim() || manifest.description,
    category: input.category?.trim() || manifest.category,
    author: input.author?.trim() || manifest.author,
    tags: input.tags?.length ? input.tags : manifest.tags,
    release: {
      channel: input.releaseChannel ?? manifest.release?.channel ?? 'stable',
      notes: input.releaseNotes?.trim() || manifest.release?.notes,
    },
    entrypoints: manifest.entrypoints
      ? {
          ...manifest.entrypoints,
          docsHref: input.docsHref?.trim() || manifest.entrypoints.docsHref,
          adminHref: input.adminHref?.trim() || manifest.entrypoints.adminHref,
          adminPages: manifest.entrypoints.adminPages?.map((page, index) => ({
            ...page,
            label:
              index === 0 && input.adminPageLabel?.trim()
                ? input.adminPageLabel.trim()
                : page.label,
            description:
              index === 0
                ? input.adminPageDescription?.trim() || page.description
                : page.description,
            href:
              index === 0 && input.adminHref?.trim()
                ? input.adminHref.trim()
                : page.href,
          })),
          storefrontPages: manifest.entrypoints.storefrontPages?.map((page, index) => ({
            ...page,
            title:
              index === 0
                ? input.storefrontPageTitle?.trim() || page.title
                : page.title,
            subtitle:
              index === 0
                ? input.storefrontPageSubtitle?.trim() || page.subtitle
                : page.subtitle,
            href:
              index === 0 && input.storefrontHref?.trim()
                ? input.storefrontHref.trim()
                : page.href,
          })),
        }
      : manifest.entrypoints,
    extensions: manifest.extensions
      ? {
          ...manifest.extensions,
          dashboardWidgets: manifest.extensions.dashboardWidgets?.map((widget, index) => ({
            ...widget,
            title:
              index === 0
                ? input.widgetTitle?.trim() || widget.title
                : widget.title,
            subtitle:
              index === 0
                ? input.widgetSubtitle?.trim() || widget.subtitle
                : widget.subtitle,
            href:
              index === 0 && input.widgetHref?.trim()
                ? input.widgetHref.trim()
                : widget.href,
          })),
          storefrontBlocks: manifest.extensions.storefrontBlocks?.map((block, index) => ({
            ...block,
            title:
              index === 0
                ? input.blockTitle?.trim() || block.title
                : block.title,
            subtitle:
              index === 0
                ? input.blockSubtitle?.trim() || block.subtitle
                : block.subtitle,
            href:
              index === 0 && input.blockHref?.trim()
                ? input.blockHref.trim()
                : block.href,
          })),
        }
      : manifest.extensions,
    settings: input.settingsSchema?.sections?.length ? input.settingsSchema : manifest.settings,
  }

  const nextManifest = normalizeManifest(nextManifestDraft)
  if (!nextManifest) {
    throw new Error('Edited addon manifest is invalid')
  }

  await validateManifestBeforeSave(nextManifest)
  const addonDir = path.join(ADDON_PACKAGES_DIR, addonId)
  await fs.writeFile(path.join(addonDir, 'addon.json'), JSON.stringify(nextManifest, null, 2), 'utf8')

  const [fingerprint, packageMeta] = await Promise.all([getAddonPackageFingerprint(nextManifest), readPackageMeta()])
  if (packageMeta[addonId]) {
    packageMeta[addonId] = {
      ...packageMeta[addonId],
      fingerprint,
      verifiedAt: new Date().toISOString(),
    }
    await writePackageMeta(packageMeta)
  }

  await appendAddonAuditEntry(addonId, 'save-settings', identity, {
    manifestWorkbench: true,
    changedFields: Object.keys(input).filter((key) => input[key as keyof AddonManifestCoreInput] !== undefined),
  })

  return nextManifest
}

export async function saveAddonBundleFile(contents: string) {
  await ensurePackagesDirectory()
  const parsed = JSON.parse(contents) as {
    manifest?: unknown
    assets?: Record<string, string>
  }
  const manifest = normalizeManifest({
    ...(isRecord(parsed.manifest) ? parsed.manifest : {}),
    sourceType: 'uploaded',
  })
  if (!manifest) {
    throw new Error('Invalid addon bundle manifest')
  }
  await validateManifestBeforeSave(manifest)

  const addonDir = path.join(ADDON_PACKAGES_DIR, manifest.id)
  await fs.mkdir(addonDir, { recursive: true })
  await fs.writeFile(path.join(addonDir, 'addon.json'), JSON.stringify(manifest, null, 2), 'utf8')
  if (parsed.assets && isRecord(parsed.assets)) {
    await writeAddonAssets(
      addonDir,
      Object.fromEntries(
        Object.entries(parsed.assets).filter(([, value]) => typeof value === 'string')
      ) as Record<string, string>
    )
  }
  const [fingerprint, packageMeta] = await Promise.all([getAddonPackageFingerprint(manifest), readPackageMeta()])
  const now = new Date().toISOString()
  packageMeta[manifest.id] = {
    fingerprint,
    uploadedAt: packageMeta[manifest.id]?.uploadedAt ?? now,
    verifiedAt: now,
    sourceType: 'uploaded',
  }
  await writePackageMeta(packageMeta)
  return manifest
}

export async function exportAddonBundle(addonId: string) {
  const manifest = await getManifestById(addonId)
  if (!manifest) {
    throw new Error('Addon package not found')
  }
  const addonDir = path.join(ADDON_PACKAGES_DIR, addonId)
  const assets = await collectAddonAssets(addonDir)
  return {
    manifest,
    assets,
    exportedAt: new Date().toISOString(),
  }
}

async function captureAddonSnapshot(
  addonId: string,
  action: 'install' | 'activate' | 'deactivate' | 'uninstall' | 'save-settings',
  registryEntry?: AddonRegistryEntry
) {
  const [snapshots, manifest] = await Promise.all([readSnapshots(), getManifestById(addonId)])
  const existing = snapshots[addonId] ?? []
  const bundle = manifest ? await exportAddonBundle(addonId) : null
  const snapshot: AddonSnapshot = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    addonId,
    action,
    createdAt: new Date().toISOString(),
    registryEntry,
    bundle,
  }

  snapshots[addonId] = [snapshot, ...existing].slice(0, 5)
  await writeSnapshots(snapshots)
}

export async function restoreAddonSnapshot(addonId: string, snapshotId: string, identity?: AddonOperatorIdentity) {
  const [snapshots, registry, packageMeta] = await Promise.all([readSnapshots(), readRegistry(), readPackageMeta()])
  const snapshot = (snapshots[addonId] ?? []).find((item) => item.id === snapshotId)
  if (!snapshot) {
    throw new Error('Snapshot not found')
  }

  if (snapshot.bundle) {
    const addonDir = path.join(ADDON_PACKAGES_DIR, addonId)
    await fs.mkdir(addonDir, { recursive: true })
    await fs.writeFile(path.join(addonDir, 'addon.json'), JSON.stringify(snapshot.bundle.manifest, null, 2), 'utf8')
    await writeAddonAssets(addonDir, snapshot.bundle.assets)
    const fingerprint = await getAddonPackageFingerprint(snapshot.bundle.manifest)
    if (snapshot.bundle.manifest.sourceType === 'uploaded') {
      packageMeta[addonId] = {
        fingerprint,
        uploadedAt: packageMeta[addonId]?.uploadedAt ?? snapshot.createdAt,
        verifiedAt: new Date().toISOString(),
        sourceType: 'uploaded',
      }
    } else {
      delete packageMeta[addonId]
    }
  }

  if (snapshot.registryEntry) {
    registry[addonId] = snapshot.registryEntry
  } else {
    delete registry[addonId]
  }

  await writeRegistry(registry)
  await writePackageMeta(packageMeta)
  await appendAddonAuditEntry(addonId, 'restore', identity, { snapshotId })

  const manifest = await getManifestById(addonId)
  if (manifest && snapshot.registryEntry) {
    await syncMappedSiteSettings(manifest, snapshot.registryEntry.settings)
  }

  return {
    success: true,
    snapshotId,
  }
}

export async function getAddonRestorePlan(addonId: string, snapshotId: string) {
  const [snapshots, registry, packageMeta, trustPolicy] = await Promise.all([
    readSnapshots(),
    readRegistry(),
    readPackageMeta(),
    readTrustPolicy(),
  ])
  const snapshot = (snapshots[addonId] ?? []).find((item) => item.id === snapshotId)
  if (!snapshot) {
    throw new Error('Snapshot not found')
  }

  const currentRegistryEntry = registry[addonId]
  const currentPackageMeta = packageMeta[addonId]
  const currentTrust = trustPolicy[addonId]
  const targetFingerprint = snapshot.bundle
    ? getAddonBundleFingerprint(snapshot.bundle.manifest, snapshot.bundle.assets)
    : currentPackageMeta?.fingerprint

  const effects: string[] = []
  const warnings: string[] = []

  if (snapshot.registryEntry) {
    effects.push(`Restore registry state to ${snapshot.registryEntry.status}`)
    effects.push(`Restore addon version to ${snapshot.registryEntry.version}`)
  } else {
    effects.push('Remove installed registry state for this addon')
  }

  if (snapshot.bundle) {
    effects.push(`Overwrite package files from ${snapshot.action} snapshot`)
    effects.push(`Restore package fingerprint ${String(targetFingerprint).slice(0, 12)}...`)
  }

  if (currentRegistryEntry?.status !== snapshot.registryEntry?.status) {
    warnings.push(`Current runtime state ${currentRegistryEntry?.status ?? 'not installed'} will change to ${snapshot.registryEntry?.status ?? 'not installed'}`)
  }

  if (currentRegistryEntry?.version !== snapshot.registryEntry?.version) {
    warnings.push(`Current version ${currentRegistryEntry?.version ?? 'none'} will change to ${snapshot.registryEntry?.version ?? 'none'}`)
  }

  if (currentPackageMeta?.fingerprint && targetFingerprint && currentPackageMeta.fingerprint !== targetFingerprint) {
    warnings.push('Current verified package fingerprint will be replaced')
  }

  if (currentTrust?.fingerprint && targetFingerprint && currentTrust.fingerprint !== targetFingerprint) {
    warnings.push('Current trusted fingerprint will not match the restored package until trust is updated')
  }

  return {
    addonId,
    snapshotId,
    snapshotAction: snapshot.action,
    snapshotCreatedAt: snapshot.createdAt,
    current: {
      installed: Boolean(currentRegistryEntry),
      status: currentRegistryEntry?.status ?? 'not installed',
      version: currentRegistryEntry?.version ?? null,
      fingerprint: currentPackageMeta?.fingerprint ?? null,
      trustedFingerprint: currentTrust?.fingerprint ?? null,
    },
    target: {
      installed: Boolean(snapshot.registryEntry),
      status: snapshot.registryEntry?.status ?? 'not installed',
      version: snapshot.registryEntry?.version ?? null,
      fingerprint: targetFingerprint ?? null,
      trustedFingerprint: currentTrust?.fingerprint ?? null,
    },
    warnings,
    effects,
  }
}

export async function trustAddonPackage(addonId: string, identity?: AddonOperatorIdentity) {
  const manifest = await getManifestById(addonId)
  if (!manifest) {
    throw new Error('Addon package not found')
  }
  const fingerprint = await getAddonPackageFingerprint(manifest)
  const trustPolicy = await readTrustPolicy()
  trustPolicy[addonId] = {
    fingerprint,
    trustedAt: new Date().toISOString(),
  }
  await writeTrustPolicy(trustPolicy)
  await appendAddonAuditEntry(addonId, 'trust', identity, { fingerprint })
  return { success: true, addonId, fingerprint }
}

export async function untrustAddonPackage(addonId: string, identity?: AddonOperatorIdentity) {
  const trustPolicy = await readTrustPolicy()
  delete trustPolicy[addonId]
  await writeTrustPolicy(trustPolicy)
  await appendAddonAuditEntry(addonId, 'untrust', identity)
  return { success: true, addonId }
}

export async function approveAddonPackage(addonId: string, identity?: AddonOperatorIdentity) {
  const manifest = await getManifestById(addonId)
  if (!manifest) {
    throw new Error('Addon package not found')
  }
  const fingerprint = await getAddonPackageFingerprint(manifest)
  const packageMeta = await readPackageMeta()
  const existing = packageMeta[addonId]
  packageMeta[addonId] = {
    fingerprint,
    uploadedAt: existing?.uploadedAt ?? new Date().toISOString(),
    verifiedAt: existing?.verifiedAt ?? new Date().toISOString(),
    sourceType: manifest.sourceType ?? 'builtin',
    approvedAt: new Date().toISOString(),
    approvedBy: identity?.id ?? 'system',
    approvedFingerprint: fingerprint,
  }
  await writePackageMeta(packageMeta)
  await appendAddonAuditEntry(addonId, 'approve', identity, { fingerprint })
  return { success: true, addonId, fingerprint }
}

export async function unapproveAddonPackage(addonId: string, identity?: AddonOperatorIdentity) {
  const packageMeta = await readPackageMeta()
  if (packageMeta[addonId]) {
    delete packageMeta[addonId].approvedAt
    delete packageMeta[addonId].approvedBy
    delete packageMeta[addonId].approvedFingerprint
    await writePackageMeta(packageMeta)
  }
  await appendAddonAuditEntry(addonId, 'unapprove', identity)
  return { success: true, addonId }
}

export async function getAddonChannelPolicy() {
  return readChannelPolicy()
}

export async function updateAddonChannelPolicy(policy: AddonChannelPolicy, identity?: AddonOperatorIdentity) {
  await writeChannelPolicy(policy)
  await appendAddonAuditEntry('system', 'save-settings', identity, {
    setting: 'addonChannelPolicy',
    ...policy,
  })
  return policy
}

export async function exportAddonOwnedData(addonId: string) {
  const manifest = await getManifestById(addonId)
  if (!manifest) {
    throw new Error('Addon package not found')
  }

  const ownedData = await getAddonOwnedData(manifest)
  const siteSettings = await getSiteSettingsMap(ownedData.exportSiteSettings)

  return {
    addonId,
    exportedAt: new Date().toISOString(),
    dataGovernance: ownedData,
    siteSettings: Object.fromEntries(siteSettings.entries()),
  }
}

export async function getAddonTextAsset(addonId: string, relativePath: string) {
  const manifest = await getManifestById(addonId)
  if (!manifest) {
    throw new Error('Addon package not found')
  }
  const contents = await readAddonTextAsset(addonId, relativePath)
  if (contents === null) {
    throw new Error('Addon asset not found')
  }
  return contents
}

export async function updateAddonTextAssets(
  addonId: string,
  assets: Record<string, string>,
  identity?: AddonOperatorIdentity
) {
  const manifest = await getManifestById(addonId)
  if (!manifest) {
    throw new Error('Addon package not found')
  }
  if (manifest.sourceType !== 'uploaded') {
    throw new Error('Only uploaded addons can edit package assets')
  }

  const safeAssets = Object.fromEntries(
    Object.entries(assets).filter(([relativePath, value]) =>
      isSafeRelativeAddonPath(relativePath) && typeof value === 'string'
    )
  )
  if (Object.keys(safeAssets).length === 0) {
    throw new Error('No valid addon text assets provided')
  }

  const addonDir = path.join(ADDON_PACKAGES_DIR, addonId)
  await writeAddonAssets(addonDir, safeAssets)

  const [fingerprint, packageMeta] = await Promise.all([getAddonPackageFingerprint(manifest), readPackageMeta()])
  if (packageMeta[addonId]) {
    packageMeta[addonId] = {
      ...packageMeta[addonId],
      fingerprint,
      verifiedAt: new Date().toISOString(),
    }
    await writePackageMeta(packageMeta)
  }

  await appendAddonAuditEntry(addonId, 'save-settings', identity, {
    assetWorkbench: true,
    changedAssets: Object.keys(safeAssets),
  })

  return {
    success: true,
    addonId,
    changedAssets: Object.keys(safeAssets),
  }
}

export async function assertAddonOperatorAccess(addonId: string, identity: AddonOperatorIdentity) {
  const manifest = await getManifestById(addonId)
  if (!manifest) {
    throw new Error('Addon package not found')
  }
  const { canOperate } = evaluateAddonOperators(manifest.operators, identity)
  if (!canOperate) {
    throw new Error('You do not have permission to operate this addon')
  }
  return manifest
}

export async function installAddon(
  addonId: string,
  identity?: AddonOperatorIdentity,
  options?: {
    overrideReadiness?: boolean
    allowApprovedOverrideExecution?: boolean
  }
) {
  const manifest = await getManifestById(addonId)
  if (!manifest) {
    throw new Error('Addon package not found')
  }

  const plan = await getAddonActionPlan(addonId, 'install', { ...options, identity })
  if (plan.blockers.length > 0) {
    throw new Error(plan.blockers.join('; '))
  }

  const [registry, packageMeta, manifests] = await Promise.all([readRegistry(), readPackageMeta(), listAddonManifests()])
  for (const dependency of manifest.dependencies ?? []) {
    if (!registry[dependency]) {
      throw new Error(`Install dependency "${dependency}" first`)
    }
  }
  assertAddonCompatibility(manifest, registry)
  assertAddonConflicts(manifest, manifests, registry, 'install')
  const approval = getAddonApprovalStatus(manifest, await getAddonPackageFingerprint(manifest), packageMeta[addonId])
  if (approval.status !== 'builtin' && approval.status !== 'approved') {
    throw new Error('Approve this uploaded package before install')
  }

  const now = new Date().toISOString()
  const current = registry[addonId]
  await captureAddonSnapshot(addonId, 'install', current)
  const nextSettings = {
    ...getDefaultSettings(manifest),
    ...(current?.settings ?? {}),
  }

  await assertAddonInstallPrerequisites(manifest, current ? { ...current, settings: nextSettings } : {
    id: manifest.id,
    version: manifest.version,
    status: 'inactive',
    installedAt: now,
    updatedAt: now,
    sourceType: manifest.sourceType ?? 'builtin',
    settings: nextSettings,
  })

  registry[addonId] = {
    id: manifest.id,
    version: manifest.version,
    status: 'active',
    installedAt: current?.installedAt ?? now,
    updatedAt: now,
    sourceType: manifest.sourceType ?? 'builtin',
    settings: nextSettings,
  }

  await applyInstallSeeds(manifest)
  await syncMappedSiteSettings(manifest, nextSettings)
  await writeRegistry(registry)
  await appendAddonAuditEntry(addonId, 'install', identity, { version: registry[addonId].version, status: 'active' })
  return registry[addonId]
}

function ensureNoActiveDependents(registry: AddonRegistryMap, manifests: AddonManifest[], addonId: string) {
  const activeDependents = manifests.filter((manifest) => {
    if (!(manifest.dependencies ?? []).includes(addonId)) return false
    return registry[manifest.id]?.status === 'active'
  })

  if (activeDependents.length > 0) {
    throw new Error(`Disable dependent addons first: ${activeDependents.map((item) => item.name).join(', ')}`)
  }
}

export async function activateAddon(
  addonId: string,
  identity?: AddonOperatorIdentity,
  options?: {
    overrideReadiness?: boolean
    allowApprovedOverrideExecution?: boolean
  }
) {
  const [manifest, registry, packageMeta, manifests] = await Promise.all([
    getManifestById(addonId),
    readRegistry(),
    readPackageMeta(),
    listAddonManifests(),
  ])
  if (!manifest || !registry[addonId]) {
    throw new Error('Addon is not installed')
  }

  const plan = await getAddonActionPlan(addonId, 'activate', { ...options, identity })
  if (plan.blockers.length > 0) {
    throw new Error(plan.blockers.join('; '))
  }

  for (const dependency of manifest.dependencies ?? []) {
    if (registry[dependency]?.status !== 'active') {
      throw new Error(`Activate dependency "${dependency}" first`)
    }
  }
  assertAddonCompatibility(manifest, registry)
  assertAddonConflicts(manifest, manifests, registry, 'activate')
  const approval = getAddonApprovalStatus(manifest, await getAddonPackageFingerprint(manifest), packageMeta[addonId])
  if (approval.status !== 'builtin' && approval.status !== 'approved') {
    throw new Error('Approve this uploaded package before activation')
  }
  await captureAddonSnapshot(addonId, 'activate', registry[addonId])

  await assertAddonInstallPrerequisites(manifest, registry[addonId])

  registry[addonId] = {
    ...registry[addonId],
    status: 'active',
    updatedAt: new Date().toISOString(),
  }
  await syncMappedSiteSettings(manifest, registry[addonId].settings)
  await writeRegistry(registry)
  await appendAddonAuditEntry(addonId, 'activate', identity, { version: registry[addonId].version })
  return registry[addonId]
}

export async function deactivateAddon(addonId: string, identity?: AddonOperatorIdentity) {
  const [registry, manifests] = await Promise.all([readRegistry(), listAddonManifests()])
  if (!registry[addonId]) {
    throw new Error('Addon is not installed')
  }
  ensureNoActiveDependents(registry, manifests, addonId)
  await captureAddonSnapshot(addonId, 'deactivate', registry[addonId])
  registry[addonId] = {
    ...registry[addonId],
    status: 'inactive',
    updatedAt: new Date().toISOString(),
  }
  await writeRegistry(registry)
  await appendAddonAuditEntry(addonId, 'deactivate', identity, { version: registry[addonId].version })
  return registry[addonId]
}

export async function uninstallAddon(addonId: string, identity?: AddonOperatorIdentity) {
  const [manifest, registry, manifests] = await Promise.all([getManifestById(addonId), readRegistry(), listAddonManifests()])
  if (!manifest || !registry[addonId]) {
    throw new Error('Addon is not installed')
  }
  ensureNoActiveDependents(registry, manifests, addonId)
  await captureAddonSnapshot(addonId, 'uninstall', registry[addonId])
  await applyUninstallCleanup(manifest)
  delete registry[addonId]
  await writeRegistry(registry)
  await appendAddonAuditEntry(addonId, 'uninstall', identity)
  return { success: true }
}

export async function updateAddonSettings(addonId: string, settings: Record<string, unknown>, identity?: AddonOperatorIdentity) {
  const [manifest, registry] = await Promise.all([getManifestById(addonId), readRegistry()])
  if (!manifest || !registry[addonId]) {
    throw new Error('Addon is not installed')
  }
  await captureAddonSnapshot(addonId, 'save-settings', registry[addonId])

  registry[addonId] = {
    ...registry[addonId],
    settings: {
      ...registry[addonId].settings,
      ...settings,
    },
    updatedAt: new Date().toISOString(),
  }

  await syncMappedSiteSettings(manifest, registry[addonId].settings)
  await writeRegistry(registry)
  await appendAddonAuditEntry(addonId, 'save-settings', identity, {
    changedKeys: Object.keys(settings),
  })
  return registry[addonId]
}

export async function getAddonMappedSettings(addonId: string) {
  const manifest = await getManifestById(addonId)
  if (!manifest) return {}
  const mappedFields = (manifest.settings?.sections ?? [])
    .flatMap((section) => section.fields)
    .filter((field) => Boolean(field.siteSettingKey))
  if (mappedFields.length === 0) return {}

  const rows = await prisma.siteSettings.findMany({
    where: {
      key: { in: mappedFields.map((field) => field.siteSettingKey as string) },
    },
  })
  const valueMap = new Map(rows.map((row) => [row.key, readStoredSetting(row.value)]))
  return Object.fromEntries(
    mappedFields.map((field) => [field.id, valueMap.get(field.siteSettingKey as string) ?? field.defaultValue ?? null])
  )
}
