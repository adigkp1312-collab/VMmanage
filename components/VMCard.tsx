'use client'

import { useState } from 'react'

interface VMStatus {
  id: string
  name: string
  label: string
  resourceGroup: string
  subscriptionId: string
  powerState: string
  provisioningState: string
  vmSize?: string
  location?: string
}

interface VMCardProps {
  vm: VMStatus
  onRefresh: () => void
}

export default function VMCard({ vm, onRefresh }: VMCardProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isRunning = vm.powerState === 'running'
  const isStopped =
    vm.powerState === 'deallocated' || vm.powerState === 'stopped'
  const isTransitioning =
    vm.powerState === 'starting' ||
    vm.powerState === 'stopping' ||
    vm.powerState === 'deallocating'

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    setLoading(action)
    setError(null)

    try {
      const response = await fetch(`/api/vms/${vm.id}/${action}`, {
        method: 'POST',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || `Failed to ${action} VM`)
      }

      // Refresh VM status after action
      setTimeout(onRefresh, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(null)
    }
  }

  const getStatusColor = () => {
    if (isRunning) return 'bg-green-500'
    if (isStopped) return 'bg-gray-500'
    if (isTransitioning) return 'bg-yellow-500'
    if (vm.powerState === 'Error' || vm.powerState === 'NotConfigured')
      return 'bg-red-500'
    return 'bg-gray-500'
  }

  const getStatusText = () => {
    if (vm.powerState === 'NotConfigured') return 'Not Configured'
    return vm.powerState.charAt(0).toUpperCase() + vm.powerState.slice(1)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{vm.label}</h3>
          <p className="text-sm text-gray-400">{vm.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${getStatusColor()} ${
              isTransitioning ? 'animate-pulse' : ''
            }`}
          />
          <span className="text-sm text-gray-300">{getStatusText()}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm text-gray-400 mb-4">
        <div>
          <span className="text-gray-500">Resource Group:</span>
          <p className="text-gray-300 truncate">{vm.resourceGroup}</p>
        </div>
        {vm.vmSize && (
          <div>
            <span className="text-gray-500">VM Size:</span>
            <p className="text-gray-300">{vm.vmSize}</p>
          </div>
        )}
        {vm.location && (
          <div>
            <span className="text-gray-500">Location:</span>
            <p className="text-gray-300">{vm.location}</p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500 text-red-400 px-3 py-2 rounded text-sm mb-4">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => handleAction('start')}
          disabled={isRunning || loading !== null || isTransitioning}
          className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
        >
          {loading === 'start' ? 'Starting...' : 'Start'}
        </button>
        <button
          onClick={() => handleAction('stop')}
          disabled={isStopped || loading !== null || isTransitioning}
          className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
        >
          {loading === 'stop' ? 'Stopping...' : 'Stop'}
        </button>
        <button
          onClick={() => handleAction('restart')}
          disabled={!isRunning || loading !== null || isTransitioning}
          className="flex-1 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
        >
          {loading === 'restart' ? 'Restarting...' : 'Restart'}
        </button>
      </div>
    </div>
  )
}
