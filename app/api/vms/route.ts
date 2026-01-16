import { NextResponse } from 'next/server'
import { getAllVMStatus } from '@/lib/ssh'

// GET /api/vms - Get all VMs and their status via SSH
export async function GET() {
  try {
    const statuses = await getAllVMStatus()
    return NextResponse.json(statuses)
  } catch (error) {
    console.error('Error fetching VM status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch VM status' },
      { status: 500 }
    )
  }
}
