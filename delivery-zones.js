// ==== Southerden's delivery zones ====
// Controls delivery fees at checkout, the area lists on the Delivery page,
//
// HOW AN ADDRESS IS MATCHED
// 1. The customer's street address is looked up on the map to get its exact location.
// 2. Zones are checked top to bottom. A zone matches if the location is inside one of its
//    drawn "areas", or within "maxKm" of the shop (straight-line distance).
// 3. If the address can't be found on the map, the suburb name is checked against "suburbs".
// 4. If nothing matches, the order still goes through, flagged "delivery cost to be confirmed".
//
// type: "free" = no charge, "extra" = our own driver with a fee, "courier" = handed to a courier.
// sameDay: false = earliest delivery date is the next business day.
// areas: list of shapes, each a list of [latitude, longitude] corner points.

window.DELIVERY_SHOP = {
  name: "Southerden's Florist",
  address: "Highfields QLD",
  lat: -27.4494276,
  lng: 151.9453192
};

window.DELIVERY_ZONES = [
  {
    id: "local",
    name: "Toowoomba local delivery",
    type: "free",
    fee: 0,
    sameDay: true,
    note: "Same-day delivery when ordered by 2pm Monday to Friday.",
    maxKm: 0,          // e.g. 20 -> anywhere within 20 km of the shop
    areas: [],
    // Used only when an address can't be found on the map.
    suburbs: [
      "Toowoomba", "Toowoomba City", "East Toowoomba", "North Toowoomba", "South Toowoomba",
      "Highfields", "Middle Ridge", "Rangeville", "Centenary Heights",
      "Darling Heights", "Glenvale", "Newtown", "Wilsonton", "Kingsthorpe",
      "Gowrie Junction", "Hodgsonvale", "Withcott", "Mount Lofty", "Top Camp",
      "Preston", "Ramsay", "Geham", "Cabarlah", "Glencoe", "Meringandan", "Oakey"
    ]
  },
  {
    id: "extra",
    name: "Outer area delivery",
    type: "extra",
    fee: 0,            // e.g. 15  ->  $15.00 added to the order
    sameDay: true,
    note: "Delivered by our own driver. Same-day when ordered by 2pm Monday to Friday.",
    maxKm: 0,
    areas: [],
    suburbs: []
  },
  {
    id: "courier",
    name: "Courier delivery",
    type: "courier",
    fee: 0,            // e.g. 30
    sameDay: false,
    note: "Handed to a courier partner. Usually delivered the next business day.",
    maxKm: 0,
    areas: [],
    suburbs: []
  }
];

// Shown when an address isn't in any zone above.
window.DELIVERY_UNKNOWN = {
  name: "Outside our listed areas",
  note: "We'll call you to confirm delivery options and any cost before your order goes out."
};
