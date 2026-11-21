// POST /api/checkout: checks the order, then either starts a Stripe payment
// or (pay by phone) emails the order to the shop straight away.
import { json, buildOrder, toMetadata, stripe, sendOrderEmails, missingSettings, money } from "../_lib/order.js";

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "Something went wrong. Please try again." }, 400); }
  if (body && body.website) return json({ error: "Order not accepted." }, 400);   // hidden field only bots fill in

  let order;
  try { order = buildOrder(body); } catch (e) { return json({ error: e.message }, 400); }

  const origin = new URL(request.url).origin;
  try {
    if (body.payment === "card") {
      if (missingSettings(env, ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "RESEND_API_KEY", "SHOP_EMAIL"]).length) return json({ error: "Online payment isn't switched on yet. Please choose pay over the phone, or call us." }, 503);
      if (order.delivery.unknown) return json({ error: "Your address is outside our listed delivery areas, so we need to confirm the delivery cost first. Please choose pay over the phone." }, 400);
      const line_items = order.items.map((i) => ({
        quantity: i.qty,
        price_data: { currency: "aud", unit_amount: Math.round(i.price * 100), product_data: { name: i.name, ...(i.opts ? { description: i.opts } : {}) } },
      }));
      if (order.delivery.fee > 0) line_items.push({ quantity: 1, price_data: { currency: "aud", unit_amount: Math.round(order.delivery.fee * 100), product_data: { name: "Delivery to " + order.recipient.suburb } } });
      const session = await stripe(env, "POST", "checkout/sessions", {
        mode: "payment",
        line_items,
        customer_email: order.sender.email,
        client_reference_id: order.number,
        success_url: origin + "/cart.html?paid={CHECKOUT_SESSION_ID}#confirmation",
        cancel_url: origin + "/cart.html?cancelled=1#payment",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        metadata: toMetadata(order),
        payment_intent_data: { description: `Order ${order.number} for ${order.recipient.name}`, metadata: { order_number: order.number } },
      });
      return json({ url: session.url, number: order.number });
    }
    if (missingSettings(env, ["RESEND_API_KEY", "SHOP_EMAIL"]).length) return json({ error: "Online ordering isn't switched on yet. Please call us to place your order." }, 503);
    order.payment = "phone";
    await sendOrderEmails(env, order, null);
    return json({ order });
  } catch (e) {
    console.log("Checkout failed:", e.message);
    return json({ error: "Sorry, your order didn't go through. Please try again or call us." }, 502);
  }
}
