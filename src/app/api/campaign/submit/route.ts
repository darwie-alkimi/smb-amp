import { createBeeswaxDraft } from '@/lib/beeswax'
import type { CampaignState } from '@/lib/types'

export async function POST(req: Request) {
  try {
    const { campaignState }: { campaignState: CampaignState } = await req.json()

    const result = await createBeeswaxDraft(campaignState)

    return Response.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Submission failed'
    return Response.json({ success: false, error: message }, { status: 500 })
  }
}
