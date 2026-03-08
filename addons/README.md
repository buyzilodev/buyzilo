Addon packages live in `addons/packages/<addon-id>/addon.json`.

Package format:

- `id`, `name`, `version`, `description`, `category`
- optional `dependencies`
- optional `entrypoints.adminHref`
- optional `settings.sections[].fields[]`
- optional lifecycle:
  - `install.seedSiteSettings`
  - `uninstall.removeSiteSettings`

The admin add-ons console can upload a manifest JSON file and save it into this package registry.
