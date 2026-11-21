// GET /api/order?session_id=cs_...: the confirmation page uses this after a card payment.
import { json, fromMetadata, stripe } from "../_lib/order.js";

export async function onRequestGet({ request, env }) {
  const id = new URL(request.url).searchParams.get("session_id") || "";
  if (!/^cs_[A-Za-z0-9_]+$/.test(id) || !env.STRIPE_SECRET_KEY) return json({ error: "not found" }, 404);
  try {
    const s = await stripe(env, "GET", "checkout/sessions/" + id);
    if (s.payment_status !== "paid") return json({ paid: false }, 402);
    const order = fromMetadata(s.metadata);
    order.payment = "card";
    order.paid = s.amount_total / 100;
    return json({ paid: true, order });
  } catch (e) {
    return json({ error: "not found" }, 404);
  }
}
