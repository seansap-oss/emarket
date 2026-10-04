import React, { useState } from "react";
import { Field, Modal, Photo } from "./UI";
import { useMarket } from "../lib/context";
import {
  commerceFor,
  stockFor,
  outOfStock,
  selectedPrice,
  validateSelection,
} from "../lib/commerce";
import { money, whatsappUrl } from "../lib/utils";
export function PurchasePanel({ item }) {
  const { notice } = useMarket();
  const [variant, setVariant] = useState(""),
    [quantity, setQuantity] = useState(1),
    [open, setOpen] = useState(location.search.includes("enquire=1")),
    [message, setMessage] = useState(
      "Hi, can you confirm availability and the final price?",
    ),
    [method, setMethod] = useState("Arrange with seller");
  const c = commerceFor(item),
    stock = stockFor(item, variant),
    price = selectedPrice(item, variant),
    option = c.variants.find((v) => v.id === variant),
    payments = item.seller?.payment_options || {},
    unavailable = outOfStock(item);
  const total = Math.round(price * quantity * 100) / 100;
  let error = "";
  try {
    validateSelection(item, variant, quantity);
  } catch (e) {
    error = e.message;
  }
  const summary = `${item.title}${option ? " · " + option.label : ""}\nQuantity: ${quantity} ${c.unit}\nItem subtotal: ${money(total)} (confirm delivery/fees)\nPreferred payment: ${method}\n${location.origin}/listing/${item.id}`;
  const wa =
    !item.sample && !error
      ? whatsappUrl(item.seller?.whatsapp, `${message}\n\n${summary}`)
      : "";
  const methods = [
    "Arrange with seller",
    ...(payments.upi_id || payments.upi_qr ? ["UPI"] : []),
    ...(payments.cash_on_collection ? ["Cash on collection"] : []),
    ...(payments.cash_on_delivery ? ["Cash on delivery"] : []),
  ];
  return (
    <section className="purchase-panel">
      <p className={"stock-state " + (unavailable ? "unavailable" : "")}>
        {unavailable
          ? "Out of stock"
          : c.variants.length
            ? "Choose an available option"
            : stock === null
              ? "Confirm availability with seller"
              : `${stock} in stock`}
      </p>
      {c.variants.length > 0 && (
        <fieldset className="size-picker">
          <legend>Choose size / option</legend>
          {c.variants.map((v) => (
            <button
              type="button"
              key={v.id}
              aria-pressed={variant === v.id}
              disabled={!v.stock || unavailable}
              className={variant === v.id ? "active" : ""}
              onClick={() => {
                setVariant(v.id);
                setQuantity(1);
              }}
            >
              {v.label}
              {!v.stock ? " · sold out" : ""}
            </button>
          ))}
        </fieldset>
      )}
      {c.mode === "retail" && (
        <div className="purchase-quantity">
          <Field
            label={`Quantity (${c.unit})`}
            type="number"
            min="1"
            max={stock === null ? 999 : Math.min(999, stock || 1)}
            step="1"
            value={quantity}
            disabled={unavailable}
            onChange={(e) =>
              setQuantity(e.target.value === "" ? "" : Number(e.target.value))
            }
          />
          <div>
            <small>Item subtotal</small>
            <strong>{money(total)}</strong>
            {option && (
              <small>
                {option.stock} available · {money(price)} each
              </small>
            )}
          </div>
        </div>
      )}
      <p className="muted">{c.delivery}</p>
      <button
        className="button green full"
        disabled={unavailable}
        onClick={() => {
          if (error) return notice(error);
          setOpen(true);
        }}
      >
        {unavailable
          ? "Out of stock"
          : item.sample
            ? "Preview purchase enquiry"
            : c.mode === "retail"
              ? "Request to buy on WhatsApp"
              : "Enquire / arrange a viewing"}
      </button>
      <p className="contact-note">
        Confirm stock, delivery and the final amount with the seller. Enquiries
        do not reserve stock.
      </p>
      <details className="payment-options">
        <summary>UPI & payment options</summary>
        {!payments.upi_id && !payments.upi_qr && (
          <p className="muted">
            UPI details have not been provided. Ask this seller which payment
            methods they accept.
          </p>
        )}
        {payments.upi_id && (
          <>
            <p>
              UPI recipient:{" "}
              <strong>{payments.upi_name || item.seller?.name}</strong>
            </p>
            <code>{payments.upi_id}</code>
            <button
              className="text-button"
              disabled={!!item.sample}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(payments.upi_id);
                  notice("UPI ID copied");
                } catch {
                  notice("Copy the UPI ID shown above.");
                }
              }}
            >
              Copy UPI ID
            </button>
          </>
        )}
        {payments.upi_qr && (
          <Photo
            className="upi-qr"
            src={payments.upi_qr}
            alt="Seller-provided UPI payment QR"
          />
        )}
        {payments.cash_on_collection && <p>Cash on collection</p>}
        {payments.cash_on_delivery && (
          <p>Cash on delivery · confirm service area</p>
        )}
        <p>{payments.instructions}</p>
        <small>
          Pay only after agreement with the seller. Direct transfers are not
          verified by Onlinekeithel.
        </small>
      </details>
      {open && (
        <Modal
          title={
            item.sample
              ? "Sample purchase enquiry"
              : "Confirm your purchase enquiry"
          }
          onClose={() => setOpen(false)}
        >
          <div className="enquiry-product">
            <Photo src={item.images?.[0]} alt="" />
            <div>
              <strong>{item.title}</strong>
              <p>
                {option?.label} · Quantity {quantity} · {money(total)}
              </p>
            </div>
          </div>
          {error && (
            <p className="form-error" role="alert">
              {error} Close this window to change your selection.
            </p>
          )}
          <Field label="Preferred payment">
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              {methods.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </Field>
          <Field label="Your message">
            <textarea
              rows={4}
              maxLength={1000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </Field>
          <p className="muted">
            The selected option, quantity, subtotal and product link are added
            to your message. WhatsApp opens next; press Send there. This does
            not place a confirmed order or complete a payment.
          </p>
          {wa ? (
            <a
              className="button green full"
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
            >
              Continue in WhatsApp
            </a>
          ) : (
            <p className="notice-box">
              {item.sample
                ? "Sample only. No message or payment can be sent."
                : error || "The seller has not provided a WhatsApp number."}
            </p>
          )}
        </Modal>
      )}
    </section>
  );
}
