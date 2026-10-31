// ==== Southerden's site settings ====
window.SITE = {
  // Where finished orders are sent. Paste a form endpoint from Formspree (formspree.io)
  // or your web host's form handler, e.g. "https://formspree.io/f/abcdwxyz".
  // While empty, checkout asks customers to phone instead.
  orderEndpoint: "",

  // Optional: a Square or Stripe payment page. When set, customers go there to pay
  // after placing the order. While empty, the shop takes payment by phone.
  paymentLink: "",

  phone: "07 4638 3622",
  cutoffHour: 14 // same-day delivery cut-off (2pm, Mon–Fri)
};
