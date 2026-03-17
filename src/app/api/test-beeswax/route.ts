import { createBeeswaxDraft } from '@/lib/beeswax'

export async function GET() {
  const result = await createBeeswaxDraft({
    business_name: 'Alkimi Test Spring',
    contact_name: 'Test User',
    campaign_name: 'Alkimi Test Spring Campaign',
    start_date: '2026-04-01',
    end_date: '2026-04-30',
    budget: '1000',
    geography: 'United States',
    iab_category: 'IAB19',
    creative_uploaded: true,
    creative_file_name: 'test.jpg',
  })
  return Response.json(result)
}
