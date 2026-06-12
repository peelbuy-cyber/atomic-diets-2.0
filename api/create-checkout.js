export default async function handler(req, res) {
  try {
    // Only allow POST
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Stripe is not available unless the Node environment has it.
    // We'll use dynamic import to avoid bundling issues.
    const stripeModule = await import("stripe");
    const Stripe = stripeModule.default;

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const { plan, userId } = req.body || {};

    if (!plan || (plan !== "monthly" && plan !== "yearly")) {
      return res.status(400).json({ error: "Invalid plan" });
    }

    // Your Stripe Price IDs must be provided via environment variables.
    // We'll add these later in Vercel after we create Stripe Products.
    const PRICE_ID_MONTHLY = process.env.STRIPE_PRICE_ID_MONTHLY;
    const PRICE_ID_YEARLY = process.env.STRIPE_PRICE_ID_YEARLY;

    if (!PRICE_ID_MONTHLY || !PRICE_ID_YEARLY) {
      return res.status(500).json({ error: "Missing Stripe Price IDs in environment variables." });
    }

    const priceId = plan === "yearly" ? PRICE_ID_YEARLY : PRICE_ID_MONTHLY;

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      customer_email: req.body?.email,
      success_url: `${process.env.BASE_URL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.BASE_URL}/report.html?cancel=1`,
      metadata: {
        userId: userId || ""
      },
      subscription_data: {
        metadata: {
          userId: userId || ""
        }
      }
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("create-checkout error:", err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
}
