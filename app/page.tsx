'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

const Terminal = dynamic(() => import('@/components/Terminal'), {
  ssr: false,
  loading: () => <div className="flex-1 bg-gray-900" />,
})

interface TerminalTab {
  id: string
  name: string
}

const SSH_COMMANDS = [
  {
    name: 'adiyogi',
    command: 'ssh -i /Users/guptaaditya/Desktop/adiyogi_key.pem azureuser@20.151.49.225',
  },
  {
    name: 'azureexp',
    command: 'ssh -i /Users/guptaaditya/Desktop/azureexp.pem azureuser@20.64.254.183',
  },
]

export default function Dashboard() {
  const [terminals, setTerminals] = useState<TerminalTab[]>([])
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const addTerminal = () => {
    const id = `term-${Date.now()}`
    const newTab = { id, name: `Terminal ${terminals.length + 1}` }
    setTerminals([...terminals, newTab])
    setActiveTab(id)
  }

  const closeTerminal = (id: string) => {
    const newTerminals = terminals.filter((t) => t.id !== id)
    setTerminals(newTerminals)
    if (activeTab === id) {
      setActiveTab(newTerminals.length > 0 ? newTerminals[newTerminals.length - 1].id : null)
    }
  }

  const copyCommand = (command: string, name: string) => {
    navigator.clipboard.writeText(command)
    setCopied(name)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      <aside className="w-48 bg-gray-800 border-r border-gray-700 p-2 flex flex-col gap-2">
        <button
          onClick={addTerminal}
          className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded transition-colors"
        >
          + New
        </button>
        {SSH_COMMANDS.map((vm) => (
          <button
            key={vm.name}
            onClick={() => copyCommand(vm.command, vm.name)}
            className="w-full py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
          >
            {copied === vm.name ? 'Copied!' : vm.name}
          </button>
        ))}
      </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          {terminals.length > 0 ? (
            <>
              <div className="flex bg-gray-800 border-b border-gray-700">
                {terminals.map((tab) => (
                  <div
                    key={tab.id}
                    className={`flex items-center px-4 py-2 cursor-pointer border-r border-gray-700 ${
                      activeTab === tab.id
                        ? 'bg-gray-900 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <span className="text-sm">{tab.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        closeTerminal(tab.id)
                      }}
                      className="ml-2 text-gray-500 hover:text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex-1 relative">
                {terminals.map((tab) => (
                  <div
                    key={tab.id}
                    className={`absolute inset-0 ${activeTab === tab.id ? 'block' : 'hidden'}`}
                  >
                    <Terminal id={tab.id} />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <button
                onClick={addTerminal}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
              >
                Open Terminal
              </button>
            </div>
          )}
        </main>
    </div>
  )
}
