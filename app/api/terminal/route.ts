import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'

// Store active SSH processes
const processes: Map<string, any> = new Map()

export async function POST(request: NextRequest) {
  const { action, sessionId, vmId, command, input } = await request.json()

  if (action === 'start') {
    // Get VM config
    const vms: Record<string, { host: string; user: string; key: string }> = {
      'vm-a': {
        host: process.env.VM_A_HOST || '',
        user: process.env.VM_A_USER || 'azureuser',
        key: process.env.VM_A_KEY || '',
      },
      'vm-b': {
        host: process.env.VM_B_HOST || '',
        user: process.env.VM_B_USER || 'azureuser',
        key: process.env.VM_B_KEY || '',
      },
    }

    const vm = vms[vmId]
    if (!vm || !vm.host || !vm.key) {
      return NextResponse.json({ error: 'VM not configured' }, { status: 400 })
    }

    const id = Math.random().toString(36).substring(7)

    // Start SSH process
    const sshProcess = spawn('ssh', [
      '-i', vm.key,
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ConnectTimeout=10',
      '-tt',
      `${vm.user}@${vm.host}`,
    ])

    processes.set(id, sshProcess)

    // Clean up on exit
    sshProcess.on('exit', () => {
      processes.delete(id)
    })

    return NextResponse.json({ sessionId: id })
  }

  if (action === 'input' && sessionId) {
    const proc = processes.get(sessionId)
    if (proc && proc.stdin) {
      proc.stdin.write(input)
      return NextResponse.json({ success: true })
    }
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  if (action === 'read' && sessionId) {
    const proc = processes.get(sessionId)
    if (!proc) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return new Promise((resolve) => {
      let output = ''
      const timeout = setTimeout(() => {
        resolve(NextResponse.json({ output }))
      }, 100)

      proc.stdout?.on('data', (data: Buffer) => {
        output += data.toString()
      })

      proc.stderr?.on('data', (data: Buffer) => {
        output += data.toString()
      })
    })
  }

  if (action === 'close' && sessionId) {
    const proc = processes.get(sessionId)
    if (proc) {
      proc.kill()
      processes.delete(sessionId)
    }
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
