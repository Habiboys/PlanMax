"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AppHeader } from "@/components/app-header"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { useToast } from "@/hooks/use-toast"
import { assignTeamToProject, getUserTeams } from "@/app/actions/team-actions"
import { getProject } from "@/app/actions/project-actions"

export default function ProjectTeamPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [teams, setTeams] = useState<any[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [project, setProject] = useState<any>(null)

  const projectId = Number.parseInt(params.projectId as string)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Ambil data tim pengguna
        const teamsResult = await getUserTeams()
        if (teamsResult.teams) {
          setTeams(teamsResult.teams)
        }

        // Ambil data project
        const projectResult = await getProject(projectId)
        if (!projectResult.error) {
          setProject(projectResult.project)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Gagal mengambil data. Silakan coba lagi.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [projectId, toast])

  const handleAssignTeam = async () => {
    if (!selectedTeamId) {
      toast({
        title: "Tim diperlukan",
        description: "Silakan pilih tim untuk ditugaskan ke project ini.",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append("teamId", selectedTeamId)

      const result = await assignTeamToProject(projectId, formData)
      
      if (result.success) {
        toast({
          title: "Tim berhasil ditugaskan",
          description: "Tim telah berhasil ditugaskan ke project ini.",
        })
        router.push(`/dashboard/${projectId}`)
      } else {
        toast({
          title: "Gagal menugaskan tim",
          description: result.error || "Terjadi kesalahan saat menugaskan tim.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error assigning team:", error)
      toast({
        title: "Error",
        description: "Gagal menugaskan tim. Silakan coba lagi.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <DashboardShell>
        <DashboardHeader>
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/${projectId}`}>
              <Button variant="outline" size="icon" className="h-7 w-7">
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Back</span>
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Assign Team to Project</h1>
              <p className="text-sm text-muted-foreground">
                {project ? `Project: ${project.name}` : "Loading project data..."}
              </p>
            </div>
          </div>
        </DashboardHeader>

        <Card>
          <CardHeader>
            <CardTitle>Select Team</CardTitle>
            <CardDescription>
              Choose a team to assign to this project. All team members will be added to the project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Select
                  value={selectedTeamId}
                  onValueChange={setSelectedTeamId}
                  disabled={isLoading || teams.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id.toString()}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {teams.length === 0 && !isLoading && (
                  <p className="text-sm text-muted-foreground">
                    You don't have any teams yet. <Link href="/dashboard/teams" className="text-primary underline">Create a new team</Link> first.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard/${projectId}`)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleAssignTeam} 
                  disabled={isLoading || isSubmitting || !selectedTeamId}
                >
                  {isSubmitting ? "Assigning..." : "Assign Team"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </DashboardShell>
    </div>
  )
}