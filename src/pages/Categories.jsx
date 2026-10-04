import React, { useState } from "react";
import { useMarket, Link } from "../lib/context";
import { categoryMatches, isConstructionCategory } from "../lib/categories";
import { CategoryIcon } from "../components/CategoryIcon";
export default function Categories() {
  const { categories } = useMarket();
  const [query, setQuery] = useState(""),
    [group, setGroup] = useState("");
  const active = categories.filter((c) => c.active !== false);
  const rows = active.filter(
    (c) => (!group || c.group_name === group) && categoryMatches(c, query),
  );
  const construction = rows.filter(isConstructionCategory);
  const other = rows.filter((c) => !isConstructionCategory(c));
  const card = (c) => (
    <section className="category-directory-card" key={c.id}>
      <div className="category-card-heading">
        <span><CategoryIcon name={c.icon} size={28} /></span>
        <div>
          <small>{isConstructionCategory(c) ? "Construction" : c.group_name}</small>
          <h2><Link to={"/search?category=" + c.id}>{c.name}</Link></h2>
        </div>
      </div>
      <ul>
        {(c.subcategories || []).map((s) => (
          <li key={s.id}>
            <Link to={"/search?" + new URLSearchParams({ category: c.id, subcategory: s.id })}>
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
              {g === "Build & industry" ? "Construction" : g}
            </button>
          ),
        )}
      </div>
      <p role="status">{rows.length} categories</p>
      {construction.length > 0 && (
        <section className="category-department">
          <div className="category-department-heading">
            <div><span className="eyebrow">ONE DEPARTMENT</span><h2>Construction</h2>
              <p>Materials, architects, builders, trades, workers and site supplies.</p></div>
            <Link to="/search?department=construction">Browse all construction →</Link>
          </div>
          <div className="category-directory-grid">{construction.map(card)}</div>
        </section>
      )}
      <div className="category-directory-grid">{other.map(card)}</div>
      {!rows.length && (
        <p>
          No matching category. Try a shorter search or select All departments.
        </p>
      )}
    </div>
  );
}
