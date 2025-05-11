"use client"

import React, { useState, useEffect, useRef } from "react"
import { format, parseISO, formatDistanceToNow } from "date-fns"
import { id } from "date-fns/locale"
import { 
  CheckCircle, Circle, Clock, MoreHorizontal, 
  Pencil, Trash, Plus, RefreshCw, Award,
  MessageSquare, Send
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { updateTaskProgress, deleteTask } from "@/app/actions/task-actions"
import { addTaskCompletionPoints } from "@/app/actions/points-actions"
import { getTaskComments, addTaskComment } from "@/app/actions/comment-actions"
import { useToast } from "@/hooks/use-toast"
import { NewTaskForm } from "@/components/new-task-form"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
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
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogHeader, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { TaskBlockerIndicator } from "@/components/task-blocker-indicator"
import { TaskTimelinePrediction } from "@/components/task-timeline-prediction"
import { TaskCard } from "@/components/task-card"

// Tambahkan import untuk pagination
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface Task {
  id: number
  name: string
  description: string
  startDate: string
  endDate: string
  progress: number
  status: string
  assignee: string | null
  assigneeId: number | null
  dependencies: number[]
  pointsValue?: number
}

export interface TeamMember {
  id: number
  name: string
}

interface TaskListProps {
  projectId: number
  tasks: Task[]
  teamMembers: TeamMember[]
  onTaskUpdated: () => void
  userRole?: string
}

// Custom hook untuk interval dengan delay
function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    function tick() {
      if (savedCallback.current) {
        savedCallback.current();
      }
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

export function TaskList({ projectId, tasks, teamMembers, onTaskUpdated, userRole }: TaskListProps) {
  const { toast } = useToast()
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const [taskProgress, setTaskProgress] = useState<{ [key: number]: number }>({})
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isAddingTask, setIsAddingTask] = useState(false)
  const [isDeletingTask, setIsDeletingTask] = useState<number | null>(null)
  const [isUpdatingTask, setIsUpdatingTask] = useState<number | null>(null)
  const [isDeletingDialogOpen, setIsDeletingDialogOpen] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pointsEarnedDialog, setPointsEarnedDialog] = useState<{
    open: boolean,
    points: number,
    levelUp: boolean,
    newLevel: number
  }>({
    open: false,
    points: 0,
    levelUp: false,
    newLevel: 1
  })
  
  // State untuk dialog komentar
  const [commentsDialogOpen, setCommentsDialogOpen] = useState(false)
  const [currentTaskForComments, setCurrentTaskForComments] = useState<number | null>(null)
  const [comments, setComments] = useState<any[]>([])
  const [allComments, setAllComments] = useState<{[key: number]: any[]}>({})  // Semua komentar untuk semua task
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [commentCounts, setCommentCounts] = useState<{[key: number]: number}>({})

  // State untuk pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [tasksPerPage, setTasksPerPage] = useState(5)

  // Debug log untuk teamMembers
  console.log("TaskList - Team Members:", teamMembers);
  console.log("TaskList - Team Members Count:", teamMembers.length);

  // Periksa apakah user memiliki permission untuk mengelola task
  const canManageTasks = userRole === "OWNER" || userRole === "ADMIN"
  
  // Debug log yang lebih detail
  console.log("TaskList - Debug Info:")
  console.log("1. Props received:", { projectId, tasks, teamMembers, userRole })
  console.log("2. Can manage tasks:", canManageTasks)
  console.log("3. User role:", userRole)

  // Ambil jumlah komentar dan semua komentar untuk semua task
  useEffect(() => {
    async function fetchAllComments() {
      try {
        const counts: {[key: number]: number} = {};
        const allTaskComments: {[key: number]: any[]} = {};
        
        for (const task of tasks) {
          const result = await getTaskComments(projectId, task.id);
          if (result.success) {
            counts[task.id] = result.comments.length;
            allTaskComments[task.id] = result.comments;
          }
        }
        
        setCommentCounts(counts);
        setAllComments(allTaskComments);
      } catch (error) {
        console.error("Error fetching comments:", error);
      }
    }

    fetchAllComments();
  }, [projectId, tasks]);

  // Function to format date
  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), "MMM d, yyyy")
  }

  // Function to get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "In Progress":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "Not Started":
        return <Circle className="h-4 w-4 text-gray-400" />
      default:
        return <Circle className="h-4 w-4 text-gray-400" />
    }
  }

  const handleProgressChange = (taskId: number, value: number[]) => {
    setTaskProgress({ ...taskProgress, [taskId]: value[0] })
  }

  const handleProgressUpdate = async (taskId: number) => {
    try {
      const progress = taskProgress[taskId]
      setIsUpdatingTask(taskId)
      
      console.log(`Updating task progress: taskId=${taskId}, progress=${progress}`);
      
      const result = await updateTaskProgress(projectId, taskId, progress)

      if (result.success) {
        // Jika task selesai 100%, tambahkan poin
        if (progress === 100) {
          console.log(`Task completed 100%, attempting to add points for taskId=${taskId}`);
          
          // Cek apakah task ini memiliki status "Completed"
          const task = tasks.find(t => t.id === taskId)
          console.log(`Task status check: taskId=${taskId}, status=${task?.status}, assigneeId=${task?.assigneeId}`);
          
          // Langsung berikan poin tanpa mengecek status, karena updateTaskProgress sudah mengubah status
          const pointsResult = await addTaskCompletionPoints(taskId)
          console.log(`Points result:`, pointsResult);
          
          if (pointsResult.success) {
            // Tampilkan dialog poin yang didapatkan
            setPointsEarnedDialog({
              open: true,
              points: pointsResult.pointsAdded,
              levelUp: pointsResult.levelUp,
              newLevel: pointsResult.newLevel
            })
          } else if (pointsResult.error) {
            console.error(`Error adding points:`, pointsResult.error);
            // Tetap tampilkan toast berhasil untuk update progress
            toast({
              title: "Info",
              description: pointsResult.error,
            })
          }
        }
        
        // Panggil callback untuk memberitahu komponen induk bahwa ada pembaruan
        if (onTaskUpdated) {
          onTaskUpdated()
        }
        
        toast({
          title: "Progress diperbarui",
          description: "Progress task berhasil diperbarui.",
        })
        
        setEditingTaskId(null)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal memperbarui progress task. Silakan coba lagi.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error dalam handleProgressUpdate:", error);
      toast({
        title: "Error",
        description: "Terjadi kesalahan yang tidak terduga. Silakan coba lagi.",
        variant: "destructive",
      })
    } finally {
      setIsUpdatingTask(null)
    }
  }

  const handleDeleteTask = (taskId: number) => {
    setTaskToDelete(taskId)
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return
    
    setIsDeleting(true)
    setIsDeletingTask(taskToDelete)
    
    try {
      const result = await deleteTask(projectId, taskToDelete)

      if (result.success) {
        // Segera panggil callback untuk memperbarui UI
        if (onTaskUpdated) {
          onTaskUpdated()
        }
        
        toast({
          title: "Task dihapus",
          description: "Task berhasil dihapus.",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal menghapus task. Silakan coba lagi.",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan yang tidak terduga. Silakan coba lagi.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
      setTaskToDelete(null)
      setIsDeletingTask(null)
    }
  }

  const handleRefreshTasks = () => {
    setIsRefreshing(true)
    
    // Panggil onTaskUpdated untuk memperbarui data
    if (onTaskUpdated) {
      onTaskUpdated()
    }
    
    // Update lastUpdate untuk menunjukkan refresh baru
    setLastUpdate(Date.now())
    
    // Reset isRefreshing setelah 1 detik
    setTimeout(() => {
      setIsRefreshing(false)
    }, 1000)
  }

  // Fungsi untuk membuka dialog komentar
  const handleOpenCommentsDialog = async (taskId: number) => {
    setCurrentTaskForComments(taskId)
    setCommentsDialogOpen(true)
    setIsLoadingComments(true)
    
    try {
      const result = await getTaskComments(projectId, taskId)
      if (result.success) {
        setComments(result.comments)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal mengambil komentar",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching comments:", error)
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat mengambil komentar",
        variant: "destructive",
      })
    } finally {
      setIsLoadingComments(false)
    }
  }

  // Fungsi untuk menambahkan komentar baru
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newComment.trim() || !currentTaskForComments) return
    
    setIsSubmittingComment(true)
    try {
      const result = await addTaskComment(projectId, currentTaskForComments, newComment)
      
      if (result.success) {
        // Tambahkan komentar baru ke state
        setComments([result.comment, ...comments])
        
        // Update allComments untuk TaskBlockerIndicator
        setAllComments({
          ...allComments,
          [currentTaskForComments]: [result.comment, ...(allComments[currentTaskForComments] || [])]
        })
        
        setNewComment("")
        
        // Update jumlah komentar
        setCommentCounts({
          ...commentCounts,
          [currentTaskForComments]: (commentCounts[currentTaskForComments] || 0) + 1
        })
        
        toast({
          title: "Komentar ditambahkan",
          description: "Komentar berhasil ditambahkan",
        })
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal menambahkan komentar",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error adding comment:", error)
      toast({
        title: "Error",
        description: "Terjadi kesalahan saat menambahkan komentar",
        variant: "destructive",
      })
    } finally {
      setIsSubmittingComment(false)
    }
  }
  
  // Fungsi untuk memformat waktu komentar
  const formatCommentTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    
    // Jika komentar dibuat kurang dari 24 jam yang lalu, gunakan format relatif
    if (now.getTime() - date.getTime() < 24 * 60 * 60 * 1000) {
      return formatDistanceToNow(date, { addSuffix: true, locale: id })
    }
    
    // Jika komentar dibuat lebih dari 24 jam yang lalu, gunakan format tanggal
    return format(date, "d MMMM yyyy, HH:mm", { locale: id })
  }

  // Hapus komponen yang ada
  const handleCloseAddTaskModal = () => {
    setIsAddingTask(false)
  }

  // Ambil nama task yang sedang dilihat komentarnya
  const currentTask = tasks.find(task => task.id === currentTaskForComments)
  const currentTaskName = currentTask ? currentTask.name : ""

  // Logika untuk pagination
  const indexOfLastTask = currentPage * tasksPerPage
  const indexOfFirstTask = indexOfLastTask - tasksPerPage
  const currentTasks = tasks.slice(indexOfFirstTask, indexOfLastTask)
  const totalPages = Math.ceil(tasks.length / tasksPerPage)
  
  // Function untuk mengubah halaman
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold"></h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefreshTasks}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {canManageTasks && (
            <Button size="sm" onClick={() => setIsAddingTask(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Task Baru
            </Button>
          )}
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-muted-foreground">Belum ada task untuk project ini.</p>
          {canManageTasks && (
            <Button className="mt-4" onClick={() => setIsAddingTask(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Buat Task Pertama
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {currentTasks.map((task) => (
            <TaskCard
              key={task.id}
              projectId={projectId}
              task={{
                ...task,
                editable: true
              }}
              tasks={tasks}
              onTaskUpdated={onTaskUpdated}
              onTaskDeleted={() => {
                // Hapus task dari state
                if (onTaskUpdated) {
                  onTaskUpdated()
                }
              }}
              onPointsEarned={({points, levelUp, newLevel}) => {
                setPointsEarnedDialog({
                  open: true,
                  points,
                  levelUp,
                  newLevel
                })
              }}
              onOpenComments={handleOpenCommentsDialog}
              commentCount={commentCounts[task.id] || 0}
              teamMembers={teamMembers}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {tasks.length > tasksPerPage && (
        <div className="mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {/* Render halaman nomor pagination */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  // Selalu tampilkan halaman pertama, halaman saat ini, dan halaman terakhir
                  // Serta halaman yang berdekatan dengan halaman saat ini
                  return (
                    page === 1 || 
                    page === totalPages || 
                    Math.abs(page - currentPage) <= 1
                  )
                })
                .map((page, i, filteredPages) => {
                  // Tambahkan ellipsis jika ada gap dalam halaman
                  const prevPage = filteredPages[i - 1]
                  const needsEllipsisBefore = prevPage && page - prevPage > 1
                  
                  return (
                    <React.Fragment key={page}>
                      {needsEllipsisBefore && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationLink
                          isActive={page === currentPage}
                          onClick={() => paginate(page)}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    </React.Fragment>
                  )
                })
              }
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          
          <div className="flex justify-end mt-2 text-sm text-muted-foreground">
            <select
              className="border rounded px-2 py-1 text-xs"
              value={tasksPerPage}
              onChange={(e) => {
                setTasksPerPage(Number(e.target.value))
                setCurrentPage(1) // Reset ke halaman pertama
              }}
            >
              <option value={5}>5 per halaman</option>
              <option value={10}>10 per halaman</option>
              <option value={15}>15 per halaman</option>
              <option value={20}>20 per halaman</option>
            </select>
          </div>
        </div>
      )}

      {/* Dialog untuk menambah task */}
      <Dialog open={isAddingTask} onOpenChange={setIsAddingTask}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Tambah Task Baru</DialogTitle>
            <DialogDescription>
              Tambahkan task baru ke project ini.
            </DialogDescription>
          </DialogHeader>
          <NewTaskForm 
            projectId={projectId} 
            teamMembers={teamMembers} 
            tasks={tasks}
            onTaskCreated={(action, taskName) => {
              setIsAddingTask(false);
              // Refresh data
              if (onTaskUpdated) {
                onTaskUpdated();
              }
              
              if (action === "created") {
                toast({
                  title: "Task berhasil dibuat",
                  description: `Task "${taskName}" telah berhasil dibuat.`
                });
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog konfirmasi hapus task */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Task ini akan dihapus secara permanen dari sistem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTask} disabled={isDeleting}>
              {isDeleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog poin yang didapatkan */}
      <Dialog open={pointsEarnedDialog.open} onOpenChange={(open) => setPointsEarnedDialog({...pointsEarnedDialog, open})}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-center">
              {pointsEarnedDialog.levelUp ? "Level Naik! 🎉" : "Poin Didapatkan! 🎉"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            <div className="h-20 w-20 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-bold mb-4">
              +{pointsEarnedDialog.points}
            </div>
            
            {pointsEarnedDialog.levelUp ? (
              <div className="text-center">
                <p className="mb-2">Selamat! Anda telah naik ke</p>
                <div className="inline-block px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full text-white font-bold text-xl mb-2">
                  Level {pointsEarnedDialog.newLevel}
                </div>
                <p className="text-muted-foreground text-sm">Terus selesaikan task untuk naik level!</p>
              </div>
            ) : (
              <div className="text-center">
                <p className="mb-2">Anda mendapatkan</p>
                <p className="text-xl font-bold mb-2">{pointsEarnedDialog.points} poin</p>
                <p className="text-muted-foreground text-sm">untuk menyelesaikan task ini</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setPointsEarnedDialog({...pointsEarnedDialog, open: false})} className="w-full">
              Lanjutkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog komentar */}
      <Dialog open={commentsDialogOpen} onOpenChange={setCommentsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Komentar Task: {currentTaskName}</DialogTitle>
          </DialogHeader>
          
          {/* Form tambah komentar */}
          <form onSubmit={handleAddComment} className="flex gap-2 mb-4">
            <Textarea
              placeholder="Tulis komentar..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] flex-1"
              disabled={isSubmittingComment}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="h-10 w-10 self-end" 
              disabled={isSubmittingComment || !newComment.trim()}
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Kirim komentar</span>
            </Button>
          </form>
          
          {/* Daftar komentar */}
          {isLoadingComments ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Memuat komentar...
            </div>
          ) : comments.length === 0 ? (
            <div className="py-4 text-center text-sm text-muted-foreground">
              Belum ada komentar. Jadilah yang pertama berkomentar!
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 border-b pb-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={(comment.user?.avatar) || ""} />
                    <AvatarFallback>{comment.user?.name?.charAt(0) || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{comment.user?.name || "Pengguna"}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatCommentTime(comment.createdAt)}
                      </div>
                    </div>
                    <div className="text-sm">{comment.content}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
