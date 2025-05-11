"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, Mail, Plus, Trash2, UserPlus, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AppHeader } from "@/components/app-header"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
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
  
  const teamId = Number(params.teamId)
  const [team, setTeam] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [newMember, setNewMember] = useState({ email: "", role: "Member" })
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    // Simulasi pengambilan data tim
    const fetchTeam = () => {
      setIsLoading(true)
      const foundTeam = mockTeams.find(t => t.id === teamId)
      
      if (foundTeam) {
        setTeam(foundTeam)
      }
      
      setIsLoading(false)
    }
    
    fetchTeam()
  }, [teamId])

  const handleAddMember = () => {
    if (!newMember.email) {
      toast({
        title: "Email diperlukan",
        description: "Silakan masukkan email anggota tim baru.",
        variant: "destructive",
      })
      return
    }

    // Simulasi penambahan anggota baru
    const updatedTeam = { ...team }
    const newMemberId = Math.max(0, ...team.members.map((m: any) => m.id)) + 1
    
    updatedTeam.members.push({
      id: newMemberId,
      name: newMember.email.split('@')[0], // Nama sederhana dari email
      email: newMember.email,
      avatar: "",
      role: newMember.role
    })
    
    setTeam(updatedTeam)
    setNewMember({ email: "", role: "Member" })
    setIsDialogOpen(false)
    
    toast({
      title: "Anggota berhasil ditambahkan",
      description: `Undangan telah dikirim ke ${newMember.email}.`,
    })
  }

  const handleRemoveMember = (memberId: number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus anggota ini dari tim?")) {
      return
    }
    
    const updatedTeam = { ...team }
    updatedTeam.members = team.members.filter((m: any) => m.id !== memberId)
    
    setTeam(updatedTeam)
    
    toast({
      title: "Anggota dihapus",
      description: "Anggota telah dihapus dari tim.",
    })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <DashboardShell>
          <div className="flex items-center gap-4">
            <Link href="/dashboard/teams">
              <Button variant="outline" size="icon" className="h-7 w-7">
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Kembali</span>
              </Button>
            </Link>
            <div className="h-6 w-48 rounded-md bg-muted animate-pulse" />
          </div>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="h-5 w-32 rounded-md bg-muted animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-20 rounded-md bg-muted animate-pulse" />
              </CardContent>
            </Card>
          </div>
        </DashboardShell>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <DashboardShell>
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
        </DashboardShell>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <DashboardShell>
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
                  <Input id="team-name" value={team.name} onChange={(e) => setTeam({ ...team, name: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="team-description">Deskripsi</Label>
                  <Input 
                    id="team-description" 
                    value={team.description} 
                    onChange={(e) => setTeam({ ...team, description: e.target.value })} 
                  />
                </div>
                <Button className="w-full">Simpan Perubahan</Button>
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
              </CardTitle>
              <CardDescription>Kelola anggota tim dan peran mereka</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {team.members.length > 0 ? (
                  <div className="divide-y">
                    {team.members.map((member: any) => (
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
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemoveMember(member.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
      </DashboardShell>
    </div>
  )
}