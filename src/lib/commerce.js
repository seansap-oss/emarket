import { safeUrl, socialUrl, normalizeImport } from "./utils.js";
export const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];
export const vehicleFields = [
  "Make",
  "Model",
  "Year",
  "Kilometres",
  "Fuel",
  "Transmission",
  "Owners",
  "Body type",
  "Engine capacity",
  "Registration year",
  "Insurance until",
  "Service history",
  "Accident history",
];
export const fieldOptions = {
  Fuel: ["Petrol", "Diesel", "Electric", "Hybrid", "CNG", "LPG"],
  Transmission: ["Manual", "Automatic", "AMT", "CVT", "DCT"],
  Owners: ["First owner", "Second owner", "Third owner", "Fourth or more"],
  "Service history": ["Full records", "Partial records", "No records"],
  "Accident history": ["None declared", "Repaired damage", "Not known"],
};
export const isVehicle = (id) => ["vehicles", "motorcycles"].includes(id);
export function productFields(category) {
  return isVehicle(category?.id)
    ? [...new Set([...(category.fields || []), ...vehicleFields])]
    : (category?.fields || []).filter((k) => category?.id !== "fashion" || k !== "Size");
}
export function commerceFor(item) {
  const c = item?.commerce || {};
  return {
    mode: c.mode || "enquiry",
    stock: c.stock ?? null,
    variants: c.variants || [],
    unit: c.unit || "item",
    delivery: c.delivery || "Arrange with seller",
    ...c,
  };
}
export function stockFor(item, variantId = "") {
  const c = commerceFor(item);
  if (item.status && item.status !== "published") return 0;
  if (c.variants.length)
    return c.variants.find((v) => v.id === variantId)?.stock ?? 0;
  return c.stock;
}
export function outOfStock(item) {
  const c = commerceFor(item);
  return (
    (item.status && item.status !== "published") ||
    (c.variants.length ? c.variants.every((v) => v.stock === 0) : c.stock === 0)
  );
}
export function selectedPrice(item, variantId = "") {
  return (
    commerceFor(item).variants.find((v) => v.id === variantId)?.price ??
    Number(item.price)
  );
}
export function validateSelection(item, variantId, quantity) {
  if (outOfStock(item))
    throw Error("This item is out of stock or unavailable.");
  const c = commerceFor(item);
  if (c.variants.length && !c.variants.some((v) => v.id === variantId))
    throw Error("Choose an available size or option.");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999)
    throw Error("Choose a quantity from 1 to 999.");
  if (
    stockFor(item, variantId) !== null &&
    quantity > stockFor(item, variantId)
  )
    throw Error("Quantity exceeds the available stock.");
  if (c.mode === "enquiry" && quantity !== 1)
    throw Error("This listing is available by enquiry only.");
  return true;
}
export function normalizeCommerce(raw = {}) {
  const c = commerceFor({ commerce: raw });
  if (!["enquiry", "retail"].includes(c.mode))
    throw Error("Choose a valid selling mode.");
  const integer = (v) => Number.isInteger(v) && v >= 0 && v <= 1000000;
  if (c.stock !== null && !integer(c.stock))
    throw Error("Stock must be a whole number from 0 to 1,000,000.");
  if (!Array.isArray(c.variants) || c.variants.length > 100)
    throw Error("Use at most 100 options per product.");
  const keys = new Set();
  const variants = c.variants.map((v) => {
    const label = String(v.label || "").trim();
    if (
      !label ||
      label.length > 80 ||
      !/^[\w-]{1,64}$/.test(v.id || "") ||
      keys.has(label.toLowerCase()) ||
      !integer(v.stock)
    )
      throw Error("Each option needs a unique name and a valid stock count.");
    keys.add(label.toLowerCase());
    if (
      v.price !== null &&
      v.price !== undefined &&
      (!Number.isFinite(v.price) || v.price < 0 || v.price > 9999999999.99)
    )
      throw Error("Option price is invalid.");
    return { id: v.id, label, stock: v.stock, price: v.price ?? null };
  });
  if (new Set(variants.map((v) => v.id)).size !== variants.length)
    throw Error("Option IDs must be unique.");
  return {
    mode: c.mode,
    stock: c.stock,
    variants,
    unit: String(c.unit).slice(0, 40),
    delivery: String(c.delivery).slice(0, 500),
  };
}
export function directVideoUrl(value) {
  const u = safeUrl(value);
  return u && /\.(mp4|webm)$/i.test(new URL(u).pathname) ? u : "";
}
export function normalizeVideos(videos = []) {
  if (!Array.isArray(videos) || videos.length > 6)
    throw Error("Add up to six video links.");
  return videos
    .filter((v) => v.url?.trim())
    .map((v) => {
      const url = socialUrl(v.url) || directVideoUrl(v.url);
      if (!url)
        throw Error(
          "Use a YouTube, Instagram, Facebook, HTTPS MP4 or WebM video URL.",
        );
      return { url, title: String(v.title || "Product video").slice(0, 100) };
    });
}
export function normalizePayments(p = {}) {
  const upi_id = String(p.upi_id || "").trim();
  if (upi_id && !/^[a-zA-Z0-9._-]{2,255}@[a-zA-Z0-9.-]{2,64}$/.test(upi_id))
    throw Error("Enter a valid UPI ID, for example shop@bank.");
  if (p.upi_qr && !safeUrl(p.upi_qr))
    throw Error("UPI QR image must use HTTPS.");
  return {
    upi_id,
    upi_name: String(p.upi_name || "")
      .trim()
      .slice(0, 100),
    upi_qr: p.upi_qr || "",
    cash_on_collection: !!p.cash_on_collection,
    cash_on_delivery: !!p.cash_on_delivery,
    instructions: String(p.instructions || "").slice(0, 500),
  };
}

export function normalizeProductImport(row, seller, categories) {
  const data = normalizeImport(row, seller, categories);
  if (
    ["selling_mode", "stock", "variants_json", "unit", "delivery"].some((k) =>
      Object.hasOwn(row, k),
    )
  ) {
    let variants = [];
    try {
      variants = row.variants_json ? JSON.parse(row.variants_json) : [];
    } catch {
      throw Error("variants_json must be a JSON array.");
    }
    data.commerce = normalizeCommerce({
      mode: row.selling_mode || "retail",
      stock: row.stock?.trim() ? Number(row.stock) : null,
      variants,
      unit: row.unit || "item",
      delivery: row.delivery || "Arrange with seller",
    });
  }
  if (Object.hasOwn(row, "video_urls"))
    data.videos = normalizeVideos(
      (row.video_urls || "")
        .split("|")
        .filter(Boolean)
        .map((url) => ({ url: url.trim(), title: "Product video" })),
    );
  if (row.attributes_json) {
    try {
      data.attributes = JSON.parse(row.attributes_json);
    } catch {
      throw Error("attributes_json must be a JSON object.");
    }
    if (
      !data.attributes ||
      typeof data.attributes !== "object" ||
      Array.isArray(data.attributes) ||
      Object.values(data.attributes).some(
        (v) => typeof v !== "string" && typeof v !== "number",
      )
    )
      throw Error("Category attributes must contain text or numeric values.");
  }
  return data;
}
