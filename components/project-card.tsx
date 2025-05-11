"use client"

import Link from "next/link"
import { format, parseISO } from "date-fns"
import { Clock, MoreHorizontal, Trash } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { archiveProject, deleteProject } from "@/app/actions/project-actions"
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

interface ProjectCardProps {
  project: {
    id: number
    name: string
    description: string
    progress: number
    tasks: number
    completedTasks: number
    dueDate?: string
    endDate?: string | null
    team: { id: number; name: string; avatar: string; role: string }[]
    status: string
    role?: string
  }
  onDelete?: () => void
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const { toast } = useToast()
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleArchive = async () => {
    try {
      const result = await archiveProject(project.id)
      if (result.success) {
        toast({
          title: "Project archived",
          description: "The project has been archived successfully.",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to archive project. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteLocal = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteProject(project.id)
      if (result.success) {
        toast({
          title: "Project deleted",
          description: "The project has been deleted successfully.",
        })
        if (onDelete) {
          onDelete()
        }
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete project. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }

  // Format the due date
  const formattedDueDate = project.dueDate
    ? project.dueDate
    : project.endDate
      ? format(parseISO(project.endDate), "MMM d, yyyy")
      : "No end date"

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle className="text-base font-bold">{project.name}</CardTitle>
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="mr-1 h-3.5 w-3.5" />
              <span>Due {formattedDueDate}</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/${project.id}`}>View details</Link>
              </DropdownMenuItem>
              {project.role === "OWNER" || project.role === "ADMIN" ? (
                <>
                  <DropdownMenuItem asChild>
                    <Link href={`/dashboard/${project.id}/edit`}>Edit project</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleArchive} disabled={project.status === "Archived"}>
                    Archive project
                  </DropdownMenuItem>
                  {project.role === "OWNER" && (
                    <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive">
                      Delete project
                    </DropdownMenuItem>
                  )}
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground line-clamp-2 h-10">{project.description}</div>
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>Progress</span>
              <span className="font-medium">{project.progress}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${project.progress}%` }} />
            </div>
            <div className="mt-3 flex justify-between text-xs text-muted-foreground">
              <div>
                {project.completedTasks}/{project.tasks} tasks
              </div>
              <div className="flex -space-x-2">
                {project.team.slice(0, 3).map((member, i) => (
                  <img
                    key={i}
                    src={member.avatar || "/placeholder.svg"}
                    alt={member.name}
                    className="h-6 w-6 rounded-full border-2 border-background"
                    title={member.name}
                  />
                ))}
                {project.team.length > 3 && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-xs font-medium">
                    +{project.team.length - 3}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Link href={`/dashboard/${project.id}`} className="w-full">
            <Button variant="outline" className="w-full">
              View Project
            </Button>
          </Link>
        </CardFooter>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete project "{project.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteLocal}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
