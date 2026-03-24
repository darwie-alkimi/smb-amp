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

export async function generateCreativeSvg(
  businessName: string,
  iabCategory?: string,
  description?: string
): Promise<string> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const sector = iabCategory ? (IAB_TO_SECTOR[iabCategory] ?? 'business') : 'business'

  const prompt = `Create a professional digital advertising banner (SVG, 300x250 viewBox) for "${businessName}", a ${sector} business.
${description ? `Style notes: ${description}` : ''}
Requirements:
- viewBox="0 0 300 250", width="300", height="250"
- Include: business name prominently, a short compelling tagline, a CTA button (e.g. "Learn More", "Shop Now", "Get Started")
- Use a gradient background and a colour palette appropriate for the ${sector} industry
- Clean, modern design with good visual hierarchy — logo area, headline, subline, CTA
- All text must use font-family="Arial, sans-serif" and be clearly readable
- Use only SVG primitives: rect, circle, path, text, defs, linearGradient, stop

Return ONLY the SVG code starting with <svg and ending with </svg>. No explanation, no markdown fences.`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = message.content[0]?.type === 'text' ? message.content[0].text.trim() : ''

  // Strip markdown fences if Claude wrapped it
  const match = raw.match(/<svg[\s\S]*<\/svg>/i)
  const svg = match ? match[0] : raw

  if (!svg.startsWith('<svg')) {
    throw new Error('Creative generation failed — invalid SVG returned')
  }

  return svg
}
