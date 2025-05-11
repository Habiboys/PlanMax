"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Edit, Folder, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { getProjectTemplates, deleteProjectTemplate } from "@/app/actions/template-actions"

interface ProjectTemplate {
  id: number
  name: string
  description: string
  tasks: {
    id: number
    name: string
    description: string
    duration: number
    sequence: number
  }[]
}

export default function TemplatesPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [templateToDelete, setTemplateToDelete] = useState<{ id: number | null, name: string }>({ id: null, name: "" })
  const [isDeleting, setIsDeleting] = useState(false)

  // Fungsi untuk memuat template proyek
  const loadTemplates = async () => {
    setIsLoading(true)
    try {
      const result = await getProjectTemplates()
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        setTemplates(result.templates || [])
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

  // Memuat data saat komponen dimuat
  useEffect(() => {
    loadTemplates()
  }, [])

  // Fungsi untuk menangani penghapusan template
  const handleDelete = async () => {
    if (!templateToDelete.id) return
    
    setIsDeleting(true)
    try {
      const result = await deleteProjectTemplate(templateToDelete.id)
      
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Sukses",
          description: "Template proyek berhasil dihapus",
        })
        // Refresh data
        loadTemplates()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menghapus template",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }

  // Filter template berdasarkan pencarian
  const filteredTemplates = templates.filter(
    (template) =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardShell>
        <DashboardHeader
          heading="Template Proyek"
          text="Kelola template proyek untuk memudahkan pembuatan proyek baru."
        >
          <Link href="/dashboard/templates/create">
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" />
              Buat Template Baru
            </Button>
          </Link>
        </DashboardHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Input
                type="search"
                placeholder="Cari template..."
                className="w-full"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[220px] rounded-lg border bg-muted/40 p-6 animate-pulse" />
              ))}
            </div>
          ) : filteredTemplates.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => (
                <Card key={template.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Folder className="h-5 w-5 text-primary" />
                      {template.name}
                    </CardTitle>
                    <CardDescription>
                      {template.description || "Tidak ada deskripsi"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="text-sm text-muted-foreground">
                      <div className="flex items-center justify-between mb-1">
                        <span>Jumlah Tugas:</span>
                        <span className="font-medium">{template.tasks.length}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Link href={`/dashboard/templates/${template.id}`}>
                      <Button variant="outline" size="sm" className="gap-1">
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-destructive hover:text-destructive"
                      onClick={() => {
                        setTemplateToDelete({ id: template.id, name: template.name })
                        setIsDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Hapus
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
              <Folder className="h-10 w-10 text-muted-foreground mb-2" />
              <h3 className="font-medium">Belum ada template proyek</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Buat template proyek untuk mempercepat proses pembuatan proyek baru.
              </p>
              <Link href="/dashboard/templates/create" className="mt-4">
                <Button size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  Buat Template Baru
                </Button>
              </Link>
            </div>
          )}
        </div>
      </DashboardShell>

      {/* Dialog Konfirmasi Hapus */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus Template</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus template "{templateToDelete.name}"? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Batal
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 