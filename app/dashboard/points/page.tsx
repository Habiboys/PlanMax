"use client"

import { useState, useEffect } from "react"
import { Trophy, Award, Star, ArrowUp, Clock, Calendar } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { DashboardHeader } from "@/components/dashboard-header"
import { DashboardShell } from "@/components/dashboard-shell"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import { getUserPointsInfo, getPointsLeaderboard } from "@/app/actions/points-actions"
import { format } from "date-fns"

// Konstanta untuk sistem level - harus sama dengan yang di actions/points-actions.ts
const LEVEL_THRESHOLDS = [
  0,     // Level 1: 0 poin
  100,   // Level 2: 100 poin
  250,   // Level 3: 250 poin
  500,   // Level 4: 500 poin
  1000,  // Level 5: 1000 poin
  2000,  // Level 6: 2000 poin
  3500,  // Level 7: 3500 poin
  5000,  // Level 8: 5000 poin
  7500,  // Level 9: 7500 poin
  10000, // Level 10: 10000 poin
]

// Fungsi untuk menghitung persentase progres di level saat ini
function calculateLevelProgress(currentPoints: number, currentLevel: number) {
  if (currentLevel >= LEVEL_THRESHOLDS.length) return 100;
  
  const currentLevelThreshold = LEVEL_THRESHOLDS[currentLevel - 1] || 0;
  const nextLevelThreshold = LEVEL_THRESHOLDS[currentLevel] || 0;
  
  if (nextLevelThreshold <= currentLevelThreshold) return 100;
  
  // Pastikan bahwa poin yang didapatkan dihitung dengan benar, tidak bisa bernilai nol
  const pointsInCurrentLevel = Math.max(0, currentPoints - currentLevelThreshold);
  const pointsNeededForNextLevel = nextLevelThreshold - currentLevelThreshold;
  
  // Pastikan bahwa progress minimal adalah 1% jika sudah memiliki poin
  const progress = pointsInCurrentLevel > 0 
    ? Math.max(1, (pointsInCurrentLevel / pointsNeededForNextLevel) * 100)
    : 0;
    
  console.log("Level progress calculation:", {
    currentPoints,
    currentLevel,
    currentLevelThreshold,
    nextLevelThreshold,
    pointsInCurrentLevel,
    pointsNeededForNextLevel,
    progress
  });
  
  return Math.min(100, Math.max(0, progress));
}

// Fungsi sederhana untuk menentukan progress visual
function getVisualProgress(points: number | undefined): number {
  if (!points) return 0;
  if (points <= 0) return 0;
  
  // Jika memiliki poin, tampilkan minimal 10% progres
  return 10;
}

export default function PointsPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [userPoints, setUserPoints] = useState<{
    id: number
    name: string
    points: number
    level: number
    pointsForNextLevel: number
    pointsNeeded: number
  } | null>(null)
  const [pointsHistory, setPointsHistory] = useState<any[]>([])
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [currentUserRank, setCurrentUserRank] = useState<{
    id: number
    name: string
    avatar: string | null
    points: number
    level: number
    rank: number
  } | null>(null)

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        // Ambil informasi poin pengguna
        const userPointsResult = await getUserPointsInfo()
        if (userPointsResult.error) {
          toast({
            title: "Error",
            description: userPointsResult.error,
            variant: "destructive",
          })
        } else {
          // @ts-ignore - mengabaikan error TypeScript
          setUserPoints(userPointsResult.user || null)
          // @ts-ignore - mengabaikan error TypeScript
          setPointsHistory(userPointsResult.recentHistory || [])
        }

        // Ambil leaderboard
        const leaderboardResult = await getPointsLeaderboard()
        if (leaderboardResult.error) {
          toast({
            title: "Error",
            description: leaderboardResult.error,
            variant: "destructive",
          })
        } else {
          setLeaderboard(leaderboardResult.leaderboard || [])
          setCurrentUserRank(leaderboardResult.currentUser || null)
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Terjadi kesalahan saat memuat data poin",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [toast])

  // Fungsi untuk mendapatkan warna Badge level
  const getLevelColor = (level: number) => {
    if (level >= 8) return "bg-gradient-to-r from-purple-600 to-pink-600 text-white"
    if (level >= 6) return "bg-gradient-to-r from-blue-600 to-purple-600 text-white"
    if (level >= 4) return "bg-gradient-to-r from-green-600 to-blue-600 text-white"
    return "bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
  }

  // Fungsi untuk mendapatkan badge rank
  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />
    if (rank === 2) return <Trophy className="h-5 w-5 text-gray-400" />
    if (rank === 3) return <Trophy className="h-5 w-5 text-amber-700" />
    return <span className="font-semibold">{rank}</span>
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardShell>
        <DashboardHeader
          heading="Sistem Poin & Prestasi"
          text="Kumpulkan poin dengan menyelesaikan tugas dan naik level."
        />
        
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[220px] rounded-lg border bg-muted/40 p-6 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6">
            {/* Profil Pengguna */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Kartu Informasi Level */}
              <Card className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Level dan Poin
                  </CardTitle>
                  <CardDescription className="text-white/90">
                    Status level dan poin Anda saat ini
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="mb-6 text-center">
                    <div className="relative mx-auto h-24 w-24 rounded-full bg-gradient-to-r from-indigo-200 to-purple-200 flex items-center justify-center">
                      <div className="text-3xl font-bold text-indigo-800">
                        {userPoints?.level || 1}
                      </div>
                      <div className="absolute -bottom-2 -right-2 rounded-full bg-indigo-600 text-white h-8 w-8 flex items-center justify-center text-xs">
                        <Star className="h-4 w-4" />
                      </div>
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">{userPoints?.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Total Poin: <span className="font-medium">{userPoints?.points || 0}</span>
                    </p>
                  </div>
                  
                  {userPoints?.pointsForNextLevel !== -1 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress ke Level {(userPoints?.level || 1) + 1}</span>
                        <span>{userPoints?.points || 0}/{userPoints?.pointsForNextLevel || 100}</span>
                      </div>
                      <Progress 
                        value={userPoints?.points && userPoints.points > 0 ? 10 : 0} 
                        className="h-2" 
                      />
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        {userPoints?.pointsNeeded && userPoints.pointsNeeded > 0 
                          ? `Butuh ${userPoints.pointsNeeded} poin lagi untuk naik level`
                          : "Anda sudah mencapai level maksimum!"
                        }
                      </p>
                      
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Kartu Peringkat (Rank) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Peringkat Anda
                  </CardTitle>
                  <CardDescription>
                    Posisi Anda dalam papan peringkat
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  {currentUserRank ? (
                    <div className="flex flex-col items-center text-center">
                      <div className="relative">
                        <div className="h-20 w-20 rounded-full bg-gradient-to-r from-yellow-200 to-orange-200 flex items-center justify-center font-bold text-2xl text-orange-800">
                          #{currentUserRank.rank}
                        </div>
                        {currentUserRank.rank <= 3 && (
                          <div className="absolute -top-2 -right-2 bg-yellow-500 text-white rounded-full p-1">
                            <Trophy className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                      <h3 className="mt-4 text-lg font-medium">
                        {currentUserRank.rank === 1 ? "Peringkat Teratas!" : `Peringkat #${currentUserRank.rank}`}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Dari total {leaderboard.length} pengguna aktif
                      </p>
                      <Button variant="outline" size="sm" className="mt-4 gap-1">
                        <ArrowUp className="h-4 w-4" />
                        Naik Peringkat
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground">
                        Belum ada data peringkat
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {/* Riwayat Poin Terbaru */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Riwayat Poin Terbaru
                  </CardTitle>
                  <CardDescription>
                    Aktivitas terakhir yang mendapatkan poin
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="max-h-[250px] overflow-auto">
                    {pointsHistory.length > 0 ? (
                      <div className="divide-y">
                        {pointsHistory.map((history) => (
                          <div key={history.id} className="p-4 flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">
                                {history.reason}
                                {history.task && `: ${history.task.name}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                <Calendar className="inline-block h-3 w-3 mr-1" />
                                {format(new Date(history.createdAt), "dd MMM yyyy, HH:mm")}
                              </p>
                            </div>
                            <span className="font-semibold text-green-600">+{history.points}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center">
                        <p className="text-muted-foreground">
                          Belum ada riwayat poin
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Papan Peringkat */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Papan Peringkat (Leaderboard)
                </CardTitle>
                <CardDescription>
                  Pengguna dengan poin tertinggi
                </CardDescription>
              </CardHeader>
              <CardContent>
                {leaderboard.length > 0 ? (
                  <div className="rounded-md border">
                    <div className="grid grid-cols-12 gap-2 p-4 font-medium border-b text-sm">
                      <div className="col-span-1 text-center">#</div>
                      <div className="col-span-6">Nama</div>
                      <div className="col-span-3 text-center">Level</div>
                      <div className="col-span-2 text-right">Poin</div>
                    </div>
                    <div className="divide-y">
                      {leaderboard.map((user, index) => (
                        <div 
                          key={user.id} 
                          className={`grid grid-cols-12 gap-2 p-4 text-sm ${
                            currentUserRank?.id === user.id ? 'bg-muted/50' : ''
                          }`}
                        >
                          <div className="col-span-1 flex justify-center items-center">
                            {getRankBadge(index + 1)}
                          </div>
                          <div className="col-span-6 flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar || ""} />
                              <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span>{user.name}</span>
                          </div>
                          <div className="col-span-3 flex justify-center items-center">
                            <span className={`px-3 py-1 rounded-full text-xs ${getLevelColor(user.level)}`}>
                              Level {user.level}
                            </span>
                          </div>
                          <div className="col-span-2 text-right font-semibold">
                            {user.points}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Trophy className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                    <p className="font-medium">Belum ada data leaderboard</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Selesaikan tugas untuk mendapatkan poin dan muncul di papan peringkat
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </DashboardShell>
    </div>
  )
} 