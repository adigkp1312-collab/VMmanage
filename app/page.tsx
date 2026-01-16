'use client'

import { useState, useEffect, useCallback } from 'react'
import VMCard from '@/components/VMCard'
import InferencePanel from '@/components/InferencePanel'
import CommandRunner from '@/components/CommandRunner'

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

type TabType = 'vms' | 'inference' | 'commands'

export default function Dashboard() {
  const [vms, setVMs] = useState<VMStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('vms')

  const fetchVMs = useCallback(async () => {
    try {
      const response = await fetch('/api/vms')
      if (!response.ok) {
        throw new Error('Failed to fetch VMs')
      }
      const data = await response.json()
      setVMs(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVMs()
    // Poll for updates every 30 seconds
    const interval = setInterval(fetchVMs, 30000)
    return () => clearInterval(interval)
  }, [fetchVMs])

  const handleLogout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    window.location.href = '/login'
  }

  const tabs: { id: TabType; label: string }[] = [
    { id: 'vms', label: 'VM Management' },
    { id: 'inference', label: 'AI Inference' },
    { id: 'commands', label: 'Run Commands' },
  ]

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-white">
              Azure VM Dashboard
            </h1>
            <div className="flex items-center gap-4">
              <button
                onClick={fetchVMs}
                className="text-sm text-gray-400 hover:text-white"
              >
                Refresh
              </button>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-400 hover:text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-4" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* VM Management Tab */}
        {activeTab === 'vms' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                Virtual Machines
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    for (const vm of vms) {
                      if (vm.powerState !== 'running') {
                        await fetch(`/api/vms/${vm.id}/start`, { method: 'POST' })
                      }
                    }
                    setTimeout(fetchVMs, 3000)
                  }}
                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                >
                  Start All
                </button>
                <button
                  onClick={async () => {
                    for (const vm of vms) {
                      if (vm.powerState === 'running') {
                        await fetch(`/api/vms/${vm.id}/stop`, { method: 'POST' })
                      }
                    }
                    setTimeout(fetchVMs, 3000)
                  }}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                >
                  Stop All
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-center text-gray-400 py-12">
                Loading VMs...
              </div>
            ) : vms.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                No VMs configured. Check your environment variables.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {vms.map((vm) => (
                  <VMCard key={vm.id} vm={vm} onRefresh={fetchVMs} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Inference Tab */}
        {activeTab === 'inference' && <InferencePanel />}

        {/* Commands Tab */}
        {activeTab === 'commands' && (
          <CommandRunner
            vms={vms.map((vm) => ({ id: vm.id, label: vm.label }))}
          />
        )}
      </main>
    </div>
  )
}
