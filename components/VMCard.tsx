'use client'

interface VMStatus {
  id: string
  name: string
  label: string
  host: string
  online: boolean
  uptime?: string
  error?: string
}

interface VMCardProps {
  vm: VMStatus
  onRefresh: () => void
}

export default function VMCard({ vm, onRefresh }: VMCardProps) {
  const getStatusColor = () => {
    if (vm.online) return 'bg-green-500'
    return 'bg-red-500'
  }

  const getStatusText = () => {
    if (vm.online) return 'Online'
    if (vm.error === 'Not configured') return 'Not Configured'
    return 'Offline'
  }

  const copySSHCommand = () => {
    const cmd = `ssh azureuser@${vm.host}`
    navigator.clipboard.writeText(cmd)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{vm.name}</h3>
          <p className="text-sm text-gray-400">{vm.host}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          <span className="text-sm text-gray-300">{getStatusText()}</span>
        </div>
      </div>

      {vm.online && vm.uptime && (
        <div className="text-sm text-gray-400 mb-4">
          <span className="text-gray-500">Uptime:</span>
          <p className="text-gray-300">{vm.uptime}</p>
        </div>
      )}

      {!vm.online && vm.error && vm.error !== 'Not configured' && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 px-3 py-2 rounded text-sm mb-4">
          {vm.error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={copySSHCommand}
          className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
        >
          Copy SSH Command
        </button>
        <button
          onClick={onRefresh}
          className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded transition-colors"
        >
          Refresh
        </button>
      </div>
    </div>
  )
}
