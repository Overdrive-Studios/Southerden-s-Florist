// ==== Southerden's delivery zones ====
// Controls delivery fees at checkout and the area lists on the Delivery page.
// Fees and cut-off times below come from the old website's delivery list.
//
// HOW AN ADDRESS IS MATCHED
// 1. The customer's street address is looked up on the map to get its exact location.
// 2. If that location is inside a drawn "area" of a zone, that zone's fee applies
//    (zones are checked top to bottom, so put the more specific ones first).
// 3. Otherwise the suburb name is checked against each zone's "suburbs" list.
// 4. If nothing matches, the order still goes through, flagged "delivery cost to be confirmed".
//
// type: "free" = delivery included, "extra" = our own driver with a fee, "courier" = handed to a courier.
// cutoffHour: latest order time (24h) for same-day delivery in that zone. Default is 14 (2pm).
// sameDay: false = earliest delivery date is the next business day.
// areas: list of shapes, each a list of [latitude, longitude] corner points.

function zone(id, fee, suburbs, cutoffHour) {
  return {
    id: id, name: "Outer area delivery", type: "extra", fee: fee, sameDay: true, cutoffHour: cutoffHour || 14,
    note: cutoffHour ? "Order by " + (cutoffHour > 12 ? cutoffHour - 12 + "pm" : cutoffHour === 12 ? "12pm" : cutoffHour + "am") + " Monday to Friday for same-day delivery." : "Same-day delivery when ordered by 2pm Monday to Friday.",
    areas: [], suburbs: suburbs
  };
}

window.DELIVERY_ZONES = [
  {
    id: "local",
    name: "Toowoomba local delivery",
    type: "free",
    fee: 0,
    sameDay: true,
    note: "Same-day delivery when ordered by 2pm Monday to Friday.",
    areas: [],
    suburbs: [
      "Toowoomba", "Toowoomba City", "East Toowoomba", "North Toowoomba", "South Toowoomba",
      "Highfields", "Ballard", "Blue Mountain Heights",
      "Middle Ridge", "Rangeville", "Centenary Heights", "Darling Heights", "Glenvale",
      "Newtown", "Wilsonton", "Wilsonton Heights", "Harristown", "Kearneys Spring", "Mount Lofty",
      "Harlaxton", "Rockville", "Drayton", "Redwood", "Prince Henry Heights", "Cranley", "Torrington"
    ]
  },
  zone("fee-5",     5,  ["Cabarlah", "Charlton", "Top Camp", "Withcott"]),
  zone("fee-5-12",  5,  ["Meringandan"], 12),
  zone("fee-8",     8,  ["Westbrook", "Wyreema"]),
  zone("fee-10",    10, ["Blanchview", "Derrymore", "Geham", "Gowrie Junction", "Hodgsonvale", "Iredale", "Kingsthorpe", "Mount Rascal", "Postmans Ridge", "Valeview"]),
  zone("fee-10-9",  10, ["Pittsworth"], 9),
  zone("fee-15",    15, ["Athol", "Gowrie Mountain", "Preston", "Ramsay", "Southbrook", "Umbiram", "Upper Lockyer"]),
  zone("fee-15-10", 15, ["Clifton", "Crows Nest", "Greenmount", "Helidon", "Murphys Creek"], 10),
  zone("fee-15-12", 15, ["Grantham"], 12),
  zone("fee-20",    20, ["Cambooya", "Hampton"]),
  zone("fee-20-10", 20, ["Goombungee"], 10),
  zone("fee-20-12", 20, ["Gatton"], 12),
  zone("fee-20-9",  20, ["Millmerran"], 9),
  zone("fee-25",    25, ["Oakey"])
];

// Shown when an address isn't in any zone above.
window.DELIVERY_UNKNOWN = {
  name: "Outside our listed areas",
  note: "We'll call you to confirm delivery options and cost before your order goes out. Orders to other Australian locations are usually $18."
};
