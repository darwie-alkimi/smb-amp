/**
 * Beeswax DSP Integration
 *
 * Mock mode (default): returns fake IDs for demo purposes.
 * Live mode: set BEESWAX_API_URL, BEESWAX_USERNAME, BEESWAX_PASSWORD in .env.local
 *
 * Flow:
 *   1. Create advertiser for the SMB
 *   2. Create campaign (inactive draft) under that advertiser
 *   3. Create line item under that campaign
 */

import type { CampaignState, BeeswaxDraftResult } from './types'

async function beeswaxPost(
  path: string,
  payload: object,
  credentials: { apiUrl: string; username: string; password: string }
): Promise<{ id: number; [key: string]: unknown }> {
  const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64')

  const res = await fetch(`${credentials.apiUrl}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Beeswax ${path} error ${res.status}: ${text}`)
  }

  const data = await res.json()
  return data.payload ?? data
}

export async function createBeeswaxDraft(
  campaign: CampaignState
): Promise<BeeswaxDraftResult> {
  const { BEESWAX_API_URL, BEESWAX_USERNAME, BEESWAX_PASSWORD } = process.env

  // ── MOCK MODE ──────────────────────────────────────────────────────────────
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
      lineItemId: `MOCK-LI-${id + 2}`,
      mock: true,
    }
  }

  // ── LIVE MODE ──────────────────────────────────────────────────────────────
  const credentials = { apiUrl: BEESWAX_API_URL, username: BEESWAX_USERNAME, password: BEESWAX_PASSWORD }
  const budget = parseFloat((campaign.budget ?? '0').replace(/[^0-9.]/g, ''))

  try {
    // 1. Create advertiser for this SMB
    const advertiser = await beeswaxPost(
      '/rest/advertiser',
      {
        advertiser_name: campaign.business_name ?? 'SMB Advertiser',
        notes: `Created via SMB chatbot. Contact: ${campaign.business_email ?? ''}`,
        active: true,
      },
      credentials
    )

    // 2. Create campaign as inactive draft
    const createdCampaign = await beeswaxPost(
      '/rest/campaign',
      {
        advertiser_id: advertiser.id,
        campaign_name: campaign.campaign_name ?? 'Untitled Campaign',
        start_date: campaign.start_date ?? '',
        end_date: campaign.end_date ?? '',
        budget_type: 'fixed',
        budget,
        status: 'inactive', // draft — account manager activates
        notes: `SMB chatbot submission. Sector: ${campaign.iab_category ?? ''}. Creative: ${campaign.creative_file_name ?? ''}`,
      },
      credentials
    )

    // 3. Create line item
    const lineItem = await beeswaxPost(
      '/rest/line_item',
      {
        advertiser_id: advertiser.id,
        campaign_id: createdCampaign.id,
        line_item_name: `${campaign.campaign_name} — Line Item 1`,
        line_item_type_id: 0,
        targeting: {
          geo: { country: 'US' },
          ...(campaign.iab_category ? { segment: { category: campaign.iab_category } } : {}),
        },
        start_date: campaign.start_date ?? '',
        end_date: campaign.end_date ?? '',
        budget,
        bid_shading: true,
        active: false,
      },
      credentials
    )

    return {
      success: true,
      advertiserId: String(advertiser.id),
      campaignId: String(createdCampaign.id),
      lineItemId: String(lineItem.id),
      mock: false,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Beeswax] Error:', message)
    return { success: false, error: message }
  }
}
