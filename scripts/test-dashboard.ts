/**
 * End-to-end smoke tests for SS-04 dashboard feature.
 * Tests the mock-stats library and the MCP get_campaign_stats tool.
 *
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/test-dashboard.ts
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getMockStats } = require('../src/lib/mock-stats')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { handleToolCall, TOOLS } = require('../src/lib/mcp-server')

let passed = 0
let failed = 0

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✓  ${label}`)
    passed++
  } else {
    console.error(`  ✗  ${label}${detail ? ` — ${detail}` : ''}`)
    failed++
  }
}

void (async () => {
  // ─── 1. mock-stats: basic shape ──────────────────────────────────────────────

  console.log('\n── mock-stats: basic output shape ──────────────────────────')

  const s1 = getMockStats({ budget: '2000', start_date: '2026-01-01', end_date: '2026-12-31', iab_category: 'IAB8' })

  assert('returns spend number',       typeof s1.spend === 'number')
  assert('returns impressions number', typeof s1.impressions === 'number')
  assert('returns clicks number',      typeof s1.clicks === 'number')
  assert('returns ctr number',         typeof s1.ctr === 'number')
  assert('returns cpm number',         typeof s1.cpm === 'number')
  assert('returns roas number',        typeof s1.roas === 'number')
  assert('budgetPct in 0-100',         s1.budgetPct >= 0 && s1.budgetPct <= 100)
  assert('timelinePct in 0-100',       s1.timelinePct >= 0 && s1.timelinePct <= 100)
  assert('dailySpend has 7 entries',   s1.dailySpend.length === 7)
  assert('iabCategory echoed back',    s1.iabCategory === 'IAB8')

  // ─── 2. mock-stats: determinism ──────────────────────────────────────────────

  console.log('\n── mock-stats: determinism (same inputs → same outputs) ────')

  const s2a = getMockStats({ budget: '1500', start_date: '2026-03-01', end_date: '2026-06-30', iab_category: 'IAB19' })
  const s2b = getMockStats({ budget: '1500', start_date: '2026-03-01', end_date: '2026-06-30', iab_category: 'IAB19' })

  assert('spend identical',       s2a.spend === s2b.spend,       `${s2a.spend} vs ${s2b.spend}`)
  assert('impressions identical', s2a.impressions === s2b.impressions)
  assert('clicks identical',      s2a.clicks === s2b.clicks)
  assert('cpm identical',         s2a.cpm === s2b.cpm)
  assert('roas identical',        s2a.roas === s2b.roas)

  // ─── 3. mock-stats: future campaign (zero spend) ─────────────────────────────

  console.log('\n── mock-stats: future campaign (timelinePct = 0) ───────────')

  const future = getMockStats({ budget: '5000', start_date: '2030-01-01', end_date: '2030-12-31' })

  assert('spend is 0',             future.spend === 0,       String(future.spend))
  assert('impressions is 0',       future.impressions === 0, String(future.impressions))
  assert('clicks is 0',            future.clicks === 0,      String(future.clicks))
  assert('budgetPct is 0',         future.budgetPct === 0,   String(future.budgetPct))
  assert('timelinePct is 0',       future.timelinePct === 0, String(future.timelinePct))
  assert('all daily spends are 0', future.dailySpend.every((v: number) => v === 0))

  // ─── 4. mock-stats: IAB benchmark variance ───────────────────────────────────

  console.log('\n── mock-stats: IAB benchmarks produce category-specific values ──')

  const restaurant = getMockStats({ budget: '1000', start_date: '2025-01-01', end_date: '2025-12-31', iab_category: 'IAB8' })
  const finance    = getMockStats({ budget: '1000', start_date: '2025-01-01', end_date: '2025-12-31', iab_category: 'IAB13' })

  // IAB13 (finance) benchmark CPM = 9.00 vs IAB8 (restaurant) = 4.50
  assert('finance CPM > restaurant CPM', finance.cpm > restaurant.cpm,
    `finance=${finance.cpm.toFixed(2)} vs restaurant=${restaurant.cpm.toFixed(2)}`)
  // IAB8 CTR benchmark 0.42 vs IAB13 = 0.09
  assert('restaurant CTR > finance CTR', restaurant.ctr > finance.ctr,
    `restaurant=${restaurant.ctr.toFixed(2)} vs finance=${finance.ctr.toFixed(2)}`)

  // ─── 5. MCP: tool is registered ──────────────────────────────────────────────

  console.log('\n── MCP: get_campaign_stats tool is registered ───────────────')

  const statsTool = TOOLS.find((t: { name: string }) => t.name === 'get_campaign_stats')
  assert('tool exists in TOOLS array', !!statsTool)
  assert('requires budget',            statsTool?.inputSchema.required.includes('budget'))
  assert('requires start_date',        statsTool?.inputSchema.required.includes('start_date'))
  assert('requires end_date',          statsTool?.inputSchema.required.includes('end_date'))

  // ─── 6. MCP: handleToolCall returns markdown ─────────────────────────────────

  console.log('\n── MCP: handleToolCall returns formatted markdown ───────────')

  const result = await handleToolCall('get_campaign_stats', {
    budget:        '3000',
    start_date:    '2026-01-01',
    end_date:      '2026-12-31',
    iab_category:  'IAB8',
    campaign_name: 'Spring Pizza Promo',
  })

  const content = result?.content?.[0]
  assert('result has content array',     Array.isArray(result?.content))
  assert('content type is text',         content?.type === 'text')
  assert('text is a string',             typeof content?.text === 'string')

  const md: string = content?.text ?? ''
  assert('contains campaign name',       md.includes('Spring Pizza Promo'))
  assert('contains Key Metrics section', md.includes('Key Metrics'))
  assert('contains Budget Utilisation',  md.includes('Budget Utilisation'))
  assert('contains Timeline Progress',   md.includes('Timeline Progress'))
  assert('contains 7-Day Spend',         md.includes('7-Day Spend'))
  assert('contains simulated warning',   md.toLowerCase().includes('simulated'))
  assert('contains ROAS ×',             md.includes('×'))
  assert('contains CPM row',            md.includes('CPM'))

  // ─── 7. MCP: determinism across calls ────────────────────────────────────────

  console.log('\n── MCP: repeated calls produce identical output ─────────────')

  const r1 = await handleToolCall('get_campaign_stats', { budget: '500', start_date: '2026-02-01', end_date: '2026-04-30', iab_category: 'IAB22' })
  const r2 = await handleToolCall('get_campaign_stats', { budget: '500', start_date: '2026-02-01', end_date: '2026-04-30', iab_category: 'IAB22' })
  assert('identical output on repeat call', r1?.content[0].text === r2?.content[0].text)

  // ─── 8. MCP: unknown tool throws ─────────────────────────────────────────────

  console.log('\n── MCP: unknown tool still throws ──────────────────────────')

  try {
    await handleToolCall('totally_unknown_tool', {})
    assert('should have thrown', false)
  } catch (e) {
    assert('throws on unknown tool', (e as Error).message.includes('Unknown tool'))
  }

  // ─── Summary ─────────────────────────────────────────────────────────────────

  console.log(`\n${'─'.repeat(54)}`)
  console.log(`  Results: ${passed} passed, ${failed} failed`)
  if (failed > 0) {
    console.error('\nSome tests failed.')
    process.exit(1)
  } else {
    console.log('\nAll tests passed.')
  }
})()
