'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function PaymentSuccessContent() {
  const params = useSearchParams()
  const amount = params.get('amount')
  const campaign = params.get('campaign')

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">

        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-white">Payment confirmed</h1>
          {amount && (
            <p className="text-3xl font-bold text-green-400">
              ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          )}
          {campaign && (
            <p className="text-sm text-white/40">for {decodeURIComponent(campaign)}</p>
          )}
        </div>

        {/* Message */}
        <p className="text-white/60 text-sm leading-relaxed">
          Your wallet has been funded. Return to Claude.ai and let the assistant know — it will confirm your payment and get your campaign ready to go.
        </p>

        {/* CTA */}
        <a
          href="https://claude.ai"
          className="inline-flex items-center gap-2 bg-white text-black font-medium px-6 py-3 rounded-lg hover:bg-white/90 transition-colors"
        >
          Return to Claude.ai
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </a>

        {/* Branding */}
        <p className="text-white/20 text-xs">AMP by Alkimi Exchange</p>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense>
      <PaymentSuccessContent />
    </Suspense>
  )
}
