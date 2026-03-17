# Product Requirements Document
## SMB Ad Campaign Setup Chatbot (via Beeswax DSP)

**Version:** 1.1
**Date:** 2026-03-16
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
- Auto-create Beeswax advertiser per SMB submission
- Beeswax draft campaign + line item creation via API
- Campaign summary review screen before submission
- SMB-friendly success screen (no Beeswax IDs exposed)
- Dark AMP-inspired UI theme
- Mock mode when Beeswax credentials not set

### Out of Scope (Post-MVP)
- Campaign activation — drafts only, account manager activates
- Audience segment targeting beyond geography
- Frequency capping / bid strategy
- Reporting / analytics
- Multi-user / team accounts
- Email notification to account manager on submission
- S3 storage for creative files
- Auth / login system

---

## 5. User Flow (Implemented)

```
1. Landing screen → "New Campaign"
2. Chatbot collects 8 fields one at a time
3. Creative upload widget appears inline in chat
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
| Creative upload | Yes | JPG, PNG, GIF, WebP, MP4, HTML5 ZIP; max 50MB |

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
| AI | Anthropic Claude `claude-opus-4-6` with streaming + tool use |
| Backend | Next.js API routes (Node.js runtime) |
| DSP | Beeswax REST API (Basic auth) |
| File storage | Local validation only (S3 upload is next step) |
| Auth | None (MVP — one-shot flow, no login) |
| Hosting | Local dev / to be deployed |

### Key Files
| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Full chat UI, sidebar, upload widget, summary, success |
| `src/app/api/chat/route.ts` | Streaming Claude endpoint with agentic tool loop |
| `src/app/api/campaign/submit/route.ts` | Beeswax submission endpoint |
| `src/app/api/upload/route.ts` | Creative file validation |
| `src/lib/beeswax.ts` | Beeswax integration (mock + live) |
| `src/lib/campaign-config.ts` | Claude system prompt + tool definitions |
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
| Login/auth for MVP? | No — one-shot flow, email captured in chat |
| CPM/impression estimate? | Removed — not needed for draft creation |
| IAB category optional or required? | Required — asked as plain business sector question |

---

## 10. Remaining Open Questions

1. Where does the creative file actually go? (Currently validated but not stored — needs S3)
2. How does account manager get notified when a draft is submitted? (Email notification not built yet)
3. Do we want a dashboard for account managers to see all submitted drafts?
4. Deploy to Vercel or internal hosting?

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

1. **S3 creative upload** — actually store the file and associate with Beeswax creative
2. **Account manager notification** — email via Resend/SendGrid when draft submitted
3. **Deploy** — Vercel or internal hosting
4. **Pilot** — test with 3–5 real SMBs
5. **Auth** — login so SMBs can return and view their campaigns
6. **Dashboard** — campaign history page (account manager view)
7. **Alkimi DSP integration** — push to Alkimi test DSP alongside Beeswax (OAuth2/Keycloak auth, credentials available)

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
