import { NextRequest, NextResponse } from 'next/server'
import { getVMConfigById, restartVM } from '@/lib/azure'

// POST /api/vms/[id]/restart - Restart a VM
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

    await restartVM(config)

    return NextResponse.json({
      success: true,
      message: `VM ${config.name} restarted successfully`,
    })
  } catch (error) {
    console.error('Error restarting VM:', error)
    return NextResponse.json(
      { error: 'Failed to restart VM' },
      { status: 500 }
    )
  }
}
