import React from "react";
import { Field } from "./UI";
import { CLOTHING_SIZES, commerceFor } from "../lib/commerce";

function optionId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export function InventoryEditor({ value, onChange, category }) {
  const c = commerceFor({ commerce: value });
  const set = (k, v) => onChange({ ...c, [k]: v });
  const edit = (id, k, v) =>
    set(
      "variants",
      c.variants.map((x) => (x.id === id ? { ...x, [k]: v } : x)),
    );
  return (
    <section className="inventory-editor">
      <h3>Buying options & stock</h3>
      <Field label="How is this item sold?">
        <select value={c.mode} onChange={(e) => set("mode", e.target.value)}>
          <option value="enquiry">Enquiry / viewing / quote</option>
          <option value="retail">Retail · choose options & quantity</option>
        </select>
      </Field>
      <div className="form-grid">
        <Field
          label="Stock available (blank = ask seller)"
          type="number"
          min="0"
          max="1000000"
          step="1"
          value={c.stock ?? ""}
          disabled={c.variants.length > 0}
          onChange={(e) =>
            set("stock", e.target.value === "" ? null : Number(e.target.value))
          }
        />
        <Field
          label="Selling unit"
          maxLength={40}
          value={c.unit}
          onChange={(e) => set("unit", e.target.value)}
        />
      </div>
      <p className="muted">
        Zero stock shows “Out of stock”. When options are added, each option
        controls its own stock. Stock is updated by you after confirming a sale.
      </p>
      {category === "fashion" && (
        <button
          type="button"
          className="button outline"
          onClick={() =>
            set("variants", [
              ...c.variants,
              ...CLOTHING_SIZES.filter(
                (s) => !c.variants.some((v) => v.label === s),
              ).map((s) => ({
                id: optionId(),
                label: s,
                stock: 0,
                price: null,
              })),
            ])
          }
        >
          Add sizes XS–XXL
        </button>
      )}
      {c.variants.map((v) => (
        <div className="variant-editor" key={v.id}>
          <Field
            label="Size / option"
            required
            maxLength={80}
            value={v.label}
            placeholder="M · Blue or Pack of 4"
            onChange={(e) => edit(v.id, "label", e.target.value)}
          />
          <Field
            label="In stock"
            required
            type="number"
            min="0"
            max="1000000"
            step="1"
            value={v.stock}
            onChange={(e) => edit(v.id, "stock", Number(e.target.value))}
          />
          <Field
            label="Price ₹ (blank = base)"
            type="number"
            min="0"
            step="0.01"
            value={v.price ?? ""}
            onChange={(e) =>
              edit(
                v.id,
                "price",
                e.target.value === "" ? null : Number(e.target.value),
              )
            }
          />
          <button
            type="button"
            className="text-button"
            aria-label={"Remove option " + (v.label || "unnamed")}
            onClick={() =>
              set(
                "variants",
                c.variants.filter((x) => x.id !== v.id),
              )
            }
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button outline"
        disabled={c.variants.length >= 100}
        onClick={() =>
          set("variants", [
            ...c.variants,
            { id: optionId(), label: "", stock: 0, price: null },
          ])
        }
      >
        Add size, colour or pack option
      </button>
      <Field label="Delivery / collection information">
        <textarea
          maxLength={500}
          value={c.delivery}
          onChange={(e) => set("delivery", e.target.value)}
        />
      </Field>
    </section>
  );
}
