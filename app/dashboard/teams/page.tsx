"use client"

import { useState, useEffect } from "react"
import { PlusCircle, UserPlus, Trash2, Settings, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { getUserTeams, createTeam, deleteTeam, addTeamMember } from "@/app/actions/team-actions"
import { Toaster } from "@/components/ui/toaster"
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
import { TeamInvitations } from "@/components/team-invitations"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Skeleton } from "@/components/ui/skeleton"

export default function TeamsPage() {
  const { toast } = useToast()
  const [teams, setTeams] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [newTeam, setNewTeam] = useState({ name: "", description: "" })
  const [newMember, setNewMember] = useState({ email: "", role: "MEMBER" })
  const [isCreatingTeam, setIsCreatingTeam] = useState(false)
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [teamToDelete, setTeamToDelete] = useState({ id: null, name: "" })
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    async function fetchTeams() {
      try {
        const result = await getUserTeams()
        if (result.teams) {
          setTeams(result.teams)
        }
        if (result.error) {
          toast({
            title: "Error",
            description: "Failed to fetch teams data. Please try again.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error fetching teams:", error)
        toast({
          title: "Error",
          description: "Gagal mengambil data tim. Silakan coba lagi.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchTeams()
  }, [toast])

  const handleCreateTeam = async (e) => {
    e.preventDefault()
    
    if (!newTeam.name) {
      toast({
        title: "Team name required",
        description: "Please enter a name for your new team.",
        variant: "destructive",
      })
      return
    }

    setIsCreatingTeam(true)

    try {
      const response = await fetch("/api/teams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: String(newTeam.name),
          description: newTeam.description || "",
        }),
      });
      
      // Periksa status respons terlebih dahulu
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Server error: ${response.status}`);
      }
      
      // Coba parse sebagai JSON hanya jika respons OK
      const result = await response.json();
      
      if (result.success) {
        // Refresh teams list
        const updatedTeams = await getUserTeams()
        setTeams(updatedTeams.teams)
        
        setNewTeam({ name: "", description: "" })
        setIsDialogOpen(false)

        toast({
          title: "Team created successfully",
          description: `Team "${newTeam.name}" has been created successfully.`,
        })
      } else {
        toast({
          title: "Failed to create team",
          description: result.error || "An error occurred while creating the team.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error creating team:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to create team. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreatingTeam(false)
    }
  }

  const handleDeleteTeam = async (teamId) => {
    setIsDeleting(true)
    
    try {
      const result = await deleteTeam(teamId)
      
      if (result.success) {
        // Update local state
        setTeams(teams.filter(team => team.id !== teamId))
        
        toast({
          title: "Team deleted successfully",
          description: "The team has been deleted successfully.",
        })
      } else {
        toast({
          title: "Failed to delete team",
          description: result.error || "An error occurred while deleting the team.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error deleting team:", error)
      toast({
        title: "Error",
        description: "Failed to delete team. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
    }
  }

  const openDeleteConfirmation = (team) => {
    setTeamToDelete({ id: team.id, name: team.name })
    setIsDeleteDialogOpen(true)
  }

  const handleAddMember = async (e) => {
    e.preventDefault()
    
    if (!newMember.email) {
      toast({
        title: "Email required",
        description: "Please enter the email of the member you want to add.",
        variant: "destructive",
      })
      return
    }

    setIsAddingMember(true)

    try {
      const formData = new FormData()
      formData.append("email", newMember.email)
      formData.append("role", newMember.role)

      const result = await addTeamMember(selectedTeamId, formData)
      
      if (result.success) {
        // Refresh teams list
        const updatedTeams = await getUserTeams()
        setTeams(updatedTeams.teams)
        
        setNewMember({ email: "", role: "MEMBER" })
        setIsAddMemberDialogOpen(false)

        toast({
          title: "Member added successfully",
          description: `Member with email "${newMember.email}" has been added to the team.`,
        })
      } else {
        toast({
          title: "Failed to add member",
          description: result.error || "An error occurred while adding the member.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding team member:", error)
      toast({
        title: "Error",
        description: "Failed to add team member. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAddingMember(false)
    }
  }

  if (isLoading) {
    return (
      <div className="py-6">
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="h-9 w-32" />
            </CardFooter>
          </Card>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Skeleton className="h-9 w-36" />
                  <div className="flex space-x-2">
                    <Skeleton className="h-9 w-9" />
                    <Skeleton className="h-9 w-9" />
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-6">
      <div className="grid gap-6">
        <TeamInvitations />
        
        {/* Tambahkan tombol Create Team di sini */}
        <div className="flex justify-end mb-4">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
                <DialogDescription>
                  Create a new team to collaborate with your team members.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTeam}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="team-name">Team Name</Label>
                    <Input
                      id="team-name"
                      value={newTeam.name}
                      onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                      placeholder="Enter team name"
                      disabled={isCreatingTeam}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="team-description">Description</Label>
                    <Textarea
                      id="team-description"
                      value={newTeam.description}
                      onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                      placeholder="Enter team description (optional)"
                      className="resize-none"
                      disabled={isCreatingTeam}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isCreatingTeam}>
                    {isCreatingTeam ? "Creating..." : "Create Team"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader>
                <CardTitle>{team.name}</CardTitle>
                <CardDescription>{team.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Members:</span>
                    <span>{team.members.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Projects:</span>
                    <span>{team.projects?.length || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Your Role:</span>
                    <span>{team.role}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                {team.role === "OWNER" || team.role === "ADMIN" ? (
                  <Dialog open={isAddMemberDialogOpen && selectedTeamId === team.id} onOpenChange={(open) => {
                    setIsAddMemberDialogOpen(open)
                    if (open) setSelectedTeamId(team.id)
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Member
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Team Member</DialogTitle>
                        <DialogDescription>
                          Add a new member to team "{team.name}".
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleAddMember}>
                        <div className="grid gap-4 py-4">
                          <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              value={newMember.email}
                              onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                              placeholder="email@example.com"
                              disabled={isAddingMember}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="role">Role</Label>
                            <select
                              id="role"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                              value={newMember.role}
                              onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                              disabled={isAddingMember}
                            >
                              <option value="MEMBER">Member</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit" disabled={isAddingMember}>
                            {isAddingMember ? "Adding..." : "Add Member"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Only admins can add members
                  </div>
                )}
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                  {team.role === "OWNER" && (
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      onClick={() => openDeleteConfirmation(team)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
      <Toaster />
      
      {/* Modal Konfirmasi Hapus Tim */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Team Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the team "{teamToDelete.name}"? This action cannot be undone.
              All team data, including team membership will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteTeam(teamToDelete.id)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Team"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}