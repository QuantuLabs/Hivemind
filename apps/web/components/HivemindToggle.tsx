'use client'

import { useSettingsStore } from '@/lib/stores/settings-store'
import { cn } from '@/lib/utils'

export function HivemindToggle() {
  const { mode, setMode } = useSettingsStore()

  return (
    <div className="flex items-center rounded-lg bg-muted p-1">
      <button
        onClick={() => setMode('solo')}
        className={cn(
          'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
          mode === 'solo'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        Solo
      </button>
      <button
        onClick={() => setMode('hivemind')}
        className={cn(
          'px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5',
          mode === 'hivemind'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <span>🐝</span>
        Hive
      </button>
    </div>
  )
}
