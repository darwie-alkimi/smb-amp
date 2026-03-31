/**
 * AdVision API client
 * Deployed at: https://advision-production.up.railway.app
 *
 * Flow: create campaign → upload creative → scrape publisher URL → return screenshot URL
 */

const BASE_URL = process.env.ADVISION_API_URL ?? 'https://advision-production.up.railway.app'

const PUBLISHER_BY_SECTOR: Record<string, string> = {
  IAB1:  'https://www.theguardian.com/culture',
  IAB2:  'https://www.autocar.co.uk',
  IAB3:  'https://www.ft.com',
  IAB5:  'https://www.theguardian.com/education',
  IAB6:  'https://www.theguardian.com/lifeandstyle/family',
  IAB7:  'https://www.theguardian.com/society',
  IAB8:  'https://www.theguardian.com/food',
  IAB10: 'https://www.theguardian.com/lifeandstyle/homes',
  IAB11: 'https://www.theguardian.com',
  IAB13: 'https://www.ft.com',
  IAB16: 'https://www.theguardian.com',
  IAB17: 'https://www.theguardian.com/sport',
  IAB18: 'https://www.vogue.co.uk',
  IAB19: 'https://www.theverge.com',
  IAB20: 'https://www.theguardian.com/travel',
  IAB21: 'https://www.theguardian.com/money/property',
  IAB22: 'https://www.theguardian.com',
}

function getPublisherUrl(iabCategory?: string): string {
  if (iabCategory && PUBLISHER_BY_SECTOR[iabCategory]) {
    return PUBLISHER_BY_SECTOR[iabCategory]
  }
  return 'https://www.theguardian.com'
}

export async function generatePublisherPreview(
  creativePngBuffer: Buffer,
  fileName: string,
  iabCategory?: string
): Promise<string> {
  const publisherUrl = getPublisherUrl(iabCategory)
  const ts = Date.now()

  // Step 1: Create a temporary campaign
  const campaignRes = await fetch(`${BASE_URL}/api/campaign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `smb-amp-${ts}`, clientName: 'smb-amp' }),
  })
  if (!campaignRes.ok) throw new Error(`AdVision campaign creation failed: ${campaignRes.status}`)
  const { campaign } = await campaignRes.json() as { campaign: { id: string } }
  const campaignId = campaign.id

  // Step 2: Upload creative PNG to campaign
  const formData = new FormData()
  formData.append('campaignId', campaignId)
  const blob = new Blob([new Uint8Array(creativePngBuffer)], { type: 'image/png' })
  formData.append('creatives', blob, fileName)

  const uploadRes = await fetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  })
  if (!uploadRes.ok) throw new Error(`AdVision upload failed: ${uploadRes.status}`)

  // Step 3: Scrape publisher URL
  const scrapeRes = await fetch(`${BASE_URL}/api/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignId, urls: [publisherUrl] }),
    signal: AbortSignal.timeout(120_000), // 2 min timeout for Playwright
  })
  if (!scrapeRes.ok) throw new Error(`AdVision scrape failed: ${scrapeRes.status}`)

  const { results } = await scrapeRes.json() as {
    results: Array<{ screenshotPath?: string; status: string }>
  }

  const result = results?.[0]
  if (!result?.screenshotPath) {
    throw new Error('AdVision returned no screenshot')
  }

  return `${BASE_URL}/api/screenshot?path=${encodeURIComponent(result.screenshotPath)}`
}
