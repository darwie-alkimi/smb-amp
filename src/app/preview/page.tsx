'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

// ─── Mock publisher content ───────────────────────────────────────────────────

const ARTICLES = [
  {
    headline: 'Central Banks Signal Cautious Optimism as Markets Rally',
    byline: 'By Sarah Mitchell · Economics Editor',
    body: `Global equity markets surged on Wednesday after central bank officials hinted at a more gradual approach to monetary tightening, easing fears of an imminent recession. The S&P 500 climbed 1.4% while the FTSE 100 added 0.9%, with technology and consumer discretionary sectors leading gains.

Investors had been bracing for more hawkish signals, but policymakers struck a careful tone, pointing to resilient employment data and moderating inflation as reasons to proceed carefully. "We are data-dependent and will respond appropriately," said one official in prepared remarks.

Analysts warned that the optimism may prove short-lived if forthcoming inflation prints surprise to the upside. Bond markets reflected the uncertainty, with yields edging lower across the curve.`,
  },
  {
    headline: 'New Report Highlights Growth Opportunities for Local Businesses',
    byline: 'By James Okafor · Business Reporter',
    body: `A comprehensive survey of small and medium-sized businesses has found that digital advertising remains the most cost-effective channel for reaching new customers, with return on ad spend consistently outperforming traditional media across nearly every sector.

The findings, compiled from over 4,000 SME operators, showed that businesses investing in programmatic display and video advertising saw an average revenue uplift of 23% year-on-year, compared with 9% for those relying on print and outdoor.

Industry observers say the results reflect a permanent shift in consumer behaviour accelerated by the pandemic, with audiences now spending significantly more time with digital content across desktop and mobile devices.`,
  },
]

// ─── Ad slot components ───────────────────────────────────────────────────────

function AdSlot({
  width, height, creative, label,
}: {
  width: number; height: number; creative: string | null; label: string
}) {
  return (
    <div style={{ width, height }} className="relative flex-shrink-0 overflow-hidden bg-[#f0f0f0] border border-[#d0d0d0]">
      {creative ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={creative} alt="Advertisement" className="w-full h-full object-contain" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-[#aaa] text-[10px] uppercase tracking-widest gap-1">
          <span>Advertisement</span>
          <span className="text-[9px] text-[#ccc]">{width}×{height}</span>
        </div>
      )}
      <span className="absolute bottom-0 right-0 bg-[#00000022] text-[7px] text-white px-1 py-0.5 uppercase tracking-wider leading-none">
        {label}
      </span>
    </div>
  )
}

// ─── Preview page ─────────────────────────────────────────────────────────────

function PreviewContent() {
  const params = useSearchParams()
  const creative = params.get('creative') ? decodeURIComponent(params.get('creative')!) : null
  const campaignName = params.get('name') ? decodeURIComponent(params.get('name')!) : 'Campaign Preview'

  const article = ARTICLES[0]
  const sidebar = ARTICLES[1]

  return (
    <div className="min-h-screen bg-[#f4f4f0]" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: '#1a1a1a' }}>

      {/* AMP preview bar */}
      <div className="bg-[#1a1a2e] text-white text-[11px] px-4 py-1.5 flex items-center justify-between">
        <span className="text-white/50">AMP · Ad Preview</span>
        <span className="font-medium text-white/80 truncate max-w-[60%] text-right">{campaignName}</span>
      </div>

      {/* Publisher header */}
      <header className="bg-white border-b border-[#ddd]">
        <div className="max-w-[1080px] mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#888] mb-0.5">Est. 1842</p>
            <h1 className="text-3xl font-black tracking-tight leading-none" style={{ fontFamily: 'Georgia, serif' }}>
              The Tribune
            </h1>
          </div>
          <div className="text-right text-[11px] text-[#666]">
            <p>Tuesday, 24 March 2026</p>
            <p className="text-[#999]">London Edition</p>
          </div>
        </div>

        {/* Nav */}
        <div className="border-t border-[#111]">
          <div className="max-w-[1080px] mx-auto px-4">
            <nav className="flex gap-0 text-[12px] font-bold uppercase tracking-wider" style={{ fontFamily: 'Arial, sans-serif' }}>
              {['Home', 'UK News', 'World', 'Business', 'Tech', 'Sport', 'Culture', 'Opinion'].map((item, i) => (
                <span key={item} className={`px-3 py-2 cursor-default hover:bg-[#f4f4f0] ${i === 3 ? 'bg-[#1a1a2e] text-white' : 'text-[#1a1a1a]'}`}>
                  {item}
                </span>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Leaderboard ad (728×90) */}
      <div className="bg-white border-b border-[#ddd]">
        <div className="max-w-[1080px] mx-auto px-4 py-3 flex justify-center">
          <AdSlot width={728} height={90} creative={creative} label="Leaderboard 728×90" />
        </div>
      </div>

      {/* Section label */}
      <div className="max-w-[1080px] mx-auto px-4 pt-4 pb-1">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white bg-[#1a1a2e] px-2 py-0.5" style={{ fontFamily: 'Arial, sans-serif' }}>Business</span>
          <div className="flex-1 border-t border-[#1a1a2e]" />
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-[1080px] mx-auto px-4 py-4">
        <div className="flex gap-8">

          {/* Lead article */}
          <article className="flex-1 min-w-0">
            <h2 className="text-[28px] font-black leading-tight mb-2">{article.headline}</h2>
            <p className="text-[11px] text-[#888] mb-4 uppercase tracking-wider" style={{ fontFamily: 'Arial, sans-serif' }}>{article.byline}</p>

            {/* Image placeholder */}
            <div className="w-full h-48 bg-[#ddd] mb-4 flex items-center justify-center text-[#aaa] text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>
              <span>Photo: Reuters</span>
            </div>

            {article.body.split('\n\n').map((p, i) => (
              <p key={i} className="text-[15px] leading-[1.65] mb-4 text-[#222]">{p}</p>
            ))}

            {/* Inline ad — Half-page (300×250) below fold */}
            <div className="my-6 flex justify-center">
              <AdSlot width={300} height={250} creative={creative} label="Rectangle 300×250" />
            </div>

            {/* More body text below ad */}
            <p className="text-[15px] leading-[1.65] mb-4 text-[#222]">{sidebar.body.split('\n\n')[0]}</p>
          </article>

          {/* Sidebar */}
          <aside className="w-[300px] flex-shrink-0">

            {/* Sidebar ad */}
            <div className="mb-6">
              <AdSlot width={300} height={250} creative={creative} label="Rectangle 300×250" />
            </div>

            {/* Sidebar stories */}
            <div className="border-t-2 border-[#1a1a2e] pt-3 mb-4">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-3" style={{ fontFamily: 'Arial, sans-serif' }}>Most Read</p>
              {[
                'City firms warn of talent exodus amid remote-work crackdown',
                'Electric vehicle sales stall as subsidy schemes expire',
                'Retail sales beat forecasts for third consecutive month',
                'Tech layoffs continue as AI investment reshapes workforce',
              ].map((t, i) => (
                <div key={i} className="flex gap-2 mb-3 pb-3 border-b border-[#e8e8e0]">
                  <span className="text-[22px] font-black text-[#ddd] leading-none flex-shrink-0 w-7" style={{ fontFamily: 'Arial, sans-serif' }}>{i + 1}</span>
                  <p className="text-[13px] leading-snug font-bold">{t}</p>
                </div>
              ))}
            </div>

            {/* Sidebar article */}
            <div className="border-t-2 border-[#1a1a2e] pt-3">
              <p className="text-[10px] font-black uppercase tracking-[0.15em] mb-3" style={{ fontFamily: 'Arial, sans-serif' }}>Analysis</p>
              <h3 className="text-[16px] font-black leading-snug mb-2">{sidebar.headline}</h3>
              <p className="text-[13px] leading-relaxed text-[#444]">{sidebar.body.split('\n\n')[0].slice(0, 180)}…</p>
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-8 bg-[#1a1a2e] text-white/50 text-[11px] py-6" style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="max-w-[1080px] mx-auto px-4 flex justify-between items-center">
          <span className="font-black text-white/80 text-base" style={{ fontFamily: 'Georgia, serif' }}>The Tribune</span>
          <span>© 2026 Tribune Media Group · Mockup generated by AMP for preview purposes only</span>
        </div>
      </footer>
    </div>
  )
}

export default function PreviewPage() {
  return (
    <Suspense>
      <PreviewContent />
    </Suspense>
  )
}
