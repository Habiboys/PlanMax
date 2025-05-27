"use client"

import { useState, useEffect } from "react"
import { Edit, Trash2, Plus, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { getRisks, deleteRisk } from "@/app/actions/project-actions"
import { RiskForm } from "@/components/risk-form"

interface Risk {
  id: number
  name: string
  description: string | null
  impact: string
  probability: string
  mitigation: string | null
  status: string
  projectId: number
  createdAt: Date
  updatedAt: Date
}

interface RiskListProps {
  projectId: number
  initialRisks?: Risk[]
  onRiskUpdated?: () => void
}

export function RiskList({ projectId, initialRisks = [], onRiskUpdated }: RiskListProps) {
  const { toast } = useToast()
  const [risks, setRisks] = useState<Risk[]>(initialRisks)
  const [loading, setLoading] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Fungsi untuk memuat data risiko
  const loadRisks = async () => {
    setLoading(true)
    try {
      const result = await getRisks(projectId)
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        setRisks(result.risks || [])
        if (onRiskUpdated) {
          onRiskUpdated()
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat memuat risiko",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Memuat data saat komponen dimuat atau refresh dipicu
  useEffect(() => {
    if (refreshTrigger > 0) {
      loadRisks()
    }
  }, [projectId, refreshTrigger])

  // Fungsi untuk menangani penghapusan risiko
  const handleDelete = async (id: number) => {
    try {
      const result = await deleteRisk(id)
      if (result.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Sukses",
          description: "Risiko berhasil dihapus",
        })
        // Refresh data
        setRefreshTrigger(prev => prev + 1)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menghapus risiko",
        variant: "destructive",
      })
    } finally {
      setIsDeleteDialogOpen(false)
    }
  }

  // Fungsi untuk mendapatkan warna badge berdasarkan status risiko
  const getRiskStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "identified":
        return "bg-blue-500"
      case "analyzed":
        return "bg-yellow-500"
      case "monitored":
        return "bg-purple-500"
      case "resolved":
        return "bg-green-500"
      case "closed":
        return "bg-green-700"
      default:
        return "bg-gray-500"
    }
  }

  // Fungsi untuk mendapatkan warna badge berdasarkan impact risiko
  const getRiskImpactColor = (impact: string) => {
    switch (impact.toLowerCase()) {
      case "high":
        return "bg-red-500"
      case "medium":
        return "bg-orange-500"
      case "low":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  // Fungsi untuk mendapatkan warna badge berdasarkan probability risiko
  const getRiskProbabilityColor = (probability: string) => {
    switch (probability.toLowerCase()) {
      case "high":
        return "bg-red-500"
      case "medium":
        return "bg-orange-500"
      case "low":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  // Fungsi untuk menangani ketika form disimpan
  const handleFormSubmit = () => {
    setIsAddDialogOpen(false)
    setIsEditDialogOpen(false)
    setSelectedRisk(null)
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Risiko Proyek</CardTitle>
          <CardDescription>Daftar risiko yang teridentifikasi dalam proyek</CardDescription>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Risiko
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Risiko Baru</DialogTitle>
              <DialogDescription>
                Tambahkan risiko baru ke dalam proyek
              </DialogDescription>
            </DialogHeader>
            <RiskForm
              projectId={projectId}
              onSuccess={handleFormSubmit}
              onCancel={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : risks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mb-2" />
            <p>Belum ada risiko yang diidentifikasi untuk proyek ini</p>
            <p className="text-sm">Tambahkan risiko untuk membantu mengidentifikasi potensi masalah</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Risiko</TableHead>
                  <TableHead>Dampak</TableHead>
                  <TableHead>Probabilitas</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {risks.map((risk) => (
                  <TableRow key={risk.id}>
                    <TableCell className="font-medium">{risk.name}</TableCell>
                    <TableCell>
                      <Badge className={getRiskImpactColor(risk.impact)}>{risk.impact}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRiskProbabilityColor(risk.probability)}>{risk.probability}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getRiskStatusColor(risk.status)}>{risk.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Dialog open={isEditDialogOpen && selectedRisk?.id === risk.id} onOpenChange={(open) => {
                          setIsEditDialogOpen(open)
                          if (!open) setSelectedRisk(null)
                        }}>
                          <DialogTrigger asChild>
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              onClick={() => {
                                setSelectedRisk(risk)
                                setIsEditDialogOpen(true)
                              }}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Risiko</DialogTitle>
                              <DialogDescription>
                                Ubah detail risiko yang dipilih
                              </DialogDescription>
                            </DialogHeader>
                            <RiskForm
                              projectId={projectId}
                              risk={risk}
                              onSuccess={handleFormSubmit}
                              onCancel={() => setIsEditDialogOpen(false)}
                            />
                          </DialogContent>
                        </Dialog>

                        <Dialog open={isDeleteDialogOpen && selectedRisk?.id === risk.id} onOpenChange={(open) => {
                          setIsDeleteDialogOpen(open)
                          if (!open) setSelectedRisk(null)
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setSelectedRisk(risk)
                                setIsDeleteDialogOpen(true)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Hapus Risiko</DialogTitle>
                              <DialogDescription>
                                Apakah Anda yakin ingin menghapus risiko ini? Tindakan ini tidak dapat dibatalkan.
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setIsDeleteDialogOpen(false)}
                              >
                                Batal
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => handleDelete(risk.id)}
                              >
                                Hapus
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 