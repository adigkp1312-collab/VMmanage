import { ClientSecretCredential } from '@azure/identity'
import { ComputeManagementClient, VirtualMachine } from '@azure/arm-compute'

// VM Configuration from environment
export interface VMConfig {
  id: string
  name: string
  resourceGroup: string
  subscriptionId: string
  label: string
}

export function getVMConfigs(): VMConfig[] {
  return [
    {
      id: 'vm-a',
      name: process.env.VM_A_NAME || 'claude-vm',
      resourceGroup: process.env.VM_A_RESOURCE_GROUP || 'rg-a',
      subscriptionId: process.env.AZURE_SUBSCRIPTION_A || '',
      label: 'Claude VM (Account A)',
    },
    {
      id: 'vm-b',
      name: process.env.VM_B_NAME || 'gemini-vm',
      resourceGroup: process.env.VM_B_RESOURCE_GROUP || 'rg-b',
      subscriptionId: process.env.AZURE_SUBSCRIPTION_B || '',
      label: 'Gemini VM (Account B)',
    },
  ]
}

export function getVMConfigById(id: string): VMConfig | undefined {
  return getVMConfigs().find((vm) => vm.id === id)
}

// Create Azure credential
function getCredential(): ClientSecretCredential {
  const clientId = process.env.AZURE_CLIENT_ID
  const clientSecret = process.env.AZURE_CLIENT_SECRET
  const tenantId = process.env.AZURE_TENANT_ID

  if (!clientId || !clientSecret || !tenantId) {
    throw new Error('Azure credentials not configured')
  }

  return new ClientSecretCredential(tenantId, clientId, clientSecret)
}

// Get Compute client for a specific subscription
function getComputeClient(subscriptionId: string): ComputeManagementClient {
  const credential = getCredential()
  return new ComputeManagementClient(credential, subscriptionId)
}

export interface VMStatus {
  id: string
  name: string
  label: string
  resourceGroup: string
  subscriptionId: string
  powerState: string
  provisioningState: string
  publicIp?: string
  privateIp?: string
  vmSize?: string
  location?: string
}

// Get VM status with instance view
export async function getVMStatus(config: VMConfig): Promise<VMStatus> {
  const client = getComputeClient(config.subscriptionId)

  try {
    const vm = await client.virtualMachines.get(
      config.resourceGroup,
      config.name,
      { expand: 'instanceView' }
    )

    // Extract power state from instance view
    let powerState = 'Unknown'
    if (vm.instanceView?.statuses) {
      const powerStatus = vm.instanceView.statuses.find((s) =>
        s.code?.startsWith('PowerState/')
      )
      if (powerStatus?.code) {
        powerState = powerStatus.code.replace('PowerState/', '')
      }
    }

    // Extract provisioning state
    const provisioningState = vm.provisioningState || 'Unknown'

    return {
      id: config.id,
      name: config.name,
      label: config.label,
      resourceGroup: config.resourceGroup,
      subscriptionId: config.subscriptionId,
      powerState,
      provisioningState,
      vmSize: vm.hardwareProfile?.vmSize,
      location: vm.location,
    }
  } catch (error) {
    console.error(`Error getting VM status for ${config.name}:`, error)
    return {
      id: config.id,
      name: config.name,
      label: config.label,
      resourceGroup: config.resourceGroup,
      subscriptionId: config.subscriptionId,
      powerState: 'Error',
      provisioningState: 'Error',
    }
  }
}

// Get all VMs status
export async function getAllVMStatus(): Promise<VMStatus[]> {
  const configs = getVMConfigs()
  const statuses = await Promise.all(configs.map((config) => getVMStatus(config)))
  return statuses
}

// Start a VM
export async function startVM(config: VMConfig): Promise<void> {
  const client = getComputeClient(config.subscriptionId)
  await client.virtualMachines.beginStartAndWait(
    config.resourceGroup,
    config.name
  )
}

// Stop (deallocate) a VM
export async function stopVM(config: VMConfig): Promise<void> {
  const client = getComputeClient(config.subscriptionId)
  await client.virtualMachines.beginDeallocateAndWait(
    config.resourceGroup,
    config.name
  )
}

// Restart a VM
export async function restartVM(config: VMConfig): Promise<void> {
  const client = getComputeClient(config.subscriptionId)
  await client.virtualMachines.beginRestartAndWait(
    config.resourceGroup,
    config.name
  )
}

// Run a command on a VM
export async function runCommand(
  config: VMConfig,
  command: string
): Promise<string> {
  const client = getComputeClient(config.subscriptionId)

  const result = await client.virtualMachines.beginRunCommandAndWait(
    config.resourceGroup,
    config.name,
    {
      commandId: 'RunShellScript',
      script: [command],
    }
  )

  // Extract output from result
  if (result.value && result.value.length > 0) {
    const output = result.value
      .map((v) => v.message || '')
      .join('\n')
    return output
  }

  return 'Command executed successfully (no output)'
}
