// Public showcase catalogue. Fictional shops and illustrative prices; no seller contacts.
import { categoryCatalog } from "./categories.js";
export const categories = categoryCatalog;
export const plans = [
  ["free", "Free", 0, 3],
  ["starter", "Starter", 500, 50],
  ["growth", "Growth", 1000, 250],
  ["business", "Business", 2000, 1000],
  ["catalogue", "Large catalogue", 5000, 15000],
].map(([id, name, price, listing_limit]) => ({
  id,
  name,
  price,
  listing_limit,
  active: true,
}));
export const settings = {
  name: "Onlinekeithel",
  tagline: "Our people. Our neighbourhood.",
  hero_title: "Your neighbourhood. Every shop.",
  hero_description:
    "A little closer. A little more local. Discover great finds from the people and shops around you.",
  hero_image: "/images/hero-handloom.webp",
  announcement: "Made for Manipur. Open to everyone.",
  support_whatsapp: "",
  support_email: "",
  ads_price_note: "Get in touch for featured placement prices.",
};
export const sellers = [
  {
    id: "sample-handlooms",
    name: "Leikai Handlooms",
    slug: "leikai-handlooms",
    theme: "fashion",
    type: "shop",
    location: "Khurai, Imphal",
    cover: "/images/hero-handloom.webp",
    storefront: {
      headline: "Woven for every day.",
      tagline: "LEIKAI HANDLOOMS · IMPHAL",
      color: "plum",
      font: "editorial",
      introduction:
        "Thoughtful handloom pieces and everyday textiles from our local makers.",
      gallery: ["/images/phanek.webp", "/images/hero-handloom.webp"],
    },
    description:
      "Woven with care. Discover traditional phanek, shawls and everyday textiles from local makers.",
    socials: {},
    whatsapp: "",
  },
  {
    id: "sample-mobiles",
    name: "Mobile Planet",
    slug: "mobile-planet",
    theme: "electronics",
    type: "shop",
    location: "Keishampat, Imphal",
    cover: "/images/phone.jpg",
    storefront: {
      headline: "The tech you need, close to home.",
      color: "indigo",
    },
    description: "Phones, accessories and everyday technology, close to home.",
    socials: {},
    whatsapp: "",
  },
  {
    id: "sample-motors",
    name: "Imphal Motors",
    slug: "imphal-motors",
    theme: "vehicles",
    type: "shop",
    location: "Thangal Bazaar, Imphal",
    cover: "/images/car.jpg",
    description:
      "Explore local cars and two-wheelers. Contact us to arrange a viewing.",
    socials: {},
    whatsapp: "",
  },
  {
    id: "sample-home",
    name: "HomeHome Imphal",
    slug: "homehome-imphal",
    theme: "general",
    type: "shop",
    location: "Uripok, Imphal",
    cover: "/images/chair.jpg",
    description: "Considered pieces for the place you call home.",
    socials: {},
    whatsapp: "",
  },
];
export const listings = [
  [
    "sample-1",
    "iPhone · 128 GB",
    39900,
    "mobiles",
    "phone.jpg",
    1,
    "Used",
    { Brand: "Apple", Storage: "128 GB" },
  ],
  [
    "sample-2",
    "Handwoven Manipuri Phanek",
    2850,
    "fashion",
    "phanek.webp",
    0,
    "New",
    { Material: "Cotton", Colour: "Magenta" },
  ],
  [
    "sample-3",
    "Pre-owned sports coupe",
    3250000,
    "vehicles",
    "car.jpg",
    2,
    "Used",
    { Year: "2019", Fuel: "Petrol" },
  ],
  [
    "sample-4",
    "Natural wood stool",
    6800,
    "home",
    "chair.jpg",
    3,
    "New",
    { Material: "Solid wood" },
  ],
  [
    "sample-5",
    "Everyday over-ear headphones",
    2490,
    "electronics",
    "headphones.jpg",
    1,
    "New",
    { Brand: "Local collection" },
  ],
  [
    "sample-6",
    "The weekend edit",
    1450,
    "fashion",
    "fashion.jpg",
    0,
    "New",
    { Size: "S–XL" },
  ],
].map(([id, title, price, category_id, img, si, condition, attributes]) => ({
  id,
  title,
  price,
  category_id,
  images: ["/images/" + img],
  seller_id: sellers[si].id,
  seller: sellers[si],
  location: sellers[si].location,
  condition,
  attributes,
  description:
    "Visit the seller to learn more about this item, availability and collection options.",
  status: "published",
  socials: {},
  tags: "",
  created_at: "2026-10-03T04:00:00Z",
}));

sellers.push({
  id: "sample-rides",
  name: "Leikai Rides",
  slug: "leikai-rides",
  theme: "motorcycles",
  type: "shop",
  location: "Singjamei, Imphal",
  cover: "/images/motorcycle.jpg",
  description:
    "Roadsters and touring motorcycles. Explore the Ride storefront template.",
  socials: {},
  whatsapp: "",
});
export const collections = sellers.flatMap((seller, index) => {
  const names = [
    ["Handloom", "Everyday clothing"],
    ["Phones", "Audio & accessories"],
    ["Pre-owned cars", "Premium selection"],
    ["Home & living", "Everyday essentials"],
    ["Roadsters", "Touring"],
  ][index];
  return names.map((name, position) => ({
    id: `${seller.id}-collection-${position}`,
    seller_id: seller.id,
    name,
    position,
  }));
});
const extras = [
  [
    "Cotton everyday T-shirt",
    650,
    "fashion",
    "tshirt.jpg",
    0,
    { Size: "S–XL", Material: "Cotton" },
    1,
  ],
  [
    "Handloom festive edit",
    3200,
    "fashion",
    "phanek.webp",
    0,
    { Material: "Cotton", Colour: "Magenta" },
    0,
  ],
  [
    "Smartphone collection · 256 GB",
    45900,
    "mobiles",
    "phone.jpg",
    1,
    { Storage: "256 GB", Condition: "Illustrative model" },
    0,
  ],
  [
    "Wireless listening collection",
    3490,
    "electronics",
    "headphones.jpg",
    1,
    { Connectivity: "Bluetooth", Warranty: "Confirm with seller" },
    1,
  ],
  [
    "Premium coupe selection",
    3650000,
    "vehicles",
    "car.jpg",
    2,
    { Year: "2020", Fuel: "Petrol", Kilometres: "24000" },
    1,
  ],
  [
    "Weekend coupe collection",
    2950000,
    "vehicles",
    "car.jpg",
    2,
    { Year: "2018", Fuel: "Petrol", Kilometres: "42000" },
    0,
  ],
  [
    "Compact stool · natural finish",
    4200,
    "home",
    "chair.jpg",
    3,
    { Material: "Wood" },
    0,
  ],
  [
    "Everyday cotton basics",
    550,
    "retail",
    "tshirt.jpg",
    3,
    { Material: "Cotton" },
    1,
  ],
  [
    "Classic roadster collection",
    185000,
    "motorcycles",
    "motorcycle.jpg",
    4,
    { Engine: "350 cc", Year: "2021", Kilometres: "12000" },
    0,
  ],
  [
    "Touring motorcycle selection",
    245000,
    "motorcycles",
    "motorcycle.jpg",
    4,
    { Engine: "500 cc", Year: "2022", Kilometres: "8000" },
    1,
  ],
  [
    "Weekend roadster collection",
    155000,
    "motorcycles",
    "motorcycle.jpg",
    4,
    { Engine: "350 cc", Year: "2020", Kilometres: "18000" },
    0,
  ],
];
extras.forEach(
  ([title, price, category_id, img, si, attributes, collection], index) =>
    listings.push({
      id: `sample-extra-${index}`,
      title,
      price,
      category_id,
      images: ["/images/" + img],
      seller_id: sellers[si].id,
      seller: sellers[si],
      location: sellers[si].location,
      condition: ["vehicles", "motorcycles"].includes(category_id)
        ? "Used"
        : "New",
      attributes,
      status: "published",
      socials: {},
      tags: "sample demo " + category_id,
      created_at: "2026-10-03T04:00:00Z",
      collection_id: `${sellers[si].id}-collection-${collection}`,
    }),
);
sellers.forEach((seller) => {
  seller.sample = true;
});
listings.forEach((item, index) => {
  item.sample = true;
  item.collection_id ||= `${item.seller_id}-collection-${index === 4 || index === 5 ? 1 : 0}`;
  item.description =
    "Sample listing with an illustrative price and photograph, showing how your own products will appear. This item is not offered for sale. Replace samples with your own catalogue when account services are connected.";
});

listings.forEach((item) => {
  item.subcategory_id ||=
    categories.find((c) => c.id === item.category_id)?.subcategories[0]?.id ||
    null;
});
// Map sample products to meaningful browse filters.
const sampleSubcategory = {
  "sample-1": "smartphones",
  "sample-2": "traditional-phanek-innaphi",
  "sample-3": "luxury-sports-cars",
  "sample-4": "tables-desks",
  "sample-5": "headphones-speakers",
  "sample-6": "women-s-clothing",
  "sample-extra-0": "t-shirts-tops",
  "sample-extra-1": "traditional-phanek-innaphi",
  "sample-extra-2": "smartphones",
  "sample-extra-3": "headphones-speakers",
  "sample-extra-4": "luxury-sports-cars",
  "sample-extra-5": "luxury-sports-cars",
  "sample-extra-6": "tables-desks",
  "sample-extra-7": "daily-essentials",
  "sample-extra-8": "roadsters",
  "sample-extra-9": "touring-adventure-bikes",
  "sample-extra-10": "roadsters",
};
listings.forEach((item) => {
  item.subcategory_id = sampleSubcategory[item.id] || item.subcategory_id;
});

// Interactive options are illustrative; all sample purchase/contact actions remain disabled.
listings.forEach((item) => {
  item.commerce = {
    mode: ["vehicles", "motorcycles"].includes(item.category_id)
      ? "enquiry"
      : "retail",
    stock: 8,
    variants: [],
    unit: "item",
    delivery: "Collection or local delivery · arrange with seller",
  };
  if (["vehicles", "motorcycles"].includes(item.category_id)) {
    item.commerce.stock = 1;
    item.attributes = {
      Transmission: "Manual",
      Owners: "First owner",
      "Service history": "Full records",
      "Accident history": "None declared",
      ...item.attributes,
    };
  }
});
const tee = listings.find((x) => x.id === "sample-extra-0");
delete tee.attributes.Size;
tee.images = ["front", "back", "left", "right"].map(
  (view) => "/images/shirt-" + view + ".svg",
);
tee.commerce.variants = ["XS", "S", "M", "L", "XL", "XXL"].map((label, i) => ({
  id: "size-" + label,
  label,
  stock: i === 4 ? 0 : i + 2,
  price: null,
}));
tee.description =
  "Sample garment illustrations show the front, back and side gallery. Hover the cover photo or use the thumbnails. Choose a size and quantity to preview a WhatsApp enquiry. Not for sale.";

const variety = sellers.find((s) => s.id === "sample-home");
variety.description =
  "A neighbourhood variety shop: furniture, household goods, batteries and toys. Browse a category or a shop collection to find what you need.";
[
  [
    "batteries",
    "AA rechargeable batteries",
    399,
    "retail",
    "household-supplies",
  ],
  ["toy", "Wooden building blocks", 699, "kids", "toys-games"],
].forEach(([key, title, price, category_id, subcategory_id]) => {
  // Resolve the children's subcategory from the catalogue to retain stable mapping.
  if (key === "toy")
    subcategory_id = categories
      .find((c) => c.id === "kids")
      .subcategories.find((s) => s.name.toLowerCase().includes("toy")).id;
  listings.push({
    id: "sample-variety-" + key,
    title,
    price,
    category_id,
    subcategory_id,
    images: ["/images/sample-" + key + ".svg"],
    seller_id: variety.id,
    seller: variety,
    location: variety.location,
    condition: "New",
    attributes: { Brand: "Sample" },
    status: "published",
    socials: {},
    tags: "sample variety store " + key,
    sample: true,
    created_at: "2026-10-03T04:00:00Z",
    collection_id: variety.id + "-collection-0",
    description:
      "Illustrative sample showing mixed-category products in one shop. Not for sale.",
    commerce: {
      mode: "retail",
      stock: key === "toy" ? 0 : 12,
      variants: [],
      unit: "pack",
      delivery: "Collection or local delivery",
    },
  });
});
