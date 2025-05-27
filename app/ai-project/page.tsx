"use client"

import { useState } from "react"
import { format } from "date-fns"
import { SendIcon, CalendarIcon } from "lucide-react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { AppHeader } from "@/components/app-header"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export default function AiProjectCreator() {
  const router = useRouter()
  const { data: session } = useSession()
  const { toast } = useToast()
  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()
  const [startDateOpen, setStartDateOpen] = useState(false)
  const [endDateOpen, setEndDateOpen] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!prompt.trim()) {
      toast({
        title: "Prompt tidak boleh kosong",
        description: "Masukkan deskripsi project yang ingin dibuat",
        variant: "destructive"
      })
      return
    }

    if (!startDate || !endDate) {
      toast({
        title: "Tanggal harus diisi",
        description: "Pilih tanggal mulai dan selesai project",
        variant: "destructive"
      })
      return
    }

    if (endDate < startDate) {
      toast({
        title: "Tanggal tidak valid",
        description: "Tanggal selesai harus setelah tanggal mulai",
        variant: "destructive"
      })
      return
    }
    
    setLoading(true)
    
    try {
      const response = await fetch("/api/ai/project-creator", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ 
          prompt,
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setResult(data)
        toast({
          title: "Project berhasil dibuat!",
          description: `Project "${data.project.name}" telah dibuat dengan ${data.tasks?.length || 0} task.`,
        })
        
        // Arahkan ke halaman project baru setelah 2 detik
        setTimeout(() => {
          router.push(`/dashboard/${data.project.id}`)
        }, 2000)
      } else {
        throw new Error(data.error || "Terjadi kesalahan saat membuat project")
      }
    } catch (error: any) {
      toast({
        title: "Gagal membuat project",
        description: error.message || "Terjadi kesalahan saat memproses permintaan",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setPrompt("")
    setStartDate(undefined)
    setEndDate(undefined)
    setResult(null)
  }

  const handleExampleClick = (example: string) => {
    setPrompt(example)
    
    // Jika tanggal sudah dipilih, langsung submit form
    if (startDate && endDate) {
      const formEvent = new Event('submit', { cancelable: true })
      document.querySelector('form')?.dispatchEvent(formEvent)
    } else {
      toast({
        title: "Pilih tanggal",
        description: "Silakan pilih tanggal mulai dan selesai project terlebih dahulu",
        variant: "default"
      })
    }
  }

  const promptExamples = [
    "Buat project 'Website E-commerce' dengan tim 3 orang: frontend developer, backend developer, dan designer. Task-nya meliputi setup database, membuat UI homepage, mengembangkan sistem login, dan fitur keranjang belanja.",
    "Buat project 'Mobile App Development' untuk aplikasi todo list. Butuh iOS developer, Android developer, dan UI/UX designer. Targetkan selesai dalam 2 bulan.",
    "Buat project 'Content Marketing Campaign' dengan tim marketing, copywriter, dan designer. Task meliputi riset keyword, membuat konten blog, dan desain social media post."
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />

      <DashboardShell>
        <DashboardHeader
          heading="AI Project Creator"
          text="Buat project lengkap dengan task dan tim hanya dengan menjelaskannya dalam teks."
        />

        <div className="grid gap-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Card className="p-6">
              <div className="space-y-2">
                <h3 className="text-lg font-medium">Jelaskan project Anda</h3>
                <p className="text-sm text-muted-foreground">
                  Jelaskan project yang ingin Anda buat, termasuk anggota tim dan task-task yang diperlukan.
                </p>
              </div>
              
              <div className="mt-4">
                <Textarea
                  placeholder="Contoh: Buat project website e-commerce dengan tim 4 orang dan deadline 2 bulan. Task meliputi setup database, desain UI, integrasi payment gateway..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label>Tanggal Mulai Project</Label>
                  <Popover open={startDateOpen} onOpenChange={setStartDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Pilih tanggal"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => {
                          setStartDate(date)
                          setStartDateOpen(false)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Selesai Project</Label>
                  <Popover open={endDateOpen} onOpenChange={setEndDateOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Pilih tanggal"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => {
                          setEndDate(date)
                          setEndDateOpen(false)
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              
              <div className="mt-6 flex flex-col gap-2">
                <p className="text-sm text-muted-foreground">Contoh prompt:</p>
                <div className="flex flex-wrap gap-2">
                  {promptExamples.map((example, i) => (
                    <Button 
                      key={i} 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleExampleClick(example)}
                      className="text-xs"
                    >
                      Contoh {i + 1}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
            
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={handleReset} disabled={loading}>
                Reset
              </Button>
              <Button type="submit" disabled={loading || !prompt.trim() || !startDate || !endDate}>
                {loading ? (
                  <>
                    <span className="animate-spin mr-2">
                      ⏳
                    </span>
                    Membuat Project...
                  </>
                ) : (
                  <>
                    <SendIcon className="mr-2 h-4 w-4" />
                    Buat Project
                  </>
                )}
              </Button>
            </div>
          </form>

          {result && (
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Project berhasil dibuat!</h3>
                  <p className="text-sm text-muted-foreground">
                    Project "{result.project.name}" telah dibuat dengan {result.tasks?.length || 0} task.
                  </p>
                </div>
                
                <div className="rounded-md bg-muted p-4">
                  <h4 className="font-medium mb-2">Nama Project: {result.project.name}</h4>
                  <p className="text-sm mb-2">{result.project.description}</p>
                  
                  {result.team && result.team.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-1">Tim:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {result.team.map((member: any, i: number) => (
                          <li key={i} className="text-sm">
                            {member.name || member.email} ({member.role})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {result.tasks && result.tasks.length > 0 && (
                    <div className="mt-4">
                      <h4 className="font-medium mb-1">Task:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {result.tasks.map((task: any, i: number) => (
                          <li key={i} className="text-sm">
                            {task.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                <Button onClick={() => router.push(`/dashboard/${result.project.id}`)}>
                  Lihat Project
                </Button>
              </div>
            </Card>
          )}
        </div>
      </DashboardShell>
    </div>
  )
} 