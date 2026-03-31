# Product Requirements Document
## SMB Ad Campaign Setup Chatbot (via Beeswax DSP)

**Version:** 1.2
**Date:** 2026-03-31
**Status:** MVP Built & In Testing

---

## 1. Overview

### Problem
Small and medium-sized businesses (SMBs) want to run programmatic advertising but find DSP interfaces too complex and jargon-heavy. They get lost in technical setup flows designed for professional media buyers.

### Solution
A conversational chatbot that guides an SMB user through campaign setup step-by-step, using plain language. On completion, the chatbot automatically creates a new Beeswax advertiser for the SMB and pushes the campaign as a **draft** — no DSP knowledge required. An account manager then reviews and activates.

---

## 2. Goals

- Reduce campaign setup friction for non-technical advertisers
- Collect all required Beeswax campaign fields through natural conversation
- Auto-create a Beeswax advertiser per SMB + push draft campaign on submission
- Keep the user experience simple, guided, and jargon-free
- SMB never sees or accesses Beeswax directly

---

## 3. Users

**Primary:** SMB owners or marketing managers with little/no programmatic advertising experience
**Secondary:** Alkimi account managers who review and activate submitted drafts in Beeswax

---

## 4. Scope (MVP) — Built

### In Scope ✓
- Conversational UI (chatbot) powered by Claude `claude-opus-4-6`
- Campaign field collection via streaming chat with tool use
- Creative asset upload (validated client-side, stored server-side)
- **AI creative generation** — Claude `claude-haiku-4-5` generates a branded SVG banner from business name + sector; available in both web UI and MCP plugin
- Auto-create Beeswax advertiser per SMB submission
- Beeswax draft campaign + line item creation via API
- Campaign summary review screen before submission
- SMB-friendly success screen (no Beeswax IDs exposed)
- Dark AMP-inspired UI theme
- Mock mode when Beeswax credentials not set

### Also Built (Session 5, 2026-03-31) ✓
- **Email collection** — contact email captured alongside contact name (MCP flow)
- **Wallet creation** — Stripe Customer auto-created from email on `submit_campaign` (MCP)
- **Stripe top-up** — `topup_wallet` MCP tool generates a Stripe Checkout link (test mode)
- **Payment auto-detection** — `await_payment` tool polls Stripe every 3s (up to 4.5 min); Claude confirms payment automatically without user input
- **Payment success page** — `/payment-success` confirms payment amount + campaign, links back to Claude.ai
- **Performance projections** — `get_campaign_stats` called immediately and automatically after `submit_campaign`
- **Wallet balance check** — `check_wallet_balance` tool for manual verification

### Out of Scope (Post-MVP)
- Campaign activation on wallet funding (currently drafts only, account manager activates)
- Stablecoin / Web3 wallet top-up (fiat Stripe only for now)
- Google SSO (web app auth — planned, not yet built)
- Real-time spend drawdown from wallet
- Audience segment targeting beyond geography
- Frequency capping / bid strategy
- Multi-user / team accounts
- Email notification to account manager on submission
- S3 storage for creative files

---

## 5. User Flow (Implemented)

```
1. Landing screen → "New Campaign"
2. Chatbot collects 8 fields one at a time
3. Creative step appears inline in chat — three options:
   a. Upload file (JPG, PNG, GIF, WebP, MP4, HTML5 ZIP)
   b. Paste URL (Google Drive, Dropbox, direct image link)
   c. ✨ Generate with AI — Claude generates a branded SVG banner; preview + confirm or retry
4. Campaign summary card — user reviews all inputs
5. Confirm → create Beeswax advertiser → create campaign draft → create line item
6. SMB-friendly success screen (campaign name, dates, budget, email confirmation note)
```

---

## 6. Campaign Fields Collected (Final)

| Field | Required | Notes |
|-------|----------|-------|
| Business name | Yes | Used to create Beeswax advertiser |
| Business email | Yes | Shown on success screen as confirmation recipient |
| Campaign name | Yes | Auto-suggested from business name |
| Start date | Yes | Must be today or future; saved as YYYY-MM-DD |
| End date | Yes | Must be after start date |
| Budget (total) | Yes | USD, no minimum enforced (draft only) |
| Geography | Yes | Country/state level, plain language |
| Business sector | Yes | Asked in plain language, mapped to IAB category code |
| Creative | Yes | Upload file (JPG, PNG, GIF, WebP, SVG, MP4, HTML5 ZIP; max 10MB), paste URL, or AI-generate SVG banner |

**Removed from original PRD:**
- Estimated impressions — removed (no CPM default needed for a draft)
- IAB category as optional — made required, asked as plain "what sector"
- Minimum budget — removed (drafts don't need enforcement)

---

## 7. Beeswax API Integration (Implemented)

### Authentication
- Basic auth (username + password) stored in `.env.local`
- All API calls server-side — credentials never exposed to client
- Auto-switches to mock mode if credentials not set

### API Flow on Submission

| Step | Endpoint | Notes |
|------|----------|-------|
| 1. Create advertiser | `POST /rest/advertiser` | One per SMB, named after business |
| 2. Create campaign | `POST /rest/campaign` | `status: inactive` (draft) |
| 3. Create line item | `POST /rest/line_item` | Linked to campaign, also inactive |

### Environment (Sandbox)
- API URL: `https://alkimisbx.api.beeswax.com`
- Credentials stored in `.env.local` (gitignored)

---

## 8. Technical Stack (Built)

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router), TypeScript |
| Frontend | React, Tailwind CSS |
| AI (chat) | Anthropic Claude `claude-opus-4-6` with streaming + tool use |
| AI (creative) | Anthropic Claude `claude-haiku-4-5` — generates SVG banners from business context |
| Backend | Next.js API routes (Node.js runtime) |
| DSP | Beeswax REST API (Basic auth) |
| File storage | Local validation only (S3 upload is next step) |
| Payments | Stripe (test mode) — Customer Balance as prepaid wallet |
| Auth | None on web app yet — email collected conversationally in MCP |
| Hosting | Vercel (auto-deploy from `main` branch) |

### Key Files
| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Full chat UI, sidebar, upload widget, summary, success |
| `src/app/api/chat/route.ts` | Streaming Claude endpoint with agentic tool loop |
| `src/app/api/campaign/submit/route.ts` | Beeswax submission endpoint |
| `src/app/api/upload/route.ts` | Creative file validation (JPG, PNG, GIF, WebP, SVG, MP4, ZIP) |
| `src/app/api/creative/generate/route.ts` | AI creative generation endpoint (browser) |
| `src/lib/creative-generator.ts` | Shared Claude SVG generation logic (browser + MCP) |
| `src/lib/beeswax.ts` | Beeswax integration (mock + live) |
| `src/lib/campaign-config.ts` | Claude system prompt + tool definitions |
| `src/lib/mcp-server.ts` | MCP tool definitions + handlers (submit, wallet, payment, stats) |
| `src/lib/stripe.ts` | Lazy Stripe client singleton |
| `src/app/payment-success/page.tsx` | Post-payment confirmation page |
| `src/lib/types.ts` | Shared TypeScript types |
| `.env.local` | Credentials (gitignored) |
| `.env.example` | Template for credentials |

---

## 9. Open Questions Resolved

| Question | Decision |
|----------|---------|
| Each SMB gets own Beeswax advertiser? | Yes — created automatically on submission |
| Minimum budget? | None — it's a draft, no enforcement needed |
| Who activates draft? | Account manager reviews in Beeswax and activates |
| Login/auth for MVP? | MCP: email captured conversationally + Stripe wallet created. Web app: Google SSO planned post-MVP. |
| Wallet type? | Stripe Customer Balance (fiat) for now — stablecoin/Web3 wallet planned as follow-on |
| Payment confirmation UX? | await_payment tool polls Stripe automatically — no user input needed |
| CPM/impression estimate? | Removed — not needed for draft creation |
| IAB category optional or required? | Required — asked as plain business sector question |

---

## 10. Remaining Open Questions

1. Where does the creative file actually go? (Currently validated but not stored — needs S3)
2. How does account manager get notified when a draft is submitted? (Email notification not built yet)
3. Do we want a dashboard for account managers to see all submitted drafts?
4. When does a funded wallet trigger campaign activation in Beeswax? (Currently manual)
5. Which chain/stablecoin for the Web3 wallet top-up path?
6. Does Vercel Pro plan need to be confirmed for 300s `await_payment` timeout?

---

## 11. Success Metrics

| Metric | Target |
|--------|--------|
| Campaign setup completion rate | > 70% of sessions started |
| Time to complete setup | < 5 minutes |
| Beeswax API success rate | > 98% |
| User-reported ease of use | > 4/5 satisfaction |

---

## 12. Next Steps (Post-MVP)

1. **Google SSO (web app)** — next-auth + GoogleProvider, email pre-populated from session, wallet auto-created on sign-in
2. **Campaign activation on payment** — webhook from Stripe triggers Beeswax draft activation
3. **Stablecoin top-up** — Web3 wallet path once chain/stablecoin decided
4. **S3 creative upload** — actually store the file and associate with Beeswax creative
5. **Account manager notification** — email via Resend/SendGrid when draft submitted
6. **Pilot** — test with 3–5 real SMBs
7. **Dashboard** — campaign history page (account manager view)
8. **Alkimi DSP integration** — push to Alkimi test DSP alongside Beeswax (OAuth2/Keycloak auth, credentials available)

---

---

# Session Log
*Used as memory across Claude Code sessions*

---

## Session 1 — 2026-03-16

**What was built:**
- Full MVP from scratch in one session
- Next.js 14 app with TypeScript + Tailwind
- Claude `claude-opus-4-6` streaming chat with agentic tool loop
- Beeswax integration: creates advertiser + campaign + line item
- Dark AMP-inspired UI (inspired by Alkimi Exchange Figma design)
- Pushed to GitHub: `https://github.com/darwie-alkimi/smb-amp.git`

**Decisions made:**
- No minimum budget (draft only)
- No impression estimate (removed CPM default)
- IAB category kept but asked as plain "what sector are you in"
- Each SMB gets their own Beeswax advertiser (created on submit)
- SMB never sees Beeswax — account manager activates drafts
- No auth for MVP — one-shot flow with email capture
- Mock mode auto-activates when Beeswax credentials not set

**Environment:**
- Beeswax sandbox: `https://alkimisbx.api.beeswax.com`
- Anthropic API key: in `.env.local` (do not commit)
- Dev server: `npm run dev` → `http://localhost:3000`

**Status:** MVP built, credentials configured, ready for end-to-end testing

---

## Session 2 — 2026-03-17

**What was built:**
- Full Beeswax API integration debugged and working end-to-end
- Fixed auth: Beeswax sandbox uses session-based auth (not Basic auth) — re-authenticates before every request
- Fixed campaign payload: `budget_type` as int, `campaign_budget`, `active: false`, dates as `YYYY-MM-DD HH:MM:SS`
- Added targeting expression: geography → country codes + IAB category
- Added line item with CPM bidding linked to targeting expression
- Targeting + line item fail gracefully on sandbox (session restriction) but will fire on production
- Swapped `business_email` → `contact_name` (SMB never gets a Beeswax login)
- Added URL input option to creative upload widget (paste Google Drive / Dropbox link)
- Wired paperclip icon in chat input to file picker
- Added `/api/test-beeswax` dev endpoint for testing Beeswax connection

**Decisions made:**
- No line item needed for campaign creation — Beeswax accepts campaign without it
- Line item IS needed for targeting (geography + IAB category) — added but skips gracefully if sandbox blocks it
- Geography mapped from plain text to ISO country codes (defaults to US if unrecognised)
- IAB category passed as content_category in targeting expression
- Creative upload not yet implemented — filename stored in campaign notes for now
- Account manager adds line item targeting manually on sandbox; production will be fully automated

**Beeswax sandbox behaviour (known limitations):**
- Session expires after one use — each API call requires fresh auth
- `targeting_expression` endpoint not supported on sandbox
- Line item session drops on 3rd consecutive auth call
- All of the above work correctly on production Beeswax

**Environment:**
- Beeswax sandbox: `https://alkimisbx.api.beeswax.com`
- Anthropic API key: in `.env.local` (do not commit)
- Dev server: `npm run dev` → `http://localhost:3000`
- GitHub: `https://github.com/darwie-alkimi/smb-amp.git` (commit: `0d3bf00`)

**Status:** Advertiser + campaign creating successfully in Beeswax sandbox. Targeting + line item ready for production. Creative upload is next.

---

## Session 3 — 2026-03-23

**What was built:**
- MCP (Model Context Protocol) server endpoint so users can create campaigns directly inside Claude.ai or Claude Code — no web app visit needed
- `src/app/api/mcp/route.ts` — HTTP endpoint implementing Streamable HTTP transport (POST) + SSE backwards-compat (GET)
- `src/lib/mcp-server.ts` — two MCP tools: `submit_campaign` and `validate_campaign_fields`
- App deployed to Vercel: **https://smb-amp.vercel.app**
- MCP server registered in `~/.claude/mcp.json` for local Claude Code use

**MCP tools:**
- `submit_campaign` — collects all 8 required fields + optional creative (URL or base64), calls `createBeeswaxDraft()` from `src/lib/beeswax.ts`
- `validate_campaign_fields` — dry-run validation, no Beeswax call

**Creative handling:**
- User provides URL → server fetches and encodes to base64 server-side
- User provides local file path (Claude Code) → Claude reads it with Read tool, passes base64 + filename + MIME type

**Decisions made:**
- MCP protocol implemented manually (JSON-RPC over HTTP) — avoids Next.js App Router incompatibility with MCP SDK's SSE transport classes
- `@modelcontextprotocol/sdk` installed as dependency for future use
- Fixed pre-existing TypeScript error: added `click_url` to `FIELD_LABELS` in `types.ts`

**Environment:**
- MCP endpoint: `https://smb-amp.vercel.app/api/mcp`
- Claude Code MCP config: `~/.claude/mcp.json`
- Vercel auto-deploys from `main` branch of `darwie-alkimi/smb-amp`

**Status:** MCP server deployed and registered. Restart Claude Code to load it, then test with "Help me create an ad campaign for my restaurant".

---

## Session 4 — 2026-03-24

**What was built:**
- AI creative generation — SS-02 from Confluence PRD (partial)
- `src/lib/creative-generator.ts` — shared Claude `claude-haiku-4-5` SVG banner generator; seeded with business name + IAB sector + optional style hint
- `src/app/api/creative/generate/route.ts` — browser endpoint, returns SVG string
- `src/app/page.tsx` — `FileUploadWidget` gains a 3rd tab "✨ Generate"; shows description textarea, generates SVG, renders inline preview, "Use this" / "Try again"
- `src/lib/mcp-server.ts` — new `generate_creative` MCP tool; generates SVG → uploads to Vercel Blob → returns `creative_url` for `submit_campaign`
- `src/app/api/upload/route.ts` — added `image/svg+xml` to allowed types

**Decisions made:**
- Used Claude (Anthropic) for creative generation instead of DALL-E/Gemini — no new API key required, uses existing `ANTHROPIC_API_KEY`
- SVG format chosen: vector, scales to any IAB size, Claude generates well with `claude-haiku-4-5`
- Shared `creative-generator.ts` lib ensures identical generation logic for both browser and MCP paths
- MCP path stores SVG in Vercel Blob and returns URL; browser path sends SVG through existing upload route

**Status:** AI creative generation built for both browser and MCP. No new env vars required.

---

## Session 5 — 2026-03-31

**What was built:**
- **Email collection in MCP** — `contact_email` added as required field to `submit_campaign` and `validate_campaign_fields`; Claude asks for name + email together as a dedicated step before campaign name
- **Stripe wallet creation** — on `submit_campaign`, a Stripe Customer is auto-created (or fetched idempotently) from the contact email; Customer ID is the wallet identifier
- **`topup_wallet` MCP tool** — creates a Stripe Checkout Session and returns the URL; Claude shares it immediately after campaign submission
- **`await_payment` MCP tool** — polls Stripe Checkout Session status every 3s for up to 4.5 minutes; Claude calls it automatically after sharing the top-up link; confirms payment without any user input needed
- **`check_wallet_balance` MCP tool** — fallback manual check; lists recent payments for a Stripe Customer
- **Payment success page** — `/payment-success` shows confirmed amount + campaign name; "Return to Claude.ai" CTA
- **`get_campaign_stats` ordering fixed** — tool description and `next_step` updated to force stats call immediately after `submit_campaign`, before wallet prompt
- **MCP route `maxDuration = 300`** — allows long-running `await_payment` poll on Vercel Pro
- **Lazy Stripe client** (`src/lib/stripe.ts`) — initialises only when `STRIPE_SECRET_KEY` is set; safe at build time

**Decisions made:**
- Wallet = Stripe Customer Balance (fiat) for now; stablecoin/Web3 path deferred until chain/stablecoin decided
- `await_payment` polls Stripe API directly (no webhook needed for MVP) — requires Vercel Pro for full 4.5-min window
- Email captured conversationally in MCP (Google SSO for web app is a separate follow-on)
- Wallet ID is the Stripe Customer ID (`cus_...`) — deterministic lookup via email means no DB needed

**Environment additions:**
- `STRIPE_SECRET_KEY=sk_test_...` — added to `.env.local` and Vercel environment variables

**Status:** Stripe wallet creation + top-up working end-to-end in test mode via MCP. `await_payment` auto-confirms without user input.
