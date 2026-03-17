/**
 * Beeswax DSP Integration
 *
 * Mock mode (default): returns fake IDs for demo purposes.
 * Live mode: set BEESWAX_API_URL, BEESWAX_USERNAME, BEESWAX_PASSWORD in .env.local
 *
 * Flow:
 *   1. Create advertiser for the SMB
 *   2. Create campaign (inactive draft)
 *   3. Create targeting expression (geography + IAB category)
 *   4. Create line item with bidding + targeting
 *
 * Note: Beeswax sandbox invalidates sessions aggressively.
 *       Each request re-authenticates. This works on production.
 */

import type { CampaignState, BeeswaxDraftResult } from './types'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// ─── Geo mapping ──────────────────────────────────────────────────────────────
// Maps plain-language geography input to Beeswax country codes

const GEO_MAP: Record<string, string> = {
  'united states': 'US', 'usa': 'US', 'us': 'US', 'america': 'US',
  'united kingdom': 'GB', 'uk': 'GB', 'england': 'GB', 'britain': 'GB',
  'australia': 'AU', 'canada': 'CA', 'ireland': 'IE', 'new zealand': 'NZ',
  'germany': 'DE', 'france': 'FR', 'spain': 'ES', 'italy': 'IT',
  'netherlands': 'NL', 'sweden': 'SE', 'norway': 'NO', 'denmark': 'DK',
  'uae': 'AE', 'dubai': 'AE', 'saudi arabia': 'SA', 'india': 'IN',
  'singapore': 'SG', 'japan': 'JP', 'south korea': 'KR', 'china': 'CN',
}

function extractCountryCodes(geography: string): string[] {
  const lower = geography.toLowerCase()
  const found: string[] = []
  for (const [key, code] of Object.entries(GEO_MAP)) {
    if (lower.includes(key) && !found.includes(code)) {
      found.push(code)
    }
  }
  return found.length > 0 ? found : ['US'] // default to US
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function beeswaxAuth(apiUrl: string, username: string, password: string): Promise<string> {
  const res = await fetch(`${apiUrl}/rest/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: username, password, keep_logged_in: true }),
    cache: 'no-store',
  })
  const body = await res.json()
  if (!body.success) throw new Error(`Beeswax auth failed: ${JSON.stringify(body)}`)

  let cookie = ''
  res.headers.forEach((v, k) => { if (k === 'set-cookie') cookie = v.split(';')[0] })
  if (!cookie) throw new Error('Beeswax auth: no session cookie returned')
  return cookie
}

// ─── API call (re-authenticates each time) ───────────────────────────────────

async function beeswaxPost(
  path: string,
  payload: object,
  apiUrl: string,
  username: string,
  password: string
): Promise<{ id: number; [key: string]: unknown }> {
  await sleep(500)
  const cookie = await beeswaxAuth(apiUrl, username, password)

  const res = await fetch(`${apiUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify(payload),
    cache: 'no-store',
  })

  const data = await res.json()
  if (!res.ok || data.success === false) {
    throw new Error(`Beeswax ${path} error ${res.status}: ${JSON.stringify(data)}`)
  }
  return data.payload ?? data
}

// Format date to Beeswax format
function formatDate(date: string): string {
  return date.includes(' ') ? date : `${date} 00:00:00`
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function createBeeswaxDraft(campaign: CampaignState): Promise<BeeswaxDraftResult> {
  const { BEESWAX_API_URL, BEESWAX_USERNAME, BEESWAX_PASSWORD } = process.env

  // ── MOCK MODE ────────────────────────────────────────────────────────────
  if (!BEESWAX_API_URL || !BEESWAX_USERNAME || !BEESWAX_PASSWORD) {
    console.log('[Beeswax MOCK] Would create:', {
      advertiser: campaign.business_name,
      campaign: campaign.campaign_name,
    })
    const id = Math.floor(Math.random() * 900000) + 100000
    return {
      success: true,
      advertiserId: `MOCK-ADV-${id}`,
      campaignId: `MOCK-CAMP-${id + 1}`,
      mock: true,
    }
  }

  // ── LIVE MODE ────────────────────────────────────────────────────────────
  const budget = parseFloat((campaign.budget ?? '0').replace(/[^0-9.]/g, ''))
  const creds = [BEESWAX_API_URL, BEESWAX_USERNAME, BEESWAX_PASSWORD] as const
  const countryCodes = extractCountryCodes(campaign.geography ?? '')

  try {
    // 1. Create advertiser
    const advertiser = await beeswaxPost('/rest/advertiser', {
      advertiser_name: campaign.business_name ?? 'SMB Advertiser',
      notes: `Created via SMB chatbot. Contact: ${campaign.contact_name ?? ''}`,
      active: true,
    }, ...creds)

    // 2. Create campaign
    const createdCampaign = await beeswaxPost('/rest/campaign', {
      advertiser_id: advertiser.id,
      campaign_name: campaign.campaign_name ?? 'Untitled Campaign',
      start_date: formatDate(campaign.start_date ?? ''),
      end_date: formatDate(campaign.end_date ?? ''),
      budget_type: 0,
      campaign_budget: budget,
      active: false,
      notes: `SMB chatbot submission. Contact: ${campaign.contact_name ?? ''}`,
    }, ...creds)

    // 3. Create targeting expression (geography + IAB content category)
    let targetingExpressionId: number | null = null
    try {
      const targeting = await beeswaxPost('/rest/targeting_expression', {
        advertiser_id: advertiser.id,
        targeting_expression_name: `${campaign.campaign_name} — Targeting`,
        active: true,
        expression: {
          OR: [
            // Geography targeting
            {
              AND: countryCodes.map(code => ({
                operator: 'IS',
                dimension: 'country',
                value: code,
              }))
            },
            // IAB content category targeting
            ...(campaign.iab_category ? [{
              operator: 'IS',
              dimension: 'content_category',
              value: campaign.iab_category,
            }] : []),
          ]
        }
      }, ...creds)
      targetingExpressionId = targeting.id
    } catch (err) {
      // Targeting expression may not be available on all Beeswax instances
      // Log and continue — account manager can add targeting manually
      console.warn('[Beeswax] Targeting expression failed (will skip):', err instanceof Error ? err.message : err)
    }

    // 4. Create line item with bidding + targeting
    let lineItemId: number | null = null
    try {
      const lineItem = await beeswaxPost('/rest/line_item', {
        advertiser_id: advertiser.id,
        campaign_id: createdCampaign.id,
        line_item_name: `${campaign.campaign_name} — Line Item 1`,
        line_item_type_id: 0,
        start_date: formatDate(campaign.start_date ?? ''),
        end_date: formatDate(campaign.end_date ?? ''),
        line_item_budget: budget,
        bidding: {
          bidding_strategy: 'CPM',
          values: { cpm_bid: 5 },
        },
        ...(targetingExpressionId ? { targeting_expression_id: targetingExpressionId } : {}),
        active: false,
      }, ...creds)
      lineItemId = lineItem.id
    } catch (err) {
      // Line item creation failed — campaign still usable, account manager can add
      console.warn('[Beeswax] Line item creation failed (will skip):', err instanceof Error ? err.message : err)
    }

    return {
      success: true,
      advertiserId: String(advertiser.id),
      campaignId: String(createdCampaign.id),
      mock: false,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Beeswax] Error:', message)
    return { success: false, error: message }
  }
}
