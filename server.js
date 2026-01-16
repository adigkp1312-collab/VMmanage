const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { WebSocketServer } = require('ws')
const pty = require('node-pty')
const os = require('os')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3001', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error:', err)
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  })

  // WebSocket server - don't attach to HTTP server, use noServer mode
  const wss = new WebSocketServer({ noServer: true })

  // Handle upgrade requests manually
  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url)

    if (pathname === '/ws/terminal') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request)
      })
    } else {
      // Let Next.js handle other upgrade requests (HMR)
      socket.destroy()
    }
  })

  wss.on('connection', (ws) => {
    console.log('New terminal connection')

    let ptyProcess = null

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString())

        if (data.type === 'start') {
          // Determine shell - use zsh on macOS if available, otherwise bash
          let shell = '/bin/bash'
          if (process.platform === 'darwin') {
            shell = '/bin/zsh'
          } else if (process.platform === 'win32') {
            shell = 'powershell.exe'
          }

          console.log(`Spawning shell: ${shell}`)

          try {
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
          } catch (spawnErr) {
            console.error('Failed to spawn terminal:', spawnErr)
            ws.send(JSON.stringify({
              type: 'error',
              message: `Failed to start terminal: ${spawnErr.message}`
            }))
          }
        }

        if (data.type === 'input' && ptyProcess) {
          ptyProcess.write(data.data)
        }

        if (data.type === 'resize' && ptyProcess) {
          ptyProcess.resize(data.cols, data.rows)
        }
      } catch (err) {
        console.error('WebSocket message error:', err)
        ws.send(JSON.stringify({ type: 'error', message: err.message }))
      }
    })

    ws.on('close', () => {
      console.log('Terminal connection closed')
      if (ptyProcess) {
        ptyProcess.kill()
        ptyProcess = null
      }
    })

    ws.on('error', (err) => {
      console.error('WebSocket error:', err)
      if (ptyProcess) {
        ptyProcess.kill()
        ptyProcess = null
      }
    })
  })

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> WebSocket terminal at ws://${hostname}:${port}/ws/terminal`)
  })
})
