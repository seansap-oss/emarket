import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { POST } from "../api/payment-webhook.js";
test("webhook preserves signed bytes, rejects tampering and caps body size", async () => {
  const previous = process.env.RAZORPAY_WEBHOOK_SECRET;
  try {
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    assert.equal(
      (
        await POST(
          new Request("https://example.test", { method: "POST", body: "{}" }),
        )
      ).status,
      503,
    );
    process.env.RAZORPAY_WEBHOOK_SECRET = "local-test-secret";
    const raw = '{ "event" : "payment.failed" }\n';
    const signature = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(raw)
      .digest("hex");
    const request = (body) =>
      new Request("https://example.test", {
        method: "POST",
        body,
        headers: { "x-razorpay-signature": signature },
      });
    assert.equal((await POST(request(raw))).status, 200);
    assert.equal((await POST(request(raw.trim()))).status, 400);
    assert.equal(
      (await POST(request("x".repeat(1024 * 1024 + 1)))).status,
      413,
    );
  } finally {
    if (previous === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
    else process.env.RAZORPAY_WEBHOOK_SECRET = previous;
  }
});
