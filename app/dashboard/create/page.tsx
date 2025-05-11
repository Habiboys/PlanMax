"use client"  // Add this at the top of the file

import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Plus, X } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Toaster } from "@/components/ui/toaster"
import { AppHeader } from "@/components/app-header"
import { createProject } from "@/app/actions/project-actions"

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

export default function CreateProjectPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<string>("")
  const [teamMembers, setTeamMembers] = useState<{ id: string; email: string }[]>([])

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
    fetchTeams()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const formData = new FormData(e.currentTarget)
      
      // Tambahkan team ID ke formData
      if (selectedTeamId) {
        formData.append("teamId", selectedTeamId)
      }
      
      // Tambahkan team members ke formData
      teamMembers.forEach((member, index) => {
        formData.append(`teamMembers[${index}][email]`, member.email)
      })

      const result = await createProject(formData)

      if (result.success) {
        toast({
          title: "Success",
          description: "Project created successfully",
        })
        router.push(`/dashboard/${result.projectId}`)
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create project",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const addTeamMember = () => {
    setTeamMembers([...teamMembers, { id: Date.now().toString(), email: "" }])
  }

  const removeTeamMember = (id: string) => {
    setTeamMembers(teamMembers.filter(member => member.id !== id))
  }

  const updateTeamMemberEmail = (id: string, email: string) => {
    setTeamMembers(teamMembers.map(member => 
      member.id === id ? { ...member, email } : member
    ))
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="flex-1">
        <div className="container mx-auto py-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Create New Project</h1>
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Project Details</CardTitle>
              <CardDescription>Fill in the details to create a new project</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Project Name</Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      placeholder="Enter project name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      name="description"
                      placeholder="Enter project description"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        name="startDate"
                        type="date"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        name="endDate"
                        type="date"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select name="status" defaultValue="Not Started">
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Not Started">Not Started</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="On Hold">On Hold</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="team">Select Team</Label>
                    <Select 
                      name="teamId" 
                      value={selectedTeamId}
                      onValueChange={setSelectedTeamId}
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
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label>Additional Team Members</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addTeamMember}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Member
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {teamMembers.map((member) => (
                        <div key={member.id} className="flex gap-2">
                          <Input
                            type="email"
                            placeholder="Enter member email"
                            value={member.email}
                            onChange={(e) => updateTeamMemberEmail(member.id, e.target.value)}
                            required
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => removeTeamMember(member.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Project"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Toaster />
    </div>
  )
}