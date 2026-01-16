import { NextRequest, NextResponse } from 'next/server'
import { getVMConfigById, runSSHCommand } from '@/lib/ssh'

// POST /api/command - Run a command on a VM via SSH
export async function POST(request: NextRequest) {
  try {
    const { vmId, command } = await request.json()

    if (!vmId || !command) {
      return NextResponse.json(
        { error: 'vmId and command are required' },
        { status: 400 }
      )
    }

    const config = getVMConfigById(vmId)

    if (!config) {
      return NextResponse.json(
        { error: 'VM not found' },
        { status: 404 }
      )
    }

    // Basic command sanitization - block potentially dangerous commands
    const dangerousPatterns = [
      /rm\s+-rf\s+\//i,
      /mkfs/i,
      /dd\s+if=/i,
      />\s*\/dev\//i,
      /chmod\s+777\s+\//i,
    ]

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return NextResponse.json(
          { error: 'Command blocked for safety reasons' },
          { status: 400 }
        )
      }
    }

    const { stdout, stderr } = await runSSHCommand(config, command)
    const output = stdout || stderr || 'Command executed (no output)'

    return NextResponse.json({ output })
  } catch (error: any) {
    console.error('Command execution error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to execute command' },
      { status: 500 }
    )
  }
}
