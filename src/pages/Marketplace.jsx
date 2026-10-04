import { PurchasePanel } from "../components/PurchasePanel";
import { ProductVideos } from "../components/ProductMedia";
import { outOfStock } from "../lib/commerce";
import {
  categoryName,
  subcategoryName,
  subcategoriesFor,
  constructionCategories,
} from "../lib/categories";
import React, { useState, useEffect, useRef } from "react";
import {
  Heart,
  MapPin,
  Storefront,
  ArrowRight,
  ArrowLeft,
  CaretLeft,
  CaretRight,
  SlidersHorizontal,
  WhatsappLogo,
  ShareNetwork,
  LinkSimple,
  Flag,
  CheckCircle,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { useMarket, Link } from "../lib/context";
import { CategoryOptions } from "../components/CategoryOptions";
import { supabase, configured, result } from "../lib/backend";
import {
  money,
  whatsappUrl,
  searchable,
  mediaUrl,
  safeUrl,
} from "../lib/utils";
import {
  Photo,
  Modal,
  Field,
  Empty,
  SocialLinks,
  Video,
} from "../components/UI";
import { templates } from "../lib/templates";
import {
  storefrontColors,
  storefrontFonts,
  storefrontSettings,
  shopPath,
} from "../lib/storefront";
import { icons } from "../components/Layout";
export function ProductCard({ item }) {
  const { session, navigate, notice } = useMarket();
  const [saved, setSaved] = useState(false),
    [flipped, setFlipped] = useState(false);
  return (
    <article className="product-card">
      <div className="product-photo">
        <Link
          to={"/listing/" + item.id}
          data-hovered={flipped}
          onPointerEnter={(e) =>
            setFlipped(e.pointerType === "mouse" || e.pointerType === "pen")
          }
          onPointerLeave={() => setFlipped(false)}
          className={
            item.category_id === "fashion" && item.images?.[1]
              ? "photo-swap"
              : ""
          }
        >
          <Photo
            src={item.images?.[0]}
            alt={
              item.title + (item.category_id === "fashion" ? " · front" : "")
            }
            loading="lazy"
          />
          {item.category_id === "fashion" && item.images?.[1] && (
            <Photo
              className="back-photo"
              src={item.images[1]}
              alt={item.title + " · back"}
              loading="lazy"
            />
          )}
        </Link>
        <span
          className={"condition " + (item.condition === "Used" ? "used" : "")}
        >
          {outOfStock(item)
            ? "Out of stock"
            : item.sample
              ? "Sample"
              : item.condition}
        </span>
        <button
          className={"save-button " + (saved ? "saved" : "")}
          aria-label={`Save ${item.title}`}
          aria-pressed={saved}
          onClick={async () => {
            if (item.sample)
              return notice(
                "This sample cannot be saved. Browse the templates to explore the design.",
              );
            if (!session) return navigate("/login");
            try {
              if (saved)
                await result(
                  supabase
                    .from("saved_listings")
                    .delete()
                    .eq("user_id", session.user.id)
                    .eq("listing_id", item.id),
                );
              else
                await result(
                  supabase
                    .from("saved_listings")
                    .upsert({ user_id: session.user.id, listing_id: item.id }),
                );
              setSaved(!saved);
              notice(
                saved ? "Removed from saved items" : "Saved to your account",
              );
            } catch (e) {
              notice(e.message);
            }
          }}
        >
          <Heart size={20} weight={saved ? "fill" : "regular"} />
        </button>
      </div>
      <div className="product-content">
        <Link to={"/listing/" + item.id} className="product-title">
          {item.title}
        </Link>
        <strong className="price">{money(item.price)}</strong>
        <Link to={shopPath(item.seller?.slug)} className="seller-line">
          <Storefront size={14} />
          {item.seller?.name || "Local seller"}
        </Link>
        <span className="location-line">
          <MapPin size={14} />
          {item.location}
        </span>
        <Link
          className="contact-button"
          to={"/listing/" + item.id + "?enquire=1"}
        >
          <WhatsappLogo size={17} />{" "}
          {item.sample ? "Explore sample" : "Contact seller"}
        </Link>
      </div>
    </article>
  );
}
export function ShopCard({ seller }) {
  return (
    <Link className="shop-card" to={shopPath(seller.slug)}>
      <Photo src={seller.cover} alt={seller.name} loading="lazy" />
      <div>
        <span className="shop-avatar">
          {seller.logo ? (
            <Photo src={seller.logo} alt="" />
          ) : (
            <Storefront size={22} />
          )}
        </span>
        <div>
          <strong>{seller.name}</strong>
          <small>
            {templates[seller.theme]?.category || seller.theme}
            {seller.sample ? " · Sample shop" : ""}
          </small>
          <small>
            <MapPin size={12} />
            {seller.location}
          </small>
        </div>
        <ArrowRight size={18} />
      </div>
    </Link>
  );
}
export function Hero() {
  const { settings, navigate } = useMarket();
  const [campaigns, setCampaigns] = useState([]),
    [index, setIndex] = useState(0),
    [video, setVideo] = useState(null);
  const start = useRef(null);
  useEffect(() => {
    if (configured)
      result(
        supabase
          .from("campaigns")
          .select("*")
          .eq("status", "approved")
          .eq("paid", true)
          .lte("starts_at", new Date().toISOString())
          .gt("ends_at", new Date().toISOString())
          .order("created_at")
          .limit(12),
      )
        .then(setCampaigns)
        .catch(() => {});
  }, []);
  const slide = campaigns[index - 1],
    total = campaigns.length + 1;
  const go = (n) => setIndex((n + total) % total);
  return (
    <section
      className="hero"
      onTouchStart={(e) =>
        (start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })
      }
      onTouchEnd={(e) => {
        if (!start.current) return;
        const dx = e.changedTouches[0].clientX - start.current.x,
          dy = e.changedTouches[0].clientY - start.current.y;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy))
          go(index + (dx < 0 ? 1 : -1));
        start.current = null;
      }}
      aria-roledescription="carousel"
      aria-label="Featured marketplace stories"
    >
      <Photo
        className="hero-image"
        src={slide?.image || settings.hero_image}
        alt="Local handloom shop and colourful textiles"
      />
      <div className="hero-panel">
        <span className="eyebrow">
          {slide
            ? "SPONSORED · LOCAL SPOTLIGHT"
            : "GOOD FINDS. GREAT NEIGHBOURS."}
        </span>
        <h1>{slide?.title || settings.hero_title}</h1>
        <p>{slide?.description || settings.hero_description}</p>
        <div className="button-row">
          {slide?.video_url ? (
            <button
              className="button primary"
              onClick={() => setVideo(slide.video_url)}
            >
              Watch video <ArrowRight />
            </button>
          ) : (
            <button
              className="button primary"
              onClick={() => {
                if (slide) {
                  if (
                    slide.destination.startsWith("/") &&
                    !slide.destination.startsWith("//")
                  )
                    navigate(slide.destination);
                  else if (safeUrl(slide.destination))
                    window.open(
                      safeUrl(slide.destination),
                      "_blank",
                      "noopener,noreferrer",
                    );
                } else navigate("/shops");
              }}
            >
              {slide ? "Explore this shop" : "Explore local shops"}{" "}
              <ArrowRight size={18} />
            </button>
          )}
        </div>
        <small className="hero-caption">
          <MapPin size={14} /> From Manipur, with love.
        </small>
      </div>
      <div className="hero-controls">
        <div className="dots">
          {Array.from({ length: total }, (_, i) => (
            <button
              key={i}
              aria-label={`Show slide ${i + 1}`}
              aria-current={i === index}
              onClick={() => go(i)}
            />
          ))}
        </div>
        <div>
          <button
            aria-label="Previous featured story"
            disabled={total < 2}
            onClick={() => go(index - 1)}
          >
            <CaretLeft size={20} />
          </button>
          <button
            aria-label="Next featured story"
            disabled={total < 2}
            onClick={() => go(index + 1)}
          >
            <CaretRight size={20} />
          </button>
        </div>
      </div>
      {video && (
        <Modal title="Featured video" onClose={() => setVideo(null)}>
          <Video url={video} />
        </Modal>
      )}
    </section>
  );
}
export function Home() {
  const { fixtures, categories, dataReady, notice } = useMarket();
  const [items, setItems] = useState([]),
    [shops, setShops] = useState([]),
    [loading, setLoading] = useState(configured);
  useEffect(() => {
    if (fixtures) {
      setItems(fixtures.listings);
      setShops(fixtures.sellers);
    }
    if (configured)
      Promise.all([
        result(
          supabase
            .from("listings")
            .select("*,seller:sellers(*)")
            .eq("status", "published")
            .order("created_at", { ascending: false })
            .limit(8),
        ),
        result(
          supabase
            .from("sellers")
            .select("*")
            .eq("type", "shop")
            .eq("suspended", false)
            .limit(4),
        ),
      ])
        .then(([a, b]) => {
          setItems(a);
          setShops(b);
        })
        .catch((e) => notice(e.message))
        .finally(() => setLoading(false));
  }, [fixtures]);
  return (
    <div className="page home">
      <Hero />
      <section className="mobile-categories">
        {categories.slice(0, 6).map((c) => {
          const Icon = icons[c.id] || Storefront;
          return (
            <Link to={"/search?category=" + c.id} key={c.id}>
              <span>
                <Icon size={25} />
              </span>
              {c.name.split(" &")[0]}
            </Link>
          );
        })}
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">A LITTLE LOCAL DISCOVERY</span>
            <h2>Fresh finds near you</h2>
            <p>Something for your everyday. Something unexpectedly good.</p>
          </div>
          <Link to="/search">
            See all products <ArrowRight size={18} />
          </Link>
        </div>
        {loading || !dataReady ? (
          <p role="status">Loading local finds…</p>
        ) : items.length ? (
          <div className="product-grid">
            {items.slice(0, 8).map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <Empty title="Your neighbourhood starts here">
            Be the first to open a shop and share a listing.{" "}
            <Link to="/sell">Start selling</Link>
          </Empty>
        )}
      </section>
      <section className="section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">THE PEOPLE BEHIND THE PRODUCTS</span>
            <h2>Meet your local shops</h2>
          </div>
          <Link to="/shops">
            Explore all shops <ArrowRight size={18} />
          </Link>
        </div>
        <div className="shop-grid">
          {shops.map((s) => (
            <ShopCard key={s.id} seller={s} />
          ))}
        </div>
      </section>
      {fixtures && (
        <section className="template-invite">
          <div>
            <span className="eyebrow">ONE MARKETPLACE. YOUR OWN LOOK.</span>
            <h2>A storefront that fits what you sell.</h2>
            <p>
              Explore clothing, electronics, car, motorcycle and retail
              templates.
            </p>
          </div>
          <Link className="button primary" to="/templates">
            Explore shop templates <ArrowRight />
          </Link>
        </section>
      )}
      <section className="seller-invite">
        <Storefront size={54} weight="light" />
        <div>
          <span className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</span>
          <h2>A little idea. Your very own shop.</h2>
          <p>
            Give your products a home online. Your first 3 listings are free.
          </p>
        </div>
        <Link to="/sell" className="button primary">
          Open your shop <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
export function Search({ saved = false }) {
  const { path, fixtures, categories, session, navigate, notice } = useMarket();
  const params = new URLSearchParams(path.split("?")[1]);
  const q = params.get("q") || "",
    cat = params.get("category") || "",
    department = params.get("department") || "",
    sub = params.get("subcategory") || "",
    loc = params.get("location") || "";
  const [items, setItems] = useState([]),
    [loading, setLoading] = useState(true),
    [sort, setSort] = useState("newest"),
    [condition, setCondition] = useState(""),
    [type, setType] = useState(""),
    [min, setMin] = useState(""),
    [max, setMax] = useState(""),
    [page, setPage] = useState(0),
    [more, setMore] = useState(false),
    [filters, setFilters] = useState(false);
  useEffect(
    () => setPage(0),
    [q, cat, department, sub, loc, sort, condition, type, min, max],
  );
  useEffect(() => {
    let live = true;
    async function run() {
      setLoading(true);
      try {
        let list = [];
        if (saved && !session) {
          list = [];
        } else if (fixtures) {
          list = saved
            ? []
            : fixtures.listings.filter(
                (x) =>
                  (!q || searchable(x).includes(q.toLowerCase())) &&
                  (!cat || x.category_id === cat) &&
                  (department !== "construction" ||
                    constructionCategories(categories).some(
                      (c) => c.id === x.category_id,
                    )) &&
                  (!sub || x.subcategory_id === sub) &&
                  (!loc ||
                    x.location.toLowerCase().includes(loc.toLowerCase())) &&
                  (!condition || x.condition === condition) &&
                  (!type || x.seller.type === type) &&
                  (min === "" || x.price >= Number(min)) &&
                  (max === "" || x.price <= Number(max)),
              );
          if (sort === "low") list.sort((a, b) => a.price - b.price);
          if (sort === "high") list.sort((a, b) => b.price - a.price);
        } else if (configured) {
          let query = supabase
            .rpc("search_listings", { p_query: q })
            .select("*,seller:sellers!inner(*)");
          if (cat) query = query.eq("category_id", cat);
          else if (department === "construction") {
            const ids = constructionCategories(categories).map((c) => c.id);
            query = query.in(
              "category_id",
              ids.length ? ids : ["construction"],
            );
          }
          if (sub) query = query.eq("subcategory_id", sub);
          if (loc)
            query = query.ilike(
              "location",
              "%" + loc.replace(/[%_]/g, "") + "%",
            );
          if (condition) query = query.eq("condition", condition);
          if (type) query = query.eq("seller.type", type);
          if (min !== "") query = query.gte("price", Number(min));
          if (max !== "") query = query.lte("price", Number(max));
          if (saved) {
            const rows = await result(
              supabase
                .from("saved_listings")
                .select("listing_id")
                .eq("user_id", session.user.id),
            );
            query = query.in(
              "id",
              rows.map((x) => x.listing_id),
            );
          }
          query = query
            .order(sort === "newest" ? "created_at" : "price", {
              ascending: sort === "low",
            })
            .order("id")
            .range(page * 24, page * 24 + 24);
          list = await result(query);
        }
        if (live) {
          setMore(list.length > 24);
          setItems(list.slice(0, 24));
        }
      } catch (e) {
        if (live) notice(e.message);
      } finally {
        if (live) setLoading(false);
      }
    }
    run();
    return () => {
      live = false;
    };
  }, [
    path,
    fixtures,
    categories,
    sort,
    condition,
    type,
    min,
    max,
    page,
    session?.user?.id,
    saved,
  ]);
  return (
    <div className="page">
      <div className="breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        {saved ? "Saved items" : "Explore the marketplace"}
      </div>
      <div className="section-heading">
        <div>
          <span className="eyebrow">FIND YOUR NEXT GOOD THING</span>
          <h1>
            {saved
              ? "Your saved finds"
              : q
                ? `Results for “${q}”`
                : department === "construction" && !cat
                  ? "Construction"
                  : cat
                    ? subcategoryName(categories, cat, sub) ||
                      categoryName(categories, cat)
                    : "Explore the marketplace"}
          </h1>
          <p>Products from shops and individuals across Manipur.</p>
        </div>
        <button
          className="button outline filter-toggle"
          onClick={() => setFilters(!filters)}
        >
          <SlidersHorizontal /> Filters
        </button>
      </div>
      <div className="search-layout">
        <aside className={"filters " + (filters ? "show" : "")}>
          <h3>
            <SlidersHorizontal size={20} /> Refine your search
          </h3>
          <Field label="Category">
            <select
              value={cat}
              onChange={(e) =>
                navigate(
                  "/search?" +
                    new URLSearchParams({
                      q,
                      category: e.target.value,
                      department: e.target.value ? "" : department,
                      location: loc,
                    }),
                )
              }
            >
              <option value="">
                {department === "construction"
                  ? "All construction"
                  : "All categories"}
              </option>
              <CategoryOptions categories={categories} />
            </select>
          </Field>
          {cat && (
            <Field label="Subcategory">
              <select
                value={sub}
                onChange={(e) =>
                  navigate(
                    "/search?" +
                      new URLSearchParams({
                        q,
                        category: cat,
                        subcategory: e.target.value,
                        location: loc,
                      }),
                  )
                }
              >
                <option value="">All subcategories</option>
                {subcategoriesFor(categories, cat).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Condition">
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
              <option value="">Any condition</option>
              {["New", "Used", "Refurbished"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Seller">
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">Everyone</option>
              <option value="shop">Shops</option>
              <option value="individual">Individuals</option>
            </select>
          </Field>
          <div className="form-grid">
            <Field
              label="Min ₹"
              type="number"
              min="0"
              value={min}
              onChange={(e) => setMin(e.target.value)}
            />
            <Field
              label="Max ₹"
              type="number"
              min="0"
              value={max}
              onChange={(e) => setMax(e.target.value)}
            />
          </div>
          <Field label="Location">
            <select
              value={loc}
              onChange={(e) =>
                navigate(
                  "/search?" +
                    new URLSearchParams({
                      q,
                      category: cat,
                      location: e.target.value,
                    }),
                )
              }
            >
              <option value="">All Manipur</option>
              {[
                "Imphal",
                "Thoubal",
                "Bishnupur",
                "Ukhrul",
                "Churachandpur",
                "Senapati",
                "Kakching",
              ].map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </Field>
          <button
            className="text-button"
            onClick={() => {
              setCondition("");
              setType("");
              setMin("");
              setMax("");
              navigate("/search");
            }}
          >
            Clear all filters
          </button>
        </aside>
        <section>
          <div className="results-bar">
            <span>
              {loading
                ? "Finding local products…"
                : `${items.length}${more ? "+" : ""} products on this page`}
            </span>
            <select
              aria-label="Sort products"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option>
            </select>
          </div>
          {items.length ? (
            <div className="product-grid results-grid">
              {items.map((i) => (
                <ProductCard key={i.id} item={i} />
              ))}
            </div>
          ) : (
            !loading && (
              <Empty
                title={
                  saved && !session
                    ? "Sign in to see your saved finds"
                    : "No products found"
                }
              >
                {saved && !session ? (
                  <Link to="/login">Sign in</Link>
                ) : (
                  "Try a different keyword or clear a filter."
                )}
              </Empty>
            )
          )}
          <div className="pagination">
            <button disabled={page === 0} onClick={() => setPage(page - 1)}>
              <ArrowLeft /> Previous
            </button>
            <span>Page {page + 1}</span>
            <button disabled={!more} onClick={() => setPage(page + 1)}>
              Next <ArrowRight />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
export function Shops() {
  const { fixtures, notice } = useMarket();
  const [shops, setShops] = useState([]),
    [q, setQ] = useState(""),
    [page, setPage] = useState(0),
    [more, setMore] = useState(false);
  useEffect(() => {
    if (fixtures)
      setShops(
        fixtures.sellers.filter((s) =>
          s.name.toLowerCase().includes(q.toLowerCase()),
        ),
      );
    else if (configured) {
      let query = supabase
        .from("sellers")
        .select("*")
        .eq("suspended", false)
        .ilike("name", "%" + q.replace(/[%_]/g, "") + "%")
        .order("created_at", { ascending: false })
        .range(page * 24, page * 24 + 24);
      result(query)
        .then((s) => {
          setMore(s.length > 24);
          setShops(s.slice(0, 24));
        })
        .catch((e) => notice(e.message));
    }
  }, [fixtures, q, page]);
  return (
    <div className="page">
      <div className="section-heading">
        <div>
          <span className="eyebrow">OUR PEOPLE. THEIR PASSION.</span>
          <h1>Meet your local sellers</h1>
          <p>
            Independent shops and everyday people. All in one neighbourhood.
          </p>
        </div>
      </div>
      <Field
        label="Find a shop or seller"
        placeholder="Search by name"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(0);
        }}
      />
      <div className="shop-grid shop-directory">
        {shops.map((s) => (
          <ShopCard key={s.id} seller={s} />
        ))}
      </div>
      {!shops.length && (
        <Empty title="No sellers found">Try a different name.</Empty>
      )}
      <div className="pagination">
        <button disabled={!page} onClick={() => setPage(page - 1)}>
          Previous
        </button>
        <span>Page {page + 1}</span>
        <button disabled={!more} onClick={() => setPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
export function SellerPage({ slug }) {
  const { fixtures, notice, categories } = useMarket();
  const [shopCategory, setShopCategory] = useState(""),
    [shopQuery, setShopQuery] = useState("");
  const [seller, setSeller] = useState(null),
    [items, setItems] = useState([]),
    [collections, setCollections] = useState([]),
    [collection, setCollection] = useState(""),
    [tab, setTab] = useState("products"),
    [page, setPage] = useState(0),
    [more, setMore] = useState(false);
  useEffect(() => {
    let live = true;
    async function run() {
      try {
        const s = fixtures
          ? fixtures.sellers.find((s) => s.slug === slug)
          : configured
            ? await result(
                supabase
                  .from("sellers")
                  .select("*")
                  .eq("slug", slug)
                  .maybeSingle(),
              )
            : null;
        if (!live) return;
        setSeller(s);
        if (s) {
          let query = configured
            ? supabase
                .from("listings")
                .select("*,seller:sellers(*)")
                .eq("seller_id", s.id)
                .eq("status", "published")
            : null;
          if (collection && query)
            query = query.eq("collection_id", collection);
          if (shopCategory && query)
            query = query.eq("category_id", shopCategory);
          if (shopQuery.trim() && query)
            query = query.ilike(
              "title",
              "%" + shopQuery.trim().replace(/[%_]/g, "") + "%",
            );
          let rows = fixtures
            ? fixtures.listings.filter(
                (i) =>
                  i.seller_id === s.id &&
                  (!collection || i.collection_id === collection) &&
                  (!shopCategory || i.category_id === shopCategory) &&
                  (!shopQuery.trim() ||
                    i.title
                      .toLowerCase()
                      .includes(shopQuery.toLowerCase().trim())),
              )
            : query
              ? await result(
                  query
                    .order("created_at", { ascending: false })
                    .range(page * 24, page * 24 + 24),
                )
              : [];
          if (live) {
            setMore(rows.length > 24);
            setItems(rows.slice(0, 24));
          }
          if (fixtures) {
            setCollections(
              fixtures.collections.filter((c) => c.seller_id === s.id),
            );
          } else if (configured) {
            const c = await result(
              supabase
                .from("collections")
                .select("*")
                .eq("seller_id", s.id)
                .order("position"),
            );
            if (live) setCollections(c);
          }
        }
      } catch (e) {
        notice(e.message);
      }
    }
    run();
    return () => {
      live = false;
    };
  }, [fixtures, slug, collection, page, shopCategory, shopQuery]);
  useEffect(() => {
    if (seller) document.title = `${seller.name} | Onlinekeithel`;
  }, [seller]);
  if (!seller)
    return (
      <div className="page">
        <Empty title="Shop unavailable">
          This shop may not be published yet.
        </Empty>
      </div>
    );
  const display = storefrontSettings(seller);
  return (
    <div
      className={"page storefront theme-" + seller.theme}
      style={{
        "--shop-accent": storefrontColors[display.color].value,
        "--shop-font": storefrontFonts[display.font].value,
      }}
    >
      {seller.sample && (
        <div className="sample-notice">
          Sample shop · illustrative products and prices.{" "}
          <Link to="/templates">Explore all templates</Link>
        </div>
      )}
      <div className="shop-cover shop-hero">
        <Photo src={seller.cover} alt={seller.name} />
        <div className="shop-hero-content">
          <span>{display.tagline}</span>
          <h1>{display.headline}</h1>
          <a href="#shop-products" className="button primary">
            Explore products <ArrowRight size={17} />
          </a>
        </div>
      </div>
      <div className="store-identity">
        <span className="store-logo">
          {seller.logo ? (
            <Photo src={seller.logo} alt="Shop logo" />
          ) : (
            <Storefront size={40} />
          )}
        </span>
        <div>
          <span className="eyebrow">
            {seller.type === "shop"
              ? "INDEPENDENT LOCAL SHOP"
              : "INDIVIDUAL SELLER"}
          </span>
          <h1>{seller.name}</h1>
          <p>
            <MapPin size={16} /> {seller.location}
          </p>
        </div>
        <SocialLinks values={seller.socials} />
        {whatsappUrl(
          seller.whatsapp,
          "Hello, I found your shop on Onlinekeithel.",
        ) && (
          <a
            className="button primary"
            href={whatsappUrl(
              seller.whatsapp,
              "Hello, I found your shop on Onlinekeithel.",
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WhatsappLogo /> WhatsApp shop
          </a>
        )}
      </div>
      {display.sections.map((section) => (
        <React.Fragment key={section}>
          {section === "about" && display.showAbout && display.introduction && (
            <section className="store-template-intro">
              <span className="eyebrow">
                {templates[seller.theme]?.name || "Neighbourhood"} ·{" "}
                {templates[seller.theme]?.category}
              </span>
              <h2>Welcome to {seller.name}</h2>
              <p>{display.introduction}</p>
              {seller.theme === "electronics" && (
                <div className="template-features">
                  <span>Device specifications</span>
                  <span>Phones & accessories</span>
                  <span>Compare your options</span>
                </div>
              )}
              {["vehicles", "motorcycles"].includes(seller.theme) && (
                <div className="template-features">
                  <span>Year & mileage</span>
                  <span>
                    {seller.theme === "motorcycles"
                      ? "Engine capacity"
                      : "Fuel & model"}
                  </span>
                  <span>Enquire before viewing</span>
                </div>
              )}
            </section>
          )}
          {section === "gallery" &&
            display.showGallery &&
            display.gallery.length > 0 && (
              <section className="shop-gallery">
                <div>
                  <span className="eyebrow">INSIDE OUR SHOP</span>
                  <h2>Photo gallery</h2>
                </div>
                <div className="shop-gallery-grid">
                  {display.gallery.map((photo, index) => (
                    <Photo
                      key={photo + index}
                      src={photo}
                      alt={`${seller.name} gallery photo ${index + 1}`}
                      loading="lazy"
                    />
                  ))}
                </div>
              </section>
            )}
          {section === "video" && display.showVideo && display.videoUrl && (
            <section className="shop-featured-video">
              <div>
                <span className="eyebrow">A CLOSER LOOK</span>
                <h2>From {seller.name}</h2>
                <p>Get to know the people and products behind this shop.</p>
              </div>
              <Video url={display.videoUrl} />
            </section>
          )}
        </React.Fragment>
      ))}
      <div className="tabs" id="shop-products">
        {[
          "products",
          ...(display.showAbout ? ["about"] : []),
          ...(display.showVideo ? ["videos"] : []),
        ].map((t) => (
          <button
            key={t}
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "products" ? (
        <>
          <div className="form-grid shop-product-filters">
            <Field
              label="Search this shop"
              type="search"
              value={shopQuery}
              onChange={(e) => {
                setShopQuery(e.target.value);
                setPage(0);
              }}
            />
            <Field label="Shop category">
              <select
                value={shopCategory}
                onChange={(e) => {
                  setShopCategory(e.target.value);
                  setPage(0);
                }}
              >
                <option value="">All categories</option>
                <CategoryOptions categories={categories} />
              </select>
            </Field>
          </div>
          <div className="chips">
            <button
              className={!collection ? "active" : ""}
              onClick={() => {
                setCollection("");
                setPage(0);
              }}
            >
              All products
            </button>
            {collections.map((c) => (
              <button
                key={c.id}
                className={collection === c.id ? "active" : ""}
                onClick={() => {
                  setCollection(c.id);
                  setPage(0);
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="product-grid">
            {items.map((i) => (
              <ProductCard key={i.id} item={i} />
            ))}
          </div>
          {!items.length && (
            <Empty title="More good things are coming">
              This collection has no published products yet.
            </Empty>
          )}
          <div className="pagination">
            <button disabled={!page} onClick={() => setPage(page - 1)}>
              Previous
            </button>
            <span>Page {page + 1}</span>
            <button disabled={!more} onClick={() => setPage(page + 1)}>
              Next
            </button>
          </div>
        </>
      ) : tab === "about" ? (
        <div className="prose">
          <h2>A little about {seller.name}</h2>
          <p>{seller.description}</p>
          <SocialLinks values={seller.socials} />
        </div>
      ) : (
        <div className="prose">
          <h2>From the shop</h2>
          {Object.values(seller.socials || {})
            .filter(
              (u) =>
                typeof u === "string" &&
                (u.includes("youtube") ||
                  u.includes("reel") ||
                  u.includes("youtu.be")),
            )
            .map((u) => (
              <Video key={u} url={u} />
            ))}
          <p>Explore the seller’s social pages for more updates.</p>
          <SocialLinks values={seller.socials} />
        </div>
      )}
    </div>
  );
}
export function ProductPage({ id }) {
  const { fixtures, notice, session, path, categories } = useMarket();
  const [item, setItem] = useState(null),
    [loading, setLoading] = useState(true),
    [image, setImage] = useState(0),
    [hoverBack, setHoverBack] = useState(false),
    [social, setSocial] = useState(false),
    [report, setReport] = useState(false),
    [reason, setReason] = useState("");
  useEffect(() => {
    if (fixtures) {
      setItem(fixtures.listings.find((i) => i.id === id));
      setLoading(false);
    } else if (configured)
      result(
        supabase
          .from("listings")
          .select("*,seller:sellers(*)")
          .eq("id", id)
          .maybeSingle(),
      )
        .then(setItem)
        .catch((e) => notice(e.message))
        .finally(() => setLoading(false));
    else setLoading(false);
  }, [id, fixtures]);
  if (!item)
    return (
      <div className="page">
        <Empty title={loading ? "Loading product…" : "Listing unavailable"}>
          It may have been sold or removed.
        </Empty>
      </div>
    );
  return (
    <div className="page">
      <div className="breadcrumb">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to={"/search?category=" + item.category_id}>
          {categoryName(categories, item.category_id)}
        </Link>
        <span>/</span>
        {item.title}
      </div>
      <div className="product-detail">
        <section>
          <div
            className={
              "detail-photo " +
              (item.category_id === "fashion" && image === 0 && item.images?.[1]
                ? "photo-swap"
                : "")
            }
            tabIndex={0}
            data-hovered={hoverBack}
            onPointerEnter={(e) =>
              setHoverBack(e.pointerType === "mouse" || e.pointerType === "pen")
            }
            onPointerLeave={() => setHoverBack(false)}
          >
            <Photo
              src={item.images?.[image]}
              alt={item.title + ` · photo ${image + 1}`}
            />
            {item.category_id === "fashion" &&
              image === 0 &&
              item.images?.[1] && (
                <Photo
                  className="back-photo"
                  src={item.images[1]}
                  alt={item.title + " · back"}
                />
              )}
          </div>
          <div className="thumbnails">
            {item.images?.map((p, i) => (
              <button
                key={p + i}
                onClick={() => setImage(i)}
                aria-label={`View photo ${i + 1}`}
                className={image === i ? "active" : ""}
              >
                <Photo src={p} alt="" />
                <span>
                  {item.category_id === "fashion"
                    ? ["Front", "Back", "Left", "Right"][i] || "Detail"
                    : `Photo ${i + 1}`}
                </span>
              </button>
            ))}
          </div>
          <ProductVideos
            videos={[
              ...(item.videos || []),
              ...Object.entries(item.socials || {})
                .filter(
                  ([, url]) =>
                    url && !(item.videos || []).some((v) => v.url === url),
                )
                .map(([title, url]) => ({ title, url })),
            ]}
          />
        </section>
        <section className="detail-info">
          <span className="eyebrow">
            {item.condition} · {categoryName(categories, item.category_id)}{" "}
            {item.subcategory_id &&
              " · " +
                subcategoryName(
                  categories,
                  item.category_id,
                  item.subcategory_id,
                )}
          </span>
          {item.sample && (
            <div className="sample-notice">
              Sample product · not for sale · price and specifications are
              illustrative.
            </div>
          )}
          <h1>{item.title}</h1>
          <strong className="detail-price">{money(item.price)}</strong>
          <p className="muted">
            <MapPin size={17} /> {item.location}
          </p>
          <p>{item.description}</p>
          <dl className="attributes">
            {Object.entries(item.attributes || {})
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{String(v)}</dd>
                </div>
              ))}
          </dl>
          <div className="detail-seller">
            <Storefront size={30} />
            <div>
              <Link to={shopPath(item.seller?.slug)}>
                <strong>{item.seller?.name}</strong>
              </Link>
              <small>
                {item.seller?.type === "shop"
                  ? "Local shop"
                  : "Individual seller"}{" "}
                · View all products
              </small>
            </div>
            <ArrowRight />
          </div>
          <PurchasePanel item={item} />
          <div className="button-row">
            <button className="button outline" onClick={() => setSocial(true)}>
              <LinkSimple /> Social & video
            </button>
            <button
              className="button outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    location.origin + "/listing/" + item.id,
                  );
                  notice("Product link copied");
                } catch {
                  notice("Copy the product URL from your browser address bar.");
                }
              }}
            >
              <ShareNetwork /> Share
            </button>
          </div>
          <small className="contact-note">
            You arrange payment and collection directly with the seller.
          </small>
          <button className="text-button muted" onClick={() => setReport(true)}>
            <Flag size={16} /> Report this listing
          </button>
        </section>
      </div>
      {social && (
        <Modal title="Social & video" side onClose={() => setSocial(false)}>
          <SocialLinks values={item.seller?.socials} />
          {Object.entries(item.socials || {}).map(([k, u]) => (
            <div key={k}>
              <h3>{k}</h3>
              <Video url={u} />
            </div>
          ))}
          {!Object.keys(item.socials || {}).length && (
            <p>No product-specific social links have been added.</p>
          )}
        </Modal>
      )}
      {report && (
        <Modal title="Report listing" onClose={() => setReport(false)}>
          {session ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await result(
                    supabase.from("reports").insert({
                      listing_id: id,
                      user_id: session.user.id,
                      reason,
                    }),
                  );
                  setReport(false);
                  notice("Report submitted for review");
                } catch (e) {
                  notice(e.message);
                }
              }}
            >
              <Field label="What should we review?">
                <textarea
                  required
                  minLength={5}
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </Field>
              <button className="button primary">Submit report</button>
            </form>
          ) : (
            <p>
              <Link to="/login">Sign in</Link> to report this listing.
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}
