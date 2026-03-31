/**
 * Publisher preview: AdVision screenshot + Sharp composite
 *
 * Strategy: use AdVision to screenshot a real premium publisher homepage,
 * then composite our creative on top at the standard ad slot position.
 * This bypasses the GPT/iframe injection problem entirely.
 */

import sharp from 'sharp'
import { put } from '@vercel/blob'

const BASE_URL = process.env.ADVISION_API_URL ?? 'https://advision-production.up.railway.app'

// Premium publisher homepages by sector — no paywalls, real pages
const PUBLISHER_BY_SECTOR: Record<string, { url: string; name: string }> = {
  IAB1:  { url: 'https://www.theguardian.com/culture',  name: 'The Guardian' },
  IAB2:  { url: 'https://www.autocar.co.uk',            name: 'Autocar' },
  IAB3:  { url: 'https://www.ft.com',                   name: 'Financial Times' },
  IAB5:  { url: 'https://www.theguardian.com',          name: 'The Guardian' },
  IAB6:  { url: 'https://www.theguardian.com',          name: 'The Guardian' },
  IAB7:  { url: 'https://www.theguardian.com',          name: 'The Guardian' },
  IAB8:  { url: 'https://www.theguardian.com/food',     name: 'The Guardian' },
  IAB10: { url: 'https://www.theguardian.com',          name: 'The Guardian' },
  IAB11: { url: 'https://www.theguardian.com',          name: 'The Guardian' },
  IAB13: { url: 'https://www.ft.com',                   name: 'Financial Times' },
  IAB16: { url: 'https://www.theguardian.com',          name: 'The Guardian' },
  IAB17: { url: 'https://www.theguardian.com/sport',    name: 'The Guardian Sport' },
  IAB18: { url: 'https://www.vogue.co.uk',              name: 'Vogue' },
  IAB19: { url: 'https://techcrunch.com',               name: 'TechCrunch' },
  IAB20: { url: 'https://www.theguardian.com/travel',   name: 'The Guardian Travel' },
  IAB21: { url: 'https://www.theguardian.com',          name: 'The Guardian' },
  IAB22: { url: 'https://www.theguardian.com',          name: 'The Guardian' },
}

// Standard ad slot positions on premium publisher homepages (1440px wide viewport)
// These are typical positions for leaderboard (728x90) and MPU (300x250) slots
const AD_SLOT_POSITIONS: Record<string, { leaderboard: { x: number; y: number }; mpu: { x: number; y: number } }> = {
  'autocar.co.uk':    { leaderboard: { x: 356, y: 68  }, mpu: { x: 1100, y: 200 } },
  'ft.com':           { leaderboard: { x: 356, y: 22  }, mpu: { x: 1100, y: 250 } },
  'techcrunch.com':   { leaderboard: { x: 356, y: 45  }, mpu: { x: 1080, y: 180 } },
  'vogue.co.uk':      { leaderboard: { x: 356, y: 80  }, mpu: { x: 1110, y: 150 } },
  'theguardian.com':  { leaderboard: { x: 356, y: 0   }, mpu: { x: 1100, y: 200 } },
  default:            { leaderboard: { x: 356, y: 45  }, mpu: { x: 1100, y: 200 } },
}

function getSlotPosition(publisherUrl: string, format: '728x90' | '300x250') {
  const domain = Object.keys(AD_SLOT_POSITIONS).find(d => publisherUrl.includes(d)) ?? 'default'
  const pos = AD_SLOT_POSITIONS[domain]
  return format === '728x90' ? pos.leaderboard : pos.mpu
}

async function getPublisherScreenshot(publisherUrl: string): Promise<Buffer> {
  const ts = Date.now()

  // Create a temporary AdVision campaign (just to get a screenshot — we don't need injection)
  const campaignRes = await fetch(`${BASE_URL}/api/campaign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: `smb-amp-screenshot-${ts}`, clientName: 'smb-amp' }),
  })
  if (!campaignRes.ok) throw new Error(`AdVision campaign failed: ${campaignRes.status}`)
  const { campaign } = await campaignRes.json() as { campaign: { id: string } }

  // Upload a 1x1 transparent placeholder so the campaign has a creative (required)
  const placeholder = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  )
  const fd = new FormData()
  fd.append('campaignId', campaign.id)
  fd.append('creatives', new Blob([new Uint8Array(placeholder)], { type: 'image/png' }), 'placeholder.png')
  await fetch(`${BASE_URL}/api/upload`, { method: 'POST', body: fd })

  // Get screenshot of publisher page
  const scrapeRes = await fetch(`${BASE_URL}/api/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ campaignId: campaign.id, urls: [{ url: publisherUrl, fullPage: false }] }),
    signal: AbortSignal.timeout(120_000),
  })
  if (!scrapeRes.ok) throw new Error(`AdVision scrape failed: ${scrapeRes.status}`)

  const { results } = await scrapeRes.json() as { results: Array<{ screenshotPath?: string }> }
  const screenshotPath = results?.[0]?.screenshotPath
  if (!screenshotPath) throw new Error('No screenshot returned')

  // Download the screenshot
  const imgRes = await fetch(`${BASE_URL}/api/screenshot?path=${encodeURIComponent(screenshotPath)}`)
  if (!imgRes.ok) throw new Error(`Screenshot download failed: ${imgRes.status}`)
  return Buffer.from(await imgRes.arrayBuffer())
}

export async function generatePublisherPreview(
  creativePngBuffer: Buffer,
  fileName: string,
  iabCategory?: string
): Promise<string> {
  const publisher = (iabCategory && PUBLISHER_BY_SECTOR[iabCategory])
    ? PUBLISHER_BY_SECTOR[iabCategory]
    : { url: 'https://www.theguardian.com', name: 'The Guardian' }

  // Detect format from creative dimensions
  const meta = await sharp(creativePngBuffer).metadata()
  const isLeaderboard = meta.width && meta.height && meta.width > meta.height * 4
  const format: '728x90' | '300x250' = isLeaderboard ? '728x90' : '300x250'
  const [cw, ch] = format === '728x90' ? [728, 90] : [300, 250]

  // Get real publisher screenshot
  const screenshot = await getPublisherScreenshot(publisher.url)

  // Get standard ad slot position for this publisher
  const pos = getSlotPosition(publisher.url, format)

  // Ensure creative is correct dimensions
  const creative = await sharp(creativePngBuffer).resize(cw, ch, { fit: 'fill' }).png().toBuffer()

  // Composite creative onto publisher screenshot at ad slot position
  const composite = await sharp(screenshot)
    .resize(1440, 900, { fit: 'fill' })
    .composite([{ input: creative, left: pos.x, top: pos.y }])
    .jpeg({ quality: 90 })
    .toBuffer()

  // Upload to Vercel Blob and return URL
  const token = process.env.BLOB_READ_WRITE_TOKEN ?? process.env.BLOB_READ_WRITE_TOKEN_READ_WRITE_TOKEN
  const ts = Date.now()
  const blob = await put(`publisher-preview-${ts}.jpg`, composite, {
    access: 'public',
    contentType: 'image/jpeg',
    token,
    addRandomSuffix: true,
  })

  return blob.url
}
