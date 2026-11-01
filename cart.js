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

  // Cart page
  if (!app) return;

  function earliest() { // earliest delivery date, Brisbane time, weekdays only
    var now = new Date(new Date().toLocaleString("en-US", { timeZone: "Australia/Brisbane" }));
    var d = new Date(now);
    if (now.getHours() >= (S.cutoffHour || 14)) d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d;
  }
  function iso(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

  // ---- Delivery (zones in delivery-zones.js, matching in delivery-engine.js) ----
  var DV = window.Delivery;
  var UNKNOWN = window.DELIVERY_UNKNOWN || { name: "Outside our listed areas" };
  var loc = null, locating = null, locKey = "";
  function nextBusinessDay(d) { var n = new Date(d); n.setDate(n.getDate() + 1); while (n.getDay() === 0 || n.getDay() === 6) n.setDate(n.getDate() + 1); return n; }
  var allSuburbs = [];
  (window.DELIVERY_ZONES || []).forEach(function (z) { (z.suburbs || []).forEach(function (x) { if (allSuburbs.indexOf(x) < 0) allSuburbs.push(x); }); });
  allSuburbs.sort();

  function render() {
    var c = load();
    if (!c.length) {
      app.innerHTML = "<div class='empty'><h2>Your cart is empty</h2><p style='color:var(--muted);margin:10px 0 24px'>Have a look through our flowers and gifts.</p><a class='btn btn-primary' href='" + root + "bouquets.html'>Shop flowers</a></div>";
      return;
    }
    var hasFlowers = c.some(function (i) { return !i.extra; });
    var inCart = {}; c.forEach(function (i) { inCart[i.id] = 1; });
    var strip = "<div class='panel xstrip'><h3>Add something extra?</h3><p class='hint'>Chocolates, a balloon, a plush toy or wine, delivered with your flowers.</p><div class='xscroll'><button type='button' class='xarrow xprev' aria-label='Previous extras'>‹</button><div class='xgrid'>" +
      X.map(function (x) { return extraCard(x, inCart[x.id]); }).join("") + "</div><button type='button' class='xarrow xnext' aria-label='More extras'>›</button></div><div class='xdots'></div></div>";
    var lines = c.map(function (i, k) {
      return "<div class='line'><span class='art'><img src='" + root + "images/" + esc(i.img) + "' alt='' onerror='this.remove()'></span>" +
        "<div><h4>" + esc(i.name) + "</h4><div style='margin-top:6px'><span class='qty'><button type='button' data-l='" + k + "' data-d='-1' aria-label='Less'>−</button><input value='" + i.qty + "' readonly aria-label='Quantity'><button type='button' data-l='" + k + "' data-d='1' aria-label='More'>+</button></span>" +
        "<button type='button' class='rm' data-rm='" + k + "'>Remove</button></div></div><b>" + money(i.price * i.qty) + "</b></div>";
    }).join("");
    var e = earliest();
    app.innerHTML =
      "<div class='checkout'>" + (hasFlowers ? "" :
        "<div class='panel needflowers'><h3>Extras need a flower order</h3><p>Add-on extras can only be sent together with flowers, a plant or a hamper. Choose something to go with them and you're all set.</p><a class='btn btn-primary' href='" + root + "bouquets.html'>Shop flowers</a></div>") +
      "<div class='checkout-main'>" + strip + "<form class='order' id='orderForm'" + (hasFlowers ? "" : " hidden") + ">" +
      "<fieldset><legend>Delivery</legend><div class='fields'>" +
      "<div><label for='dd'>Delivery date</label><input id='dd' type='date' name='delivery_date' required min='" + iso(e) + "' value='" + iso(e) + "'><div class='hint'>Same day if ordered by 2pm Mon–Fri. For Saturday, please call.</div></div>" +
      "<div><label for='rn'>Recipient's name</label><input id='rn' name='recipient_name' required></div>" +
      "<div class='full addr-wrap'><label for='ad'>Delivery address</label><input id='ad' name='address' required autocomplete='off' placeholder='Start typing the street address'><div class='addr-sugg' id='addrSugg' role='listbox' hidden></div><div class='hint'>Pick the address from the list if it appears. Add a unit, ward or room number in the notes below.</div></div>" +
      "<div><label for='sb'>Suburb / town</label><input id='sb' name='suburb' required list='suburbList' autocomplete='off'><datalist id='suburbList'>" + allSuburbs.map(function (x) { return "<option value='" + esc(x) + "'>"; }).join("") + "</datalist></div>" +
      "<div><label for='pc'>Postcode</label><input id='pc' name='postcode' required inputmode='numeric' pattern='[0-9]{4}' maxlength='4' placeholder='4350'></div>" +
      "<div class='full' id='delivInfo' aria-live='polite'></div>" +
      "<div><label for='rp'>Recipient's phone</label><input id='rp' name='recipient_phone' type='tel' required placeholder='So we can reach them for delivery'></div>" +
      "</div></fieldset>" +
      "<fieldset><legend>Card message</legend><textarea name='card_message' rows='3' maxlength='300' aria-label='Card message' placeholder='Happy birthday Mum, love from all of us'></textarea></fieldset>" +
      "<fieldset><legend>Your details</legend><div class='fields'>" +
      "<div><label for='sn'>Your name</label><input id='sn' name='sender_name' required autocomplete='name'></div>" +
      "<div><label for='sp'>Your phone</label><input id='sp' name='sender_phone' type='tel' required autocomplete='tel'></div>" +
      "<div class='full'><label for='em'>Your email</label><input id='em' name='email' type='email' required autocomplete='email'></div>" +
      "<div class='full'><label for='nt'>Anything else? (optional)</label><textarea id='nt' name='notes' rows='2' placeholder='Colour preferences, delivery instructions'></textarea></div>" +
      "</div></fieldset>" +
      "<button class='btn btn-primary' style='width:100%;justify-content:center' type='submit' id='placeBtn'>" + (S.paymentLink ? "Continue to payment" : "Place order") + " · " + money(total(c)) + "</button>" +
      "<p class='hint' style='text-align:center;margin-top:10px'>" + (S.paymentLink ? "You'll be taken to our secure payment page." : "We'll call you to confirm your order and take payment.") + " By placing your order you agree to our <a href='" + root + "terms.html'>Terms &amp; Conditions</a>.</p>" +
      "</form></div><aside class='panel summary'><h3>Order summary</h3>" + lines +
      "<div class='totals'><div><span>Subtotal</span><span>" + money(total(c)) + "</span></div><div><span id='delivLabel'>Delivery</span><span id='delivFee'>Enter address</span></div><div class='grand'><span>Total incl. GST</span><span id='grandTotal'>" + money(total(c)) + "</span></div></div>" +
      "<p class='hint' style='margin-top:12px'>Delivery is free within Toowoomba. Some outer areas have a delivery fee, which is shown here once you enter the delivery address.</p></aside></div>";
    var form = document.getElementById("orderForm");
    form.addEventListener("submit", submit);
    Object.keys(draft).forEach(function (k) { if (form.elements[k] && draft[k]) form.elements[k].value = draft[k]; });
    form.addEventListener("input", function (ev) { if (ev.target.name) draft[ev.target.name] = ev.target.value; });
    setupAddress();
    if (draft._loc) loc = draft._loc;
    updateDelivery();
    if (!loc) lookUp();
    setupScroller();
  }
  var draft = {};

  function fields() { return { street: document.getElementById("ad").value.trim(), suburb: document.getElementById("sb").value.trim(), postcode: document.getElementById("pc").value.trim() }; }

  // Look the typed address up on the map (once they've filled street + suburb)
  function lookUp() {
    var f = fields(), key = [f.street, f.suburb, f.postcode].join("|").toLowerCase();
    if (!f.street || !f.suburb || key === locKey) return locating || Promise.resolve(loc);
    locKey = key; loc = null; draft._loc = null; updateDelivery(true);
    var p = locating = DV.locate(f.street, f.suburb, f.postcode).then(function (r) {
      if (p !== locating) return loc;          // a newer lookup has started
      locating = null;
      if (r) { loc = { lat: r.lat, lng: r.lng, exact: r.exact }; draft._loc = loc; }
      updateDelivery();
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
      ad.value = x.street || ad.value;
      if (x.suburb) document.getElementById("sb").value = x.suburb;
      if (x.postcode) document.getElementById("pc").value = x.postcode;
      ["address", "suburb", "postcode"].forEach(function (n) { draft[n] = document.getElementById({ address: "ad", suburb: "sb", postcode: "pc" }[n]).value; });
      loc = { lat: x.lat, lng: x.lng, exact: x.exact }; draft._loc = loc;
      locKey = [fields().street, fields().suburb, fields().postcode].join("|").toLowerCase(); locating = null;
      close(); updateDelivery();
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
      el.addEventListener("input", function () { if (loc || locating) { loc = null; draft._loc = null; locating = null; locKey = ""; } updateDelivery(); });
      el.addEventListener("change", function () { setTimeout(lookUp, 150); });
    });
  }

  function updateDelivery(checking) {
    var c = load(), sub = total(c);
    var f = fields();
    var d = (f.street || f.suburb) ? DV.match(loc, f.suburb) : null;
    var info = document.getElementById("delivInfo"), label = document.getElementById("delivLabel"), fee = document.getElementById("delivFee");
    var dateEl = document.getElementById("dd"), base = earliest();
    var feeTxt, cls, msg;
    if (checking === true || (locating && !loc)) {
      info.innerHTML = "<div class='deliv deliv-checking'><b>Checking the delivery address…</b></div>";
      label.textContent = "Delivery"; fee.textContent = "Checking…"; d = null;
    } else if (!d || !f.suburb) { info.innerHTML = ""; label.textContent = "Delivery"; fee.textContent = "Enter address"; d = null; }
    else {
      if (d.unknown) { cls = "unknown"; feeTxt = "To be confirmed"; }
      else if (d.fee > 0) { cls = d.type; feeTxt = money(d.fee); }
      else { cls = "free"; feeTxt = "Free"; }
      msg = "<b>" + esc(d.name) + (d.unknown ? "" : (d.fee > 0 ? " · " + money(d.fee) : " · Free")) + "</b><span>" + esc(d.note || "") + "</span>";
      info.innerHTML = "<div class='deliv deliv-" + cls + "'>" + msg + "</div>";
      label.textContent = d.unknown ? "Delivery" : d.name;
      fee.textContent = feeTxt;
    }
    // Courier zones can't be same-day
    var min = (d && d.sameDay === false) ? nextBusinessDay(base) : base;
    dateEl.min = iso(min);
    if (dateEl.value && dateEl.value < dateEl.min) dateEl.value = dateEl.min;
    var grand = sub + (d && !d.unknown ? d.fee : 0);
    document.getElementById("grandTotal").textContent = money(grand) + (d && d.unknown ? " + delivery" : "");
    document.getElementById("placeBtn").textContent = (S.paymentLink ? "Continue to payment" : "Place order") + " · " + money(grand);
    return d;
  }

  // Arrows + dots so it's obvious there are more extras to see
  function setupScroller() {
    var wrap = app.querySelector(".xscroll"); if (!wrap) return;
    var g = wrap.querySelector(".xgrid"), prev = wrap.querySelector(".xprev"), next = wrap.querySelector(".xnext");
    var dots = app.querySelector(".xdots");
    function step() { var c = g.querySelector(".xcard"); return c ? (c.offsetWidth + 10) * 2 : 260; }
    function update() {
      var max = g.scrollWidth - g.clientWidth;
      var scrollable = max > 4;
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
  window.__cartRender = render;

  app.addEventListener("click", function (e) {
    var b = e.target.closest("[data-l],[data-rm]");
    if (!b) return;
    var c = load();
    if (b.dataset.rm != null) c.splice(+b.dataset.rm, 1);
    else { var i = c[+b.dataset.l]; i.qty = Math.max(1, i.qty + (+b.dataset.d)); }
    save(c); render();
  });

  function submit(ev) {
    ev.preventDefault();
    var form = ev.target, btn0 = form.querySelector("button[type=submit]");
    btn0.disabled = true;
    Promise.resolve(lookUp()).then(function () { btn0.disabled = false; send(form); });
  }

  function send(f) {
    var c = load(), data = {};
    if (!c.some(function (i) { return !i.extra; })) { render(); return; }
    new FormData(f).forEach(function (v, k) { data[k] = v; });
    data.items = c.map(function (i) { return i.qty + " x " + i.name + " (" + money(i.price * i.qty) + ")"; }).join("\n");
    var d = DV.match(loc, data.suburb) || { unknown: true, name: UNKNOWN.name, fee: 0 };
    data.delivery = d.unknown ? "TO BE CONFIRMED: " + data.address + ", " + data.suburb + " " + data.postcode + " is not in a listed delivery area" : d.name + " (" + (d.fee > 0 ? money(d.fee) : "free") + ")";
    data.delivery_matched_by = d.how === "area" ? "address is inside the " + d.name + " area on the map" : d.how === "suburb" ? "suburb name (" + data.suburb + ")" + (loc ? "" : ", address not found on the map") : "no match, please check";
    if (loc) data.delivery_map = "https://www.google.com/maps/search/?api=1&query=" + loc.lat.toFixed(6) + "," + loc.lng.toFixed(6);
    data.delivery_fee = d.unknown ? "To be confirmed" : money(d.fee);
    data.subtotal = money(total(c));
    data.total = money(total(c) + (d.unknown ? 0 : d.fee)) + (d.unknown ? " + delivery (to be confirmed)" : "");
    data._subject = "New web order for " + data.recipient_name + " (" + data.delivery_date + ")";

    if (!S.orderEndpoint) {
      app.innerHTML = "<div class='done'><h2>Online ordering isn't switched on yet</h2><p style='color:var(--muted);margin:12px 0 24px'>Please call us on <a href='" + telHref + "'>" + esc(S.phone) + "</a> and we'll take your order over the phone.</p></div>";
      return;
    }
    var btn = f.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Sending…";
    fetch(S.orderEndpoint, { method: "POST", headers: { "Accept": "application/json", "Content-Type": "application/json" }, body: JSON.stringify(data) })
      .then(function (r) {
        if (!r.ok) throw new Error("send failed");
        save([]);
        if (S.paymentLink) { location.href = S.paymentLink; return; }
        app.innerHTML = "<div class='done'><span class='eyebrow'>Thank you</span><h2 style='margin:8px 0 12px'>Your order has been sent</h2><p style='color:var(--muted)'>We'll be in touch shortly to confirm the details and take payment. Questions? Call <a href='" + telHref + "'>" + esc(S.phone) + "</a>.</p><a class='btn btn-primary' style='margin-top:24px' href='" + root + "index.html'>Back to home</a></div>";
      })
      .catch(function () {
        btn.disabled = false; btn.textContent = "Try again";
        alert("Sorry, your order didn't send. Please try again or call " + S.phone + ".");
      });
  }

  render();
})();
