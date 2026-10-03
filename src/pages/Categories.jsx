import React, { useState } from "react";
import { useMarket, Link } from "../lib/context";
import { categoryMatches } from "../lib/categories";
import { CategoryIcon } from "../components/CategoryIcon";
export default function Categories() {
  const { categories } = useMarket();
  const [query, setQuery] = useState(""),
    [group, setGroup] = useState("");
  const active = categories.filter((c) => c.active !== false);
  const rows = active.filter(
    (c) => (!group || c.group_name === group) && categoryMatches(c, query),
  );
  return (
    <div className="page category-directory">
      <span className="eyebrow">
        FIND THE RIGHT LOCAL EXPERT, SHOP OR SUPPLIER
      </span>
      <h1>Everything in its right place.</h1>
      <p>
        Browse everyday finds, construction supplies, design professionals and
        local services.
      </p>
      <label className="category-search">
        Search categories and subcategories
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Try cement, architect, pallet racks or clothing"
        />
      </label>
      <div className="template-picker">
        <button className={!group ? "active" : ""} onClick={() => setGroup("")}>
          All departments
        </button>
        {[...new Set(active.map((c) => c.group_name).filter(Boolean))].map(
          (g) => (
            <button
              className={group === g ? "active" : ""}
              key={g}
              onClick={() => setGroup(g)}
            >
              {g}
            </button>
          ),
        )}
      </div>
      <p role="status">{rows.length} categories</p>
      <div className="category-directory-grid">
        {rows.map((c) => (
          <section className="category-directory-card" key={c.id}>
            <div className="category-card-heading">
              <span>
                <CategoryIcon name={c.icon} size={28} />
              </span>
              <div>
                <small>{c.group_name}</small>
                <h2>
                  <Link to={"/search?category=" + c.id}>{c.name}</Link>
                </h2>
              </div>
            </div>
            <ul>
              {(c.subcategories || []).map((s) => (
                <li key={s.id}>
                  <Link
                    to={
                      "/search?" +
                      new URLSearchParams({ category: c.id, subcategory: s.id })
                    }
                  >
                    <CategoryIcon name={s.icon || c.icon} size={16} />
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
            <Link className="category-view-all" to={"/search?category=" + c.id}>
              Browse all in this category →
            </Link>
          </section>
        ))}
      </div>
      {!rows.length && (
        <p>
          No matching category. Try a shorter search or select All departments.
        </p>
      )}
    </div>
  );
}
