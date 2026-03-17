export async function GET() {
  const apiUrl = process.env.BEESWAX_API_URL!
  const username = process.env.BEESWAX_USERNAME!
  const password = process.env.BEESWAX_PASSWORD!

  const authRes = await fetch(`${apiUrl}/rest/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: username, password, keep_logged_in: true }),
    cache: 'no-store',
  })
  let cookie = ''
  authRes.headers.forEach((v, k) => { if (k === 'set-cookie') cookie = v.split(';')[0] })

  // Check campaign 147 and advertiser 42
  const [campRes, advRes] = await Promise.all([
    fetch(`${apiUrl}/rest/campaign?campaign_id=147`, { headers: { Cookie: cookie }, cache: 'no-store' }),
    fetch(`${apiUrl}/rest/advertiser?advertiser_id=42`, { headers: { Cookie: cookie }, cache: 'no-store' }),
  ])

  return Response.json({
    campaign: (await campRes.json()).payload?.[0] ?? null,
    advertiser: (await advRes.json()).payload?.[0] ?? null,
  })
}
