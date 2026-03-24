import Anthropic from '@anthropic-ai/sdk'

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

interface SectorBrand {
  bg1: string
  bg2: string
  accent: string
  cta: string
}

// Sector-specific brand palettes — bg1→bg2 gradient, accent for CTA/highlights
const SECTOR_BRAND: Record<string, SectorBrand> = {
  IAB1:  { bg1: '#4a148c', bg2: '#1a0533', accent: '#ff6d00', cta: 'Watch Now'      },
  IAB2:  { bg1: '#1a1a2e', bg2: '#16213e', accent: '#e74c3c', cta: 'Book Test Drive' },
  IAB3:  { bg1: '#1a237e', bg2: '#0d1b5e', accent: '#ffd600', cta: 'Get a Quote'    },
  IAB5:  { bg1: '#1b5e20', bg2: '#0a3d0a', accent: '#ffca28', cta: 'Enrol Now'      },
  IAB6:  { bg1: '#1565c0', bg2: '#0d47a1', accent: '#ffd600', cta: 'Learn More'     },
  IAB7:  { bg1: '#00796b', bg2: '#004d40', accent: '#69f0ae', cta: 'Book Now'       },
  IAB8:  { bg1: '#bf360c', bg2: '#8d1a00', accent: '#ff9f43', cta: 'Order Now'      },
  IAB10: { bg1: '#4e342e', bg2: '#3e2723', accent: '#ff9800', cta: 'Shop Now'       },
  IAB11: { bg1: '#263238', bg2: '#102027', accent: '#80cbc4', cta: 'Contact Us'     },
  IAB13: { bg1: '#0f3460', bg2: '#1a1a2e', accent: '#c9a84c', cta: 'Get Started'    },
  IAB16: { bg1: '#e65100', bg2: '#bf360c', accent: '#ffcc02', cta: 'Shop Now'       },
  IAB17: { bg1: '#0d47a1', bg2: '#062880', accent: '#ff6f00', cta: 'Join Now'       },
  IAB18: { bg1: '#880e4f', bg2: '#4a148c', accent: '#f48fb1', cta: 'Shop Now'       },
  IAB19: { bg1: '#5c26ff', bg2: '#1a0533', accent: '#00b4d8', cta: 'Try Free'       },
  IAB20: { bg1: '#0077b6', bg2: '#023e8a', accent: '#90e0ef', cta: 'Explore Now'    },
  IAB21: { bg1: '#4a4a4a', bg2: '#1a1a1a', accent: '#c9a84c', cta: 'View Listings'  },
  IAB22: { bg1: '#c62828', bg2: '#880e0e', accent: '#ff6f00', cta: 'Shop Now'       },
}

const DEFAULT_BRAND: SectorBrand = {
  bg1: '#1a1a2e', bg2: '#0f0f23', accent: '#5c26ff', cta: 'Learn More',
}

export async function generateCreativeSvg(
  businessName: string,
  iabCategory?: string,
  description?: string,
  format: '300x250' | '728x90' = '300x250'
): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const sector = iabCategory ? (IAB_TO_SECTOR[iabCategory] ?? 'business') : 'business'
  const brand = (iabCategory && SECTOR_BRAND[iabCategory]) ? SECTOR_BRAND[iabCategory] : DEFAULT_BRAND
  const isLeaderboard = format === '728x90'
  const [w, h] = isLeaderboard ? [728, 90] : [300, 250]

  const gradientDir = isLeaderboard
    ? 'x1="0%" y1="0%" x2="100%" y2="0%"'
    : 'x1="0%" y1="0%" x2="0%" y2="100%"'

  const layoutGuide = isLeaderboard
    ? `LEADERBOARD (728×90 — single horizontal strip):
- Left zone x:0–185: Brand name in bold white, 22–26px, vertically centred at y=45.
  Add a small decorative accent rect or circle in ${brand.accent} beside/behind the name.
- Centre zone x:185–540: Main headline, max 7 words, 17–20px white bold, y=38.
  Optional short sub-line below, 11px, white 65% opacity, y=58.
- Right zone x:545–718: CTA button — rounded rect rx="5" filled ${brand.accent},
  approx 160×44px, horizontally and vertically centred in that zone.
  White bold CTA text "${brand.cta}", 14px, centred inside button.
- Thin accent divider line (x1=183,y1=10,x2=183,y2=80, stroke=${brand.accent}, opacity=0.3).
- Thin border: rect x=0 y=0 width=728 height=90 fill=none stroke=white stroke-opacity=0.1 stroke-width=1.`
    : `MEDIUM RECTANGLE (300×250 — vertical stack):
- Background: full-canvas gradient.
- Top band (y:0–65): business name centred, bold white 22–26px, y=42.
  Decorative horizontal accent line below name: x1=30,y1=62,x2=270,y2=62, stroke=${brand.accent}, stroke-width=2.
- Middle zone (y:65–175): large headline centred, 2 lines max, 26–30px bold white.
  First line y=105, second line y=138. Max 6 words total across both lines.
  Optional small geometric icon (circle or polygon) in ${brand.accent} at 20% opacity as background element.
- CTA zone (y:175–250): rounded rect button, width=180, height=44, centred (x=60,y=188), rx="6", fill=${brand.accent}.
  Bold white CTA text "${brand.cta}", 15px, centred in button.
  Tiny "advertisement" text at very bottom, 8px, white 30% opacity, y=244, centred.`

  const prompt = `You are a senior digital advertising designer. Create a polished IAB-standard display ad for "${businessName}", a ${sector} business.
${description ? `Creative direction: ${description}` : ''}

CANVAS: viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"

BRAND COLOURS — use exactly these, do not invent others:
  Background gradient: ${brand.bg1} → ${brand.bg2}  (gradient id="bg", ${gradientDir})
  Accent / CTA:        ${brand.accent}
  Primary text:        #ffffff

${layoutGuide}

ADDITIONAL RULES:
- Subtle depth: add one large shape (circle or polygon) in ${brand.accent} at 8–12% opacity as a background texture element.
- All text uses font-family="Arial, sans-serif". No external fonts.
- Use ONLY SVG primitives: rect, circle, polygon, ellipse, line, path, text, defs, linearGradient, stop, clipPath. No images, no filters, no foreignObject.
- Text must never overflow its zone. Keep headlines short and punchy.

OUTPUT: Return ONLY the SVG element, starting with <svg and ending with </svg>. No markdown fences, no explanation.`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''
  const match = raw.match(/<svg[\s\S]*<\/svg>/i)
  const svg = match ? match[0] : raw

  if (!svg.startsWith('<svg')) {
    throw new Error('Creative generation failed — invalid SVG returned')
  }

  return svg
}
