export const money = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);
export function safeUrl(value) {
  if (!value) return "";
  try {
    const u = new URL(value);
    return u.protocol === "https:" ? u.href : "";
  } catch {
    return "";
  }
}
export function socialUrl(value) {
  const u = safeUrl(value);
  if (!u) return "";
  const host = new URL(u).hostname.toLowerCase();
  return [
    "instagram.com",
    "www.instagram.com",
    "facebook.com",
    "www.facebook.com",
    "m.facebook.com",
    "fb.watch",
    "youtube.com",
    "www.youtube.com",
    "youtu.be",
  ].includes(host)
    ? u
    : "";
}
export function mediaUrl(value) {
  return /^\/images\/[a-zA-Z0-9._-]+$/.test(value || "")
    ? value
    : safeUrl(value);
}
export function whatsappUrl(number, message) {
  const n = String(number || "").replace(/[\s()+-]/g, "");
  if (!/^[1-9]\d{7,14}$/.test(n)) return "";
  return `https://wa.me/${n}?text=${encodeURIComponent(message)}`;
}
export function embedUrl(value) {
  const safe = socialUrl(value);
  if (!safe) return "";
  const u = new URL(safe);
  let id = "";
  if (u.hostname === "youtu.be") id = u.pathname.slice(1);
  else if (u.hostname.includes("youtube.com"))
    id =
      u.searchParams.get("v") || u.pathname.split("/").filter(Boolean)[1] || "";
  if (/^[\w-]{11}$/.test(id))
    return `https://www.youtube-nocookie.com/embed/${id}?playsinline=1`;
  if (
    ["facebook.com", "www.facebook.com", "m.facebook.com"].includes(u.hostname)
  )
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(safe)}&show_text=false`;
  if (
    u.hostname.includes("instagram.com") &&
    /^\/(p|reel)\/[\w-]+/.test(u.pathname)
  )
    return `https://www.instagram.com${u.pathname.replace(/\/$/, "")}/embed/`;
  return "";
}
export const slugify = (s) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
export function searchable(item) {
  return [
    item.title,
    item.description,
    item.tags,
    item.category_id?.replaceAll("-", " "),
    item.subcategory_id?.replaceAll("-", " "),
    item.location,
    item.seller?.name,
    ...Object.values(item.attributes || {}),
    ...Object.values(item.socials || {}),
    ...(item.videos || []).flatMap((v) => [v.url, v.title]),
    ...(item.commerce?.variants || []).map((v) => v.label),
  ]
    .join(" ")
    .toLowerCase();
}
export function normalizeImport(row, seller, categories) {
  const category = categories.find(
    (c) =>
      c.id === row.category ||
      c.name.toLowerCase() === String(row.category).toLowerCase(),
  );
  if (!category) throw Error("Unknown category");
  const child = row.subcategory
    ? (category.subcategories || []).find(
        (s) =>
          s.id === row.subcategory ||
          s.name.toLowerCase() === String(row.subcategory).toLowerCase(),
      )
    : null;
  if (row.subcategory && !child)
    throw Error("Subcategory does not belong to selected category");
  if (!row.sku?.trim()) throw Error("SKU is required");
  if (!row.title || row.title.trim().length < 3)
    throw Error("Title must have at least 3 characters");
  if (
    row.price === "" ||
    !Number.isFinite(Number(row.price)) ||
    Number(row.price) < 0
  )
    throw Error("Invalid price");
  const images = (row.images || "")
    .split("|")
    .filter(Boolean)
    .map((x) => safeUrl(x.trim()));
  if (!images.length || images.some((x) => !x))
    throw Error("Add valid HTTPS image URLs");
  if (images.length > 12) throw Error("Maximum 12 photos");
  const social = row.social_url ? socialUrl(row.social_url) : "";
  if (row.social_url && !social) throw Error("Unsupported social URL");
  const condition = row.condition || "New";
  if (!["New", "Used", "Refurbished"].includes(condition))
    throw Error("Invalid condition");
  return {
    seller_id: seller.id,
    sku: row.sku.trim(),
    title: row.title.trim(),
    description: row.description || "",
    price: Number(row.price),
    category_id: category.id,
    subcategory_id: child?.id || null,
    condition,
    location: row.location || seller.location,
    images,
    socials: social ? { post: social } : {},
    tags: row.tags || "",
    status: "draft",
  };
}
