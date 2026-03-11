'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type {
  CampaignState,
  ChatMessage,
  UIPhase,
  StreamEvent,
  BeeswaxDraftResult,
} from '@/lib/types'
import { ALL_FIELDS, FIELD_LABELS } from '@/lib/types'

function uid() {
  return Math.random().toString(36).slice(2)
}

function formatFieldValue(field: string, value: string): string {
  if (field === 'budget') return `$${parseFloat(value).toLocaleString()}`
  return value
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({ state, phase }: { state: CampaignState; phase: UIPhase }) {
  const fields = ALL_FIELDS.map((f) => ({ key: f, label: FIELD_LABELS[f], value: state[f] }))
  const hasCreative = state.creative_uploaded

  return (
    <aside className="flex w-56 flex-shrink-0 flex-col border-r border-surface-border bg-surface">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-surface-border px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-xs font-bold text-white">
          A
        </div>
        <div>
          <p className="text-xs font-semibold text-white">AMP</p>
          <p className="text-[10px] text-white/40">by Alkimi Exchange</p>
        </div>
      </div>

      {/* Nav label */}
      <div className="px-4 pt-4 pb-1">
        <p className="text-[10px] font-medium uppercase tracking-widest text-white/30">
          Platform
        </p>
      </div>

      {/* Campaign section */}
      <div className="px-3 pb-1">
        <div className="flex items-center gap-2 rounded-md bg-surface-elevated px-2 py-1.5">
          <svg className="h-3.5 w-3.5 text-accent-light" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5z" />
          </svg>
          <span className="text-xs font-medium text-white">New Campaign</span>
        </div>
      </div>

      {/* Field progress list */}
      <nav className="flex-1 overflow-y-auto px-3 py-1">
        {fields.map(({ key, label, value }) => (
          <div
            key={key}
            className={`flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors ${
              value ? 'text-white/80' : 'text-white/30'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
                value ? 'bg-accent-light' : 'bg-white/15'
              }`}
            />
            <span className="truncate text-xs">{label}</span>
            {value && (
              <span className="ml-auto truncate text-[10px] text-white/40 max-w-[60px]">
                {formatFieldValue(key, value)}
              </span>
            )}
          </div>
        ))}
        <div
          className={`flex items-center gap-2 rounded-md px-2 py-1.5 ${
            hasCreative ? 'text-white/80' : 'text-white/30'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${
              hasCreative ? 'bg-accent-light' : 'bg-white/15'
            }`}
          />
          <span className="truncate text-xs">Creative</span>
          {state.creative_file_name && (
            <span className="ml-auto truncate text-[10px] text-white/40 max-w-[60px]">
              {state.creative_file_name}
            </span>
          )}
        </div>
      </nav>

      {/* Phase badge */}
      <div className="border-t border-surface-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
              phase === 'submitted'
                ? 'bg-green-500/15 text-green-400'
                : phase === 'reviewing'
                ? 'bg-blue-500/15 text-blue-400'
                : 'bg-accent/20 text-accent-light'
            }`}
          >
            {phase === 'submitted' ? 'Submitted' : phase === 'reviewing' ? 'Review' : 'Draft'}
          </span>
          <span className="text-[10px] text-white/30">
            {ALL_FIELDS.filter((f) => state[f]).length + (hasCreative ? 1 : 0)}/
            {ALL_FIELDS.length + 1} fields
          </span>
        </div>
      </div>
    </aside>
  )
}

// ─── Messages ─────────────────────────────────────────────────────────────────

function MessageBubble({ msg, isStreaming }: { msg: ChatMessage; isStreaming: boolean }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      {!isUser && (
        <div className="mr-2.5 mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
          A
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-accent text-white'
            : `bg-surface-elevated text-white/90 ring-1 ring-surface-border ${isStreaming ? 'cursor-blink' : ''}`
        }`}
        style={{ whiteSpace: 'pre-wrap' }}
      >
        {msg.content}
      </div>
    </div>
  )
}

// ─── File Upload ──────────────────────────────────────────────────────────────

function FileUploadWidget({ onUpload }: { onUpload: (file: File) => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = async (file: File) => {
    setError('')
    setUploading(true)
    try {
      await onUpload(file)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
      setUploading(false)
    }
  }

  return (
    <div className="mx-auto my-4 max-w-sm">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept="image/*,video/mp4,application/zip"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0])
        }}
        className={`cursor-pointer rounded-xl border border-dashed p-6 text-center transition-colors ${
          dragging
            ? 'border-accent bg-accent/10'
            : 'border-surface-border bg-surface-elevated hover:border-accent/50'
        }`}
      >
        <div className="mb-2 text-2xl">🖼️</div>
        <p className="text-sm font-medium text-white/80">
          {uploading ? 'Uploading…' : 'Upload your ad creative'}
        </p>
        <p className="mt-1 text-xs text-white/30">
          JPG, PNG, GIF, WebP, MP4, HTML5 ZIP · max 50 MB
        </p>
        <p className="mt-1 text-xs text-white/25">Drag & drop or click to browse</p>
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  )
}

// ─── Campaign Summary ─────────────────────────────────────────────────────────

function CampaignSummary({
  state, onConfirm, onEdit, submitting,
}: {
  state: CampaignState; onConfirm: () => void; onEdit: () => void; submitting: boolean
}) {
  const rows: [string, string][] = [
    ['Business Name', state.business_name ?? '—'],
    ['Email', state.business_email ?? '—'],
    ['Campaign Name', state.campaign_name ?? '—'],
    ['Start Date', state.start_date ?? '—'],
    ['End Date', state.end_date ?? '—'],
    ['Budget', state.budget ? `$${parseFloat(state.budget).toLocaleString()}` : '—'],
    ['Geography', state.geography ?? '—'],
    ['Business Sector', state.iab_category ?? '—'],
    ['Creative', state.creative_file_name ?? '—'],
  ]

  return (
    <div className="mx-auto max-w-md">
      <div className="overflow-hidden rounded-xl border border-surface-border bg-surface-elevated">
        <div className="border-b border-surface-border px-5 py-4">
          <p className="text-sm font-semibold text-white">Campaign Summary</p>
          <p className="text-xs text-white/40">Review before pushing to Beeswax</p>
        </div>
        <dl className="divide-y divide-surface-border px-5">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between py-2.5 text-xs">
              <dt className="text-white/40">{label}</dt>
              <dd className="font-medium text-white/90">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="flex gap-3 border-t border-surface-border px-5 py-4">
          <button
            onClick={onEdit}
            disabled={submitting}
            className="flex-1 rounded-lg border border-surface-border py-2 text-xs font-medium text-white/60 transition-colors hover:bg-surface-elevated disabled:opacity-40"
          >
            Edit
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 rounded-lg bg-accent py-2 text-xs font-medium text-white transition-colors hover:bg-accent-light disabled:opacity-50"
          >
            {submitting ? 'Creating draft…' : 'Create draft in Beeswax →'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Success ──────────────────────────────────────────────────────────────────

function SuccessScreen({ result, state }: { result: BeeswaxDraftResult; state: CampaignState }) {
  return (
    <div className="mx-auto max-w-sm text-center">
      <div className="mb-4 flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/15 text-2xl">
          ✓
        </div>
      </div>
      <p className="mb-1 text-base font-semibold text-white">You're all set!</p>
      <p className="mb-6 text-sm text-white/50">
        Your campaign has been submitted. Our team will review it and get it live shortly.
      </p>
      <div className="rounded-xl border border-surface-border bg-surface-elevated p-4 text-left space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/30 mb-0.5">Campaign</p>
          <p className="text-sm text-white/80">{state.campaign_name}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/30 mb-0.5">Business</p>
          <p className="text-sm text-white/80">{state.business_name}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/30 mb-0.5">Dates</p>
          <p className="text-sm text-white/80">{state.start_date} → {state.end_date}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-white/30 mb-0.5">Budget</p>
          <p className="text-sm text-white/80">
            ${parseFloat(state.budget ?? '0').toLocaleString()}
          </p>
        </div>
      </div>
      <p className="mt-5 text-xs text-white/30">
        A confirmation will be sent to <span className="text-white/50">{state.business_email}</span>
      </p>
      {result.mock && (
        <p className="mt-2 text-[10px] text-white/20">Demo mode — no real campaign was created</p>
      )}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [campaignState, setCampaignState] = useState<CampaignState>({})
  const [phase, setPhase] = useState<UIPhase>('chatting')
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingId, setStreamingId] = useState<string | null>(null)
  const [submitResult, setSubmitResult] = useState<BeeswaxDraftResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [started, setStarted] = useState(false)

  const chatBottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, phase])

  const buildApiMessages = (msgs: ChatMessage[]) =>
    msgs.map((m) => ({ role: m.role, content: m.content }))

  const sendMessage = useCallback(
    async (userText: string, extraState?: CampaignState) => {
      if (isLoading) return
      setIsLoading(true)

      const userMsg: ChatMessage = { id: uid(), role: 'user', content: userText }
      const assistantId = uid()
      const assistantMsg: ChatMessage = { id: assistantId, role: 'assistant', content: '' }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      setStreamingId(assistantId)

      const stateSoFar = extraState ?? campaignState

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...buildApiMessages(messages), { role: 'user', content: userText }],
            campaignState: stateSoFar,
          }),
        })

        if (!res.ok || !res.body) throw new Error('Chat request failed')

        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const raw = line.slice(6).trim()
            if (!raw) continue
            let event: StreamEvent
            try { event = JSON.parse(raw) } catch { continue }

            if (event.type === 'text' && event.delta) {
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: m.content + event.delta } : m)
              )
            } else if (event.type === 'field_saved' && event.field && event.value) {
              setCampaignState((prev) => ({ ...prev, [event.field!]: event.value }))
            } else if (event.type === 'state_update' && event.state) {
              setCampaignState(event.state)
            } else if (event.type === 'request_upload') {
              if (event.state) setCampaignState(event.state)
              setPhase('uploading')
            } else if (event.type === 'campaign_ready') {
              if (event.campaignData) setCampaignState(event.campaignData)
              setPhase('reviewing')
            } else if (event.type === 'error' && event.message) {
              setMessages((prev) =>
                prev.map((m) => m.id === assistantId ? { ...m, content: `⚠️ ${event.message}` } : m)
              )
            }
          }
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Something went wrong'
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: `⚠️ ${errMsg}` } : m)
        )
      } finally {
        setStreamingId(null)
        setIsLoading(false)
        inputRef.current?.focus()
      }
    },
    [messages, campaignState, isLoading]
  )

  const startConversation = useCallback(() => {
    setStarted(true)
    sendMessage("Let's get started!")
  }, [sendMessage])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    sendMessage(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleCreativeUpload = async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if (!res.ok || data.error) throw new Error(data.error ?? 'Upload failed')

    const newState: CampaignState = {
      ...campaignState,
      creative_file_name: data.fileName,
      creative_file_size: data.fileSize,
      creative_file_type: data.fileType,
      creative_uploaded: true,
    }
    setCampaignState(newState)
    setPhase('chatting')
    await sendMessage(`I've uploaded my creative: ${data.fileName}`, newState)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/campaign/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignState }),
      })
      const data: BeeswaxDraftResult = await res.json()
      setSubmitResult(data)
      setPhase('submitted')
    } catch { alert('Submission failed. Please try again.') }
    finally { setSubmitting(false) }
  }

  const handleEdit = () => {
    setPhase('chatting')
    sendMessage('I want to make some changes.')
  }

  // ─── Landing ────────────────────────────────────────────────────────────────

  if (!started) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0d0d0f]">
        <div className="w-full max-w-sm text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-lg font-bold text-white shadow-lg shadow-accent/30">
              A
            </div>
          </div>
          <h1 className="mb-1 text-xl font-semibold text-white">Campaign Setup</h1>
          <p className="mb-2 text-xs text-white/40">by Alkimi Exchange</p>
          <p className="mb-8 text-sm text-white/50">
            Answer a few questions and we'll create your campaign draft in Beeswax — no advertising experience needed.
          </p>
          <button
            onClick={startConversation}
            className="rounded-xl bg-accent px-8 py-2.5 text-sm font-medium text-white shadow-md shadow-accent/30 transition-all hover:bg-accent-light hover:shadow-accent/40"
          >
            + New Campaign
          </button>
        </div>
      </div>
    )
  }

  // ─── App shell ──────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full bg-[#0d0d0f]">
      {/* Sidebar */}
      <Sidebar state={campaignState} phase={phase} />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 border-b border-surface-border px-6 py-3">
          <span className="text-xs text-white/30">Campaigns</span>
          <span className="text-xs text-white/20">›</span>
          <span className="text-xs text-white/30">New Campaign</span>
          <span className="text-xs text-white/20">›</span>
          <span className="text-xs text-white/70">Setup</span>
          {isLoading && (
            <span className="ml-auto text-[10px] text-white/30 animate-pulse">typing…</span>
          )}
        </div>

        {/* Messages */}
        <div className="chat-scroll flex-1 overflow-y-auto px-6 py-6">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              isStreaming={msg.id === streamingId && msg.role === 'assistant'}
            />
          ))}

          {phase === 'uploading' && (
            <FileUploadWidget onUpload={handleCreativeUpload} />
          )}

          {phase === 'reviewing' && (
            <div className="py-2">
              <CampaignSummary
                state={campaignState}
                onConfirm={handleSubmit}
                onEdit={handleEdit}
                submitting={submitting}
              />
            </div>
          )}

          {phase === 'submitted' && submitResult && (
            <div className="py-6">
              <SuccessScreen result={submitResult} state={campaignState} />
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Input — "Ask anything" style */}
        {phase === 'chatting' && (
          <div className="px-6 pb-5">
            <div className="flex items-end gap-2 rounded-xl border border-surface-border bg-surface-elevated px-4 py-3 transition-colors focus-within:border-accent/40">
              {/* Attach icon */}
              <button className="mb-0.5 flex-shrink-0 text-white/20 hover:text-white/50 transition-colors">
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                </svg>
              </button>

              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything…"
                disabled={isLoading}
                className="flex-1 resize-none bg-transparent text-sm text-white/90 placeholder-white/20 outline-none disabled:opacity-40"
                style={{ maxHeight: 120 }}
              />

              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="mb-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-accent text-white transition-all hover:bg-accent-light disabled:opacity-30"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 rotate-90">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
