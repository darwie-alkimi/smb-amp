import sharp from 'sharp'
import { GoogleGenAI } from '@google/genai'

const IAB_TO_SECTOR: Record<string, string> = {
  IAB1:  'entertainment and events',
  IAB2:  'automotive',
  IAB3:  'professional services',
  IAB5:  'education',
  IAB6:  'family and parenting',
  IAB7:  'health and wellness',
  IAB8:  'restaurant and food',
  IAB10: 'home and garden',
  IAB11: 'legal services',
  IAB13: 'financial services',
  IAB16: 'pets',
  IAB17: 'sports and fitness',
  IAB18: 'beauty and fashion',
  IAB19: 'technology and software',
  IAB20: 'travel and tourism',
  IAB21: 'real estate',
  IAB22: 'retail and shopping',
}

// Bold vibrant poster-style design per sector
const SECTOR_DESIGN: Record<string, {
  heroPrompt: string   // FLUX prompt — product only, white/light background
  bgColor: string      // solid background colour for the ad
  accentColor: string
  textColor: string
  ctaBg: string
  ctaText: string
  cta: string
}> = {
  IAB1:  { heroPrompt: 'concert stage dramatic spotlights vibrant purple orange glow, product photography style, centred, white background', bgColor: '#2d0a6e', accentColor: '#ff6d00', textColor: '#ffffff', ctaBg: '#ff6d00', ctaText: '#ffffff', cta: 'Watch Now' },
  IAB2:  { heroPrompt: 'sleek luxury sports car isolated, dramatic studio lighting, chrome, black background, hero product shot', bgColor: '#0d1117', accentColor: '#e63946', textColor: '#ffffff', ctaBg: '#e63946', ctaText: '#ffffff', cta: 'Book Test Drive' },
  IAB3:  { heroPrompt: 'professional businessman shaking hands, confident corporate portrait, soft dark blue background, studio light', bgColor: '#0f2044', accentColor: '#c9a84c', textColor: '#ffffff', ctaBg: '#c9a84c', ctaText: '#0f2044', cta: 'Get a Quote' },
  IAB5:  { heroPrompt: 'stack of books graduation cap diploma, bright studio shot, white background, academic success', bgColor: '#1b5e20', accentColor: '#f9ca24', textColor: '#ffffff', ctaBg: '#f9ca24', ctaText: '#1b3a0f', cta: 'Enrol Now' },
  IAB7:  { heroPrompt: 'healthy person yoga meditation wellness, bright clean white background, serene calm', bgColor: '#006064', accentColor: '#80cbc4', textColor: '#ffffff', ctaBg: '#00897b', ctaText: '#ffffff', cta: 'Book Now' },
  IAB8:  { heroPrompt: 'mouthwatering gourmet pizza close up, melted cheese, fresh toppings, dramatic food photography, dark background, studio lit', bgColor: '#92400e', accentColor: '#fbbf24', textColor: '#ffffff', ctaBg: '#fbbf24', ctaText: '#78350f', cta: 'Order Now' },
  IAB13: { heroPrompt: 'gold coins financial growth chart graph, luxury wealth concept, dark navy background, premium', bgColor: '#0c2340', accentColor: '#d4af37', textColor: '#ffffff', ctaBg: '#d4af37', ctaText: '#0c2340', cta: 'Get Started' },
  IAB17: { heroPrompt: 'athletic person running jumping dynamic sports action, blue sky background, energy motion', bgColor: '#1e3a5f', accentColor: '#f97316', textColor: '#ffffff', ctaBg: '#f97316', ctaText: '#ffffff', cta: 'Join Now' },
  IAB18: { heroPrompt: 'luxury beauty cosmetics perfume product isolated, elegant soft pink background, editorial glamour', bgColor: '#4a1942', accentColor: '#f472b6', textColor: '#ffffff', ctaBg: '#f472b6', ctaText: '#4a1942', cta: 'Shop Now' },
  IAB19: { heroPrompt: 'futuristic laptop smartphone technology product, dark background, glowing neon blue interface, high tech', bgColor: '#0f172a', accentColor: '#818cf8', textColor: '#ffffff', ctaBg: '#4f46e5', ctaText: '#ffffff', cta: 'Try Free' },
  IAB20: { heroPrompt: 'tropical beach paradise aerial view turquoise water white sand, golden hour stunning travel destination', bgColor: '#0369a1', accentColor: '#fbbf24', textColor: '#ffffff', ctaBg: '#fbbf24', ctaText: '#0c4a6e', cta: 'Explore Now' },
  IAB21: { heroPrompt: 'luxury modern house exterior twilight, warm lights, beautiful garden, aspirational real estate', bgColor: '#1c1917', accentColor: '#d4af37', textColor: '#ffffff', ctaBg: '#d4af37', ctaText: '#1c1917', cta: 'View Listings' },
  IAB22: { heroPrompt: 'premium shopping bags retail products flat lay, bright vibrant background, exciting deals', bgColor: '#dc2626', accentColor: '#fbbf24', textColor: '#ffffff', ctaBg: '#fbbf24', ctaText: '#7f1d1d', cta: 'Shop Now' },
}

const DEFAULT_DESIGN = {
  bgPrompt: 'bold deep indigo blue background, modern abstract geometric shapes, professional business graphic design, no text',
  bgColor: '#1e1b4b', accentColor: '#818cf8', textColor: '#ffffff', ctaBg: '#4f46e5', ctaText: '#ffffff', cta: 'Learn More',
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  return [parseInt(clean.slice(0,2),16), parseInt(clean.slice(2,4),16), parseInt(clean.slice(4,6),16)]
}

async function generateHeadline(businessName: string, sector: string, description?: string): Promise<string> {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
    const res = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: `Write ONE punchy 3-5 word advertising headline for "${businessName}" (${sector} business).${description ? ` Style: ${description}.` : ''} No quotes, no punctuation. Just the headline words.` }] }],
      config: { temperature: 0.9 },
    })
    const text = res.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
    return text.replace(/["'.!]/g, '').trim().slice(0, 40)
  } catch {
    return `Discover ${businessName}`
  }
}

function makeOverlaySvg(
  businessName: string,
  headline: string,
  design: typeof DEFAULT_DESIGN,
  w: number,
  h: number,
  isLeaderboard: boolean
): Buffer {
  const [ctaR, ctaG, ctaB] = hexToRgb(design.ctaBg)
  const [txtR, txtG, txtB] = hexToRgb(design.ctaText)
  const [accR, accG, accB] = hexToRgb(design.accentColor)
  const [fgR, fgG, fgB] = hexToRgb(design.textColor)

  let svg: string

  if (isLeaderboard) {
    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <!-- Semi-transparent left band for text -->
  <rect x="0" y="0" width="${w * 0.38}" height="${h}" fill="rgba(0,0,0,0.55)"/>
  <!-- Brand name -->
  <text x="16" y="${h * 0.42}" font-family="'Arial Black',Arial,sans-serif" font-weight="900" font-size="19" fill="rgb(${fgR},${fgG},${fgB})" dominant-baseline="middle">${businessName}</text>
  <!-- Accent underline -->
  <rect x="16" y="${h * 0.57}" width="${w * 0.3}" height="2.5" fill="rgb(${accR},${accG},${accB})"/>
  <!-- Headline small -->
  <text x="16" y="${h * 0.76}" font-family="Arial,sans-serif" font-weight="400" font-size="11" fill="rgba(${fgR},${fgG},${fgB},0.8)" dominant-baseline="middle">${headline}</text>
  <!-- CTA button right -->
  <rect x="${w * 0.68}" y="${(h-40)/2}" width="${w * 0.29}" height="40" rx="6" fill="rgb(${ctaR},${ctaG},${ctaB})"/>
  <text x="${w * 0.68 + w * 0.29 / 2}" y="${h/2}" font-family="'Arial Black',Arial,sans-serif" font-weight="700" font-size="13" fill="rgb(${txtR},${txtG},${txtB})" text-anchor="middle" dominant-baseline="middle">${design.cta} →</text>
  <rect x="0.5" y="0.5" width="${w-1}" height="${h-1}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
</svg>`
  } else {
    // MPU layout — bold top band + bottom CTA, big headline in middle
    const bnds = { topH: 58, btmH: 60 }
    const midY = bnds.topH + (h - bnds.topH - bnds.btmH) / 2
    // Wrap headline into 2 lines if needed
    const words = headline.split(' ')
    const mid = Math.ceil(words.length / 2)
    const line1 = words.slice(0, mid).join(' ')
    const line2 = words.slice(mid).join(' ')

    svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <!-- Top band -->
  <rect x="0" y="0" width="${w}" height="${bnds.topH}" fill="rgba(0,0,0,0.60)"/>
  <text x="${w/2}" y="${bnds.topH * 0.52}" font-family="'Arial Black',Arial,sans-serif" font-weight="900" font-size="20" fill="rgb(${fgR},${fgG},${fgB})" text-anchor="middle" dominant-baseline="middle">${businessName}</text>
  <rect x="20" y="${bnds.topH - 3}" width="${w - 40}" height="3" fill="rgb(${accR},${accG},${accB})" rx="1.5"/>
  <!-- Hero headline over image -->
  <rect x="0" y="${midY - 44}" width="${w}" height="88" fill="rgba(0,0,0,0.50)" rx="0"/>
  <text x="${w/2}" y="${midY - 12}" font-family="'Arial Black',Arial,sans-serif" font-weight="900" font-size="24" fill="rgb(${fgR},${fgG},${fgB})" text-anchor="middle" dominant-baseline="middle">${line1}</text>
  ${line2 ? `<text x="${w/2}" y="${midY + 18}" font-family="'Arial Black',Arial,sans-serif" font-weight="900" font-size="24" fill="rgb(${accR},${accG},${accB})" text-anchor="middle" dominant-baseline="middle">${line2}</text>` : ''}
  <!-- Bottom CTA band -->
  <rect x="0" y="${h - bnds.btmH}" width="${w}" height="${bnds.btmH}" fill="rgba(0,0,0,0.55)"/>
  <rect x="20" y="${h - bnds.btmH + 9}" width="${w - 40}" height="42" rx="21" fill="rgb(${ctaR},${ctaG},${ctaB})"/>
  <text x="${w/2}" y="${h - bnds.btmH + 30}" font-family="'Arial Black',Arial,sans-serif" font-weight="700" font-size="15" fill="rgb(${txtR},${txtG},${txtB})" text-anchor="middle" dominant-baseline="middle">${design.cta} →</text>
  <rect x="0.5" y="0.5" width="${w-1}" height="${h-1}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
</svg>`
  }
  return Buffer.from(svg)
}

async function fetchFluxImage(prompt: string, w: number, h: number): Promise<Buffer> {
  const token = process.env.HF_API_TOKEN
  if (!token) throw new Error('HF_API_TOKEN not set')

  const res = await fetch('https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-wait-for-model': 'true',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: { width: w, height: h, num_inference_steps: 4, guidance_scale: 0 },
    }),
    signal: AbortSignal.timeout(90_000),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => `HTTP ${res.status}`)
    throw new Error(`FLUX: ${res.status} ${err.slice(0, 200)}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

export async function generateCreativeImage(
  businessName: string,
  iabCategory?: string,
  description?: string,
  format: '300x250' | '728x90' = '300x250'
): Promise<Buffer> {
  const sector = iabCategory ? (IAB_TO_SECTOR[iabCategory] ?? 'business') : 'business'
  const design = (iabCategory && SECTOR_DESIGN[iabCategory]) ? SECTOR_DESIGN[iabCategory] : DEFAULT_DESIGN
  const isLeaderboard = format === '728x90'
  const [w, h] = isLeaderboard ? [728, 90] : [300, 250]

  const heroPrompt = [
    design.heroPrompt,
    description ?? '',
    'ultra high quality product photography, professional studio shot, no text, no words, no letters, no watermarks',
  ].filter(Boolean).join(', ')

  // Generate hero image + headline in parallel
  const [heroBuffer, headline] = await Promise.all([
    fetchFluxImage(heroPrompt, w, h),
    generateHeadline(businessName, sector, description),
  ])

  // Parse solid background colour
  const [bgR, bgG, bgB] = hexToRgb(design.bgColor)

  // Create solid colour background
  const background = await sharp({
    create: { width: w, height: h, channels: 3, background: { r: bgR, g: bgG, b: bgB } },
  }).png().toBuffer()

  // Resize hero, blend it (centred, semi-transparent) onto the background
  const hero = await sharp(heroBuffer)
    .resize(w, h, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer()

  // Composite: background → hero at 65% opacity → text overlay
  const overlay = makeOverlaySvg(businessName, headline, design, w, h, isLeaderboard)

  return sharp(background)
    .composite([
      { input: hero, blend: 'over', top: 0, left: 0 },
      { input: overlay, top: 0, left: 0 },
    ])
    .png()
    .toBuffer()
}

// Legacy export
export async function generateCreativeSvg(
  businessName: string,
  iabCategory?: string,
  description?: string,
  format: '300x250' | '728x90' = '300x250'
): Promise<string> {
  const buf = await generateCreativeImage(businessName, iabCategory, description, format)
  const [w, h] = format === '728x90' ? [728, 90] : [300, 250]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><image href="data:image/png;base64,${buf.toString('base64')}" width="${w}" height="${h}"/></svg>`
}
