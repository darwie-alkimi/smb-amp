/**
 * MCP Server — tool definitions and handlers for smb-amp.
 *
 * Tools:
 *   upload_creative          — upload a creative file to Vercel Blob, returns URL
 *   submit_campaign          — collect fields then create Beeswax draft
 *   validate_campaign_fields — dry-run validation, no Beeswax call
 */

import type { CampaignState } from './types'
import { createBeeswaxDraft } from './beeswax'
import { put } from '@vercel/blob'

// ─── Protocol constants ───────────────────────────────────────────────────────

export const SERVER_INFO = { name: 'smb-amp', version: '1.0.0' }
export const PROTOCOL_VERSION = '2024-11-05'

// ─── Tool definitions (MCP JSON Schema format) ───────────────────────────────

export const TOOLS = [
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
- If the user has a public URL already: pass it directly as creative_url`,
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
]

// ─── Handlers ─────────────────────────────────────────────────────────────────

async function uploadCreative(args: Record<string, string>): Promise<object> {
  const { file_base64, file_name, file_type } = args

  const buffer = Buffer.from(file_base64, 'base64')
  const blob = await put(file_name, buffer, {
    access: 'public',
    contentType: file_type,
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

  return createBeeswaxDraft(campaign)
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

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export async function handleToolCall(name: string, args: Record<string, unknown>) {
  const strArgs = args as Record<string, string>

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

  throw new Error(`Unknown tool: ${name}`)
}
