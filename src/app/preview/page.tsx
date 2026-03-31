'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function PreviewContent() {
  const params = useSearchParams()
  const screenshotUrl = params.get('screenshot')
  const name = params.get('name') ?? 'Campaign'

  // Legacy params — fallback if no AdVision screenshot
  const leaderboard = params.get('leaderboard')
  const creative = params.get('creative')

  return (
    <div className="min-h-screen bg-[#0d0d0f]">
      {/* AMP preview bar */}
      <div className="bg-[#0d0d0f] border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-white/10 flex items-center justify-center">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <span className="text-white/60 text-sm">AMP Creative Preview</span>
          <span className="text-white/20 text-sm">—</span>
          <span className="text-white text-sm font-medium">{decodeURIComponent(name)}</span>
        </div>
        <span className="text-white/30 text-xs">Alkimi Exchange</span>
      </div>

      {screenshotUrl ? (
        // AdVision live publisher screenshot
        <div className="flex flex-col items-center">
          <div className="w-full max-w-5xl px-4 py-6">
            <p className="text-white/40 text-xs mb-3 text-center">
              Creative shown on a live premium publisher page
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={screenshotUrl}
              alt={`${name} — publisher preview`}
              className="w-full rounded-lg shadow-2xl border border-white/10"
            />
          </div>
        </div>
      ) : (leaderboard || creative) ? (
        // Legacy fallback — show raw creative images
        <div className="flex flex-col items-center gap-8 p-8">
          {leaderboard && (
            <div>
              <p className="text-white/40 text-xs mb-2 text-center">728×90 Leaderboard</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={leaderboard} alt="Leaderboard creative" className="rounded border border-white/10" />
            </div>
          )}
          {creative && (
            <div>
              <p className="text-white/40 text-xs mb-2 text-center">300×250 MPU</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={creative} alt="MPU creative" className="rounded border border-white/10" />
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center h-64">
          <p className="text-white/40">No preview available</p>
        </div>
      )}
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
