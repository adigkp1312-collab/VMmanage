import Anthropic from '@anthropic-ai/sdk'

let client: Anthropic | null = null

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured')
    }
    client = new Anthropic({ apiKey })
  }
  return client
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function sendClaudeMessage(
  messages: ChatMessage[],
  model: string = 'claude-sonnet-4-20250514'
): Promise<string> {
  const anthropic = getClient()

  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  })

  // Extract text from response
  const textBlock = response.content.find((block) => block.type === 'text')
  if (textBlock && textBlock.type === 'text') {
    return textBlock.text
  }

  return 'No response generated'
}

export async function streamClaudeMessage(
  messages: ChatMessage[],
  model: string = 'claude-sonnet-4-20250514',
  onChunk: (chunk: string) => void
): Promise<string> {
  const anthropic = getClient()

  const stream = await anthropic.messages.stream({
    model,
    max_tokens: 4096,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  })

  let fullResponse = ''

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      const text = event.delta.text
      fullResponse += text
      onChunk(text)
    }
  }

  return fullResponse
}
