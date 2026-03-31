import { GoogleGenAI } from '@google/genai'
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

const IAB_CTA: Record<string, string> = {
  IAB1:  'Watch Now',
  IAB2:  'Book a Test Drive',
  IAB3:  'Get a Quote',
  IAB5:  'Enrol Now',
  IAB7:  'Book Now',
  IAB8:  'Order Now',
  IAB13: 'Get Started',
  IAB17: 'Join Now',
  IAB18: 'Shop Now',
  IAB19: 'Try Free',
  IAB20: 'Explore Now',
  IAB21: 'View Listings',
  IAB22: 'Shop Now',
}

export async function generateCreativeImage(
  businessName: string,
  iabCategory?: string,
  description?: string,
  format: '300x250' | '728x90' = '300x250'
): Promise<Buffer> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  const sector = iabCategory ? (IAB_TO_SECTOR[iabCategory] ?? 'business') : 'business'
  const cta = (iabCategory && IAB_CTA[iabCategory]) ? IAB_CTA[iabCategory] : 'Learn More'
  const isLeaderboard = format === '728x90'

  // Imagen 3 supported aspect ratios
  const aspectRatio = isLeaderboard ? '16:9' : '4:3'
  const [targetW, targetH] = isLeaderboard ? [728, 90] : [300, 250]

  const layoutGuide = isLeaderboard
    ? `Horizontal banner layout (wide and short):
       - Left third: bold brand name and logo area
       - Centre: punchy headline (max 6 words), clean typography
       - Right third: prominent CTA button with text "${cta}"
       - Design must read clearly when compressed to a thin horizontal strip`
    : `Vertical display ad layout (300×250 medium rectangle):
       - Top section: brand name prominently displayed
       - Middle: compelling headline (max 8 words), key visual or graphic
       - Bottom: prominent CTA button with text "${cta}"
       - Bold, high-contrast design that stands out on a news page`

  const prompt = `You are a senior art director at a top advertising agency with 15 years of experience creating high-converting digital display ads.

Create a professional, eye-catching digital banner advertisement for "${businessName}", a ${sector} business.

${layoutGuide}

Design requirements:
- Industry-appropriate colour palette for ${sector} — bold and memorable
- Strong visual hierarchy that guides the eye
- Premium, modern aesthetic — think high-end advertising, not clipart
- High contrast text that is legible at small sizes
- Clean composition with purposeful use of negative space
- Photorealistic or high-quality graphic elements relevant to ${sector}
- The ad should feel like it belongs on a premium publisher like The Guardian or FT
${description ? `\nCreative direction from client: ${description}` : ''}

Output: A single polished banner ad. No borders, no device frames, no mockup UI — just the advertisement itself.`

  const response = await ai.models.generateImages({
    model: 'imagen-3.0-generate-002',
    prompt,
    config: {
      numberOfImages: 1,
      aspectRatio,
      outputMimeType: 'image/png',
    },
  })

  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes
  if (!imageBytes) throw new Error('Gemini Imagen returned no image')

  const rawBuffer = Buffer.from(imageBytes, 'base64')

  // Resize to exact IAB dimensions
  const resized = await sharp(rawBuffer)
    .resize(targetW, targetH, { fit: 'cover', position: 'centre' })
    .png()
    .toBuffer()

  return resized
}

// Legacy SVG export kept for backwards compatibility with the web app UI
// TODO: update web app to use generateCreativeImage
export async function generateCreativeSvg(
  businessName: string,
  iabCategory?: string,
  description?: string,
  format: '300x250' | '728x90' = '300x250'
): Promise<string> {
  const buf = await generateCreativeImage(businessName, iabCategory, description, format)
  const base64 = buf.toString('base64')
  const [w, h] = format === '728x90' ? [728, 90] : [300, 250]
  // Return an SVG wrapper around the PNG data URI so existing callers get valid SVG
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><image href="data:image/png;base64,${base64}" width="${w}" height="${h}"/></svg>`
}
