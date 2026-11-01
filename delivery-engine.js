// Delivery engine: address lookup + zone matching. Settings live in delivery-zones.js.
(function () {
  var CENTRE = { lat: -27.5606, lng: 151.9539 };   // Toowoomba, only used to rank address suggestions
  var ZONES = window.DELIVERY_ZONES || [];
  var UNKNOWN = window.DELIVERY_UNKNOWN || { name: "Outside our listed areas", note: "We'll call you to confirm delivery options and any cost." };

  function norm(t) { return String(t || "").toLowerCase().replace(/\bmt\b\.?/g, "mount").replace(/[^a-z0-9]+/g, " ").trim(); }

  // Is point inside a shape given as [[lat,lng], ...]
  function inside(pt, poly) {
    var x = pt.lng, y = pt.lat, hit = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      var xi = poly[i][1], yi = poly[i][0], xj = poly[j][1], yj = poly[j][0];
      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) hit = !hit;
    }
    return hit;
  }

  function result(z, how) {
    return { id: z.id, type: z.type, name: z.name, note: z.note, fee: +z.fee || 0, sameDay: z.sameDay !== false, how: how };
  }

  // loc = {lat, lng} or null; suburb = text
  function match(loc, suburb) {
    // 1. Inside a drawn area
    if (loc) {
      for (var i = 0; i < ZONES.length; i++) {
        var z = ZONES[i];
        if ((z.areas || []).some(function (a) { return a.length > 2 && inside(loc, a); })) return result(z, "area");
      }
    }
    // 2. Suburb name
    var s = norm(suburb);
    if (s) {
      var z2 = ZONES.find(function (z) { return (z.suburbs || []).some(function (x) { return norm(x) === s; }); });
      if (z2) return result(z2, "suburb");
    }
    if (!loc && !s) return null;
    return { unknown: true, name: UNKNOWN.name, note: UNKNOWN.note, fee: 0, sameDay: true, how: "none" };
  }

  // ---- Address lookup (OpenStreetMap: Photon for suggestions, Nominatim for a final check) ----
  var BIAS = "&lat=" + CENTRE.lat + "&lon=" + CENTRE.lng;
  function photonToAddr(f) {
    var p = f.properties || {}, c = f.geometry.coordinates;
    var street = [p.housenumber, p.street || (p.type === "street" ? p.name : "")].filter(Boolean).join(" ");
    var place = p.type === "street" || p.street ? "" : p.name;
    return {
      label: [place, street, p.city || p.locality || p.district, p.state, p.postcode].filter(Boolean).join(", "),
      street: street || place || "",
      suburb: p.locality || p.district || p.city || "",
      postcode: p.postcode || "",
      lat: c[1], lng: c[0],
      exact: !!p.housenumber
    };
  }
  function suggest(q) {
    if (!q || q.length < 4) return Promise.resolve([]);
    return fetch("https://photon.komoot.io/api/?limit=6&lang=en" + BIAS + "&q=" + encodeURIComponent(q + " Queensland"))
      .then(function (r) { return r.json(); })
      .then(function (j) { return (j.features || []).filter(function (f) { return (f.properties || {}).countrycode === "AU"; }).map(photonToAddr); })
      .catch(function () { return []; });
  }
  var cache = {};
  function locate(street, suburb, postcode) {
    var key = [street, suburb, postcode].join("|").toLowerCase();
    if (cache[key]) return cache[key];
    var q = [street, suburb, "QLD", postcode, "Australia"].filter(Boolean).join(", ");
    cache[key] = fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=au&limit=1&addressdetails=1&q=" + encodeURIComponent(q))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j[0]) {
          var a = j[0].address || {};
          var sub = a.suburb || a.town || a.village || a.hamlet || a.city || "";
          // Make sure the result is actually in the suburb they typed (stops a wrong same-named street matching)
          if (suburb && sub && norm(sub).indexOf(norm(suburb)) < 0 && norm(suburb).indexOf(norm(sub)) < 0 && !(a.postcode && a.postcode === postcode)) return null;
          return { lat: +j[0].lat, lng: +j[0].lon, exact: !!a.house_number, label: j[0].display_name };
        }
        return null;
      })
      .catch(function () { return null; });
    return cache[key];
  }

  window.Delivery = { match: match, suggest: suggest, locate: locate, inside: inside, centre: CENTRE, zones: ZONES };
})();
