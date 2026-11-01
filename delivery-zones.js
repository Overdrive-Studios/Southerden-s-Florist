// ==== Southerden's delivery zones ====
// This one file controls delivery fees at checkout AND the area lists on the Delivery page.
//
// How it works: at checkout the customer enters a suburb/town and postcode.
// The site looks for the suburb in each zone below (top to bottom), then the postcode.
// The first match decides the delivery fee. If nothing matches, the order can still be
// placed and is flagged "delivery cost to be confirmed" so the shop can call them.
//
// To add an area: put its name in a zone's "suburbs" list (spelling doesn't need
// capitals). To cover every suburb in a postcode at once, add the postcode to "postcodes".
// type: "free" = no charge, "extra" = our own driver with a fee, "courier" = handed to a courier.

window.DELIVERY_ZONES = [
  {
    id: "local",
    name: "Toowoomba local delivery",
    type: "free",
    fee: 0,
    note: "Same-day delivery when ordered by 2pm Monday to Friday.",
    sameDay: true,
    // Areas listed on the old website. Postcode 4350 covers all Toowoomba suburbs.
    suburbs: [
      "Toowoomba", "Highfields", "Middle Ridge", "Rangeville", "Centenary Heights",
      "Darling Heights", "Glenvale", "Newtown", "Wilsonton", "Kingsthorpe",
      "Gowrie Junction", "Hodgsonvale", "Withcott", "Mount Lofty", "Top Camp",
      "Preston", "Ramsay", "Geham", "Cabarlah", "Glencoe", "Meringandan", "Oakey"
    ],
    postcodes: ["4350"]
  },
  {
    id: "extra",
    name: "Outer area delivery",
    type: "extra",
    fee: 0,            // e.g. 15  ->  $15.00 added to the order
    note: "Delivered by our own driver. Same-day when ordered by 2pm Monday to Friday.",
    sameDay: true,
    suburbs: [],       // e.g. "Crows Nest", "Pittsworth"
    postcodes: []      // e.g. "4355"
  },
  {
    id: "courier",
    name: "Courier delivery",
    type: "courier",
    fee: 0,            // e.g. 30
    note: "Handed to a courier partner. Usually delivered the next business day.",
    sameDay: false,    // false = earliest delivery date is the next business day
    suburbs: [],       // e.g. "Dalby", "Warwick"
    postcodes: []
  }
];

// Shown when an address isn't in any zone above.
window.DELIVERY_UNKNOWN = {
  name: "Outside our listed areas",
  note: "We'll call you to confirm delivery options and any cost before your order goes out."
};
