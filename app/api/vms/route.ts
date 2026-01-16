import { NextResponse } from 'next/server'
import { getAllVMStatus, getVMConfigs } from '@/lib/azure'

// GET /api/vms - Get all VMs and their status
export async function GET() {
  try {
    // Check if Azure credentials are configured
    if (
      !process.env.AZURE_CLIENT_ID ||
      !process.env.AZURE_CLIENT_SECRET ||
      !process.env.AZURE_TENANT_ID
    ) {
      // Return mock data if not configured
      const configs = getVMConfigs()
      return NextResponse.json(
        configs.map((c) => ({
          ...c,
          powerState: 'NotConfigured',
          provisioningState: 'NotConfigured',
        }))
      )
    }

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
