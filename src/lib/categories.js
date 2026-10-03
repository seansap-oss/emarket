import catalog from "./category-catalog.json" with { type: "json" };
export const categoryCatalog = catalog;
export const subcategoriesFor = (categories, id) =>
  categories.find((c) => c.id === id)?.subcategories || [];
export const categoryName = (categories, id) =>
  categories.find((c) => c.id === id)?.name || id;
export const subcategoryName = (categories, parent, id) =>
  subcategoriesFor(categories, parent).find((s) => s.id === id)?.name || "";
export const categoryMatches = (category, query) =>
  [
    category.name,
    category.id,
    ...(category.subcategories || []).flatMap((s) => [s.name, s.id]),
  ]
    .join(" ")
    .toLowerCase()
    .includes(query.trim().toLowerCase());
