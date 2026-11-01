// Add-on extras: can only be ordered together with a flower order.
// Each extra has a main choice ["Name", price, optional photo] and optionally a second choice (e.g. colour).
window.EXTRAS = [
  {
    id: "x-balloon", name: "Helium balloon", img: "helium_balloons_000.jpg",
    desc: "A large foil helium balloon, $25 each.",
    pick: { label: "Message", choices: [
      ["Happy birthday", 25], ["18th birthday", 25], ["21st birthday", 25], ["40th birthday", 25],
      ["Happy anniversary", 25], ["Congratulations", 25], ["Get well", 25], ["Thinking of you", 25],
      ["I love you", 25], ["Valentine's Day", 25], ["It's a boy", 25], ["It's a girl", 25], ["Smiley face", 25]
    ] }
  },
  {
    id: "x-chocolates", name: "Chocolates", img: "l_roses-chocs_20180610171710.jpg",
    desc: "A box of chocolates to go with the flowers.",
    pick: { label: "Chocolates", choices: [
      ["Lindt chocolates 150g", 22, "lindt_assorted_235g.jpg"],
      ["Lindt chocolates 235g", 30, "lindt_assorted_235g_000.jpg"],
      ["Cadbury Roses 220g", 20, "l_roses-chocs_20180610171710.jpg"],
      ["Cadbury Roses 380g", 30, "l_roses-chocs_20180610171710.jpg"],
      ["Cadbury Milk Tray 360g", 35]
    ] }
  },
  {
    id: "x-wine", name: "Wine", img: "3_4_000.jpg",
    desc: "Australian wine, sparkling or Champagne.",
    pick: { label: "Wine", choices: [
      ["Red Australian wine", 28], ["White Australian wine", 28], ["Sparkling Australian wine", 35],
      ["Imported Champagne", 99], ["Moët & Chandon", 149]
    ] }
  },
  {
    id: "x-plush", name: "Plush toy", img: "dsc_5770_000.jpg",
    desc: "A soft and cuddly plush toy.",
    pick: { label: "Size", choices: [["Small", 20], ["Large", 35], ["Larger", 60]] },
    pick2: { label: "Colour", choices: ["Blue", "Pink", "Brown", "Tan"] }
  }
];
