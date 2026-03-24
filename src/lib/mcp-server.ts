/**
 * MCP Server — tool definitions and handlers for smb-amp.
 *
 * Tools:
 *   upload_creative          — upload a creative file to Vercel Blob, returns URL
 *   generate_creative        — AI-generate an SVG banner, store in Vercel Blob, return URL
 *   submit_campaign          — collect fields then create Beeswax draft
 *   validate_campaign_fields — dry-run validation, no Beeswax call
 *   get_campaign_stats       — return simulated performance stats as markdown
 */

import type { CampaignState } from './types'
import { createBeeswaxDraft } from './beeswax'
import { generateCreativeSvg } from './creative-generator'
import { getMockStats } from './mock-stats'
import { put } from '@vercel/blob'

// ─── Protocol constants ───────────────────────────────────────────────────────

export const SERVER_INFO = { name: 'smb-amp', version: '1.0.0' }
export const PROTOCOL_VERSION = '2024-11-05'

// ─── Tool definitions (MCP JSON Schema format) ───────────────────────────────

export const TOOLS = [
  {
    name: 'generate_creative',
    description: `Generate an AI ad creative banner using the business info already collected, then return a URL to use in submit_campaign.

Call this when the user doesn't have a creative file ready and wants AI to make one.
The tool uses Claude to generate a professional SVG banner tailored to the business name and industry.

Steps:
1. Call this tool with business_name and iab_category (already collected)
2. Optionally pass a description for style/mood (e.g. "warm and friendly", "luxury feel")
3. This returns a creative_url — pass it directly to submit_campaign`,
    inputSchema: {
      type: 'object',
      properties: {
        business_name: { type: 'string', description: 'Business name' },
        iab_category:  { type: 'string', description: 'IAB category code (e.g. "IAB8")' },
        description:   { type: 'string', description: 'Optional style or mood hint for the creative' },
      },
      required: ['business_name'],
    },
  },
  {
    name: 'upload_creative',
    description: `Upload an ad creative file (image or video) and get back a URL to use in submit_campaign.

ALWAYS call this tool BEFORE submit_campaign when the user has a creative file.

Steps:
1. Ask the user for their creative file (they can attach it to the chat or give a file path)
2. When you have the file, pass its base64 content + filename + MIME type to this tool
3. This tool returns a creative_url
4. Pass that creative_url to submit_campaign

Supported formats: JPEG, PNG, GIF, WebP, MP4, MOV
The file will be stored securely and the URL will be valid for Beeswax upload.`,
    inputSchema: {
      type: 'object',
      properties: {
        file_base64:  { type: 'string', description: 'Base64-encoded file content' },
        file_name:    { type: 'string', description: 'Original filename (e.g. "ad.jpg")' },
        file_type:    { type: 'string', description: 'MIME type (e.g. "image/jpeg", "video/mp4")' },
      },
      required: ['file_base64', 'file_name', 'file_type'],
    },
  },
  {
    name: 'submit_campaign',
    description: `Submit an advertising campaign to Beeswax DSP for an SMB advertiser.

IMPORTANT: Collect ALL required fields through conversation BEFORE calling this tool.
Ask for fields one at a time in a friendly, conversational way.

Required fields to collect:
1. business_name  — Name of the business (e.g. "Joe's Pizza")
2. contact_name   — Name of the person managing the campaign
3. campaign_name  — Descriptive name (e.g. "Summer 2024 Promotion")
4. start_date     — YYYY-MM-DD, must be today or later
5. end_date       — YYYY-MM-DD, must be after start_date
6. budget         — USD total (e.g. "2000" for $2,000)
7. geography      — Target area (e.g. "United States - NY and CA", "United Kingdom")
8. iab_category   — IAB code. Common mappings:
     Restaurant/Food → IAB8       Retail/Shopping → IAB22    Automotive → IAB2
     Technology      → IAB19      Health/Fitness  → IAB7     Travel     → IAB20
     Real Estate     → IAB21      Finance/Banking → IAB13    Entertainment → IAB1
     Sports          → IAB17      Education       → IAB5     Beauty     → IAB18
     Home/Garden     → IAB10      Pets            → IAB16    Business/B2B → IAB3

Creative (optional but recommended):
- If the user has a file: call upload_creative FIRST, then pass the returned URL as creative_url
- If the user has a public URL already: pass it directly as creative_url

After submit_campaign succeeds, ALWAYS immediately call get_campaign_stats with the same budget, start_date, end_date, iab_category, and campaign_name to show the user their performance projections.`,
    inputSchema: {
      type: 'object',
      properties: {
        business_name: { type: 'string', description: 'Business name' },
        contact_name:  { type: 'string', description: 'Contact person name' },
        campaign_name: { type: 'string', description: 'Campaign name' },
        start_date:    { type: 'string', description: 'Start date (YYYY-MM-DD)' },
        end_date:      { type: 'string', description: 'End date (YYYY-MM-DD)' },
        budget:        { type: 'string', description: 'Budget in USD (e.g. "2000")' },
        geography:     { type: 'string', description: 'Target geography description' },
        iab_category:  { type: 'string', description: 'IAB category code (e.g. "IAB8")' },
        creative_url:  { type: 'string', description: 'URL to creative (from upload_creative or a public URL)' },
      },
      required: [
        'business_name', 'contact_name', 'campaign_name',
        'start_date', 'end_date', 'budget', 'geography', 'iab_category',
      ],
    },
  },
  {
    name: 'validate_campaign_fields',
    description: 'Validate campaign fields without submitting to Beeswax. Use this to surface errors before calling submit_campaign.',
    inputSchema: {
      type: 'object',
      properties: {
        business_name: { type: 'string' },
        contact_name:  { type: 'string' },
        campaign_name: { type: 'string' },
        start_date:    { type: 'string' },
        end_date:      { type: 'string' },
        budget:        { type: 'string' },
        geography:     { type: 'string' },
        iab_category:  { type: 'string' },
      },
      required: [],
    },
  },
  {
    name: 'get_campaign_stats',
    description: 'Show simulated performance stats for a submitted campaign. Call after submit_campaign succeeds. Returns a markdown report with KPIs, budget utilisation, and a 7-day spend breakdown. Clearly labelled as simulated.',
    inputSchema: {
      type: 'object',
      properties: {
        budget:        { type: 'string', description: 'Total budget in USD (e.g. "2000")' },
        start_date:    { type: 'string', description: 'Campaign start date YYYY-MM-DD' },
        end_date:      { type: 'string', description: 'Campaign end date YYYY-MM-DD' },
        iab_category:  { type: 'string', description: 'IAB category code e.g. "IAB8"' },
        campaign_name: { type: 'string', description: 'Campaign name for the report header' },
        campaign_id:   { type: 'string', description: 'Beeswax campaign ID — used as seed for consistent results' },
      },
      required: ['budget', 'start_date', 'end_date'],
    },
  },
]

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function generateCreative(args: Record<string, string>): Promise<object> {
  const { business_name, iab_category, description } = args
  const svg = await generateCreativeSvg(business_name, iab_category, description)

  const token = process.env.BLOB_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN
  const fileName = `creative-${Date.now()}.svg`
  const blob = await put(fileName, svg, {
    access: 'public',
    contentType: 'image/svg+xml',
    token,
    addRandomSuffix: true,
  })

  return { creative_url: blob.url, file_name: fileName, file_type: 'image/svg+xml' }
}

async function uploadCreative(args: Record<string, string>): Promise<object> {
  const { file_base64, file_name, file_type } = args

  const token = process.env.BLOB_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN
  const buffer = Buffer.from(file_base64, 'base64')
  const blob = await put(file_name, buffer, {
    access: 'public',
    contentType: file_type,
    token,
    addRandomSuffix: true,
  })

  return { creative_url: blob.url, file_name, file_type }
}

async function submitCampaign(args: Record<string, string>): Promise<object> {
  let { creative_url } = args
  let creative_base64: string | undefined
  let creative_file_name: string | undefined
  let creative_file_type: string | undefined

  // Fetch the creative URL server-side and encode as base64 for Beeswax
  if (creative_url) {
    try {
      const resp = await fetch(creative_url, { signal: AbortSignal.timeout(15_000) })
      if (resp.ok) {
        const buffer = await resp.arrayBuffer()
        creative_base64 = Buffer.from(buffer).toString('base64')
        creative_file_type = resp.headers.get('content-type') ?? 'image/jpeg'
        creative_file_name = creative_url.split('/').pop()?.split('?')[0] ?? 'creative.jpg'
      }
    } catch {
      // Creative fetch failed — proceed without it
    }
  }

  const campaign: CampaignState = {
    business_name:        args.business_name,
    contact_name:         args.contact_name,
    campaign_name:        args.campaign_name,
    start_date:           args.start_date,
    end_date:             args.end_date,
    budget:               args.budget,
    geography:            args.geography,
    iab_category:         args.iab_category,
    creative_file_base64: creative_base64,
    creative_file_name,
    creative_file_type,
  }

  const result = await createBeeswaxDraft(campaign)
  return {
    ...result,
    next_step: `Campaign submitted. Now call get_campaign_stats with budget="${args.budget}", start_date="${args.start_date}", end_date="${args.end_date}", iab_category="${args.iab_category ?? ''}", campaign_name="${args.campaign_name}" to show the user their performance projections.`,
  }
}

function validateFields(args: Record<string, string>): object {
  const errors: string[] = []
  const today = new Date().toISOString().split('T')[0]
  const dateRe = /^\d{4}-\d{2}-\d{2}$/

  if (args.start_date) {
    if (!dateRe.test(args.start_date)) {
      errors.push('start_date must be YYYY-MM-DD format')
    } else if (args.start_date < today) {
      errors.push(`start_date must be today (${today}) or later`)
    }
  }

  if (args.end_date) {
    if (!dateRe.test(args.end_date)) {
      errors.push('end_date must be YYYY-MM-DD format')
    } else if (args.start_date && dateRe.test(args.start_date) && args.end_date <= args.start_date) {
      errors.push('end_date must be after start_date')
    }
  }

  if (args.budget && isNaN(parseFloat(args.budget.replace(/[^0-9.]/g, '')))) {
    errors.push('budget must be a valid number')
  }

  const required = [
    'business_name', 'contact_name', 'campaign_name',
    'start_date', 'end_date', 'budget', 'geography', 'iab_category',
  ]
  const missing = required.filter(f => !args[f])

  return {
    valid:           errors.length === 0 && missing.length === 0,
    errors,
    missing_fields:  missing,
    fields_provided: Object.keys(args).filter(k => args[k]),
  }
}

function getCampaignStats(args: Record<string, string>): object {
  const stats = getMockStats({
    budget:       args.budget,
    start_date:   args.start_date,
    end_date:     args.end_date,
    iab_category: args.iab_category,
    campaign_id:  args.campaign_id,
  })

  const name = args.campaign_name ?? 'Campaign'
  const fmt = (n: number) => n.toLocaleString('en-US')
  const fmtUsd = (n: number) =>
    '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const diff = stats.timelinePct - stats.budgetPct
  const light = diff > 25 ? '🔴' : diff > 10 ? '🟡' : stats.budgetPct > stats.timelinePct + 10 ? '🔴' : '🟢'

  const bar = (pct: number) => {
    const filled = Math.min(20, Math.round(pct / 5))
    return '█'.repeat(filled) + '░'.repeat(20 - filled)
  }

  const dayLabels = ['6d ago  ', '5d ago  ', '4d ago  ', '3d ago  ', '2d ago  ', 'Yesterday', 'Today   ']
  const maxSpend = Math.max(...stats.dailySpend, 0.01)
  const dailyRows = stats.dailySpend
    .map((v, i) => {
      const len = Math.round((v / maxSpend) * 20)
      const b = '█'.repeat(len) + '░'.repeat(20 - len)
      return `${dayLabels[i]} │${b}│ ${fmtUsd(v)}`
    })
    .join('\n')

  const md = `## ${name} — Performance Snapshot
> ⚠️ *Simulated data. Real reporting available once campaign goes live.*

### Key Metrics
| Metric | Value | Status |
|--------|-------|--------|
| Impressions | ${fmt(stats.impressions)} | — |
| Clicks | ${fmt(stats.clicks)} | — |
| CTR | ${stats.ctr.toFixed(2)}% | — |
| Spend | ${fmtUsd(stats.spend)} of ${fmtUsd(stats.budget)} | ${light} |
| CPM | ${fmtUsd(stats.cpm)} | — |
| ROAS | ${stats.roas.toFixed(1)}× | — |

### Budget Utilisation
\`${bar(stats.budgetPct)} ${stats.budgetPct}%\`

### Timeline Progress
\`${bar(stats.timelinePct)} ${stats.timelinePct}%\`

### 7-Day Spend
\`\`\`
${dailyRows}
\`\`\`
---
*Benchmarks based on ${stats.iabCategory} industry averages.*`

  return { content: [{ type: 'text', text: md }] }
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export async function handleToolCall(name: string, args: Record<string, unknown>) {
  const strArgs = args as Record<string, string>

  if (name === 'generate_creative') {
    const result = await generateCreative(strArgs)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }

  if (name === 'upload_creative') {
    const result = await uploadCreative(strArgs)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }

  if (name === 'submit_campaign') {
    const result = await submitCampaign(strArgs)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }

  if (name === 'validate_campaign_fields') {
    const result = validateFields(strArgs)
    return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] }
  }

  if (name === 'get_campaign_stats') {
    return getCampaignStats(strArgs)
  }

  throw new Error(`Unknown tool: ${name}`)
}
