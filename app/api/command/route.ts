import { NextRequest, NextResponse } from 'next/server'
import { getVMConfigById, runCommand } from '@/lib/azure'

// POST /api/command - Run a command on a VM
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

    const output = await runCommand(config, command)

    return NextResponse.json({ output })
  } catch (error) {
    console.error('Command execution error:', error)
    return NextResponse.json(
      { error: 'Failed to execute command' },
      { status: 500 }
    )
  }
}
