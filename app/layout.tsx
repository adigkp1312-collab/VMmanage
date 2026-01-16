import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Azure VM Dashboard',
  description: 'Control your Azure VMs and AI workloads',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
