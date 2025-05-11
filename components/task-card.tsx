"use client"

import { useState, useEffect } from "react"
import { format, parseISO } from "date-fns"
import { 
  CheckCircle, Circle, Clock, MoreHorizontal, 
  Pencil, Trash, Award, ChevronDown, ChevronUp, 
  MessageSquare, UserPlus 
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { TaskBlockerIndicator } from "@/components/task-blocker-indicator"
import { TaskTimelinePrediction } from "@/components/task-timeline-prediction"
import { TaskComments } from "@/components/task-comments"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { updateTaskProgress, deleteTask, updateTaskDates, updateTaskAssignee } from "@/app/actions/task-actions"
import { addTaskCompletionPoints } from "@/app/actions/points-actions"
import { getTaskComments } from "@/app/actions/comment-actions"
import { useToast } from "@/hooks/use-toast"

interface TaskCardProps {
  projectId: number
  task: {
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
    editable?: boolean
  }
  tasks: any[]
  onTaskUpdated: () => void
  onTaskDeleted: () => void
  onPointsEarned: (data: { points: number, levelUp: boolean, newLevel: number }) => void
  projectMembers?: any[]
  teamMembers?: any[]
  onOpenComments?: (taskId: number) => void
  commentCount?: number
}

export function TaskCard({ 
  projectId, 
  task, 
  tasks, 
  onTaskUpdated, 
  onTaskDeleted,
  onPointsEarned,
  projectMembers = [],
  teamMembers = [],
  onOpenComments,
  commentCount = 0
}: TaskCardProps) {
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [progress, setProgress] = useState(task.progress)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const [isLoadingComments, setIsLoadingComments] = useState(true)
  const [comments, setComments] = useState<any[]>([])
  const [assigningUser, setAssigningUser] = useState(false)
  
  // Gunakan projectMembers atau teamMembers (mana yang tersedia)
  const members = projectMembers.length > 0 ? projectMembers : teamMembers

  // Ambil jumlah komentar saat komponen dimuat
  useEffect(() => {
    async function fetchCommentCount() {
      try {
        const result = await getTaskComments(projectId, task.id)
        if (result.success) {
          // Gunakan comments saja karena commentCount sudah menjadi prop
          setComments(result.comments)
        }
      } catch (error) {
        console.error("Error fetching comment count:", error)
      } finally {
        setIsLoadingComments(false)
      }
    }

    fetchCommentCount()
  }, [projectId, task.id])

  // Function to format date
  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), "dd MMM yyyy")
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

  const handleProgressUpdate = async () => {
    setIsUpdating(true)
    try {
      const result = await updateTaskProgress(projectId, task.id, progress)

      if (result.success) {
        // Jika task selesai 100%, tambahkan poin
        if (progress === 100) {
          const pointsResult = await addTaskCompletionPoints(task.id)
          
          if (pointsResult.success) {
            // Tampilkan dialog poin yang didapatkan
            onPointsEarned({
              points: pointsResult.pointsAdded,
              levelUp: pointsResult.levelUp,
              newLevel: pointsResult.newLevel
            })
          } else if (pointsResult.error) {
            toast({
              title: "Info",
              description: pointsResult.error,
            })
          }
        }
        
        onTaskUpdated()
        toast({
          title: "Progress diperbarui",
          description: "Progress task berhasil diperbarui.",
        })
        
        setEditing(false)
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal memperbarui progress task. Silakan coba lagi.",
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
      setIsUpdating(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!confirm("Apakah Anda yakin ingin menghapus task ini?")) return
    
    setIsDeleting(true)
    try {
      const result = await deleteTask(projectId, task.id)

      if (result.success) {
        onTaskDeleted()
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
    }
  }

  // Fungsi untuk mengupdate tanggal task
  const handleUpdateTaskDates = async (startDate: string, endDate: string) => {
    try {
      const result = await updateTaskDates(projectId, task.id, {
        startDate,
        endDate
      });
      
      if (result.success) {
        onTaskUpdated();
        toast({
          title: "Tanggal diperbarui",
          description: "Tanggal task berhasil diperbarui sesuai prediksi.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal memperbarui tanggal task. Silakan coba lagi.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan yang tidak terduga. Silakan coba lagi.",
        variant: "destructive",
      });
    }
  };

  // Fungsi untuk menghandle perubahan assignee
  const handleAssignUser = async (userId: number | null) => {
    setAssigningUser(true);
    try {
      const result = await updateTaskAssignee(projectId, task.id, userId);

      if (result.success) {
        onTaskUpdated();
        toast({
          title: "Assignee diperbarui",
          description: "Task berhasil ditugaskan ke anggota tim.",
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Gagal mengubah assignee task. Silakan coba lagi.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Terjadi kesalahan yang tidak terduga. Silakan coba lagi.",
        variant: "destructive",
      });
    } finally {
      setAssigningUser(false);
    }
  };

  return (
    <Collapsible 
      className="rounded-lg border p-4 space-y-4" 
      open={commentsOpen} 
      onOpenChange={setCommentsOpen}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {getStatusIcon(task.status)}
            <h3 className="font-medium">{task.name}</h3>
            <Badge variant="outline" className="ml-2">
              {task.status}
            </Badge>
            {task.pointsValue && (
              <Badge variant="secondary" className="ml-1">
                <Award className="h-3 w-3 mr-1" />
                {task.pointsValue} poin
              </Badge>
            )}
            <TaskBlockerIndicator
              taskId={task.id}
              name={task.name}
              description={task.description}
              comments={comments}
            />
            <TaskTimelinePrediction 
              task={{
                id: task.id,
                name: task.name,
                description: task.description,
                startDate: task.startDate,
                endDate: task.endDate,
                status: task.status,
                dependencies: task.dependencies
              }}
              onUpdateTaskDates={handleUpdateTaskDates}
            />
          </div>
          <div className="flex items-center gap-1">
            <CollapsibleTrigger asChild>
              <Button 
                variant={commentsOpen ? "secondary" : "ghost"} 
                size="sm" 
                className="flex items-center gap-1 px-2"
              >
                <MessageSquare className="h-4 w-4" />
                {!isLoadingComments && commentCount > 0 && <span className="text-xs">{commentCount}</span>}
                <span className="sr-only">Tampilkan komentar</span>
              </Button>
            </CollapsibleTrigger>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setEditing(!editing)}
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Update Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDeleteTask} disabled={isDeleting}>
                  <Trash className="mr-2 h-4 w-4" />
                  {isDeleting ? "Menghapus..." : "Hapus Task"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{task.description}</p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Assignee</div>
            {task.editable ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full justify-start mt-1 overflow-hidden"
                    disabled={assigningUser}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    <span className="truncate">
                      {assigningUser ? "Mengassign..." : task.assignee || "Pilih assignee"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 max-h-60 overflow-y-auto">
                  {task.assigneeId && (
                    <DropdownMenuItem onClick={() => handleAssignUser(null)}>
                      <span>Unassign</span>
                    </DropdownMenuItem>
                  )}
                  {members.map((member) => (
                    <DropdownMenuItem 
                      key={member.id} 
                      onClick={() => handleAssignUser(member.id)}
                      disabled={member.id === task.assigneeId}
                    >
                      {member.name}
                    </DropdownMenuItem>
                  ))}
                  {members.length === 0 && (
                    <DropdownMenuItem disabled>
                      Tidak ada anggota tim
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div>{task.assignee || "Belum ditugaskan"}</div>
            )}
          </div>
          <div>
            <div className="text-muted-foreground">Timeline</div>
            <div>
              {formatDate(task.startDate)} - {formatDate(task.endDate)}
            </div>
          </div>
        </div>

        <div>
          {editing ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span>{progress}%</span>
              </div>
              <Slider
                value={[progress]}
                min={0}
                max={100}
                step={5}
                onValueChange={(value) => setProgress(value[0])}
              />
              <div className="flex justify-end space-x-2 mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setEditing(false)}
                  disabled={isUpdating}
                >
                  Batal
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleProgressUpdate}
                  disabled={isUpdating}
                >
                  {isUpdating ? "Menyimpan..." : "Simpan"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span>{task.progress}%</span>
                </div>
                <Progress value={task.progress} className="mt-2" />
              </div>
              
              <div className="flex items-center space-x-2 mt-3">
                <div className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={() => {
                    if (onOpenComments) {
                      onOpenComments(task.id);
                    } else {
                      setCommentsOpen(!commentsOpen);
                    }
                  }}
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="text-xs">
                    {commentCount} komentar
                  </span>
                </div>
                {getStatusIcon(task.status)}
                <span className="text-sm">{task.status}</span>
              </div>
            </>
          )}
        </div>

        {task.dependencies.length > 0 && (
          <div>
            <div className="text-sm text-muted-foreground">Dependencies</div>
            <div className="mt-1 flex flex-wrap gap-2">
              {task.dependencies.map((depId) => {
                const depTask = tasks.find((t) => t.id === depId)
                return depTask ? (
                  <Badge key={depId} variant="secondary">
                    {depTask.name}
                  </Badge>
                ) : null
              })}
            </div>
          </div>
        )}
        
        {/* Tombol lihat/sembunyikan komentar yang lebih jelas */}
        <CollapsibleTrigger asChild>
          <Button 
            variant={commentsOpen ? "secondary" : "outline"} 
            size="sm" 
            className="w-full flex items-center justify-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            {commentsOpen ? (
              <>Sembunyikan Komentar</>
            ) : (
              <>
                {commentCount > 0 ? (
                  <>Lihat {commentCount} Komentar</>
                ) : (
                  <>Tambahkan Komentar</>
                )}
              </>
            )}
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <TaskComments taskId={task.id} projectId={projectId} />
      </CollapsibleContent>
    </Collapsible>
  )
} 