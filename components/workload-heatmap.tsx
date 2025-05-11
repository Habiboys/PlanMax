"use client"

import { useState, useEffect } from "react"
import { Loader2, RotateCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import { addDays, format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, differenceInCalendarDays } from "date-fns"
import { id } from "date-fns/locale"
import { Button } from "@/components/ui/button"

export interface Task {
  id: number
  name: string
  startDate: string
  endDate: string
  assigneeId: number | null
  assignee: {
    id: number
    name: string
    avatar: string | null
  } | null
}

interface WorkloadData {
  user: {
    id: number
    name: string
    avatar: string | null
  }
  dailyTasks: {
    [date: string]: {
      count: number
      tasks: Task[]
    }
  }
}

interface WorkloadHeatmapProps {
  projectId: number
  tasks: Task[]
  teamMembers: {
    id: number
    user: {
      id: number
      name: string
      email?: string
      avatar: string | null
    }
    role: string
  }[]
}

export function WorkloadHeatmap({ projectId, tasks, teamMembers }: WorkloadHeatmapProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [workloadData, setWorkloadData] = useState<WorkloadData[]>([])
  const [selectedWorkloadView, setSelectedWorkloadView] = useState<string>("month")
  const [error, setError] = useState<string | null>(null)

  // Daftar bulan untuk selector
  const months = [
    { value: 0, label: "Januari" },
    { value: 1, label: "Februari" },
    { value: 2, label: "Maret" },
    { value: 3, label: "April" },
    { value: 4, label: "Mei" },
    { value: 5, label: "Juni" },
    { value: 6, label: "Juli" },
    { value: 7, label: "Agustus" },
    { value: 8, label: "September" },
    { value: 9, label: "Oktober" },
    { value: 10, label: "November" },
    { value: 11, label: "Desember" },
  ]

  // Ubah tahun saat ini
  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  // Fungsi untuk memuat ulang data
  const refreshWorkloadData = () => {
    toast({
      title: "Memperbarui data",
      description: "Sedang memuat ulang data beban kerja",
    })
    processWorkloadData()
  }

  const processWorkloadData = () => {
    setIsLoading(true)
    setError(null)

    try {
      // Validasi input
      if (!Array.isArray(tasks) || tasks.length === 0) {
        setError("Tidak ada task yang ditemukan untuk project ini");
        setIsLoading(false);
        return;
      }

      if (!Array.isArray(teamMembers) || teamMembers.length === 0) {
        setError("Tidak ada anggota tim yang ditemukan untuk project ini");
        setIsLoading(false);
        return;
      }

      console.log("Processing workload with:", {
        tasksCount: tasks.length,
        teamMembersCount: teamMembers.length,
      });

      // Siapkan data untuk setiap anggota tim
      const data: WorkloadData[] = teamMembers.map((member) => {
        // Pastikan member dan member.user valid
        if (!member || !member.user) {
          console.warn("Invalid team member found:", member);
          // Buat dummy data untuk member tidak valid
          return {
            user: {
              id: 0,
              name: "Unknown Member",
              avatar: null
            },
            dailyTasks: {}
          };
        }

        return {
          user: {
            id: member.user.id,
            name: member.user.name,
            avatar: member.user.avatar || null
          },
          dailyTasks: {}
        };
      });

      // Filter array untuk menghapus data tidak valid
      const validData = data.filter(item => item.user.id !== 0);

      if (validData.length === 0) {
        setError("Data anggota tim tidak valid");
        setIsLoading(false);
        return;
      }

      // Range tanggal yang ditampilkan
      let startDate, endDate

      if (selectedWorkloadView === "month") {
        startDate = startOfMonth(currentMonth)
        endDate = endOfMonth(currentMonth)
      } else if (selectedWorkloadView === "14days") {
        const today = new Date()
        startDate = today
        endDate = addDays(today, 14)
      } else {
        // 30 hari ke depan
        const today = new Date()
        startDate = today
        endDate = addDays(today, 30)
      }

      // Generate tanggal-tanggal yang akan ditampilkan
      const dates = eachDayOfInterval({ start: startDate, end: endDate })
      
      // Inisialisasi array hari untuk setiap user
      dates.forEach(date => {
        const dateStr = format(date, "yyyy-MM-dd")
        validData.forEach(userData => {
          userData.dailyTasks[dateStr] = { count: 0, tasks: [] }
        })
      })

      // Masukkan tugas ke hari-hari yang sesuai
      tasks.forEach(task => {
        if (!task.assigneeId) return // Lewati tugas tanpa assignee
        
        try {
          // Pastikan format tanggal valid dengan validasi dan log
          console.log(`Processing task: ${task.id} - ${task.name}`);
          console.log(`Original dates: startDate=${task.startDate}, endDate=${task.endDate}`);
          
          // Pastikan format tanggal valid
          let taskStartDate, taskEndDate;
          
          try {
            taskStartDate = new Date(task.startDate);
            taskEndDate = new Date(task.endDate);
            
            // Validasi tanggal
            if (isNaN(taskStartDate.getTime()) || isNaN(taskEndDate.getTime())) {
              console.error(`Invalid date for task ${task.id}: start=${task.startDate}, end=${task.endDate}`);
              return; // Skip task dengan tanggal invalid
            }
            
            console.log(`Converted dates: startDate=${taskStartDate.toISOString()}, endDate=${taskEndDate.toISOString()}`);
          } catch (err) {
            console.error(`Error parsing dates for task ${task.id}:`, err);
            return; // Skip task ini
          }
          
          // Cek apakah tugas berada dalam range tanggal yang ditampilkan
          if (taskEndDate < startDate || taskStartDate > endDate) {
            console.log(`Task ${task.id} outside display range: ${startDate.toISOString()} - ${endDate.toISOString()}`);
            return; // Task di luar range display
          }
          
          const taskDates = eachDayOfInterval({ 
            start: taskStartDate > startDate ? taskStartDate : startDate,
            end: taskEndDate < endDate ? taskEndDate : endDate 
          });
          
          console.log(`Task ${task.id} spans ${taskDates.length} days in current view`);
          
          if (taskDates.length === 0) {
            console.log(`No days to display for task ${task.id}`);
            return; // Tugas di luar range
          }
          
          // Cari data user dari tugas ini
          const userData = validData.find(d => d.user.id === task.assigneeId);
          if (!userData) {
            console.log(`No user data found for assigneeId ${task.assigneeId}`);
            return;
          }
          
          // Tambahkan tugas ke setiap hari dimana tugas berlangsung
          taskDates.forEach(date => {
            const dateStr = format(date, "yyyy-MM-dd");
            console.log(`Adding task ${task.id} to date ${dateStr}`);
            
            // Periksa apakah userData.dailyTasks[dateStr] sudah diinisialisasi
            if (!userData.dailyTasks[dateStr]) {
              userData.dailyTasks[dateStr] = { count: 0, tasks: [] };
              console.log(`Initialized missing date ${dateStr} for user ${userData.user.id}`);
            }
            
            userData.dailyTasks[dateStr].count++;
            userData.dailyTasks[dateStr].tasks.push(task);
          });
        } catch (err) {
          console.error(`Unexpected error processing task ${task.id}:`, err);
        }
      });

      setWorkloadData(validData)
    } catch (error) {
      console.error("Error processing workload data:", error)
      setError("Terjadi kesalahan saat memproses data beban kerja");
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat memproses data beban kerja",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    processWorkloadData()
  }, [currentMonth, selectedWorkloadView, tasks, teamMembers, toast])

  // Fungsi untuk mendapatkan warna berdasarkan jumlah tugas
  const getHeatColor = (count: number) => {
    if (count === 0) return "bg-gray-100"
    if (count === 1) return "bg-green-100"
    if (count === 2) return "bg-green-200"
    if (count === 3) return "bg-green-300"
    if (count === 4) return "bg-yellow-300"
    if (count === 5) return "bg-yellow-400"
    if (count === 6) return "bg-orange-400"
    if (count === 7) return "bg-orange-500"
    return "bg-red-500" // 8+
  }

  // Range hari yang ditampilkan
  let daysToDisplay: Date[] = []
  if (selectedWorkloadView === "month") {
    daysToDisplay = eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    })
  } else if (selectedWorkloadView === "14days") {
    const today = new Date()
    daysToDisplay = eachDayOfInterval({
      start: today,
      end: addDays(today, 13) // 14 hari termasuk hari ini
    })
  } else {
    const today = new Date()
    daysToDisplay = eachDayOfInterval({
      start: today,
      end: addDays(today, 29) // 30 hari termasuk hari ini
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <CardTitle>Beban Kerja Tim</CardTitle>
            <CardDescription>
              Visualisasi beban tugas anggota tim per hari
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshWorkloadData}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RotateCw className="h-4 w-4 mr-1" />
              )}
              Refresh
            </Button>
            
            {!error && (
              <>
                <Select
                  value={selectedWorkloadView}
                  onValueChange={setSelectedWorkloadView}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Pilih Tampilan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Bulanan</SelectItem>
                    <SelectItem value="14days">14 Hari</SelectItem>
                    <SelectItem value="30days">30 Hari</SelectItem>
                  </SelectContent>
                </Select>
                
                {selectedWorkloadView === "month" && (
                  <>
                    <Select
                      value={currentMonth.getMonth().toString()}
                      onValueChange={(value) => {
                        const newDate = new Date(currentMonth)
                        newDate.setMonth(parseInt(value))
                        setCurrentMonth(newDate)
                      }}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Pilih Bulan" />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month) => (
                          <SelectItem key={month.value} value={month.value.toString()}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select
                      value={currentMonth.getFullYear().toString()}
                      onValueChange={(value) => {
                        const newDate = new Date(currentMonth)
                        newDate.setFullYear(parseInt(value))
                        setCurrentMonth(newDate)
                      }}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue placeholder="Tahun" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-destructive text-xl mb-2">⚠️</div>
            <p className="text-muted-foreground">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Pastikan project memiliki task yang telah ditugaskan ke anggota tim
            </p>
          </div>
        ) : workloadData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-muted-foreground">Tidak ada data beban kerja untuk ditampilkan</p>
            <p className="text-sm text-muted-foreground mt-2">
              Tambahkan task dan assignee untuk melihat beban kerja
            </p>
          </div>
        ) : (
          <div className="w-full" style={{ maxWidth: '100%' }}>
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 sticky left-0 bg-gray-50 z-10 border-r"
                      >
                        Anggota Tim
                      </th>
                      {daysToDisplay.map((day) => (
                        <th
                          key={format(day, "yyyy-MM-dd")}
                          scope="col"
                          className="px-1 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-8"
                        >
                          <div className="flex flex-col">
                            <span>{format(day, "dd")}</span>
                            <span className="text-[0.65rem] lowercase">
                              {format(day, "EEE", { locale: id })}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {workloadData.map((userData) => (
                      <tr key={userData.user.id}>
                        <td className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white z-10 border-r">
                          <div className="flex items-center">
                            <div className="h-7 w-7 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                              {userData.user.avatar ? (
                                <img
                                  src={userData.user.avatar}
                                  alt={userData.user.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-gray-500 font-semibold">
                                  {userData.user.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {userData.user.name}
                              </div>
                            </div>
                          </div>
                        </td>
                        {daysToDisplay.map((day) => {
                          const dateStr = format(day, "yyyy-MM-dd")
                          const dayData = userData.dailyTasks[dateStr] || { count: 0, tasks: [] }
                          
                          return (
                            <td key={dateStr} className="p-1 text-center">
                              <div
                                className={`mx-auto h-6 w-6 rounded-md ${getHeatColor(
                                  dayData.count
                                )} flex items-center justify-center hover:ring-2 hover:ring-blue-500 cursor-pointer transition-all`}
                                title={`${dayData.count} tugas`}
                                onClick={() => {
                                  if (dayData.count > 0) {
                                    toast({
                                      title: `Tugas ${userData.user.name} pada ${format(day, "dd MMM yyyy")}`,
                                      description: (
                                        <ul className="mt-2 space-y-1">
                                          {dayData.tasks.map((task) => (
                                            <li key={task.id}>• {task.name}</li>
                                          ))}
                                        </ul>
                                      ),
                                    })
                                  }
                                }}
                              >
                                {dayData.count > 0 && (
                                  <span className="text-xs font-medium">
                                    {dayData.count}
                                  </span>
                                )}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-3 flex flex-wrap items-center gap-2 px-2 pb-2">
                <div className="text-sm font-medium">Legenda:</div>
                <div className="flex items-center gap-1">
                  <div className={`h-4 w-4 ${getHeatColor(0)}`}></div>
                  <span className="text-xs">0</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`h-4 w-4 ${getHeatColor(1)}`}></div>
                  <span className="text-xs">1</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`h-4 w-4 ${getHeatColor(3)}`}></div>
                  <span className="text-xs">2-3</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`h-4 w-4 ${getHeatColor(5)}`}></div>
                  <span className="text-xs">4-5</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`h-4 w-4 ${getHeatColor(7)}`}></div>
                  <span className="text-xs">6-7</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`h-4 w-4 ${getHeatColor(8)}`}></div>
                  <span className="text-xs">8+</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 