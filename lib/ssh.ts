import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export interface VMConfig {
  id: string
  name: string
  host: string
  user: string
  keyPath: string
  label: string
}

export function getVMConfigs(): VMConfig[] {
  return [
    {
      id: 'vm-a',
      name: process.env.VM_A_NAME || 'adiyogi',
      host: process.env.VM_A_HOST || '',
      user: process.env.VM_A_USER || 'azureuser',
      keyPath: process.env.VM_A_KEY || '',
      label: `${process.env.VM_A_NAME || 'VM A'} (${process.env.VM_A_HOST || 'not configured'})`,
    },
    {
      id: 'vm-b',
      name: process.env.VM_B_NAME || 'azureexp',
      host: process.env.VM_B_HOST || '',
      user: process.env.VM_B_USER || 'azureuser',
      keyPath: process.env.VM_B_KEY || '',
      label: `${process.env.VM_B_NAME || 'VM B'} (${process.env.VM_B_HOST || 'not configured'})`,
    },
  ]
}

export function getVMConfigById(id: string): VMConfig | undefined {
  return getVMConfigs().find((vm) => vm.id === id)
}

// Run SSH command on a VM
export async function runSSHCommand(
  config: VMConfig,
  command: string,
  timeout: number = 30000
): Promise<{ stdout: string; stderr: string }> {
  if (!config.host || !config.keyPath) {
    throw new Error('VM not configured')
  }

  const sshCommand = `ssh -i "${config.keyPath}" -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${config.user}@${config.host} "${command.replace(/"/g, '\\"')}"`

  try {
    const { stdout, stderr } = await execAsync(sshCommand, { timeout })
    return { stdout, stderr }
  } catch (error: any) {
    if (error.killed) {
      throw new Error('Command timed out')
    }
    // Return stderr as output for failed commands
    return { stdout: error.stdout || '', stderr: error.stderr || error.message }
  }
}

// Check if VM is reachable via SSH
export async function checkVMStatus(config: VMConfig): Promise<{
  online: boolean
  uptime?: string
  error?: string
}> {
  if (!config.host || !config.keyPath) {
    return { online: false, error: 'Not configured' }
  }

  try {
    const { stdout } = await runSSHCommand(config, 'uptime -p', 5000)
    return { online: true, uptime: stdout.trim() }
  } catch (error: any) {
    return { online: false, error: error.message }
  }
}

// Get all VMs status
export async function getAllVMStatus(): Promise<
  Array<VMConfig & { online: boolean; uptime?: string; error?: string }>
> {
  const configs = getVMConfigs()
  const statuses = await Promise.all(
    configs.map(async (config) => {
      const status = await checkVMStatus(config)
      return { ...config, ...status }
    })
  )
  return statuses
}
