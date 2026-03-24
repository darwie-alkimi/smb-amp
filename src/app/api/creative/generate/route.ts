import { generateCreativeSvg } from '@/lib/creative-generator'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { businessName, iabCategory, description } = await req.json()

    if (!businessName) {
      return Response.json({ error: 'businessName is required' }, { status: 400 })
    }

    const svg = await generateCreativeSvg(businessName, iabCategory, description)
    return Response.json({ svg })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    return Response.json({ error: message }, { status: 500 })
  }
}
