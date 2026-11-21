// POST /api/stripe-webhook: Stripe calls this when a payment completes.
// This is what emails paid orders to the shop, even if the customer closes the page after paying.
import { json, fromMetadata, verifyStripeSignature, sendOrderEmails } from "../_lib/order.js";

export async function onRequestPost({ request, env }) {
  const payload = await request.text();
  if (!(await verifyStripeSignature(payload, request.headers.get("Stripe-Signature"), env.STRIPE_WEBHOOK_SECRET || ""))) return json({ error: "bad signature" }, 400);
  const event = JSON.parse(payload);
  const s = event.data && event.data.object;
  const done = event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded";
  if (!done || !s || s.payment_status !== "paid" || !s.metadata || !s.metadata.parts) return json({ ignored: true });
  const order = fromMetadata(s.metadata);
  order.payment = "card";
  try {
    await sendOrderEmails(env, order, { amount: s.amount_total / 100, id: s.payment_intent || s.id });
  } catch (e) {
    console.log("Order email failed, Stripe will retry:", e.message);
    return json({ error: "email failed" }, 500);   // Stripe retries for up to 3 days
  }
  return json({ ok: true });
}
