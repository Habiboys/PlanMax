"use client"

import { useState, useEffect } from "react"
import { Suspense } from "react"
import Link from "next/link"
import { PlusCircle, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { getUserProjects, deleteProject } from "@/app/actions/project-actions"
import { formatDate } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

function ProjectsList() {
  const { toast } = useToast()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<{ id: number | null, name: string }>({ id: null, name: "" })
  const [projects, setProjects] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const result = await getUserProjects()
        if (result.error) {
          setError(result.error)
        } else {
          setProjects(result.projects)
        }
      } catch (error) {
        setError("Gagal memuat project. Silakan coba lagi.")
      }
    }

    fetchProjects()
  }, [])

  const handleDeleteProject = async () => {
    if (!projectToDelete.id) return
    
    setIsLoading(true)
    try {
      const result = await deleteProject(projectToDelete.id)
      
      if (result.success) {
        // Update local state
        setProjects(projects.filter(project => project.id !== projectToDelete.id))
        
        toast({
          title: "Project berhasil dihapus",
          description: "Project telah berhasil dihapus.",
        })
      } else {
        toast({
          title: "Gagal menghapus project",
          description: result.error || "Terjadi kesalahan saat menghapus project.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menghapus project. Silakan coba lagi.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsDeleteDialogOpen(false)
    }
  }

  const openDeleteConfirmation = (project: any) => {
    setProjectToDelete({ id: project.id, name: project.name })
    setIsDeleteDialogOpen(true)
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>
  }

  if (projects.length === 0) {
    return (
      <div className="text-center p-12">
        <h3 className="text-lg font-medium">Belum ada project</h3>
        <p className="text-muted-foreground mt-2">Buat project baru untuk memulai</p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/projects/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Buat Project Baru
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl">{project.name}</CardTitle>
                <Badge variant={
                  project.status === "Completed" ? "success" :
                  project.status === "In Progress" ? "default" :
                  project.status === "On Hold" ? "warning" :
                  project.status === "Cancelled" ? "destructive" : "outline"
                }>
                  {project.status}
                </Badge>
              </div>
              <CardDescription className="line-clamp-2 h-10">
                {project.description || "Tidak ada deskripsi"}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{project.progress}%</span>
                  </div>
                  <Progress value={project.progress} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Tanggal Mulai</p>
                    <p>{project.startDate ? formatDate(project.startDate) : "Belum ditentukan"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tanggal Selesai</p>
                    <p>{project.endDate ? formatDate(project.endDate) : "Belum ditentukan"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Task</p>
                    <p>{project.tasks} ({project.completedTasks} selesai)</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Peran</p>
                    <p className="capitalize">{project.role}</p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <div className="flex justify-between items-center w-full">
                <div className="flex -space-x-2">
                  {project.team.slice(0, 3).map((member) => (
                    <Avatar key={member.id} className="border-2 border-background h-8 w-8">
                      <AvatarImage src={member.avatar} alt={member.name} />
                      <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  ))}
                  {project.team.length > 3 && (
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-muted text-xs font-medium">
                      +{project.team.length - 3}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={() => openDeleteConfirmation(project)}>
                    <Trash2 className="h-4 w-4 mr-1" />
                    Hapus
                  </Button>
                  <Button asChild size="sm">
                    <Link href={`/dashboard/projects/${project.id}`}>
                      Lihat Detail
                    </Link>
                  </Button>
                </div>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus project "{projectToDelete.name}" secara permanen dan tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProject} 
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Menghapus..." : "Hapus Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Kelola semua project Anda di satu tempat
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/projects/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Buat Project Baru
          </Link>
        </Button>
      </div>
      <Suspense fallback={<div className="text-center p-12">Memuat projects...</div>}>
        <ProjectsList />
      </Suspense>
    </div>
  )
}