import { categoryCatalog } from "../lib/categories";
import { categoryIcons, CategoryIcon } from "./CategoryIcon";
import React, { useState } from "react";
import {
  List,
  MagnifyingGlass,
  MapPin,
  Storefront,
  Plus,
  Heart,
  User,
  House,
  SquaresFour,
  ArrowRight,
  TShirt,
  DeviceMobile,
  Car,
  Armchair,
  Headphones,
  Wrench,
  Bicycle,
  Buildings,
  CaretDown,
  SignOut,
} from "@phosphor-icons/react";
import { Link, useMarket } from "../lib/context";
import { Modal } from "./UI";
import { preview, showSamples, supabase } from "../lib/backend";
import { constructionCategories, isConstructionCategory } from "../lib/categories";
import { BrandMark } from "./BrandMark";
export const icons = Object.fromEntries(
  categoryCatalog.map((c) => [c.id, categoryIcons[c.icon]]),
);
export function Layout({ children }) {
  const { navigate, path, session, categories, settings, notice } = useMarket();
  const [menu, setMenu] = useState(false),
    [query, setQuery] = useState(
      new URLSearchParams(location.search).get("q") || "",
    );
  return (
    <>
      <div className="announcement">
        <span>
          {settings.announcement || "Your local marketplace, across Manipur."}
        </span>
        <Link to="/plans">
          A little idea. Your own shop. <ArrowRight size={13} />
        </Link>
      </div>
      <header className="main-header">
        <div className="header-inner">
          <button
            className="icon-button burger"
            aria-label="Open navigation menu"
            onClick={() => setMenu(true)}
          >
            <List size={25} />
          </button>
          <Link to="/" className="brand">
            <BrandMark />
            <span>
              <b>{settings.name}</b>
              <small>
                {settings.tagline || "Our people. Our neighbourhood."}
              </small>
            </span>
          </Link>
          <button
            className="location"
            onClick={() => navigate("/search?location=Imphal")}
          >
            <MapPin size={19} /> Imphal <CaretDown size={12} />
          </button>
          <form
            className="search-bar"
            onSubmit={(e) => {
              e.preventDefault();
              navigate("/search?q=" + encodeURIComponent(query));
            }}
          >
            <MagnifyingGlass size={20} />
            <input
              aria-label="Search products, shops or social URLs"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, shops or social URLs"
            />
            <button type="submit" aria-label="Search">
              <ArrowRight size={18} />
            </button>
          </form>
          <Link
            className="desktop-saved icon-button"
            to="/saved"
            aria-label="Saved items"
          >
            <Heart size={23} />
          </Link>
          <Link
            className="account-link"
            aria-label={session ? "My account" : "Sign in"}
            to={session ? "/dashboard" : "/login"}
          >
            <User size={22} />
            <span>{session ? "My account" : "Sign in"}</span>
          </Link>
          <Link className="button primary sell-header" to="/sell">
            <Plus size={19} /> Open your shop
          </Link>
        </div>
      </header>
      <nav className="category-nav" aria-label="Product categories">
        <div>
          <Link to="/categories" className="all-categories">
            <SquaresFour size={19} /> All categories
          </Link>
          {categories
            .filter((c) =>
              [
                "fashion",
                "mobiles",
                "vehicles",
              ].includes(c.id),
            )
            .map((c) => {
              const Icon = icons[c.id] || SquaresFour;
              return (
                <Link key={c.id} to={"/search?category=" + c.id}>
                  <Icon size={22} />
                  {{
                    fashion: "Clothing",
                    mobiles: "Mobiles",
                    vehicles: "Cars",
                  }[c.id] || c.name}
                </Link>
              );
            })}
          {constructionCategories(categories).length > 0 && (
            <details className="nav-department">
              <summary><Buildings size={22} /> Construction <CaretDown size={13} /></summary>
              <div className="nav-department-menu">
                <Link to="/search?department=construction">All construction</Link>
                {constructionCategories(categories).map((c) => (
                  <Link key={c.id} to={"/search?category=" + c.id}>{c.name}</Link>
                ))}
              </div>
            </details>
          )}
          <Link to="/shops">
            Local shops <ArrowRight size={16} />
          </Link>
        </div>
      </nav>
      <main>{children}</main>
      <footer className="site-footer">
        <div>
          <Link className="brand" to="/">
            <BrandMark size={34} />
            <b>{settings.name}</b>
          </Link>
          <p>
            A marketplace for our people.
            <br />
            Made for the neighbourhoods of Manipur.
          </p>
        </div>
        <div>
          <b>Explore</b>
          <Link to="/search">All products</Link>
          <Link to="/shops">Local shops</Link>
          <Link to="/saved">Saved items</Link>
        </div>
        <div>
          <b>Start something</b>
          <Link to="/sell">Open your shop</Link>
          <Link to="/plans">Seller packages</Link>
          <Link to="/dashboard?tab=promotions">Advertise with us</Link>
        </div>
        <div>
          <b>Here to help</b>
          <Link to="/help">Help & contact</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Marketplace terms</Link>
          <small>
            © {new Date().getFullYear()} {settings.name}
          </small>
        </div>
      </footer>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {[
          ["/", House, "Home"],
          ["/categories", SquaresFour, "Categories"],
          ["/sell", Plus, "Sell"],
          ["/saved", Heart, "Saved"],
          [session ? "/dashboard" : "/login", User, "Account"],
        ].map(([to, Icon, label]) => (
          <Link
            to={to}
            key={label}
            className={
              (label === "Sell" ? "nav-sell " : "") +
              (path.split("?")[0] === to ? "active" : "")
            }
          >
            <Icon
              size={23}
              weight={path.split("?")[0] === to ? "fill" : "regular"}
            />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      {menu && (
        <Modal title="Your neighbourhood" side onClose={() => setMenu(false)}>
          <nav className="drawer-links">
            <Link to="/" onClick={() => setMenu(false)}>
              Marketplace home
            </Link>
            <Link to="/shops" onClick={() => setMenu(false)}>
              Browse local shops
            </Link>
            <Link to="/categories" onClick={() => setMenu(false)}>
              Browse all categories & subcategories
            </Link>
            <h3>Shop by category</h3>
            {constructionCategories(categories).length > 0 && (
              <details className="drawer-department">
                <summary><Buildings size={22} /> Construction <CaretDown size={14} /></summary>
                <Link to="/search?department=construction" onClick={() => setMenu(false)}>All construction</Link>
                {constructionCategories(categories).map((c) => (
                  <Link key={c.id} to={"/search?category=" + c.id} onClick={() => setMenu(false)}>{c.name}</Link>
                ))}
              </details>
            )}
            {categories.filter((c) => !isConstructionCategory(c)).map((c) => {
              const Icon = icons[c.id] || SquaresFour;
              return (
                <Link
                  to={"/search?category=" + c.id}
                  key={c.id}
                  onClick={() => setMenu(false)}
                >
                  <Icon size={22} />
                  {c.name}
                </Link>
              );
            })}
            <hr />
            <Link to="/dashboard" onClick={() => setMenu(false)}>
              My seller dashboard
            </Link>
            <Link to="/plans" onClick={() => setMenu(false)}>
              Packages & pricing
            </Link>
            <Link to="/help" onClick={() => setMenu(false)}>
              Help & contact
            </Link>
            {session && (
              <button
                onClick={async () => {
                  const { error } = await supabase.auth.signOut();
                  if (error) notice(error.message);
                  else {
                    setMenu(false);
                    navigate("/");
                  }
                }}
              >
                <SignOut size={20} /> Sign out
              </button>
            )}
          </nav>
        </Modal>
      )}
      {(showSamples || preview) && (
        <div className="preview-ribbon">
          <Link to="/templates">Explore shop templates · </Link>
          Sample shops & illustrative prices · not available for purchase
        </div>
      )}
    </>
  );
}
