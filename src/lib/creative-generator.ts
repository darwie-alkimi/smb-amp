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

const SECTOR_PALETTE: Record<string, { bg: string; accent: string; text: string; cta: string; mood: string }> = {
  IAB1:  { bg: '#1a0533', accent: '#ff6d00', text: '#ffffff', cta: 'Watch Now',       mood: 'dramatic purple-orange, cinematic lighting' },
  IAB2:  { bg: '#0d1117', accent: '#c0392b', text: '#ffffff', cta: 'Book Test Drive',  mood: 'sleek dark automotive, chrome accents, speed lines' },
  IAB3:  { bg: '#0f2044', accent: '#c9a84c', text: '#ffffff', cta: 'Get a Quote',      mood: 'corporate navy-gold, professional trust' },
  IAB5:  { bg: '#1b3a2f', accent: '#f9ca24', text: '#ffffff', cta: 'Enrol Now',        mood: 'academic green-gold, inspiring growth' },
  IAB7:  { bg: '#006064', accent: '#80cbc4', text: '#ffffff', cta: 'Book Now',         mood: 'clean teal health, calming trust' },
  IAB8:  { bg: '#7f1d1d', accent: '#fb923c', text: '#ffffff', cta: 'Order Now',        mood: 'warm rich red-orange, appetising food photography feel' },
  IAB13: { bg: '#0c2340', accent: '#d4af37', text: '#ffffff', cta: 'Get Started',      mood: 'premium finance navy-gold, wealth sophistication' },
  IAB17: { bg: '#1e3a5f', accent: '#f97316', text: '#ffffff', cta: 'Join Now',         mood: 'dynamic sports blue-orange, energy and motion' },
  IAB18: { bg: '#2d1b4e', accent: '#f472b6', text: '#ffffff', cta: 'Shop Now',         mood: 'luxury beauty violet-pink, elegance' },
  IAB19: { bg: '#0f172a', accent: '#6366f1', text: '#ffffff', cta: 'Try Free',         mood: 'modern tech dark-indigo, futuristic clean' },
  IAB20: { bg: '#0369a1', accent: '#38bdf8', text: '#ffffff', cta: 'Explore Now',      mood: 'vibrant travel blue, wanderlust sunshine' },
  IAB21: { bg: '#292524', accent: '#d4af37', text: '#ffffff', cta: 'View Listings',    mood: 'sophisticated real estate charcoal-gold' },
  IAB22: { bg: '#7f1d1d', accent: '#fb923c', text: '#ffffff', cta: 'Shop Now',         mood: 'bold retail red-orange, deals energy' },
}

const DEFAULT_PALETTE = { bg: '#0f172a', accent: '#6366f1', text: '#ffffff', cta: 'Learn More', mood: 'modern professional' }

export async function generateCreativeImage(
  businessName: string,
  iabCategory?: string,
  description?: string,
  format: '300x250' | '728x90' = '300x250'
): Promise<Buffer> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! })
  const sector = iabCategory ? (IAB_TO_SECTOR[iabCategory] ?? 'business') : 'business'
  const palette = (iabCategory && SECTOR_PALETTE[iabCategory]) ? SECTOR_PALETTE[iabCategory] : DEFAULT_PALETTE
  const isLeaderboard = format === '728x90'
  const [w, h] = isLeaderboard ? [728, 90] : [300, 250]
  const gradDir = isLeaderboard ? 'x1="0" y1="0" x2="1" y2="0"' : 'x1="0" y1="0" x2="0" y2="1"'

  const layoutSpec = isLeaderboard ? `
CANVAS: ${w}×${h}px horizontal leaderboard strip.
ZONES (strict): Left 0–190px: brand zone | Centre 190–540px: message zone | Right 540–718px: CTA zone
- Brand zone: bold business name, 20–24px, white, vertically centred. Add a small geometric accent shape (circle/diamond) in ${palette.accent} behind/beside the name.
- Message zone: punchy headline max 6 words, 16–18px bold white, y≈38. Optional subline 11px white/60 y≈58. Add subtle diagonal lines or dots pattern in ${palette.accent}/15% opacity.
- CTA zone: rounded rect button 155×40px centred in zone, fill ${palette.accent}, rx=6. Bold white CTA text "${palette.cta}" 13px centred. Add thin glow: filter drop-shadow 0 0 8px ${palette.accent}/50.
- Vertical accent divider at x=188: line stroke=${palette.accent} opacity=0.4 y1=8 y2=82.
- Full-width thin border: rect x=0.5 y=0.5 w=727 h=89 fill=none stroke=white stroke-opacity=0.08 stroke-width=1.`
  : `
CANVAS: ${w}×${h}px medium rectangle (MPU).
SECTIONS: Top 0–70px brand | Middle 70–175px hero | Bottom 175–250px CTA
- Background: rich gradient ${palette.bg} → darker variant. Add large abstract shape (blurred circle/hexagon) in ${palette.accent}/12% as depth element.
- Brand section: business name bold 22–26px white centred y≈44. Horizontal accent line below: x1=25 y1=65 x2=275 y2=65 stroke=${palette.accent} sw=2.5.
- Hero section: big bold headline 2 lines max, 24–28px white centred, lines at y≈105 and y≈135. Max 7 words. Add small decorative icon/badge in ${palette.accent} at 20% opacity as background texture.
- CTA section: prominent button rect x=60 y=184 w=180 h=44 fill=${palette.accent} rx=8. Drop-shadow filter. Bold white "${palette.cta}" 15px centred. Add small arrow → after text. Tiny "Ad" text bottom-right 8px white/25.`

  const prompt = `You are the world's best digital advertising designer with 20 years at top agencies (Wieden+Kennedy, BBDO, Ogilvy). Create a stunning, professional IAB display ad.

BUSINESS: "${businessName}" — ${sector} industry
MOOD & STYLE: ${palette.mood}${description ? ` | Client direction: ${description}` : ''}
COLOUR SYSTEM: Primary bg ${palette.bg}, Accent/CTA ${palette.accent}, Text ${palette.text}

${layoutSpec}

DESIGN RULES:
1. Background MUST be a rich linearGradient from ${palette.bg} to a 20% darker shade (id="bg", ${gradDir}).
2. Every zone must have visual depth — no flat empty areas.
3. Typography: font-family="'Arial Black', Arial, sans-serif" for headlines; "Arial, sans-serif" for body. NO external fonts.
4. Use ONLY SVG primitives: rect, circle, polygon, ellipse, path, line, text, defs, linearGradient, radialGradient, stop, filter, feDropShadow, feGaussianBlur, clipPath, use. NO images, NO foreignObject.
5. The headline must be relevant and compelling for ${sector} — create a real ad headline, not placeholder text.
6. Add at least 3 decorative elements (geometric shapes, patterns, gradients) to make it feel premium.

OUTPUT: Return ONLY the raw SVG — start with <svg and end with </svg>. No markdown, no explanation, no code fences.`

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { temperature: 0.7 },
  })

  const raw = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
  const match = raw.match(/<svg[\s\S]*<\/svg>/i)
  const svg = match ? match[0] : raw

  if (!svg.startsWith('<svg')) throw new Error('SVG generation failed')

  // Rasterise SVG → PNG at exact IAB dimensions
  const png = await sharp(Buffer.from(svg))
    .resize(w, h, { fit: 'fill' })
    .png()
    .toBuffer()

  return png
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
