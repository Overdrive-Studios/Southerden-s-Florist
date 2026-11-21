// GET /api/status: tells checkout which ways of ordering are switched on.
import { json } from "../_lib/order.js";
export const onRequestGet = ({ env }) =>
  json({ orders: !!(env.RESEND_API_KEY && env.SHOP_EMAIL), card: !!(env.STRIPE_SECRET_KEY && env.STRIPE_WEBHOOK_SECRET && env.RESEND_API_KEY && env.SHOP_EMAIL), test: String(env.STRIPE_SECRET_KEY || "").startsWith("sk_test_") });
