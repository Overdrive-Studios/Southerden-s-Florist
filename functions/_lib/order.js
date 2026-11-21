// Shared order logic for the checkout server code (Cloudflare Pages Functions).
// Prices, delivery fees and dates are always worked out here from the catalog,
// never trusted from the customer's browser.
import CATALOG from "./catalog.js";

export const PLACE_NAMES = { home: "Home", work: "Workplace", hospital: "Hospital or care home", funeral: "Funeral or church" };

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}

const norm = (t) => String(t || "").toLowerCase().replace(/\bmt\b\.?/g, "mount").replace(/[^a-z0-9]+/g, " ").trim();
const clean = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").trim().slice(0, max);
export const money = (n) => "$" + (Math.round(n * 100) / 100).toFixed(2);

// ---- Dates (Queensland time, no daylight saving) ----
function brisNow() {
  const n = new Date(Date.now() + 10 * 3600e3);
  return { y: n.getUTCFullYear(), m: n.getUTCMonth(), d: n.getUTCDate(), h: n.getUTCHours(), wd: n.getUTCDay() };
}
const isoOf = (dt) => dt.toISOString().slice(0, 10);
function isWeekend(iso) { const wd = new Date(iso + "T00:00:00Z").getUTCDay(); return wd === 0 || wd === 6; }
export function niceDate(iso) {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
function earliestDate(zone) {
  const n = brisNow();
  const d = new Date(Date.UTC(n.y, n.m, n.d));
  if (n.h >= (zone ? zone.cutoffHour : CATALOG.cutoffHour)) d.setUTCDate(d.getUTCDate() + 1);
  const skip = () => { while (isWeekend(isoOf(d)) || CATALOG.closedDates.includes(isoOf(d))) d.setUTCDate(d.getUTCDate() + 1); };
  skip();
  if (zone && zone.sameDay === false) { d.setUTCDate(d.getUTCDate() + 1); skip(); }
  return isoOf(d);
}

// ---- Delivery zone ----
function inside(pt, poly) {
  let hit = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [yi, xi] = poly[i], [yj, xj] = poly[j];
    if ((yi > pt.lat) !== (yj > pt.lat) && pt.lng < ((xj - xi) * (pt.lat - yi)) / (yj - yi) + xi) hit = !hit;
  }
  return hit;
}
function matchZone(suburb, loc) {
  if (loc && isFinite(loc.lat) && isFinite(loc.lng)) {
    const z = CATALOG.zones.find((z) => z.areas.some((a) => a.length > 2 && inside(loc, a)));
    if (z) return { zone: z, how: "area" };
  }
  const s = norm(suburb);
  const z = CATALOG.zones.find((z) => z.suburbs.some((x) => norm(x) === s));
  return z ? { zone: z, how: "suburb" } : { zone: null, how: "none" };
}

// ---- Cart items ----
function priceProduct(item) {
  const [slug] = String(item.id || "").split("|");
  const p = CATALOG.products[slug];
  if (!p) throw new Error("A product in your cart is no longer available. Please remove it and add it again.");
  let rest = clean(item.opts, 300), add = 0;
  const chosen = [];
  for (const g of p.options) {
    const prefix = g.label + ": ";
    if (!rest.startsWith(prefix)) throw new Error(`Please choose the ${g.label.toLowerCase()} for ${p.name} again.`);
    rest = rest.slice(prefix.length);
    const ch = g.choices.filter((c) => rest === c[0] || rest.startsWith(c[0] + ", ")).sort((a, b) => b[0].length - a[0].length)[0];
    if (!ch) throw new Error(`Please choose the ${g.label.toLowerCase()} for ${p.name} again.`);
    add += +ch[1] || 0;
    chosen.push(g.label + ": " + ch[0]);
    rest = rest.slice(ch[0].length).replace(/^, /, "");
  }
  if (rest) throw new Error(`Please choose the options for ${p.name} again.`);
  return { name: p.name, opts: chosen.join(", "), price: p.price + add, extra: false, img: p.img };
}
function priceExtra(item) {
  const x = CATALOG.extras.find((x) => String(item.id || "").startsWith(x.id + "-"));
  if (!x) throw new Error("An add-on in your cart is no longer available. Please remove it and add it again.");
  const opts = clean(item.opts, 200);
  const ch = x.pick.choices.filter((c) => opts === c[0] || opts.startsWith(c[0] + ", ")).sort((a, b) => b[0].length - a[0].length)[0];
  if (!ch) throw new Error(`Please choose your ${x.name.toLowerCase()} again.`);
  let label = ch[0];
  if (x.pick2) {
    const second = opts.slice(ch[0].length + 2);
    if (!x.pick2.choices.includes(second)) throw new Error(`Please choose the ${x.pick2.label.toLowerCase()} for your ${x.name.toLowerCase()} again.`);
    label += ", " + second;
  } else if (opts !== ch[0]) throw new Error(`Please choose your ${x.name.toLowerCase()} again.`);
  return { name: x.name, opts: label, price: ch[1], extra: true, img: ch[2] || x.img };
}

// ---- Build and check a whole order ----
const REQUIRED = {
  recipient_name: "the recipient's name", recipient_phone: "the recipient's phone", street_name: "the street", suburb: "the suburb",
  postcode: "the postcode", delivery_date: "the delivery date", sender_name: "your name", sender_phone: "your phone", email: "your email",
};
export function buildOrder(body) {
  const d = body && body.details ? body.details : {};
  const cart = Array.isArray(body && body.cart) ? body.cart.slice(0, 40) : [];
  if (!cart.length) throw new Error("Your cart is empty.");
  const items = [];
  for (const raw of cart) {
    const qty = Math.floor(+raw.qty);
    if (!(qty >= 1 && qty <= 20)) throw new Error("Please check the quantities in your cart (1 to 20 of each).");
    const priced = raw.extra ? priceExtra(raw) : priceProduct(raw);
    items.push({ ...priced, qty });
  }
  if (!items.some((i) => !i.extra)) throw new Error("Add-on extras can only be ordered with flowers.");

  const f = {};
  for (const k of Object.keys(REQUIRED)) {
    f[k] = clean(d[k], 120);
    if (!f[k]) throw new Error("Please fill in " + REQUIRED[k] + ".");
  }
  if (!/^\S+@\S+\.\S+$/.test(f.email)) throw new Error("Please check your email address.");
  if (!/^\d{4}$/.test(f.postcode)) throw new Error("Please check the postcode (4 numbers).");
  for (const k of ["recipient_phone", "sender_phone"]) if (f[k].replace(/\D/g, "").length < 8) throw new Error("Please check the phone numbers.");
  const place = PLACE_NAMES[d.delivery_type] ? d.delivery_type : "home";
  const house = clean(d.house_number, 20);
  if (place === "home" && !house) throw new Error("Please fill in the house or unit number.");

  const loc = d._loc && typeof d._loc === "object" ? { lat: +d._loc.lat, lng: +d._loc.lng } : null;
  const m = matchZone(f.suburb, loc);
  const date = f.delivery_date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Please choose the delivery date again.");
  if (isWeekend(date)) throw new Error("We deliver Monday to Friday. Please choose another date.");
  if (CATALOG.closedDates.includes(date)) throw new Error("We're closed on that day. Please choose another date.");
  if (date < earliestDate(m.zone)) throw new Error("That delivery date is no longer available (the order cut-off has passed). Please choose another date.");
  if (date > isoOf(new Date(Date.now() + 366 * 864e5))) throw new Error("Please choose a delivery date within the next year.");

  const subtotal = items.reduce((a, i) => a + i.price * i.qty, 0);
  const fee = m.zone ? m.zone.fee : 0;
  const total = subtotal + fee;
  const n = brisNow();
  const number = "SF" + String(n.y).slice(2) + String(n.m + 1).padStart(2, "0") + String(n.d).padStart(2, "0") + "-" + String(1000 + Math.floor(Math.random() * 9000));

  return {
    number,
    placed: new Date().toLocaleString("en-AU", { timeZone: "Australia/Brisbane", day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit" }),
    items,
    delivery: { date, zone: m.zone ? m.zone.name : CATALOG.unknownName, unknown: !m.zone, fee, how: m.how },
    recipient: {
      name: f.recipient_name, place, detail: clean(d.place_detail, 120),
      address: (house ? house + " " : "") + f.street_name, suburb: f.suburb, postcode: f.postcode, phone: f.recipient_phone,
    },
    card: clean(d.card_message, 260), cardFrom: clean(d.card_from, 80),
    sender: { name: f.sender_name, phone: f.sender_phone, email: f.email },
    notes: clean(d.notes, 500),
    subtotal, total, gst: total / 11,
  };
}

// ---- Keep the order with the Stripe payment (metadata: 50 keys x 500 characters) ----
export function toMetadata(order) {
  const s = JSON.stringify(order), meta = { order_number: order.number };
  const parts = Math.ceil(s.length / 490);
  if (parts > 45) throw new Error("That order is too large to send online. Please call us to place it.");
  for (let i = 0; i < parts; i++) meta["o" + i] = s.slice(i * 490, (i + 1) * 490);
  meta.parts = String(parts);
  return meta;
}
export function fromMetadata(meta) {
  let s = "";
  for (let i = 0; i < +meta.parts; i++) s += meta["o" + i] || "";
  return JSON.parse(s);
}

// ---- Stripe ----
function form(obj, prefix, out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === "object") form(v, key, out);
    else out.push(encodeURIComponent(key) + "=" + encodeURIComponent(v));
  }
  return out.join("&");
}
export async function stripe(env, method, path, params) {
  const base = env.STRIPE_API_BASE || "https://api.stripe.com";
  const r = await fetch(base + "/v1/" + path + (method === "GET" && params ? "?" + form(params) : ""), {
    method,
    headers: { Authorization: "Bearer " + env.STRIPE_SECRET_KEY, "Content-Type": "application/x-www-form-urlencoded", "Stripe-Version": "2024-06-20" },
    body: method === "GET" ? undefined : form(params || {}),
  });
  const j = await r.json();
  if (!r.ok) throw new Error("Stripe: " + ((j.error && j.error.message) || r.status));
  return j;
}
export async function verifyStripeSignature(payload, header, secret) {
  const parts = Object.fromEntries(String(header || "").split(",").map((p) => p.split("=")).filter((p) => p.length === 2).map(([k, v]) => [k, v]));
  const sigs = String(header || "").split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  const t = +parts.t;
  if (!t || !sigs.length || Math.abs(Date.now() / 1000 - t) > 600) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(t + "." + payload));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return sigs.some((s) => s.length === hex.length && [...s].reduce((a, c, i) => a | (c.charCodeAt(0) ^ hex.charCodeAt(i)), 0) === 0);
}

// ---- Emails (sent with Resend) ----
const h = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const label = (i) => i.name + (i.opts ? " (" + i.opts + ")" : "");

function shopEmail(o, paid) {
  const addr = `${o.recipient.address}, ${o.recipient.suburb} QLD ${o.recipient.postcode}`;
  const map = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(addr + ", Australia");
  const rows = [
    ["Payment", paid ? `<b style="color:#1b7a2f">PAID ONLINE ${money(paid.amount)}</b> (Stripe ${h(paid.id)})` : `<b style="color:#b3261e">PAY BY PHONE: call ${h(o.sender.name)} on ${h(o.sender.phone)} to take payment</b>`],
    ["Delivery date", `<b>${h(niceDate(o.delivery.date))}</b>`],
    ["Deliver to", `<b>${h(o.recipient.name)}</b><br>${h(PLACE_NAMES[o.recipient.place])}${o.recipient.detail ? ": " + h(o.recipient.detail) : ""}<br>${h(addr)}<br>${h(o.recipient.phone)}<br><a href="${map}">Open in Google Maps</a>`],
    ["Delivery area", o.delivery.unknown ? `<b style="color:#b3261e">NOT IN A LISTED AREA: confirm delivery and cost with the customer</b>` : `${h(o.delivery.zone)} (${o.delivery.fee ? money(o.delivery.fee) : "included"}), matched by ${o.delivery.how === "area" ? "map area" : "suburb"}`],
    ["Card message", o.card ? h(o.card).replace(/\n/g, "<br>") + (o.cardFrom ? `<br><i>From: ${h(o.cardFrom)}</i>` : "") : "(none)"],
    ["Items", o.items.map((i) => `${i.qty} x ${h(label(i))}${i.extra ? " <small>[extra]</small>" : ""}: ${money(i.price * i.qty)}`).join("<br>")],
    ["Delivery fee", o.delivery.unknown ? "To be confirmed" : o.delivery.fee ? money(o.delivery.fee) : "Included"],
    ["Total", `<b>${money(o.total)}</b>${o.delivery.unknown ? " + delivery (to be confirmed)" : ""} (incl. GST ${money(o.gst)})`],
    ["Ordered by", `${h(o.sender.name)}<br>${h(o.sender.phone)}<br><a href="mailto:${h(o.sender.email)}">${h(o.sender.email)}</a>`],
    ["Notes", o.notes ? h(o.notes).replace(/\n/g, "<br>") : "(none)"],
    ["Placed", h(o.placed)],
  ];
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#222;max-width:640px">
<h2 style="margin:0 0 4px">Order ${h(o.number)}</h2><p style="margin:0 0 16px;color:#555">For ${h(o.recipient.name)}, ${h(niceDate(o.delivery.date))}</p>
<table cellpadding="8" style="border-collapse:collapse;width:100%">${rows.map(([k, v]) => `<tr><td style="border-top:1px solid #ddd;vertical-align:top;width:130px;color:#666">${k}</td><td style="border-top:1px solid #ddd">${v}</td></tr>`).join("")}</table></div>`;
  const text = rows.map(([k, v]) => k + ": " + v.replace(/<br>/g, "\n  ").replace(/<[^>]+>/g, "")).join("\n");
  const subject = `${paid ? "PAID" : "PAY BY PHONE"}: Order ${o.number} for ${o.recipient.name} (${niceDate(o.delivery.date)})`;
  return { subject, html, text };
}

function customerEmail(o, paid, phone) {
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#222;max-width:600px">
<h2 style="margin:0 0 6px">Thank you, ${h(o.sender.name.split(" ")[0])}</h2>
<p>We've received your order <b>${h(o.number)}</b>${paid ? ` and your payment of <b>${money(paid.amount)}</b>` : ""}.</p>
${paid ? "" : `<p><b>We'll call you on ${h(o.sender.phone)} to take payment</b> before your order goes out.</p>`}
${o.delivery.unknown ? `<p>Your address is outside our listed delivery areas, so we'll contact you to confirm delivery options and any cost.</p>` : ""}
<p><b>Delivering to:</b> ${h(o.recipient.name)}, ${h(o.recipient.address)}, ${h(o.recipient.suburb)} QLD ${h(o.recipient.postcode)}<br><b>Delivery date:</b> ${h(niceDate(o.delivery.date))}</p>
<p>${o.items.map((i) => `${i.qty} x ${h(label(i))}: ${money(i.price * i.qty)}`).join("<br>")}<br>Delivery: ${o.delivery.unknown ? "to be confirmed" : o.delivery.fee ? money(o.delivery.fee) : "included"}<br><b>Total: ${money(o.total)}</b> (incl. GST ${money(o.gst)})</p>
<p>Questions? Call us on ${h(phone)} and quote ${h(o.number)}.</p><p>Southerden's Florist, Toowoomba</p></div>`;
  return { subject: `Your Southerden's Florist order ${o.number}`, html };
}

async function resend(env, msg, key) {
  const base = env.RESEND_API_BASE || "https://api.resend.com";
  const r = await fetch(base + "/emails", {
    method: "POST",
    headers: { Authorization: "Bearer " + env.RESEND_API_KEY, "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify(msg),
  });
  if (!r.ok) throw new Error("Email failed: " + r.status + " " + (await r.text()).slice(0, 200));
}

export async function sendOrderEmails(env, o, paid) {
  const from = env.FROM_EMAIL || "Southerden's Florist <orders@southerdenflorist.com>";
  const shop = shopEmail(o, paid);
  await resend(env, { from, to: String(env.SHOP_EMAIL).split(",").map((s) => s.trim()), reply_to: o.sender.email, ...shop }, "shop-" + o.number);
  try {
    await resend(env, { from, to: [o.sender.email], reply_to: env.SHOP_EMAIL.split(",")[0].trim(), ...customerEmail(o, paid, CATALOG.phone) }, "cust-" + o.number);
  } catch (e) {
    console.log("Customer email failed (shop email was sent):", e.message);   // never fail the order over the customer copy
  }
}

export function missingSettings(env, keys) { return keys.filter((k) => !env[k]); }
