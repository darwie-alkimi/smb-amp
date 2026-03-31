import sharp from 'sharp'

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

const SECTOR_STYLE: Record<string, string> = {
  IAB1:  'dramatic cinematic lighting, deep purple and orange tones, event poster style',
  IAB2:  'sleek dark automotive photography, gleaming chrome, speed motion blur, showroom lighting',
  IAB3:  'clean corporate minimalism, deep navy and gold, professional trust, modern office',
  IAB5:  'bright inspiring educational, green and yellow, students, books, growth',
  IAB7:  'clean medical wellness, teal and white, healthy lifestyle, bright natural light',
  IAB8:  'food photography, warm steam rising, rich saturated colours, appetising close-up, restaurant ambiance',
  IAB13: 'premium finance, dark navy gold luxury, wealth, sophisticated, Wall Street aesthetic',
  IAB17: 'dynamic sports action, blue and orange energy, athletic motion, stadium lighting',
  IAB18: 'luxury beauty fashion, soft pink purple bokeh, glamour, editorial magazine style',
  IAB19: 'futuristic tech, dark background glowing indigo blue, holographic, clean modern UI',
  IAB20: 'vibrant travel photography, azure ocean, golden hour, exotic destination, wanderlust',
  IAB21: 'premium real estate, charcoal and gold, architectural photography, aspirational home',
  IAB22: 'bold retail, vivid colours, products, shopping bags, sale energy, exciting deals',
}

const SECTOR_CTA: Record<string, string> = {
  IAB1: 'Watch Now', IAB2: 'Book Test Drive', IAB3: 'Get a Quote',
  IAB5: 'Enrol Now', IAB7: 'Book Now', IAB8: 'Order Now',
  IAB13: 'Get Started', IAB17: 'Join Now', IAB18: 'Shop Now',
  IAB19: 'Try Free', IAB20: 'Explore Now', IAB21: 'View Listings', IAB22: 'Shop Now',
}

export async function generateCreativeImage(
  businessName: string,
  iabCategory?: string,
  description?: string,
  format: '300x250' | '728x90' = '300x250'
): Promise<Buffer> {
  const sector = iabCategory ? (IAB_TO_SECTOR[iabCategory] ?? 'business') : 'business'
  const style = (iabCategory && SECTOR_STYLE[iabCategory]) ? SECTOR_STYLE[iabCategory] : 'modern professional business, clean premium design'
  const cta = (iabCategory && SECTOR_CTA[iabCategory]) ? SECTOR_CTA[iabCategory] : 'Learn More'
  const isLeaderboard = format === '728x90'
  const [w, h] = isLeaderboard ? [728, 90] : [300, 250]

  const layoutGuide = isLeaderboard
    ? `wide horizontal leaderboard banner ad ${w}x${h}px, brand name on left side, compelling headline text in centre, prominent "${cta}" call-to-action button on right`
    : `vertical display ad ${w}x${h}px medium rectangle, brand name at top, powerful visual in middle, prominent "${cta}" call-to-action button at bottom`

  const prompt = [
    `Professional high-converting digital display advertisement for "${businessName}", ${sector} industry.`,
    layoutGuide + '.',
    style + '.',
    description ? description + '.' : '',
    `Bold clear typography, strong visual hierarchy, premium advertising design.`,
    `Shot by a top advertising photographer, used in premium publications like The Guardian and Financial Times.`,
    `Ultra-high quality, 4K, professional advertising creative, no watermarks, no borders.`,
  ].filter(Boolean).join(' ')

  const token = process.env.HF_API_TOKEN
  if (!token) throw new Error('HF_API_TOKEN not set')

  // Try FLUX.1-dev first (highest quality), fall back to schnell
  const models = [
    'black-forest-labs/FLUX.1-schnell',
    'stabilityai/stable-diffusion-xl-base-1.0',
  ]

  let lastError: Error | null = null
  for (const model of models) {
    try {
      const res = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
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

      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer())
        // Resize to exact IAB dimensions and convert to PNG
        return await sharp(buf).resize(w, h, { fit: 'fill' }).png().toBuffer()
      }

      const errText = await res.text().catch(() => `HTTP ${res.status}`)
      lastError = new Error(`${model}: ${res.status} ${errText.slice(0, 150)}`)
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e))
    }
  }

  throw lastError ?? new Error('All image generation models failed')
}

// Legacy export for web app UI compatibility
export async function generateCreativeSvg(
  businessName: string,
  iabCategory?: string,
  description?: string,
  format: '300x250' | '728x90' = '300x250'
): Promise<string> {
  const buf = await generateCreativeImage(businessName, iabCategory, description, format)
  const [w, h] = format === '728x90' ? [728, 90] : [300, 250]
  const b64 = buf.toString('base64')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><image href="data:image/png;base64,${b64}" width="${w}" height="${h}"/></svg>`
}
