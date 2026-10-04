import { templates } from "./templates.js";

export const storefrontColors = {
  theme: { label: "Template default", value: "var(--accent)" },
  forest: { label: "Forest", value: "#064b3b" },
  indigo: { label: "Indigo", value: "#304c78" },
  terracotta: { label: "Terracotta", value: "#a34830" },
  plum: { label: "Plum", value: "#713e5a" },
  charcoal: { label: "Charcoal", value: "#33424a" },
};
export const storefrontFonts = {
  classic: { label: "Classic", value: '"DM Sans", sans-serif' },
  editorial: { label: "Editorial", value: 'Georgia, "Times New Roman", serif' },
};
export const storefrontSections = ["about", "gallery", "video"];

export function storefrontSettings(seller = {}) {
  const settings = seller.storefront || {};
  return {
    headline:
      settings.headline ||
      templates[seller.theme]?.headline ||
      seller.name ||
      "Welcome",
    tagline: settings.tagline || "Discover our collection",
    introduction: settings.introduction || seller.description || "",
    color: Object.hasOwn(storefrontColors, settings.color)
      ? settings.color
      : "theme",
    font: Object.hasOwn(storefrontFonts, settings.font)
      ? settings.font
      : "classic",
    videoUrl: settings.videoUrl || "",
    gallery: Array.isArray(settings.gallery)
      ? settings.gallery.slice(0, 6)
      : [],
    sections: [
      ...new Set([
        ...(Array.isArray(settings.sections) ? settings.sections : []),
        ...storefrontSections,
      ]),
    ].filter((s) => storefrontSections.includes(s)),
    showAbout: settings.showAbout !== false,
    showGallery: settings.showGallery !== false,
    showVideo: settings.showVideo !== false,
  };
}

export const shopPath = (slug) => `/shop/${slug}`;
