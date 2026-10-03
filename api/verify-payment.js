import {
  authenticated,
  verifySignature,
  fulfill,
  fail,
} from "./_lib/server.js";
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  try {
    const { client, seller } = await authenticated(req);
    const b =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    if (
      !verifySignature(
        b.razorpay_order_id + "|" + b.razorpay_payment_id,
        b.razorpay_signature,
        process.env.RAZORPAY_KEY_SECRET,
      )
    )
      return res
        .status(400)
        .json({ error: "Payment signature could not be verified" });
    const { data: order } = await client
      .from("billing_orders")
      .select("seller_id")
      .eq("gateway_order_id", b.razorpay_order_id)
      .single();
    if (order?.seller_id !== seller.id)
      return res
        .status(403)
        .json({ error: "Order does not belong to this seller" });
    await fulfill(client, b.razorpay_order_id, b.razorpay_payment_id);
    return res.status(200).json({ success: true });
  } catch (e) {
    return fail(res, e);
  }
}
