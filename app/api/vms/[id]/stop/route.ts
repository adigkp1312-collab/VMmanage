import { NextRequest, NextResponse } from 'next/server'
import { getVMConfigById, stopVM } from '@/lib/azure'

// POST /api/vms/[id]/stop - Stop (deallocate) a VM
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

    await stopVM(config)

    return NextResponse.json({
      success: true,
      message: `VM ${config.name} stopped successfully`,
    })
  } catch (error) {
    console.error('Error stopping VM:', error)
    return NextResponse.json(
      { error: 'Failed to stop VM' },
      { status: 500 }
    )
  }
}
