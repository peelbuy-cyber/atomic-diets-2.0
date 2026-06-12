export default async function handler(req, res) {
   ```
7. Click **Commit changes** → **Commit changes** again

---

## Where the secret values come from (important)
After code is in place, you must add these in **Vercel Environment Variables** (not in chat, not in GitHub):
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID_MONTHLY`
- `STRIPE_PRICE_ID_YEARLY`
- `BASE_URL`

(We’ll do that later when you’re at deployment stage.)

---

## Question for you (so I guide perfectly)
When you opened `api/create-checkout.js` in GitHub and clicked edit, did you see the part with:      customer_email: req.body?.email,
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
