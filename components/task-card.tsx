"use client"

import { format, parseISO } from "date-fns"
import {
  Award,
  CheckCircle, Circle, Clock,
  MessageSquare,
  MoreHorizontal,
  Pencil, Trash,
  UserPlus
} from "lucide-react"
import { useEffect, useState } from "react"

import { getTaskComments } from "@/app/actions/comment-actions"
import { addTaskCompletionPoints } from "@/app/actions/points-actions"
import { deleteTask, updateTaskAssignee, updateTaskDates, updateTaskProgress } from "@/app/actions/task-actions"
import { EditTaskForm } from "@/components/edit-task-form"
import { TaskBlockerIndicator } from "@/components/task-blocker-indicator"
import { TaskComments } from "@/components/task-comments"
import { TaskTimelinePrediction } from "@/components/task-timeline-prediction"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
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
    priority: string
    type: string
    estimatedHours: number | null
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
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
    setIsDeleting(true)
    try {
      const result = await deleteTask(projectId, task.id)

      if (result.success) {
        onTaskDeleted()
        toast({
          title: "Task dihapus",
          description: "Task berhasil dihapus.",
        })
        setIsDeleteDialogOpen(false)
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
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-medium">{task.name}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {format(parseISO(task.startDate), "d MMM")} - {format(parseISO(task.endDate), "d MMM yyyy")}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge 
              variant={task.priority === "High" ? "destructive" : task.priority === "Medium" ? "default" : "secondary"}
            >
              {task.priority}
            </Badge>
            <Badge variant="outline">{task.type}</Badge>
            {task.estimatedHours && (
              <Badge variant="outline" className="ml-2">
                {task.estimatedHours} jam
              </Badge>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditDialogOpen(true)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit Task
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditing(!editing)}>
                  <Award className="mr-2 h-4 w-4" />
                  Update Progress
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-destructive">
                  <Trash className="mr-2 h-4 w-4" />
                  Hapus Task
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

        <div className="flex items-center gap-2">
          {getStatusIcon(task.status)}
          <span className="text-sm font-medium">{task.status}</span>
          
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
              status: task.status as "Not Started" | "In Progress" | "Completed",
              priority: task.priority as "High" | "Medium" | "Low",
              task_type: task.type as "Development" | "Testing" | "Documentation" | "Research" | "Meeting" | "Other",
              estimated_hours: task.estimatedHours || 0,
              dependencies: task.dependencies,
              team_size: "Small",
              dependency_count: task.dependencies.length
            }}
            historicalTasks={tasks.map(t => ({
              id: t.id,
              name: t.name,
              description: t.description,
              startDate: t.startDate,
              endDate: t.endDate,
              status: t.status as "Not Started" | "In Progress" | "Completed",
              priority: t.priority as "High" | "Medium" | "Low",
              task_type: t.type as "Development" | "Testing" | "Documentation" | "Research" | "Meeting" | "Other",
              estimated_hours: t.estimatedHours || 0,
              dependencies: t.dependencies,
              team_size: "Small",
              dependency_count: t.dependencies.length
            }))}
            onUpdateTaskDates={handleUpdateTaskDates}
          />
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

      {/* Edit Task Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Edit informasi task. Perubahan akan langsung tersimpan.
            </DialogDescription>
          </DialogHeader>
          <EditTaskForm
            projectId={projectId}
            task={task}
            teamMembers={members}
            onSuccess={() => {
              setIsEditDialogOpen(false)
              onTaskUpdated()
            }}
            onCancel={() => setIsEditDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Task Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Task</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus task ini? Tindakan ini tidak dapat dibatalkan.
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="font-medium">{task.name}</div>
                <div className="text-sm text-muted-foreground mt-1">{task.description}</div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={task.priority === "High" ? "destructive" : task.priority === "Medium" ? "default" : "secondary"}>
                    {task.priority}
                  </Badge>
                  <Badge variant="outline">{task.type}</Badge>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <span className="loading loading-spinner loading-xs mr-2"></span>
                  Menghapus...
                </>
              ) : (
                "Hapus Task"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Collapsible>
  )
} 