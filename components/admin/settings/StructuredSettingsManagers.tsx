'use client'

import { useState } from 'react'

type SaveState = {
  saving: boolean
  saved: boolean
}

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    const parsed = JSON.parse(raw) as T
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

async function saveSettings(payload: Record<string, string>, onState: (state: SaveState) => void) {
  onState({ saving: true, saved: false })
  try {
    const response = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (response.ok) {
      onState({ saving: false, saved: true })
      window.setTimeout(() => onState({ saving: false, saved: false }), 1600)
      return
    }
  } finally {
    onState({ saving: false, saved: false })
  }
}

function SaveButton({ saving, saved, label = 'Save settings' }: { saving: boolean; saved: boolean; label?: string }) {
  return (
    <button
      type="submit"
      className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${saved ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'}`}
      disabled={saving}
    >
      {saving ? 'Saving...' : saved ? 'Saved' : label}
    </button>
  )
}

export function PaymentSettingsManager({ initialValue }: { initialValue?: string | null }) {
  const parsed = parseJson<Record<string, boolean>>(initialValue, {
    stripe: true,
    cod: false,
    bankTransfer: false,
    wallet: true,
  })
  const [config, setConfig] = useState(parsed)
  const [state, setState] = useState<SaveState>({ saving: false, saved: false })

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void saveSettings({ paymentMethodsConfig: JSON.stringify(config) }, setState)
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {[
          ['stripe', 'Stripe checkout', 'Primary online card payment flow.'],
          ['cod', 'Cash on delivery', 'Allow offline payment on physical deliveries.'],
          ['bankTransfer', 'Bank transfer', 'Enable manual transfer and finance review.'],
          ['wallet', 'Store credit / wallet', 'Allow buyer balance to be used at checkout.'],
        ].map(([key, label, hint]) => (
          <article key={key} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">{label}</h3>
                <p className="mt-1 text-xs text-slate-500">{hint}</p>
              </div>
              <button
                type="button"
                onClick={() => setConfig((current) => ({ ...current, [key]: !current[key] }))}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${config[key] ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
              >
                {config[key] ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Checkout posture</h3>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {Object.entries(config).map(([key, value]) => (
            <span key={key} className={`rounded-full px-3 py-1 font-semibold ${value ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
              {key}: {value ? 'on' : 'off'}
            </span>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <SaveButton saving={state.saving} saved={state.saved} />
      </div>
    </form>
  )
}

type ShippingZone = { code: string; name: string }
type ShippingMethod = { code: string; label: string; price: number; etaDays?: string; freeOver?: number | null; countries?: string[]; isActive?: boolean }

export function ShippingSettingsManager({
  initialZones,
  initialMethods,
}: {
  initialZones?: string | null
  initialMethods?: string | null
}) {
  const [zones, setZones] = useState<ShippingZone[]>(parseJson(initialZones, [{ code: 'US', name: 'United States' }]))
  const [methods, setMethods] = useState<ShippingMethod[]>(
    parseJson(initialMethods, [{ code: 'STANDARD', label: 'Standard Shipping', price: 7.99, etaDays: '3-5 business days', freeOver: 100, isActive: true }])
  )
  const [state, setState] = useState<SaveState>({ saving: false, saved: false })

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void saveSettings(
          {
            shippingZonesConfig: JSON.stringify(zones),
            shippingMethodsConfig: JSON.stringify(methods),
          },
          setState
        )
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Shipping Zones</h3>
              <p className="mt-1 text-xs text-slate-500">Country/region zones used by shipping methods.</p>
            </div>
            <button
              type="button"
              onClick={() => setZones((current) => [...current, { code: '', name: '' }])}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
            >
              Add zone
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {zones.map((zone, index) => (
              <div key={`${zone.code}-${index}`} className="grid gap-2 md:grid-cols-[120px_1fr_auto]">
                <input
                  value={zone.code}
                  onChange={(event) => setZones((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, code: event.target.value.toUpperCase() } : item))}
                  placeholder="US"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  value={zone.name}
                  onChange={(event) => setZones((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))}
                  placeholder="United States"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setZones((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Shipping Methods</h3>
              <p className="mt-1 text-xs text-slate-500">Pricing, ETA, and free-shipping rules.</p>
            </div>
            <button
              type="button"
              onClick={() => setMethods((current) => [...current, { code: '', label: '', price: 0, etaDays: '', freeOver: null, countries: [], isActive: true }])}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700"
            >
              Add method
            </button>
          </div>
          <div className="mt-4 space-y-4">
            {methods.map((method, index) => (
              <div key={`${method.code}-${index}`} className="rounded-xl border border-slate-200 p-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <input
                    value={method.code}
                    onChange={(event) => setMethods((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, code: event.target.value.toUpperCase() } : item))}
                    placeholder="STANDARD"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <input
                    value={method.label}
                    onChange={(event) => setMethods((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))}
                    placeholder="Standard Shipping"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={method.price}
                    onChange={(event) => setMethods((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, price: Number(event.target.value) } : item))}
                    placeholder="Price"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <input
                    value={method.etaDays ?? ''}
                    onChange={(event) => setMethods((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, etaDays: event.target.value } : item))}
                    placeholder="3-5 business days"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={method.freeOver ?? ''}
                    onChange={(event) => setMethods((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, freeOver: event.target.value ? Number(event.target.value) : null } : item))}
                    placeholder="Free over amount"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <input
                    value={(method.countries ?? []).join(', ')}
                    onChange={(event) => setMethods((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, countries: event.target.value.split(',').map((value) => value.trim().toUpperCase()).filter(Boolean) } : item))}
                    placeholder="US, CA, GB"
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setMethods((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, isActive: item.isActive === false } : item))}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${method.isActive === false ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}
                  >
                    {method.isActive === false ? 'Disabled' : 'Active'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethods((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="flex justify-end">
        <SaveButton saving={state.saving} saved={state.saved} />
      </div>
    </form>
  )
}

export function EmailSettingsManager({
  smtpValue,
  templatesValue,
  smsValue,
}: {
  smtpValue?: string | null
  templatesValue?: string | null
  smsValue?: string | null
}) {
  const [smtp, setSmtp] = useState(parseJson(smtpValue, { host: '', port: 587, secure: false, user: '', password: '', fromEmail: '', fromName: '' }))
  const [templates, setTemplates] = useState(parseJson(templatesValue, { orderCreated: true, orderShipped: true, orderDelivered: true, payoutRequested: true }))
  const [sms, setSms] = useState(parseJson(smsValue, { enabled: false, accountSid: '', authToken: '', fromNumber: '', orderCreated: true, orderShipped: true, orderDelivered: true }))
  const [state, setState] = useState<SaveState>({ saving: false, saved: false })
  const smtpFields: Array<[keyof typeof smtp, string]> = [
    ['host', 'SMTP host'],
    ['port', 'Port'],
    ['user', 'Username'],
    ['password', 'Password'],
    ['fromEmail', 'From email'],
    ['fromName', 'From name'],
  ]
  const smsFields: Array<[keyof typeof sms, string]> = [
    ['accountSid', 'Twilio Account SID'],
    ['authToken', 'Twilio Auth Token'],
    ['fromNumber', 'From number'],
  ]
  const templateKeys = Object.keys(templates) as Array<keyof typeof templates>

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void saveSettings(
          {
            smtpConfig: JSON.stringify(smtp),
            emailTemplatesConfig: JSON.stringify(templates),
            smsConfig: JSON.stringify(sms),
          },
          setState
        )
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">SMTP Delivery</h3>
          <div className="mt-4 space-y-3">
            {smtpFields.map(([key, label]) => (
              <input
                key={key}
                value={String(smtp[key] ?? '')}
                onChange={(event) => setSmtp((current) => ({ ...current, [key]: key === 'port' ? Number(event.target.value) : event.target.value }))}
                placeholder={label}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            ))}
            <button
              type="button"
              onClick={() => setSmtp((current) => ({ ...current, secure: !current.secure }))}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${smtp.secure ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
            >
              TLS/secure: {smtp.secure ? 'On' : 'Off'}
            </button>
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Transactional Coverage</h3>
          <div className="mt-4 space-y-3">
            {templateKeys.map((key) => (
              <div key={key} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <span className="text-sm text-slate-700">{key}</span>
                <button
                  type="button"
                  onClick={() => setTemplates((current) => ({ ...current, [key]: !current[key] }))}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${templates[key] ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                >
                  {templates[key] ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">SMS Delivery</h3>
          <div className="mt-4 space-y-3">
            {smsFields.map(([key, label]) => (
              <input
                key={key}
                value={String(sms[key] ?? '')}
                onChange={(event) => setSms((current) => ({ ...current, [key]: event.target.value }))}
                placeholder={label}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            ))}
            <button
              type="button"
              onClick={() => setSms((current) => ({ ...current, enabled: !current.enabled }))}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${sms.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
            >
              SMS sending: {sms.enabled ? 'On' : 'Off'}
            </button>
          </div>
        </article>
      </div>

      <div className="flex justify-end">
        <SaveButton saving={state.saving} saved={state.saved} />
      </div>
    </form>
  )
}

export function SecuritySettingsManager({ initialValue }: { initialValue?: string | null }) {
  const [config, setConfig] = useState(parseJson(initialValue, { enabled: false, siteKey: '', secretKey: '', minimumScore: 0.5, version: 'v3' }))
  const [state, setState] = useState<SaveState>({ saving: false, saved: false })

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        void saveSettings({ recaptchaConfig: JSON.stringify(config) }, setState)
      }}
      className="space-y-4"
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">reCAPTCHA Policy</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              value={config.siteKey}
              onChange={(event) => setConfig((current) => ({ ...current, siteKey: event.target.value }))}
              placeholder="Site key"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              value={config.secretKey}
              onChange={(event) => setConfig((current) => ({ ...current, secretKey: event.target.value }))}
              placeholder="Secret key"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={config.minimumScore}
              onChange={(event) => setConfig((current) => ({ ...current, minimumScore: Number(event.target.value) }))}
              placeholder="Minimum score"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-slate-800">Protection Status</h3>
          <div className="mt-4 space-y-3">
            <button
              type="button"
              onClick={() => setConfig((current) => ({ ...current, enabled: !current.enabled }))}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${config.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
            >
              Captcha enforcement: {config.enabled ? 'On' : 'Off'}
            </button>
            <p className="text-xs text-slate-500">
              Active for anonymous registration and forgot-password when enabled and keys are present.
            </p>
          </div>
        </article>
      </div>

      <div className="flex justify-end">
        <SaveButton saving={state.saving} saved={state.saved} />
      </div>
    </form>
  )
}
