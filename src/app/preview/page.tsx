'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

// Telegraph brand colours
const T_BLUE = '#005689'
const T_DARK = '#1a1a1a'

// ─── Mock content ─────────────────────────────────────────────────────────────

const LEAD = {
  tag: 'EXCLUSIVE',
  headline: 'Bank of England holds rates as inflation falls to three-year low',
  standfirst: 'Governor signals potential for cuts in the second half of the year as wage growth cools faster than expected',
  byline: 'Ambrose Evans-Pritchard',
  role: 'Economics Editor',
  timestamp: '24 March 2026 • 9:41am',
  body: [
    'The Bank of England voted unanimously to hold interest rates at 4.75pc on Thursday, as a sharp fall in inflation to 2.1pc — its lowest since early 2023 — opened the door to reductions later in the year.',
    '"The direction of travel is clear," Governor Andrew Bailey said at a press conference, adding that the Monetary Policy Committee would "act decisively" once it was confident that price stability had been restored on a durable basis.',
    'Markets moved swiftly to price in two quarter-point cuts before year-end, sending sterling lower and pushing gilt yields to a six-month trough. The FTSE 100 gained 0.7pc as housebuilders and retailers led a broad-based rally.',
    'The decision is a relief for millions of mortgage holders facing remortgaging in the coming months. The average two-year fixed rate fell to 4.3pc this week, according to data provider Moneyfacts, down from a peak above 6pc in mid-2023.',
  ],
}

const SIDEBAR_STORIES = [
  { tag: 'POLITICS', headline: 'Sunak faces new Tory revolt over planning reform bill', time: '1h ago' },
  { tag: 'BUSINESS', headline: 'Rolls-Royce shares surge on record small modular reactor order', time: '2h ago' },
  { tag: 'MONEY', headline: 'Five ways to protect your savings as rate cuts loom', time: '3h ago' },
  { tag: 'WORLD', headline: 'Zelensky arrives in Washington for talks with Trump administration', time: '4h ago' },
]

const MOST_READ = [
  'The quiet village where house prices have doubled in a year',
  'Why the 4-day week experiment has quietly been shelved by most firms',
  'How to legally reduce your inheritance tax bill before the Budget',
  'The best new electric cars for under £30,000 in 2026',
  'Revealed: the UK\'s best and worst GP surgeries',
]

// ─── Ad slot ──────────────────────────────────────────────────────────────────

function AdSlot({ width, height, creative }: { width: number; height: number; creative: string | null }) {
  return (
    <div
      style={{ width, height, maxWidth: '100%' }}
      className="relative flex-shrink-0 overflow-hidden bg-[#f5f5f5] border border-[#e0e0e0]"
    >
      {creative ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={creative} alt="Advertisement" className="w-full h-full object-contain" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1" style={{ color: '#bbb', fontFamily: 'Arial, sans-serif' }}>
          <span className="text-[10px] uppercase tracking-widest">Advertisement</span>
          <span className="text-[9px]" style={{ color: '#ccc' }}>{width}×{height}</span>
        </div>
      )}
      <span
        className="absolute top-0 right-0 px-1 py-0.5 text-[7px] uppercase tracking-wider"
        style={{ background: 'rgba(0,0,0,0.12)', color: 'rgba(255,255,255,0.9)', fontFamily: 'Arial, sans-serif', lineHeight: 1 }}
      >
        Ad
      </span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function PreviewContent() {
  const params = useSearchParams()
  const creative = params.get('creative') ? decodeURIComponent(params.get('creative')!) : null
  const campaignName = params.get('name') ? decodeURIComponent(params.get('name')!) : 'Campaign Preview'

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: T_DARK }}>

      {/* AMP preview bar */}
      <div className="text-white text-[11px] px-4 py-1.5 flex items-center justify-between" style={{ background: T_BLUE, fontFamily: 'Arial, sans-serif' }}>
        <span className="opacity-70">AMP · Publisher Preview</span>
        <span className="font-semibold opacity-90 truncate max-w-[60%] text-right">{campaignName}</span>
      </div>

      {/* Top utility bar */}
      <div className="bg-[#f7f7f7] border-b border-[#e0e0e0] px-4 py-1" style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="max-w-[1200px] mx-auto flex items-center justify-between text-[11px] text-[#666]">
          <span>Tuesday 24 March 2026</span>
          <div className="flex items-center gap-4">
            <span className="cursor-default hover:underline">Sign in</span>
            <span
              className="px-3 py-0.5 text-white text-[11px] font-bold cursor-default"
              style={{ background: T_BLUE, fontFamily: 'Arial, sans-serif' }}
            >
              Subscribe
            </span>
          </div>
        </div>
      </div>

      {/* Masthead */}
      <header className="border-b-2 border-[#1a1a1a] px-4 py-3">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex-1" />
          <h1
            className="text-center leading-none tracking-[-0.02em]"
            style={{ fontFamily: '"Times New Roman", Georgia, serif', fontSize: '2.4rem', fontWeight: 700, letterSpacing: '-0.01em' }}
          >
            The Daily Telegraph
          </h1>
          <div className="flex-1 flex justify-end">
            <span className="text-[10px] text-[#888] text-right leading-tight" style={{ fontFamily: 'Arial, sans-serif' }}>
              Est. 1855<br />telegraph.co.uk
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="max-w-[1200px] mx-auto mt-2 flex border-t border-[#ddd] pt-1" style={{ fontFamily: 'Arial, sans-serif' }}>
          {['News', 'Opinion', 'Business', 'Money', 'Politics', 'Sport', 'Culture', 'Travel', 'Life'].map((item, i) => (
            <span
              key={item}
              className="px-3 py-1.5 text-[12px] font-bold cursor-default"
              style={{
                color: i === 2 ? 'white' : T_DARK,
                background: i === 2 ? T_BLUE : 'transparent',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              {item}
            </span>
          ))}
        </nav>
      </header>

      {/* Leaderboard ad (728×90) */}
      <div className="bg-[#f7f7f7] border-b border-[#e0e0e0] py-2">
        <div className="max-w-[1200px] mx-auto px-4 flex justify-center">
          <AdSlot width={728} height={90} creative={creative} />
        </div>
      </div>

      {/* Section label */}
      <div className="max-w-[1200px] mx-auto px-4 pt-4 pb-2">
        <div className="flex items-center gap-2" style={{ fontFamily: 'Arial, sans-serif' }}>
          <span
            className="text-[11px] font-black uppercase tracking-[0.12em] px-2 py-0.5 text-white"
            style={{ background: T_BLUE }}
          >
            Business
          </span>
          <div className="flex-1 border-t-2" style={{ borderColor: T_BLUE }} />
        </div>
      </div>

      {/* Body */}
      <main className="max-w-[1200px] mx-auto px-4 pb-10">
        <div className="flex gap-8">

          {/* Lead article */}
          <article className="flex-1 min-w-0 border-r border-[#e0e0e0] pr-8">
            {/* Tag */}
            <span
              className="text-[10px] font-black uppercase tracking-widest mb-2 inline-block"
              style={{ color: T_BLUE, fontFamily: 'Arial, sans-serif' }}
            >
              {LEAD.tag}
            </span>

            {/* Headline */}
            <h2
              className="text-[30px] font-bold leading-tight mb-3"
              style={{ fontFamily: '"Times New Roman", Georgia, serif' }}
            >
              {LEAD.headline}
            </h2>

            {/* Standfirst */}
            <p className="text-[16px] leading-snug mb-3" style={{ color: '#444', fontFamily: '"Times New Roman", Georgia, serif' }}>
              {LEAD.standfirst}
            </p>

            {/* Byline */}
            <div className="flex items-center gap-2 py-2 border-t border-b border-[#e0e0e0] mb-4" style={{ fontFamily: 'Arial, sans-serif' }}>
              <div>
                <p className="text-[12px] font-bold" style={{ color: T_BLUE }}>{LEAD.byline}</p>
                <p className="text-[11px]" style={{ color: '#888' }}>{LEAD.role} · {LEAD.timestamp}</p>
              </div>
            </div>

            {/* Photo */}
            <div className="w-full h-52 bg-[#e8e8e8] mb-4 flex items-end p-2" style={{ color: '#999', fontFamily: 'Arial, sans-serif' }}>
              <span className="text-[10px]">Photo: Getty Images / Bank of England, Threadneedle Street</span>
            </div>

            {/* Body paragraphs */}
            {LEAD.body.slice(0, 2).map((p, i) => (
              <p key={i} className="text-[15.5px] leading-[1.7] mb-4">{p}</p>
            ))}

            {/* Inline MPU */}
            <div className="float-right ml-6 mb-4">
              <AdSlot width={300} height={250} creative={creative} />
            </div>

            {LEAD.body.slice(2).map((p, i) => (
              <p key={i} className="text-[15.5px] leading-[1.7] mb-4">{p}</p>
            ))}

            <div className="clear-both" />
          </article>

          {/* Sidebar */}
          <aside className="w-[300px] flex-shrink-0" style={{ fontFamily: 'Arial, sans-serif' }}>

            {/* Sidebar MPU */}
            <div className="mb-5">
              <AdSlot width={300} height={250} creative={creative} />
            </div>

            {/* Latest stories */}
            <div className="border-t-2 mb-5 pt-2" style={{ borderColor: T_BLUE }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: T_BLUE }}>Latest</p>
              {SIDEBAR_STORIES.map((s, i) => (
                <div key={i} className="mb-3 pb-3 border-b border-[#eee]">
                  <span
                    className="text-[9px] font-black uppercase tracking-wider px-1 py-0.5 text-white inline-block mb-1"
                    style={{ background: T_BLUE }}
                  >
                    {s.tag}
                  </span>
                  <p className="text-[13px] font-bold leading-snug" style={{ fontFamily: '"Times New Roman", Georgia, serif', color: T_DARK }}>
                    {s.headline}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: '#999' }}>{s.time}</p>
                </div>
              ))}
            </div>

            {/* Most Read */}
            <div className="border-t-2 pt-2" style={{ borderColor: T_DARK }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-3">Most Read</p>
              {MOST_READ.map((t, i) => (
                <div key={i} className="flex gap-2 mb-3 pb-3 border-b border-[#eee]">
                  <span className="text-[20px] font-black flex-shrink-0 w-6 leading-none" style={{ color: '#ddd' }}>{i + 1}</span>
                  <p className="text-[12px] leading-snug font-bold" style={{ fontFamily: '"Times New Roman", Georgia, serif' }}>{t}</p>
                </div>
              ))}
            </div>
          </aside>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-[#1a1a1a] py-5 px-4" style={{ background: '#1a1a1a', fontFamily: 'Arial, sans-serif' }}>
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <span className="font-bold text-white text-[15px]" style={{ fontFamily: '"Times New Roman", Georgia, serif' }}>
            The Daily Telegraph
          </span>
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
            © 2026 Telegraph Media Group · Mockup generated by AMP for preview purposes only
          </span>
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
