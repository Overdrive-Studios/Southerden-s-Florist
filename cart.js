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

  function slugify(t) { return String(t).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function itemLabel(i) { return i.name + (i.opts ? " (" + i.opts + ")" : ""); }
  function addItem(p, n) {
    var c = load(), ex = c.find(function (x) { return x.id === p.id; });
    if (ex) ex.qty += n; else { p.qty = n; c.push(p); }
    save(c); toast(itemLabel(p));
    if (app) render();
  }

  // ---- Product options: size, colour, occasion (data in product-options.js) ----
  var PO = window.PRODUCT_OPTIONS || {};
  var mainBtn = document.querySelector("[data-add]:not([data-extra])");
  var prodData = mainBtn ? JSON.parse(mainBtn.dataset.add) : null;
  var prodOpts = prodData ? PO[prodData.id] : null;
  if (prodOpts && prodOpts.options.length) {
    var box = document.createElement("div");
    box.className = "popts";
    box.innerHTML = prodOpts.options.map(function (g, gi) {
      return "<label><span class='pick-label'>" + esc(g.label) + " <em>" + g.choices.length + " options</em></span><select data-popt='" + gi + "' class='pick'>" + g.choices.map(function (ch, ci) {
        return "<option value='" + ci + "'>" + esc(ch[0]) + (ch[1] ? " (+" + money(ch[1]).replace(".00", "") + ")" : "") + "</option>";
      }).join("") + "</select></label>";
    }).join("");
    var actions = document.querySelector(".product .actions");
    actions.parentNode.insertBefore(box, actions);
    box.addEventListener("change", showPrice);
  }
  function chosenOptions() {
    if (!prodOpts) return { add: 0, text: "" };
    var add = 0, parts = [];
    document.querySelectorAll("[data-popt]").forEach(function (sel) {
      var g = prodOpts.options[+sel.dataset.popt], ch = g.choices[+sel.value];
      add += +ch[1] || 0; parts.push(g.label + ": " + ch[0]);
    });
    return { add: add, text: parts.join(", ") };
  }
  function showPrice() {
    var bp = document.querySelector(".product .bigprice"); if (!bp || !prodData) return;
    var o = chosenOptions();
    bp.firstChild.textContent = (prodOpts && prodOpts.options.length ? "" : "From ") + money(prodData.price + o.add).replace(".00", "") + " ";
  }
  if (prodOpts && prodOpts.options.length) showPrice();
  if (prodOpts && prodOpts.extras === false) document.querySelectorAll("[data-extras-strip]").forEach(function (el) { el.remove(); });

  // ---- Extra product photos (data in product-photos.js) ----
  var gal = prodData && (window.PRODUCT_PHOTOS || {})[prodData.id];
  var mainPhoto = document.querySelector(".product .photo");
  if (gal && gal.length && mainPhoto) {
    var mainImg = mainPhoto.querySelector("img");
    var all = [prodData.img].concat(gal);
    var strip = document.createElement("div");
    strip.className = "thumbs";
    strip.innerHTML = all.map(function (f, i) {
      return "<button type='button' class='thumb" + (i ? "" : " on") + "' data-photo='" + esc(f) + "' aria-label='Photo " + (i + 1) + "'><img src='" + root + "images/" + esc(f) + "' alt='' loading='lazy' onerror='this.parentNode.remove()'></button>";
    }).join("");
    mainPhoto.parentNode.insertBefore(strip, mainPhoto.nextSibling);
    var wrap = document.createElement("div"); wrap.className = "photo-col";
    mainPhoto.parentNode.insertBefore(wrap, mainPhoto); wrap.appendChild(mainPhoto); wrap.appendChild(strip);
    strip.addEventListener("click", function (e) {
      var t = e.target.closest("[data-photo]"); if (!t || !mainImg) return;
      mainImg.src = root + "images/" + t.dataset.photo;
      strip.querySelectorAll(".thumb").forEach(function (b) { b.classList.toggle("on", b === t); });
    });
  }

  // ---- Clicks: quantity, add product, add extra ----
  document.addEventListener("click", function (e) {
    var q = e.target.closest("[data-qty]");
    if (q) { var inp = document.getElementById("qty"); inp.value = Math.max(1, (+inp.value || 1) + (+q.dataset.qty)); return; }
    var xb = e.target.closest("[data-extra-id]");
    if (xb) {
      var x = X.find(function (z) { return z.id === xb.dataset.extraId; }), card = xb.closest(".xcard");
      var ch = x.pick.choices[+card.querySelector("[data-xpick]").value];
      var c2 = card.querySelector("[data-xpick2]"), second = c2 ? x.pick2.choices[+c2.value] : "";
      addItem({ id: x.id + "-" + slugify(ch[0]) + (second ? "-" + slugify(second) : ""), name: x.name, opts: ch[0] + (second ? ", " + second : ""), price: ch[1], img: ch[2] || x.img, extra: true }, 1);
      xb.textContent = "Added ✓"; setTimeout(function () { xb.textContent = "+ Add"; }, 1800);
      return;
    }
    var a = e.target.closest("[data-add]");
    if (!a) return;
    var p = JSON.parse(a.dataset.add);
    if (a.hasAttribute("data-extra")) { p.extra = true; return addItem(p, 1); }   // old-style extra buttons
    var n = Math.max(1, +((document.getElementById("qty") || {}).value) || 1);
    var o = chosenOptions();
    if (o.text) { p.opts = o.text; p.price = p.price + o.add; p.id += "|" + slugify(o.text); }
    addItem(p, n);
  });

  // ---- Extras cards (product pages, cart and the Add-On Extras page) ----
  var X = window.EXTRAS || [];
  function extraCard(x, inCart) {
    var first = x.pick.choices[0];
    return "<div class='xcard'><span class='art'><img src='" + root + "images/" + esc(first[2] || x.img) + "' alt='' loading='lazy' onerror='this.remove()'></span>" +
      "<div class='xbody'><b>" + esc(x.name) + "</b><span class='xprice'>" + money(first[1]) + "</span>" +
      "<span class='pick-label'>Choose " + esc(x.pick.label.toLowerCase()) + " <em>" + x.pick.choices.length + " options</em></span>" +
      "<select data-xpick class='pick' aria-label='" + esc(x.pick.label) + "'>" + x.pick.choices.map(function (ch, i) {
        var same = x.pick.choices.every(function (c) { return c[1] === first[1]; });
        return "<option value='" + i + "'>" + esc(ch[0]) + (same ? "" : " · " + money(ch[1]).replace(".00", "")) + "</option>";
      }).join("") + "</select>" +
      (x.pick2 ? "<span class='pick-label'>Choose " + esc(x.pick2.label.toLowerCase()) + " <em>" + x.pick2.choices.length + " options</em></span><select data-xpick2 class='pick' aria-label='" + esc(x.pick2.label) + "'>" + x.pick2.choices.map(function (c, i) { return "<option value='" + i + "'>" + esc(c) + "</option>"; }).join("") + "</select>" : "") +
      "</div><button type='button' class='xadd' data-extra-id='" + esc(x.id) + "'>" + (inCart ? "Add another" : "+ Add") + "</button></div>";
  }
  document.addEventListener("change", function (e) {
    var sel = e.target.closest("[data-xpick]"); if (!sel) return;
    var card = sel.closest(".xcard"), x = X.find(function (z) { return z.id === card.querySelector("[data-extra-id]").dataset.extraId; });
    var ch = x.pick.choices[+sel.value];
    card.querySelector(".xprice").textContent = money(ch[1]);
    var img = card.querySelector("img"); if (img && (ch[2] || x.img)) img.src = root + "images/" + (ch[2] || x.img);
  });
  document.querySelectorAll("[data-extras-strip]").forEach(function (el) {
    el.innerHTML = "<h3>Add an extra</h3><p class='hint'>Make it extra special. Extras are delivered with your flowers.</p><div class='xgrid'>" + X.map(function (x) { return extraCard(x); }).join("") + "</div>";
  });
  document.querySelectorAll("[data-extras-page]").forEach(function (el) {
    el.innerHTML = X.map(function (x) { return extraCard(x).replace("</span><select data-xpick", "</span><p class='xdesc'>" + esc(x.desc || "") + "</p><select data-xpick"); }).join("");
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
  function earliest(cutoff) {
    var now = brisNow(), d = new Date(now);
    if (now.getHours() >= (cutoff || S.cutoffHour || 14)) d.setDate(d.getDate() + 1);
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
      return "<div class='sline'><span class='art'><img src='" + root + "images/" + esc(i.img) + "' alt='' onerror='this.remove()'></span><span>" + esc(i.name) + (i.qty > 1 ? " <small>× " + i.qty + "</small>" : "") + (i.opts ? "<br><small>" + esc(i.opts) + "</small>" : "") + "</span><b>" + money(i.price * i.qty) + "</b></div>";
    }).join("");
    var feeTxt = !d ? (opts.step === "cart" ? "Calculated next" : "Enter address") : d.unknown ? "To be confirmed" : d.fee > 0 ? money(d.fee) : "Included";
    var grand = sub + (d && !d.unknown ? d.fee : 0);
    return "<aside class='panel summary'><h3>Order summary</h3>" + (opts.step === "cart" ? "" : lines) +
      "<div class='totals'><div><span>Subtotal</span><span>" + money(sub) + "</span></div>" +
      "<div><span id='delivLabel'>" + (d && !d.unknown ? esc(d.name) : "Delivery") + "</span><span id='delivFee'>" + feeTxt + "</span></div>" +
      "<div class='grand'><span>Total incl. GST</span><span id='grandTotal'>" + money(grand) + (d && d.unknown ? " + delivery" : "") + "</span></div></div>" +
      (opts.button || "") +
      "<p class='hint' style='margin-top:12px'>Delivery is included in the Toowoomba area. Some outer areas have a small fee. <a href='delivery.html#fees' target='_blank'>See delivery prices</a></p></aside>";
  }

  // ---- STEP 1: Cart ----
  function renderCart(c) {
    var inCart = {}; c.forEach(function (i) { inCart[i.id] = 1; });
    var strip = "<div class='panel xstrip'><h3>Add something extra?</h3><p class='hint'>Chocolates, a balloon, a plush toy or wine, delivered with your flowers.</p><div class='xscroll'><button type='button' class='xarrow xprev' aria-label='Previous extras'>‹</button><div class='xgrid'>" +
      X.map(function (x) { return extraCard(x, inCart[x.id]); }).join("") + "</div><button type='button' class='xarrow xnext' aria-label='More extras'>›</button></div><div class='xdots'></div></div>";
    var lines = c.map(function (i, k) {
      return "<div class='line'><span class='art'><img src='" + root + "images/" + esc(i.img) + "' alt='' onerror='this.remove()'></span>" +
        "<div><h4>" + esc(i.name) + "</h4>" + (i.opts ? "<small class='lopts'>" + esc(i.opts) + "</small>" : "") + "<div style='margin-top:6px'><span class='qty'><button type='button' data-l='" + k + "' data-d='-1' aria-label='Less'>−</button><input value='" + i.qty + "' readonly aria-label='Quantity'><button type='button' data-l='" + k + "' data-d='1' aria-label='More'>+</button></span>" +
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
  var PLACES = [
    ["home", "Home", "Unit, flat or building", false, "e.g. Unit 4 or Flat 2"],
    ["work", "Workplace", "Business name", true, "e.g. Toowoomba Dental"],
    ["hospital", "Hospital or care home", "Hospital or home, ward and room", true, "e.g. St Vincent's, Ward 3, Room 12"],
    ["funeral", "Funeral or church", "Funeral home or church, and service time", true, "e.g. Toowoomba Funerals, 11am service"]
  ];
  var CARD_IDEAS = ["Happy birthday!", "Thinking of you", "Congratulations!", "Get well soon", "With deepest sympathy", "Happy anniversary", "Thank you", "Love you"];
  var ICON = {
    who: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><circle cx='12' cy='8' r='4'/><path d='M4 21c0-4 4-6 8-6s8 2 8 6'/></svg>",
    where: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M12 21s-7-6.2-7-11a7 7 0 0114 0c0 4.8-7 11-7 11z'/><circle cx='12' cy='10' r='2.5'/></svg>",
    when: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><rect x='3' y='5' width='18' height='16' rx='2'/><path d='M3 10h18M8 3v4M16 3v4'/></svg>",
    card: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><rect x='3' y='5' width='18' height='14' rx='2'/><path d='M3 7l9 6 9-6'/></svg>",
    you: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'><path d='M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.7a2 2 0 01-.5 2.1L8 9.8a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.7.7a2 2 0 011.7 2z'/></svg>",
    search: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.2'><circle cx='11' cy='11' r='7'/><path d='M20 20l-3.5-3.5'/></svg>"
  };
  function sec(n, icon, title, sub, body) {
    return "<section class='panel dsec'><div class='dsec-head'><span class='dnum'>" + ICON[icon] + "</span><div><small>Step " + n + " of 5</small><h3>" + title + "</h3>" + (sub ? "<p>" + sub + "</p>" : "") + "</div></div>" + body + "</section>";
  }
  function fld(id, name, label, attrs, cls) {
    return "<div class='f " + (cls || "") + "'><label for='" + id + "'>" + label + "</label><input id='" + id + "' name='" + name + "' " + (attrs || "") + "><span class='ferr'></span></div>";
  }

  function feeList() {
    var by = {};
    (window.DELIVERY_ZONES || []).forEach(function (z) { if (z.fee && z.suburbs) (by[z.fee] = by[z.fee] || []).push.apply(by[z.fee], z.suburbs); });
    var rows = Object.keys(by).sort(function (a, b) { return a - b; }).map(function (f) { return "<li><b>$" + f + "</b><span>" + by[f].sort().join(", ") + "</span></li>"; }).join("");
    return "<details class='fee-peek'><summary>Delivery prices for outer areas</summary><ul><li class='inc'><b>Included</b><span>All Toowoomba suburbs, Highfields, Ballard, Blue Mountain Heights</span></li>" + rows + "</ul><p>Not listed? We'll call you to confirm. Other Australian locations are usually $18.</p></details>";
  }
  function renderDetails(c) {
    var place = draft.delivery_type || "home";
    app.innerHTML = stepper(1) + "<div class='checkout details-step'><div class='checkout-main'><form class='order dform' id='orderForm' novalidate>" +
      sec(1, "who", "Who are the flowers for?", "We'll only contact them if our driver needs help finding them.",
        "<div class='fields'>" + fld("rn", "recipient_name", "Recipient's full name", "required autocomplete='off' placeholder='e.g. Jane Citizen'") +
        fld("rp", "recipient_phone", "Recipient's phone", "type='tel' required inputmode='tel' placeholder='e.g. 0400 123 456'") + "</div>") +
      sec(2, "where", "Where are we delivering?", "",
        "<div class='chips place-chips' role='radiogroup' aria-label='Type of place'>" + PLACES.map(function (pl) {
          return "<label class='chip'><input type='radio' name='delivery_type' value='" + pl[0] + "'" + (pl[0] === place ? " checked" : "") + "><span>" + pl[1] + "</span></label>";
        }).join("") + "</div>" +
        "<div class='fields addr-row'>" +
        "<div class='f num'><label for='hn'>Number</label><input id='hn' name='house_number' autocomplete='off' placeholder='e.g. 12'><span class='ferr'></span></div>" +
        "<div class='f addr-wrap street'><label for='ad'>Street</label><div class='search-in'>" + ICON.search + "<input id='ad' name='street_name' required autocomplete='off' spellcheck='false' placeholder='Start typing the street name' role='combobox' aria-autocomplete='list' aria-expanded='false' aria-controls='addrSugg'><span class='addr-spin' id='addrSpin' hidden></span></div><div class='addr-sugg' id='addrSugg' role='listbox' hidden></div><span class='ferr'></span></div>" +
        "</div><div class='fields'>" +
        "<div class='f full' id='placeField'><label for='pd'></label><input id='pd' name='place_detail' autocomplete='off'><span class='ferr'></span></div>" +
        "<div class='f'><label for='sb'>Suburb or town</label><input id='sb' name='suburb' required list='suburbList' autocomplete='off' placeholder='e.g. Toowoomba'><datalist id='suburbList'>" + allSuburbs.map(function (x) { return "<option value='" + esc(x) + "'>"; }).join("") + "</datalist><span class='ferr'></span></div>" +
        fld("pc", "postcode", "Postcode", "required inputmode='numeric' pattern='[0-9]{4}' maxlength='4' placeholder='e.g. 4350'") +
        "</div><div id='delivInfo' aria-live='polite'></div>" + feeList()) +
      sec(3, "when", "When should it arrive?", "Monday to Friday. For Saturday delivery, please call us on " + esc(S.phone) + ".",
        "<div class='chips date-chips' id='dateChips' role='radiogroup' aria-label='Delivery date'></div>" +
        "<div class='f other-date' id='otherDate' hidden><label for='ddPick'>Choose a date</label><input type='date' id='ddPick'></div>" +
        "<input type='hidden' id='dd' name='delivery_date'><span class='ferr' id='ddErr'></span>") +
      sec(4, "card", "Card message", "Optional. We'll handwrite it on a card with the flowers.",
        "<div class='chips idea-chips'>" + CARD_IDEAS.map(function (t) { return "<button type='button' class='chip-btn' data-idea='" + esc(t) + "'>" + esc(t) + "</button>"; }).join("") + "</div>" +
        "<div class='f full'><label for='cm'>Message</label><textarea id='cm' name='card_message' rows='3' maxlength='250' placeholder='Write your message, or tap an idea above'></textarea><span class='count' id='cmCount'>0 / 250</span></div>" +
        "<div class='fields'><div class='f full'><label for='cf'>From</label><input id='cf' name='card_from' autocomplete='off' placeholder='e.g. Love, Sam and the kids'></div></div>") +
      sec(5, "you", "Your details", "So we can confirm your order and contact you if needed.",
        "<div class='fields'>" + fld("sn", "sender_name", "Your name", "required autocomplete='name'") +
        fld("sp", "sender_phone", "Your phone", "type='tel' required autocomplete='tel' inputmode='tel'") +
        fld("em", "email", "Your email", "type='email' required autocomplete='email'", "full") +
        "<div class='f full'><label for='nt'>Anything else we should know?</label><textarea id='nt' name='notes' rows='2' placeholder='Colour preferences, gate code, best time to deliver'></textarea></div></div>") +
      "<div class='step-nav sticky-nav'><a href='#cart' class='btn btn-ghost'>← Cart</a><button class='btn btn-primary' type='submit' id='toPayment'>Continue to payment <span id='navTotal'></span></button></div>" +
      "</form></div>" + summary(c, { step: "details" }) + "</div>";

    var form = document.getElementById("orderForm");
    if (draft.address && !draft.street_name) {
      var mm = draft.address.match(/^((?:unit\s*)?\d+[a-z]?(?:\s*[\/-]\s*\d+[a-z]?)?)\s+(.*)$/i);
      if (mm) { draft.house_number = mm[1]; draft.street_name = mm[2]; } else draft.street_name = draft.address;
    }
    Object.keys(draft).forEach(function (k) {
      var el = form.elements[k]; if (k[0] === "_" || !el || !draft[k]) return;
      if (el.type === "checkbox") el.checked = true; else if (!(el instanceof RadioNodeList) && el.type !== "radio") el.value = draft[k];
    });
    function setPlace() {
      var v = (form.querySelector("[name=delivery_type]:checked") || {}).value || "home", pl = PLACES.find(function (x) { return x[0] === v; });
      var pf = document.getElementById("placeField"), pd = document.getElementById("pd");
      pf.querySelector("label").innerHTML = esc(pl[2]) + (pl[3] ? "" : "");
      pd.placeholder = pl[4]; pd.required = pl[3];
      var hn = document.getElementById("hn"); hn.required = v === "home";
      hn.previousElementSibling.innerHTML = "Number" + (v === "home" ? "" : " <em>(if known)</em>");
      draft.delivery_type = v; saveDraft();
    }
    setPlace();
    form.addEventListener("change", function (e) { if (e.target.name === "delivery_type") setPlace(); });
    form.addEventListener("input", function (ev) {
      var t = ev.target; if (!t.name) return;
      draft[t.name] = t.type === "checkbox" ? (t.checked ? "yes" : "") : t.value;
      if (t.name === "house_number" || t.name === "street_name") draft.address = fields().street;
      saveDraft();
      var w = t.closest(".f"); if (w && w.classList.contains("err") && t.value.trim()) { w.classList.remove("err"); }
      if (t.id === "cm") countCard();
    });
    function countCard() { document.getElementById("cmCount").textContent = document.getElementById("cm").value.length + " / 250"; }
    countCard();
    form.querySelector(".idea-chips").addEventListener("click", function (e) {
      var b = e.target.closest("[data-idea]"); if (!b) return;
      var cm = document.getElementById("cm");
      cm.value = cm.value.trim() ? cm.value.trim() + " " + b.dataset.idea : b.dataset.idea;
      draft.card_message = cm.value; saveDraft(); countCard(); cm.focus();
    });
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (!validate(form)) return;
      var b = document.getElementById("toPayment"); b.disabled = true; b.textContent = "Checking address…";
      new FormData(form).forEach(function (v, k) { draft[k] = v; });
      draft.address = fields().street;
      // never let a slow map service hold the customer up
      var fd = fields(), dm = DV.match(null, fd.suburb), needMap = (!dm || dm.unknown) || DV.zones.some(function (z) { return (z.areas || []).length; });
      var look = lookUp();
      Promise.race([needMap ? look : Promise.resolve(), new Promise(function (r) { setTimeout(r, 4000); })]).then(function () { saveDraft(); go("payment"); });
    });
    setupMobileSummary();
    setupAddress();
    updateDelivery();
    if (!loc) lookUp();
  }

  // Friendly inline errors instead of the browser's pop-ups
  var MSG = { recipient_name: "Please enter who the flowers are for.", recipient_phone: "Please enter a phone number for the recipient.",
    house_number: "Please enter the house or unit number.", street_name: "Please enter the street name.", place_detail: "Please fill this in so our driver can find them.", suburb: "Please enter the suburb or town.",
    postcode: "Please enter a 4-digit postcode.", sender_name: "Please enter your name.", sender_phone: "Please enter your phone number.", email: "Please enter a valid email address." };
  function validate(form) {
    var first = null;
    form.querySelectorAll(".f").forEach(function (w) { w.classList.remove("err"); });
    form.querySelectorAll("input[required], textarea[required]").forEach(function (el) {
      if (el.checkValidity() && el.value.trim()) return;
      var w = el.closest(".f"); if (!w) return;
      w.classList.add("err"); var m = w.querySelector(".ferr"); if (m) m.textContent = MSG[el.name] || "Please fill this in.";
      if (!first) first = el;
    });
    var dd = document.getElementById("dd"), de = document.getElementById("ddErr");
    if (!dd.value) { de.textContent = "Please choose a delivery date."; de.style.display = "block"; if (!first) first = document.getElementById("dateChips"); } else { de.style.display = "none"; }
    if (first) { first.scrollIntoView({ behavior: "smooth", block: "center" }); if (first.focus) setTimeout(function () { first.focus({ preventScroll: true }); }, 300); return false; }
    return true;
  }

  // Delivery dates as tap-to-pick buttons
  var lastDateKey = "";
  function buildDates(d) {
    var base = earliest(d && d.cutoffHour), min = (d && d.sameDay === false) ? nextBusinessDay(base) : base;
    var key = iso(min); var box = document.getElementById("dateChips"); if (!box) return;
    var dd = document.getElementById("dd"), pick = document.getElementById("ddPick"), other = document.getElementById("otherDate");
    pick.min = key;
    if (!dd.value && draft.delivery_date) dd.value = draft.delivery_date;
    if (dd.value && dd.value < key) dd.value = "";
    if (key === lastDateKey && box.childElementCount) return markDate();
    lastDateKey = key;
    var today = iso(brisNow()), tmr = iso(new Date(brisNow().getTime() + 864e5));
    var days = [], cur = new Date(min);
    while (days.length < 5) { if (cur.getDay() !== 0 && cur.getDay() !== 6) days.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
    box.innerHTML = days.map(function (x) {
      var v = iso(x), tag = v === today ? "Today" : v === tmr ? "Tomorrow" : x.toLocaleDateString("en-AU", { weekday: "short" });
      return "<button type='button' class='date-chip' data-date='" + v + "'><small>" + tag + "</small><b>" + x.getDate() + "</b><span>" + x.toLocaleDateString("en-AU", { month: "short" }) + "</span></button>";
    }).join("") + "<button type='button' class='date-chip other' data-date='other'><small>Later</small><b>" + ICON.when + "</b><span>Pick a date</span></button>";
    box.onclick = function (e) {
      var b = e.target.closest("[data-date]"); if (!b) return;
      if (b.dataset.date === "other") { other.hidden = false; pick.focus(); if (pick.showPicker) try { pick.showPicker(); } catch (er) {} return; }
      other.hidden = true; setDate(b.dataset.date);
    };
    pick.onchange = function () {
      var v = pick.value; if (!v) return;
      var p = v.split("-"), wd = new Date(+p[0], +p[1] - 1, +p[2]).getDay();
      if (wd === 0 || wd === 6) { pick.value = ""; document.getElementById("ddErr").textContent = "We deliver Monday to Friday. For Saturday, please call us."; document.getElementById("ddErr").style.display = "block"; return; }
      setDate(v);
    };
    if (!dd.value) setDate(iso(min)); else markDate();
  }
  function setDate(v) { var dd = document.getElementById("dd"); dd.value = v; draft.delivery_date = v; saveDraft(); document.getElementById("ddErr").style.display = "none"; markDate(); }
  function markDate() {
    var v = document.getElementById("dd").value, found = false;
    document.querySelectorAll(".date-chip").forEach(function (b) { var on = b.dataset.date === v; b.classList.toggle("on", on); if (on) found = true; });
    var other = document.querySelector(".date-chip.other"), od = document.getElementById("otherDate");
    if (other) other.classList.toggle("on", !!v && !found);
    if (v && !found) { od.hidden = false; document.getElementById("ddPick").value = v; }
    var lbl = document.getElementById("dateChosen");
  }

  // Phones: summary collapses to a tap-to-open bar
  function setupMobileSummary() {
    var aside = app.querySelector(".summary"); if (!aside || aside.querySelector(".sum-toggle")) return;
    var t = document.createElement("button"); t.type = "button"; t.className = "sum-toggle";
    t.innerHTML = "<span>Order summary <em>▾</em></span><b id='sumTotal'></b>";
    aside.insertBefore(t, aside.firstChild);
    t.onclick = function () { aside.classList.toggle("open"); };
  }

  function fields() {
    function v(id, k) { var el = document.getElementById(id); return el ? el.value.trim() : (draft[k] || ""); }
    var num = v("hn", "house_number"), st = v("ad", "street_name");
    return { street: (num ? num + " " : "") + st, suburb: v("sb", "suburb"), postcode: v("pc", "postcode") };
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
    var ad = document.getElementById("ad"), box = document.getElementById("addrSugg"), spin = document.getElementById("addrSpin");
    var sb = document.getElementById("sb"), pc = document.getElementById("pc"), hn = document.getElementById("hn");
    var timer, items = [], active = -1, seq = 0;
    function open(html) { box.innerHTML = html; box.hidden = false; ad.setAttribute("aria-expanded", "true"); }
    function close() { box.hidden = true; active = -1; ad.setAttribute("aria-expanded", "false"); }
    function render(res, q) {
      items = res.list;
      if (!res.ok) return open("<div class='sugg-note'>Street search isn't available right now. Just type the street name and fill in the suburb and postcode below.</div>");
      if (!items.length) return open("<div class='sugg-note'>No streets found for “" + esc(q) + "” in our delivery area. Check the spelling, or just type it in and fill in the suburb and postcode below.</div>");
      open(items.map(function (x, i) {
        return "<button type='button' role='option' id='sg" + i + "' data-i='" + i + "'><b>" + esc(x.street) + "</b><span>" + esc([x.suburb, x.postcode].filter(Boolean).join(" ")) + "</span></button>";
      }).join("") + "<div class='sugg-foot'>Can't see it? Keep typing, or enter it yourself." + ((window.SITE || {}).geoapifyKey ? " · <a href='https://www.geoapify.com/' target='_blank' rel='noopener'>Powered by Geoapify</a>" : "") + "</div>");
    }
    function search() {
      var q = ad.value.trim(), my = ++seq;
      if (q.replace(/^\d+\S*\s+/, "").length < 3) { spin.hidden = true; return close(); }
      spin.hidden = false;
      DV.streets(q).then(function (res) { if (my !== seq) return; spin.hidden = true; if (document.activeElement === ad) render(res, q); });
    }
    function pick(x) {
      // If they typed the house number into the street box, move it to the number box
      var lead = ad.value.trim().match(/^((?:unit\s*)?\d+[a-z]?(?:\s*[\/-]\s*\d+[a-z]?)?)\s+/i);
      if (lead && !hn.value.trim()) hn.value = lead[1];
      ad.value = x.street;
      if (x.suburb) sb.value = x.suburb;
      if (x.postcode) pc.value = x.postcode;
      [hn, ad, sb, pc].forEach(function (el) { draft[el.name] = el.value; var w = el.closest(".f"); if (w && el.value) w.classList.remove("err"); });
      draft.address = fields().street;
      loc = { lat: x.lat, lng: x.lng, exact: false };
      var f = fields(); locKey = [f.street, f.suburb, f.postcode].join("|").toLowerCase(); locating = null;
      saveDraft(); close(); updateDelivery();
      if (!hn.value.trim()) hn.focus();
      // Quietly try to pin the exact house (used for drawn delivery areas)
      if (hn.value.trim()) {
        var key = locKey;
        DV.locate(f.street, f.suburb, f.postcode).then(function (r) { if (r && r.exact && key === locKey) { loc = { lat: r.lat, lng: r.lng, exact: true }; saveDraft(); } });
      }
    }
    ad.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(search, 250); });
    ad.addEventListener("focus", function () { if (ad.value.trim().length >= 3 && box.hidden && !loc) search(); });
    ad.addEventListener("keydown", function (e) {
      if (box.hidden) return;
      var btns = box.querySelectorAll("button");
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && btns.length) {
        e.preventDefault(); active = (active + (e.key === "ArrowDown" ? 1 : -1) + btns.length) % btns.length;
        btns.forEach(function (b, i) { b.classList.toggle("on", i === active); }); ad.setAttribute("aria-activedescendant", "sg" + active);
      } else if (e.key === "Enter" && active > -1) { e.preventDefault(); pick(items[active]); }
      else if (e.key === "Escape" || e.key === "Tab") close();
    });
    box.addEventListener("mousedown", function (e) { var b = e.target.closest("button"); if (b) { e.preventDefault(); pick(items[+b.dataset.i]); } });
    document.addEventListener("click", function (e) { if (!e.target.closest(".addr-wrap")) close(); });
    // Typed suburb: fill the postcode when we know it
    sb.addEventListener("change", function () { if (!pc.value.trim()) { var p = DV.postcodeFor(sb.value); if (p) { pc.value = p; draft.postcode = p; saveDraft(); updateDelivery(); } } });
    [hn, ad, sb, pc].forEach(function (el) {
      el.addEventListener("input", function () { if (el !== hn && (loc || locating)) { loc = null; locating = null; locKey = ""; saveDraft(); } updateDelivery(); });
      el.addEventListener("change", function () { setTimeout(lookUp, 150); });
    });
  }

  function updateDelivery(checking) {
    var info = document.getElementById("delivInfo"); if (!info) return null;
    var c = load(), sub = total(c), f = fields();
    var d = (f.street || f.suburb) ? DV.match(loc, f.suburb) : null;
    var label = document.getElementById("delivLabel"), fee = document.getElementById("delivFee");
    // Only wait on the map when it could change the answer (drawn areas, or a suburb we don't know)
    var mapMatters = (d && d.unknown) || DV.zones.some(function (z) { return (z.areas || []).length; });
    if ((checking === true || (locating && !loc)) && mapMatters) {
      info.innerHTML = "<div class='dcard checking'><span class='spin'></span><div><b>Checking the delivery address…</b></div></div>";
      label.textContent = "Delivery"; fee.textContent = "Checking…"; d = null;
    } else if (!d || !f.suburb) {
      info.innerHTML = "<div class='dcard empty'>" + ICON.where + "<div><b>Delivery fee</b><span>Enter the address to see the delivery cost. It's included anywhere in Toowoomba.</span></div></div>";
      label.textContent = "Delivery"; fee.textContent = "Enter address"; d = null;
    } else {
      var cls = d.unknown ? "unknown" : d.fee > 0 ? "extra" : "free";
      var price = d.unknown ? "To be confirmed" : d.fee > 0 ? money(d.fee) : "Included";
      info.innerHTML = "<div class='dcard " + cls + "'>" + ICON.where + "<div><b>" + esc(d.unknown ? "Outside our usual delivery area" : "Delivering to " + (f.suburb || "")) + "</b><span>" + esc(d.note || "") + "</span></div><strong>" + price + "</strong></div>";
      label.textContent = d.unknown ? "Delivery" : d.fee > 0 ? "Delivery" : "Delivery (Toowoomba)";
      fee.textContent = d.unknown ? "To be confirmed" : d.fee > 0 ? money(d.fee) : "Included";
    }
    buildDates(d);
    var grand = money(sub + (d && !d.unknown ? d.fee : 0)) + (d && d.unknown ? " + delivery" : "");
    document.getElementById("grandTotal").textContent = grand;
    var st = document.getElementById("sumTotal"); if (st) st.textContent = grand;
    var nt = document.getElementById("navTotal"); if (nt) nt.textContent = "· " + grand;
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
      rev("Delivering to", "<p><b>" + esc(draft.recipient_name) + "</b><br>" + (draft.place_detail ? esc(draft.place_detail) + "<br>" : "") + esc(draft.address) + "<br>" + esc(draft.suburb) + " QLD " + esc(draft.postcode) + "<br>" + esc(draft.recipient_phone) + "</p>") +
      rev("Delivery", "<p>" + esc(nice(draft.delivery_date)) + "<br>" + esc(d.name) + " · " + (d.unknown ? "cost to be confirmed" : d.fee > 0 ? money(d.fee) : "Delivery included") + "</p>") +
      rev("Card message", "<p>" + (draft.card_message ? esc(draft.card_message).replace(/\n/g, "<br>") : "<span class='muted'>No card message</span>") + (draft.card_message ? "<br><span class='muted'>" + (draft.card_from ? "From: " + esc(draft.card_from) : "") + "</span>" : "") + "</p>") +
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
      items: c.map(function (i) { return { name: i.name, opts: i.opts || "", qty: i.qty, price: i.price, extra: !!i.extra, img: i.img }; }),
      delivery: { date: draft.delivery_date, zone: d.name, unknown: !!d.unknown, fee: fee, how: d.how },
      recipient: { name: draft.recipient_name, place: draft.delivery_type || "home", detail: draft.place_detail || "", address: draft.address, suburb: draft.suburb, postcode: draft.postcode, phone: draft.recipient_phone },
      card: draft.card_message || "", cardFrom: draft.card_from || "",
      sender: { name: draft.sender_name, phone: draft.sender_phone, email: draft.email },
      notes: draft.notes || "",
      payment: method,
      subtotal: sub, total: grand, gst: grand / 11,
      preview: PREVIEW && !S.orderEndpoint && !S.web3formsKey
    };
    // What the shop receives by email
    var data = {
      order_number: order.number,
      placed: order.placed,
      payment: method === "card" ? "Paying online by card (check payment received)" : "PAY BY PHONE: call the customer to take payment",
      delivery_date: nice(order.delivery.date),
      recipient_name: order.recipient.name,
      delivery_to: ({ home: "Home", work: "Workplace", hospital: "Hospital or care home", funeral: "Funeral or church" })[order.recipient.place] + (order.recipient.detail ? ": " + order.recipient.detail : ""),
      address: order.recipient.address + ", " + order.recipient.suburb + " QLD " + order.recipient.postcode,
      recipient_phone: order.recipient.phone,
      card_message: order.card || "(none)",
      card_from: order.card ? (order.cardFrom || "(not signed)") : "",
      items: order.items.filter(function (i) { return !i.extra; }).map(function (i) { return i.qty + " x " + itemLabel(i) + " (" + money(i.price * i.qty) + ")"; }).join("\n"),
      extras: order.items.filter(function (i) { return i.extra; }).map(function (i) { return i.qty + " x " + itemLabel(i) + " (" + money(i.price * i.qty) + ")"; }).join("\n") || "(none)",
      delivery: d.unknown ? "TO BE CONFIRMED: not in a listed delivery area" : d.name + " (" + (fee > 0 ? money(fee) : "delivery included") + ")",
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
    if (!S.orderEndpoint && !S.web3formsKey) {
      if (order.preview) return finish();
      app.innerHTML = stepper(2) + "<div class='done'><h2>Online ordering isn't switched on yet</h2><p style='color:var(--muted);margin:12px 0 24px'>Please call us on <a href='" + telHref + "'>" + esc(S.phone) + "</a> and we'll take your order over the phone.</p><a class='btn btn-ghost' href='#payment'>← Back</a></div>";
      return;
    }
    var btn = document.getElementById("placeBtn"); btn.disabled = true; btn.textContent = "Placing your order…";
    var url = S.orderEndpoint, body = data;
    if (S.web3formsKey) {
      url = "https://api.web3forms.com/submit";
      body = Object.assign({ access_key: S.web3formsKey, subject: data._subject, from_name: "Southerden's website", replyto: data._replyto }, data);
      delete body._subject; delete body._replyto;
    }
    fetch(url, { method: "POST", headers: { "Accept": "application/json", "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || j.success === false) throw new Error("send failed"); finish(); }); })
      .catch(function () {
        btn.disabled = false; btn.textContent = "Try again";
        alert("Sorry, your order didn't go through. Please try again or call " + S.phone + ".");
      });
  }

  // ---- STEP 4: Confirmation ----
  function renderConfirmation(o) {
    var flowers = o.items.filter(function (i) { return !i.extra; }), extras = o.items.filter(function (i) { return i.extra; });
    var row = function (i) { return "<tr><td>" + esc(i.name) + (i.qty > 1 ? " × " + i.qty : "") + (i.opts ? "<br><small class='muted'>" + esc(i.opts) + "</small>" : "") + "</td><td>" + money(i.price * i.qty) + "</td></tr>"; };
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
      "<div class='panel'><h3>Delivery</h3><p><b>" + esc(o.recipient.name) + "</b><br>" + (o.recipient.detail ? esc(o.recipient.detail) + "<br>" : "") + esc(o.recipient.address) + "<br>" + esc(o.recipient.suburb) + " QLD " + esc(o.recipient.postcode) + "<br>" + esc(o.recipient.phone) + "</p><p>" + esc(nice(o.delivery.date)) + "<br>" + esc(o.delivery.zone) + "</p>" +
      "<h4 style='margin-top:14px'>Card message</h4><p>" + (o.card ? esc(o.card).replace(/\n/g, "<br>") + (o.cardFrom ? "<br><span class='muted'>" + "From: " + esc(o.cardFrom) + "</span>" : "") : "<span class='muted'>No card message</span>") + "</p></div>" +
      "<div class='panel'><h3>Order details</h3><table class='otable'>" + flowers.map(row).join("") + (extras.length ? "<tr class='sub'><td colspan='2'>Extras</td></tr>" + extras.map(row).join("") : "") +
      "<tr class='tot'><td>Subtotal</td><td>" + money(o.subtotal) + "</td></tr>" +
      "<tr><td>" + (o.delivery.unknown ? "Delivery" : esc(o.delivery.zone)) + "</td><td>" + (o.delivery.unknown ? "To be confirmed" : o.delivery.fee > 0 ? money(o.delivery.fee) : "Included") + "</td></tr>" +
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
