import { NextRequest, NextResponse } from 'next/server'
import { sendClaudeMessage, ChatMessage } from '@/lib/claude'

// POST /api/inference/claude - Send message to Claude
export async function POST(request: NextRequest) {
  try {
    const { messages, model } = await request.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Validate message format
    const validMessages: ChatMessage[] = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: String(m.content),
    }))

    const response = await sendClaudeMessage(validMessages, model)

    return NextResponse.json({ response })
  } catch (error) {
    console.error('Claude API error:', error)

    if (error instanceof Error && error.message.includes('not configured')) {
      return NextResponse.json(
        { error: 'Claude API key not configured' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get response from Claude' },
      { status: 500 }
    )
  }
}
