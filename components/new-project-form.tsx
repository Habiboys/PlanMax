"use client"

import { Calendar, FileText, Folder } from "lucide-react"
import { useRouter } from "next/navigation"
import type React from "react"
import { useEffect, useState } from "react"

import { createProject } from "@/app/actions/project-actions"
import { createProjectFromTemplate, getProjectTemplates } from "@/app/actions/template-actions"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"

interface Team {
  id: number
  name: string
  members: {
    id: number
    user: {
      id: number
      name: string
      email: string
    }
    role: string
  }[]
}

interface ProjectTemplate {
  id: number
  name: string
  description: string | null
  tasks: {
    id: number
    name: string
    description: string | null
    duration: number
    sequence: number
  }[]
}

export function NewProjectForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  const [templates, setTemplates] = useState<ProjectTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [useTemplate, setUseTemplate] = useState(false)

  // Fetch teams saat komponen dimuat
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await fetch("/api/teams")
        const data = await response.json()
        if (data.teams) {
          setTeams(data.teams)
        }
      } catch (error) {
        console.error("Failed to fetch teams:", error)
      }
    }
    
    const fetchTemplates = async () => {
      try {
        const result = await getProjectTemplates()
        if (!result.error && result.templates) {
          setTemplates(result.templates)
        }
      } catch (error) {
        console.error("Failed to fetch project templates:", error)
      }
    }
    
    fetchTeams()
    fetchTemplates()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const formData = new FormData(e.currentTarget)

      // Validasi tanggal
      if (!startDate) {
        toast({
          title: "Error",
          description: "Silakan pilih tanggal mulai",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      // Validasi tim
      if (!selectedTeamId) {
        toast({
          title: "Error",
          description: "Silakan pilih tim",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      let result
      
      if (useTemplate && selectedTemplateId) {
        // Buat proyek dari template
        result = await createProjectFromTemplate(
          parseInt(selectedTemplateId), 
          {
            name: formData.get("name") as string,
            description: formData.get("description") as string,
            startDate: startDate
          }
        )
      } else {
        // Buat proyek dari awal
        if (!endDate) {
          toast({
            title: "Error",
            description: "Silakan pilih tanggal selesai",
            variant: "destructive",
          })
          setIsLoading(false)
          return
        }

        if (endDate < startDate) {
          toast({
            title: "Error",
            description: "Tanggal selesai tidak boleh lebih awal dari tanggal mulai",
            variant: "destructive",
          })
          setIsLoading(false)
          return
        }

        // Add dates to form data
        formData.set("startDate", startDate.toISOString())
        formData.set("endDate", endDate.toISOString())
        formData.set("teamId", selectedTeamId)

        // Konversi FormData ke objek yang sesuai dengan schema
        const projectData = {
          name: formData.get("name") as string,
          description: formData.get("description") as string || undefined,
          teamId: Number(selectedTeamId)
        }

        result = await createProject(projectData)
      }

      if (result.success) {
        toast({
          title: "Sukses",
          description: "Proyek berhasil dibuat",
        })
        setOpen(false)
        
        // Gunakan result.project.id untuk navigasi
        const projectId = "project" in result ? result.project.id : result.projectId
        router.push(`/dashboard/${projectId}`)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal membuat proyek",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to create project:", error)
      toast({
        title: "Error",
        description: "Terjadi kesalahan yang tidak terduga",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Calendar className="mr-2 h-4 w-4" />
          Proyek Baru
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Buat Proyek Baru</DialogTitle>
            <DialogDescription>
              Isi detail berikut untuk membuat proyek baru. Anda dapat menambahkan tugas dan anggota tim nanti.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="projectType">Tipe Proyek</Label>
              <div className="flex items-center space-x-4">
                <Button
                  type="button"
                  variant={!useTemplate ? "default" : "outline"}
                  className="gap-2 flex-1 justify-start"
                  onClick={() => setUseTemplate(false)}
                >
                  <FileText className="h-4 w-4" />
                  Proyek Kosong
                </Button>
                <Button
                  type="button"
                  variant={useTemplate ? "default" : "outline"}
                  className="gap-2 flex-1 justify-start"
                  onClick={() => setUseTemplate(true)}
                >
                  <Folder className="h-4 w-4" />
                  Dari Template
                </Button>
              </div>
            </div>
            
            {useTemplate && (
              <div className="space-y-2">
                <Label htmlFor="template">Pilih Template</Label>
                <Select 
                  value={selectedTemplateId} 
                  onValueChange={setSelectedTemplateId}
                  required
                  disabled={templates.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={templates.length === 0 ? "Belum ada template tersedia" : "Pilih template"} />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.length === 0 ? (
                      <SelectItem value="no-template" disabled>
                        Belum ada template tersedia
                      </SelectItem>
                    ) : (
                      templates.map((template) => (
                        <SelectItem key={template.id} value={template.id.toString()}>
                          {template.name} ({template.tasks.length} tugas)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {templates.length === 0 ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>Anda belum memiliki template project.</span>
                    <Button variant="link" className="h-auto p-0 text-xs" onClick={() => router.push("/dashboard/templates")}>
                      Buat template sekarang
                    </Button>
                  </p>
                ) : selectedTemplateId && (
                  <p className="text-xs text-muted-foreground">
                    {templates.find(t => t.id.toString() === selectedTemplateId)?.description || ""}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">Nama Proyek</Label>
              <Input id="name" name="name" placeholder="Redesain Website" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Jelaskan proyek Anda..."
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team">Pilih Tim</Label>
              <Select 
                name="teamId" 
                value={selectedTeamId}
                onValueChange={setSelectedTeamId}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tim" />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className={useTemplate ? "" : "grid grid-cols-2 gap-4"}>
              <div className="space-y-2">
                <Label htmlFor="startDate">Tanggal Mulai</Label>
                <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal" id="startDate">
                      <Calendar className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pilih tanggal"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date)
                        setStartDateOpen(false)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              {!useTemplate && (
                <div className="space-y-2">
                  <Label htmlFor="endDate">Tanggal Selesai</Label>
                  <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal" id="endDate">
                        <Calendar className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Pilih tanggal"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <CalendarComponent
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => {
                          setEndDate(date)
                          setEndDateOpen(false)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </div>
            
            {useTemplate && selectedTemplateId && (
              <div className="text-sm text-muted-foreground border rounded-md p-3 bg-muted/30">
                <p className="font-medium">Informasi Template</p>
                <p className="mt-1">Tanggal selesai akan ditentukan berdasarkan durasi tugas dalam template.</p>
                <p className="mt-1">Template ini berisi {templates.find(t => t.id.toString() === selectedTemplateId)?.tasks.length || 0} tugas yang akan otomatis dibuat.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)} 
              type="button"
              disabled={isLoading}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Membuat..." : "Buat Proyek"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
