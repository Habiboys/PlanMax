"use client"

import { useToast } from "@/hooks/use-toast"
import { Edit, Info, MoreVertical, PlusCircle, Trash2, UserPlus } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

import { addTeamMember, deleteTeam, getUserTeams } from "@/app/actions/team-actions"
import { TeamInvitations } from "@/components/team-invitations"
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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Toaster } from "@/components/ui/toaster"

interface TeamMember {
  id: number
  name: string
  avatar: string
  role: string
}

interface Team {
  id: string
  name: string
  description: string
  projects: number
  members: TeamMember[]
  role: string
}

export default function TeamsPage() {
  const { toast } = useToast()
  const [teams, setTeams] = useState<Team[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAddMemberDialogOpen, setIsAddMemberDialogOpen] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const [newTeam, setNewTeam] = useState({ name: "", description: "" })
  const [newMember, setNewMember] = useState({ email: "", role: "MEMBER" })
  const [isCreatingTeam, setIsCreatingTeam] = useState(false)
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [teamToDelete, setTeamToDelete] = useState<{ id: string | null; name: string }>({ id: null, name: "" })
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

  const handleCreateTeam = async (e: React.FormEvent) => {
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
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Server error: ${response.status}`)
      }
      
      const result = await response.json()
      
      if (result.success) {
        // Refresh teams list
        const updatedTeams = await getUserTeams()
        if (updatedTeams.teams) {
          setTeams(updatedTeams.teams)
        }
        
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
    } catch (error: unknown) {
      console.error("Error creating team:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to create team. Please try again."
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsCreatingTeam(false)
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
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

  const openDeleteConfirmation = (team: Team) => {
    setTeamToDelete({ id: team.id, name: team.name })
    setIsDeleteDialogOpen(true)
  }

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newMember.email) {
      toast({
        title: "Email required",
        description: "Please enter the email of the member you want to add.",
        variant: "destructive",
      })
      return
    }

    if (!selectedTeamId) {
      toast({
        title: "Team selection required",
        description: "Please select a team to add the member to.",
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
        if (updatedTeams.teams) {
          setTeams(updatedTeams.teams)
        }
        
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
        
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Tim Saya</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Buat Tim Baru
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Buat Tim Baru</DialogTitle>
                <DialogDescription>
                  Buat tim baru untuk berkolaborasi dengan anggota tim Anda.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateTeam}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="team-name">Nama Tim</Label>
                    <Input
                      id="team-name"
                      value={newTeam.name}
                      onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                      placeholder="Masukkan nama tim"
                      disabled={isCreatingTeam}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="team-description">Deskripsi</Label>
                    <Textarea
                      id="team-description"
                      value={newTeam.description}
                      onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                      placeholder="Masukkan deskripsi tim (opsional)"
                      className="resize-none"
                      disabled={isCreatingTeam}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isCreatingTeam}>
                    {isCreatingTeam ? "Membuat..." : "Buat Tim"}
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
                <CardTitle className="flex items-center justify-between">
                  <span>{team.name}</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Aksi Tim</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/teams/${team.id}`} className="flex items-center">
                          <Info className="mr-2 h-4 w-4" />
                          Lihat Detail
                        </Link>
                      </DropdownMenuItem>
                      {team.role === "OWNER" && (
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/teams/${team.id}`} className="flex items-center">
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Tim
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {(team.role === "OWNER" || team.role === "ADMIN") && (
                        <DropdownMenuItem onSelect={() => {
                          setSelectedTeamId(team.id)
                          setIsAddMemberDialogOpen(true)
                        }}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Tambah Anggota
                        </DropdownMenuItem>
                      )}
                      {team.role === "OWNER" && (
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => openDeleteConfirmation(team)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Hapus Tim
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardTitle>
                <CardDescription>{team.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Anggota:</span>
                    <span>{team.members.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Proyek:</span>
                    <span>{team.projects || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Peran Anda:</span>
                    <span>{team.role}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" asChild>
                  <Link href={`/dashboard/teams/${team.id}`}>
                    <Info className="mr-2 h-4 w-4" />
                    Detail Tim
                  </Link>
                </Button>
                {(team.role === "OWNER" || team.role === "ADMIN") && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedTeamId(team.id)
                      setIsAddMemberDialogOpen(true)
                    }}
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Tambah Anggota
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>

      {/* Dialog Tambah Anggota */}
      <Dialog open={isAddMemberDialogOpen} onOpenChange={setIsAddMemberDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah Anggota Tim</DialogTitle>
            <DialogDescription>
              Undang anggota baru ke tim Anda dengan mengirimkan undangan email.
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
                  placeholder="email@contoh.com"
                  disabled={isAddingMember}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Peran</Label>
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
                {isAddingMember ? "Menambahkan..." : "Tambah Anggota"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Konfirmasi Hapus Tim */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Tim</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus tim "{teamToDelete.name}"? Tindakan ini tidak dapat dibatalkan.
              Semua data tim, termasuk keanggotaan tim akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (teamToDelete.id) {
                  handleDeleteTeam(teamToDelete.id)
                }
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Menghapus..." : "Hapus Tim"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Toaster />
    </div>
  )
}