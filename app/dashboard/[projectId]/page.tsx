"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { format, parseISO } from "date-fns"
import { Calendar, ChevronLeft, Download, Edit, FileText, MoreHorizontal, Plus, Share2, Pencil, Users, Trash2, AlertTriangle, SaveAll, BarChart } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { GanttChart } from "@/components/gantt-chart"
import { TaskList } from "@/components/task-list"
import { NewTaskForm } from "@/components/new-task-form"
import { RiskList } from "@/components/risk-list"
import { WorkloadHeatmap } from "@/components/workload-heatmap"
import { getProject, archiveProject, deleteProject } from "@/app/actions/project-actions"
import { saveProjectAsTemplate } from "@/app/actions/template-actions"
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Toaster } from "@/components/ui/toaster"
import { LoadingSpinner } from "@/components/loading-spinner"
import { useSession } from "next-auth/react"
import { Task } from "@/types/schema"
import { adaptTasksForWorkloadHeatmap, adaptTeamMembersForTaskList } from "@/components/adapters/task-adapters"

interface ProjectTask {
  id: number
  name: string
  description: string
  startDate: string
  endDate: string
  progress: number
  status: string
  assignee: string | null
  assigneeId: number | null
  dependencies: number[]
  priority: string
  type: string
  estimatedHours: number | null
  pointsValue?: number
  editable?: boolean
}

interface ProjectDetails {
  id: number
  name: string
  description: string | null
  startDate: string | null
  endDate: string | null
  progress: number
  status: string
  team?: {
    id: number
    members: {
      id: number
      name: string
      role: string
      user: {
        id: number
        name: string
        email: string
        avatar: string | null
      }
    }[]
  }
  tasks: ProjectTask[]
  risks: {
    id: number
    name: string
    description: string | null
    status: string
    impact: string
    probability: string
    mitigation: string | null
  }[]
  userRole?: string
}

export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("gantt")
  const [project, setProject] = useState<ProjectDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [taskUpdateTriggered, setTaskUpdateTriggered] = useState(0)

  const projectId = Number.parseInt(params.projectId as string)

  const fetchProject = useCallback(async () => {
    setIsLoading(true)
    try {
      const result = await getProject(projectId)
      if (result.error) {
        setError(result.error)
      } else {
        const projectData = result.project as any;
        
        // Transform tasks dengan properti yang diperlukan
        const tasksWithDefaults = (projectData.tasks || []).map((task: any) => ({
          id: task.id,
          name: task.name,
          description: task.description || "",
          startDate: task.startDate || new Date().toISOString(),
          endDate: task.endDate || new Date().toISOString(),
          progress: task.progress || 0,
          status: task.status || "Not Started",
          assignee: task.assignee || null,
          assigneeId: task.assigneeId || null,
          dependencies: task.dependencies || [],
          priority: task.priority || "Medium",
          type: task.type || "Other",
          estimatedHours: task.estimatedHours || null,
          pointsValue: task.pointsValue || 0,
          editable: true
        }));

        // Transform project data dengan semua properti yang diperlukan
        const transformedProject: ProjectDetails = {
          id: projectData.id,
          name: projectData.name,
          description: projectData.description || null,
          startDate: projectData.startDate || null,
          endDate: projectData.endDate || null,
          progress: projectData.progress || 0,
          status: projectData.status || "Not Started",
          team: projectData.team ? {
            id: projectData.team.id,
            members: projectData.team.members.map((member: any) => ({
              id: member.id,
              name: member.user.name,
              role: member.role,
              user: {
                id: member.user.id,
                name: member.user.name,
                email: member.user.email,
                avatar: member.user.avatar || null
              }
            }))
          } : undefined,
          tasks: tasksWithDefaults,
          risks: (projectData.risks || []).map((risk: any) => ({
            id: risk.id,
            name: risk.name,
            description: risk.description || null,
            status: risk.status || "Open",
            impact: risk.impact || "Low",
            probability: risk.probability || "Low",
            mitigation: risk.mitigation || null
          })),
          userRole: projectData.userRole || null
        };

        setProject(transformedProject);
      }
    } catch (error) {
      setError("Failed to load project. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchProject()
  }, [fetchProject, taskUpdateTriggered])

  const handleArchive = async () => {
    try {
      const result = await archiveProject(projectId)
      if (result.success) {
        toast({
          title: "Project archived",
          description: "The project has been archived successfully.",
        })
        fetchProject()
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

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      const result = await deleteProject(projectId)
      if (result.success) {
        toast({
          title: "Project berhasil dihapus",
          description: "Project telah berhasil dihapus.",
        })
        router.push("/dashboard")
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal menghapus project. Silakan coba lagi.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan yang tidak terduga. Silakan coba lagi.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }

  const handleTaskCreated = async (action = "created", taskName = "") => {
    // Tampilkan loading state
    toast({
      title: "Memperbarui data...",
      description: "Sedang memproses task",
    });
    
    try {
      // Gunakan forceUpdate untuk memaksa pembaruan data
      forceUpdate()
      
      // Tampilkan toast berdasarkan jenis tindakan
      if (action && taskName) {
        let message = "";
        switch(action) {
          case "created":
            message = `Task "${taskName}" berhasil dibuat`;
            break;
          case "updated":
            message = `Task "${taskName}" berhasil diperbarui`;
            break;
          case "deleted":
            message = `Task "${taskName}" berhasil dihapus`;
            break;
          default:
            message = "Task berhasil diproses";
        }
        
        toast({
          title: "Berhasil",
          description: message,
        });
      } else {
        toast({
          title: "Berhasil",
          description: "Task berhasil diproses",
        });
      }
    } catch (error) {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat memperbarui data",
        variant: "destructive",
      });
    }
  }

  // Function untuk memaksa pembaruan data
  const forceUpdate = () => {
    // Hanya lakukan refresh data satu kali, tidak berulang
    fetchProject();
    
    // Perbarui trigger state untuk memicu re-render komponen
    setTaskUpdateTriggered(prev => prev + 1);
    
    // Tampilkan toast notifikasi berhasil
    toast({
      title: "Data diperbarui",
      description: "Task dan project telah diperbarui",
    });
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <DashboardShell>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="outline" size="icon" className="h-7 w-7">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Back</span>
                </Button>
              </Link>
              <div className="h-6 w-48 rounded-md bg-muted animate-pulse" />
              <div className="h-6 w-20 rounded-full bg-muted animate-pulse ml-2" />
            </div>
            <div className="h-9 w-9 rounded-md bg-muted animate-pulse" />
          </div>
          
          {/* Project Overview Card */}
          <div className="mt-6 grid gap-6">
            <Card>
              <CardHeader>
                <div className="h-5 w-32 rounded-md bg-muted animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Status</div>
                    <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Progress</div>
                    <div className="h-2 w-full rounded-full bg-muted animate-pulse mt-2" />
                    <div className="h-4 w-10 rounded-md bg-muted animate-pulse mt-2" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Timeline</div>
                    <div className="h-4 w-36 rounded-md bg-muted animate-pulse mt-2" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Team Members</div>
                    <div className="flex -space-x-2 mt-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-8 w-8 rounded-full bg-muted animate-pulse border-2 border-background" />
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Tabs and Content */}
            <div className="h-9 w-44 rounded-md bg-muted animate-pulse" />
            
            <Card>
              <CardHeader>
                <div className="h-5 w-32 rounded-md bg-muted animate-pulse" />
                <div className="h-4 w-64 rounded-md bg-muted animate-pulse mt-1" />
              </CardHeader>
              <CardContent>
                <div className="h-[350px] rounded-md bg-muted animate-pulse" />
              </CardContent>
            </Card>
          </div>
        </DashboardShell>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex min-h-screen flex-col">
        <DashboardShell>
          <div className="flex flex-col items-center justify-center space-y-4 py-12">
            <div className="rounded-full bg-muted p-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold">Project Not Found</h2>
            <p className="text-muted-foreground">
              {error || "The project you're looking for doesn't exist or you don't have access to it."}
            </p>
            <Button asChild>
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </DashboardShell>
      </div>
    )
  }

  // Get user role from team members with better null checking
  const userRole = project.team?.members?.find(
    (member) => member.user?.email === session?.user?.email
  )?.role || "VIEWER"

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardShell>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="icon" className="h-7 w-7">
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">{project?.name}</h1>
            <Badge variant="outline" className="ml-2">
              {project?.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/${project.id}/edit`}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const modal = document.createElement("dialog")
                    modal.className = "p-4 rounded-lg shadow-lg backdrop:bg-black backdrop:bg-opacity-50"
                    modal.innerHTML = `
                      <h2 class="text-lg font-semibold mb-4">Simpan sebagai Template</h2>
                      <form method="dialog" class="space-y-4">
                        <div>
                          <label class="block text-sm font-medium mb-1" for="template-name">Nama Template</label>
                          <input class="w-full px-3 py-2 border rounded-md" type="text" id="template-name" value="${project.name} Template" required />
                        </div>
                        <div>
                          <label class="block text-sm font-medium mb-1" for="template-desc">Deskripsi (opsional)</label>
                          <textarea class="w-full px-3 py-2 border rounded-md" id="template-desc" rows="3"></textarea>
                        </div>
                        <div class="flex justify-end gap-2">
                          <button class="px-4 py-2 border rounded-md" value="cancel">Batal</button>
                          <button class="px-4 py-2 bg-primary text-primary-foreground rounded-md" value="confirm">Simpan</button>
                        </div>
                      </form>
                    `
                    document.body.appendChild(modal)
                    
                    modal.addEventListener("close", async () => {
                      if (modal.returnValue === "confirm") {
                        const templateName = document.getElementById("template-name") as HTMLInputElement
                        const templateDesc = document.getElementById("template-desc") as HTMLTextAreaElement
                        
                        try {
                          const result = await saveProjectAsTemplate(
                            project.id,
                            templateName.value,
                            templateDesc.value
                          )
                          
                          if (result.error) {
                            toast({
                              title: "Error",
                              description: result.error,
                              variant: "destructive",
                            })
                          } else {
                            toast({
                              title: "Sukses",
                              description: "Proyek berhasil disimpan sebagai template",
                            })
                          }
                        } catch (error) {
                          toast({
                            title: "Error",
                            description: "Gagal menyimpan template",
                            variant: "destructive",
                          })
                        }
                      }
                      document.body.removeChild(modal)
                    })
                    
                    modal.showModal()
                  }}
                >
                  <SaveAll className="mr-2 h-4 w-4" />
                  Simpan sebagai Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleArchive}>
                  <FileText className="mr-2 h-4 w-4" />
                  Archive Project
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="grid gap-6 max-w-full">
          <Card className="w-full overflow-hidden max-w-full">
            <CardHeader>
              <CardTitle>Project Overviews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Status</div>
                  <div className="mt-1">
                    <Badge variant={project.status === "Completed" ? "default" : "secondary"}>
                      {project.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Progress</div>
                  <div className="mt-1">
                    <Progress value={project.progress} className="h-2" />
                    <div className="mt-1 text-sm text-muted-foreground">{project.progress}%</div>
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Timeline</div>
                  <div className="mt-1">
                    {project.startDate && project.endDate ? (
                      <div className="text-sm">
                        {format(parseISO(project.startDate), "MMM d, yyyy")} -{" "}
                        {format(parseISO(project.endDate), "MMM d, yyyy")}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No dates set</div>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">Team Members</div>
                  <div className="mt-1 flex -space-x-2">
                    {project.team?.members?.map((member) => (
                      <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                        <AvatarImage src={member.user?.avatar || ""} alt={member.user?.name || 'Team Member'} />
                        <AvatarFallback>{member.user?.name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs 
            defaultValue="gantt" 
            value={activeTab} 
            onValueChange={(value) => setActiveTab(value)}
            className="space-y-4"
          >
            <TabsList>
              <TabsTrigger value="gantt">
                <Calendar className="mr-2 h-4 w-4" />
                Gantt
              </TabsTrigger>
              <TabsTrigger value="tasks">
                <FileText className="mr-2 h-4 w-4" />
                Tasks
              </TabsTrigger>
              <TabsTrigger value="risks">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Risks
              </TabsTrigger>
              <TabsTrigger value="workload">
                <BarChart className="mr-2 h-4 w-4" />
                Beban Kerja
              </TabsTrigger>
              <TabsTrigger value="team">
                <Users className="mr-2 h-4 w-4" />
                Team
              </TabsTrigger>
            </TabsList>
            
            <div className="w-full overflow-hidden">

              <TabsContent value="gantt" className="w-full">
                <Card className="w-full max-w-full">
                  <CardHeader className="pb-0">
                    <CardTitle>Project Timeline</CardTitle>
                    <CardDescription>Visual timeline of project tasks and dependencies</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 max-w-full">
                    <div className="w-full overflow-hidden rounded-md border" style={{ height: "calc(100vh - 300px)", minHeight: "500px", maxHeight: "600px" }}>
                      <GanttChart 
                        tasks={project.tasks || []} 
                        onTaskUpdated={forceUpdate}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tasks" className="space-y-4 w-full">
                <Card>
                  <CardHeader>
                    <CardTitle>Tasks</CardTitle>
                    <CardDescription>Manage project tasks and track progress</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TaskList
                      projectId={Number(projectId)}
                      tasks={project.tasks}
                      teamMembers={project.team?.members.map(member => ({
                        id: member.id,
                        name: member.user.name
                      })) || []}
                      onTaskUpdated={handleTaskCreated}
                      userRole={userRole}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="risks" className="space-y-4 w-full">
                {project && (
                  <RiskList 
                    projectId={project.id} 
                    initialRisks={project.risks}
                    onRiskUpdated={fetchProject}
                  />
                )}
              </TabsContent>

              <TabsContent value="workload" className="space-y-4 w-full">
                {project && project.team && project.team.members && project.tasks && (
                  <div className="max-w-full overflow-hidden">
                    <WorkloadHeatmap 
                      projectId={project.id}
                      tasks={adaptTasksForWorkloadHeatmap(project.tasks)}
                      teamMembers={project.team.members.map(member => ({
                        ...member,
                        user: member.user || {
                          id: 0,
                          name: 'Unknown',
                          email: '',
                          avatar: null
                        }
                      }))}
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="team" className="space-y-4 w-full">
                <Card>
                  <CardHeader>
                    <CardTitle>Tim Proyek</CardTitle>
                    <CardDescription>Anggota tim yang terlibat dalam proyek ini</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {project && project.team && project.team.members ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {project.team.members.map((member) => (
                            <Card key={member.id} className="flex flex-col">
                              <CardHeader className="pb-2">
                                <div className="flex items-center space-x-4">
                                  <Avatar>
                                    <AvatarImage src={member.user?.avatar || undefined} />
                                    <AvatarFallback>{member.user?.name?.charAt(0)?.toUpperCase() || '?'}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <CardTitle className="text-base">{member.user?.name || 'Unnamed Member'}</CardTitle>
                                    <CardDescription className="text-sm">{member.role}</CardDescription>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2">
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">Email: </span>
                                    <span>{member.user?.email}</span>
                                  </div>
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">Tugas Aktif: </span>
                                    <span>{project.tasks?.filter(task => task.assigneeId === member.user?.id && task.status !== 'COMPLETED').length || 0}</span>
                                  </div>
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">Tugas Selesai: </span>
                                    <span>{project.tasks?.filter(task => task.assigneeId === member.user?.id && task.status === 'COMPLETED').length || 0}</span>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <p className="text-muted-foreground">Belum ada anggota tim yang ditambahkan ke proyek ini.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </div>

          </Tabs>
        </div>
      </DashboardShell>
      <Toaster />

      {/* Delete Project Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

const handleSomeEvent = (e: React.SyntheticEvent) => {
  // Instead of:
  // console.log(e) // This could log [object Event]
  
  // Use:
  console.log('Event type:', e.type)
  console.log('Event target:', e.target)
  // Or handle the event properly
}