'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { ShellFile } from '@/lib/shell-data'

interface ShellContextValue {
  files: ShellFile[]
}

const ShellContext = createContext<ShellContextValue>({ files: [] })

export function ShellProvider({ files, children }: { files: ShellFile[]; children: ReactNode }) {
  return <ShellContext.Provider value={{ files }}>{children}</ShellContext.Provider>
}

export function useShell(): ShellContextValue {
  return useContext(ShellContext)
}
