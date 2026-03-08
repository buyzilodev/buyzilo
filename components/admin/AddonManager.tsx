'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type AddonField = {
  id: string
  label: string
  type: 'text' | 'textarea' | 'checkbox' | 'number' | 'select' | 'json' | 'url'
  description?: string
  defaultValue?: unknown
  options?: Array<{ value: string; label: string }>
  siteSettingKey?: string
}

type ManifestWorkbenchState = {
  name: string
  description: string
  category: string
  author: string
  tags: string
  adminHref: string
  storefrontHref: string
  docsHref: string
  adminPageLabel: string
  adminPageDescription: string
  storefrontPageTitle: string
  storefrontPageSubtitle: string
  widgetTitle: string
  widgetSubtitle: string
  widgetHref: string
  blockTitle: string
  blockSubtitle: string
  blockHref: string
  settingsSchemaJson: string
  releaseChannel: 'stable' | 'beta' | 'private'
  releaseNotes: string
}

type AssetWorkbenchState = {
  readme: string
  previewSvg: string
}

type SettingsSchemaSection = {
  id: string
  label: string
  description?: string
  fields: AddonField[]
}

function createEmptyManifestWorkbenchState(): ManifestWorkbenchState {
  return {
    name: '',
    description: '',
    category: '',
    author: '',
    tags: '',
    adminHref: '',
    storefrontHref: '',
    docsHref: '',
    adminPageLabel: '',
    adminPageDescription: '',
    storefrontPageTitle: '',
    storefrontPageSubtitle: '',
    widgetTitle: '',
    widgetSubtitle: '',
    widgetHref: '',
    blockTitle: '',
    blockSubtitle: '',
    blockHref: '',
    settingsSchemaJson: '',
    releaseChannel: 'stable',
    releaseNotes: '',
  }
}

function parseSettingsSchemaJson(value: string): { sections: SettingsSchemaSection[] } {
  try {
    const parsed = JSON.parse(value || '{"sections":[]}') as { sections?: SettingsSchemaSection[] }
    return {
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
    }
  } catch {
    return { sections: [] }
  }
}

type AddonCatalogItem = {
  manifest: {
    id: string
    name: string
    version: string
    description: string
    category: string
    author?: string
    dependencies?: string[]
    tags?: string[]
    sourceType?: 'builtin' | 'uploaded'
    documentation?: {
      readmePath?: string
      readmeContent?: string
      screenshots?: Array<{ src: string; caption?: string }>
    }
    scheme?: {
      format: 'addon.json' | 'addon.xml'
      priority?: number
      status?: 'active' | 'disabled'
      defaultLanguage?: string
      autoInstall?: boolean
      editionType?: string[]
      supplier?: string
      supplierLink?: string
      coreVersion?: string
      coreEditions?: string[]
    }
    hooks?: Array<{
      id: string
      name: string
      type: 'php' | 'template' | 'schema' | 'event' | 'route'
      target?: string
      description?: string
    }>
    operators?: {
      allowedRoles?: string[]
      requiredPermissions?: string[]
    }
    entrypoints?: {
      adminHref?: string
      docsHref?: string
      adminPages?: Array<{ id: string; label: string; href: string; description?: string }>
      storefrontPages?: Array<{ id: string; href: string; title?: string; subtitle?: string }>
    }
    extensions?: {
      dashboardWidgets?: Array<{ id: string; title: string; subtitle: string; href: string }>
      storefrontBlocks?: Array<{ id: string; title: string; subtitle: string; href: string; page: 'home' }>
    }
    settings?: {
      sections: Array<{
        id: string
        label: string
        description?: string
        fields: AddonField[]
      }>
    }
  }
  installed: boolean
  active: boolean
  canOperate?: boolean
  operatorStatus?: {
    roleAllowed: boolean
    permissionsAllowed: boolean
  }
  registry?: {
    settings: Record<string, unknown>
    installedAt: string
  }
  mappedSettings?: Record<string, unknown>
  dependencyStatus?: {
    missing: string[]
    inactive: string[]
    activeDependents: string[]
  }
  diagnostics?: {
    adminPageCount: number
    storefrontPageCount: number
    dashboardWidgetCount: number
    storefrontBlockCount: number
    settingsFieldCount: number
    mappedSettingCount: number
    upgradeMigrationCount: number
    extensionMigrationCount: number
    governedExportCount: number
    governedCleanupCount: number
    conflictCount: number
    exclusiveGroupCount: number
    hookCount: number
    lifecycleTaskCount: number
    schemeFormat: 'addon.json' | 'addon.xml'
    hasReadme: boolean
    screenshotCount: number
    health: 'healthy' | 'warning'
    issues: string[]
    prerequisites: Array<{
      id: string
      label: string
      type: 'siteSetting' | 'addonSetting'
      key: string
      description?: string
      satisfied: boolean
    }>
    compatibility: {
      appVersion: string
      appSatisfied: boolean
      addonConstraints: Array<{
        addonId: string
        min?: string
        max?: string
        installedVersion?: string
        satisfied: boolean
      }>
    }
    conflicts: Array<{
      addonId: string
      reason?: string
      mode: 'install' | 'activate' | 'both'
      installed: boolean
      active: boolean
    }>
  }
  hookTrace?: Array<{
    addonId: string
    addonName: string
    id: string
    name: string
    type: 'php' | 'template' | 'schema' | 'event' | 'route'
    target?: string
    description?: string
    active: boolean
    scope: 'admin' | 'storefront' | 'system'
    targetExists: boolean | null
    status: 'bound' | 'missing-target' | 'inactive'
  }>
  verification?: {
    sourceType: 'builtin' | 'uploaded'
    fingerprint: string
    verifiedAt?: string
    uploadedAt?: string
    status: 'builtin' | 'verified-upload' | 'package-changed' | 'uploaded-untracked'
  }
  trust?: {
    status: 'builtin' | 'trusted' | 'untrusted' | 'trust-mismatch'
    fingerprint: string
    trustedAt?: string
  }
  approval?: {
    status: 'builtin' | 'approved' | 'unapproved' | 'approval-stale'
    fingerprint: string
    approvedAt?: string
    approvedBy?: string
  }
  ownedData?: {
    exportSiteSettings: string[]
    cleanupSiteSettings: string[]
    retentionNote?: string
    availableExportCount: number
  }
  smokeTest?: AddonSmokeTestReport
  readiness?: {
    status: 'ready' | 'risky' | 'blocked'
    score: number
    reasons: string[]
  }
  auditLog?: AddonAuditEntry[]
  updateStatus?: {
    currentVersion: string
    availableVersion: string
    updateAvailable: boolean
    channel: 'stable' | 'beta' | 'private'
  }
  snapshots?: AddonSnapshot[]
  overrideRequests?: Array<{
    id: string
    addonId: string
    executionAction: 'install' | 'activate' | 'upgrade' | 'resolve-install' | 'resolve-activate' | 'resolve-replace-install' | 'resolve-replace-activate'
    requestedAt: string
    requestedById: string
    requestedByRole: string
    status: 'pending' | 'approved' | 'rejected' | 'executed'
    readinessStatus: 'ready' | 'risky' | 'blocked'
    readinessScore: number
    readinessReasons: string[]
    approvedAt?: string
    approvedById?: string
    approvedByRole?: string
    rejectedAt?: string
    rejectedById?: string
    rejectedByRole?: string
    executedAt?: string
  }>
}

type AddonResponse = {
  catalog: AddonCatalogItem[]
  templates: Array<{
    id: string
    label: string
    description: string
    category: string
    preset: 'marketing' | 'content' | 'operations' | 'integration'
    available: boolean
    manifest: {
      id: string
      name: string
      version: string
    }
    defaults: {
      addonId: string
      name: string
      description: string
      adminHref: string
      storefrontHref: string
    }
  }>
  channelPolicy: {
    allowBeta: boolean
    allowPrivate: boolean
    requireReady: boolean
    allowReadinessOverride: boolean
    requireOverrideApproval: boolean
    overrideRoles: string[]
  }
  summary: {
    total: number
    installed: number
    active: number
    available: number
  }
}

type AddonActionName =
  | 'install'
  | 'activate'
  | 'deactivate'
  | 'uninstall'
  | 'save-settings'
  | 'trust'
  | 'untrust'
  | 'approve'
  | 'unapprove'
  | 'resolve-install'
  | 'resolve-activate'
  | 'resolve-replace-install'
  | 'resolve-replace-activate'
  | 'save-manifest'
  | 'upgrade'

type AddonOverrideExecutionAction =
  | 'install'
  | 'activate'
  | 'upgrade'
  | 'resolve-install'
  | 'resolve-activate'
  | 'resolve-replace-install'
  | 'resolve-replace-activate'

type AddonActionPlan = {
  addonId: string
  addonName: string
  action: AddonActionName
  blockers: string[]
  warnings: string[]
  effects: string[]
  compatibility: {
    appVersion: string
    appSatisfied: boolean
    addonConstraints: Array<{
      addonId: string
      min?: string
      max?: string
      installedVersion?: string
      satisfied: boolean
    }>
  }
  prerequisites: Array<{
    id: string
    label: string
    type: 'siteSetting' | 'addonSetting'
    key: string
    description?: string
    satisfied: boolean
  }>
  dependencyStatus: {
    dependencies: string[]
    activeDependents: string[]
  }
  dependencyResolution: {
    installChain: string[]
    activateChain: string[]
    missingPackages: string[]
  }
  conflictStatus: {
    install: Array<{
      addonId: string
      reason?: string
      mode: 'install' | 'activate' | 'both'
      installed: boolean
      active: boolean
    }>
    activate: Array<{
      addonId: string
      reason?: string
      mode: 'install' | 'activate' | 'both'
      installed: boolean
      active: boolean
    }>
  }
  replacementPlan: {
    canReplace: boolean
    deactivateChain: string[]
    blockers: string[]
    effects: string[]
  }
  channelPolicy: {
    allowBeta: boolean
    allowPrivate: boolean
    requireReady: boolean
    allowReadinessOverride: boolean
    requireOverrideApproval: boolean
    overrideRoles: string[]
  }
  channel: 'stable' | 'beta' | 'private'
  readiness: {
    status: 'ready' | 'risky' | 'blocked'
    score: number
    reasons: string[]
  }
  overrideReadiness: boolean
}

type AddonRestorePlan = {
  addonId: string
  snapshotId: string
  snapshotAction: 'install' | 'activate' | 'deactivate' | 'uninstall' | 'save-settings'
  snapshotCreatedAt: string
  current: {
    installed: boolean
    status: string
    version: string | null
    fingerprint: string | null
    trustedFingerprint: string | null
  }
  target: {
    installed: boolean
    status: string
    version: string | null
    fingerprint: string | null
    trustedFingerprint: string | null
  }
  warnings: string[]
  effects: string[]
}

type AddonRuntimePreview = {
  addonId: string
  addonName: string
  installed: boolean
  active: boolean
  adminPages: Array<{
    id: string
    label: string
    href: string
    description?: string
    visible: boolean
    visibility: {
      roles: string[]
      permissions: string[]
      audiences: Array<'guest' | 'authenticated'>
    }
  }>
  storefrontPages: Array<{
    id: string
    label: string
    href: string
    description?: string
    visible: boolean
    guestVisible: boolean
    authenticatedVisible: boolean
    visibility: {
      roles: string[]
      permissions: string[]
      audiences: Array<'guest' | 'authenticated'>
    }
  }>
  dashboardWidgets: Array<{
    id: string
    label: string
    href: string
    description?: string
    visible: boolean
    visibility: {
      roles: string[]
      permissions: string[]
      audiences: Array<'guest' | 'authenticated'>
    }
  }>
  storefrontBlocks: Array<{
    id: string
    label: string
    href: string
    description?: string
    visible: boolean
    guestVisible: boolean
    authenticatedVisible: boolean
    page: 'home'
    tone?: 'amber' | 'rose' | 'blue' | 'emerald' | 'violet' | 'slate'
    visibility: {
      roles: string[]
      permissions: string[]
      audiences: Array<'guest' | 'authenticated'>
    }
  }>
}

type AddonSmokeTestReport = {
  addonId: string
  addonName: string
  installed: boolean
  active: boolean
  summary: {
    pass: number
    warn: number
    fail: number
  }
  checks: Array<{
    id: string
    label: string
    status: 'pass' | 'warn' | 'fail'
    detail: string
  }>
}

type AddonSnapshot = {
  id: string
  addonId: string
  action: 'install' | 'activate' | 'deactivate' | 'uninstall' | 'save-settings'
  createdAt: string
}

type AddonAuditEntry = {
  id: string
  addonId: string
  action: 'install' | 'activate' | 'deactivate' | 'uninstall' | 'upgrade' | 'save-settings' | 'trust' | 'untrust' | 'restore' | 'request-override' | 'approve-override' | 'reject-override'
  createdAt: string
  operatorId: string
  operatorRole: string
  details?: Record<string, unknown>
}

function normalizeFieldValue(field: AddonField, value: unknown) {
  if (field.type === 'checkbox') return Boolean(value)
  if (field.type === 'number') return String(value ?? field.defaultValue ?? 0)
  if (field.type === 'json') return typeof value === 'string' ? value : JSON.stringify(value ?? field.defaultValue ?? {}, null, 2)
  return String(value ?? field.defaultValue ?? '')
}

function parseOutgoingFieldValue(field: AddonField, value: unknown) {
  if (field.type === 'checkbox') return Boolean(value)
  if (field.type === 'number') return Number(value ?? 0)
  if (field.type === 'json') {
    try {
      return JSON.parse(String(value || '{}'))
    } catch {
      return {}
    }
  }
  return String(value ?? '')
}

function operatorSummary(item: AddonCatalogItem) {
  return {
    roles: item.manifest.operators?.allowedRoles?.length
      ? item.manifest.operators.allowedRoles.join(', ')
      : 'Any settings operator',
    permissions: item.manifest.operators?.requiredPermissions?.length
      ? item.manifest.operators.requiredPermissions.join(', ')
      : 'No extra permission scope',
  }
}

function healthTone(item: AddonCatalogItem) {
  return item.diagnostics?.health === 'healthy'
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-amber-100 text-amber-700'
}

function verificationTone(item: AddonCatalogItem) {
  switch (item.verification?.status) {
    case 'builtin':
    case 'verified-upload':
      return 'bg-emerald-100 text-emerald-700'
    case 'package-changed':
      return 'bg-rose-100 text-rose-700'
    default:
      return 'bg-amber-100 text-amber-700'
  }
}

function verificationLabel(item: AddonCatalogItem) {
  switch (item.verification?.status) {
    case 'builtin':
      return 'BUILTIN VERIFIED'
    case 'verified-upload':
      return 'UPLOADED VERIFIED'
    case 'package-changed':
      return 'PACKAGE CHANGED'
    case 'uploaded-untracked':
      return 'UPLOAD UNTRACKED'
    default:
      return 'UNKNOWN'
  }
}

function trustTone(item: AddonCatalogItem) {
  switch (item.trust?.status) {
    case 'builtin':
    case 'trusted':
      return 'bg-emerald-100 text-emerald-700'
    case 'trust-mismatch':
      return 'bg-rose-100 text-rose-700'
    default:
      return 'bg-amber-100 text-amber-700'
  }
}

function trustLabel(item: AddonCatalogItem) {
  switch (item.trust?.status) {
    case 'builtin':
      return 'BUILTIN TRUSTED'
    case 'trusted':
      return 'TRUSTED'
    case 'trust-mismatch':
      return 'TRUST MISMATCH'
    case 'untrusted':
      return 'UNTRUSTED'
    default:
      return 'UNKNOWN'
  }
}

function approvalTone(item: AddonCatalogItem) {
  switch (item.approval?.status) {
    case 'builtin':
    case 'approved':
      return 'bg-emerald-100 text-emerald-700'
    case 'approval-stale':
      return 'bg-rose-100 text-rose-700'
    default:
      return 'bg-amber-100 text-amber-700'
  }
}

function approvalLabel(item: AddonCatalogItem) {
  switch (item.approval?.status) {
    case 'builtin':
      return 'BUILTIN APPROVED'
    case 'approved':
      return 'APPROVED'
    case 'approval-stale':
      return 'APPROVAL STALE'
    case 'unapproved':
      return 'UNAPPROVED'
    default:
      return 'UNKNOWN'
  }
}

function readinessTone(item: AddonCatalogItem) {
  switch (item.readiness?.status) {
    case 'ready':
      return 'bg-emerald-100 text-emerald-700'
    case 'blocked':
      return 'bg-rose-100 text-rose-700'
    default:
      return 'bg-amber-100 text-amber-700'
  }
}

function readinessLabel(item: AddonCatalogItem) {
  switch (item.readiness?.status) {
    case 'ready':
      return 'DEPLOYMENT READY'
    case 'blocked':
      return 'DEPLOYMENT BLOCKED'
    case 'risky':
      return 'DEPLOYMENT RISKY'
    default:
      return 'READINESS UNKNOWN'
  }
}

function formatVisibilitySummary(visibility: {
  roles: string[]
  permissions: string[]
  audiences: Array<'guest' | 'authenticated'>
}) {
  const parts: string[] = []
  if (visibility.roles.length) parts.push(`roles: ${visibility.roles.join(', ')}`)
  if (visibility.permissions.length) parts.push(`permissions: ${visibility.permissions.join(', ')}`)
  if (visibility.audiences.length) parts.push(`audiences: ${visibility.audiences.join(', ')}`)
  return parts.length ? parts.join(' | ') : 'No extra visibility rules'
}

type AddonDetailTab = 'overview' | 'settings' | 'hooks' | 'lifecycle' | 'runtime' | 'diagnostics' | 'history' | 'workbench'

export function AddonManager({ focusedAddonId }: { focusedAddonId?: string } = {}) {
  const [data, setData] = useState<AddonResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [settingsState, setSettingsState] = useState<Record<string, Record<string, unknown>>>({})
  const [manifestState, setManifestState] = useState<Record<string, ManifestWorkbenchState>>({})
  const [assetState, setAssetState] = useState<Record<string, AssetWorkbenchState>>({})
  const [plan, setPlan] = useState<AddonActionPlan | null>(null)
  const [restorePlan, setRestorePlan] = useState<AddonRestorePlan | null>(null)
  const [runtimePreview, setRuntimePreview] = useState<AddonRuntimePreview | null>(null)
  const [smokeTest, setSmokeTest] = useState<AddonSmokeTestReport | null>(null)
  const [activeDetailTab, setActiveDetailTab] = useState<AddonDetailTab>('overview')
  const [registryQuery, setRegistryQuery] = useState('')
  const [registryStatusFilter, setRegistryStatusFilter] = useState<'all' | 'active' | 'installed' | 'available'>('all')
  const [registryCategoryFilter, setRegistryCategoryFilter] = useState('all')
  const [registrySort, setRegistrySort] = useState<'name' | 'readiness' | 'updated'>('name')
  const [channelPolicy, setChannelPolicy] = useState({ allowBeta: false, allowPrivate: false, requireReady: false, allowReadinessOverride: true, requireOverrideApproval: true, overrideRoles: ['ADMIN', 'MANAGER'] })
  const [templateState, setTemplateState] = useState<Record<string, {
    addonId: string
    name: string
    description: string
    adminHref: string
    storefrontHref: string
  }>>({})

  async function load() {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/addons')
      const next = await response.json()
      setData(next)
      setChannelPolicy(next.channelPolicy ?? { allowBeta: false, allowPrivate: false, requireReady: false, allowReadinessOverride: true, requireOverrideApproval: true, overrideRoles: ['ADMIN', 'MANAGER'] })
      const nextSettings: Record<string, Record<string, unknown>> = {}
      for (const item of (next.catalog ?? []) as AddonCatalogItem[]) {
        const merged = {
          ...(item.registry?.settings ?? {}),
          ...(item.mappedSettings ?? {}),
        }
        nextSettings[item.manifest.id] = Object.fromEntries(
          (item.manifest.settings?.sections ?? []).flatMap((section) =>
            section.fields.map((field) => [field.id, normalizeFieldValue(field, merged[field.id])])
          )
        )
      }
      setSettingsState(nextSettings)
      const nextManifestState: Record<string, ManifestWorkbenchState> = {}
      for (const item of (next.catalog ?? []) as AddonCatalogItem[]) {
        nextManifestState[item.manifest.id] = {
          name: item.manifest.name,
          description: item.manifest.description,
          category: item.manifest.category,
          author: item.manifest.author ?? '',
          tags: (item.manifest.tags ?? []).join(', '),
          adminHref: item.manifest.entrypoints?.adminPages?.[0]?.href ?? item.manifest.entrypoints?.adminHref ?? '',
          storefrontHref: item.manifest.entrypoints?.storefrontPages?.[0]?.href ?? '',
          docsHref: item.manifest.entrypoints?.docsHref ?? '',
          adminPageLabel: item.manifest.entrypoints?.adminPages?.[0]?.label ?? '',
          adminPageDescription: item.manifest.entrypoints?.adminPages?.[0]?.description ?? '',
          storefrontPageTitle: item.manifest.entrypoints?.storefrontPages?.[0]?.title ?? '',
          storefrontPageSubtitle: item.manifest.entrypoints?.storefrontPages?.[0]?.subtitle ?? '',
          widgetTitle: item.manifest.extensions?.dashboardWidgets?.[0]?.title ?? '',
          widgetSubtitle: item.manifest.extensions?.dashboardWidgets?.[0]?.subtitle ?? '',
          widgetHref: item.manifest.extensions?.dashboardWidgets?.[0]?.href ?? '',
          blockTitle: item.manifest.extensions?.storefrontBlocks?.[0]?.title ?? '',
          blockSubtitle: item.manifest.extensions?.storefrontBlocks?.[0]?.subtitle ?? '',
          blockHref: item.manifest.extensions?.storefrontBlocks?.[0]?.href ?? '',
          settingsSchemaJson: JSON.stringify(item.manifest.settings ?? { sections: [] }, null, 2),
          releaseChannel: item.updateStatus?.channel ?? 'stable',
          releaseNotes: '',
        }
      }
      setManifestState(nextManifestState)
      const nextAssets: Record<string, AssetWorkbenchState> = {}
      for (const item of (next.catalog ?? []) as AddonCatalogItem[]) {
        nextAssets[item.manifest.id] = {
          readme: item.manifest.documentation?.readmeContent ?? '',
          previewSvg: '',
        }
      }
      setAssetState(nextAssets)
      const nextTemplates: Record<string, {
        addonId: string
        name: string
        description: string
        adminHref: string
        storefrontHref: string
      }> = {}
      for (const template of (next.templates ?? []) as AddonResponse['templates']) {
        nextTemplates[template.id] = template.defaults
      }
      setTemplateState(nextTemplates)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    setActiveDetailTab('overview')
  }, [focusedAddonId])

  async function runAction(addonId: string, action: AddonActionName, options?: { overrideReadiness?: boolean }) {
    setBusyId(addonId)
    setMessage('')
    try {
      const body: Record<string, unknown> = { addonId, action, overrideReadiness: Boolean(options?.overrideReadiness) }
      if (action === 'save-settings') {
        const item = data?.catalog.find((row) => row.manifest.id === addonId)
        body.settings = Object.fromEntries(
          (item?.manifest.settings?.sections ?? []).flatMap((section) =>
            section.fields.map((field) => [field.id, parseOutgoingFieldValue(field, settingsState[addonId]?.[field.id])])
          )
        )
      }
      if (action === 'save-manifest') {
        const current = manifestState[addonId]
        body.manifestConfig = {
          name: current?.name,
          description: current?.description,
          category: current?.category,
          author: current?.author,
          tags: current?.tags.split(',').map((item) => item.trim()).filter(Boolean),
          adminHref: current?.adminHref,
          storefrontHref: current?.storefrontHref,
          docsHref: current?.docsHref,
          adminPageLabel: current?.adminPageLabel,
          adminPageDescription: current?.adminPageDescription,
          storefrontPageTitle: current?.storefrontPageTitle,
          storefrontPageSubtitle: current?.storefrontPageSubtitle,
          widgetTitle: current?.widgetTitle,
          widgetSubtitle: current?.widgetSubtitle,
          widgetHref: current?.widgetHref,
          blockTitle: current?.blockTitle,
          blockSubtitle: current?.blockSubtitle,
          blockHref: current?.blockHref,
          settingsSchema: (() => {
            try {
              return JSON.parse(current?.settingsSchemaJson ?? '{"sections":[]}')
            } catch {
              return { sections: [] }
            }
          })(),
          releaseChannel: current?.releaseChannel,
          releaseNotes: current?.releaseNotes,
        }
      }

      const response = await fetch('/api/admin/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await response.json()
      if (!response.ok) {
        setMessage(payload.error ?? 'Addon action failed')
        return
      }
      setMessage(`${addonId} ${action.replace('-', ' ')} completed.`)
      setPlan(null)
      setRestorePlan(null)
      setRuntimePreview(null)
      setSmokeTest(null)
      await load()
    } finally {
      setBusyId(null)
    }
  }

  async function previewPlan(addonId: string, previewAction: Exclude<AddonActionName, 'save-settings' | 'save-manifest'>) {
    setActiveDetailTab('lifecycle')
    setBusyId(addonId)
    setMessage('')
    try {
      const response = await fetch('/api/admin/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addonId,
          action: 'plan',
          previewAction,
          overrideReadiness: false,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        setMessage(payload.error ?? 'Could not build addon plan')
        return
      }
      setPlan(payload.plan ?? null)
      setRestorePlan(null)
      setRuntimePreview(null)
      setSmokeTest(null)
    } finally {
      setBusyId(null)
    }
  }

  async function previewRuntime(addonId: string) {
    setActiveDetailTab('runtime')
    setBusyId(addonId)
    setMessage('')
    try {
      const response = await fetch(`/api/admin/addons?runtimePreview=${encodeURIComponent(addonId)}`)
      const payload = await response.json()
      if (!response.ok) {
        setMessage(payload.error ?? 'Could not build runtime preview')
        return
      }
      setRuntimePreview(payload.preview ?? null)
      setPlan(null)
      setRestorePlan(null)
      setSmokeTest(null)
    } finally {
      setBusyId(null)
    }
  }

  async function previewSmokeTest(addonId: string) {
    setActiveDetailTab('diagnostics')
    setBusyId(addonId)
    setMessage('')
    try {
      const response = await fetch(`/api/admin/addons?smokeTest=${encodeURIComponent(addonId)}`)
      const payload = await response.json()
      if (!response.ok) {
        setMessage(payload.error ?? 'Could not run smoke tests')
        return
      }
      setSmokeTest(payload.smokeTest ?? null)
      setPlan(null)
      setRestorePlan(null)
      setRuntimePreview(null)
    } finally {
      setBusyId(null)
    }
  }

  async function previewRestore(addonId: string, snapshotId: string) {
    setActiveDetailTab('history')
    setBusyId(addonId)
    setMessage('')
    try {
      const response = await fetch('/api/admin/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addonId,
          action: 'preview-restore',
          snapshotId,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        setMessage(payload.error ?? 'Could not build restore preview')
        return
      }
      setRestorePlan(payload.restorePlan ?? null)
      setPlan(null)
    } finally {
      setBusyId(null)
    }
  }

  async function restoreSnapshot(addonId: string, snapshotId: string) {
    setBusyId(addonId)
    setMessage('')
    try {
      const response = await fetch('/api/admin/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addonId,
          action: 'restore',
          snapshotId,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        setMessage(payload.error ?? 'Could not restore addon snapshot')
        return
      }
      setMessage(`${addonId} restored from snapshot.`)
      setRestorePlan(null)
      setRuntimePreview(null)
      setSmokeTest(null)
      await load()
    } finally {
      setBusyId(null)
    }
  }

  async function uploadManifest(file: File) {
    setUploading(true)
    setMessage('')
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/admin/addons', {
        method: 'POST',
        body: formData,
      })
      const payload = await response.json()
      if (!response.ok) {
        setMessage(payload.error ?? 'Manifest upload failed')
        return
      }
      setMessage(`Uploaded addon package ${payload.manifest?.name ?? ''}.`)
      await load()
    } finally {
      setUploading(false)
    }
  }

  async function createFromTemplate(templateId: string) {
    setBusyId(templateId)
    setMessage('')
    try {
      const response = await fetch('/api/admin/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-template',
          templateId,
          templateConfig: templateState[templateId],
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        setMessage(payload.error ?? 'Template creation failed')
        return
      }
      setMessage(`Created addon scaffold ${payload.manifest?.name ?? ''} from template.`)
      await load()
    } finally {
      setBusyId(null)
    }
  }

  async function loadAssetText(addonId: string, relativePath: string) {
    const response = await fetch(`/api/admin/addons?asset=${encodeURIComponent(addonId)}&path=${encodeURIComponent(relativePath)}`)
    if (!response.ok) return ''
    return response.text()
  }

  function updateManifestState(addonId: string, updater: (current: ManifestWorkbenchState) => ManifestWorkbenchState) {
    setManifestState((prev) => ({
      ...prev,
      [addonId]: updater(prev[addonId] ?? createEmptyManifestWorkbenchState()),
    }))
  }

  function updateSettingsSchema(addonId: string, updater: (schema: { sections: SettingsSchemaSection[] }) => { sections: SettingsSchemaSection[] }) {
    updateManifestState(addonId, (current) => ({
      ...current,
      settingsSchemaJson: JSON.stringify(updater(parseSettingsSchemaJson(current.settingsSchemaJson)), null, 2),
    }))
  }

  async function exportBundle(addonId: string) {
    setBusyId(addonId)
    setMessage('')
    try {
      const response = await fetch(`/api/admin/addons?export=${encodeURIComponent(addonId)}`)
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        setMessage(payload?.error ?? 'Addon export failed')
        return
      }
      const text = await response.text()
      const blob = new Blob([text], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${addonId}.addon-bundle.json`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      setMessage(`${addonId} bundle exported.`)
    } finally {
      setBusyId(null)
    }
  }

  async function saveAssets(addonId: string) {
    setBusyId(addonId)
    setMessage('')
    try {
      const response = await fetch('/api/admin/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addonId,
          action: 'save-assets',
          assets: {
            'README.md': assetState[addonId]?.readme ?? '',
            'preview.svg': assetState[addonId]?.previewSvg ?? '',
          },
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        setMessage(payload.error ?? 'Addon asset save failed')
        return
      }
      setMessage(`${addonId} assets updated.`)
      await load()
    } finally {
      setBusyId(null)
    }
  }

  async function saveChannelPolicy() {
    setBusyId('channel-policy')
    setMessage('')
    try {
      const response = await fetch('/api/admin/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save-channel-policy',
          channelPolicy,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        setMessage(payload.error ?? 'Channel policy update failed')
        return
      }
      setMessage('Addon channel policy updated.')
      await load()
    } finally {
      setBusyId(null)
    }
  }

  async function requestOverride(addonId: string, executionAction: AddonOverrideExecutionAction) {
    setBusyId(addonId)
    setMessage('')
    try {
      const response = await fetch('/api/admin/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addonId,
          action: 'request-override',
          executionAction,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        setMessage(payload.error ?? 'Override request failed')
        return
      }
      setMessage(`${addonId} override request submitted.`)
      await load()
    } finally {
      setBusyId(null)
    }
  }

  async function decideOverrideRequest(addonId: string, requestId: string, action: 'approve-override' | 'reject-override') {
    setBusyId(addonId)
    setMessage('')
    try {
      const response = await fetch('/api/admin/addons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addonId,
          action,
          snapshotId: requestId,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        setMessage(payload.error ?? 'Override decision failed')
        return
      }
      setMessage(
        action === 'approve-override'
          ? `${addonId} override approved and executed.`
          : `${addonId} override request rejected.`
      )
      await load()
    } finally {
      setBusyId(null)
    }
  }

  async function exportOwnedData(addonId: string) {
    setBusyId(addonId)
    setMessage('')
    try {
      const response = await fetch(`/api/admin/addons?ownedData=${encodeURIComponent(addonId)}`)
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        setMessage(payload?.error ?? 'Addon owned-data export failed')
        return
      }
      const text = await response.text()
      const blob = new Blob([text], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${addonId}.addon-owned-data.json`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      setMessage(`${addonId} owned data exported.`)
    } finally {
      setBusyId(null)
    }
  }

  const installedCatalog = useMemo(() => data?.catalog.filter((item) => item.installed) ?? [], [data])
  const registryCategories = useMemo(
    () => Array.from(new Set((data?.catalog ?? []).map((item) => item.manifest.category))).sort((a, b) => a.localeCompare(b)),
    [data]
  )
  const registryCatalog = useMemo(() => {
    const query = registryQuery.trim().toLowerCase()
    const filtered = (data?.catalog ?? []).filter((item) => {
      if (registryStatusFilter === 'active' && !item.active) return false
      if (registryStatusFilter === 'installed' && !item.installed) return false
      if (registryStatusFilter === 'available' && item.installed) return false
      if (registryCategoryFilter !== 'all' && item.manifest.category !== registryCategoryFilter) return false
      if (!query) return true

      const haystack = [
        item.manifest.id,
        item.manifest.name,
        item.manifest.description,
        item.manifest.category,
        ...(item.manifest.tags ?? []),
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })

    filtered.sort((left, right) => {
      if (registrySort === 'readiness') {
        return (right.readiness?.score ?? 0) - (left.readiness?.score ?? 0)
      }
      if (registrySort === 'updated') {
        const leftTime = left.registry?.installedAt ? new Date(left.registry.installedAt).getTime() : 0
        const rightTime = right.registry?.installedAt ? new Date(right.registry.installedAt).getTime() : 0
        return rightTime - leftTime
      }
      return left.manifest.name.localeCompare(right.manifest.name)
    })

    return filtered
  }, [data, registryCategoryFilter, registryQuery, registrySort, registryStatusFilter])
  const visibleCatalog = useMemo(
    () => (focusedAddonId ? data?.catalog.filter((item) => item.manifest.id === focusedAddonId) ?? [] : data?.catalog ?? []),
    [data, focusedAddonId]
  )
  const focusedItem = focusedAddonId ? visibleCatalog[0] : null
  const showOverviewTab = !focusedAddonId || activeDetailTab === 'overview'
  const showSettingsTab = !focusedAddonId || activeDetailTab === 'settings'
  const showHooksTab = !focusedAddonId || activeDetailTab === 'hooks'
  const showLifecycleTab = !focusedAddonId || activeDetailTab === 'lifecycle'
  const showRuntimeTab = !focusedAddonId || activeDetailTab === 'runtime'
  const showDiagnosticsTab = !focusedAddonId || activeDetailTab === 'diagnostics'
  const showHistoryTab = !focusedAddonId || activeDetailTab === 'history'
  const showWorkbenchTab = !focusedAddonId || activeDetailTab === 'workbench'

  if (loading) {
    return <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">Loading addon registry...</div>
  }

  if (focusedAddonId && !focusedItem) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-slate-900">Addon package not found</p>
        <p className="mt-2 text-sm text-slate-500">The requested addon does not exist in the current registry.</p>
        <Link href="/admin/addons" className="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">
          Back to Add-ons
        </Link>
      </div>
    )
  }

  if (!focusedAddonId) {
    return (
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-[0.08em] text-slate-500">Packages</p><p className="mt-2 text-3xl font-black text-slate-900">{data?.summary.total ?? 0}</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-[0.08em] text-slate-500">Installed</p><p className="mt-2 text-3xl font-black text-slate-900">{data?.summary.installed ?? 0}</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-[0.08em] text-slate-500">Active</p><p className="mt-2 text-3xl font-black text-emerald-600">{data?.summary.active ?? 0}</p></article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-[0.08em] text-slate-500">Available</p><p className="mt-2 text-3xl font-black text-blue-600">{data?.summary.available ?? 0}</p></article>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">Addon Registry</h2>
              <p className="mt-1 text-sm text-slate-500">Open each addon to manage lifecycle, diagnostics, settings, previews, and workbench controls on its own page.</p>
            </div>
            <label className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              {uploading ? 'Uploading...' : 'Upload addon package'}
              <input type="file" accept=".json,.addon-bundle.json,.xml" className="hidden" disabled={uploading} onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) void uploadManifest(file)
              }} />
            </label>
          </div>
          {message ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {message}
            </div>
          ) : null}
          <div className="mt-4 grid gap-3 lg:grid-cols-4">
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Search
              <input
                value={registryQuery}
                onChange={(event) => setRegistryQuery(event.target.value)}
                placeholder="Search addons, tags, category..."
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Status
              <select
                value={registryStatusFilter}
                onChange={(event) => setRegistryStatusFilter(event.target.value as 'all' | 'active' | 'installed' | 'available')}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900"
              >
                <option value="all">All packages</option>
                <option value="active">Active</option>
                <option value="installed">Installed</option>
                <option value="available">Available only</option>
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Category
              <select
                value={registryCategoryFilter}
                onChange={(event) => setRegistryCategoryFilter(event.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900"
              >
                <option value="all">All categories</option>
                {registryCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold text-slate-700">
              Sort
              <select
                value={registrySort}
                onChange={(event) => setRegistrySort(event.target.value as 'name' | 'readiness' | 'updated')}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900"
              >
                <option value="name">Name</option>
                <option value="readiness">Readiness score</option>
                <option value="updated">Recently installed</option>
              </select>
            </label>
          </div>
        </section>

        <div className="grid gap-4 xl:grid-cols-2">
          {registryCatalog.map((item) => (
            <article key={item.manifest.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">{item.manifest.name}</h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">{item.manifest.version}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.active ? 'bg-emerald-100 text-emerald-700' : item.installed ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'}`}>
                      {item.active ? 'ACTIVE' : item.installed ? 'INACTIVE' : 'AVAILABLE'}
                    </span>
                    {item.readiness ? (
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        item.readiness.status === 'ready'
                          ? 'bg-emerald-100 text-emerald-700'
                          : item.readiness.status === 'risky'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                      }`}>
                        {item.readiness.status.toUpperCase()}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.manifest.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-slate-50 px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">{item.manifest.category}</span>
                    <span className="rounded-full bg-slate-50 px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">{item.manifest.sourceType ?? 'builtin'}</span>
                    <span className="rounded-full bg-slate-50 px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">{item.updateStatus?.channel ?? 'stable'}</span>
                    <span className="rounded-full bg-slate-50 px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">{item.diagnostics?.schemeFormat ?? 'addon.json'}</span>
                  </div>
                </div>
                {item.manifest.documentation?.screenshots?.[0] ? (
                  <Image
                    src={`/api/admin/addons?asset=${encodeURIComponent(item.manifest.id)}&path=${encodeURIComponent(item.manifest.documentation.screenshots[0].src)}`}
                    alt={item.manifest.documentation.screenshots[0].caption ?? item.manifest.name}
                    width={88}
                    height={88}
                    unoptimized
                    className="hidden rounded-2xl border border-slate-200 bg-slate-50 object-cover md:block"
                  />
                ) : null}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Health</p>
                  <p className="mt-2 font-semibold text-slate-900">{item.diagnostics?.health === 'healthy' ? 'Healthy package' : 'Needs attention'}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.diagnostics?.issues.length ?? 0} issue(s), {item.diagnostics?.hookCount ?? 0} hooks, {item.diagnostics?.lifecycleTaskCount ?? 0} lifecycle tasks</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Runtime</p>
                  <p className="mt-2 font-semibold text-slate-900">{item.diagnostics?.adminPageCount ?? 0} admin pages, {item.diagnostics?.storefrontPageCount ?? 0} storefront pages</p>
                  <p className="mt-1 text-xs text-slate-500">{item.diagnostics?.dashboardWidgetCount ?? 0} widgets, {item.diagnostics?.storefrontBlockCount ?? 0} blocks</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Governance</p>
                  <p className="mt-2 font-semibold text-slate-900">{item.verification?.status ?? 'unknown'}</p>
                  <p className="mt-1 text-xs text-slate-500">Trust: {item.trust?.status ?? 'n/a'} | Approval: {item.approval?.status ?? 'n/a'}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/admin/addons/${encodeURIComponent(item.manifest.id)}`}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Open addon
                </Link>
                <Link
                  href={`/admin/addons/${encodeURIComponent(item.manifest.id)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Open in new tab
                </Link>
                {!item.installed ? (
                  <button onClick={() => void runAction(item.manifest.id, 'install')} disabled={busyId === item.manifest.id} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                    Install
                  </button>
                ) : item.active ? (
                  <button onClick={() => void runAction(item.manifest.id, 'deactivate')} disabled={busyId === item.manifest.id} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                    Deactivate
                  </button>
                ) : (
                  <button onClick={() => void runAction(item.manifest.id, 'activate')} disabled={busyId === item.manifest.id} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                    Activate
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
        {registryCatalog.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
            No addon packages match the current search and filters.
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {focusedItem ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <Link href="/admin/addons" className="inline-flex text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 hover:text-slate-800">
                Back to addon registry
              </Link>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-black text-slate-900">{focusedItem.manifest.name}</h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">{focusedItem.manifest.version}</span>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${focusedItem.active ? 'bg-emerald-100 text-emerald-700' : focusedItem.installed ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'}`}>
                  {focusedItem.active ? 'ACTIVE' : focusedItem.installed ? 'INACTIVE' : 'AVAILABLE'}
                </span>
                {focusedItem.readiness ? (
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    focusedItem.readiness.status === 'ready'
                      ? 'bg-emerald-100 text-emerald-700'
                      : focusedItem.readiness.status === 'risky'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-rose-100 text-rose-700'
                  }`}>
                    {focusedItem.readiness.status.toUpperCase()}
                  </span>
                ) : null}
              </div>
              <p className="mt-2 max-w-3xl text-sm text-slate-600">{focusedItem.manifest.description}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-50 px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">{focusedItem.manifest.category}</span>
                <span className="rounded-full bg-slate-50 px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">{focusedItem.manifest.sourceType ?? 'builtin'}</span>
                <span className="rounded-full bg-slate-50 px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">{focusedItem.updateStatus?.channel ?? 'stable'}</span>
                <span className="rounded-full bg-slate-50 px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">{focusedItem.diagnostics?.schemeFormat ?? 'addon.json'}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!focusedItem.installed ? (
                <button onClick={() => void runAction(focusedItem.manifest.id, 'install')} disabled={busyId === focusedItem.manifest.id} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                  Install addon
                </button>
              ) : focusedItem.active ? (
                <button onClick={() => void runAction(focusedItem.manifest.id, 'deactivate')} disabled={busyId === focusedItem.manifest.id} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                  Deactivate addon
                </button>
              ) : (
                <button onClick={() => void runAction(focusedItem.manifest.id, 'activate')} disabled={busyId === focusedItem.manifest.id} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60">
                  Activate addon
                </button>
              )}
              <button onClick={() => void previewPlan(focusedItem.manifest.id, focusedItem.installed ? 'activate' : 'install')} disabled={busyId === focusedItem.manifest.id} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                Preview plan
              </button>
              <button onClick={() => void previewRuntime(focusedItem.manifest.id)} disabled={busyId === focusedItem.manifest.id} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                Preview runtime
              </button>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold">
            {([
              ['overview', 'Overview'],
              ['settings', 'Settings'],
              ['hooks', 'Hooks'],
              ['lifecycle', 'Lifecycle'],
              ['runtime', 'Runtime'],
              ['diagnostics', 'Diagnostics'],
              ['history', 'History'],
              ['workbench', 'Workbench'],
            ] as const).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveDetailTab(tab)}
                className={`rounded-full px-3 py-2 ${
                  activeDetailTab === tab
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {!focusedAddonId ? (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" id="addon-lifecycle">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-900">Package Registry</h2>
            <p className="mt-1 text-sm text-slate-500">Install, activate, deactivate, uninstall, and configure addon packages from one control center.</p>
          </div>
          <label className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            {uploading ? 'Uploading...' : 'Upload addon package'}
            <input type="file" accept=".json,.addon-bundle.json" className="hidden" disabled={uploading} onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void uploadManifest(file)
            }} />
          </label>
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.08em] text-slate-800">Channel Policy</h3>
              <p className="mt-1 text-sm text-slate-500">Control whether beta and private addon channels can be installed or upgraded.</p>
            </div>
            <button
              onClick={() => void saveChannelPolicy()}
              disabled={busyId === 'channel-policy'}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              Save policy
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-700">
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <input
                type="checkbox"
                checked={channelPolicy.allowBeta}
                onChange={(event) => setChannelPolicy((current) => ({ ...current, allowBeta: event.target.checked }))}
              />
              Allow beta channel
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <input
                type="checkbox"
                checked={channelPolicy.allowPrivate}
                onChange={(event) => setChannelPolicy((current) => ({ ...current, allowPrivate: event.target.checked }))}
              />
              Allow private channel
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <input
                type="checkbox"
                checked={channelPolicy.requireReady}
                onChange={(event) => setChannelPolicy((current) => ({ ...current, requireReady: event.target.checked }))}
              />
              Require ready deployment status
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <input
                type="checkbox"
                checked={channelPolicy.allowReadinessOverride}
                onChange={(event) => setChannelPolicy((current) => ({ ...current, allowReadinessOverride: event.target.checked }))}
              />
              Allow readiness override
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <input
                type="checkbox"
                checked={channelPolicy.requireOverrideApproval}
                onChange={(event) => setChannelPolicy((current) => ({ ...current, requireOverrideApproval: event.target.checked }))}
              />
              Require secondary override approval
            </label>
            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
              <span>Override roles</span>
              <input
                type="text"
                value={channelPolicy.overrideRoles.join(', ')}
                onChange={(event) => setChannelPolicy((current) => ({
                  ...current,
                  overrideRoles: event.target.value.split(',').map((item) => item.trim()).filter(Boolean),
                }))}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-900"
              />
            </label>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.08em] text-slate-800">Scaffold Templates</h3>
              <p className="mt-1 text-sm text-slate-500">Create manifest-backed addon packages from structured presets instead of hand-authoring raw JSON.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {(data?.templates ?? []).map((template) => (
              <div key={template.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-900">{template.label}</h4>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">{template.preset}</span>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${template.available ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {template.available ? 'AVAILABLE' : 'PRESENT'}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{template.description}</p>
                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <p>Package id: <span className="font-semibold text-slate-900">{template.manifest.id}</span></p>
                  <p>Category: <span className="font-semibold text-slate-900">{template.category}</span></p>
                  <p>Version: <span className="font-semibold text-slate-900">{template.manifest.version}</span></p>
                </div>
                <div className="mt-4 space-y-3">
                  <label className="block text-xs font-semibold text-slate-700">
                    Addon ID
                    <input
                      value={templateState[template.id]?.addonId ?? ''}
                      onChange={(event) => setTemplateState((current) => ({
                        ...current,
                        [template.id]: {
                          ...(current[template.id] ?? template.defaults),
                          addonId: event.target.value,
                        },
                      }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-700">
                    Name
                    <input
                      value={templateState[template.id]?.name ?? ''}
                      onChange={(event) => setTemplateState((current) => ({
                        ...current,
                        [template.id]: {
                          ...(current[template.id] ?? template.defaults),
                          name: event.target.value,
                        },
                      }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-700">
                    Description
                    <input
                      value={templateState[template.id]?.description ?? ''}
                      onChange={(event) => setTemplateState((current) => ({
                        ...current,
                        [template.id]: {
                          ...(current[template.id] ?? template.defaults),
                          description: event.target.value,
                        },
                      }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-700">
                    Admin Route
                    <input
                      value={templateState[template.id]?.adminHref ?? ''}
                      onChange={(event) => setTemplateState((current) => ({
                        ...current,
                        [template.id]: {
                          ...(current[template.id] ?? template.defaults),
                          adminHref: event.target.value,
                        },
                      }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                    />
                  </label>
                  {template.defaults.storefrontHref ? (
                    <label className="block text-xs font-semibold text-slate-700">
                      Storefront Route
                      <input
                        value={templateState[template.id]?.storefrontHref ?? ''}
                        onChange={(event) => setTemplateState((current) => ({
                          ...current,
                          [template.id]: {
                            ...(current[template.id] ?? template.defaults),
                            storefrontHref: event.target.value,
                          },
                        }))}
                        className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                      />
                    </label>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => void createFromTemplate(template.id)}
                  disabled={!template.available || busyId === template.id}
                  className="mt-4 w-full rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Create from template
                </button>
              </div>
            ))}
          </div>
        </div>
        {message ? <p className="mt-3 text-sm font-semibold text-blue-600">{message}</p> : null}
        {plan && showLifecycleTab ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" id="addon-lifecycle">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.08em] text-slate-800">Preflight Plan</h3>
                <p className="mt-1 text-sm text-slate-500">{plan.addonName} · {plan.action}</p>
              </div>
              <button type="button" onClick={() => setPlan(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
                Close
              </button>
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Blockers</p>
                <div className="mt-2 space-y-2 text-xs">
                  {plan.blockers.length ? plan.blockers.map((item) => (
                    <p key={item} className="rounded-lg bg-rose-50 px-3 py-2 font-semibold text-rose-700 ring-1 ring-rose-200">{item}</p>
                  )) : <p className="text-slate-500">No blockers</p>}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Warnings</p>
                <div className="mt-2 space-y-2 text-xs">
                  {plan.warnings.length ? plan.warnings.map((item) => (
                    <p key={item} className="rounded-lg bg-amber-50 px-3 py-2 font-semibold text-amber-700 ring-1 ring-amber-200">{item}</p>
                  )) : <p className="text-slate-500">No warnings</p>}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Effects</p>
                <div className="mt-2 space-y-2 text-xs">
                  {plan.effects.length ? plan.effects.map((item) => (
                    <p key={item} className="rounded-lg bg-emerald-50 px-3 py-2 font-semibold text-emerald-700 ring-1 ring-emerald-200">{item}</p>
                  )) : <p className="text-slate-500">No side effects recorded</p>}
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Dependency Resolution</p>
              <div className="mt-2 grid gap-3 text-xs md:grid-cols-3">
                <div>
                  <p className="font-semibold text-slate-700">Install chain</p>
                  <p className="mt-1 text-slate-500">
                    {plan.dependencyResolution.installChain.length
                      ? plan.dependencyResolution.installChain.join(' -> ')
                      : 'No install chain required'}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Activate chain</p>
                  <p className="mt-1 text-slate-500">
                    {plan.dependencyResolution.activateChain.length
                      ? plan.dependencyResolution.activateChain.join(' -> ')
                      : 'No activate chain required'}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Missing packages</p>
                  <p className="mt-1 text-slate-500">
                    {plan.dependencyResolution.missingPackages.length
                      ? plan.dependencyResolution.missingPackages.join(', ')
                      : 'No missing dependency packages'}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Conflict Governance</p>
              <div className="mt-2 grid gap-3 text-xs md:grid-cols-2">
                <div>
                  <p className="font-semibold text-slate-700">Install conflicts</p>
                  <div className="mt-1 space-y-2">
                    {plan.conflictStatus.install.length ? plan.conflictStatus.install.map((item) => (
                      <p key={`install-${item.addonId}`} className="rounded-lg bg-rose-50 px-3 py-2 font-semibold text-rose-700 ring-1 ring-rose-200">
                        {item.addonId}{item.reason ? ` - ${item.reason}` : ''}
                      </p>
                    )) : <p className="text-slate-500">No install conflicts</p>}
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Activation conflicts</p>
                  <div className="mt-1 space-y-2">
                    {plan.conflictStatus.activate.length ? plan.conflictStatus.activate.map((item) => (
                      <p key={`activate-${item.addonId}`} className="rounded-lg bg-amber-50 px-3 py-2 font-semibold text-amber-700 ring-1 ring-amber-200">
                        {item.addonId}{item.reason ? ` - ${item.reason}` : ''}
                      </p>
                    )) : <p className="text-slate-500">No activation conflicts</p>}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Replacement Flow</p>
              <div className="mt-2 grid gap-3 text-xs md:grid-cols-2">
                <div>
                  <p className="font-semibold text-slate-700">Deactivate chain</p>
                  <p className="mt-1 text-slate-500">
                    {plan.replacementPlan.deactivateChain.length
                      ? plan.replacementPlan.deactivateChain.join(' -> ')
                      : 'No replacement deactivation required'}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Replacement blockers</p>
                  <div className="mt-1 space-y-2">
                    {plan.replacementPlan.blockers.length ? plan.replacementPlan.blockers.map((item) => (
                      <p key={item} className="rounded-lg bg-rose-50 px-3 py-2 font-semibold text-rose-700 ring-1 ring-rose-200">{item}</p>
                    )) : <p className="text-slate-500">No replacement blockers</p>}
                  </div>
                </div>
              </div>
              {plan.replacementPlan.effects.length ? (
                <div className="mt-3 space-y-2">
                  {plan.replacementPlan.effects.map((item) => (
                    <p key={item} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">{item}</p>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Channel Governance</p>
              <div className="mt-2 grid gap-2 md:grid-cols-5">
                <p>Package channel: <span className="font-semibold text-slate-900">{plan.channel}</span></p>
                <p>Beta allowed: <span className="font-semibold text-slate-900">{plan.channelPolicy.allowBeta ? 'Yes' : 'No'}</span></p>
                <p>Private allowed: <span className="font-semibold text-slate-900">{plan.channelPolicy.allowPrivate ? 'Yes' : 'No'}</span></p>
                <p>Require ready: <span className="font-semibold text-slate-900">{plan.channelPolicy.requireReady ? 'Yes' : 'No'}</span></p>
                <p>Override allowed: <span className="font-semibold text-slate-900">{plan.channelPolicy.allowReadinessOverride ? 'Yes' : 'No'}</span></p>
                <p>Second approval: <span className="font-semibold text-slate-900">{plan.channelPolicy.requireOverrideApproval ? 'Required' : 'Not required'}</span></p>
                <p>Override roles: <span className="font-semibold text-slate-900">{plan.channelPolicy.overrideRoles.join(', ') || 'None'}</span></p>
              </div>
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Deployment Readiness</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 font-semibold ${
                  plan.readiness.status === 'ready'
                    ? 'bg-emerald-100 text-emerald-700'
                    : plan.readiness.status === 'blocked'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-amber-100 text-amber-700'
                }`}>
                  {plan.readiness.status.toUpperCase()}
                </span>
                <span>Score <span className="font-semibold text-slate-900">{plan.readiness.score}</span>/100</span>
                {plan.overrideReadiness ? <span className="rounded-full bg-violet-100 px-2.5 py-1 font-semibold text-violet-700">OVERRIDE APPLIED</span> : null}
              </div>
              <div className="mt-2 space-y-1">
                {plan.readiness.reasons.length ? plan.readiness.reasons.map((reason) => (
                  <p key={reason}>{reason}</p>
                )) : <p>No readiness risks detected.</p>}
              </div>
            </div>
            {plan.blockers.length === 0 && (plan.action === 'install' || plan.action === 'activate') ? (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => void runAction(plan.addonId, plan.action === 'install' ? 'resolve-install' : 'resolve-activate')}
                  disabled={busyId === plan.addonId}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {plan.action === 'install' ? 'Run install chain' : 'Run activate chain'}
                </button>
              </div>
            ) : null}
            {plan.channelPolicy.requireReady && plan.channelPolicy.allowReadinessOverride && plan.readiness.status !== 'ready' && (plan.action === 'install' || plan.action === 'activate' || plan.action === 'upgrade') ? (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => void requestOverride(
                    plan.addonId,
                    plan.action === 'install'
                      ? 'resolve-install'
                      : plan.action === 'activate'
                        ? 'resolve-activate'
                        : 'upgrade'
                  )}
                  disabled={busyId === plan.addonId}
                  className="rounded-xl border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-60"
                >
                  {plan.action === 'install'
                    ? 'Request install override'
                    : plan.action === 'activate'
                      ? 'Request activate override'
                      : 'Request upgrade override'}
                </button>
              </div>
            ) : null}
            {plan.replacementPlan.canReplace && (plan.action === 'install' || plan.action === 'activate') ? (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => void runAction(plan.addonId, plan.action === 'install' ? 'resolve-replace-install' : 'resolve-replace-activate')}
                  disabled={busyId === plan.addonId}
                  className="rounded-xl border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-60"
                >
                  {plan.action === 'install' ? 'Run replacement install' : 'Run replacement activate'}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {restorePlan && showHistoryTab ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" id="addon-history">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.08em] text-slate-800">Restore Preview</h3>
                <p className="mt-1 text-sm text-slate-500">{restorePlan.addonId} / {restorePlan.snapshotAction} snapshot</p>
              </div>
              <button type="button" onClick={() => setRestorePlan(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
                Close
              </button>
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Current State</p>
                <div className="mt-2 space-y-1">
                  <p>Status: <span className="font-semibold text-slate-900">{restorePlan.current.status}</span></p>
                  <p>Version: <span className="font-semibold text-slate-900">{restorePlan.current.version ?? 'none'}</span></p>
                  <p>Fingerprint: <span className="font-semibold text-slate-900">{restorePlan.current.fingerprint ? `${restorePlan.current.fingerprint.slice(0, 12)}...` : 'none'}</span></p>
                  <p>Trusted: <span className="font-semibold text-slate-900">{restorePlan.current.trustedFingerprint ? `${restorePlan.current.trustedFingerprint.slice(0, 12)}...` : 'none'}</span></p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Restore Target</p>
                <div className="mt-2 space-y-1">
                  <p>Status: <span className="font-semibold text-slate-900">{restorePlan.target.status}</span></p>
                  <p>Version: <span className="font-semibold text-slate-900">{restorePlan.target.version ?? 'none'}</span></p>
                  <p>Fingerprint: <span className="font-semibold text-slate-900">{restorePlan.target.fingerprint ? `${restorePlan.target.fingerprint.slice(0, 12)}...` : 'none'}</span></p>
                  <p>Trusted: <span className="font-semibold text-slate-900">{restorePlan.target.trustedFingerprint ? `${restorePlan.target.trustedFingerprint.slice(0, 12)}...` : 'none'}</span></p>
                </div>
              </div>
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Warnings</p>
                <div className="mt-2 space-y-2 text-xs">
                  {restorePlan.warnings.length ? restorePlan.warnings.map((item) => (
                    <p key={item} className="rounded-lg bg-amber-50 px-3 py-2 font-semibold text-amber-700 ring-1 ring-amber-200">{item}</p>
                  )) : <p className="text-slate-500">No warnings</p>}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Effects</p>
                <div className="mt-2 space-y-2 text-xs">
                  {restorePlan.effects.length ? restorePlan.effects.map((item) => (
                    <p key={item} className="rounded-lg bg-emerald-50 px-3 py-2 font-semibold text-emerald-700 ring-1 ring-emerald-200">{item}</p>
                  )) : <p className="text-slate-500">No effects recorded</p>}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {runtimePreview && showRuntimeTab ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" id="addon-runtime">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.08em] text-slate-800">Runtime Preview</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {runtimePreview.addonName} ({runtimePreview.addonId}) would expose these routes and extension surfaces if evaluated at runtime.
                </p>
              </div>
              <button type="button" onClick={() => setRuntimePreview(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
                Close
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className={`rounded-full px-3 py-1 ${runtimePreview.installed ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-700'}`}>
                {runtimePreview.installed ? 'INSTALLED' : 'NOT INSTALLED'}
              </span>
              <span className={`rounded-full px-3 py-1 ${runtimePreview.active ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {runtimePreview.active ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Admin Pages</p>
                <div className="mt-2 space-y-2 text-xs">
                  {runtimePreview.adminPages.length ? runtimePreview.adminPages.map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{entry.label}</p>
                          <p className="text-slate-500">{entry.href}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${entry.visible ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {entry.visible ? 'Visible now' : 'Hidden now'}
                        </span>
                      </div>
                      {entry.description ? <p className="mt-2 text-slate-600">{entry.description}</p> : null}
                      <p className="mt-2 text-slate-500">{formatVisibilitySummary(entry.visibility)}</p>
                    </div>
                  )) : <p className="text-slate-500">No admin pages declared</p>}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Dashboard Widgets</p>
                <div className="mt-2 space-y-2 text-xs">
                  {runtimePreview.dashboardWidgets.length ? runtimePreview.dashboardWidgets.map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{entry.label}</p>
                          <p className="text-slate-500">{entry.href}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${entry.visible ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {entry.visible ? 'Visible now' : 'Hidden now'}
                        </span>
                      </div>
                      {entry.description ? <p className="mt-2 text-slate-600">{entry.description}</p> : null}
                      <p className="mt-2 text-slate-500">{formatVisibilitySummary(entry.visibility)}</p>
                    </div>
                  )) : <p className="text-slate-500">No dashboard widgets declared</p>}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Storefront Pages</p>
                <div className="mt-2 space-y-2 text-xs">
                  {runtimePreview.storefrontPages.length ? runtimePreview.storefrontPages.map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="font-semibold text-slate-900">{entry.label}</p>
                      <p className="text-slate-500">{entry.href}</p>
                      {entry.description ? <p className="mt-2 text-slate-600">{entry.description}</p> : null}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${entry.guestVisible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                          Guest: {entry.guestVisible ? 'visible' : 'hidden'}
                        </span>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${entry.authenticatedVisible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                          Signed-in: {entry.authenticatedVisible ? 'visible' : 'hidden'}
                        </span>
                      </div>
                      <p className="mt-2 text-slate-500">{formatVisibilitySummary(entry.visibility)}</p>
                    </div>
                  )) : <p className="text-slate-500">No storefront pages declared</p>}
                </div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Homepage Blocks</p>
                <div className="mt-2 space-y-2 text-xs">
                  {runtimePreview.storefrontBlocks.length ? runtimePreview.storefrontBlocks.map((entry) => (
                    <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">{entry.label}</p>
                          <p className="text-slate-500">{entry.href}</p>
                        </div>
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-[11px] font-semibold text-blue-700">
                          {entry.page}
                        </span>
                      </div>
                      {entry.description ? <p className="mt-2 text-slate-600">{entry.description}</p> : null}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${entry.guestVisible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                          Guest: {entry.guestVisible ? 'visible' : 'hidden'}
                        </span>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${entry.authenticatedVisible ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-700'}`}>
                          Signed-in: {entry.authenticatedVisible ? 'visible' : 'hidden'}
                        </span>
                        {entry.tone ? <span className="rounded-full bg-violet-100 px-2 py-1 text-[11px] font-semibold text-violet-700">Tone: {entry.tone}</span> : null}
                      </div>
                      <p className="mt-2 text-slate-500">{formatVisibilitySummary(entry.visibility)}</p>
                    </div>
                  )) : <p className="text-slate-500">No storefront blocks declared</p>}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {smokeTest && showDiagnosticsTab ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4" id="addon-diagnostics">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.08em] text-slate-800">Smoke Test</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {smokeTest.addonName} ({smokeTest.addonId}) validation against declared routes, assets, and schema.
                </p>
              </div>
              <button type="button" onClick={() => setSmokeTest(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
                Close
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">PASS {smokeTest.summary.pass}</span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">WARN {smokeTest.summary.warn}</span>
              <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700">FAIL {smokeTest.summary.fail}</span>
            </div>
            <div className="mt-4 space-y-2">
              {smokeTest.checks.map((check) => (
                <div key={check.id} className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{check.label}</p>
                      <p className="mt-1 text-slate-600">{check.detail}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      check.status === 'pass'
                        ? 'bg-emerald-100 text-emerald-700'
                        : check.status === 'warn'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-rose-100 text-rose-700'
                    }`}>
                      {check.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {showOverviewTab || showSettingsTab || showHooksTab || showHistoryTab || showWorkbenchTab || showDiagnosticsTab ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-2" id="addon-overview">
          {visibleCatalog.map((item) => (
            <article key={item.manifest.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">{item.manifest.name}</h3>
                    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700">{item.manifest.version}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.active ? 'bg-emerald-100 text-emerald-700' : item.installed ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'}`}>
                      {item.active ? 'ACTIVE' : item.installed ? 'INACTIVE' : 'AVAILABLE'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{item.manifest.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">{item.manifest.category}</span>
                    <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">{item.manifest.sourceType ?? 'builtin'}</span>
                    <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">{item.updateStatus?.channel ?? 'stable'}</span>
                    {item.updateStatus?.updateAvailable ? (
                      <span className="rounded-full bg-violet-50 px-3 py-1 font-semibold text-violet-700 ring-1 ring-violet-100">
                        Update {item.updateStatus.currentVersion} {'->'} {item.updateStatus.availableVersion}
                      </span>
                    ) : null}
                    {(item.manifest.tags ?? []).map((tag) => (
                      <span key={tag} className="rounded-full bg-blue-50 px-3 py-1 font-semibold text-blue-700 ring-1 ring-blue-100">{tag}</span>
                    ))}
                  </div>
                  {item.verification ? (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 font-semibold ${verificationTone(item)}`}>
                          {verificationLabel(item)}
                        </span>
                        <span className="text-slate-500">
                          Fingerprint {item.verification.fingerprint.slice(0, 12)}...
                        </span>
                      </div>
                      <div className="mt-2 grid gap-1 text-slate-500 md:grid-cols-2">
                        <p>Source: <span className="font-semibold text-slate-900">{item.verification.sourceType}</span></p>
                        <p>Verified: <span className="font-semibold text-slate-900">{item.verification.verifiedAt ? new Date(item.verification.verifiedAt).toLocaleString() : 'Not recorded'}</span></p>
                        {item.verification.uploadedAt ? (
                          <p>Uploaded: <span className="font-semibold text-slate-900">{new Date(item.verification.uploadedAt).toLocaleString()}</span></p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {item.approval ? (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 font-semibold ${approvalTone(item)}`}>
                          {approvalLabel(item)}
                        </span>
                        <span className="text-slate-500">
                          Approved fingerprint {item.approval.fingerprint.slice(0, 12)}...
                        </span>
                      </div>
                      <div className="mt-2 grid gap-1 text-slate-500 md:grid-cols-2">
                        <p>Status: <span className="font-semibold text-slate-900">{item.approval.status}</span></p>
                        <p>Approved at: <span className="font-semibold text-slate-900">{item.approval.approvedAt ? new Date(item.approval.approvedAt).toLocaleString() : 'Not approved'}</span></p>
                        {item.approval.approvedBy ? (
                          <p>Approved by: <span className="font-semibold text-slate-900">{item.approval.approvedBy}</span></p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {item.trust ? (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 font-semibold ${trustTone(item)}`}>
                          {trustLabel(item)}
                        </span>
                        <span className="text-slate-500">
                          Trusted fingerprint {item.trust.fingerprint.slice(0, 12)}...
                        </span>
                      </div>
                      <div className="mt-2 grid gap-1 text-slate-500 md:grid-cols-2">
                        <p>Status: <span className="font-semibold text-slate-900">{item.trust.status}</span></p>
                        <p>Trusted at: <span className="font-semibold text-slate-900">{item.trust.trustedAt ? new Date(item.trust.trustedAt).toLocaleString() : 'Not trusted'}</span></p>
                      </div>
                    </div>
                  ) : null}
                  {showOverviewTab && item.readiness ? (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 font-semibold ${readinessTone(item)}`}>
                          {readinessLabel(item)}
                        </span>
                        <span className="text-slate-500">
                          Score {item.readiness.score}/100
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 text-slate-500">
                        {item.readiness.reasons.length ? item.readiness.reasons.map((reason) => (
                          <p key={reason}>• <span className="font-semibold text-slate-900">{reason}</span></p>
                        )) : (
                          <p>No deployment blockers or risk signals detected.</p>
                        )}
                      </div>
                    </div>
                  ) : null}
                  {showOverviewTab ? (
                  <div className="mt-3 space-y-1 text-xs">
                    <p className="font-semibold text-slate-700">Operator scope: {operatorSummary(item).roles}</p>
                    <p className="text-slate-500">Permission scope: {operatorSummary(item).permissions}</p>
                    {item.canOperate === false ? (
                      <p className="font-semibold text-rose-600">
                        {item.operatorStatus?.roleAllowed === false ? 'Your role is outside this addon scope.' : 'Your permissions do not satisfy this addon policy.'}
                      </p>
                    ) : null}
                  </div>
                  ) : null}
                  {showDiagnosticsTab && item.diagnostics ? (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${healthTone(item)}`}>
                          {item.diagnostics.health === 'healthy' ? 'HEALTHY PACKAGE' : 'NEEDS ATTENTION'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {item.diagnostics.adminPageCount} admin pages, {item.diagnostics.storefrontPageCount} storefront pages, {item.diagnostics.dashboardWidgetCount} widgets, {item.diagnostics.storefrontBlockCount} storefront blocks
                        </span>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                        <p>Scheme format: <span className="font-semibold text-slate-900">{item.diagnostics.schemeFormat}</span></p>
                        <p>Declared hooks: <span className="font-semibold text-slate-900">{item.diagnostics.hookCount}</span></p>
                        <p>Settings fields: <span className="font-semibold text-slate-900">{item.diagnostics.settingsFieldCount}</span></p>
                        <p>Mapped settings: <span className="font-semibold text-slate-900">{item.diagnostics.mappedSettingCount}</span></p>
                        <p>Upgrade migrations: <span className="font-semibold text-slate-900">{item.diagnostics.upgradeMigrationCount}</span></p>
                        <p>Extension migrations: <span className="font-semibold text-slate-900">{item.diagnostics.extensionMigrationCount}</span></p>
                        <p>Governed exports: <span className="font-semibold text-slate-900">{item.diagnostics.governedExportCount}</span></p>
                        <p>Governed cleanup: <span className="font-semibold text-slate-900">{item.diagnostics.governedCleanupCount}</span></p>
                        <p>Conflict rules: <span className="font-semibold text-slate-900">{item.diagnostics.conflictCount}</span></p>
                        <p>Exclusive groups: <span className="font-semibold text-slate-900">{item.diagnostics.exclusiveGroupCount}</span></p>
                        <p>Lifecycle tasks: <span className="font-semibold text-slate-900">{item.diagnostics.lifecycleTaskCount}</span></p>
                        <p>README: <span className="font-semibold text-slate-900">{item.diagnostics.hasReadme ? 'Present' : 'Missing'}</span></p>
                        <p>Preview assets: <span className="font-semibold text-slate-900">{item.diagnostics.screenshotCount}</span></p>
                      </div>
                      {item.manifest.scheme ? (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">CS-Cart Style Scheme</p>
                          <div className="mt-2 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                            <p>Priority: <span className="font-semibold text-slate-900">{item.manifest.scheme.priority ?? 'n/a'}</span></p>
                            <p>Status: <span className="font-semibold text-slate-900">{item.manifest.scheme.status ?? 'n/a'}</span></p>
                            <p>Default language: <span className="font-semibold text-slate-900">{item.manifest.scheme.defaultLanguage ?? 'n/a'}</span></p>
                            <p>Auto install: <span className="font-semibold text-slate-900">{item.manifest.scheme.autoInstall ? 'Yes' : 'No'}</span></p>
                            <p>Supplier: <span className="font-semibold text-slate-900">{item.manifest.scheme.supplier ?? 'n/a'}</span></p>
                            <p>Core version: <span className="font-semibold text-slate-900">{item.manifest.scheme.coreVersion ?? 'n/a'}</span></p>
                          </div>
                        </div>
                      ) : null}
                      {showHooksTab && (item.manifest.hooks?.length ?? 0) > 0 ? (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Hook Registry</p>
                          <div className="mt-2 space-y-2">
                            {(item.hookTrace ?? []).map((hook) => (
                              <div key={hook.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-slate-900">{hook.name}</span>
                                  <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">{hook.type}</span>
                                  <span className="rounded-full bg-blue-50 px-2 py-1 font-semibold text-blue-700">{hook.scope}</span>
                                  <span
                                    className={`rounded-full px-2 py-1 font-semibold ${
                                      hook.status === 'bound'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : hook.status === 'missing-target'
                                          ? 'bg-rose-100 text-rose-700'
                                          : 'bg-slate-100 text-slate-700'
                                    }`}
                                  >
                                    {hook.status === 'bound'
                                      ? 'BOUND'
                                      : hook.status === 'missing-target'
                                        ? 'MISSING TARGET'
                                        : 'INACTIVE'}
                                  </span>
                                  {hook.target ? <span className="text-slate-400">{hook.target}</span> : null}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                                  <span>Addon: {hook.addonName}</span>
                                  {hook.targetExists === null ? (
                                    <span>Target check: n/a</span>
                                  ) : (
                                    <span>Target check: {hook.targetExists ? 'found' : 'missing'}</span>
                                  )}
                                </div>
                                {hook.description ? <p className="mt-1 text-slate-500">{hook.description}</p> : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {item.diagnostics.conflicts.length > 0 ? (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Conflict Rules</p>
                          <div className="mt-2 space-y-2">
                            {item.diagnostics.conflicts.map((conflict) => (
                              <div key={`${item.manifest.id}-${conflict.addonId}`} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold text-slate-900">{conflict.addonId}</span>
                                  <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-700">{conflict.mode}</span>
                                  {conflict.installed ? <span className="rounded-full bg-amber-100 px-2 py-1 font-semibold text-amber-700">installed</span> : null}
                                  {conflict.active ? <span className="rounded-full bg-rose-100 px-2 py-1 font-semibold text-rose-700">active</span> : null}
                                </div>
                                {conflict.reason ? <p className="mt-1 text-slate-500">{conflict.reason}</p> : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {item.diagnostics.issues.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {item.diagnostics.issues.map((issue) => (
                            <span key={issue} className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                              {issue}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      {item.diagnostics.prerequisites.length > 0 ? (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Install prerequisites</p>
                          <div className="mt-2 space-y-2">
                            {item.diagnostics.prerequisites.map((prerequisite) => (
                              <div key={prerequisite.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`rounded-full px-2 py-1 font-semibold ${prerequisite.satisfied ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                    {prerequisite.satisfied ? 'READY' : 'MISSING'}
                                  </span>
                                  <span className="font-semibold text-slate-900">{prerequisite.label}</span>
                                  <span className="text-slate-400">{prerequisite.type}:{prerequisite.key}</span>
                                </div>
                                {prerequisite.description ? <p className="mt-1 text-slate-500">{prerequisite.description}</p> : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Compatibility</p>
                        <div className="mt-2 space-y-2 text-xs">
                          <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-2 py-1 font-semibold ${item.diagnostics.compatibility.appSatisfied ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {item.diagnostics.compatibility.appSatisfied ? 'APP OK' : 'APP MISMATCH'}
                              </span>
                              <span className="text-slate-500">Current app version: {item.diagnostics.compatibility.appVersion}</span>
                            </div>
                          </div>
                          {item.diagnostics.compatibility.addonConstraints.map((constraint) => (
                            <div key={constraint.addonId} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`rounded-full px-2 py-1 font-semibold ${constraint.satisfied ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                  {constraint.satisfied ? 'OK' : 'MISMATCH'}
                                </span>
                                <span className="font-semibold text-slate-900">{constraint.addonId}</span>
                                <span className="text-slate-500">
                                  installed {constraint.installedVersion ?? 'not installed'}
                                  {constraint.min ? `, min ${constraint.min}` : ''}
                                  {constraint.max ? `, max ${constraint.max}` : ''}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  {showOverviewTab && (item.manifest.dependencies ?? []).length > 0 ? <p className="mt-3 text-xs text-slate-500">Dependencies: {(item.manifest.dependencies ?? []).join(', ')}</p> : null}
                  {showOverviewTab && (item.dependencyStatus?.missing?.length ?? 0) > 0 ? (
                    <p className="mt-1 text-xs font-semibold text-rose-600">Missing: {item.dependencyStatus?.missing.join(', ')}</p>
                  ) : null}
                  {showOverviewTab && (item.dependencyStatus?.inactive?.length ?? 0) > 0 ? (
                    <p className="mt-1 text-xs font-semibold text-amber-600">Inactive dependency: {item.dependencyStatus?.inactive.join(', ')}</p>
                  ) : null}
                  {showOverviewTab && (item.dependencyStatus?.activeDependents?.length ?? 0) > 0 ? (
                    <p className="mt-1 text-xs font-semibold text-blue-600">Used by active addons: {item.dependencyStatus?.activeDependents.join(', ')}</p>
                  ) : null}
                  {showOverviewTab && item.registry?.installedAt ? <p className="mt-1 text-xs text-slate-500">Installed: {new Date(item.registry.installedAt).toLocaleString()}</p> : null}
                </div>

                {showOverviewTab ? (
                <div className="flex flex-col gap-2">
                  {!item.installed ? (
                    <button onClick={() => void runAction(item.manifest.id, 'install')} disabled={busyId === item.manifest.id || item.canOperate === false} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">Install</button>
                  ) : item.active ? (
                    <button onClick={() => void runAction(item.manifest.id, 'deactivate')} disabled={busyId === item.manifest.id || item.canOperate === false} className="rounded-xl border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60">Deactivate</button>
                  ) : (
                    <button onClick={() => void runAction(item.manifest.id, 'activate')} disabled={busyId === item.manifest.id || item.canOperate === false} className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">Activate</button>
                  )}
                  {item.updateStatus?.updateAvailable ? (
                    <>
                      <button onClick={() => void previewPlan(item.manifest.id, 'upgrade')} disabled={busyId === item.manifest.id || item.canOperate === false} className="rounded-xl border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-60">Preview upgrade</button>
                      <button onClick={() => void runAction(item.manifest.id, 'upgrade')} disabled={busyId === item.manifest.id || item.canOperate === false} className="rounded-xl border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-60">Upgrade</button>
                    </>
                  ) : null}
                  {item.installed ? <button onClick={() => void runAction(item.manifest.id, 'uninstall')} disabled={busyId === item.manifest.id || item.canOperate === false} className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">Uninstall</button> : null}
                  {!item.installed ? (
                    <button onClick={() => void previewPlan(item.manifest.id, 'install')} disabled={busyId === item.manifest.id || item.canOperate === false} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-60">Preview install</button>
                  ) : item.active ? (
                    <button onClick={() => void previewPlan(item.manifest.id, 'deactivate')} disabled={busyId === item.manifest.id || item.canOperate === false} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-60">Preview deactivate</button>
                  ) : (
                    <button onClick={() => void previewPlan(item.manifest.id, 'activate')} disabled={busyId === item.manifest.id || item.canOperate === false} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-60">Preview activate</button>
                  )}
                  <button onClick={() => void previewRuntime(item.manifest.id)} disabled={busyId === item.manifest.id || item.canOperate === false} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-60">Preview runtime</button>
                  <button onClick={() => void previewSmokeTest(item.manifest.id)} disabled={busyId === item.manifest.id || item.canOperate === false} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-60">Run smoke test</button>
                  {item.installed ? <button onClick={() => void previewPlan(item.manifest.id, 'uninstall')} disabled={busyId === item.manifest.id || item.canOperate === false} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-60">Preview uninstall</button> : null}
                  {item.manifest.sourceType === 'uploaded' ? (
                    item.approval?.status === 'approved' ? (
                      <button onClick={() => void runAction(item.manifest.id, 'unapprove')} disabled={busyId === item.manifest.id || item.canOperate === false} className="rounded-xl border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60">Revoke approval</button>
                    ) : (
                      <button onClick={() => void runAction(item.manifest.id, 'approve')} disabled={busyId === item.manifest.id || item.canOperate === false} className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">Approve package</button>
                    )
                  ) : null}
                  {item.manifest.sourceType === 'uploaded' ? (
                    item.trust?.status === 'trusted' ? (
                      <button onClick={() => void runAction(item.manifest.id, 'untrust')} disabled={busyId === item.manifest.id || item.canOperate === false} className="rounded-xl border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-60">Revoke trust</button>
                    ) : (
                      <button onClick={() => void runAction(item.manifest.id, 'trust')} disabled={busyId === item.manifest.id || item.canOperate === false} className="rounded-xl border border-emerald-200 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">Trust package</button>
                    )
                  ) : null}
                  <button onClick={() => void exportOwnedData(item.manifest.id)} disabled={busyId === item.manifest.id || item.canOperate === false} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-60">Export owned data</button>
                  <button onClick={() => void exportBundle(item.manifest.id)} disabled={busyId === item.manifest.id || item.canOperate === false} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white disabled:opacity-60">Export bundle</button>
                  {item.manifest.entrypoints?.adminHref ? <a href={item.manifest.entrypoints.adminHref} className="rounded-xl border border-slate-200 px-4 py-2 text-center text-sm font-semibold text-slate-700 hover:bg-white">Open</a> : null}
                </div>
                ) : null}
              </div>

              {showOverviewTab && item.manifest.documentation?.screenshots?.length ? (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {item.manifest.documentation.screenshots.map((shot) => (
                    <figure key={shot.src} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <Image
                        src={`/api/admin/addons?asset=${encodeURIComponent(item.manifest.id)}&path=${encodeURIComponent(shot.src)}`}
                        alt={shot.caption ?? `${item.manifest.name} preview`}
                        className="h-40 w-full object-cover"
                        width={1200}
                        height={720}
                        unoptimized
                      />
                      <figcaption className="border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
                        {shot.caption ?? shot.src}
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : null}

              {showOverviewTab && item.manifest.documentation?.readmeContent ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-sm font-black uppercase tracking-[0.08em] text-slate-800">Package Notes</h4>
                    {item.manifest.documentation.readmePath ? (
                      <span className="text-xs text-slate-400">{item.manifest.documentation.readmePath}</span>
                    ) : null}
                  </div>
                  <pre className="mt-3 whitespace-pre-wrap text-xs leading-6 text-slate-600">{item.manifest.documentation.readmeContent}</pre>
                </div>
              ) : null}

              {showOverviewTab && item.ownedData ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                  <h4 className="text-sm font-black uppercase tracking-[0.08em] text-slate-800">Owned Data Governance</h4>
                  <div className="mt-3 grid gap-3 text-xs text-slate-600 md:grid-cols-3">
                    <p>Export keys: <span className="font-semibold text-slate-900">{item.ownedData.exportSiteSettings.length}</span></p>
                    <p>Cleanup keys: <span className="font-semibold text-slate-900">{item.ownedData.cleanupSiteSettings.length}</span></p>
                    <p>Available exports: <span className="font-semibold text-slate-900">{item.ownedData.availableExportCount}</span></p>
                  </div>
                  {item.ownedData.retentionNote ? (
                    <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-600">
                      {item.ownedData.retentionNote}
                    </p>
                  ) : null}
                  {item.ownedData.exportSiteSettings.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Export Site Settings</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.ownedData.exportSiteSettings.map((key) => (
                          <span key={key} className="rounded-full bg-slate-50 px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
                            {key}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {item.ownedData.cleanupSiteSettings.length > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Cleanup Site Settings</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {item.ownedData.cleanupSiteSettings.map((key) => (
                          <span key={key} className="rounded-full bg-amber-50 px-3 py-1 font-semibold text-amber-700 ring-1 ring-amber-200">
                            {key}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {showOverviewTab && ((item.manifest.entrypoints?.adminPages?.length ?? 0) > 0 || (item.manifest.entrypoints?.storefrontPages?.length ?? 0) > 0) ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                  <h4 className="text-sm font-black uppercase tracking-[0.08em] text-slate-800">Registered Routes</h4>
                  {(item.manifest.entrypoints?.adminPages?.length ?? 0) > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Admin</p>
                      <div className="mt-2 space-y-2">
                        {(item.manifest.entrypoints?.adminPages ?? []).map((page) => (
                          <div key={page.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                            <p className="font-semibold text-slate-900">{page.label}</p>
                            <p className="mt-1 text-slate-500">{page.href}</p>
                            {page.description ? <p className="mt-1 text-slate-500">{page.description}</p> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {(item.manifest.entrypoints?.storefrontPages?.length ?? 0) > 0 ? (
                    <div className="mt-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Storefront</p>
                      <div className="mt-2 space-y-2">
                        {(item.manifest.entrypoints?.storefrontPages ?? []).map((page) => (
                          <div key={page.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                            <p className="font-semibold text-slate-900">{page.title ?? page.id}</p>
                            <p className="mt-1 text-slate-500">{page.href}</p>
                            {page.subtitle ? <p className="mt-1 text-slate-500">{page.subtitle}</p> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {showHistoryTab && (item.overrideRequests?.length ?? 0) > 0 ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                  <h4 className="text-sm font-black uppercase tracking-[0.08em] text-slate-800">Override Requests</h4>
                  <div className="mt-3 space-y-2">
                    {(item.overrideRequests ?? []).map((request) => (
                      <div key={request.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{request.executionAction.replaceAll('-', ' ')}</p>
                            <p className="mt-1 text-slate-500">
                              Requested {new Date(request.requestedAt).toLocaleString()} by {request.requestedByRole} ({request.requestedById})
                            </p>
                          </div>
                          <span className={`rounded-full px-2 py-1 font-semibold ${
                            request.status === 'pending'
                              ? 'bg-amber-100 text-amber-700'
                              : request.status === 'executed'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-200 text-slate-700'
                          }`}>
                            {request.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
                            Readiness {request.readinessStatus.toUpperCase()}
                          </span>
                          <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
                            Score {request.readinessScore}
                          </span>
                        </div>
                        {request.readinessReasons.length ? (
                          <div className="mt-2 space-y-1 text-slate-500">
                            {request.readinessReasons.map((reason) => (
                              <p key={reason}>{reason}</p>
                            ))}
                          </div>
                        ) : null}
                        {request.status === 'pending' ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void decideOverrideRequest(item.manifest.id, request.id, 'approve-override')}
                              disabled={busyId === item.manifest.id || item.canOperate === false}
                              className="rounded-lg border border-emerald-200 bg-white px-3 py-2 font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                            >
                              Approve and execute
                            </button>
                            <button
                              type="button"
                              onClick={() => void decideOverrideRequest(item.manifest.id, request.id, 'reject-override')}
                              disabled={busyId === item.manifest.id || item.canOperate === false}
                              className="rounded-lg border border-rose-200 bg-white px-3 py-2 font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                            >
                              Reject
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {showHistoryTab && (item.snapshots?.length ?? 0) > 0 ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                  <h4 id="addon-history" className="text-sm font-black uppercase tracking-[0.08em] text-slate-800">Rollback History</h4>
                  <div className="mt-3 space-y-2">
                    {(item.snapshots ?? []).map((snapshot) => (
                      <div key={snapshot.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs">
                        <div>
                          <p className="font-semibold text-slate-900">{snapshot.action.replace('-', ' ')} snapshot</p>
                          <p className="mt-1 text-slate-500">{new Date(snapshot.createdAt).toLocaleString()}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void previewRestore(item.manifest.id, snapshot.id)}
                          disabled={busyId === item.manifest.id || item.canOperate === false}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                        >
                          Preview restore
                        </button>
                        <button
                          type="button"
                          onClick={() => void restoreSnapshot(item.manifest.id, snapshot.id)}
                          disabled={busyId === item.manifest.id || item.canOperate === false}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                        >
                          Restore
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {showHistoryTab && (item.auditLog?.length ?? 0) > 0 ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                  <h4 className="text-sm font-black uppercase tracking-[0.08em] text-slate-800">Operator Audit Log</h4>
                  <div className="mt-3 space-y-2">
                    {(item.auditLog ?? []).map((entry) => (
                      <div key={entry.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-semibold text-slate-900">{entry.action.replace('-', ' ')}</p>
                            <p className="mt-1 text-slate-500">{new Date(entry.createdAt).toLocaleString()}</p>
                          </div>
                          <div className="text-right text-slate-500">
                            <p className="font-semibold text-slate-700">{entry.operatorRole}</p>
                            <p>{entry.operatorId}</p>
                          </div>
                        </div>
                        {entry.details && Object.keys(entry.details).length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {Object.entries(entry.details).map(([key, value]) => (
                              <span key={key} className="rounded-full bg-white px-3 py-1 font-semibold text-slate-700 ring-1 ring-slate-200">
                                {key}: {Array.isArray(value) ? value.join(', ') : String(value)}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {showWorkbenchTab && item.manifest.sourceType === 'uploaded' ? (
                <div className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 id="addon-workbench" className="text-sm font-black uppercase tracking-[0.08em] text-slate-800">Manifest Workbench</h4>
                      <p className="mt-1 text-xs text-slate-500">Edit core package metadata and primary routes without reuploading the manifest.</p>
                    </div>
                    <button onClick={() => void runAction(item.manifest.id, 'save-manifest')} disabled={busyId === item.manifest.id || item.canOperate === false} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60">Save manifest</button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Name</span>
                      <input type="text" value={manifestState[item.manifest.id]?.name ?? ''} onChange={(event) => setManifestState((prev) => ({ ...prev, [item.manifest.id]: { ...(prev[item.manifest.id] ?? createEmptyManifestWorkbenchState()), name: event.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Category</span>
                      <input type="text" value={manifestState[item.manifest.id]?.category ?? ''} onChange={(event) => setManifestState((prev) => ({ ...prev, [item.manifest.id]: { ...(prev[item.manifest.id] ?? createEmptyManifestWorkbenchState()), category: event.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="grid gap-1 md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Description</span>
                      <textarea rows={3} value={manifestState[item.manifest.id]?.description ?? ''} onChange={(event) => setManifestState((prev) => ({ ...prev, [item.manifest.id]: { ...(prev[item.manifest.id] ?? createEmptyManifestWorkbenchState()), description: event.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Author</span>
                      <input type="text" value={manifestState[item.manifest.id]?.author ?? ''} onChange={(event) => setManifestState((prev) => ({ ...prev, [item.manifest.id]: { ...(prev[item.manifest.id] ?? createEmptyManifestWorkbenchState()), author: event.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Tags</span>
                      <input type="text" value={manifestState[item.manifest.id]?.tags ?? ''} onChange={(event) => setManifestState((prev) => ({ ...prev, [item.manifest.id]: { ...(prev[item.manifest.id] ?? createEmptyManifestWorkbenchState()), tags: event.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Admin route</span>
                      <input type="text" value={manifestState[item.manifest.id]?.adminHref ?? ''} onChange={(event) => setManifestState((prev) => ({ ...prev, [item.manifest.id]: { ...(prev[item.manifest.id] ?? createEmptyManifestWorkbenchState()), adminHref: event.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Admin page label</span>
                      <input type="text" value={manifestState[item.manifest.id]?.adminPageLabel ?? ''} onChange={(event) => setManifestState((prev) => ({ ...prev, [item.manifest.id]: { ...(prev[item.manifest.id] ?? createEmptyManifestWorkbenchState()), adminPageLabel: event.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="grid gap-1 md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Admin page description</span>
                      <textarea rows={2} value={manifestState[item.manifest.id]?.adminPageDescription ?? ''} onChange={(event) => setManifestState((prev) => ({ ...prev, [item.manifest.id]: { ...(prev[item.manifest.id] ?? createEmptyManifestWorkbenchState()), adminPageDescription: event.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Storefront route</span>
                      <input type="text" value={manifestState[item.manifest.id]?.storefrontHref ?? ''} onChange={(event) => setManifestState((prev) => ({ ...prev, [item.manifest.id]: { ...(prev[item.manifest.id] ?? createEmptyManifestWorkbenchState()), storefrontHref: event.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Storefront title</span>
                      <input type="text" value={manifestState[item.manifest.id]?.storefrontPageTitle ?? ''} onChange={(event) => setManifestState((prev) => ({ ...prev, [item.manifest.id]: { ...(prev[item.manifest.id] ?? createEmptyManifestWorkbenchState()), storefrontPageTitle: event.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="grid gap-1 md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Storefront subtitle</span>
                      <textarea rows={2} value={manifestState[item.manifest.id]?.storefrontPageSubtitle ?? ''} onChange={(event) => setManifestState((prev) => ({ ...prev, [item.manifest.id]: { ...(prev[item.manifest.id] ?? createEmptyManifestWorkbenchState()), storefrontPageSubtitle: event.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Widget title</span>
                      <input type="text" value={manifestState[item.manifest.id]?.widgetTitle ?? ''} onChange={(event) => setManifestState((prev) => ({ ...prev, [item.manifest.id]: { ...(prev[item.manifest.id] ?? createEmptyManifestWorkbenchState()), widgetTitle: event.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Widget route</span>
                      <input type="text" value={manifestState[item.manifest.id]?.widgetHref ?? ''} onChange={(event) => setManifestState((prev) => ({ ...prev, [item.manifest.id]: { ...(prev[item.manifest.id] ?? createEmptyManifestWorkbenchState()), widgetHref: event.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="grid gap-1 md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Widget subtitle</span>
                      <textarea rows={2} value={manifestState[item.manifest.id]?.widgetSubtitle ?? ''} onChange={(event) => setManifestState((prev) => ({ ...prev, [item.manifest.id]: { ...(prev[item.manifest.id] ?? createEmptyManifestWorkbenchState()), widgetSubtitle: event.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Homepage block title</span>
                      <input type="text" value={manifestState[item.manifest.id]?.blockTitle ?? ''} onChange={(event) => setManifestState((prev) => ({ ...prev, [item.manifest.id]: { ...(prev[item.manifest.id] ?? createEmptyManifestWorkbenchState()), blockTitle: event.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Homepage block route</span>
                      <input type="text" value={manifestState[item.manifest.id]?.blockHref ?? ''} onChange={(event) => setManifestState((prev) => ({ ...prev, [item.manifest.id]: { ...(prev[item.manifest.id] ?? createEmptyManifestWorkbenchState()), blockHref: event.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="grid gap-1 md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Homepage block subtitle</span>
                      <textarea rows={2} value={manifestState[item.manifest.id]?.blockSubtitle ?? ''} onChange={(event) => setManifestState((prev) => ({ ...prev, [item.manifest.id]: { ...(prev[item.manifest.id] ?? createEmptyManifestWorkbenchState()), blockSubtitle: event.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Docs route</span>
                      <input type="text" value={manifestState[item.manifest.id]?.docsHref ?? ''} onChange={(event) => setManifestState((prev) => ({ ...prev, [item.manifest.id]: { ...(prev[item.manifest.id] ?? createEmptyManifestWorkbenchState()), docsHref: event.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Release channel</span>
                      <select value={manifestState[item.manifest.id]?.releaseChannel ?? 'stable'} onChange={(event) => setManifestState((prev) => ({ ...prev, [item.manifest.id]: { ...(prev[item.manifest.id] ?? createEmptyManifestWorkbenchState()), releaseChannel: event.target.value as 'stable' | 'beta' | 'private' } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                        <option value="stable">stable</option>
                        <option value="beta">beta</option>
                        <option value="private">private</option>
                      </select>
                    </label>
                    <label className="grid gap-1 md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Release notes</span>
                      <textarea rows={3} value={manifestState[item.manifest.id]?.releaseNotes ?? ''} onChange={(event) => setManifestState((prev) => ({ ...prev, [item.manifest.id]: { ...(prev[item.manifest.id] ?? createEmptyManifestWorkbenchState()), releaseNotes: event.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                    </label>
                    <div className="grid gap-3 md:col-span-2">
                      <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Settings Schema Builder</p>
                          <p className="mt-1 text-xs text-slate-500">Add sections and fields visually. Changes sync into the JSON schema below.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => updateSettingsSchema(item.manifest.id, (schema) => ({
                            sections: [
                              ...schema.sections,
                              {
                                id: `section-${schema.sections.length + 1}`,
                                label: `Section ${schema.sections.length + 1}`,
                                description: '',
                                fields: [],
                              },
                            ],
                          }))}
                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Add section
                        </button>
                      </div>
                      <div className="space-y-3">
                        {parseSettingsSchemaJson(manifestState[item.manifest.id]?.settingsSchemaJson ?? '').sections.map((section, sectionIndex) => (
                          <div key={`${item.manifest.id}-${section.id}-${sectionIndex}`} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="grid gap-3 md:grid-cols-2">
                              <label className="grid gap-1">
                                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Section ID</span>
                                <input
                                  type="text"
                                  value={section.id}
                                  onChange={(event) => updateSettingsSchema(item.manifest.id, (schema) => ({
                                    sections: schema.sections.map((entry, index) => index === sectionIndex ? { ...entry, id: event.target.value } : entry),
                                  }))}
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                />
                              </label>
                              <label className="grid gap-1">
                                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Section Label</span>
                                <input
                                  type="text"
                                  value={section.label}
                                  onChange={(event) => updateSettingsSchema(item.manifest.id, (schema) => ({
                                    sections: schema.sections.map((entry, index) => index === sectionIndex ? { ...entry, label: event.target.value } : entry),
                                  }))}
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                />
                              </label>
                              <label className="grid gap-1 md:col-span-2">
                                <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Section Description</span>
                                <input
                                  type="text"
                                  value={section.description ?? ''}
                                  onChange={(event) => updateSettingsSchema(item.manifest.id, (schema) => ({
                                    sections: schema.sections.map((entry, index) => index === sectionIndex ? { ...entry, description: event.target.value } : entry),
                                  }))}
                                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                                />
                              </label>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => updateSettingsSchema(item.manifest.id, (schema) => {
                                  if (sectionIndex === 0) return schema
                                  const sections = [...schema.sections]
                                  ;[sections[sectionIndex - 1], sections[sectionIndex]] = [sections[sectionIndex], sections[sectionIndex - 1]]
                                  return { sections }
                                })}
                                disabled={sectionIndex === 0}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                              >
                                Move up
                              </button>
                              <button
                                type="button"
                                onClick={() => updateSettingsSchema(item.manifest.id, (schema) => {
                                  if (sectionIndex >= schema.sections.length - 1) return schema
                                  const sections = [...schema.sections]
                                  ;[sections[sectionIndex + 1], sections[sectionIndex]] = [sections[sectionIndex], sections[sectionIndex + 1]]
                                  return { sections }
                                })}
                                disabled={sectionIndex >= parseSettingsSchemaJson(manifestState[item.manifest.id]?.settingsSchemaJson ?? '').sections.length - 1}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                              >
                                Move down
                              </button>
                              <button
                                type="button"
                                onClick={() => updateSettingsSchema(item.manifest.id, (schema) => ({
                                  sections: schema.sections.map((entry, index) => index === sectionIndex ? {
                                    ...entry,
                                    fields: [
                                      ...entry.fields,
                                      {
                                        id: `field_${entry.fields.length + 1}`,
                                        label: `Field ${entry.fields.length + 1}`,
                                        type: 'text',
                                        description: '',
                                        defaultValue: '',
                                      },
                                    ],
                                  } : entry),
                                }))}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                              >
                                Add field
                              </button>
                              <button
                                type="button"
                                onClick={() => updateSettingsSchema(item.manifest.id, (schema) => ({
                                  sections: schema.sections.filter((_, index) => index !== sectionIndex),
                                }))}
                                className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                              >
                                Remove section
                              </button>
                            </div>
                            <div className="mt-3 space-y-3">
                              {section.fields.map((field, fieldIndex) => (
                                <div key={`${section.id}-${field.id}-${fieldIndex}`} className="rounded-xl border border-slate-200 bg-white p-3">
                                  <div className="grid gap-3 md:grid-cols-2">
                                    <label className="grid gap-1">
                                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Field ID</span>
                                      <input
                                        type="text"
                                        value={field.id}
                                        onChange={(event) => updateSettingsSchema(item.manifest.id, (schema) => ({
                                          sections: schema.sections.map((entry, sIndex) => sIndex === sectionIndex ? {
                                            ...entry,
                                            fields: entry.fields.map((candidate, fIndex) => fIndex === fieldIndex ? { ...candidate, id: event.target.value } : candidate),
                                          } : entry),
                                        }))}
                                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                      />
                                    </label>
                                    <label className="grid gap-1">
                                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Field Label</span>
                                      <input
                                        type="text"
                                        value={field.label}
                                        onChange={(event) => updateSettingsSchema(item.manifest.id, (schema) => ({
                                          sections: schema.sections.map((entry, sIndex) => sIndex === sectionIndex ? {
                                            ...entry,
                                            fields: entry.fields.map((candidate, fIndex) => fIndex === fieldIndex ? { ...candidate, label: event.target.value } : candidate),
                                          } : entry),
                                        }))}
                                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                      />
                                    </label>
                                    <label className="grid gap-1">
                                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Type</span>
                                      <select
                                        value={field.type}
                                        onChange={(event) => updateSettingsSchema(item.manifest.id, (schema) => ({
                                          sections: schema.sections.map((entry, sIndex) => sIndex === sectionIndex ? {
                                            ...entry,
                                            fields: entry.fields.map((candidate, fIndex) => fIndex === fieldIndex ? { ...candidate, type: event.target.value as AddonField['type'] } : candidate),
                                          } : entry),
                                        }))}
                                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                      >
                                        {['text', 'textarea', 'checkbox', 'number', 'select', 'json', 'url'].map((type) => (
                                          <option key={type} value={type}>{type}</option>
                                        ))}
                                      </select>
                                    </label>
                                    <label className="grid gap-1">
                                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Site Setting Key</span>
                                      <input
                                        type="text"
                                        value={field.siteSettingKey ?? ''}
                                        onChange={(event) => updateSettingsSchema(item.manifest.id, (schema) => ({
                                          sections: schema.sections.map((entry, sIndex) => sIndex === sectionIndex ? {
                                            ...entry,
                                            fields: entry.fields.map((candidate, fIndex) => fIndex === fieldIndex ? { ...candidate, siteSettingKey: event.target.value } : candidate),
                                          } : entry),
                                        }))}
                                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                      />
                                    </label>
                                    <label className="grid gap-1 md:col-span-2">
                                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Description</span>
                                      <input
                                        type="text"
                                        value={field.description ?? ''}
                                        onChange={(event) => updateSettingsSchema(item.manifest.id, (schema) => ({
                                          sections: schema.sections.map((entry, sIndex) => sIndex === sectionIndex ? {
                                            ...entry,
                                            fields: entry.fields.map((candidate, fIndex) => fIndex === fieldIndex ? { ...candidate, description: event.target.value } : candidate),
                                          } : entry),
                                        }))}
                                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                      />
                                    </label>
                                    <label className="grid gap-1">
                                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Default Value</span>
                                      <input
                                        type="text"
                                        value={typeof field.defaultValue === 'string' ? field.defaultValue : field.defaultValue == null ? '' : JSON.stringify(field.defaultValue)}
                                        onChange={(event) => updateSettingsSchema(item.manifest.id, (schema) => ({
                                          sections: schema.sections.map((entry, sIndex) => sIndex === sectionIndex ? {
                                            ...entry,
                                            fields: entry.fields.map((candidate, fIndex) => fIndex === fieldIndex ? { ...candidate, defaultValue: event.target.value } : candidate),
                                          } : entry),
                                        }))}
                                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                      />
                                    </label>
                                    <label className="grid gap-1">
                                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Select Options</span>
                                      <input
                                        type="text"
                                        value={(field.options ?? []).map((option) => `${option.value}:${option.label}`).join(', ')}
                                        onChange={(event) => updateSettingsSchema(item.manifest.id, (schema) => ({
                                          sections: schema.sections.map((entry, sIndex) => sIndex === sectionIndex ? {
                                            ...entry,
                                            fields: entry.fields.map((candidate, fIndex) => fIndex === fieldIndex ? {
                                              ...candidate,
                                              options: event.target.value
                                                .split(',')
                                                .map((part) => part.trim())
                                                .filter(Boolean)
                                                .map((part) => {
                                                  const [value, label] = part.split(':')
                                                  return {
                                                    value: (value ?? '').trim(),
                                                    label: (label ?? value ?? '').trim(),
                                                  }
                                                }),
                                            } : candidate),
                                          } : entry),
                                        }))}
                                        className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                                      />
                                    </label>
                                  </div>
                                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                                    <button
                                      type="button"
                                      onClick={() => updateSettingsSchema(item.manifest.id, (schema) => ({
                                        sections: schema.sections.map((entry, sIndex) => {
                                          if (sIndex !== sectionIndex || fieldIndex === 0) return entry
                                          const fields = [...entry.fields]
                                          ;[fields[fieldIndex - 1], fields[fieldIndex]] = [fields[fieldIndex], fields[fieldIndex - 1]]
                                          return { ...entry, fields }
                                        }),
                                      }))}
                                      disabled={fieldIndex === 0}
                                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                                    >
                                      Move up
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateSettingsSchema(item.manifest.id, (schema) => ({
                                        sections: schema.sections.map((entry, sIndex) => {
                                          if (sIndex !== sectionIndex || fieldIndex >= entry.fields.length - 1) return entry
                                          const fields = [...entry.fields]
                                          ;[fields[fieldIndex + 1], fields[fieldIndex]] = [fields[fieldIndex], fields[fieldIndex + 1]]
                                          return { ...entry, fields }
                                        }),
                                      }))}
                                      disabled={fieldIndex >= section.fields.length - 1}
                                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                                    >
                                      Move down
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => updateSettingsSchema(item.manifest.id, (schema) => ({
                                        sections: schema.sections.map((entry, sIndex) => sIndex === sectionIndex ? {
                                          ...entry,
                                          fields: entry.fields.filter((_, fIndex) => fIndex !== fieldIndex),
                                        } : entry),
                                      }))}
                                      className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                                    >
                                      Remove field
                                    </button>
                                  </div>
                                </div>
                              ))}
                              {section.fields.length === 0 ? (
                                <p className="text-xs text-slate-500">No fields yet in this section.</p>
                              ) : null}
                            </div>
                          </div>
                        ))}
                        {parseSettingsSchemaJson(manifestState[item.manifest.id]?.settingsSchemaJson ?? '').sections.length === 0 ? (
                          <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-xs text-slate-500">
                            No settings sections yet. Use &quot;Add section&quot; to start a schema visually.
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <label className="grid gap-1 md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Settings schema JSON</span>
                      <textarea rows={12} value={manifestState[item.manifest.id]?.settingsSchemaJson ?? ''} onChange={(event) => setManifestState((prev) => ({ ...prev, [item.manifest.id]: { ...(prev[item.manifest.id] ?? createEmptyManifestWorkbenchState()), settingsSchemaJson: event.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs" />
                      <span className="text-xs text-slate-500">Edit addon settings sections and fields directly. Invalid JSON will be rejected on save.</span>
                    </label>
                  </div>
                </div>
              ) : null}

              {showWorkbenchTab && item.manifest.sourceType === 'uploaded' ? (
                <div className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-[0.08em] text-slate-800">Asset Workbench</h4>
                      <p className="mt-1 text-xs text-slate-500">Edit package documentation and preview assets for uploaded addons.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void (async () => {
                          const previewSvg = await loadAssetText(item.manifest.id, 'preview.svg')
                          setAssetState((prev) => ({
                            ...prev,
                            [item.manifest.id]: {
                              readme: prev[item.manifest.id]?.readme ?? item.manifest.documentation?.readmeContent ?? '',
                              previewSvg,
                            },
                          }))
                        })()}
                        disabled={busyId === item.manifest.id || item.canOperate === false}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
                      >
                        Load preview asset
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveAssets(item.manifest.id)}
                        disabled={busyId === item.manifest.id || item.canOperate === false}
                        className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                      >
                        Save assets
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">README.md</span>
                      <textarea
                        rows={12}
                        value={assetState[item.manifest.id]?.readme ?? ''}
                        onChange={(event) => setAssetState((prev) => ({
                          ...prev,
                          [item.manifest.id]: {
                            readme: event.target.value,
                            previewSvg: prev[item.manifest.id]?.previewSvg ?? '',
                          },
                        }))}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs"
                      />
                    </label>
                    <label className="grid gap-1">
                      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">preview.svg</span>
                      <textarea
                        rows={12}
                        value={assetState[item.manifest.id]?.previewSvg ?? ''}
                        onChange={(event) => setAssetState((prev) => ({
                          ...prev,
                          [item.manifest.id]: {
                            readme: prev[item.manifest.id]?.readme ?? '',
                            previewSvg: event.target.value,
                          },
                        }))}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs"
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {showSettingsTab && item.installed && (item.manifest.settings?.sections?.length ?? 0) > 0 ? (
                <div className="mt-5 space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-[0.08em] text-slate-800">Addon Settings</h4>
                      <p className="mt-1 text-xs text-slate-500">Registry-backed config with optional site-setting sync.</p>
                    </div>
                    <button onClick={() => void runAction(item.manifest.id, 'save-settings')} disabled={busyId === item.manifest.id || item.canOperate === false} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60">Save settings</button>
                  </div>

                  {(item.manifest.settings?.sections ?? []).map((section) => (
                    <div key={section.id} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{section.label}</p>
                        {section.description ? <p className="mt-1 text-xs text-slate-500">{section.description}</p> : null}
                      </div>
                      <div className="grid gap-3">
                        {section.fields.map((field) => (
                          <label key={field.id} className="grid gap-1">
                            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{field.label}</span>
                            {field.type === 'textarea' || field.type === 'json' ? (
                              <textarea rows={field.type === 'json' ? 6 : 3} value={String(settingsState[item.manifest.id]?.[field.id] ?? '')} onChange={(event) => setSettingsState((prev) => ({ ...prev, [item.manifest.id]: { ...(prev[item.manifest.id] ?? {}), [field.id]: event.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                            ) : field.type === 'checkbox' ? (
                              <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                                <input type="checkbox" checked={Boolean(settingsState[item.manifest.id]?.[field.id])} onChange={(event) => setSettingsState((prev) => ({ ...prev, [item.manifest.id]: { ...(prev[item.manifest.id] ?? {}), [field.id]: event.target.checked } }))} />
                                Enabled
                              </span>
                            ) : field.type === 'select' ? (
                              <select value={String(settingsState[item.manifest.id]?.[field.id] ?? '')} onChange={(event) => setSettingsState((prev) => ({ ...prev, [item.manifest.id]: { ...(prev[item.manifest.id] ?? {}), [field.id]: event.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                                {(field.options ?? []).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                              </select>
                            ) : (
                              <input type={field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'} value={String(settingsState[item.manifest.id]?.[field.id] ?? '')} onChange={(event) => setSettingsState((prev) => ({ ...prev, [item.manifest.id]: { ...(prev[item.manifest.id] ?? {}), [field.id]: event.target.value } }))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
                            )}
                            {field.description ? <span className="text-xs text-slate-500">{field.description}</span> : null}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))}
        </div>
        ) : null}
      </section>
      ) : null}

      {installedCatalog.length > 0 && !focusedAddonId ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-900">Installed Addons</h2>
          <p className="mt-1 text-sm text-slate-500">Current runtime package set and lifecycle state.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.08em] text-slate-500">
                  <th className="pb-3">Addon</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Readiness</th>
                  <th className="pb-3">State</th>
                  <th className="pb-3">Approval</th>
                  <th className="pb-3">Trust</th>
                  <th className="pb-3">Verification</th>
                  <th className="pb-3">Version</th>
                  <th className="pb-3">Admin Entry</th>
                </tr>
              </thead>
              <tbody>
                {installedCatalog.map((item) => (
                  <tr key={item.manifest.id} className="border-t border-slate-100">
                    <td className="py-3 font-semibold text-slate-900">{item.manifest.name}</td>
                    <td className="py-3 text-slate-600">{item.manifest.category}</td>
                    <td className="py-3">
                      {item.readiness ? (
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${readinessTone(item)}`}>
                          {readinessLabel(item)}
                        </span>
                      ) : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="py-3"><span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${item.active ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{item.active ? 'ACTIVE' : 'INACTIVE'}</span></td>
                    <td className="py-3">
                      {item.approval ? (
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${approvalTone(item)}`}>
                          {approvalLabel(item)}
                        </span>
                      ) : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="py-3">
                      {item.trust ? (
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${trustTone(item)}`}>
                          {trustLabel(item)}
                        </span>
                      ) : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="py-3">
                      {item.verification ? (
                        <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${verificationTone(item)}`}>
                          {verificationLabel(item)}
                        </span>
                      ) : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="py-3 text-slate-600">{item.manifest.version}</td>
                    <td className="py-3 text-slate-600">{item.manifest.entrypoints?.adminHref ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
