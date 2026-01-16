import { GoogleGenerativeAI } from '@google/generative-ai'

let genAI: GoogleGenerativeAI | null = null

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY not configured')
    }
    genAI = new GoogleGenerativeAI(apiKey)
  }
  return genAI
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function sendGeminiMessage(
  messages: ChatMessage[],
  model: string = 'gemini-1.5-pro'
): Promise<string> {
  const client = getClient()
  const genModel = client.getGenerativeModel({ model })

  // Convert messages to Gemini format
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }))

  const lastMessage = messages[messages.length - 1]

  const chat = genModel.startChat({
    history: history as any,
  })

  const result = await chat.sendMessage(lastMessage.content)
  const response = await result.response
  return response.text()
}

export async function streamGeminiMessage(
  messages: ChatMessage[],
  model: string = 'gemini-1.5-pro',
  onChunk: (chunk: string) => void
): Promise<string> {
  const client = getClient()
  const genModel = client.getGenerativeModel({ model })

  // Convert messages to Gemini format
  const history = messages.slice(0, -1).map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }))

  const lastMessage = messages[messages.length - 1]

  const chat = genModel.startChat({
    history: history as any,
  })

  const result = await chat.sendMessageStream(lastMessage.content)

  let fullResponse = ''
  for await (const chunk of result.stream) {
    const text = chunk.text()
    fullResponse += text
    onChunk(text)
  }

  return fullResponse
}
