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

  function render() {
    var c = load();
    if (!c.length) {
      app.innerHTML = "<div class='empty'><h2>Your cart is empty</h2><p style='color:var(--muted);margin:10px 0 24px'>Have a look through our flowers and gifts.</p><a class='btn btn-primary' href='" + root + "bouquets.html'>Shop flowers</a></div>";
      return;
    }
    var hasFlowers = c.some(function (i) { return !i.extra; });
    var inCart = {}; c.forEach(function (i) { inCart[i.id] = 1; });
    var strip = "<div class='panel xstrip'><h3>Add something extra?</h3><p class='hint'>Chocolates, a balloon, a plush toy or wine, delivered with your flowers.</p><div class='xgrid'>" +
      X.map(function (x) { return extraCard(x, inCart[x.id]); }).join("") + "</div></div>";
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
      "<div class='full'><label for='ad'>Delivery address</label><input id='ad' name='address' required placeholder='Street address, unit, or hospital ward and room'></div>" +
      "<div><label for='sb'>Suburb / town</label><input id='sb' name='suburb' required></div>" +
      "<div><label for='rp'>Recipient's phone (optional)</label><input id='rp' name='recipient_phone' type='tel' placeholder='Helps if no one is home'></div>" +
      "</div></fieldset>" +
      "<fieldset><legend>Card message</legend><textarea name='card_message' rows='3' maxlength='300' aria-label='Card message' placeholder='Happy birthday Mum, love from all of us'></textarea></fieldset>" +
      "<fieldset><legend>Your details</legend><div class='fields'>" +
      "<div><label for='sn'>Your name</label><input id='sn' name='sender_name' required autocomplete='name'></div>" +
      "<div><label for='sp'>Your phone</label><input id='sp' name='sender_phone' type='tel' required autocomplete='tel'></div>" +
      "<div class='full'><label for='em'>Your email</label><input id='em' name='email' type='email' required autocomplete='email'></div>" +
      "<div class='full'><label for='nt'>Anything else? (optional)</label><textarea id='nt' name='notes' rows='2' placeholder='Colour preferences, a bigger size, delivery instructions'></textarea></div>" +
      "</div></fieldset>" +
      "<button class='btn btn-primary' style='width:100%;justify-content:center' type='submit'>" + (S.paymentLink ? "Continue to payment" : "Place order") + " · " + money(total(c)) + "</button>" +
      "<p class='hint' style='text-align:center;margin-top:10px'>" + (S.paymentLink ? "You'll be taken to our secure payment page." : "We'll call you to confirm your order and take payment.") + "</p>" +
      "</form></div><aside class='panel summary'><h3>Order summary</h3>" + lines +
      "<div class='totals'><div><span>Delivery in Toowoomba</span><span>Included</span></div><div class='grand'><span>Total incl. GST</span><span>" + money(total(c)) + "</span></div></div>" +
      "<p class='hint' style='margin-top:12px'>Delivering outside Toowoomba? We'll confirm any extra charge before your order goes out.</p></aside></div>";
    document.getElementById("orderForm").addEventListener("submit", submit);
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
    var f = ev.target, c = load(), data = {};
    if (!c.some(function (i) { return !i.extra; })) { render(); return; }
    new FormData(f).forEach(function (v, k) { data[k] = v; });
    data.items = c.map(function (i) { return i.qty + " x " + i.name + " (" + money(i.price * i.qty) + ")"; }).join("\n");
    data.total = money(total(c));
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
