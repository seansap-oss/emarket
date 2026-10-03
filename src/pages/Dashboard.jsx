import React, { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import {
  Plus,
  Package,
  Storefront,
  Stack,
  UploadSimple,
  Megaphone,
  ArrowSquareOut,
  PencilSimple,
  Trash,
  DownloadSimple,
  SignOut,
  ShieldCheck,
  ArrowRight,
  LinkSimple,
} from "@phosphor-icons/react";
import { useMarket, Link } from "../lib/context";
import { result, supabase, preview } from "../lib/backend";
import { money, socialUrl, normalizeImport, safeUrl } from "../lib/utils";
import { Modal, Field, Photo, Upload, Empty } from "../components/UI";
import { SellerForm } from "./Account";
export function ListingEditor({
  seller,
  initial,
  onClose,
  onSaved,
  collections = [],
  visual = false,
  moderationAction,
}) {
  const { categories, notice } = useMarket();
  const [f, setF] = useState(
      initial || {
        title: "",
        price: "",
        category_id: categories[0]?.id || "fashion",
        collection_id: "",
        description: "",
        condition: "New",
        location: seller.location,
        images: [],
        socials: {},
        attributes: {},
        tags: "",
        sku: "",
        status: "draft",
      },
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [social, setSocial] = useState(false);
  const update = (k, v) => setF((p) => ({ ...p, [k]: v }));
  return (
    <Modal
      title={initial ? "Edit your listing" : "Something good to share"}
      side
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            if (visual)
              throw Error(
                "Visual review only. Connect the database and sign in to publish.",
              );
            for (const u of Object.values(f.socials))
              if (u && !socialUrl(u))
                throw Error("Add a valid social platform URL");
            const payload = {
              seller_id: seller.id,
              title: f.title,
              price: Number(f.price),
              category_id: f.category_id,
              collection_id: f.collection_id || null,
              description: f.description,
              condition: f.condition,
              location: f.location,
              images: f.images,
              socials: f.socials,
              attributes: f.attributes,
              tags: f.tags,
              sku: f.sku || null,
              status: f.status,
            };
            await result(
              initial
                ? supabase.from("listings").update(payload).eq("id", initial.id)
                : supabase.from("listings").insert(payload),
            );
            notice("Listing saved");
            onSaved();
            onClose();
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <span className="eyebrow">YOUR PRODUCT, IN ITS BEST LIGHT</span>
        <h3>Photos</h3>
        <Upload
          multiple
          value={f.images}
          onChange={(v) => update("images", v)}
        />
        <Field
          label="Product title"
          required
          minLength={3}
          maxLength={160}
          placeholder="e.g. Handwoven cotton T-shirt"
          value={f.title}
          onChange={(e) => update("title", e.target.value)}
        />
        <div className="form-grid">
          <Field label="Marketplace category">
            <select
              value={f.category_id}
              onChange={(e) => {
                update("category_id", e.target.value);
                update("attributes", {});
              }}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Your shop collection">
            <select
              value={f.collection_id || ""}
              onChange={(e) => update("collection_id", e.target.value)}
            >
              <option value="">No collection</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Price (₹)"
            required
            type="number"
            min="0"
            step="0.01"
            value={f.price}
            onChange={(e) => update("price", e.target.value)}
          />
          <Field label="Condition">
            <select
              value={f.condition}
              onChange={(e) => update("condition", e.target.value)}
            >
              {["New", "Used", "Refurbished"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Description">
          <textarea
            value={f.description}
            rows={4}
            maxLength={5000}
            onChange={(e) => update("description", e.target.value)}
          />
        </Field>
        <h3>Category details</h3>
        <div className="form-grid">
          {(categories.find((c) => c.id === f.category_id)?.fields || []).map(
            (k) => (
              <Field
                key={k}
                label={k}
                value={f.attributes?.[k] || ""}
                onChange={(e) =>
                  update("attributes", { ...f.attributes, [k]: e.target.value })
                }
              />
            ),
          )}
        </div>
        <Field
          label="Search keywords"
          placeholder="cotton, summer, local, handwoven"
          value={f.tags}
          onChange={(e) => update("tags", e.target.value)}
        />
        <div className="form-grid">
          <Field
            label="Location"
            required
            value={f.location}
            onChange={(e) => update("location", e.target.value)}
          />
          <Field
            label="SKU / your reference"
            value={f.sku || ""}
            onChange={(e) => update("sku", e.target.value)}
          />
        </div>
        <button
          type="button"
          className="button outline"
          onClick={() => setSocial(!social)}
        >
          <LinkSimple /> {social ? "Hide" : "Add"} social & video links
        </button>
        {social && (
          <div className="social-editor">
            {["instagram", "facebook", "youtube"].map((k) => (
              <Field
                key={k}
                label={k + " post / video URL"}
                type="url"
                value={f.socials[k] || ""}
                onChange={(e) =>
                  update("socials", { ...f.socials, [k]: e.target.value })
                }
              />
            ))}
            <small>
              Add the exact post URL. Include its useful keywords in your
              product title or tags so people can find it.
            </small>
          </div>
        )}
        <Field label="Listing visibility">
          <select
            value={f.status}
            onChange={(e) => update("status", e.target.value)}
          >
            {["draft", "published", "paused", "sold", "archived"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={busy}>
          {busy
            ? "Saving…"
            : f.status === "published"
              ? "Publish listing"
              : "Save listing"}
        </button>
      </form>
      {moderationAction}
    </Modal>
  );
}
export function Promotions({ seller, visual = false }) {
  const { notice } = useMarket();
  const [rows, setRows] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [form, setForm] = useState({
      title: "",
      description: "",
      image: "",
      video_url: "",
      destination: "/seller/" + seller.slug,
      starts_at: "",
      ends_at: "",
    });
  const change = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const load = () => {
    if (!visual)
      result(
        supabase
          .from("campaigns")
          .select("*")
          .eq("seller_id", seller.id)
          .order("created_at", { ascending: false }),
      )
        .then(setRows)
        .catch((e) => setError(e.message));
  };
  useEffect(load, []);
  return (
    <>
      <h2>A little more spotlight</h2>
      <p>
        Request a featured homepage placement. Your campaign goes live only
        after payment and approval.
      </p>
      <form
        className="editor-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            if (visual)
              throw Error("Connect your account to submit a campaign.");
            if (form.video_url && !socialUrl(form.video_url))
              throw Error("Use a supported social video URL");
            if (
              !(
                form.destination.startsWith("/") &&
                !form.destination.startsWith("//")
              ) &&
              !safeUrl(form.destination)
            )
              throw Error("Use a shop path or HTTPS destination");
            await result(
              supabase.from("campaigns").insert({
                ...form,
                seller_id: seller.id,
                starts_at: new Date(form.starts_at).toISOString(),
                ends_at: new Date(form.ends_at).toISOString(),
              }),
            );
            notice(
              "Campaign submitted. Admin will review placement and payment.",
            );
            load();
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field
          label="Advertisement headline"
          required
          minLength={3}
          maxLength={100}
          value={form.title}
          onChange={(e) => change("title", e.target.value)}
        />
        <Field
          label="Short description"
          value={form.description}
          onChange={(e) => change("description", e.target.value)}
        />
        <h3>Advertisement cover</h3>
        <Upload value={form.image} onChange={(v) => change("image", v)} />
        <Field
          label="Video URL (optional)"
          type="url"
          value={form.video_url}
          onChange={(e) => change("video_url", e.target.value)}
        />
        <Field
          label="Where should this advertisement lead?"
          required
          value={form.destination}
          onChange={(e) => change("destination", e.target.value)}
        />
        <div className="form-grid">
          <Field
            label="Start (your local time)"
            type="datetime-local"
            required
            value={form.starts_at}
            onChange={(e) => change("starts_at", e.target.value)}
          />
          <Field
            label="End (your local time)"
            type="datetime-local"
            required
            min={form.starts_at}
            value={form.ends_at}
            onChange={(e) => change("ends_at", e.target.value)}
          />
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="button primary" disabled={busy}>
          Submit for review
        </button>
      </form>
      <h3>Your campaigns</h3>
      {rows.map((r) => (
        <div className="table-row" key={r.id}>
          <strong>{r.title}</strong>
          <span className="status">{r.status}</span>
          <span>{r.paid ? "Payment recorded" : "Awaiting payment"}</span>
        </div>
      ))}
    </>
  );
}
function Importer({ seller, visual }) {
  const { categories, notice } = useMarket();
  const [rows, setRows] = useState([]),
    [log, setLog] = useState([]),
    [busy, setBusy] = useState(false),
    [fileName, setFileName] = useState("");
  const cancel = useRef(false);
  const template =
    "sku,title,category,price,condition,location,images,social_url,tags,description\nTEE-001,Cotton T-shirt,fashion,499,New,Imphal,https://example.com/photo.jpg,,cotton,Locally made\n";
  const download = (text, name) => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <>
      <h2>Your catalogue, all together</h2>
      <p>
        Import a CSV with one row per product. Products are imported as drafts.
        Reusing an SKU updates that product instead of creating a duplicate.
      </p>
      <button
        className="button outline"
        onClick={() => download(template, "leikai-catalogue-template.csv")}
      >
        <DownloadSimple /> Download CSV template
      </button>
      <Field label="Choose your catalogue CSV">
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files[0];
            if (!f) return;
            if (f.size > 15 * 1024 * 1024)
              return notice("Use a file smaller than 15 MB.");
            setFileName(f.name);
            Papa.parse(f, {
              header: true,
              skipEmptyLines: "greedy",
              complete: (r) => {
                if (r.errors.length)
                  return notice("CSV format error: " + r.errors[0].message);
                if (r.data.length > 15000)
                  return notice("Maximum 15,000 rows per batch");
                setRows(
                  r.data.map((row, i) => {
                    try {
                      return {
                        row: i + 2,
                        data: normalizeImport(row, seller, categories),
                      };
                    } catch (e) {
                      return { row: i + 2, error: e.message };
                    }
                  }),
                );
                setLog([]);
              },
            });
          }}
        />
      </Field>
      {rows.length > 0 && (
        <>
          <div className="notice-box">
            {fileName} · {rows.filter((r) => !r.error).length} valid rows ·{" "}
            {rows.filter((r) => r.error).length} errors
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Title</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 15).map((r) => (
                  <tr key={r.row}>
                    <td>{r.row}</td>
                    <td>{r.data?.title || "—"}</td>
                    <td>{r.error || "Ready as draft"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="button primary"
            disabled={busy || !rows.some((r) => !r.error)}
            onClick={async () => {
              if (visual)
                return notice("Import requires a connected seller account.");
              setBusy(true);
              cancel.current = false;
              const outcomes = rows
                .filter((r) => r.error)
                .map((r) => ({ row: r.row, result: r.error }));
              for (const row of rows.filter((r) => !r.error)) {
                if (cancel.current) break;
                try {
                  await result(
                    supabase
                      .from("listings")
                      .upsert(row.data, { onConflict: "seller_id,sku" }),
                  );
                  outcomes.push({ row: row.row, result: "Imported as draft" });
                } catch (e) {
                  outcomes.push({ row: row.row, result: e.message });
                }
                setLog([...outcomes]);
              }
              setBusy(false);
              notice(
                cancel.current
                  ? "Import paused. Re-upload this CSV to retry safely."
                  : "Import finished. Review results before publishing.",
              );
            }}
          >
            {busy
              ? `Importing… ${log.length}/${rows.length}`
              : "Import valid rows as drafts"}
          </button>
          {busy && (
            <button onClick={() => (cancel.current = true)}>
              Stop after current product
            </button>
          )}
        </>
      )}
      {log.length > 0 && (
        <>
          <p>
            {log.length} rows processed. Keep this page open while importing.
          </p>
          <button
            className="button outline"
            onClick={() => download(Papa.unparse(log), "import-results.csv")}
          >
            Download results
          </button>
        </>
      )}
      <p className="muted">
        Image URLs are linked rather than copied. Use image hosting you control.
        Imports run while this page is open; a server-side background importer
        is a later scale upgrade.
      </p>
    </>
  );
}
export function Dashboard({ startSell = false, visual = false }) {
  const {
    seller: realSeller,
    fixtures,
    session,
    navigate,
    path,
    plans,
    notice,
    admin,
    refreshUser,
  } = useMarket();
  const seller = visual ? fixtures?.sellers[0] : realSeller;
  const [tab, setTab] = useState(
      new URLSearchParams(path.split("?")[1]).get("tab") || "products",
    ),
    [rows, setRows] = useState([]),
    [collections, setCollections] = useState([]),
    [entitlement, setEntitlement] = useState(null),
    [editing, setEditing] = useState(null),
    [add, setAdd] = useState(false),
    [collectionName, setCollectionName] = useState(""),
    [collectionEdit, setCollectionEdit] = useState(null),
    [page, setPage] = useState(0),
    [more, setMore] = useState(false),
    [count, setCount] = useState(0);
  const load = async () => {
    if (!seller) return;
    if (visual) {
      setRows(fixtures.listings.filter((i) => i.seller_id === seller.id));
      setCount(2);
      return;
    }
    try {
      const [l, c, e, n] = await Promise.all([
        result(
          supabase
            .from("listings")
            .select("*")
            .eq("seller_id", seller.id)
            .order("created_at", { ascending: false })
            .range(page * 24, page * 24 + 24),
        ),
        result(
          supabase
            .from("collections")
            .select("*")
            .eq("seller_id", seller.id)
            .order("position"),
        ),
        result(
          supabase
            .from("entitlements")
            .select("*")
            .eq("seller_id", seller.id)
            .maybeSingle(),
        ),
        supabase
          .from("listings")
          .select("*", { head: true, count: "exact" })
          .eq("seller_id", seller.id)
          .eq("status", "published"),
      ]);
      setRows(l.slice(0, 24));
      setMore(l.length > 24);
      setCollections(c);
      setEntitlement(e);
      setCount(n.count || 0);
    } catch (e) {
      notice(e.message);
    }
  };
  useEffect(() => {
    load();
  }, [seller?.id, page, visual]);
  useEffect(() => {
    if (startSell && seller) setAdd(true);
  }, [startSell, seller?.id]);
  if (!seller)
    return (
      <div className="page narrow">
        <SellerForm onSaved={() => navigate("/dashboard")} />
      </div>
    );
  const plan = plans.find(
      (p) =>
        p.id ===
        (entitlement && new Date(entitlement.expires_at) > new Date()
          ? entitlement.plan_id
          : "free"),
    ),
    limit =
      entitlement && new Date(entitlement.expires_at) > new Date()
        ? entitlement.listing_limit
        : plans.find((p) => p.id === "free")?.listing_limit || 3;
  const tabs = [
    ["products", Package, "My products"],
    ["profile", Storefront, "Shop identity"],
    ["collections", Stack, "Collections"],
    ["package", Package, "My package"],
    ["import", UploadSimple, "Import catalogue"],
    ["promotions", Megaphone, "Promote my shop"],
  ];
  return (
    <div className="page dashboard">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">YOUR LITTLE CORNER OF THE MARKET</span>
          <h1>{seller.name}</h1>
          <p>
            {seller.location} ·{" "}
            {seller.type === "shop" ? "Shop account" : "Individual seller"}
          </p>
        </div>
        <Link className="button outline" to={"/seller/" + seller.slug}>
          View storefront <ArrowSquareOut size={18} />
        </Link>
      </div>
      {visual && (
        <div className="notice-box">
          Seller workspace preview. Changes cannot be published without a
          connected account.
        </div>
      )}
      <div className="dashboard-layout">
        <aside className="dashboard-menu">
          {tabs.map(([id, Icon, label]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              <Icon size={21} />
              {label}
            </button>
          ))}
          {admin && (
            <Link to="/admin">
              <ShieldCheck size={20} /> Marketplace admin
            </Link>
          )}
          <div className="usage">
            <b>{plan?.name || "Free"} package</b>
            <p>
              {count} / {limit.toLocaleString()} active products
            </p>
            <progress value={Math.min(count, limit)} max={limit} />
            <Link to="/plans">
              Find more room <ArrowRight size={14} />
            </Link>
          </div>
          {session && (
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/");
              }}
            >
              <SignOut /> Sign out
            </button>
          )}
        </aside>
        <section className="dashboard-content">
          {tab === "products" && (
            <>
              <div className="section-heading">
                <div>
                  <h2>Your products</h2>
                  <p>Keep your good things looking their best.</p>
                </div>
                <button className="button primary" onClick={() => setAdd(true)}>
                  <Plus /> Add product
                </button>
              </div>
              {rows.length ? (
                <div className="inventory">
                  {rows.map((i) => (
                    <div className="inventory-row" key={i.id}>
                      <Photo src={i.images?.[0]} alt={i.title} />
                      <div>
                        <strong>{i.title}</strong>
                        <small>
                          {money(i.price)} · {i.category_id}
                        </small>
                      </div>
                      <span className={"status " + i.status}>{i.status}</span>
                      <button
                        className="icon-button"
                        aria-label={"Edit " + i.title}
                        onClick={() => setEditing(i)}
                      >
                        <PencilSimple size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <Empty title="Your first product starts here">
                  Add photos, a price and a little detail. We’ll give it a home.
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
          )}
          {tab === "profile" && (
            <SellerForm
              key={seller.id}
              existing={seller}
              onSaved={refreshUser}
            />
          )}{" "}
          {tab === "collections" && (
            <>
              <h2>Make room for everything</h2>
              <p>
                Collections organise products inside your shop. Marketplace
                categories stay the same.
              </p>
              <form
                className="inline-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    if (visual)
                      throw Error("Connect your account to save collections.");
                    await result(
                      collectionEdit
                        ? supabase
                            .from("collections")
                            .update({ name: collectionName })
                            .eq("id", collectionEdit)
                        : supabase.from("collections").insert({
                            seller_id: seller.id,
                            name: collectionName,
                            position: collections.length,
                          }),
                    );
                    setCollectionName("");
                    setCollectionEdit(null);
                    load();
                  } catch (e) {
                    notice(e.message);
                  }
                }}
              >
                <Field
                  label="Collection name"
                  required
                  maxLength={60}
                  value={collectionName}
                  onChange={(e) => setCollectionName(e.target.value)}
                  placeholder="e.g. New arrivals"
                />
                <button className="button primary">
                  {collectionEdit ? "Save" : "Add collection"}
                </button>
              </form>
              {collections.map((c) => (
                <div className="table-row" key={c.id}>
                  <strong>{c.name}</strong>
                  <button
                    aria-label={"Edit " + c.name}
                    onClick={() => {
                      setCollectionEdit(c.id);
                      setCollectionName(c.name);
                    }}
                  >
                    <PencilSimple />
                  </button>
                  <button
                    aria-label={"Delete " + c.name}
                    onClick={async () => {
                      try {
                        await result(
                          supabase
                            .from("listings")
                            .update({ collection_id: null })
                            .eq("collection_id", c.id),
                        );
                        await result(
                          supabase.from("collections").delete().eq("id", c.id),
                        );
                        load();
                      } catch (e) {
                        notice(e.message);
                      }
                    }}
                  >
                    <Trash />
                  </button>
                </div>
              ))}
            </>
          )}
          {tab === "package" && (
            <>
              <h2>Your space to grow</h2>
              <div className="package-summary">
                <span className="eyebrow">CURRENT PACKAGE</span>
                <h2>{plan?.name || "Free"}</h2>
                <p>
                  {count} active listings out of {limit.toLocaleString()}
                </p>
                <p>
                  {entitlement
                    ? "Valid until " +
                      new Date(entitlement.expires_at).toLocaleDateString()
                    : "Your first 3 listings are free."}
                </p>
                <Link className="button primary" to="/plans">
                  Explore packages <ArrowRight />
                </Link>
              </div>
              <p>
                Packages last 30 days and renew manually. On expiry your
                catalogue is kept; only your newest free allowance stays public.
              </p>
            </>
          )}
          {tab === "import" && <Importer seller={seller} visual={visual} />}{" "}
          {tab === "promotions" && (
            <Promotions seller={seller} visual={visual} />
          )}
        </section>
      </div>
      {(add || editing) && (
        <ListingEditor
          visual={visual}
          seller={seller}
          initial={editing}
          collections={collections}
          onClose={() => {
            setAdd(false);
            setEditing(null);
          }}
          onSaved={load}
        />
      )}
    </div>
  );
}
