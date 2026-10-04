import React from "react";
import { constructionCategories, isConstructionCategory } from "../lib/categories";

export function CategoryOptions({ categories }) {
  let shownConstruction = false;
  return categories.map((category) => {
    if (!isConstructionCategory(category))
      return <option key={category.id} value={category.id}>{category.name}</option>;
    if (shownConstruction) return null;
    shownConstruction = true;
    return (
      <optgroup key="construction-department" label="Construction">
        {constructionCategories(categories).map((child) => (
          <option key={child.id} value={child.id}>{child.name}</option>
        ))}
      </optgroup>
    );
  });
}
