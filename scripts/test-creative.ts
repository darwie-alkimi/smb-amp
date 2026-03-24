/**
 * End-to-end test for AI creative generation (both 728×90 and 300×250 formats).
 *
 * Run: npx tsx --tsconfig tsconfig.scripts.json scripts/test-creative.ts
 *
 * Requires ANTHROPIC_API_KEY in .env.local (loaded manually below).
 * BLOB_READ_WRITE_TOKEN is optional — skips upload/preview checks if absent.
 */

import * as fs from 'fs'
import * as path from 'path'

// ── Load .env.local ──────────────────────────────────────────────────────────
const envPath = path.resolve(__dirname, '../.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generateCreativeSvg } = require('../src/lib/creative-generator')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { handleToolCall } = require('../src/lib/mcp-server')

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

function svgDimensions(svg: string): { w: number; h: number } | null {
  const wm = svg.match(/width="(\d+)"/)
  const hm = svg.match(/height="(\d+)"/)
  if (!wm || !hm) return null
  return { w: parseInt(wm[1]), h: parseInt(hm[1]) }
}

void (async () => {
  // ── 1. SVG generation: 300×250 ───────────────────────────────────────────

  console.log('\n── Creative generator: 300×250 MPU ────────────────────────────')

  let svg300: string
  try {
    svg300 = await generateCreativeSvg('Mario\'s Pizzeria', 'IAB8', 'warm, welcoming, family', '300x250')
    const dims = svgDimensions(svg300)
    assert('returns valid SVG string',        svg300.startsWith('<svg'))
    assert('correct width (300)',             dims?.w === 300, `got ${dims?.w}`)
    assert('correct height (250)',            dims?.h === 250, `got ${dims?.h}`)
    assert('contains business name',          svg300.toLowerCase().includes("mario"))
    assert('contains gradient',              svg300.includes('linearGradient'))
    assert('contains a CTA button (rect)',    svg300.includes('<rect'))
    assert('contains text elements',          svg300.includes('<text'))
    assert('no external image refs',         !svg300.includes('<image') && !svg300.includes('href=') && !svg300.includes('xlink:href='))
    console.log(`     SVG size: ${(svg300.length / 1024).toFixed(1)} KB`)
  } catch (e) {
    console.error(`  ✗  300×250 generation threw: ${(e as Error).message}`)
    failed += 5
    svg300 = ''
  }

  // ── 2. SVG generation: 728×90 ────────────────────────────────────────────

  console.log('\n── Creative generator: 728×90 Leaderboard ──────────────────────')

  let svg728: string
  try {
    svg728 = await generateCreativeSvg('Mario\'s Pizzeria', 'IAB8', 'warm, welcoming, family', '728x90')
    const dims = svgDimensions(svg728)
    assert('returns valid SVG string',        svg728.startsWith('<svg'))
    assert('correct width (728)',             dims?.w === 728, `got ${dims?.w}`)
    assert('correct height (90)',             dims?.h === 90,  `got ${dims?.h}`)
    assert('contains business name',          svg728.toLowerCase().includes("mario"))
    assert('contains gradient',              svg728.includes('linearGradient'))
    assert('both formats differ',            svg728 !== svg300)
    console.log(`     SVG size: ${(svg728.length / 1024).toFixed(1)} KB`)
  } catch (e) {
    console.error(`  ✗  728×90 generation threw: ${(e as Error).message}`)
    failed += 4
    svg728 = ''
  }

  // ── 3. Sector-specific colour spot check ─────────────────────────────────

  console.log('\n── Sector colour spot check ────────────────────────────────────')

  try {
    const finSvg = await generateCreativeSvg('Apex Finance', 'IAB13', undefined, '300x250')
    assert('finance creative is valid SVG', finSvg.startsWith('<svg'))
    // Finance brand uses navy (#0f3460) — check gradient is present
    assert('finance SVG has gradient',     finSvg.includes('linearGradient'))
    // Gold accent (#c9a84c) should appear
    assert('finance SVG includes gold accent', finSvg.includes('#c9a84c') || finSvg.includes('c9a84c'))
  } catch (e) {
    console.error(`  ✗  Sector colour test threw: ${(e as Error).message}`)
    failed += 3
  }

  // ── 4. MCP generate_creative tool ────────────────────────────────────────

  console.log('\n── MCP: generate_creative tool (end-to-end) ────────────────────')

  const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN

  if (!hasBlobToken) {
    console.log('  ⚠  BLOB_READ_WRITE_TOKEN not set — skipping full MCP tool call (Vercel-only)')
  } else try {
    const result = await handleToolCall('generate_creative', {
      business_name: 'Mario\'s Pizzeria',
      iab_category:  'IAB8',
      description:   'warm and welcoming',
    })

    const content: Array<{ type: string; data?: string; mimeType?: string; text?: string }> = result?.content ?? []
    assert('result has content array',          Array.isArray(content))

    const imgContent = content.find((c) => c.type === 'image')
    assert('contains inline image (PNG)',        !!imgContent)
    assert('image is PNG mimeType',              imgContent?.mimeType === 'image/png')
    assert('image data is base64 string',        typeof imgContent?.data === 'string' && imgContent.data.length > 100)

    const txtContent = content.find((c) => c.type === 'text')
    assert('contains text content',              !!txtContent)

    let parsed: Record<string, string> = {}
    try {
      parsed = JSON.parse(txtContent?.text ?? '{}')
    } catch {
      assert('text content is valid JSON', false, txtContent?.text?.slice(0, 80))
    }

    assert('has creative_url field',             typeof parsed.creative_url === 'string')
    assert('has creative_url_leaderboard field', typeof parsed.creative_url_leaderboard === 'string')
    assert('has creative_url_mpu field',         typeof parsed.creative_url_mpu === 'string')
    assert('has publisher_preview_url field',    typeof parsed.publisher_preview_url === 'string')
    assert('preview URL contains leaderboard param', parsed.publisher_preview_url?.includes('leaderboard='))
    assert('preview URL contains creative param',    parsed.publisher_preview_url?.includes('creative='))
    assert('preview URL contains name param',        parsed.publisher_preview_url?.includes('name='))
    assert('has next_step instructions',         typeof parsed.next_step === 'string' && parsed.next_step.length > 20)

    if (hasBlobToken) {
      assert('creative_url is https',           parsed.creative_url?.startsWith('https://'))
      assert('leaderboard URL is https',        parsed.creative_url_leaderboard?.startsWith('https://'))
      assert('leaderboard URL contains 728x90', parsed.creative_url_leaderboard?.includes('728x90'))
      assert('mpu URL contains 300x250',        parsed.creative_url_mpu?.includes('300x250'))
    }

    console.log('\n  Preview URL:')
    console.log(`  ${parsed.publisher_preview_url}`)

  } catch (e) {
    console.error(`  ✗  generate_creative tool threw: ${(e as Error).message}`)
    failed += 8
  }
  // (end of MCP block)

  // ── Summary ───────────────────────────────────────────────────────────────

  console.log(`\n${'─'.repeat(54)}`)
  console.log(`  Results: ${passed} passed, ${failed} failed`)
  if (failed > 0) {
    console.error('\nSome tests failed.')
    process.exit(1)
  } else {
    console.log('\nAll tests passed.')
  }
})()
