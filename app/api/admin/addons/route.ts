import { NextResponse } from 'next/server'
import { requireAdminApiPermission } from '@/lib/admin/api'
import {
  activateAddon,
  approveAddonPackage,
  approveAddonOverrideRequest,
  createAddonFromTemplate,
  createAddonOverrideRequest,
  executeAddonDependencyPlan,
  executeAddonReplacementPlan,
  exportAddonOwnedData,
  getAddonActionPlan,
  getAddonChannelPolicy,
  getAddonRestorePlan,
  getAddonRuntimePreview,
  getAddonSmokeTestReport,
  assertAddonOperatorAccess,
  deactivateAddon,
  exportAddonBundle,
  getAddonCatalog,
  getAddonTemplates,
  getAddonTextAsset,
  getAddonMappedSettings,
  installAddon,
  restoreAddonSnapshot,
  saveAddonBundleFile,
  saveAddonManifestFile,
  updateAddonTextAssets,
  trustAddonPackage,
  rejectAddonOverrideRequest,
  unapproveAddonPackage,
  uninstallAddon,
  untrustAddonPackage,
  upgradeAddon,
  updateAddonManifestCore,
  updateAddonChannelPolicy,
  updateAddonSettings,
} from '@/lib/addons/manager'

export async function GET(request: Request) {
  const access = await requireAdminApiPermission('manage_settings')
  if (!access.ok) {
    return access.response
  }

  try {
    const { searchParams } = new URL(request.url)
    const exportAddonId = searchParams.get('export')
    const exportOwnedDataId = searchParams.get('ownedData')
    const runtimePreviewAddonId = searchParams.get('runtimePreview')
    const smokeTestAddonId = searchParams.get('smokeTest')
    const assetAddonId = searchParams.get('asset')
    const assetPath = searchParams.get('path')

    if (assetAddonId && assetPath) {
      await assertAddonOperatorAccess(assetAddonId, access.identity)
      const contents = await getAddonTextAsset(assetAddonId, assetPath)
      const contentType = assetPath.endsWith('.svg') ? 'image/svg+xml' : 'text/plain; charset=utf-8'
      return new NextResponse(contents, {
        status: 200,
        headers: {
          'Content-Type': contentType,
        },
      })
    }

    if (exportAddonId) {
      await assertAddonOperatorAccess(exportAddonId, access.identity)
      const bundle = await exportAddonBundle(exportAddonId)
      return new NextResponse(JSON.stringify(bundle, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${exportAddonId}.addon-bundle.json"`,
        },
      })
    }

    if (exportOwnedDataId) {
      await assertAddonOperatorAccess(exportOwnedDataId, access.identity)
      const ownedData = await exportAddonOwnedData(exportOwnedDataId)
      return new NextResponse(JSON.stringify(ownedData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${exportOwnedDataId}.addon-owned-data.json"`,
        },
      })
    }

    if (runtimePreviewAddonId) {
      await assertAddonOperatorAccess(runtimePreviewAddonId, access.identity)
      return NextResponse.json({
        success: true,
        preview: await getAddonRuntimePreview(runtimePreviewAddonId, access.identity),
      })
    }

    if (smokeTestAddonId) {
      await assertAddonOperatorAccess(smokeTestAddonId, access.identity)
      return NextResponse.json({
        success: true,
        smokeTest: await getAddonSmokeTestReport(smokeTestAddonId),
      })
    }

    const catalog = await getAddonCatalog(access.identity)
    const catalogWithMappedSettings = await Promise.all(
      catalog.map(async (item) => ({
        ...item,
        mappedSettings: item.installed ? await getAddonMappedSettings(item.manifest.id) : {},
      }))
    )

    return NextResponse.json({
      catalog: catalogWithMappedSettings,
      templates: await getAddonTemplates(),
      channelPolicy: await getAddonChannelPolicy(),
      summary: {
        total: catalog.length,
        installed: catalog.filter((item) => item.installed).length,
        active: catalog.filter((item) => item.active).length,
        available: catalog.filter((item) => !item.installed).length,
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function POST(req: Request) {
  const access = await requireAdminApiPermission('manage_settings')
  if (!access.ok) {
    return access.response
  }

  const contentType = req.headers.get('content-type') ?? ''
  try {
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file')
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Manifest file is required' }, { status: 400 })
      }
      const contents = await file.text()
      const manifest = file.name.endsWith('.addon-bundle.json')
        ? await saveAddonBundleFile(contents)
        : await saveAddonManifestFile(contents)
      return NextResponse.json({ success: true, manifest })
    }

    const body = await req.json() as {
      action?: 'install' | 'activate' | 'deactivate' | 'uninstall' | 'save-settings' | 'save-channel-policy' | 'plan' | 'restore' | 'preview-restore' | 'trust' | 'untrust' | 'approve' | 'unapprove' | 'resolve-install' | 'resolve-activate' | 'resolve-replace-install' | 'resolve-replace-activate' | 'upgrade' | 'create-template' | 'save-manifest' | 'save-assets' | 'request-override' | 'approve-override' | 'reject-override'
      addonId?: string
      overrideReadiness?: boolean
      executionAction?: 'install' | 'activate' | 'upgrade' | 'resolve-install' | 'resolve-activate' | 'resolve-replace-install' | 'resolve-replace-activate'
      templateId?: string
      templateConfig?: {
        addonId?: string
        name?: string
        description?: string
        adminHref?: string
        storefrontHref?: string
      }
      previewAction?: 'install' | 'activate' | 'deactivate' | 'uninstall' | 'save-settings' | 'upgrade'
      snapshotId?: string
      settings?: Record<string, unknown>
      manifestConfig?: {
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
        releaseChannel?: 'stable' | 'beta' | 'private'
        releaseNotes?: string
      }
      assets?: Record<string, string>
      channelPolicy?: {
        allowBeta?: boolean
        allowPrivate?: boolean
        requireReady?: boolean
        allowReadinessOverride?: boolean
        requireOverrideApproval?: boolean
        overrideRoles?: string[]
      }
    }

    if ((!body.addonId && body.action !== 'save-channel-policy' && body.action !== 'create-template') || !body.action) {
      return NextResponse.json({ error: 'Action and addonId are required' }, { status: 400 })
    }

    if (body.action !== 'save-channel-policy' && body.action !== 'create-template') {
      await assertAddonOperatorAccess(body.addonId as string, access.identity)
    }

    const addonId = body.addonId as string | undefined

    if (body.action === 'plan') {
      return NextResponse.json({ success: true, plan: await getAddonActionPlan(addonId as string, body.previewAction ?? 'install', { overrideReadiness: Boolean(body.overrideReadiness), identity: access.identity }) })
    }
    if (body.action === 'restore') {
      if (!body.snapshotId) {
        return NextResponse.json({ error: 'snapshotId is required' }, { status: 400 })
      }
      return NextResponse.json(await restoreAddonSnapshot(addonId as string, body.snapshotId, access.identity))
    }
    if (body.action === 'preview-restore') {
      if (!body.snapshotId) {
        return NextResponse.json({ error: 'snapshotId is required' }, { status: 400 })
      }
      return NextResponse.json({ success: true, restorePlan: await getAddonRestorePlan(addonId as string, body.snapshotId) })
    }
    if (body.action === 'install') {
      return NextResponse.json({ success: true, entry: await installAddon(addonId as string, access.identity, { overrideReadiness: Boolean(body.overrideReadiness) }) })
    }
    if (body.action === 'activate') {
      return NextResponse.json({ success: true, entry: await activateAddon(addonId as string, access.identity, { overrideReadiness: Boolean(body.overrideReadiness) }) })
    }
    if (body.action === 'resolve-install') {
      return NextResponse.json(await executeAddonDependencyPlan(addonId as string, 'install', access.identity, { overrideReadiness: Boolean(body.overrideReadiness) }))
    }
    if (body.action === 'resolve-activate') {
      return NextResponse.json(await executeAddonDependencyPlan(addonId as string, 'activate', access.identity, { overrideReadiness: Boolean(body.overrideReadiness) }))
    }
    if (body.action === 'resolve-replace-install') {
      return NextResponse.json(await executeAddonReplacementPlan(addonId as string, 'install', access.identity, { overrideReadiness: Boolean(body.overrideReadiness) }))
    }
    if (body.action === 'resolve-replace-activate') {
      return NextResponse.json(await executeAddonReplacementPlan(addonId as string, 'activate', access.identity, { overrideReadiness: Boolean(body.overrideReadiness) }))
    }
    if (body.action === 'upgrade') {
      return NextResponse.json({ success: true, entry: await upgradeAddon(addonId as string, access.identity, { overrideReadiness: Boolean(body.overrideReadiness) }) })
    }
    if (body.action === 'deactivate') {
      return NextResponse.json({ success: true, entry: await deactivateAddon(addonId as string, access.identity) })
    }
    if (body.action === 'uninstall') {
      return NextResponse.json(await uninstallAddon(addonId as string, access.identity))
    }
    if (body.action === 'save-settings') {
      return NextResponse.json({ success: true, entry: await updateAddonSettings(addonId as string, body.settings ?? {}, access.identity) })
    }
    if (body.action === 'save-manifest') {
      return NextResponse.json({
        success: true,
        manifest: await updateAddonManifestCore(addonId as string, body.manifestConfig ?? {}, access.identity),
      })
    }
    if (body.action === 'save-assets') {
      return NextResponse.json(await updateAddonTextAssets(addonId as string, body.assets ?? {}, access.identity))
    }
    if (body.action === 'save-channel-policy') {
      return NextResponse.json({
        success: true,
        channelPolicy: await updateAddonChannelPolicy(
          {
            allowBeta: Boolean(body.channelPolicy?.allowBeta),
            allowPrivate: Boolean(body.channelPolicy?.allowPrivate),
            requireReady: Boolean(body.channelPolicy?.requireReady),
            allowReadinessOverride: body.channelPolicy?.allowReadinessOverride !== false,
            requireOverrideApproval: body.channelPolicy?.requireOverrideApproval !== false,
            overrideRoles: Array.isArray(body.channelPolicy?.overrideRoles)
              ? body.channelPolicy?.overrideRoles.filter((item): item is string => typeof item === 'string')
              : ['ADMIN', 'MANAGER'],
          },
          access.identity
        ),
      })
    }
    if (body.action === 'request-override') {
      if (!body.executionAction) {
        return NextResponse.json({ error: 'executionAction is required' }, { status: 400 })
      }
      return NextResponse.json({
        success: true,
        request: await createAddonOverrideRequest(addonId as string, body.executionAction, access.identity),
      })
    }
    if (body.action === 'approve-override') {
      if (!body.snapshotId) {
        return NextResponse.json({ error: 'snapshotId is required' }, { status: 400 })
      }
      return NextResponse.json(await approveAddonOverrideRequest(addonId as string, body.snapshotId, access.identity))
    }
    if (body.action === 'reject-override') {
      if (!body.snapshotId) {
        return NextResponse.json({ error: 'snapshotId is required' }, { status: 400 })
      }
      return NextResponse.json(await rejectAddonOverrideRequest(addonId as string, body.snapshotId, access.identity))
    }
    if (body.action === 'create-template') {
      if (!body.templateId) {
        return NextResponse.json({ error: 'templateId is required' }, { status: 400 })
      }
      return NextResponse.json({
        success: true,
        manifest: await createAddonFromTemplate(body.templateId, body.templateConfig, access.identity),
      })
    }
    if (body.action === 'trust') {
      return NextResponse.json(await trustAddonPackage(addonId as string, access.identity))
    }
    if (body.action === 'untrust') {
      return NextResponse.json(await untrustAddonPackage(addonId as string, access.identity))
    }
    if (body.action === 'approve') {
      return NextResponse.json(await approveAddonPackage(addonId as string, access.identity))
    }
    if (body.action === 'unapprove') {
      return NextResponse.json(await unapproveAddonPackage(addonId as string, access.identity))
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
