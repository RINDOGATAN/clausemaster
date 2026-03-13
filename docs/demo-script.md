# Clausemaster Demo Script

This document provides a step-by-step walkthrough of the entire Clausemaster platform, designed for recording a product demo video.

---

## Prerequisites

- Clausemaster running at `http://localhost:3002` (or `clausemaster.todo.law`)
- A test user with PUBLISHER role (or an invite code to create one)
- `STRIPE_SECRET_KEY` set in `.env` (use test mode key `sk_test_...`)
- `ANTHROPIC_API_KEY` set (or platform key for privileged domain)
- A sample contract PDF for upload (e.g., an NDA or consulting agreement)

---

## Demo Flow (9 scenes)

### Scene 1: Landing Page
**URL:** `/`
**What to show:**
- The Clausemaster landing page at `clausemaster.todo.law`
- Hero section: "Build the **skills** that power legal AI"
- Value propositions: 70% revenue, AI-powered, multi-platform reach
- Scroll to show: skill types (Contract, Assessment, Solo-Party), workflow steps, revenue model
- Click "Start Publishing" → navigates to sign-in

### Scene 2: Sign In & Onboarding
**URL:** `/sign-in` → `/onboarding`
**What to show:**
- Sign in with email (magic link) or Google
- Onboarding screen: "Are you a lawyer with a publisher invite code?"
- Enter invite code → "Welcome! You are now a registered publisher."
- Redirected to dashboard

### Scene 3: Upload a Contract
**URL:** `/documents/new`
**What to show:**
- Drag-and-drop zone: "Drag and drop your contract here"
- Upload a sample PDF (e.g., NDA or consulting agreement)
- Progress steps: Extracting text → Classifying contract → Extracting clauses → Flagging issues
- Wait for analysis to complete → redirected to results

### Scene 4: View Analysis Results
**URL:** `/documents/[id]`
**What to show:**
- Executive Summary card (contract type, jurisdiction, parties, risk level)
- Clauses tab: click through individual clauses, show summaries, bias assessment, legal significance
- Issues tab: show flagged issues by severity (Critical, Warning, Info)
- Highlight the "Generate Skill" button in the top-right

### Scene 5: Generate a Skill Draft
**URL:** `/documents/[id]/skill-draft`
**What to show:**
- Click "Generate Skill" → AI generates a structured skill draft
- Skill draft editor with tabs:
  - **Clauses:** Each clause with multiple options, bias scores, pros/cons per party, legal text
  - **Boilerplate:** Preamble, definitions, standard clauses, signature block
  - **Metadata:** Skill ID, contract type, jurisdictions, languages, version
- Edit a clause option (change bias score or legal text) to show it's editable
- Show the destination label (e.g., "Dealroom") at the top

### Scene 6: Submit to Marketplace
**URL:** `/documents/[id]/skill-draft`
**What to show:**
- Click "Submit to Marketplace" button
- Toast: "Submitted for review"
- Status changes to "Submitted" badge
- Explain: an admin will review and approve/reject with notes

### Scene 7: Connect Stripe (Revenue Share)
**URL:** `/settings`
**What to show:**
- Navigate to Settings page
- Three sections visible:
  1. **Anthropic API Key** — already configured (show masked key)
  2. **Publisher Profile** — firm name, bio, specialties, website
  3. **Revenue Share** — the new section
- Click "Connect Stripe Account"
- Stripe's hosted onboarding opens (in test mode, you can fill in test data)
- Complete onboarding → redirected back to `/settings?stripe=connected`
- Toast: "Stripe setup complete"
- Green checkmark: "Stripe Account Connected"
- Footer: "Revenue share is 70% to the skill author"
- Click "Learn more" → opens `/docs/revenue-share`

### Scene 8: Revenue Share Documentation
**URL:** `/docs/revenue-share`
**What to show:**
- Docs sidebar with "Revenue Share" highlighted
- Revenue model section: 70/30 split visual
- Stripe setup steps (workflow diagram)
- Payment flow: Subscribe → Webhook → Split → Transfer → Payout
- Multi-platform section: Dealroom, DPO Central, AI Sentinel cards
- Full end-to-end workflow (9 steps from connect to earning)
- FAQ section (scroll through key questions)
- CTA: "Go to Settings" and "Upload a Contract" buttons

### Scene 9: My Skills Dashboard
**URL:** `/my-skills`
**What to show:**
- List of skills the publisher has created
- Status badges: Generating, Review, Submitted, Approved, Exported
- Click into a submitted skill to show its current status
- Wrap up: "Your skill is now in review. Once approved, it goes live on the marketplace and you earn 70% of every subscription."

---

## Key URLs for Demo

| Page | URL | What It Shows |
|------|-----|---------------|
| Landing | `/` | Marketing, value props, CTA |
| Sign In | `/sign-in` | Magic link + Google |
| Onboarding | `/onboarding` | Invite code entry |
| Upload | `/documents/new` | Drag-and-drop upload |
| Analysis | `/documents/[id]` | AI analysis results |
| Skill Draft | `/documents/[id]/skill-draft` | Generated skill editor |
| Settings | `/settings` | API key + profile + Stripe Connect |
| Revenue Share Docs | `/docs/revenue-share` | Full revenue guide |
| Publisher Docs | `/docs/publisher` | Complete publisher guide |
| My Skills | `/my-skills` | Skill dashboard |

---

## Stripe Test Mode Notes

When recording with Stripe test mode:
- Use test card `4242 4242 4242 4242` if asked for card details
- Use any future expiry date and any 3-digit CVC
- For bank account: use test routing `110000000` and account `000123456789`
- SSN/EIN: use `000-00-0000` for test
- The Stripe onboarding may show fewer steps in test mode than production

---

## Talking Points

1. **For lawyers:** "Transform your contract expertise into AI-powered legal skills that earn passive revenue."
2. **Revenue model:** "You keep 70% of every subscription payment. We handle billing, distribution, and support."
3. **AI-powered:** "Upload a contract — our AI extracts clauses, generates negotiation options, and structures everything into a production-ready skill."
4. **Multi-platform:** "Your skills automatically work across Dealroom for contracts, DPO Central for privacy, and AI Sentinel for AI governance."
5. **Stripe Connect:** "Connect your Stripe account in Settings to start receiving payments. It takes 5 minutes and your first payout arrives when a customer subscribes."
6. **Quality control:** "You review every AI-generated option before publishing. Edit clause text, adjust bias ratings, refine legal context."
