"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { ChevronDown, Filter, Search, Settings } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { ProjectCard } from "@/components/project-card"
import { NewProjectForm } from "@/components/new-project-form"
import { getUserProjects, deleteProject } from "@/app/actions/project-actions"
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

export default function DashboardPage() {
  const { data: session } = useSession()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [projects, setProjects] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProjects = async () => {
      setIsLoading(true)
      try {
        const result = await getUserProjects()
        if (result.error) {
          toast({
            title: "Error",
            description: result.error,
            variant: "destructive",
          })
        } else {
          setProjects(result.projects)
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load projects. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchProjects()
  }, [toast])

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const activeProjects = filteredProjects.filter((project) => project.status === "In Progress")
  const completedProjects = filteredProjects.filter((project) => project.status === "Completed")
  const archivedProjects = filteredProjects.filter((project) => project.status === "Archived")

  const refreshProjects = async () => {
    try {
      const result = await getUserProjects()
      if (!result.error) {
        setProjects(result.projects)
      }
    } catch (error) {
      console.error("Error refreshing projects:", error)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardShell>
        <DashboardHeader
          heading="Projects"
          text={`Welcome back, ${session?.user?.name?.split(" ")[0] || "User"}. Manage your smart project plans.`}
        >
          <NewProjectForm />
        </DashboardHeader>
        <div className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search projects..."
                  className="w-full pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" className="h-9 gap-1">
                <Filter className="h-3.5 w-3.5" />
                <span>Filter</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <span>Sort</span>
                    <ChevronDown className="ml-2 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>Name (A-Z)</DropdownMenuItem>
                  <DropdownMenuItem>Name (Z-A)</DropdownMenuItem>
                  <DropdownMenuItem>Due Date (Earliest)</DropdownMenuItem>
                  <DropdownMenuItem>Due Date (Latest)</DropdownMenuItem>
                  <DropdownMenuItem>Progress (Highest)</DropdownMenuItem>
                  <DropdownMenuItem>Progress (Lowest)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 w-9 px-0">
                    <Settings className="h-4 w-4" />
                    <span className="sr-only">Settings</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>View Settings</DropdownMenuItem>
                  <DropdownMenuItem>Import Projects</DropdownMenuItem>
                  <DropdownMenuItem>Export Data</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All Projects</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="archived">Archived</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-[220px] rounded-lg border bg-muted/40 p-6 animate-pulse" />
                  ))}
                </div>
              ) : filteredProjects.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredProjects.map((project) => (
                    <ProjectCard 
                      key={project.id} 
                      project={project} 
                      onDelete={refreshProjects}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex h-[450px] items-center justify-center rounded-md border border-dashed">
                  <div className="flex flex-col items-center justify-center space-y-2 text-center">
                    <div className="rounded-full bg-muted p-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-6 w-6 text-muted-foreground"
                      >
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold">No projects found</h3>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery
                        ? "No projects match your search. Try a different query."
                        : "Get started by creating a new project."}
                    </p>
                    {!searchQuery && <NewProjectForm />}
                  </div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="active" className="mt-4">
              {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-[220px] rounded-lg border bg-muted/40 p-6 animate-pulse" />
                  ))}
                </div>
              ) : activeProjects.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {activeProjects.map((project) => (
                    <ProjectCard 
                      key={project.id} 
                      project={project} 
                      onDelete={refreshProjects}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex h-[450px] items-center justify-center rounded-md border border-dashed">
                  <div className="flex flex-col items-center justify-center space-y-2 text-center">
                    <div className="rounded-full bg-muted p-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-6 w-6 text-muted-foreground"
                      >
                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold">No active projects</h3>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? "No active projects match your search." : "Create a new project to get started."}
                    </p>
                    {!searchQuery && <NewProjectForm />}
                  </div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="completed" className="mt-4">
              {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="h-[220px] rounded-lg border bg-muted/40 p-6 animate-pulse" />
                </div>
              ) : completedProjects.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {completedProjects.map((project) => (
                    <ProjectCard 
                      key={project.id} 
                      project={project} 
                      onDelete={refreshProjects}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex h-[450px] items-center justify-center rounded-md border border-dashed">
                  <div className="flex flex-col items-center justify-center space-y-2 text-center">
                    <div className="rounded-full bg-muted p-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-6 w-6 text-muted-foreground"
                      >
                        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold">No completed projects</h3>
                    <p className="text-sm text-muted-foreground">Complete your active projects to see them here.</p>
                  </div>
                </div>
              )}
            </TabsContent>
            <TabsContent value="archived" className="mt-4">
              {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="h-[220px] rounded-lg border bg-muted/40 p-6 animate-pulse" />
                </div>
              ) : archivedProjects.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {archivedProjects.map((project) => (
                    <ProjectCard 
                      key={project.id} 
                      project={project} 
                      onDelete={refreshProjects}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex h-[450px] items-center justify-center rounded-md border border-dashed">
                  <div className="flex flex-col items-center justify-center space-y-2 text-center">
                    <div className="rounded-full bg-muted p-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-6 w-6 text-muted-foreground"
                      >
                        <rect width="20" height="5" x="2" y="3" rx="1" />
                        <path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8" />
                        <path d="M10 12h4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold">No archived projects</h3>
                    <p className="text-sm text-muted-foreground">You haven&apos;t archived any projects yet.</p>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DashboardShell>
    </div>
  )
}
