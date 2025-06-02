"use client"

import { format } from "date-fns"
import { id } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { createProject, updateProject } from "@/app/actions/project-actions"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"

interface ProjectFormProps {
  project?: {
    id: number
    name: string
    description: string
    startDate: string | null
    endDate: string | null
    status: string
  }
}

export function ProjectForm({ project }: ProjectFormProps = {}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [startDate, setStartDate] = useState<Date | undefined>(
    project?.startDate ? new Date(project.startDate) : undefined
  )
  const [endDate, setEndDate] = useState<Date | undefined>(
    project?.endDate ? new Date(project.endDate) : undefined
  )

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)

    try {
      const formElement = event.currentTarget
      const formData = new FormData(formElement)
      
      // Konversi FormData ke objek yang sesuai dengan schema
      const projectData = {
        name: formData.get("name") as string,
        description: formData.get("description") as string || undefined,
        teamId: formData.get("teamId") ? Number(formData.get("teamId")) : undefined
      }
      
      // Tambahkan tanggal ke data project
      if (startDate) {
        formData.set("startDate", startDate.toISOString())
      }
      if (endDate) {
        formData.set("endDate", endDate.toISOString())
      }

      let result
      if (project) {
        result = await updateProject(project.id, formData)
        if (result.success) {
          toast({
            title: "Project berhasil diperbarui",
            description: "Anda akan dialihkan ke halaman detail project",
          })
          router.push(`/dashboard/projects/${project.id}`)
          router.refresh()
        } else {
          toast({
            variant: "destructive",
            title: "Gagal",
            description: result.error,
          })
        }
      } else {
        result = await createProject(projectData)
        if ("error" in result) {
          toast({
            variant: "destructive",
            title: "Gagal",
            description: result.error,
          })
        } else if (result.success && result.project) {
          toast({
            title: "Project berhasil dibuat",
            description: "Anda akan dialihkan ke halaman detail project",
          })
          router.push(`/dashboard/projects/${result.project.id}`)
          router.refresh()
        }
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Gagal",
        description: "Terjadi kesalahan saat menyimpan project",
      })
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nama Project</Label>
              <Input
                id="name"
                name="name"
                defaultValue={project?.name}
                required
                placeholder="Masukkan nama project"
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={project?.description}
                placeholder="Deskripsi project (opsional)"
                rows={4}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tanggal Mulai</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? (
                        format(startDate, "PPP", { locale: id })
                      ) : (
                        <span>Pilih tanggal</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="grid gap-2">
                <Label>Tanggal Selesai</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? (
                        format(endDate, "PPP", { locale: id })
                      ) : (
                        <span>Pilih tanggal</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      disabled={(date) => 
                        startDate ? date < startDate : false
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={project?.status || "Not Started"}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Not Started">Belum Dimulai</SelectItem>
                  <SelectItem value="In Progress">Sedang Berjalan</SelectItem>
                  <SelectItem value="On Hold">Ditunda</SelectItem>
                  <SelectItem value="Completed">Selesai</SelectItem>
                  <SelectItem value="Cancelled">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Menyimpan..." : project ? "Perbarui Project" : "Buat Project"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}