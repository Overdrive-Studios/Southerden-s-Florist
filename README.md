# Southerden's Florist Toowoomba — website

Plain HTML/CSS/JS site, hosted on Cloudflare Pages, with a little server code in `functions/` for orders and Stripe payments.

## Before going live
1. **Photos** – run `python3 images/download-photos.py` once, while the old site is still up, to copy all product photos into `images/`.
2. **Logo** – add the logo as `logo.png` in this folder; it appears in every page header automatically.
3. **Orders and payments** – see below.
4. **Address** – add the street address on `contact.html`.

## Structure
- `index.html` – home
- `bouquets.html`, `arrangements.html`, `roses.html`, `sympathy.html`, `baby.html`, `hampers.html` – categories
- `products/` – one page per product
- `about.html`, `delivery.html`, `contact.html`, `cart.html`
- `styles.css`, `cart.js`, `config.js`

## Delivery areas and fees
Settings: `delivery-zones.js`. Matching: `delivery-engine.js`.

- At checkout the street address is looked up on the map (OpenStreetMap, free, no key), with address suggestions as the customer types.
- If the address is inside a drawn `area` of a zone, that zone's fee applies. Zones are checked top to bottom.
- Otherwise the suburb name decides it, using each zone's `suburbs` list. All Toowoomba suburbs are in the free zone.
- No match: the order still goes through, flagged **"delivery cost to be confirmed"**.
- The order email includes the zone, fee, how it was matched and a Google Maps link to the address.
- `sameDay: false` makes the earliest delivery date the next business day (for courier zones).

## Checkout
Four steps on `cart.html`: **Cart** (items and add-ons) → **Delivery & details** → **Payment** → **Confirmation** with an order number (e.g. `SF261101-4827`).

- Progress is kept if the page is refreshed. The confirmation can be printed or saved.
- The order email to the shop includes the order number, payment method, delivery date, items, extras, delivery zone and fee, card message and contact details.
- Payment: "Pay now by card" (Stripe) and "Pay over the phone". Card isn't offered for addresses outside the listed areas, since the delivery cost has to be confirmed first.
- To try the flow without sending anything, open `cart.html?preview` on a copy with ordering switched off.

## Orders and payments
Server code in `functions/` (runs on Cloudflare Pages):
- `api/checkout` checks every order: prices, options, delivery fee and date are worked out on the server from the site's own data files, never taken from the browser. Card orders go to Stripe Checkout; phone orders are emailed straight away.
- `api/stripe-webhook` is called by Stripe when a payment completes and emails the paid order to the shop (marked PAID) and a confirmation to the customer. This works even if the customer closes the page after paying.
- `api/order` shows the confirmation after paying; `api/status` tells checkout what's switched on.
- `functions/_lib/catalog.js` is generated from `product-options.js`, `extras.js`, `delivery-zones.js`, `config.js` and the product pages by `node tools/build-catalog.mjs`. Cloudflare runs this on every deploy, so price or zone changes apply automatically.

### Cloudflare Pages settings
- Build command: `node tools/build-catalog.mjs`  · Output directory: `/` (leave blank)
- Environment variables (Settings → Variables and secrets, as encrypted secrets):
  - `STRIPE_SECRET_KEY` – from Stripe → Developers → API keys (`sk_test_...` while testing, `sk_live_...` when live)
  - `STRIPE_WEBHOOK_SECRET` – from the Stripe webhook below (`whsec_...`)
  - `RESEND_API_KEY` – from resend.com
  - `SHOP_EMAIL` – where orders go (several allowed, comma separated)
  - `FROM_EMAIL` – e.g. `Southerden's Florist <orders@southerdenflorist.com>` (domain verified in Resend)
- Stripe webhook: Developers → Webhooks → add endpoint `https://YOUR-SITE/api/stripe-webhook`, events `checkout.session.completed` and `checkout.session.async_payment_succeeded`.
- While the Stripe key starts with `sk_test_`, checkout shows a test-mode note (card 4242 4242 4242 4242).
- Without the email settings, checkout asks customers to phone instead.
