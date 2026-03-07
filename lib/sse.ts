export interface SSEEvent {
  event: string;
  data: string;
}

export interface SSECallbacks {
  onEvent: (event: SSEEvent) => void;
}

export async function readSSEStream(
  response: Response,
  callbacks: SSECallbacks,
  signal?: AbortSignal
): Promise<void> {
  const body = response.body;
  if (!body) throw new Error('Response body is null');

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      if (signal?.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split('\n\n');
      // Last element is either empty or an incomplete event
      buffer = events.pop() ?? '';

      for (const raw of events) {
        if (!raw.trim()) continue;

        let event = 'message';
        let data = '';

        for (const line of raw.split('\n')) {
          if (line.startsWith('event: ')) {
            event = line.slice(7);
          } else if (line.startsWith('data: ')) {
            data = line.slice(6);
          }
        }

        callbacks.onEvent({ event, data });
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return; // Expected on cancellation
    }
    throw error;
  } finally {
    reader.releaseLock();
  }
}
