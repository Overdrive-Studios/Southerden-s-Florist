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
Everything lives in `delivery-zones.js`. It drives both the fee at checkout and the area lists on the Delivery page.

- **Zones** are checked top to bottom: the suburb name first, then the postcode. The first match sets the fee.
- `type`: `free`, `extra` (own driver, fee added) or `courier` (handed to a courier, fee added).
- `fee`: dollars added to the order, e.g. `15`.
- `sameDay: false` stops same-day bookings for that zone (earliest date becomes the next business day).
- `suburbs` / `postcodes`: add areas here. Capitals don't matter. A postcode covers every suburb in it.
- Any address that matches no zone can still be ordered, and is flagged **"delivery cost to be confirmed"** in the order email so the shop can call.
- Add more zones (e.g. a $10 band and a $20 band) by copying a zone block and giving it a new `id`.
