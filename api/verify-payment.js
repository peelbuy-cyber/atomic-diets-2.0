export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return res.status(500).json({ error: "Missing STRIPE_SECRET_KEY in environment variables." });
    }

    const { session_id } = req.body || {};
    if (!session_id) {
      return res.status(400).json({ error: "Missing session_id" });
    }

    // Call Stripe to retrieve checkout session
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(session_id)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(500).json({ error: data?.error?.message || "Stripe error" });
    }

    // Basic pro logic:
    // If checkout.session.completed happened, session status should indicate it's paid.
    // We use safer wording and boolean logic only.
    const paid = data?.payment_status === "paid" || data?.status === "complete";

    return res.status(200).json({
      paid: !!paid,
      session: {
        id: data?.id || null,
        status: data?.status || null,
        payment_status: data?.payment_status || null,
        customer_email: data?.customer_details?.email || data?.customer_email || null
      }
    });
  } catch (err) {
    console.error("verify-payment error:", err);
    return res.status(500).json({ error: err?.message || "Server error" });
  }
}
