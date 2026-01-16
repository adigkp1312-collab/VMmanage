const { WebSocketServer } = require('ws')
const pty = require('node-pty')
const os = require('os')

const port = 3002

const wss = new WebSocketServer({ port })

console.log(`Terminal WebSocket server running on ws://localhost:${port}`)

wss.on('connection', (ws) => {
  console.log('New terminal connection')

  let ptyProcess = null

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString())

      if (data.type === 'start') {
        const shell = process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash'
        console.log(`Spawning shell: ${shell}`)

        ptyProcess = pty.spawn(shell, [], {
          name: 'xterm-256color',
          cols: data.cols || 80,
          rows: data.rows || 24,
          cwd: os.homedir(),
          env: {
            ...process.env,
            TERM: 'xterm-256color',
          },
        })

        console.log(`Started terminal with PID: ${ptyProcess.pid}`)

        ptyProcess.onData((output) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'output', data: output }))
          }
        })

        ptyProcess.onExit(({ exitCode }) => {
          console.log(`Terminal exited with code: ${exitCode}`)
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({ type: 'exit', code: exitCode }))
          }
        })

        ws.send(JSON.stringify({ type: 'ready' }))
      }

      if (data.type === 'input' && ptyProcess) {
        ptyProcess.write(data.data)
      }

      if (data.type === 'resize' && ptyProcess) {
        ptyProcess.resize(data.cols, data.rows)
      }
    } catch (err) {
      console.error('Error:', err)
      ws.send(JSON.stringify({ type: 'error', message: err.message }))
    }
  })

  ws.on('close', () => {
    console.log('Terminal connection closed')
    if (ptyProcess) {
      ptyProcess.kill()
    }
  })

  ws.on('error', (err) => {
    console.error('WebSocket error:', err)
    if (ptyProcess) {
      ptyProcess.kill()
    }
  })
})
