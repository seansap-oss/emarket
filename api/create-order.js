import { authenticated, gateway, fail } from "./_lib/server.js";
export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });
  try {
    const { client, seller } = await authenticated(req);
    const { planId } =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    if (typeof planId !== "string")
      return res.status(400).json({ error: "Choose a package" });
    const { data: plan } = await client
      .from("plans")
      .select("*")
      .eq("id", planId)
      .eq("active", true)
      .single();
    if (!plan || plan.price <= 0)
      return res.status(400).json({ error: "Choose a paid package" });
    const { count } = await client
      .from("billing_orders")
      .select("*", { count: "exact", head: true })
      .eq("seller_id", seller.id)
      .gte("created_at", new Date(Date.now() - 3600000).toISOString());
    if (count >= 10)
      return res
        .status(429)
        .json({ error: "Too many payment attempts. Try again later." });
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
      return res
        .status(503)
        .json({
          error: "Payments are awaiting setup. No payment has been taken.",
        });
    const amount = plan.price * 100;
    const { data: record, error } = await client
      .from("billing_orders")
      .insert({
        seller_id: seller.id,
        plan_id: plan.id,
        listing_limit: plan.listing_limit,
        amount,
      })
      .select()
      .single();
    if (error) throw error;
    const order = await gateway("orders", {
      amount,
      currency: "INR",
      receipt: record.id,
      notes: { seller_id: seller.id, plan_id: plan.id },
    });
    const { error: updateError } = await client
      .from("billing_orders")
      .update({ gateway_order_id: order.id })
      .eq("id", record.id);
    if (updateError) throw updateError;
    return res
      .status(200)
      .json({ key: process.env.RAZORPAY_KEY_ID, orderId: order.id, amount });
  } catch (e) {
    return fail(res, e);
  }
}
