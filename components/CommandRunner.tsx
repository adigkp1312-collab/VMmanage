'use client'

import { useState } from 'react'

interface VMOption {
  id: string
  label: string
}

interface CommandRunnerProps {
  vms: VMOption[]
}

interface CommandResult {
  vmId: string
  vmLabel: string
  output: string
  error?: string
}

const QUICK_COMMANDS = [
  { label: 'Hostname', command: 'hostname' },
  { label: 'Uptime', command: 'uptime' },
  { label: 'Disk Usage', command: 'df -h' },
  { label: 'Memory', command: 'free -h' },
  { label: 'Docker PS', command: 'docker ps' },
  { label: 'GPU Status', command: 'nvidia-smi' },
]

export default function CommandRunner({ vms }: CommandRunnerProps) {
  const [command, setCommand] = useState('')
  const [selectedVMs, setSelectedVMs] = useState<string[]>(vms.map((v) => v.id))
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<CommandResult[]>([])

  const toggleVM = (vmId: string) => {
    setSelectedVMs((prev) =>
      prev.includes(vmId)
        ? prev.filter((id) => id !== vmId)
        : [...prev, vmId]
    )
  }

  const runCommand = async (cmd?: string) => {
    const commandToRun = cmd || command
    if (!commandToRun.trim() || selectedVMs.length === 0) return

    setLoading(true)
    setResults([])

    try {
      const commandResults = await Promise.all(
        selectedVMs.map(async (vmId) => {
          const vm = vms.find((v) => v.id === vmId)
          try {
            const response = await fetch('/api/command', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ vmId, command: commandToRun }),
            })

            const data = await response.json()

            if (!response.ok) {
              return {
                vmId,
                vmLabel: vm?.label || vmId,
                output: '',
                error: data.error || 'Failed to run command',
              }
            }

            return {
              vmId,
              vmLabel: vm?.label || vmId,
              output: data.output,
            }
          } catch (err) {
            return {
              vmId,
              vmLabel: vm?.label || vmId,
              output: '',
              error: err instanceof Error ? err.message : 'An error occurred',
            }
          }
        })
      )

      setResults(commandResults)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Run Command</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* VM Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Target VMs
          </label>
          <div className="flex gap-2">
            {vms.map((vm) => (
              <button
                key={vm.id}
                onClick={() => toggleVM(vm.id)}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  selectedVMs.includes(vm.id)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {vm.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Commands */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Quick Commands
          </label>
          <div className="flex flex-wrap gap-2">
            {QUICK_COMMANDS.map((qc) => (
              <button
                key={qc.label}
                onClick={() => {
                  setCommand(qc.command)
                  runCommand(qc.command)
                }}
                disabled={loading || selectedVMs.length === 0}
                className="px-3 py-1 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-gray-300 text-sm rounded transition-colors"
              >
                {qc.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Command */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Custom Command
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runCommand()}
              placeholder="Enter command..."
              className="flex-1 bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => runCommand()}
              disabled={loading || !command.trim() || selectedVMs.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
            >
              {loading ? 'Running...' : 'Run'}
            </button>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">
              Results
            </label>
            {results.map((result) => (
              <div
                key={result.vmId}
                className="bg-gray-900 rounded-lg overflow-hidden"
              >
                <div className="bg-gray-700 px-3 py-2 text-sm font-medium text-gray-200">
                  {result.vmLabel}
                </div>
                <div className="p-3">
                  {result.error ? (
                    <div className="text-red-400 text-sm">{result.error}</div>
                  ) : (
                    <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono overflow-x-auto">
                      {result.output || 'No output'}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
