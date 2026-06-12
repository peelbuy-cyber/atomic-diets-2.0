export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const baseUrl = process.env.BASE_URL;

    if (!stripeSecretKey) {
      return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY in environment variables." });
    }
    if (!baseUrl) {
      return res.status(500).json({ error: "Missing BASE_URL in environment variables." });
    }

    const PRICE_ID_MONTHLY = process.env.STRIPE_PRICE_ID_MONTHLY;
    const PRICE_ID_YEARLY = process.env.STRIPE_PRICE_ID_YEARLY;

    if (!PRICE_ID_MONTHLY || !PRICE_ID_YEARLY) {
      return res.status(500).json({ error: "Missing Stripe price IDs in environment variables." });
    }

    const body = req.body || {};
    const plan = body.plan;
    const userId = body.userId || "";
    const email = body.email;

    if (!plan || (plan !== "monthly" && plan !== "yearly")) {
      return res.status(400).json({ error: "Invalid plan" });
    }
    if (!email) {
      return res.status(400).json({ error: "Missing email" });
    }

    const priceId = plan === "yearly" ? PRICE_ID_YEARLY : PRICE_ID_MONTHLY;

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        mode: "subscription",
        customer_email: email,
        allow_promotion_codes: "true",

        success_url: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/report.html?cancel=1`,

        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",

        "metadata[userId]": userId,
        "subscription_data[metadata][userId]": userId
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(500).json({ error: data?.error?.message || "Stripe error" });
    }

    return res.status(200).json({ url: data.url });
  } catch (err) {
    console.error("create-checkout error:", err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
}
