// ─── Seeded PRNG ──────────────────────────────────────────────────────────────
// FNV-1a hash → 32-bit seed so same inputs always produce the same numbers.

function hashSeed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

function seededRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── IAB benchmarks ───────────────────────────────────────────────────────────

interface Benchmark { cpm: number; ctr: number; roas: number }

const BENCHMARKS: Record<string, Benchmark> = {
  IAB1:  { cpm: 4.00, ctr: 0.50, roas: 3.2 }, // Entertainment
  IAB2:  { cpm: 7.00, ctr: 0.18, roas: 2.1 }, // Automotive
  IAB3:  { cpm: 8.00, ctr: 0.10, roas: 2.2 }, // Business/B2B
  IAB5:  { cpm: 5.50, ctr: 0.22, roas: 2.7 }, // Education
  IAB6:  { cpm: 4.50, ctr: 0.30, roas: 3.0 }, // Family
  IAB7:  { cpm: 6.00, ctr: 0.28, roas: 3.5 }, // Health/Wellness
  IAB8:  { cpm: 4.50, ctr: 0.42, roas: 3.8 }, // Restaurant/Food
  IAB10: { cpm: 5.00, ctr: 0.25, roas: 2.8 }, // Home/Garden
  IAB11: { cpm: 7.50, ctr: 0.12, roas: 2.0 }, // Legal
  IAB13: { cpm: 9.00, ctr: 0.09, roas: 1.8 }, // Finance
  IAB16: { cpm: 4.20, ctr: 0.40, roas: 3.6 }, // Pets
  IAB17: { cpm: 4.80, ctr: 0.38, roas: 3.0 }, // Sports/Fitness
  IAB18: { cpm: 5.50, ctr: 0.32, roas: 4.5 }, // Beauty/Fashion
  IAB19: { cpm: 8.50, ctr: 0.12, roas: 4.2 }, // Technology/SaaS
  IAB20: { cpm: 6.80, ctr: 0.30, roas: 2.9 }, // Travel
  IAB21: { cpm: 7.50, ctr: 0.14, roas: 2.4 }, // Real Estate
  IAB22: { cpm: 5.20, ctr: 0.35, roas: 5.1 }, // Retail/E-commerce
}
const DEFAULT_BENCH: Benchmark = { cpm: 5.50, ctr: 0.25, roas: 3.0 }

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CampaignStats {
  spend: number
  impressions: number
  clicks: number
  ctr: number        // actual %, e.g. 0.38
  cpm: number
  roas: number
  budgetPct: number  // 0–100
  timelinePct: number
  dailySpend: number[] // 7 entries: [0] = 6 days ago, [6] = today
  budget: number
  iabCategory: string
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function getMockStats(params: {
  budget: string
  start_date: string
  end_date: string
  iab_category?: string
  campaign_id?: string
}): CampaignStats {
  const { budget, start_date, end_date, iab_category, campaign_id } = params

  const seedStr = campaign_id ?? (budget + start_date + end_date + (iab_category ?? ''))
  const rand = seededRand(hashSeed(seedStr))

  const bench = iab_category ? (BENCHMARKS[iab_category] ?? DEFAULT_BENCH) : DEFAULT_BENCH

  // ── Timeline ──
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(start_date)
  const end = new Date(end_date)
  const totalDays = Math.max(1, (end.getTime() - start.getTime()) / 86400000)
  const elapsed = Math.max(0, Math.min(totalDays, (today.getTime() - start.getTime()) / 86400000))
  const timelinePct = Math.round((elapsed / totalDays) * 100)

  // ── Spend ──
  const budgetNum = parseFloat(budget.replace(/[^0-9.]/g, '')) || 0
  const spendRatio = timelinePct === 0 ? 0 : Math.min(1, (timelinePct / 100) * (0.82 + rand() * 0.23))
  const spend = Math.round(budgetNum * spendRatio * 100) / 100
  const budgetPct = budgetNum > 0 ? Math.round((spend / budgetNum) * 100) : 0

  // ── Derived metrics (add ±20% variance via PRNG) ──
  const cpm = bench.cpm * (0.80 + rand() * 0.40)
  const ctr = bench.ctr * (0.80 + rand() * 0.40)
  const roas = bench.roas * (0.80 + rand() * 0.40)
  const impressions = spend > 0 ? Math.round((spend / cpm) * 1000) : 0
  const clicks = Math.round(impressions * (ctr / 100))
  const ctrActual = impressions > 0 ? (clicks / impressions) * 100 : 0

  // ── 7-day daily spend ──
  const rawDays = Array.from({ length: 7 }, () => rand())
  const rawSum = rawDays.reduce((a, b) => a + b, 0) || 1
  const dailySpend = rawDays.map((v, i) => {
    const dayOffset = 6 - i
    const dayDate = new Date(today)
    dayDate.setDate(today.getDate() - dayOffset)
    if (dayDate < start || dayDate > end || dayDate > today) return 0
    return Math.round((v / rawSum) * spend * 100) / 100
  })

  return {
    spend,
    impressions,
    clicks,
    ctr: Math.round(ctrActual * 100) / 100,
    cpm: Math.round(cpm * 100) / 100,
    roas: Math.round(roas * 10) / 10,
    budgetPct,
    timelinePct,
    dailySpend,
    budget: budgetNum,
    iabCategory: iab_category ?? 'general',
  }
}
