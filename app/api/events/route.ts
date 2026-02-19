export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { BRIDGE_URL } from '@/lib/bridge'

const MAX_RETRIES = 5
const RETRY_DELAY_MS = 3000
const HEARTBEAT_INTERVAL_MS = 15000
const BRIDGE_CONNECT_TIMEOUT_MS = 3000

export async function GET(request: Request): Promise<Response> {
  const encoder = new TextEncoder()

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let retryCount = 0
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null
      let retryTimer: ReturnType<typeof setTimeout> | null = null
      let upstreamController: AbortController | null = null
      let aborted = false
      let closed = false

      const closeStream = (): void => {
        if (closed) {
          return
        }

        closed = true
        try {
          controller.close()
        } catch {
          // Stream may already be closed/cancelled.
        }
      }

      const cleanup = (): void => {
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer)
          heartbeatTimer = null
        }

        if (retryTimer) {
          clearTimeout(retryTimer)
          retryTimer = null
        }

        if (upstreamController) {
          upstreamController.abort()
          upstreamController = null
        }
      }

      const sendRaw = (payload: string): void => {
        if (aborted || closed) {
          return
        }

        try {
          controller.enqueue(encoder.encode(payload))
        } catch {
          aborted = true
          cleanup()
          closeStream()
        }
      }

      const sendEvent = (data: string): void => {
        sendRaw(`data: ${data}\n\n`)
      }

      const findDelimiter = (source: string): { index: number; length: number } | null => {
        const lfIndex = source.indexOf('\n\n')
        const crlfIndex = source.indexOf('\r\n\r\n')

        if (lfIndex === -1 && crlfIndex === -1) {
          return null
        }

        if (lfIndex === -1) {
          return { index: crlfIndex, length: 4 }
        }

        if (crlfIndex === -1) {
          return { index: lfIndex, length: 2 }
        }

        return lfIndex < crlfIndex
          ? { index: lfIndex, length: 2 }
          : { index: crlfIndex, length: 4 }
      }

      const waitForRetry = (): Promise<void> =>
        new Promise((resolve) => {
          retryTimer = setTimeout(() => {
            retryTimer = null
            resolve()
          }, RETRY_DELAY_MS)
        })

      const startHeartbeatFallback = (): void => {
        if (aborted || closed || heartbeatTimer) {
          return
        }

        const heartbeat = JSON.stringify({ type: 'heartbeat' })
        sendEvent(heartbeat)

        heartbeatTimer = setInterval(() => {
          if (aborted || closed) {
            if (heartbeatTimer) {
              clearInterval(heartbeatTimer)
              heartbeatTimer = null
            }
            return
          }

          sendEvent(heartbeat)
        }, HEARTBEAT_INTERVAL_MS)
      }

      const scheduleReconnectOrFallback = async (): Promise<boolean> => {
        if (aborted) {
          return false
        }

        if (retryCount >= MAX_RETRIES) {
          startHeartbeatFallback()
          return false
        }

        retryCount += 1
        await waitForRetry()

        return !aborted
      }

      const connectToBridge = async (): Promise<void> => {
        while (!aborted) {
          const headers: HeadersInit = {
            Accept: 'text/event-stream',
          }

          const lastEventId = request.headers.get('last-event-id')
          if (lastEventId) {
            headers['Last-Event-ID'] = lastEventId
          }

          upstreamController = new AbortController()
          const timeoutId = setTimeout(() => {
            upstreamController?.abort()
          }, BRIDGE_CONNECT_TIMEOUT_MS)

          const abortUpstream = (): void => {
            upstreamController?.abort()
          }
          request.signal.addEventListener('abort', abortUpstream)

          let response: Response | null = null

          try {
            response = await fetch(`${BRIDGE_URL}/api/events`, {
              signal: upstreamController.signal,
              headers,
              cache: 'no-store',
            })
          } catch {
            response = null
          } finally {
            clearTimeout(timeoutId)
            request.signal.removeEventListener('abort', abortUpstream)
            upstreamController = null
          }

          if (aborted) {
            return
          }

          if (!response || !response.ok) {
            const shouldRetry = await scheduleReconnectOrFallback()
            if (!shouldRetry) {
              return
            }
            continue
          }

          const contentType = response.headers.get('content-type')?.toLowerCase() ?? ''
          if (!contentType.includes('text/event-stream')) {
            startHeartbeatFallback()
            return
          }

          const reader = response.body?.getReader()
          if (!reader) {
            const shouldRetry = await scheduleReconnectOrFallback()
            if (!shouldRetry) {
              return
            }
            continue
          }

          retryCount = 0

          const decoder = new TextDecoder()
          let buffer = ''

          try {
            while (!aborted) {
              const { done, value } = await reader.read()
              if (done) {
                break
              }

              if (!value) {
                continue
              }

              buffer += decoder.decode(value, { stream: true })

              while (true) {
                const delimiter = findDelimiter(buffer)
                if (!delimiter) {
                  break
                }

                const end = delimiter.index + delimiter.length
                const completeEvent = buffer.slice(0, end)
                buffer = buffer.slice(end)
                sendRaw(completeEvent)
              }
            }

            buffer += decoder.decode()
          } catch {
            // Connection dropped; handled by retry/fallback flow below.
          } finally {
            try {
              reader.releaseLock()
            } catch {
              // Ignore release lock errors.
            }
          }

          if (aborted) {
            return
          }

          const shouldRetry = await scheduleReconnectOrFallback()
          if (!shouldRetry) {
            return
          }
        }
      }

      const onAbort = (): void => {
        aborted = true
        cleanup()
        closeStream()
      }

      request.signal.addEventListener('abort', onAbort, { once: true })

      void connectToBridge()
    },
    cancel() {
      // Request abort listener will handle full cleanup.
    },
  })

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
