import { db, verifySignature, fulfill } from "./_lib/server.js";

// Web Request preserves the signed bytes without framework JSON parsing.
export async function POST(request) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET)
    return Response.json({ error: "Webhook not configured" }, { status: 503 });
  try {
    const reader = request.body?.getReader();
    const chunks = [];
    let size = 0;
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 1024 * 1024) {
          await reader.cancel();
          return new Response(null, { status: 413 });
        }
        chunks.push(Buffer.from(value));
      }
    }
    const raw = Buffer.concat(chunks);
    if (
      !verifySignature(
        raw,
        request.headers.get("x-razorpay-signature"),
        process.env.RAZORPAY_WEBHOOK_SECRET,
      )
    )
      return Response.json({ error: "Invalid signature" }, { status: 400 });
    let event;
    try {
      event = JSON.parse(raw.toString("utf8"));
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if (event.event === "payment.captured") {
      const payment = event.payload?.payment?.entity;
      if (!payment?.order_id || !payment?.id)
        return Response.json(
          { error: "Missing payment identifiers" },
          { status: 400 },
        );
      await fulfill(db(), payment.order_id, payment.id);
    }
    return Response.json({ received: true });
  } catch {
    // A temporary provider/database failure must trigger provider retry.
    return Response.json(
      { error: "Payment confirmation temporarily unavailable" },
      { status: 503 },
    );
  }
}
