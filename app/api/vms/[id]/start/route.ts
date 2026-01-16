import { NextRequest, NextResponse } from 'next/server'
import { getVMConfigById, startVM } from '@/lib/azure'

// POST /api/vms/[id]/start - Start a VM
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const config = getVMConfigById(id)

    if (!config) {
      return NextResponse.json(
        { error: 'VM not found' },
        { status: 404 }
      )
    }

    await startVM(config)

    return NextResponse.json({
      success: true,
      message: `VM ${config.name} started successfully`,
    })
  } catch (error) {
    console.error('Error starting VM:', error)
    return NextResponse.json(
      { error: 'Failed to start VM' },
      { status: 500 }
    )
  }
}
