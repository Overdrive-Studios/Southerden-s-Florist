(function () {
  var KEY = "southerdens-cart";
  var app = document.getElementById("cartApp");
  var css = document.querySelector('link[href$="styles.css"]');
  var root = css ? css.getAttribute("href").replace("styles.css", "") : "";
  var S = window.SITE || {};
  var telHref = "tel:" + String(S.phone || "").replace(/\s/g, "");

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function save(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} badge(); }
  function money(n) { return "$" + n.toFixed(2); }
  function esc(t) { return String(t).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function total(c) { return c.reduce(function (a, i) { return a + i.price * i.qty; }, 0); }

  function badge() {
    var n = load().reduce(function (a, i) { return a + i.qty; }, 0);
    document.querySelectorAll("[data-cart-count]").forEach(function (b) {
      b.textContent = n;
      if (n) b.removeAttribute("data-zero"); else b.setAttribute("data-zero", "");
    });
  }
  badge();

  // Product pages: quantity +/- and Add to cart
  document.addEventListener("click", function (e) {
    var q = e.target.closest("[data-qty]");
    if (q) { var inp = document.getElementById("qty"); inp.value = Math.max(1, (+inp.value || 1) + (+q.dataset.qty)); return; }
    var a = e.target.closest("[data-add]");
    if (!a) return;
    var p = JSON.parse(a.dataset.add);
    var isExtra = a.hasAttribute("data-extra");
    var n = isExtra ? 1 : Math.max(1, +((document.getElementById("qty") || {}).value) || 1);
    var opt = isExtra ? null : document.getElementById("opt");
    if (isExtra) p.extra = true;
    if (opt) { p.name += " (" + opt.value + ")"; p.id += "-" + opt.value.toLowerCase().replace(/\W+/g, "-"); }
    var c = load(), ex = c.find(function (x) { return x.id === p.id; });
    if (ex) ex.qty += n; else { p.qty = n; c.push(p); }
    save(c); toast(p.name);
    if (isExtra) { a.textContent = "Added ✓"; setTimeout(function () { a.textContent = "+ Add"; }, 1800); }
    if (app) render();
  });

  // Extras strip (product pages and cart)
  var X = window.EXTRAS || [];
  function extraCard(x, inCart) {
    return "<div class='xcard'><span class='art'><img src='" + root + "images/" + esc(x.img) + "' alt='' loading='lazy' onerror='this.remove()'></span>" +
      "<div class='xbody'><b>" + esc(x.name) + "</b><span>" + money(x.price) + "</span></div>" +
      "<button type='button' class='xadd' data-extra data-add='" + esc(JSON.stringify({ id: x.id, name: x.name, price: x.price, img: x.img })) + "'>" + (inCart ? "Add another" : "+ Add") + "</button></div>";
  }
  document.querySelectorAll("[data-extras-strip]").forEach(function (el) {
    el.innerHTML = "<h3>Add an extra</h3><p class='hint'>Make it extra special. Extras are delivered with your flowers.</p><div class='xgrid'>" + X.map(function (x) { return extraCard(x); }).join("") + "</div>";
  });

  function toast(name) {
    var t = document.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; document.body.appendChild(t); }
    t.innerHTML = "<span>" + esc(name) + " added to your cart</span><a href='" + root + "cart.html'>View cart →</a>";
    t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("show"); }, 4000);
  }

  // =====================================================================
  // Checkout: 1 Cart -> 2 Delivery & details -> 3 Payment -> 4 Confirmation
  // =====================================================================
  if (!app) return;

  var DV = window.Delivery;
  var UNKNOWN = window.DELIVERY_UNKNOWN || { name: "Outside our listed areas" };
  var STEPS = [["cart", "Cart"], ["details", "Delivery & details"], ["payment", "Payment"], ["confirmation", "Confirmation"]];
  var PREVIEW = /[?&]preview\b/.test(location.search);   // cart.html?preview shows the confirmation without sending

  // ---- saved progress (survives a page refresh) ----
  function sget(k) { try { return JSON.parse(sessionStorage.getItem(k)); } catch (e) { return null; } }
  function sset(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var draft = sget("sf-draft") || {};
  var loc = draft._loc || null, locating = null, locKey = draft._locKey || "";
  function saveDraft() { draft._loc = loc; draft._locKey = locKey; sset("sf-draft", draft); }

  // ---- dates ----
  function brisNow() { return new Date(new Date().toLocaleString("en-US", { timeZone: "Australia/Brisbane" })); }
  function earliest() {
    var now = brisNow(), d = new Date(now);
    if (now.getHours() >= (S.cutoffHour || 14)) d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d;
  }
  function nextBusinessDay(d) { var n = new Date(d); n.setDate(n.getDate() + 1); while (n.getDay() === 0 || n.getDay() === 6) n.setDate(n.getDate() + 1); return n; }
  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function nice(isoStr) { if (!isoStr) return ""; var p = isoStr.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }

  var allSuburbs = [];
  (window.DELIVERY_ZONES || []).forEach(function (z) { (z.suburbs || []).forEach(function (x) { if (allSuburbs.indexOf(x) < 0) allSuburbs.push(x); }); });
  allSuburbs.sort();

  // ---- payment methods (card appears once a payment link is set in config.js) ----
  function payMethods() {
    var m = [];
    if (S.paymentLink) m.push({ id: "card", label: "Pay online by card", desc: "Pay securely by card on the next screen once your order is placed." });
    m.push({ id: "phone", label: "Pay over the phone", desc: "We'll call you to take card payment before your order goes out." });
    return m;
  }

  // ---- helpers ----
  function hasFlowers(c) { return c.some(function (i) { return !i.extra; }); }
  function currentDelivery() { return (draft.address || draft.suburb) ? DV.match(loc, draft.suburb) : null; }
  function detailsDone() { return ["delivery_date", "recipient_name", "address", "suburb", "postcode", "recipient_phone", "sender_name", "sender_phone", "email"].every(function (k) { return draft[k]; }); }
  function stepper(n) {
    return "<ol class='stepper'>" + STEPS.map(function (s, i) {
      return "<li class='" + (i < n ? "done" : i === n ? "now" : "") + "'><span>" + (i < n ? "✓" : i + 1) + "</span>" + s[1] + "</li>";
    }).join("") + "</ol>";
  }
  function go(step) { if (location.hash !== "#" + step) location.hash = step; else render(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  window.addEventListener("hashchange", function () { render(); window.scrollTo(0, 0); });

  function summary(c, opts) {
    opts = opts || {};
    var d = currentDelivery(), sub = total(c);
    var lines = c.map(function (i) {
      return "<div class='sline'><span class='art'><img src='" + root + "images/" + esc(i.img) + "' alt='' onerror='this.remove()'></span><span>" + esc(i.name) + (i.qty > 1 ? " <small>× " + i.qty + "</small>" : "") + "</span><b>" + money(i.price * i.qty) + "</b></div>";
    }).join("");
    var feeTxt = !d ? (opts.step === "cart" ? "Calculated next" : "Enter address") : d.unknown ? "To be confirmed" : d.fee > 0 ? money(d.fee) : "Free";
    var grand = sub + (d && !d.unknown ? d.fee : 0);
    return "<aside class='panel summary'><h3>Order summary</h3>" + (opts.step === "cart" ? "" : lines) +
      "<div class='totals'><div><span>Subtotal</span><span>" + money(sub) + "</span></div>" +
      "<div><span id='delivLabel'>" + (d && !d.unknown ? esc(d.name) : "Delivery") + "</span><span id='delivFee'>" + feeTxt + "</span></div>" +
      "<div class='grand'><span>Total incl. GST</span><span id='grandTotal'>" + money(grand) + (d && d.unknown ? " + delivery" : "") + "</span></div></div>" +
      (opts.button || "") +
      "<p class='hint' style='margin-top:12px'>Delivery is free within Toowoomba. Some outer areas have a delivery fee, shown once you enter the delivery address.</p></aside>";
  }

  // ---- STEP 1: Cart ----
  function renderCart(c) {
    var inCart = {}; c.forEach(function (i) { inCart[i.id] = 1; });
    var strip = "<div class='panel xstrip'><h3>Add something extra?</h3><p class='hint'>Chocolates, a balloon, a plush toy or wine, delivered with your flowers.</p><div class='xscroll'><button type='button' class='xarrow xprev' aria-label='Previous extras'>‹</button><div class='xgrid'>" +
      X.map(function (x) { return extraCard(x, inCart[x.id]); }).join("") + "</div><button type='button' class='xarrow xnext' aria-label='More extras'>›</button></div><div class='xdots'></div></div>";
    var lines = c.map(function (i, k) {
      return "<div class='line'><span class='art'><img src='" + root + "images/" + esc(i.img) + "' alt='' onerror='this.remove()'></span>" +
        "<div><h4>" + esc(i.name) + "</h4><div style='margin-top:6px'><span class='qty'><button type='button' data-l='" + k + "' data-d='-1' aria-label='Less'>−</button><input value='" + i.qty + "' readonly aria-label='Quantity'><button type='button' data-l='" + k + "' data-d='1' aria-label='More'>+</button></span>" +
        "<button type='button' class='rm' data-rm='" + k + "'>Remove</button></div></div><b>" + money(i.price * i.qty) + "</b></div>";
    }).join("");
    var ok = hasFlowers(c);
    var btn = "<button class='btn btn-primary wide' type='button' id='toDetails'" + (ok ? "" : " disabled") + ">Continue to delivery →</button>";
    app.innerHTML = stepper(0) + "<div class='checkout'>" +
      (ok ? "" : "<div class='panel needflowers'><h3>Extras need a flower order</h3><p>Add-on extras can only be sent together with flowers, a plant or a hamper. Choose something to go with them and you're all set.</p><a class='btn btn-primary' href='" + root + "bouquets.html'>Shop flowers</a></div>") +
      "<div class='checkout-main'><div class='panel'><h3>Your cart</h3>" + lines + "</div>" + strip + "</div>" +
      summary(c, { step: "cart", button: btn }) + "</div>";
    var b = document.getElementById("toDetails"); if (b) b.onclick = function () { go("details"); };
    setupScroller();
  }

  // ---- STEP 2: Delivery & details ----
  function renderDetails(c) {
    var e = earliest();
    app.innerHTML = stepper(1) + "<div class='checkout'><div class='checkout-main'><form class='order' id='orderForm' novalidate>" +
      "<div class='panel'><fieldset><legend>Delivery</legend><div class='fields'>" +
      "<div><label for='dd'>Delivery date</label><input id='dd' type='date' name='delivery_date' required min='" + iso(e) + "' value='" + iso(e) + "'><div class='hint'>Same day if ordered by 2pm Mon–Fri. For Saturday, please call.</div></div>" +
      "<div><label for='rn'>Recipient's name</label><input id='rn' name='recipient_name' required></div>" +
      "<div class='full addr-wrap'><label for='ad'>Delivery address</label><input id='ad' name='address' required autocomplete='off' placeholder='Start typing the street address'><div class='addr-sugg' id='addrSugg' role='listbox' hidden></div><div class='hint'>Pick the address from the list if it appears. Add a unit, ward or room number in the notes below.</div></div>" +
      "<div><label for='sb'>Suburb / town</label><input id='sb' name='suburb' required list='suburbList' autocomplete='off'><datalist id='suburbList'>" + allSuburbs.map(function (x) { return "<option value='" + esc(x) + "'>"; }).join("") + "</datalist></div>" +
      "<div><label for='pc'>Postcode</label><input id='pc' name='postcode' required inputmode='numeric' pattern='[0-9]{4}' maxlength='4' placeholder='4350'></div>" +
      "<div class='full' id='delivInfo' aria-live='polite'></div>" +
      "<div><label for='rp'>Recipient's phone</label><input id='rp' name='recipient_phone' type='tel' required placeholder='So we can reach them for delivery'></div>" +
      "</div></fieldset></div>" +
      "<div class='panel'><fieldset><legend>Card message</legend><textarea name='card_message' rows='3' maxlength='300' aria-label='Card message' placeholder='Happy birthday Mum, love from all of us'></textarea></fieldset></div>" +
      "<div class='panel'><fieldset><legend>Your details</legend><div class='fields'>" +
      "<div><label for='sn'>Your name</label><input id='sn' name='sender_name' required autocomplete='name'></div>" +
      "<div><label for='sp'>Your phone</label><input id='sp' name='sender_phone' type='tel' required autocomplete='tel'></div>" +
      "<div class='full'><label for='em'>Your email</label><input id='em' name='email' type='email' required autocomplete='email'></div>" +
      "<div class='full'><label for='nt'>Anything else? (optional)</label><textarea id='nt' name='notes' rows='2' placeholder='Colour preferences, delivery instructions'></textarea></div>" +
      "</div></fieldset></div>" +
      "<div class='step-nav'><a href='#cart' class='btn btn-ghost'>← Back to cart</a><button class='btn btn-primary' type='submit' id='toPayment'>Continue to payment →</button></div>" +
      "</form></div>" + summary(c, { step: "details" }) + "</div>";
    var form = document.getElementById("orderForm");
    Object.keys(draft).forEach(function (k) { if (k[0] !== "_" && form.elements[k] && draft[k]) form.elements[k].value = draft[k]; });
    form.addEventListener("input", function (ev) { if (ev.target.name) { draft[ev.target.name] = ev.target.value; saveDraft(); } });
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (!form.reportValidity()) return;
      var b = document.getElementById("toPayment"); b.disabled = true; b.textContent = "Checking address…";
      new FormData(form).forEach(function (v, k) { draft[k] = v; });
      Promise.resolve(lookUp()).then(function () { saveDraft(); go("payment"); });
    });
    setupAddress();
    updateDelivery();
    if (!loc) lookUp();
  }

  function fields() {
    function v(id, k) { var el = document.getElementById(id); return el ? el.value.trim() : (draft[k] || ""); }
    return { street: v("ad", "address"), suburb: v("sb", "suburb"), postcode: v("pc", "postcode") };
  }

  // Look the typed address up on the map (once street + suburb are filled)
  function lookUp() {
    var f = fields(), key = [f.street, f.suburb, f.postcode].join("|").toLowerCase();
    if (!f.street || !f.suburb || key === locKey) return locating || Promise.resolve(loc);
    locKey = key; loc = null; saveDraft(); updateDelivery(true);
    var p = locating = DV.locate(f.street, f.suburb, f.postcode).then(function (r) {
      if (p !== locating) return loc;
      locating = null;
      if (r) loc = { lat: r.lat, lng: r.lng, exact: r.exact };
      saveDraft(); updateDelivery();
      return loc;
    });
    return p;
  }

  function setupAddress() {
    var ad = document.getElementById("ad"), box = document.getElementById("addrSugg"), timer, items = [], active = -1;
    function close() { box.hidden = true; active = -1; }
    function show(list) {
      items = list;
      if (!list.length) return close();
      box.innerHTML = list.map(function (x, i) { return "<button type='button' role='option' data-i='" + i + "'>" + esc(x.label) + "</button>"; }).join("");
      box.hidden = false;
    }
    function pick(x) {
      // Street-only suggestion: keep the house/unit number already typed (e.g. "12", "3/45", "Unit 2, 14")
      var typed = ad.value.trim(), num = "";
      var m = typed.match(/^(?:(?:unit|u|lot|shop|suite|level)\b\.?[\s,]*|[^\s,]*\d[^\s,]*[\s,]+)+/i);
      if (m) num = typed.slice(0, m[0].length).replace(/[\s,]+$/, "");
      var street = x.street || "";
      if (!x.exact && num && street && street.toLowerCase().indexOf(num.toLowerCase()) !== 0) street = num + " " + street;
      ad.value = street || ad.value;
      if (x.suburb) document.getElementById("sb").value = x.suburb;
      if (x.postcode) document.getElementById("pc").value = x.postcode;
      draft.address = ad.value; draft.suburb = document.getElementById("sb").value; draft.postcode = document.getElementById("pc").value;
      loc = { lat: x.lat, lng: x.lng, exact: x.exact };
      var f = fields(); locKey = [f.street, f.suburb, f.postcode].join("|").toLowerCase(); locating = null;
      saveDraft(); close(); updateDelivery();
      if (!x.exact && num) {
        var key = locKey;
        DV.locate(f.street, f.suburb, f.postcode).then(function (r) {
          if (r && r.exact && key === locKey) { loc = { lat: r.lat, lng: r.lng, exact: true }; saveDraft(); updateDelivery(); }
        });
      }
    }
    ad.addEventListener("input", function () {
      clearTimeout(timer);
      var q = ad.value.trim();
      timer = setTimeout(function () { DV.suggest(q).then(function (l) { if (ad.value.trim() === q) show(l); }); }, 300);
    });
    ad.addEventListener("keydown", function (e) {
      if (box.hidden) return;
      var btns = box.querySelectorAll("button");
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); active = (active + (e.key === "ArrowDown" ? 1 : -1) + btns.length) % btns.length; btns.forEach(function (b, i) { b.classList.toggle("on", i === active); }); }
      else if (e.key === "Enter" && active > -1) { e.preventDefault(); pick(items[active]); }
      else if (e.key === "Escape") close();
    });
    box.addEventListener("mousedown", function (e) { var b = e.target.closest("button"); if (b) { e.preventDefault(); pick(items[+b.dataset.i]); } });
    document.addEventListener("click", function (e) { if (!e.target.closest(".addr-wrap")) close(); });
    ["ad", "sb", "pc"].forEach(function (id) {
      var el = document.getElementById(id);
      el.addEventListener("input", function () { if (loc || locating) { loc = null; locating = null; locKey = ""; saveDraft(); } updateDelivery(); });
      el.addEventListener("change", function () { setTimeout(lookUp, 150); });
    });
  }

  function updateDelivery(checking) {
    var info = document.getElementById("delivInfo"); if (!info) return null;
    var c = load(), sub = total(c), f = fields();
    var d = (f.street || f.suburb) ? DV.match(loc, f.suburb) : null;
    var label = document.getElementById("delivLabel"), fee = document.getElementById("delivFee"), dateEl = document.getElementById("dd"), base = earliest();
    if (checking === true || (locating && !loc)) {
      info.innerHTML = "<div class='deliv deliv-checking'><b>Checking the delivery address…</b></div>";
      label.textContent = "Delivery"; fee.textContent = "Checking…"; d = null;
    } else if (!d || !f.suburb) { info.innerHTML = ""; label.textContent = "Delivery"; fee.textContent = "Enter address"; d = null; }
    else {
      var cls = d.unknown ? "unknown" : d.fee > 0 ? d.type : "free";
      info.innerHTML = "<div class='deliv deliv-" + cls + "'><b>" + esc(d.name) + (d.unknown ? "" : (d.fee > 0 ? " · " + money(d.fee) : " · Free")) + "</b><span>" + esc(d.note || "") + "</span></div>";
      label.textContent = d.unknown ? "Delivery" : d.name;
      fee.textContent = d.unknown ? "To be confirmed" : d.fee > 0 ? money(d.fee) : "Free";
    }
    var min = (d && d.sameDay === false) ? nextBusinessDay(base) : base;   // courier zones can't be same-day
    dateEl.min = iso(min);
    if (dateEl.value && dateEl.value < dateEl.min) { dateEl.value = dateEl.min; draft.delivery_date = dateEl.value; saveDraft(); }
    document.getElementById("grandTotal").textContent = money(sub + (d && !d.unknown ? d.fee : 0)) + (d && d.unknown ? " + delivery" : "");
    return d;
  }

  // ---- STEP 3: Payment ----
  function renderPayment(c) {
    var d = currentDelivery() || { unknown: true, name: UNKNOWN.name, fee: 0 };
    var grand = total(c) + (d.unknown ? 0 : d.fee);
    var methods = payMethods(), chosen = draft.payment_method && methods.some(function (m) { return m.id === draft.payment_method; }) ? draft.payment_method : methods[0].id;
    var rev = function (title, body) { return "<div class='rev'><div class='rev-head'><h4>" + title + "</h4><a href='#details'>Edit</a></div>" + body + "</div>"; };
    app.innerHTML = stepper(2) + "<div class='checkout'><div class='checkout-main'><form class='order' id='payForm'>" +
      "<div class='panel'><h3>Check your order</h3>" +
      rev("Delivering to", "<p><b>" + esc(draft.recipient_name) + "</b><br>" + esc(draft.address) + "<br>" + esc(draft.suburb) + " QLD " + esc(draft.postcode) + "<br>" + esc(draft.recipient_phone) + "</p>") +
      rev("Delivery", "<p>" + esc(nice(draft.delivery_date)) + "<br>" + esc(d.name) + " · " + (d.unknown ? "cost to be confirmed" : d.fee > 0 ? money(d.fee) : "Free") + "</p>") +
      rev("Card message", "<p>" + (draft.card_message ? esc(draft.card_message).replace(/\n/g, "<br>") : "<span class='muted'>No card message</span>") + "</p>") +
      rev("Your details", "<p>" + esc(draft.sender_name) + "<br>" + esc(draft.sender_phone) + "<br>" + esc(draft.email) + (draft.notes ? "<br><span class='muted'>Note: " + esc(draft.notes) + "</span>" : "") + "</p>") +
      "</div>" +
      "<div class='panel'><h3>Payment</h3><div class='paylist'>" + methods.map(function (m) {
        return "<label class='payopt'><input type='radio' name='payment_method' value='" + m.id + "'" + (m.id === chosen ? " checked" : "") + "><span><b>" + m.label + "</b><small>" + m.desc + "</small></span></label>";
      }).join("") + "</div>" +
      "<label class='agree'><input type='checkbox' id='agree' required> I agree to the <a href='" + root + "terms.html' target='_blank'>Terms &amp; Conditions</a></label></div>" +
      "<div class='step-nav'><a href='#details' class='btn btn-ghost'>← Back</a><button class='btn btn-primary' type='submit' id='placeBtn'>Place order · " + money(grand) + (d.unknown ? " + delivery" : "") + "</button></div>" +
      "</form></div>" + summary(c, { step: "payment" }) + "</div>";
    var form = document.getElementById("payForm");
    form.addEventListener("change", function (e) { if (e.target.name === "payment_method") { draft.payment_method = e.target.value; saveDraft(); } });
    form.addEventListener("submit", function (ev) { ev.preventDefault(); if (form.reportValidity()) placeOrder(form); });
  }

  function orderNumber() {
    var n = brisNow();
    return "SF" + String(n.getFullYear()).slice(2) + String(n.getMonth() + 1).padStart(2, "0") + String(n.getDate()).padStart(2, "0") + "-" + String(Math.floor(1000 + Math.random() * 9000));
  }

  function placeOrder(form) {
    var c = load(); if (!hasFlowers(c)) return go("cart");
    var d = currentDelivery() || { unknown: true, name: UNKNOWN.name, fee: 0, how: "none" };
    var method = (form.elements.payment_method || {}).value || "phone";
    var sub = total(c), fee = d.unknown ? 0 : d.fee, grand = sub + fee;
    var now = brisNow();
    var order = {
      number: orderNumber(),
      placed: now.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" }) + ", " + now.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" }),
      items: c.map(function (i) { return { name: i.name, qty: i.qty, price: i.price, extra: !!i.extra, img: i.img }; }),
      delivery: { date: draft.delivery_date, zone: d.name, unknown: !!d.unknown, fee: fee, how: d.how },
      recipient: { name: draft.recipient_name, address: draft.address, suburb: draft.suburb, postcode: draft.postcode, phone: draft.recipient_phone },
      card: draft.card_message || "",
      sender: { name: draft.sender_name, phone: draft.sender_phone, email: draft.email },
      notes: draft.notes || "",
      payment: method,
      subtotal: sub, total: grand, gst: grand / 11,
      preview: PREVIEW && !S.orderEndpoint
    };
    // What the shop receives by email
    var data = {
      order_number: order.number,
      placed: order.placed,
      payment: method === "card" ? "Paying online by card (check payment received)" : "PAY BY PHONE: call the customer to take payment",
      delivery_date: nice(order.delivery.date),
      recipient_name: order.recipient.name,
      address: order.recipient.address + ", " + order.recipient.suburb + " QLD " + order.recipient.postcode,
      recipient_phone: order.recipient.phone,
      card_message: order.card || "(none)",
      items: order.items.filter(function (i) { return !i.extra; }).map(function (i) { return i.qty + " x " + i.name + " (" + money(i.price * i.qty) + ")"; }).join("\n"),
      extras: order.items.filter(function (i) { return i.extra; }).map(function (i) { return i.qty + " x " + i.name + " (" + money(i.price * i.qty) + ")"; }).join("\n") || "(none)",
      delivery: d.unknown ? "TO BE CONFIRMED: not in a listed delivery area" : d.name + " (" + (fee > 0 ? money(fee) : "free") + ")",
      delivery_matched_by: d.how === "area" ? "address is inside the " + d.name + " area on the map" : d.how === "suburb" ? "suburb name (" + order.recipient.suburb + ")" + (loc ? "" : ", address not found on the map") : "no match, please check",
      subtotal: money(sub),
      total: money(grand) + (d.unknown ? " + delivery (to be confirmed)" : ""),
      sender_name: order.sender.name, sender_phone: order.sender.phone, email: order.sender.email,
      notes: order.notes || "(none)",
      _subject: "Order " + order.number + " for " + order.recipient.name + " (" + nice(order.delivery.date) + ")",
      _replyto: order.sender.email
    };
    if (loc) data.delivery_map = "https://www.google.com/maps/search/?api=1&query=" + loc.lat.toFixed(6) + "," + loc.lng.toFixed(6);

    function finish() {
      sset("sf-last-order", order);
      save([]); draft = {}; loc = null; locKey = ""; try { sessionStorage.removeItem("sf-draft"); } catch (e) {}
      go("confirmation");
    }
    if (!S.orderEndpoint) {
      if (order.preview) return finish();
      app.innerHTML = stepper(2) + "<div class='done'><h2>Online ordering isn't switched on yet</h2><p style='color:var(--muted);margin:12px 0 24px'>Please call us on <a href='" + telHref + "'>" + esc(S.phone) + "</a> and we'll take your order over the phone.</p><a class='btn btn-ghost' href='#payment'>← Back</a></div>";
      return;
    }
    var btn = document.getElementById("placeBtn"); btn.disabled = true; btn.textContent = "Placing your order…";
    fetch(S.orderEndpoint, { method: "POST", headers: { "Accept": "application/json", "Content-Type": "application/json" }, body: JSON.stringify(data) })
      .then(function (r) { if (!r.ok) throw new Error("send failed"); finish(); })
      .catch(function () {
        btn.disabled = false; btn.textContent = "Try again";
        alert("Sorry, your order didn't go through. Please try again or call " + S.phone + ".");
      });
  }

  // ---- STEP 4: Confirmation ----
  function renderConfirmation(o) {
    var flowers = o.items.filter(function (i) { return !i.extra; }), extras = o.items.filter(function (i) { return i.extra; });
    var row = function (i) { return "<tr><td>" + esc(i.name) + (i.qty > 1 ? " × " + i.qty : "") + "</td><td>" + money(i.price * i.qty) + "</td></tr>"; };
    var next = o.payment === "card"
      ? "<li><b>Complete your payment</b> using the button below. Please include your order number <b>" + o.number + "</b>.</li><li>We'll prepare your order once payment is received.</li>"
      : "<li><b>We'll call you</b> on " + esc(o.sender.phone) + " to confirm your order and take payment.</li><li>We'll then prepare your flowers fresh for delivery.</li>";
    if (o.delivery.unknown) next += "<li>Your address is outside our listed areas, so we'll confirm delivery options and any cost when we call.</li>";
    next += "<li>Delivery on <b>" + esc(nice(o.delivery.date)) + "</b>.</li>";
    app.innerHTML = stepper(3) +
      (o.preview ? "<div class='notice' style='margin-top:24px'>Preview only. This order was not sent to the shop. Online ordering isn't switched on yet.</div>" : "") +
      "<div class='confirm'>" +
      "<div class='confirm-head'><div class='tick'>✓</div><span class='eyebrow'>Thank you, " + esc(o.sender.name.split(" ")[0]) + "</span><h2>Your order has been placed</h2>" +
      "<div class='ordno'><small>Order number</small><b>" + o.number + "</b></div><p class='muted'>Placed " + esc(o.placed) + ". Please keep your order number for reference.</p></div>" +
      "<div class='panel'><h3>What happens next</h3><ol class='nextsteps'>" + next + "</ol>" +
      (o.payment === "card" && S.paymentLink ? "<a class='btn btn-primary' href='" + esc(S.paymentLink) + "' target='_blank' rel='noopener'>Complete payment · " + money(o.total) + "</a>" : "") + "</div>" +
      "<div class='confirm-grid'>" +
      "<div class='panel'><h3>Delivery</h3><p><b>" + esc(o.recipient.name) + "</b><br>" + esc(o.recipient.address) + "<br>" + esc(o.recipient.suburb) + " QLD " + esc(o.recipient.postcode) + "<br>" + esc(o.recipient.phone) + "</p><p>" + esc(nice(o.delivery.date)) + "<br>" + esc(o.delivery.zone) + "</p>" +
      "<h4 style='margin-top:14px'>Card message</h4><p>" + (o.card ? esc(o.card).replace(/\n/g, "<br>") : "<span class='muted'>No card message</span>") + "</p></div>" +
      "<div class='panel'><h3>Order details</h3><table class='otable'>" + flowers.map(row).join("") + (extras.length ? "<tr class='sub'><td colspan='2'>Extras</td></tr>" + extras.map(row).join("") : "") +
      "<tr class='tot'><td>Subtotal</td><td>" + money(o.subtotal) + "</td></tr>" +
      "<tr><td>" + (o.delivery.unknown ? "Delivery" : esc(o.delivery.zone)) + "</td><td>" + (o.delivery.unknown ? "To be confirmed" : o.delivery.fee > 0 ? money(o.delivery.fee) : "Free") + "</td></tr>" +
      "<tr class='grand'><td>Total</td><td>" + money(o.total) + (o.delivery.unknown ? " + delivery" : "") + "</td></tr>" +
      "<tr class='gst'><td>Includes GST of</td><td>" + money(o.gst) + "</td></tr></table>" +
      "<p class='muted' style='margin-top:12px'>Payment: " + (o.payment === "card" ? "online by card" : "over the phone") + "<br>Ordered by " + esc(o.sender.name) + " · " + esc(o.sender.email) + "</p></div>" +
      "</div>" +
      "<div class='step-nav no-print'><button type='button' class='btn btn-ghost' onclick='window.print()'>Print or save</button><a class='btn btn-primary' href='" + root + "index.html'>Continue shopping</a></div>" +
      "<p class='muted' style='text-align:center;margin-top:18px'>Questions about your order? Call <a href='" + telHref + "'>" + esc(S.phone) + "</a> and quote " + o.number + ".</p>" +
      "</div>";
  }

  // ---- Router ----
  function render() {
    var step = (location.hash || "#cart").slice(1), c = load();
    if (step === "confirmation") { var o = sget("sf-last-order"); if (o) return renderConfirmation(o); step = "cart"; }
    if (!c.length) {
      app.innerHTML = "<div class='empty'><h2>Your cart is empty</h2><p style='color:var(--muted);margin:10px 0 24px'>Have a look through our flowers and gifts.</p><a class='btn btn-primary' href='" + root + "bouquets.html'>Shop flowers</a></div>";
      return;
    }
    if ((step === "details" || step === "payment") && !hasFlowers(c)) step = "cart";
    if (step === "payment" && !detailsDone()) step = "details";
    if (step === "details") return renderDetails(c);
    if (step === "payment") return renderPayment(c);
    renderCart(c);
  }

  // Arrows + dots so it's obvious there are more extras to see
  function setupScroller() {
    var wrap = app.querySelector(".xscroll"); if (!wrap) return;
    var g = wrap.querySelector(".xgrid"), prev = wrap.querySelector(".xprev"), next = wrap.querySelector(".xnext");
    var dots = app.querySelector(".xdots");
    function step() { var c = g.querySelector(".xcard"); return c ? (c.offsetWidth + 10) * 2 : 260; }
    function update() {
      var max = g.scrollWidth - g.clientWidth, scrollable = max > 4;
      wrap.classList.toggle("can-scroll", scrollable);
      prev.hidden = !scrollable || g.scrollLeft <= 4;
      next.hidden = !scrollable || g.scrollLeft >= max - 4;
      wrap.classList.toggle("at-end", g.scrollLeft >= max - 4);
      if (dots) {
        var pages = scrollable ? Math.ceil(g.scrollWidth / g.clientWidth) : 0;
        var cur = scrollable ? Math.round(g.scrollLeft / max * (pages - 1)) : 0;
        dots.innerHTML = pages > 1 ? Array.from({ length: pages }, function (_, i) { return "<span" + (i === cur ? " class='on'" : "") + "></span>"; }).join("") : "";
      }
    }
    prev.onclick = function () { g.scrollBy({ left: -step(), behavior: "smooth" }); };
    next.onclick = function () { g.scrollBy({ left: step(), behavior: "smooth" }); };
    g.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  app.addEventListener("click", function (e) {
    var b = e.target.closest("[data-l],[data-rm]");
    if (!b) return;
    var c = load();
    if (b.dataset.rm != null) c.splice(+b.dataset.rm, 1);
    else { var i = c[+b.dataset.l]; i.qty = Math.max(1, i.qty + (+b.dataset.d)); }
    save(c); render();
  });

  render();
})();
