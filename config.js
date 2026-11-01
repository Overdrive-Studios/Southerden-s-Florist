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

  phone: "07 4638 3622",
  cutoffHour: 14 // same-day delivery cut-off (2pm, Mon–Fri)
};
