export type AddonFieldType = 'text' | 'textarea' | 'checkbox' | 'number' | 'select' | 'json' | 'url'

export type AddonFieldOption = {
  value: string
  label: string
}

export type AddonSettingsField = {
  id: string
  label: string
  type: AddonFieldType
  description?: string
  defaultValue?: string | number | boolean | Record<string, unknown> | Array<unknown> | null
  options?: AddonFieldOption[]
  siteSettingKey?: string
}

export type AddonSettingsSection = {
  id: string
  label: string
  description?: string
  fields: AddonSettingsField[]
}

export type AddonVisibility = {
  roles?: string[]
  permissions?: string[]
  audiences?: Array<'guest' | 'authenticated'>
}

export type AddonHookDeclaration = {
  id: string
  name: string
  type: 'php' | 'template' | 'schema' | 'event' | 'route'
  target?: string
  description?: string
}

export type AddonHookTraceEntry = AddonHookDeclaration & {
  addonId: string
  addonName: string
  active: boolean
  scope: 'admin' | 'storefront' | 'system'
  targetExists: boolean | null
  status: 'bound' | 'missing-target' | 'inactive'
}

export type AddonSchemeMeta = {
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

export type AddonAdminPage = {
  id: string
  label: string
  href: string
  description?: string
  title?: string
  subtitle?: string
  inactiveTitle?: string
  inactiveDescription?: string
  visibility?: AddonVisibility
}

export type AddonStorefrontPage = {
  id: string
  href: string
  title?: string
  subtitle?: string
  inactiveTitle?: string
  inactiveDescription?: string
  visibility?: AddonVisibility
}

export type AddonDashboardWidget = {
  id: string
  title: string
  subtitle: string
  href: string
  tone?: 'amber' | 'rose' | 'blue' | 'emerald' | 'violet' | 'slate'
  visibility?: AddonVisibility
}

export type AddonStorefrontBlock = {
  id: string
  title: string
  subtitle: string
  href: string
  page: 'home'
  tone?: 'amber' | 'rose' | 'blue' | 'emerald' | 'violet' | 'slate'
  visibility?: AddonVisibility
}

export type AddonScreenshot = {
  src: string
  caption?: string
}

export type AddonDocumentation = {
  readmePath?: string
  readmeContent?: string
  screenshots?: AddonScreenshot[]
}

export type AddonOperators = {
  allowedRoles?: string[]
  requiredPermissions?: string[]
}

export type AddonPrerequisite = {
  id: string
  label: string
  type: 'siteSetting' | 'addonSetting'
  key: string
  description?: string
}

export type AddonLifecycleTask = {
  id: string
  label: string
  type: 'upsertSiteSetting' | 'deleteSiteSetting' | 'ensureDirectory'
  key?: string
  value?: unknown
  path?: string
  description?: string
}

export type AddonUpgradeMigration = {
  toVersion: string
  description?: string
  seedSiteSettings?: Record<string, unknown>
  removeSiteSettings?: string[]
  setAddonSettings?: Record<string, unknown>
  extensionMigrations?: {
    adminPages?: string[]
    storefrontPages?: string[]
    dashboardWidgets?: string[]
    storefrontBlocks?: string[]
    notes?: string
  }
}

export type AddonDataGovernance = {
  exportSiteSettings?: string[]
  cleanupSiteSettings?: string[]
  retentionNote?: string
}

export type AddonCompatibility = {
  minAppVersion?: string
  maxAppVersion?: string
  addonVersionConstraints?: Record<
    string,
    {
      min?: string
      max?: string
    }
  >
}

export type AddonConflictRule = {
  addonId: string
  reason?: string
  mode?: 'install' | 'activate' | 'both'
}

export type AddonReleaseChannel = 'stable' | 'beta' | 'private'

export type AddonVerificationStatus =
  | 'builtin'
  | 'verified-upload'
  | 'package-changed'
  | 'uploaded-untracked'

export type AddonPackageVerification = {
  sourceType: 'builtin' | 'uploaded'
  fingerprint: string
  verifiedAt?: string
  uploadedAt?: string
  status: AddonVerificationStatus
}

export type AddonTrustStatus = 'builtin' | 'trusted' | 'untrusted' | 'trust-mismatch'

export type AddonPackageTrust = {
  status: AddonTrustStatus
  fingerprint: string
  trustedAt?: string
}

export type AddonApprovalStatus = 'builtin' | 'approved' | 'unapproved' | 'approval-stale'

export type AddonPackageApproval = {
  status: AddonApprovalStatus
  fingerprint: string
  approvedAt?: string
  approvedBy?: string
}

export type AddonOverrideExecutionAction =
  | 'install'
  | 'activate'
  | 'upgrade'
  | 'resolve-install'
  | 'resolve-activate'
  | 'resolve-replace-install'
  | 'resolve-replace-activate'

export type AddonOverrideRequestStatus = 'pending' | 'approved' | 'rejected' | 'executed'

export type AddonOverrideRequest = {
  id: string
  addonId: string
  executionAction: AddonOverrideExecutionAction
  requestedAt: string
  requestedById: string
  requestedByRole: string
  status: AddonOverrideRequestStatus
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
  executionDetails?: Record<string, unknown>
 }

export type AddonAuditAction =
  | 'install'
  | 'activate'
  | 'deactivate'
  | 'uninstall'
  | 'upgrade'
  | 'save-settings'
  | 'trust'
  | 'untrust'
  | 'approve'
  | 'unapprove'
  | 'restore'
  | 'request-override'
  | 'approve-override'
  | 'reject-override'

export type AddonAuditEntry = {
  id: string
  addonId: string
  action: AddonAuditAction
  createdAt: string
  operatorId: string
  operatorRole: string
  details?: Record<string, unknown>
}

export type AddonRuntimePreviewVisibility = {
  roles: string[]
  permissions: string[]
  audiences: Array<'guest' | 'authenticated'>
}

export type AddonRuntimePreviewEntry = {
  id: string
  label: string
  href: string
  description?: string
  visible: boolean
  visibility: AddonRuntimePreviewVisibility
}

export type AddonStorefrontRuntimePreviewEntry = AddonRuntimePreviewEntry & {
  guestVisible: boolean
  authenticatedVisible: boolean
}

export type AddonRuntimePreview = {
  addonId: string
  addonName: string
  installed: boolean
  active: boolean
  adminPages: AddonRuntimePreviewEntry[]
  storefrontPages: AddonStorefrontRuntimePreviewEntry[]
  dashboardWidgets: AddonRuntimePreviewEntry[]
  storefrontBlocks: Array<
    AddonStorefrontRuntimePreviewEntry & {
      page: 'home'
      tone?: 'amber' | 'rose' | 'blue' | 'emerald' | 'violet' | 'slate'
    }
  >
}

export type AddonSmokeTestCheck = {
  id: string
  label: string
  status: 'pass' | 'warn' | 'fail'
  detail: string
}

export type AddonSmokeTestReport = {
  addonId: string
  addonName: string
  installed: boolean
  active: boolean
  summary: {
    pass: number
    warn: number
    fail: number
  }
  checks: AddonSmokeTestCheck[]
}

export type AddonDeploymentReadiness = {
  status: 'ready' | 'risky' | 'blocked'
  score: number
  reasons: string[]
}

export type AddonManifest = {
  id: string
  name: string
  version: string
  description: string
  category: string
  author?: string
  icon?: string
  sourceType?: 'builtin' | 'uploaded'
  dependencies?: string[]
  tags?: string[]
  scheme?: AddonSchemeMeta
  hooks?: AddonHookDeclaration[]
  documentation?: AddonDocumentation
  operators?: AddonOperators
  compatibility?: AddonCompatibility
  conflicts?: AddonConflictRule[]
  exclusiveGroups?: string[]
  release?: {
    channel?: AddonReleaseChannel
    notes?: string
  }
  entrypoints?: {
    adminHref?: string
    docsHref?: string
    visibility?: AddonVisibility
    adminPages?: AddonAdminPage[]
    storefrontPages?: AddonStorefrontPage[]
  }
  settings?: {
    sections: AddonSettingsSection[]
  }
  extensions?: {
    dashboardWidgets?: AddonDashboardWidget[]
    storefrontBlocks?: AddonStorefrontBlock[]
  }
  dataGovernance?: AddonDataGovernance
  lifecycle?: {
    install?: {
      seedSiteSettings?: Record<string, unknown>
      prerequisites?: AddonPrerequisite[]
      tasks?: AddonLifecycleTask[]
    }
    upgrade?: {
      migrations?: AddonUpgradeMigration[]
    }
    uninstall?: {
      removeSiteSettings?: string[]
      tasks?: AddonLifecycleTask[]
    }
  }
}

export type AddonRegistryEntry = {
  id: string
  version: string
  status: 'active' | 'inactive'
  installedAt: string
  updatedAt: string
  sourceType: 'builtin' | 'uploaded'
  settings: Record<string, unknown>
}

export type AddonSnapshot = {
  id: string
  addonId: string
  action: 'install' | 'activate' | 'deactivate' | 'uninstall' | 'save-settings'
  createdAt: string
  registryEntry?: AddonRegistryEntry
  bundle?: {
    manifest: AddonManifest
    assets: Record<string, string>
    exportedAt: string
  } | null
}

export type AddonCatalogItem = {
  manifest: AddonManifest
  installed: boolean
  active: boolean
  registry?: AddonRegistryEntry
  canOperate?: boolean
  operatorStatus?: {
    roleAllowed: boolean
    permissionsAllowed: boolean
  }
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
  hookTrace?: AddonHookTraceEntry[]
  verification?: AddonPackageVerification
  trust?: AddonPackageTrust
  approval?: AddonPackageApproval
  updateStatus?: {
    currentVersion: string
    availableVersion: string
    updateAvailable: boolean
    channel: AddonReleaseChannel
  }
  ownedData?: {
    exportSiteSettings: string[]
    cleanupSiteSettings: string[]
    retentionNote?: string
    availableExportCount: number
  }
  smokeTest?: AddonSmokeTestReport
  readiness?: AddonDeploymentReadiness
  auditLog?: AddonAuditEntry[]
  snapshots?: AddonSnapshot[]
  overrideRequests?: AddonOverrideRequest[]
}
