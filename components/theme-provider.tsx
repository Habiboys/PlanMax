'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  useTheme,
  type ThemeProviderProps,
} from 'next-themes'

// Komponen ini memperbaiki flash content
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false)

  // Hanya render tema setelah client-side mounted
  React.useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <NextThemesProvider {...props}>
      {mounted ? children : <div style={{ visibility: "hidden" }}>{children}</div>}
    </NextThemesProvider>
  )
}
