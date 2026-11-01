# Southerden's Florist Toowoomba — website

Static site (plain HTML/CSS/JS, no build step). Open `index.html` or host the folder anywhere.

## Before going live
1. **Photos** – run `python3 images/download-photos.py` once, while the old site is still up, to copy all product photos into `images/`.
2. **Logo** – add the logo as `logo.png` in this folder; it appears in every page header automatically.
3. **Orders** – in `config.js`, set `orderEndpoint` (e.g. a Formspree form URL) so orders are emailed to the shop. Optionally set `paymentLink` (Square/Stripe) to take card payment online.
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
- Payment: "Pay over the phone" is always offered. "Pay online by card" appears once `paymentLink` is set in `config.js`.
- While `orderEndpoint` in `config.js` is empty, checkout asks customers to phone instead. To try the full flow without sending anything, open `cart.html?preview`.
