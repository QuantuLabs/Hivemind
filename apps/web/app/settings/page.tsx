'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiKeySettings } from '@/components/ApiKeySettings'

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-8">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>

        <h1 className="text-2xl font-semibold mb-8">Settings</h1>

        <div className="space-y-6">
          <ApiKeySettings />
        </div>
      </div>
    </main>
  )
}
