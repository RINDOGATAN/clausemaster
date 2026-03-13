# Publisher Revenue Share Guide

This guide explains how lawyers and publishers earn money from skills they create in Clausemaster.

---

## How It Works

When you publish a skill through Clausemaster, it becomes available on TodoLaw platforms (Dealroom, DPO Central, AI Sentinel). Customers subscribe to use your skill, and you earn **70% of the subscription revenue** it generates. The remaining 30% goes to the platform.

```
Customer pays EUR 9/mo per skill
  └─ 70% (EUR 6.30) → You (the publisher)
  └─ 30% (EUR 2.70) → TodoLaw platform
```

Payments are processed automatically via **Stripe Connect Express**. You don't need to invoice anyone — Stripe transfers your share directly to your bank account.

---

## Setting Up Your Stripe Account

### Step 1: Go to Settings

Navigate to **Settings** in Clausemaster. Below your Publisher Profile, you'll see a **Revenue Share** section.

### Step 2: Connect Stripe

Click **Connect Stripe Account**. You'll be redirected to Stripe's hosted onboarding where you provide:

- Your legal name or firm name
- Bank account details for payouts
- Tax information (varies by country)

This is a standard Stripe Express onboarding — Clausemaster never sees your bank details.

### Step 3: Return to Clausemaster

After completing Stripe's onboarding, you'll be redirected back to Clausemaster. The Revenue Share section will show **Stripe Account Connected** with a green checkmark.

If you close the tab before finishing, no problem — go back to Settings and click **Complete Setup** to resume where you left off.

---

## When Do I Get Paid?

Revenue share payments are triggered when customers pay their subscriptions:

1. Customer's monthly subscription renews on Stripe
2. Payment succeeds → Stripe webhook fires
3. Platform calculates your 70% share
4. Stripe transfers your share to your connected account
5. Stripe pays out to your bank per your payout schedule (typically daily or weekly)

You can view your earnings, payouts, and tax documents in the [Stripe Express Dashboard](https://connect.stripe.com/express_login).

---

## Which Platforms Pay Revenue Share?

Your skills can be published to multiple TodoLaw platforms. Revenue share works the same way on all of them:

| Platform | Skill Type | Revenue Share |
|----------|-----------|---------------|
| **Dealroom** | Contract negotiation skills (NDA, MSA, DPA, etc.) | 70/30 |
| **DPO Central** | Privacy compliance assessments | 70/30 |
| **AI Sentinel** | AI governance assessments | 70/30 |

The publisher's Stripe Connect account is synced automatically when a skill is exported from Clausemaster to any platform.

---

## The Publishing Flow

Here's how a skill goes from contract upload to earning revenue:

```
1. Upload      → Upload a contract to Clausemaster
2. Analyze     → AI extracts clauses, flags issues
3. Generate    → AI creates a skill draft from the analysis
4. Review      → You edit and refine the draft
5. Submit      → Submit to the marketplace for admin review
6. Approved    → Admin approves the skill
7. Export      → Skill is exported to legalskills repository
8. Seed        → Target platform (Dealroom, etc.) seeds the skill
9. Live        → Customers can subscribe and use your skill
10. Revenue    → You earn 70% of each subscription payment
```

Your Stripe Connect account ID is embedded in the skill's manifest when it is exported (step 7), so the downstream platform knows where to send your revenue share.

---

## Disconnecting Stripe

You can disconnect your Stripe account at any time from **Settings → Revenue Share → Disconnect Stripe account**.

If you disconnect:
- You will stop receiving revenue share payments
- Your published skills remain active on the platforms
- The platform retains 100% of revenue until you reconnect
- Reconnecting resumes payments from the next billing cycle

---

## FAQ

### Do I need a Stripe account before publishing my first skill?

No. You can publish skills without connecting Stripe. However, you won't receive revenue share until you connect. The platform retains 100% in the meantime — once you connect, payments start from the next billing cycle.

### What type of Stripe account is created?

Stripe Connect **Express**. This is a lightweight account managed by Stripe — you get a dashboard to view earnings and manage payouts, but Clausemaster handles the payment routing.

### Can I use an existing Stripe account?

The onboarding creates a new Stripe Express account linked to Clausemaster. If you already have a Stripe account for other purposes, this won't conflict with it.

### What currencies are supported?

Subscriptions are charged in **EUR** (Europe) or **USD** (US). Stripe converts to your local currency at payout time if needed.

### How do I see my earnings?

Log into the [Stripe Express Dashboard](https://connect.stripe.com/express_login) to see:
- Individual payments received
- Pending payouts
- Payout history
- Tax documents (1099 for US, etc.)

### What if a customer disputes a charge?

Disputes are handled by the platform. If a refund is issued, the corresponding revenue share is clawed back from future payouts.

### Is the 70/30 split negotiable?

The default split is 70% publisher / 30% platform. Custom splits may be available for high-volume publishers — contact the TodoLaw team.

### I'm outside the US/EU. Can I still receive payments?

Yes. Stripe Connect Express supports [46+ countries](https://stripe.com/connect/supported-destinations). Payouts are made in your local currency.
