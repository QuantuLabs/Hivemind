'use client'

import Link from 'next/link'
import { Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HivemindToggle } from './HivemindToggle'

export function Header() {
  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">🐝</span>
          <span className="font-semibold">Hivemind</span>
        </div>

        <div className="flex items-center gap-4">
          <HivemindToggle />

          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
