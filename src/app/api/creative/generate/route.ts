import { generateCreativeImage } from '@/lib/creative-generator'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const { businessName, iabCategory, description, format } = await req.json()

    if (!businessName) {
      return Response.json({ error: 'businessName is required' }, { status: 400 })
    }

    const pngBuffer = await generateCreativeImage(businessName, iabCategory, description, format ?? '300x250')
    const png = pngBuffer.toString('base64')
    return Response.json({ png })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Generation failed'
    return Response.json({ error: message }, { status: 500 })
  }
}
