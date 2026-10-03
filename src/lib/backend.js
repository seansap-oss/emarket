import { createClient } from "@supabase/supabase-js";
export const configured = Boolean(
  import.meta.env.VITE_SUPABASE_URL &&
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
);
export const preview =
  import.meta.env.DEV && import.meta.env.VITE_PREVIEW_MODE === "true";
export const supabase = configured
  ? createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    )
  : null;
export function requireBackend() {
  if (!supabase)
    throw Error(
      "Account services are not connected yet. Please try again after setup.",
    );
  return supabase;
}
export async function result(query) {
  const { data, error } = await query;
  if (error) throw Error(error.message);
  return data;
}
export async function uploadImage(file, userId) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw Error("Choose a JPG, PNG or WebP photo");
  if (file.size > 5 * 1024 * 1024)
    throw Error("Each photo must be smaller than 5 MB");
  const ext = file.type.split("/")[1];
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const client = requireBackend();
  await result(
    client.storage
      .from("marketplace")
      .upload(path, file, { contentType: file.type, upsert: false }),
  );
  return client.storage.from("marketplace").getPublicUrl(path).data.publicUrl;
}
export async function checkout(planId) {
  const client = requireBackend();
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) throw Error("Sign in first");
  const res = await fetch("/api/create-order", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ planId }),
  });
  const data = await res.json();
  if (!res.ok) throw Error(data.error || "Unable to start payment");
  if (!window.Razorpay)
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = resolve;
      s.onerror = () => reject(Error("Payment service could not load"));
      document.head.appendChild(s);
    });
  return new Promise((resolve, reject) => {
    const r = new window.Razorpay({
      key: data.key,
      order_id: data.orderId,
      amount: data.amount,
      currency: "INR",
      name: "Leikai Market",
      description: "30-day seller package",
      handler: async (payment) => {
        try {
          const v = await fetch("/api/verify-payment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(payment),
          });
          const outcome = await v.json();
          if (!v.ok) throw Error(outcome.error);
          resolve(outcome);
        } catch (e) {
          reject(e);
        }
      },
      modal: {
        ondismiss: () =>
          reject(
            Error("Payment cancelled. Your current package is unchanged."),
          ),
      },
    });
    r.on("payment.failed", () =>
      reject(Error("Payment failed. Please try again.")),
    );
    r.open();
  });
}
