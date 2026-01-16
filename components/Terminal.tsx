'use client'

import { useEffect, useRef, useCallback } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface TerminalProps {
  id: string
  onClose?: () => void
}

export default function Terminal({ id, onClose }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  const connect = useCallback(() => {
    if (!terminalRef.current) return

    // Create xterm instance
    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1a2e',
        foreground: '#eee',
        cursor: '#eee',
        cursorAccent: '#1a1a2e',
        selectionBackground: '#3d3d5c',
      },
    })

    const fitAddon = new FitAddon()
    xterm.loadAddon(fitAddon)

    xterm.open(terminalRef.current)
    fitAddon.fit()

    xtermRef.current = xterm
    fitAddonRef.current = fitAddon

    // Connect to WebSocket on separate terminal server port
    const ws = new WebSocket('ws://localhost:3002')
    wsRef.current = ws

    ws.onopen = () => {
      // Start the terminal session
      ws.send(JSON.stringify({
        type: 'start',
        cols: xterm.cols,
        rows: xterm.rows,
      }))
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'output') {
          xterm.write(msg.data)
        } else if (msg.type === 'ready') {
          // Silent ready - no message
        } else if (msg.type === 'exit') {
          xterm.write('\r\n')
        }
      } catch (e) {
        // Raw output
        xterm.write(event.data)
      }
    }

    ws.onclose = () => {}

    ws.onerror = () => {}

    // Send input to server
    xterm.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }))
      }
    })

    // Handle resize
    const handleResize = () => {
      fitAddon.fit()
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'resize',
          cols: xterm.cols,
          rows: xterm.rows,
        }))
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      ws.close()
      xterm.dispose()
    }
  }, [])

  useEffect(() => {
    const cleanup = connect()
    return () => cleanup?.()
  }, [connect])

  return (
    <div className="h-full bg-[#1a1a2e]">
      <div ref={terminalRef} className="h-full p-2" />
    </div>
  )
}
