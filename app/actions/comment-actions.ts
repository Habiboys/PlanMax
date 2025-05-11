"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

/**
 * Mendapatkan komentar untuk task tertentu
 */
export async function getTaskComments(projectId: number, taskId: number) {
  try {
    // Verifikasi user
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { error: "Anda harus login terlebih dahulu" }
    }

    // Pastikan session.user.id adalah tipe number
    const userId = typeof session.user.id === 'string' 
      ? parseInt(session.user.id, 10) 
      : session.user.id;

    // Verifikasi akses ke project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: { in: [userId] } }
        }
      }
    })

    if (!project) {
      return { error: "Project tidak ditemukan" }
    }

    // Cek apakah user adalah anggota project atau pembuat project
    const isProjectMember = project.members.length > 0 || project.createdById === userId
    
    if (!isProjectMember) {
      return { error: "Anda tidak memiliki akses ke project ini" }
    }

    // Verifikasi task ada di project
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        projectId: projectId
      }
    })

    if (!task) {
      return { error: "Task tidak ditemukan dalam project ini" }
    }

    // Ambil komentar
    const comments = await prisma.comment.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    })

    return { success: true, comments }
  } catch (error) {
    console.error("Error fetching task comments:", error)
    return { error: "Terjadi kesalahan saat mengambil komentar" }
  }
}

/**
 * Menambahkan komentar baru ke task
 */
export async function addTaskComment(projectId: number, taskId: number, content: string) {
  try {
    if (!content || !content.trim()) {
      return { error: "Komentar tidak boleh kosong" }
    }

    // Verifikasi user
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { error: "Anda harus login terlebih dahulu" }
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return { error: "User tidak ditemukan" }
    }

    // Verifikasi akses ke project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: user.id }
        }
      }
    })

    if (!project) {
      return { error: "Project tidak ditemukan" }
    }

    // Cek apakah user adalah anggota project atau pembuat project
    const isProjectMember = project.members.length > 0 || project.createdById === user.id
    
    if (!isProjectMember) {
      return { error: "Anda tidak memiliki akses ke project ini" }
    }

    // Verifikasi task ada di project
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        projectId: projectId
      }
    })

    if (!task) {
      return { error: "Task tidak ditemukan dalam project ini" }
    }

    // Tambahkan komentar
    const comment = await prisma.comment.create({
      data: {
        taskId,
        userId: user.id,
        content: content.trim()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    })

    // Tambahkan notifikasi untuk assignee task jika ada
    if (task.assigneeId && task.assigneeId !== user.id) {
      await prisma.notification.create({
        data: {
          userId: task.assigneeId,
          type: "comment",
          message: `${user.name} mengomentari task "${task.name}" yang ditugaskan kepada Anda`,
          relatedId: taskId,
          relatedType: "task"
        }
      })
    }

    // Perbarui cache
    revalidatePath(`/dashboard/projects/${projectId}`)

    return { success: true, comment }
  } catch (error) {
    console.error("Error adding task comment:", error)
    return { error: "Terjadi kesalahan saat menambahkan komentar" }
  }
} 