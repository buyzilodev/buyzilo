# Cart to Buyzilo Parity Tracker

This tracker is the working source of truth for remaining parity against `cart/app/addons`.

Status legend:
- `Implemented`: a meaningful Buyzilo equivalent exists
- `Partial`: some equivalent exists, but not full parity
- `Not Started`: no meaningful Buyzilo equivalent yet
- `N/A`: CS-Cart specific or architecture-specific feature with no direct 1:1 target

## Current reality

- `cart` addon areas discovered: `99`
- `buyzilo` is not at 100% parity yet
- exact parity must be measured against this list, not by intuition

## Tracker

| Addon | Status | Notes |
|---|---|---|
| access_restrictions | Implemented | Admin-managed access rules now restrict catalog, category, product, store, and custom-page visibility by signed-in state or buyer user group, with runtime enforcement across storefront pages, homepage rails, and product APIs |
| advanced_import | Implemented | Admin CSV import now supports dry-run preview and commit for categories and products, with validation, create/update behavior, and import history |
| age_verification | Not Started | No age-gate flow yet |
| alpha_bank | N/A | Payment-provider-specific |
| anti_fraud | Not Started | No fraud scoring or review queue yet |
| attachments | Implemented | Product document attachments now upload through product editors, persist in product metadata, and render as downloadable files on the PDP |
| backend_google_auth | Not Started | No admin Google auth parity yet |
| banners | Implemented | Admin banner management now supports page placement, query/category targeting, scheduling, active state, and priority, and storefront/account/cart/search/store surfaces render placement-matched banner cards instead of static slices |
| barcode | Not Started | No barcode workflow |
| bestsellers | Implemented | Bestsellers are now ranked from actual order-item sales data, exposed on the homepage, and configurable/reviewable from an admin bestseller page |
| blog | Implemented | Buyzilo has blog and comments |
| buy_together | Implemented | Bundles and offers implemented |
| call_requests | Implemented | Buyers can now open explicit callback requests with phone/time preferences, admins get a dedicated callback queue, and vendors can view callback details in store support |
| catalog_mode | Not Started | No catalog-only mode |
| cities | Not Started | No cities dataset parity |
| customers_also_bought | Implemented | Product detail and recommendation rails now use actual co-purchase order data to surface products customers also bought together |
| data_feeds | Implemented | Admin feed management now exposes live Google Merchant and Meta catalog export endpoints, eligible item counts, and recorded feed run history |
| direct_payments | Not Started | No direct-payments addon parity |
| discussion | Implemented | Product detail now supports buyer review submission plus public product questions/comments with vendor/admin answers, and staff get dedicated admin/vendor discussion management queues |
| divido | N/A | Payment-provider-specific |
| ebay | Not Started | No eBay integration |
| email_marketing | Implemented | Admin newsletters now support audience-aware campaign composition, test sends, live campaign delivery, and campaign history while respecting buyer marketing consent |
| facebook_pixel | Implemented | Admin-configured Meta Pixel now loads on storefront and tracks page view, product view, add to cart, initiate checkout, and purchase |
| form_builder | Not Started | No general form builder |
| full_page_cache | N/A | Framework/infrastructure-specific |
| full_page_cache_unmanaged | N/A | Framework/infrastructure-specific |
| gdpr | Implemented | Buyer privacy center now supports consent controls, JSON personal-data export, deletion requests, and admin erasure processing with account anonymization |
| geo_maps | Not Started | No geolocation/maps feature parity |
| gift_certificates | Implemented | Gift cards now support recipient metadata, buyer-funded sendable gift certificates with delivery email, buyer redemption/history views, and admin visibility over certificate source/recipient status |
| google_analytics | Implemented | Admin-configured GA4 now loads on storefront and tracks page view, product view, add to cart, begin checkout, and purchase |
| google_export | Not Started | No Google export integration |
| google_sitemap | Implemented | Public `/sitemap.xml` and `/robots.txt` now index/storefront roots, approved products, categories, stores, pages, and blog posts |
| graphql_api | Not Started | No GraphQL API |
| help_center | Implemented | Public help center now exposes category/article knowledge-base pages, admin manages support categories and articles, and buyer support surfaces suggest help articles before opening tickets |
| hidpi | N/A | Frontend asset concern, not tracked as a feature slice |
| hybrid_auth | Not Started | No hybrid social auth parity |
| image_zoom | Implemented | Product gallery now supports hover zoom, thumbnail navigation, and full-screen lightbox viewing |
| janrain | N/A | Third-party auth provider specific |
| master_products | Not Started | No master products model parity |
| mobile_app | Not Started | No mobile-app parity |
| mve_plus | N/A | CS-Cart edition-specific |
| myob | N/A | Accounting integration specific |
| my_changes | N/A | CS-Cart customization addon |
| newsletters | Implemented | Newsletter area now includes campaign composition, segmented sends, test delivery, and digest automation controls |
| nova_license | N/A | License addon |
| onboarding_guide | Not Started | No onboarding guide parity |
| onekpay | N/A | Payment-provider-specific |
| order_fulfillment | Implemented | Shipments and vendor/admin handling implemented |
| pay360 | N/A | Payment-provider-specific |
| payments_by_country | Not Started | No country-specific payment matrix |
| payment_dependencies | Not Started | No payment dependency engine |
| paypal | Not Started | No PayPal parity |
| paypal_adaptive | N/A | Provider-specific |
| paypal_checkout | Not Started | No PayPal checkout parity |
| paypal_commerce_platform | N/A | Provider-specific |
| pdf_documents | Implemented | Buyer, admin, and vendor invoice documents now render as printable HTML documents with order-scoped access control and in-flow invoice links |
| pingpp | N/A | Provider-specific |
| polls | Not Started | No polls feature |
| price_list | Not Started | No price-list export/display parity |
| price_per_unit | Implemented | Product metadata supports unit quantity/unit labels and buyer pricing surfaces now render per-unit pricing |
| product_bundles | Implemented | Bundle offers and admin management implemented |
| product_reviews | Implemented | Reviews exist |
| product_variations | Implemented | Product options and variants implemented |
| pwa | Implemented | Manifest, generated app icons, service-worker registration, offline fallback page, and storefront install prompt now provide installable PWA baseline behavior |
| quickbooks | N/A | Accounting integration specific |
| recaptcha | Implemented | Admin-configured Google reCAPTCHA v3 now protects anonymous registration and forgot-password flows with public site-key exposure and server-side token verification |
| replain | N/A | Chat integration specific |
| required_products | Implemented | Product editor supports required-product assignment, PDP/cart expose requirements, and checkout blocks until dependencies are present |
| reward_points | Implemented | Reward points now surface in cart and checkout with estimated earnings, available balances, and one-click reward coupon claiming/apply on the purchase flow |
| rma | Implemented | Returns and RMA workflow implemented |
| rss_feed | Not Started | No RSS feed feature |
| searchanise | N/A | Search SaaS integration specific |
| seo | Implemented | Storefront routes now emit dynamic metadata, canonical URLs, Open Graph/Twitter tags, product SEO fields are used on PDPs, and admin website settings manage default SEO title/description/keywords |
| shopify_import | Implemented | Advanced import now supports Shopify product CSV files, grouping repeated handles into products with images, tags, auto-created categories, and variant/option import |
| sms_notifications | Implemented | Admin-configured Twilio SMS now sends buyer order confirmation, shipment-progress, and delivery updates while respecting buyer SMS preference and checkout phone data |
| social_buttons | Not Started | No social sharing parity |
| storefront_rest_api | Not Started | No dedicated storefront REST parity map |
| store_locator | Implemented | Store location metadata now lives in vendor settings, public `/stores` locator lists approved stores, and store/admin pages surface address and map details |
| stripe | Partial | Stripe checkout exists |
| stripe_connect | Partial | Vendor payouts/connect support exists |
| suppliers | Implemented | Supplier and procurement flows implemented |
| tags | Implemented | Product tags now persist in product meta, render on PDP/catalog, support storefront tag filtering, and save in search presets |
| tech_support_chat | Partial | Messaging/support exists, not live-chat parity |
| tilda_pages | N/A | Third-party page builder specific |
| upsell | Partial | Bundles/recommendations exist, not dedicated upsell tooling |
| vendor_categories_fee | Implemented | Category-level vendor fee percentages now configure in admin categories, affect vendor settlement math, and surface in vendor/admin earnings views |
| vendor_communication | Implemented | Vendor/admin messaging center exists |
| vendor_data_premoderation | Partial | Moderation exists, not full parity |
| vendor_debt_payout | Partial | Vendor accounting/payout review exists, not full debt logic |
| vendor_locations | Partial | Warehouses and locations exist, not storefront location parity |
| vendor_panel_configurator | Not Started | No vendor panel configurator |
| vendor_plans | Implemented | Vendor plans exist |
| vendor_privileges | Partial | Roles/permissions exist, not cart-level privilege parity |
| vendor_rating | Implemented | Vendor rating now aggregates store product reviews and surfaces on storefront store pages, vendor review analytics, and admin vendor moderation views |
| vendor_terms | Implemented | Admin-managed vendor terms now gate store creation, vendors can review/accept current terms, and admin vendor detail shows recorded acceptance |
| warehouses | Implemented | Warehouses, allocation, transfers, adjustments implemented |
| watermarks | Not Started | No watermark tooling |
| wishlist | Implemented | Wishlist parity plus save-for-later implemented |
| zapier | Implemented | Admin-managed outbound webhook config now delivers Zapier-style events for order creation, support requests, return requests, shipment updates, and payout requests, with recent delivery logs on the add-ons page |

## Implemented slices already completed in Buyzilo

- product options and variants
- wishlist parity and save for later
- promotions, bundles, and recommendation rails
- returns/RMA and refund-to-store-credit
- shipping and fulfillment
- vendor moderation, communication, accounting, payouts
- warehouses, transfers, adjustments, procurement
- support desk
- loyalty/rewards
- referrals
- gift cards and store credit
- buyer retention notifications and digest email delivery

## Highest-value remaining parity backlog

1. `age_verification`

## Rule for claiming 100%

Do not claim 100% parity until:

1. every addon row above is marked `Implemented`, `N/A`, or deliberately excluded with written reason
2. each `Implemented` row has a concrete Buyzilo file/API/UI reference
3. all remaining `Partial` rows are resolved
4. verification is run for affected flows
