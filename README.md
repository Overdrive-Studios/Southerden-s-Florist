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
