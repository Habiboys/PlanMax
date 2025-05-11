import type { ReactNode } from "react"

interface DashboardShellProps {
  children: ReactNode
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="flex-1 overflow-x-hidden">
      <div className="flex-1 space-y-4 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 overflow-x-hidden">
        {children}
      </div>
    </div>
  )
}
