import React, { useState, useEffect } from "react";
import {
  SlidersHorizontal,
  Storefront,
  Package,
  Megaphone,
  Flag,
  Plus,
  PencilSimple,
  ShieldCheck,
  ClockCounterClockwise,
  SquaresFour,
} from "@phosphor-icons/react";
import { useMarket, Link } from "../lib/context";
import { supabase, result } from "../lib/backend";
import { Modal, Field, Upload, Photo } from "../components/UI";
import { SellerForm } from "./Account";
import { ListingEditor } from "./Dashboard";
const sections = [
  ["settings", "Homepage", SlidersHorizontal],
  ["sellers", "Sellers", Storefront],
  ["listings", "Listings", Package],
  ["categories", "Categories", SquaresFour],
  ["plans", "Packages", Package],
  ["campaigns", "Advertisements", Megaphone],
  ["reports", "Reports", Flag],
  ["audit_log", "Activity log", ClockCounterClockwise],
];
const defaults = {
  categories: {
    id: "",
    name: "",
    theme: "general",
    fields: [],
    position: 0,
    active: true,
  },
  plans: {
    id: "",
    name: "",
    price: 500,
    listing_limit: 50,
    image_limit: 8,
    active: true,
  },
  campaigns: {},
};
export function Admin({ visual = false }) {
  const { settings, refresh, notice, fixtures } = useMarket();
  const [tab, setTab] = useState("settings"),
    [rows, setRows] = useState([]),
    [editing, setEditing] = useState(null),
    [isNew, setIsNew] = useState(false),
    [busy, setBusy] = useState(false),
    [homepage, setHomepage] = useState(settings),
    [page, setPage] = useState(0),
    [more, setMore] = useState(false),
    [query, setQuery] = useState("");
  const load = async () => {
    if (tab === "settings") return;
    try {
      if (visual) {
        setRows(fixtures?.[tab] || []);
        return;
      }
      let q = supabase
        .from(tab)
        .select(tab === "listings" ? "*,seller:sellers(*)" : "*")
        .range(page * 30, page * 30 + 30);
      if (["sellers", "categories", "plans"].includes(tab)) {
        q = q.order("name");
        if (query) q = q.ilike("name", "%" + query.replace(/[%_]/g, "") + "%");
      } else {
        q = q.order("created_at", { ascending: false });
        if (query && ["listings", "campaigns"].includes(tab))
          q = q.ilike("title", "%" + query.replace(/[%_]/g, "") + "%");
      }
      const d = await result(q);
      setRows(d.slice(0, 30));
      setMore(d.length > 30);
    } catch (e) {
      notice(e.message);
    }
  };
  useEffect(() => {
    load();
  }, [tab, page, query, fixtures]);
  useEffect(() => setHomepage(settings), [settings]);
  const save = async (table, data, id) => {
    if (visual)
      throw Error(
        "Administrator preview only. Live changes require a connected admin account.",
      );
    await result(
      id
        ? supabase.from(table).update(data).eq("id", id)
        : supabase.from(table).insert(data),
    );
    await refresh();
    load();
  };
  const editFields = {
    categories: ["id", "name", "theme", "fields", "position", "active"],
    plans: ["id", "name", "price", "listing_limit", "image_limit", "active"],
    campaigns: [
      "title",
      "description",
      "image",
      "video_url",
      "destination",
      "starts_at",
      "ends_at",
      "status",
      "paid",
    ],
    reports: ["reason", "resolved"],
  };
  return (
    <div className="page dashboard">
      <div className="dashboard-heading">
        <div>
          <span className="eyebrow">MARKETPLACE ADMINISTRATION</span>
          <h1>Your market, thoughtfully managed.</h1>
          <p>
            Content, people, packages and the things that make this place yours.
          </p>
        </div>
        <ShieldCheck size={44} weight="light" />
      </div>
      {visual && (
        <div className="notice-box">
          Read-only admin design preview. No administrator session is simulated.
        </div>
      )}
      <div className="dashboard-layout">
        <aside className="dashboard-menu">
          {sections.map(([id, label, Icon]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => {
                setTab(id);
                setPage(0);
                setQuery("");
              }}
            >
              <Icon size={21} />
              {label}
            </button>
          ))}
        </aside>
        <section className="dashboard-content">
          {tab === "settings" ? (
            <form
              className="editor-form"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  await save("settings", { value: homepage }, "marketplace");
                  notice("Marketplace content updated");
                } catch (e) {
                  notice(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h2>Your homepage</h2>
              <p>
                Edit the public identity, hero, announcement and support
                details.
              </p>
              {[
                ["name", "Marketplace name"],
                ["tagline", "Brand tagline"],
                ["announcement", "Announcement bar"],
                ["hero_title", "Hero headline"],
                ["hero_description", "Hero description"],
                ["support_email", "Support email"],
                ["support_whatsapp", "Support WhatsApp number"],
                ["ads_price_note", "Featured placement pricing note"],
              ].map(([key, label]) => (
                <Field
                  key={key}
                  label={label}
                  value={homepage[key] || ""}
                  onChange={(e) =>
                    setHomepage({ ...homepage, [key]: e.target.value })
                  }
                />
              ))}
              <h3>Hero photograph</h3>
              <Upload
                value={homepage.hero_image}
                onChange={(v) => setHomepage({ ...homepage, hero_image: v })}
              />
              <button className="button primary" disabled={busy}>
                {busy ? "Saving…" : "Save homepage"}
              </button>
            </form>
          ) : (
            <>
              <div className="section-heading">
                <h2>{sections.find((x) => x[0] === tab)?.[1]}</h2>
                {["categories", "plans"].includes(tab) && (
                  <button
                    className="button primary"
                    onClick={() => {
                      setEditing({ ...defaults[tab] });
                      setIsNew(true);
                    }}
                  >
                    <Plus /> Add new
                  </button>
                )}
              </div>
              {[
                "sellers",
                "listings",
                "categories",
                "plans",
                "campaigns",
              ].includes(tab) && (
                <Field
                  label="Search by name or title"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(0);
                  }}
                />
              )}
              <div className="admin-list">
                {rows.map((r) => (
                  <div className="admin-row" key={r.id || r.user_id}>
                    <div>
                      <strong>
                        {r.name || r.title || r.reason || r.action}
                      </strong>
                      <small>
                        {tab === "plans"
                          ? `${r.listing_limit} listings · ₹${r.price} / 30 days`
                          : tab === "sellers"
                            ? `${r.type} · ${r.location} · ${r.suspended ? "Suspended" : "Active"}`
                            : tab === "campaigns"
                              ? `${r.status} · ${r.paid ? "Payment recorded" : "Unpaid"}`
                              : tab === "audit_log"
                                ? `${r.entity} · ${new Date(r.created_at).toLocaleString()}`
                                : r.status || r.id}
                      </small>
                    </div>
                    {tab !== "audit_log" && (
                      <button
                        className="icon-button"
                        aria-label={"Edit " + (r.name || r.title || "report")}
                        onClick={() => {
                          setEditing(r);
                          setIsNew(false);
                        }}
                      >
                        <PencilSimple size={20} />
                      </button>
                    )}
                    {tab === "sellers" && (
                      <button
                        className="button outline small"
                        onClick={async () => {
                          try {
                            await save(
                              "sellers",
                              { suspended: !r.suspended },
                              r.id,
                            );
                            notice(
                              r.suspended
                                ? "Seller restored"
                                : "Seller suspended",
                            );
                          } catch (e) {
                            notice(e.message);
                          }
                        }}
                      >
                        {r.suspended ? "Restore" : "Suspend"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {!rows.length && <p className="muted">No records to show.</p>}
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
        </section>
      </div>
      {editing && tab === "sellers" && (
        <Modal title="Edit seller" side onClose={() => setEditing(null)}>
          <SellerForm
            existing={editing}
            onSaved={() => {
              setEditing(null);
              load();
            }}
          />
        </Modal>
      )}
      {editing && tab === "listings" && (
        <>
          <ListingEditor
            visual={visual}
            seller={editing.seller}
            initial={editing}
            onClose={() => setEditing(null)}
            moderationAction={
              <div className="moderation-action">
                <button
                  className="button danger"
                  onClick={async () => {
                    try {
                      await save(
                        "listings",
                        { status: "rejected" },
                        editing.id,
                      );
                      setEditing(null);
                      notice("Listing removed from public view");
                    } catch (e) {
                      notice(e.message);
                    }
                  }}
                >
                  Remove from marketplace
                </button>
              </div>
            }
            onSaved={load}
          />
        </>
      )}
      {editing && editFields[tab] && (
        <Modal
          title={(isNew ? "Create " : "Edit ") + tab.replace("_", " ")}
          side
          onClose={() => setEditing(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                const data = Object.fromEntries(
                  editFields[tab].map((k) => [k, editing[k]]),
                );
                if (!isNew) delete data.id;
                await save(tab, data, isNew ? null : editing.id);
                setEditing(null);
                notice("Changes saved");
              } catch (e) {
                notice(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            {editFields[tab].map((k) =>
              typeof editing[k] === "boolean" ? (
                <label className="checkbox-field" key={k}>
                  <input
                    type="checkbox"
                    checked={editing[k]}
                    onChange={(e) =>
                      setEditing({ ...editing, [k]: e.target.checked })
                    }
                  />
                  {k === "paid" ? "Payment has been independently verified" : k}
                </label>
              ) : k === "fields" ? (
                <Field
                  key={k}
                  label="Category fields, separated by commas"
                  value={(editing.fields || []).join(", ")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      fields: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              ) : k === "status" ? (
                <Field key={k} label="Review status">
                  <select
                    value={editing.status}
                    onChange={(e) =>
                      setEditing({ ...editing, status: e.target.value })
                    }
                  >
                    {["pending", "approved", "rejected", "paused"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
              ) : (
                <Field
                  key={k}
                  label={k.replaceAll("_", " ")}
                  required={["id", "name", "title"].includes(k)}
                  disabled={k === "id" && !isNew}
                  type={typeof editing[k] === "number" ? "number" : "text"}
                  min={0}
                  value={editing[k] ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      [k]:
                        typeof editing[k] === "number"
                          ? Number(e.target.value)
                          : e.target.value,
                    })
                  }
                />
              ),
            )}
            {tab === "campaigns" && (
              <p className="notice-box">
                Only approve an advert after reviewing its content and recording
                a verified payment. Dates must include a timezone, for example
                2026-10-10T09:00:00+05:30.
              </p>
            )}
            <button className="button primary" disabled={busy}>
              {busy ? "Saving…" : "Save changes"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
