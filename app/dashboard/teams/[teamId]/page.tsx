"use client"

import { ChevronLeft, Info, Plus, Trash2, UserPlus, Users } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { addTeamMember, removeTeamMember, updateTeam } from "@/app/actions/team-actions"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

// Contoh data tim
const mockTeams = [
  {
    id: 1,
    name: "Tim Pengembangan",
    description: "Tim untuk pengembangan produk",
    members: [
      { id: 1, name: "John Doe", email: "john@example.com", avatar: "", role: "Admin" },
      { id: 2, name: "Jane Smith", email: "jane@example.com", avatar: "", role: "Member" },
    ],
  },
  {
    id: 2,
    name: "Tim Pemasaran",
    description: "Tim untuk strategi pemasaran",
    members: [
      { id: 3, name: "Bob Johnson", email: "bob@example.com", avatar: "", role: "Admin" },
    ],
  },
]

export default function TeamDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  
  const [team, setTeam] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [newMember, setNewMember] = useState({ email: "", role: "MEMBER" })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)

  useEffect(() => {
    const fetchTeam = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/teams/${params.teamId}`)
        if (!response.ok) {
          throw new Error("Failed to fetch team")
        }
        const data = await response.json()
        setTeam(data)
      } catch (error) {
        console.error("Error fetching team:", error)
        toast({
          title: "Error",
          description: "Gagal memuat data tim. Silakan coba lagi.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchTeam()
  }, [params.teamId, toast])

  const handleAddMember = async () => {
    if (!newMember.email) {
      toast({
        title: "Email diperlukan",
        description: "Silakan masukkan email anggota tim baru.",
        variant: "destructive",
      })
      return
    }

    try {
      const formData = new FormData()
      formData.append("email", newMember.email)
      formData.append("role", newMember.role)

      const result = await addTeamMember(params.teamId, formData)
      
      if (result.success) {
        toast({
          title: "Berhasil",
          description: result.message || "Undangan berhasil dikirim",
        })
        setNewMember({ email: "", role: "MEMBER" })
        setIsDialogOpen(false)
        router.refresh()
      } else {
        toast({
          title: "Gagal",
          description: result.error || "Gagal menambahkan anggota tim",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding team member:", error)
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menambahkan anggota tim",
        variant: "destructive",
      })
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (confirm("Apakah Anda yakin ingin menghapus anggota ini dari tim?")) {
      try {
        const result = await removeTeamMember(params.teamId, memberId)
        if (result.success) {
          toast({
            title: "Berhasil",
            description: "Anggota tim berhasil dihapus",
          })
          // Refresh data tim
          router.refresh()
        } else {
          toast({
            title: "Gagal",
            description: result.error || "Gagal menghapus anggota tim",
            variant: "destructive",
          })
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Terjadi kesalahan saat menghapus anggota tim",
          variant: "destructive",
        })
      }
    }
  }

  const handleViewMemberDetail = (member) => {
    setSelectedMember(member)
    setIsDetailDialogOpen(true)
  }

  const handleUpdateTeam = async () => {
    try {
      const formData = new FormData()
      formData.append("name", team.name)
      formData.append("description", team.description || "")

      const result = await updateTeam(params.teamId, formData)
      
      if (result.success) {
        toast({
          title: "Berhasil",
          description: "Informasi tim berhasil diperbarui",
        })
        router.refresh()
      } else {
        toast({
          title: "Gagal",
          description: result.error || "Gagal memperbarui informasi tim",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating team:", error)
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat memperbarui tim",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/teams">
            <Button variant="outline" size="icon" className="h-7 w-7">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Kembali</span>
            </Button>
          </Link>
          <div className="h-6 w-48 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="h-5 w-32 rounded-md bg-muted animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-20 rounded-md bg-muted animate-pulse" />
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex flex-col items-center justify-center space-y-4 py-12">
          <div className="rounded-full bg-muted p-4">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-bold">Tim Tidak Ditemukan</h2>
          <p className="text-muted-foreground">
            Tim yang Anda cari tidak ada atau Anda tidak memiliki akses ke tim tersebut.
          </p>
          <Button asChild>
            <Link href="/dashboard/teams">Kembali ke Daftar Tim</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="py-6">
      <div className="grid gap-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/teams">
            <Button variant="outline" size="icon" className="h-7 w-7">
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Kembali</span>
            </Button>
          </Link>
          <h2 className="text-2xl font-bold">{team.name}</h2>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Informasi Tim
              </CardTitle>
              <CardDescription>{team.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="team-name">Nama Tim</Label>
                  <Input 
                    id="team-name" 
                    value={team.name} 
                    onChange={(e) => setTeam({ ...team, name: e.target.value })}
                    disabled={team.userRole !== "OWNER"} 
                  />
                </div>
                <div>
                  <Label htmlFor="team-description">Deskripsi</Label>
                  <Input 
                    id="team-description" 
                    value={team.description || ""} 
                    onChange={(e) => setTeam({ ...team, description: e.target.value })}
                    disabled={team.userRole !== "OWNER"}
                  />
                </div>
                {team.userRole === "OWNER" && (
                  <Button 
                    className="w-full"
                    onClick={handleUpdateTeam}
                  >
                    Simpan Perubahan
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  Anggota Tim
                </span>
                {(team.userRole === "OWNER" || team.userRole === "ADMIN") && (
                  <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <Plus className="mr-2 h-4 w-4" />
                        Tambah Anggota
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Tambah Anggota Tim</DialogTitle>
                        <DialogDescription>
                          Undang anggota baru ke tim Anda dengan mengirimkan undangan email.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="member-email">Email</Label>
                          <Input
                            id="member-email"
                            placeholder="email@contoh.com"
                            type="email"
                            value={newMember.email}
                            onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Batal
                        </Button>
                        <Button onClick={handleAddMember}>Undang Anggota</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardTitle>
              <CardDescription>Kelola anggota tim dan peran mereka</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {team.members.length > 0 ? (
                  <div className="divide-y">
                    {team.members.map((member) => (
                      <div key={member.id} className="flex items-center justify-between py-3">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{member.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-sm text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{member.role}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewMemberDetail(member)}
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                          {member.role !== "OWNER" && team.userRole !== "MEMBER" && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Users className="mb-2 h-10 w-10 text-muted-foreground" />
                    <h3 className="text-lg font-medium">Belum ada anggota</h3>
                    <p className="text-sm text-muted-foreground">
                      Tambahkan anggota ke tim Anda untuk mulai berkolaborasi.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog Detail Anggota */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detail Anggota Tim</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg">
                    {selectedMember.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedMember.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Peran</span>
                  <span>{selectedMember.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Status</span>
                  <span className="text-green-600">Aktif</span>
                </div>
                {/* Tambahkan informasi lain yang relevan di sini */}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              Tutup
            </Button>
            {selectedMember && selectedMember.role !== "OWNER" && (
              <Button
                variant="destructive"
                onClick={() => {
                  handleRemoveMember(selectedMember.id)
                  setIsDetailDialogOpen(false)
                }}
              >
                Hapus Anggota
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}