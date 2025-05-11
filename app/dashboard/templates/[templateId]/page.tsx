"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { TemplateForm } from "@/components/template-form"
import { getProjectTemplate } from "@/app/actions/template-actions"
import { useToast } from "@/hooks/use-toast"

interface TemplateTask {
  id: number
  name: string
  description: string
  duration: number
  sequence: number
  dependsOn: number[]
}

interface Template {
  id: number
  name: string
  description: string
  tasks: TemplateTask[]
}

export default function EditTemplatePage() {
  const params = useParams()
  const { toast } = useToast()
  const [template, setTemplate] = useState<Template | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const templateId = Number.parseInt(params.templateId as string)

  useEffect(() => {
    const fetchTemplate = async () => {
      setIsLoading(true)
      try {
        const result = await getProjectTemplate(templateId)
        if (result.error) {
          toast({
            title: "Error",
            description: result.error,
            variant: "destructive",
          })
        } else {
          setTemplate(result.template)
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Terjadi kesalahan saat memuat template proyek",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchTemplate()
  }, [templateId, toast])

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardShell>
        <DashboardHeader
          heading="Edit Template Proyek"
          text="Ubah konfigurasi template proyek yang sudah ada."
        >
          <Link href="/dashboard/templates">
            <Button variant="outline" size="sm" className="gap-1">
              <ChevronLeft className="h-4 w-4" />
              Kembali ke Daftar Template
            </Button>
          </Link>
        </DashboardHeader>
        <div className="space-y-6">
          {isLoading ? (
            <div className="h-40 rounded-lg border bg-muted/40 animate-pulse" />
          ) : template ? (
            <TemplateForm template={template} />
          ) : (
            <div className="rounded-lg border p-8 text-center">
              <h3 className="font-medium">Template tidak ditemukan</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Template yang Anda cari tidak ditemukan atau Anda tidak memiliki akses ke template ini.
              </p>
              <Link href="/dashboard/templates" className="mt-4 inline-block">
                <Button size="sm" className="gap-1 mt-4">
                  <ChevronLeft className="h-4 w-4" />
                  Kembali ke Daftar Template
                </Button>
              </Link>
            </div>
          )}
        </div>
      </DashboardShell>
    </div>
  )
} 