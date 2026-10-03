import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";
export function db() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    throw Object.assign(Error("Account services are not configured."), {
      status: 503,
    });
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function authenticated(req) {
  const client = db();
  const token = (req.headers.authorization || "").replace(/^Bearer /, "");
  if (!token) throw Object.assign(Error("Sign in required"), { status: 401 });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user)
    throw Object.assign(Error("Sign in required"), { status: 401 });
  const { data: seller } = await client
    .from("sellers")
    .select("*")
    .eq("user_id", data.user.id)
    .eq("suspended", false)
    .single();
  if (!seller)
    throw Object.assign(Error("Create your seller profile first"), {
      status: 403,
    });
  return { client, user: data.user, seller };
}
export function verifySignature(text, signature, secret) {
  if (
    !secret ||
    typeof signature !== "string" ||
    !/^[a-f0-9]{64}$/i.test(signature)
  )
    return false;
  const expected = createHmac("sha256", secret).update(text).digest();
  const received = Buffer.from(signature, "hex");
  return (
    received.length === expected.length && timingSafeEqual(received, expected)
  );
}
export async function gateway(path, body) {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
    throw Object.assign(
      Error("Payments are not enabled yet. Your current package is unchanged."),
      { status: 503 },
    );
  const r = await fetch("https://api.razorpay.com/v1/" + path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(
          process.env.RAZORPAY_KEY_ID + ":" + process.env.RAZORPAY_KEY_SECRET,
        ).toString("base64"),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(12000),
  });
  const data = await r.json();
  if (!r.ok)
    throw Object.assign(
      Error(
        "Payment provider could not complete this request. Please try again.",
      ),
      { status: 502 },
    );
  return data;
}
export function fail(res, e) {
  res
    .status(e.status || 400)
    .json({
      error: e.status
        ? e.message
        : "Unable to complete this request. Please contact support if it continues.",
    });
}
export async function fulfill(client, orderId, paymentId) {
  const { data: order, error } = await client
    .from("billing_orders")
    .select("*")
    .eq("gateway_order_id", orderId)
    .single();
  if (error || !order) throw Error("Unknown order");
  const payment = await gateway("payments/" + encodeURIComponent(paymentId));
  if (
    payment.status !== "captured" ||
    payment.order_id !== orderId ||
    payment.currency !== "INR" ||
    payment.amount !== order.amount
  )
    throw Object.assign(
      Error(
        "Payment is not captured or does not match this order. Please wait for confirmation.",
      ),
      { status: 409 },
    );
  const outcome = await client.rpc("fulfill_order", {
    p_order: orderId,
    p_payment: paymentId,
  });
  if (outcome.error) throw outcome.error;
  return order;
}
