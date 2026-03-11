# Product Requirements Document
## SMB Ad Campaign Setup Chatbot (via Beeswax DSP)

**Version:** 1.0
**Date:** 2026-03-11
**Status:** Draft

---

## 1. Overview

### Problem
Small and medium-sized businesses (SMBs) want to run programmatic advertising but find DSP interfaces too complex and jargon-heavy. They get lost in technical setup flows designed for professional media buyers.

### Solution
A conversational chatbot that guides an SMB user through campaign setup step-by-step, using plain language. On completion, the chatbot automatically creates the campaign as a **draft in Beeswax** via the Beeswax API — no DSP knowledge required.

---

## 2. Goals

- Reduce campaign setup friction for non-technical advertisers
- Collect all required Beeswax campaign fields through natural conversation
- Push a complete draft campaign to Beeswax automatically on submission
- Keep the user experience simple, guided, and jargon-free

---

## 3. Users

**Primary:** SMB owners or marketing managers with little/no programmatic advertising experience
**Secondary:** Agency account managers setting up campaigns on behalf of SMB clients

---

## 4. Scope (MVP)

### In Scope
- Conversational UI (chatbot)
- Campaign field collection (see Section 6)
- Creative asset upload
- Beeswax draft campaign creation via API
- Basic validation and error messaging
- Confirmation screen on success

### Out of Scope (Post-MVP)
- Campaign activation (launch) — drafts only for MVP
- Audience segment targeting beyond geography
- Frequency capping configuration
- Reporting / analytics
- Multi-user / team accounts
- Bid strategy customization

---

## 5. User Flow

```
1. Landing screen → "Let's set up your ad campaign"
2. Chatbot collects fields one at a time (see Section 6)
3. Creative upload prompt
4. Summary screen — user reviews all inputs
5. Confirm → API call to Beeswax → campaign created as draft
6. Success screen with Beeswax campaign ID + link
```

If a required field is missing or invalid, the chatbot re-prompts with a plain-language explanation.

---

## 6. Required Campaign Fields

| Field | Required | Notes |
|-------|----------|-------|
| Campaign name | Yes | Auto-suggested from advertiser name if available |
| Start date | Yes | Must be today or future |
| End date | Yes | Must be after start date |
| Budget (total) | Yes | USD, minimum TBD (e.g. $500) |
| Estimated impressions | Yes | Derived from budget + CPM estimate, or user-entered |
| Geography | Yes | Country → State/DMA level; multi-select |
| Creative upload | Yes | Accepted formats: JPG, PNG, GIF, HTML5 ZIP, MP4; size limits per IAB standard |
| IAB category | No (optional) | Dropdown from IAB Content Taxonomy v2; helps with brand safety targeting |

---

## 7. Chatbot Conversation Design

### Principles
- One question at a time
- Plain English — no DSP jargon
- Provide examples and hints inline (e.g. "e.g. March 1 – March 31")
- Allow going back to edit a previous answer
- Show a progress indicator (e.g. "Step 3 of 7")

### Sample Conversation Flow

```
Bot: Hi! Let's set up your ad campaign. What would you like to name it?
User: Spring Sale 2026

Bot: Great! When should your campaign start? (e.g. March 15, 2026)
User: March 20

Bot: And when should it end?
User: April 10

Bot: What's your total budget for this campaign? (in USD)
User: $2000

Bot: Based on average rates, that could get you around 400,000 impressions.
     Does that sound right, or would you like to set a specific number?
User: That works

Bot: Where do you want your ads to show? You can choose countries, states, or cities.
User: United States — New York and California

Bot: Almost there! Please upload your ad creative.
     Accepted: JPG, PNG, GIF, HTML5 ZIP, MP4
[Upload widget]

Bot: (Optional) What category best describes your business?
     This helps place your ads in the right context.
[IAB category dropdown or skip]

Bot: Here's a summary of your campaign:
     • Name: Spring Sale 2026
     • Dates: March 20 – April 10, 2026
     • Budget: $2,000
     • Est. Impressions: 400,000
     • Geography: US — New York, California
     • Creative: banner_spring.jpg
     • Category: —

     Ready to create your campaign draft?
[Confirm] [Edit]
```

---

## 8. Beeswax API Integration

### Authentication
- Server-side API key stored securely (env var / secrets manager)
- All API calls made from backend — credentials never exposed to client

### API Actions (MVP)

| Action | Beeswax Endpoint | Trigger |
|--------|-----------------|---------|
| Create campaign | `POST /rest/campaign` | On user confirmation |
| Upload creative | `POST /rest/creative` | On file upload |
| Create line item | `POST /rest/line_item` | After campaign created |
| Associate creative | `POST /rest/creative_line_item` | After line item created |

### Campaign Object (draft)
```json
{
  "advertiser_id": "<smb_advertiser_id>",
  "campaign_name": "Spring Sale 2026",
  "start_date": "2026-03-20",
  "end_date": "2026-04-10",
  "budget_type": "fixed",
  "budget": 2000,
  "status": "inactive",
  "notes": "Created via SMB chatbot"
}
```

> **Note:** `status: inactive` ensures campaign is saved as a draft and not immediately live.

### Error Handling
- If Beeswax API returns an error, show user-friendly message and allow retry
- Log full API errors server-side for debugging
- Do not expose raw API errors to the user

---

## 9. Creative Specifications

Follow IAB New Ad Portfolio standard sizes:

| Format | Common Sizes |
|--------|-------------|
| Display | 300×250, 728×90, 160×600, 320×50 |
| Video | 16:9, MP4, max 30s for MVP |
| HTML5 | ZIP bundle, max 200KB |

Validate file type and size on upload before sending to Beeswax.

---

## 10. Validation Rules

| Field | Rule |
|-------|------|
| Start date | ≥ today |
| End date | > start date |
| Budget | > $0, numeric |
| Creative | Valid file type, within size limit |
| Geography | At least one selection |

---

## 11. Technical Stack (Recommended)

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (React) |
| Chat UI | Custom or Vercel AI SDK streaming chat |
| Backend | Node.js / Next.js API routes |
| AI/NLP | Claude API (Anthropic) — conversational flow |
| File storage | S3 or similar for creative uploads |
| DSP | Beeswax REST API |
| Auth | Clerk or NextAuth (SMB user accounts) |

---

## 12. Success Metrics

| Metric | Target |
|--------|--------|
| Campaign setup completion rate | > 70% of sessions started |
| Time to complete setup | < 5 minutes |
| API success rate (Beeswax draft created) | > 98% |
| User-reported ease of use | > 4/5 satisfaction |

---

## 13. Open Questions

1. Does each SMB get their own Beeswax advertiser ID, or do all SMBs share one account with sub-advertisers?
2. What is the minimum budget to enforce?
3. Who reviews and activates the draft campaign — the SMB, or an account manager?
4. Do we need a login/account system for MVP, or is it a one-shot flow?
5. What CPM rate should we use for the impression estimate calculation?
6. Are there any Beeswax seat/account restrictions we need to work around?

---

## 14. Milestones

| Milestone | Description |
|-----------|-------------|
| M1 | Chatbot UI with full field collection (no API) |
| M2 | Beeswax API integration — draft campaign creation |
| M3 | Creative upload + association |
| M4 | Validation, error handling, success screen |
| M5 | Internal QA + Beeswax sandbox testing |
| M6 | Pilot with 3–5 SMB users |
