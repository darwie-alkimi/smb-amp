/**
 * MCP endpoint — Streamable HTTP transport (POST) + SSE endpoint (GET).
 *
 * Claude.ai and Claude Code use the Streamable HTTP transport:
 *   POST /api/mcp  — send JSON-RPC 2.0 messages, receive JSON responses
 *
 * Older SSE transport (backwards-compat):
 *   GET  /api/mcp  — receive `endpoint` event then POST messages
 */

import { NextRequest } from 'next/server'
import { TOOLS, SERVER_INFO, PROTOCOL_VERSION, handleToolCall } from '@/lib/mcp-server'

// Node.js runtime required for Buffer (used in creative URL fetching)
export const runtime = 'nodejs'

// ─── JSON-RPC helpers ─────────────────────────────────────────────────────────

interface JsonRpcMessage {
  jsonrpc: '2.0'
  id?: string | number | null
  method: string
  params?: unknown
}

function ok(id: string | number | null | undefined, result: unknown) {
  return { jsonrpc: '2.0', id: id ?? null, result }
}

function rpcError(id: string | number | null | undefined, code: number, message: string) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } }
}

// ─── Message dispatcher ───────────────────────────────────────────────────────

async function dispatch(msg: JsonRpcMessage) {
  // Notifications (no `id`) require no response
  if (!('id' in msg)) return null

  const { id, method, params } = msg
  const p = (params ?? {}) as Record<string, unknown>

  try {
    switch (method) {
      case 'initialize':
        return ok(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        })

      case 'ping':
        return ok(id, {})

      case 'tools/list':
        return ok(id, { tools: TOOLS })

      case 'tools/call': {
        const name = p.name as string
        const args = (p.arguments ?? {}) as Record<string, unknown>
        const result = await handleToolCall(name, args)
        return ok(id, result)
      }

      default:
        return rpcError(id, -32601, `Method not found: ${method}`)
    }
  } catch (e) {
    return rpcError(id, -32603, e instanceof Error ? e.message : 'Internal error')
  }
}

// ─── POST — Streamable HTTP transport (primary) ───────────────────────────────

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      rpcError(null, -32700, 'Parse error'),
      { status: 400 }
    )
  }

  if (Array.isArray(body)) {
    // Batch request
    const responses = (await Promise.all(body.map(dispatch))).filter(Boolean)
    return Response.json(responses)
  }

  const response = await dispatch(body as JsonRpcMessage)
  if (response === null) return new Response(null, { status: 202 })
  return Response.json(response)
}

// ─── GET — SSE transport (backwards compat) ───────────────────────────────────

export async function GET(request: NextRequest) {
  const postPath = new URL('/api/mcp', request.url).pathname
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      // Send the `endpoint` event that SSE-transport clients expect
      controller.enqueue(encoder.encode(`event: endpoint\ndata: ${postPath}\n\n`))
      // Serverless functions can't hold connections open — client will POST
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
    },
  })
}

// ─── OPTIONS — CORS preflight ─────────────────────────────────────────────────

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id',
    },
  })
}
