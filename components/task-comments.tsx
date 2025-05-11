"use client"

import { useState, useEffect } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { id } from "date-fns/locale"
import { Send } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { getTaskComments, addTaskComment } from "@/app/actions/comment-actions"

interface TaskCommentsProps {
  taskId: number
  projectId: number
}

export function TaskComments({ taskId, projectId }: TaskCommentsProps) {
  const { toast } = useToast()
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Mengambil komentar saat komponen dimuat atau taskId berubah
  useEffect(() => {
    async function fetchComments() {
      setIsLoading(true)
      try {
        const result = await getTaskComments(projectId, taskId)
        if (result.success) {
          setComments(result.comments)
        } else {
          console.error(result.error)
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
        setIsLoading(false)
      }
    }

    fetchComments()
  }, [taskId, projectId, toast])

  // Fungsi untuk menambahkan komentar baru
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newComment.trim()) return
    
    setIsSubmitting(true)
    try {
      const result = await addTaskComment(projectId, taskId, newComment)
      
      if (result.success) {
        // Tambahkan komentar baru ke state
        setComments([result.comment, ...comments])
        setNewComment("")
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
      setIsSubmitting(false)
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

  return (
    <div className="space-y-4 pt-2">
      {/* Form tambah komentar */}
      <form onSubmit={handleAddComment} className="flex gap-2">
        <Textarea
          placeholder="Tulis komentar..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[80px] flex-1"
          disabled={isSubmitting}
        />
        <Button 
          type="submit" 
          size="icon" 
          className="h-10 w-10 self-end" 
          disabled={isSubmitting || !newComment.trim()}
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Kirim komentar</span>
        </Button>
      </form>
      
      {/* Daftar komentar */}
      {isLoading ? (
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
            <div key={comment.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.user.avatar || ""} />
                <AvatarFallback>{comment.user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{comment.user.name}</div>
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
    </div>
  )
} 