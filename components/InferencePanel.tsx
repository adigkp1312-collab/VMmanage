'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  model?: 'claude' | 'gemini'
  timestamp: Date
}

export default function InferencePanel() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedModel, setSelectedModel] = useState<'claude' | 'gemini' | 'both'>('claude')
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError(null)

    const modelsToCall = selectedModel === 'both' ? ['claude', 'gemini'] : [selectedModel]

    try {
      const messageHistory = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const responses = await Promise.all(
        modelsToCall.map(async (model) => {
          const response = await fetch(`/api/inference/${model}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: messageHistory }),
          })

          if (!response.ok) {
            const data = await response.json()
            throw new Error(`${model}: ${data.error || 'Failed to get response'}`)
          }

          const data = await response.json()
          return { model, content: data.response }
        })
      )

      responses.forEach(({ model, content }) => {
        const assistantMessage: Message = {
          id: `${Date.now()}-${model}`,
          role: 'assistant',
          content,
          model: model as 'claude' | 'gemini',
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
    setError(null)
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg flex flex-col h-[600px]">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">AI Inference</h3>
          <div className="flex items-center gap-4">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as 'claude' | 'gemini' | 'both')}
              className="bg-gray-700 text-white px-3 py-1 rounded text-sm border border-gray-600"
            >
              <option value="claude">Claude</option>
              <option value="gemini">Gemini</option>
              <option value="both">Both (Compare)</option>
            </select>
            <button
              onClick={clearChat}
              className="text-sm text-gray-400 hover:text-white"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-8">
            <p>Send a message to start a conversation</p>
            <p className="text-sm mt-2">
              Select a model above or use &quot;Both&quot; to compare responses
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.model === 'claude'
                  ? 'bg-orange-900/50 text-gray-100'
                  : 'bg-blue-900/50 text-gray-100'
              }`}
            >
              {message.role === 'assistant' && message.model && (
                <div className="text-xs text-gray-400 mb-1 font-medium">
                  {message.model === 'claude' ? 'Claude' : 'Gemini'}
                </div>
              )}
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 rounded-lg p-3 text-gray-300">
              <div className="flex items-center gap-2">
                <div className="animate-pulse">Thinking...</div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-2 rounded">
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={2}
            className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
