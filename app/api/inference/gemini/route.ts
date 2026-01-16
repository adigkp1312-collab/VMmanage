import { NextRequest, NextResponse } from 'next/server'
import { sendGeminiMessage, ChatMessage } from '@/lib/gemini'

// POST /api/inference/gemini - Send message to Gemini
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

    const response = await sendGeminiMessage(validMessages, model)

    return NextResponse.json({ response })
  } catch (error) {
    console.error('Gemini API error:', error)

    if (error instanceof Error && error.message.includes('not configured')) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to get response from Gemini' },
      { status: 500 }
    )
  }
}
