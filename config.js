// ==== Southerden's site settings ====
window.SITE = {
  // Where finished orders are emailed. Paste the shop's Web3Forms access key here
  // (from web3forms.com, created with the shop's email address).
  // While both this and orderEndpoint are empty, checkout asks customers to phone instead.
  web3formsKey: "",

  // Alternative to Web3Forms: a Formspree form address, e.g. "https://formspree.io/f/abcdwxyz".
  orderEndpoint: "",

  // Optional: a Square or Stripe payment page. When set, customers can choose to pay
  // online after placing the order. While empty, the shop takes payment by phone.
  paymentLink: "",

  // Optional: a free Geoapify key (geoapify.com, sign up with the shop email, no card needed).
  // Makes the street search at checkout faster and more reliable. Leave empty to use OpenStreetMap's free search.
  geoapifyKey: "",

  // Days with no deliveries (public holidays, shop closures). Format "YYYY-MM-DD".
  // Customers can't pick these at checkout. Add your own, e.g. a Christmas break.
  closedDates: [
    "2026-12-25", "2026-12-26", "2026-12-28",                               // Christmas 2026
    "2027-01-01", "2027-01-26", "2027-03-26", "2027-03-27", "2027-03-29",  // New Year, Australia Day, Easter
    "2027-04-26", "2027-05-03", "2027-10-04",                               // Anzac Day, Labour Day, King's Birthday
    "2027-12-24", "2027-12-27", "2027-12-28"                                // Christmas 2027
  ],

  phone: "07 4638 3622",
  cutoffHour: 14 // same-day delivery cut-off (2pm, Mon–Fri)
};
