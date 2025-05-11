"use client"

import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { TemplateForm } from "@/components/template-form"

export default function CreateTemplatePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardShell>
        <DashboardHeader
          heading="Buat Template Proyek Baru"
          text="Buat template proyek baru untuk memudahkan pembuatan proyek serupa di masa depan."
        >
          <Link href="/dashboard/templates">
            <Button variant="outline" size="sm" className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              Kembali ke Daftar Template
            </Button>
          </Link>
        </DashboardHeader>
        <div className="space-y-6">
          <TemplateForm />
        </div>
      </DashboardShell>
    </div>
  )
} 