# Cart to Buyzilo Migration Assessment

## What this is

`cart` is a mature PHP e-commerce platform with a large addon ecosystem.
`buyzilo` is a separate Next.js + Prisma marketplace application.

That means "add all features from cart to buyzilo" is not a file copy task. The features have to be reimplemented in the `buyzilo` architecture.

## Current Buyzilo baseline

Buyzilo already includes these major capabilities:

- user authentication and roles
- buyer dashboard
- vendor dashboard
- admin dashboard
- products, categories, cart, checkout, orders
- coupons
- reviews
- custom pages
- blog
- addresses
- payouts and vendor plans
- message threads
- support requests
- Stripe payment integration

Relevant sources:

- `prisma/schema.prisma`
- `app/admin/*`
- `app/vendor/*`
- `app/dashboard/*`
- `app/api/*`

## Major Cart feature areas not yet fully represented in Buyzilo

These are the largest visible gaps based on the `cart/app/addons` inventory and the current Buyzilo schema/routes.

### Merchandising and catalog

- product bundles / buy together
- product variations
- required products
- tags
- advanced product filters
- wishlists with richer behavior
- bestsellers / customers also bought
- price lists / price per unit
- image zoom and richer gallery behavior

### Marketing

- banners
- newsletters
- email marketing workflows
- polls
- RSS feeds
- upsell / cross-sell tooling
- Facebook Pixel / Google Analytics / export integrations
- Google sitemap and SEO tooling
- data feeds

### Marketplace and vendor operations

- vendor terms
- vendor category fees
- vendor debt payout logic
- vendor rating parity
- vendor communication parity
- vendor privileges parity
- vendor data premoderation parity
- vendor panel configurator parity
- warehouses / inventory locations
- order fulfillment workflows

### Customer service and post-purchase

- RMA / returns
- call requests
- gift certificates
- attachments
- store locator
- product subscribers / stock notifications

### Admin / platform management

- advanced import
- barcode / documents / PDF generation
- full permissions parity
- settings parity across payment, shipping, localization, email, SEO
- addon management model
- auditability for admin actions and moderation flows

### Compliance and platform infrastructure

- GDPR tooling
- captcha / recaptcha / antibot
- access restrictions
- anti-fraud
- full SEO controls
- PWA / mobile-app parity
- caching / search infrastructure parity

## Recommended migration order

Reimplementing the entire `cart` feature surface safely should be done in phases.

### Phase 1: core commerce parity

- product options and variants
- richer coupons and promotions
- wishlist completion
- advanced filters
- shipping methods and rates model
- payment methods configuration model
- returns / refund workflow

### Phase 2: marketplace parity

- vendor approval and moderation workflows
- vendor plans and fee rules
- vendor communication center
- warehouse / fulfillment support
- vendor accounting and debt logic

### Phase 3: growth tooling

- banners
- newsletters
- SEO controls
- sitemap generation
- analytics / pixels
- product bundles and recommendations

### Phase 4: enterprise and compliance

- import/export
- GDPR tooling
- anti-fraud
- document generation
- addon/plugin architecture

## Architecture constraints

The following `cart` concepts cannot be ported directly:

- PHP controllers, hooks, and templates
- CS-Cart addon XML/config structure
- Smarty/TPL frontend templates
- direct database schema reuse without a migration map

Equivalent Buyzilo implementation should happen through:

- Prisma schema extensions
- Next.js app routes and server actions
- React admin/vendor/customer UIs
- background jobs where needed
- explicit migration scripts for data import

## Immediate next step

Do not try to move "all features" in one patch.

Start with a bounded parity slice:

1. product options and variants
2. wishlist + save for later parity
3. promotions / bundles / upsell
4. RMA / returns
5. shipping and fulfillment

## Suggested execution rule

For each feature migrated from `cart` to `buyzilo`:

1. identify the user flow in `cart`
2. map the required data model changes in Prisma
3. add API routes / server actions
4. build admin UI
5. build vendor UI if needed
6. build storefront UI
7. add seed data and verification steps

## Conclusion

Buyzilo is already a real marketplace application, but it is still far from full parity with the `cart` project.

The correct implementation path is phased reimplementation, not direct copying.
