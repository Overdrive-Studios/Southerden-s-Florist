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

- At checkout the street address is looked up on the map (OpenStreetMap, free, no key), with address suggestions as the customer types.
- Zones are checked top to bottom. A zone matches if the address is inside one of its drawn `areas`, or within `maxKm` of the shop (straight line from Highfields).
- If the address can't be found on the map, the suburb name is matched against each zone's `suburbs` list instead (also used until map areas are set up).
- No match: the order still goes through, flagged **"delivery cost to be confirmed"**.
- The order email includes the zone, fee, how it was matched, the distance from the shop and a Google Maps link.
- `sameDay: false` makes the earliest delivery date the next business day (for courier zones).
