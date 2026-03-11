import Anthropic from '@anthropic-ai/sdk'
import { SYSTEM_PROMPT, TOOLS } from '@/lib/campaign-config'
import type { CampaignState, StreamEvent } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const incomingMessages: Anthropic.MessageParam[] = body.messages ?? []
    const incomingState: CampaignState = body.campaignState ?? {}

    const encoder = new TextEncoder()
    let updatedState: CampaignState = { ...incomingState }

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: StreamEvent) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          )
        }

        try {
          let localMessages: Anthropic.MessageParam[] = [...incomingMessages]

          // Agentic loop — continues until Claude stops calling tools or a
          // "stop" tool is reached (request_file_upload / campaign_ready)
          while (true) {
            const assistantContent: Anthropic.ContentBlock[] = []
            let inputBuffer = ''
            let currentBlockIdx = -1
            let stopSignal: 'request_upload' | 'campaign_ready' | null = null

            // Stream this turn
            const claudeStream = anthropic.messages.stream({
              model: 'claude-opus-4-6',
              max_tokens: 2048,
              system: SYSTEM_PROMPT,
              tools: TOOLS,
              messages: localMessages,
            })

            for await (const event of claudeStream) {
              if (event.type === 'content_block_start') {
                currentBlockIdx++
                inputBuffer = ''

                if (event.content_block.type === 'text') {
                  assistantContent.push({ type: 'text', text: '', citations: [] } as unknown as Anthropic.ContentBlock)
                } else if (event.content_block.type === 'tool_use') {
                  assistantContent.push({
                    type: 'tool_use',
                    id: event.content_block.id,
                    name: event.content_block.name,
                    input: {},
                  } as Anthropic.ToolUseBlock)
                } else if (event.content_block.type === 'thinking') {
                  // skip thinking blocks — don't surface to user
                  assistantContent.push({
                    type: 'thinking',
                    thinking: '',
                    signature: '',
                  } as unknown as Anthropic.ContentBlock)
                }
              } else if (event.type === 'content_block_delta') {
                const block = assistantContent[currentBlockIdx]
                if (
                  event.delta.type === 'text_delta' &&
                  block?.type === 'text'
                ) {
                  ;(block as Anthropic.TextBlock).text += event.delta.text
                  send({ type: 'text', delta: event.delta.text })
                } else if (event.delta.type === 'input_json_delta') {
                  inputBuffer += event.delta.partial_json
                }
              } else if (event.type === 'content_block_stop') {
                const block = assistantContent[currentBlockIdx]
                if (block?.type === 'tool_use') {
                  try {
                    ;(block as Anthropic.ToolUseBlock).input = JSON.parse(
                      inputBuffer || '{}'
                    )
                  } catch {
                    // malformed JSON — leave input as {}
                  }
                  inputBuffer = ''
                }
              }
            }

            const finalMsg = await claudeStream.finalMessage()
            localMessages.push({ role: 'assistant', content: assistantContent })

            // Collect tool use blocks
            const toolUseBlocks = assistantContent.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
            )

            if (toolUseBlocks.length === 0) {
              // No tools used — Claude is asking a question or finished
              send({ type: 'state_update', state: updatedState })
              send({ type: 'done' })
              break
            }

            // Process each tool call
            const toolResults: Anthropic.ToolResultBlockParam[] = []

            for (const tool of toolUseBlocks) {
              let result = ''

              if (tool.name === 'save_field') {
                const { field, value } = tool.input as {
                  field: string
                  value: string
                }
                updatedState = { ...updatedState, [field]: value }
                result = `Saved ${field}: ${value}`
                send({ type: 'field_saved', field, value })
              } else if (tool.name === 'request_file_upload') {
                stopSignal = 'request_upload'
                result = 'File upload request noted'
              } else if (tool.name === 'campaign_ready') {
                stopSignal = 'campaign_ready'
                result = 'Campaign ready for review'
              }

              toolResults.push({
                type: 'tool_result',
                tool_use_id: tool.id,
                content: result,
              })
            }

            // Always push tool results so Claude can continue
            localMessages.push({ role: 'user', content: toolResults })

            if (stopSignal === 'request_upload') {
              // Let Claude say something about the upload first (it may have
              // text blocks in this turn), then signal the frontend
              send({ type: 'request_upload', state: updatedState })
              send({ type: 'state_update', state: updatedState })
              send({ type: 'done' })
              break
            }

            if (stopSignal === 'campaign_ready') {
              send({ type: 'campaign_ready', campaignData: updatedState })
              send({ type: 'state_update', state: updatedState })
              send({ type: 'done' })
              break
            }

            // If stop_reason is end_turn with no stop signal, Claude is done
            if (finalMsg.stop_reason === 'end_turn') {
              send({ type: 'state_update', state: updatedState })
              send({ type: 'done' })
              break
            }
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'An unexpected error occurred'
          send({ type: 'error', message })
          send({ type: 'done' })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bad request'
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
