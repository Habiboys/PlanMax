"use server"

import { getServerSession } from "next-auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"

import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

interface TeamMember {
  id: number
  userId: number
  teamId: string
  role: string
  user: {
    id: number
    name: string | null
    email: string
    avatar: string | null
  }
}

// Schema untuk validasi tim
const teamSchema = z.object({
  name: z.string().min(1, "Nama tim diperlukan").max(255),
  description: z.string().optional(),
})

// Membuat tim baru
export async function createTeam(name: string, description: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { success: false, error: "Unauthorized" }
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return { success: false, error: "User not found" }
    }

    const team = await prisma.team.create({
      data: {
        name,
        description,
        owner: {
          connect: {
            id: Number(session.user.id)
          }
        },
        members: {
          create: {
            userId: Number(session.user.id),
            role: "OWNER",
          },
        },
      },
    })

    revalidatePath("/teams")
    return { success: true, team }
  } catch (error) {
    console.error("Error creating team:", error)
    return { success: false, error: "Failed to create team" }
  }
}

// Mendapatkan semua tim untuk pengguna saat ini
export async function getUserTeams() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return { teams: [] }
  }

  try {
    const teamMembers = await prisma.teamMember.findMany({
      where: {
        userId: Number(session.user.id),
      },
      include: {
        team: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                  },
                },
              },
            },
            projects: true,
          },
        },
      },
    })

    const teams = teamMembers.map((tm) => {
      const team = tm.team
      return {
        id: team.id,
        name: team.name,
        description: team.description || "",
        projects: team.projects.length,
        members: team.members.map((member) => ({
          id: member.user.id,
          name: member.user.name || "",
          avatar: member.user.avatar || `/placeholder.svg?height=32&width=32&text=${member.user.name?.charAt(0) || ""}`,
          role: member.role,
        })),
        role: tm.role,
      }
    })

    return { teams }
  } catch (error) {
    console.error("Gagal mengambil tim:", error)
    return { teams: [], error: "Gagal mengambil tim. Silakan coba lagi." }
  }
}

// Memperbarui tim yang ada
export async function updateTeam(teamId: string, formData: FormData) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("Anda harus login untuk memperbarui tim")
  }

  const validatedFields = {
    name: formData.get("name"),
    description: formData.get("description"),
  }

  if (!validatedFields.name) {
    return { success: false, error: "Nama tim harus diisi" }
  }

  try {
    // Periksa apakah pengguna memiliki izin untuk memperbarui tim ini
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: teamId,
        userId: Number(session.user.id),
        role: "OWNER", // Hanya pemilik yang dapat memperbarui tim
      },
    })

    if (!teamMember) {
      return { success: false, error: "Anda tidak memiliki izin untuk memperbarui tim ini" }
    }

    const team = await prisma.team.update({
      where: { id: teamId },
      data: {
        name: validatedFields.name as string,
        description: validatedFields.description as string || "",
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    })

    revalidatePath("/dashboard/teams")
    revalidatePath(`/dashboard/teams/${teamId}`)
    
    return { 
      success: true, 
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        members: team.members.map((member) => ({
          id: member.id,
          name: member.user.name,
          email: member.user.email,
          avatar: member.user.avatar,
          role: member.role,
        })),
        userRole: "OWNER",
      }
    }
  } catch (error) {
    console.error("Gagal memperbarui tim:", error)
    return { success: false, error: "Gagal memperbarui tim. Silakan coba lagi." }
  }
}

// Menghapus tim
export async function deleteTeam(teamId: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("Anda harus login untuk menghapus tim")
  }

  try {
    // Periksa apakah pengguna memiliki izin untuk menghapus tim ini
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: teamId,
        userId: Number(session.user.id),
        role: "OWNER", // Hanya pemilik yang dapat menghapus tim
      },
    })

    if (!teamMember) {
      throw new Error("Anda tidak memiliki izin untuk menghapus tim ini")
    }

    await prisma.team.delete({
      where: { id: teamId },
    })

    revalidatePath("/dashboard/teams")
    return { success: true }
  } catch (error) {
    console.error("Gagal menghapus tim:", error)
    return { success: false, error: "Gagal menghapus tim. Silakan coba lagi." }
  }
}

// Menambahkan anggota tim
// Add team member (now sends invitation)
export async function addTeamMember(teamId: string, formData: FormData) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("Anda harus login untuk mengundang anggota tim")
  }

  const email = formData.get("email") as string
  const role = (formData.get("role") as string) || "MEMBER"

  if (!email) {
    return { success: false, error: "Email diperlukan" }
  }

  try {
    // Periksa apakah pengguna memiliki izin untuk menambahkan anggota
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: teamId,
        userId: Number(session.user.id),
        role: { in: ["OWNER", "ADMIN"] },
      },
    })

    if (!teamMember) {
      throw new Error("Anda tidak memiliki izin untuk mengundang anggota ke tim ini")
    }

    // Cari pengguna berdasarkan email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return {
        success: false,
        error: "Pengguna tidak ditemukan. Mereka perlu mendaftar terlebih dahulu.",
      }
    }

    // Periksa apakah pengguna sudah menjadi anggota
    const existingMember = await prisma.teamMember.findFirst({
      where: {
        teamId: teamId,
        userId: user.id,
      },
    })

    if (existingMember) {
      return {
        success: false,
        error: "Pengguna ini sudah menjadi anggota tim",
      }
    }

    // Periksa apakah sudah ada undangan yang tertunda
    const existingInvitation = await prisma.teamInvitation.findFirst({
      where: {
        teamId: teamId,
        userId: user.id,
        status: "PENDING",
      },
    })

    if (existingInvitation) {
      return {
        success: false,
        error: "Pengguna ini sudah memiliki undangan yang tertunda",
      }
    }

    // Buat undangan
    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId: teamId,
        userId: user.id,
        invitedByUserId: Number(session.user.id),
        role: role,
        status: "PENDING",
      },
    })

    // Buat notifikasi untuk pengguna yang diundang
    const team = await prisma.team.findUnique({ where: { id: teamId } })

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "team_invitation",
        message: `Anda telah diundang untuk bergabung dengan tim "${team?.name || "Unknown"}"`,
        relatedId: invitation.id,
        relatedType: "team_invitation",
      },
    })

    revalidatePath("/dashboard/teams")
    return { success: true, message: "Undangan berhasil dikirim" }
  } catch (error) {
    console.error("Gagal mengirim undangan tim:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengirim undangan tim. Silakan coba lagi.",
    }
  }
}

// New function to accept team invitation
export async function acceptTeamInvitation(invitationId: number) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("You must be logged in to accept invitations")
  }

  try {
    // Find the invitation
    const invitation = await prisma.teamInvitation.findUnique({
      where: {
        id: invitationId,
        userId: Number(session.user.id),
        status: "PENDING"
      },
      include: {
        team: true,
        invitedBy: true
      }
    })

    if (!invitation) {
      return { success: false, error: "Invitation not found or already processed" }
    }

    // Create team membership
    await prisma.teamMember.create({
      data: {
        teamId: invitation.teamId,
        userId: Number(session.user.id),
        role: invitation.role,
      }
    })

    // Update invitation status
    await prisma.teamInvitation.update({
      where: { id: invitationId },
      data: { status: "ACCEPTED" }
    })

    // Create notification for the inviter
    await prisma.notification.create({
      data: {
        userId: invitation.invitedByUserId,
        type: "team_invitation_accepted",
        message: `${session.user.name} telah menerima undangan untuk bergabung dengan tim "${invitation.team.name}"`,
        relatedId: Number(invitation.id),
        relatedType: "team"
      }
    })

    revalidatePath("/dashboard/teams")
    return { success: true }
  } catch (error) {
    console.error("Failed to accept team invitation:", error)
    return { success: false, error: "Failed to accept invitation. Please try again." }
  }
}

// New function to decline team invitation
export async function declineTeamInvitation(invitationId: number) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("You must be logged in to decline invitations")
  }

  try {
    // Find the invitation
    const invitation = await prisma.teamInvitation.findUnique({
      where: {
        id: invitationId,
        userId: Number(session.user.id),
        status: "PENDING"
      },
      include: {
        team: true,
        invitedBy: true
      }
    })

    if (!invitation) {
      return { success: false, error: "Invitation not found or already processed" }
    }

    // Update invitation status
    await prisma.teamInvitation.update({
      where: { id: invitationId },
      data: { status: "DECLINED" }
    })

    // Create notification for the inviter
    await prisma.notification.create({
      data: {
        userId: invitation.invitedByUserId,
        type: "team_invitation_declined",
        message: `${session.user.name} telah menolak undangan untuk bergabung dengan tim "${invitation.team.name}"`,
        relatedId: Number(invitation.id),
        relatedType: "team"
      }
    })

    revalidatePath("/dashboard/teams")
    return { success: true }
  } catch (error) {
    console.error("Failed to decline team invitation:", error)
    return { success: false, error: "Failed to decline invitation. Please try again." }
  }
}

// Menghapus anggota tim
export async function removeTeamMember(teamId: string, userId: number) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("Anda harus login untuk menghapus anggota tim")
  }

  try {
    // Periksa apakah pengguna memiliki izin untuk menghapus anggota
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: teamId,
        userId: Number(session.user.id),
        role: { in: ["OWNER", "ADMIN"] }, // Hanya pemilik dan admin yang dapat menghapus anggota
      },
    })

    if (!teamMember) {
      throw new Error("Anda tidak memiliki izin untuk menghapus anggota dari tim ini")
    }

    // Periksa apakah pengguna yang akan dihapus adalah pemilik
    const memberToRemove = await prisma.teamMember.findFirst({
      where: {
        teamId: teamId,
        userId: userId,
      },
    })

    if (memberToRemove?.role === "OWNER") {
      return {
        success: false,
        error: "Pemilik tim tidak dapat dihapus. Transfer kepemilikan terlebih dahulu.",
      }
    }

    // Hapus anggota dari tim
    await prisma.teamMember.deleteMany({
      where: {
        teamId: teamId,
        userId: userId,
      },
    })

    revalidatePath("/dashboard/teams")
    return { success: true }
  } catch (error) {
    console.error("Gagal menghapus anggota tim:", error)
    return { success: false, error: "Gagal menghapus anggota tim. Silakan coba lagi." }
  }
}

// Mengubah peran anggota tim
export async function updateTeamMemberRole(teamId: string, userId: number, newRole: string) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("Anda harus login untuk mengubah peran anggota tim")
  }

  try {
    // Periksa apakah pengguna memiliki izin untuk mengubah peran
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: teamId,
        userId: Number(session.user.id),
        role: "OWNER", // Hanya pemilik yang dapat mengubah peran
      },
    })

    if (!teamMember) {
      throw new Error("Anda tidak memiliki izin untuk mengubah peran anggota tim ini")
    }

    // Perbarui peran anggota
    await prisma.teamMember.updateMany({
      where: {
        teamId: teamId,
        userId: userId,
      },
      data: {
        role: newRole,
      },
    })

    revalidatePath("/dashboard/teams")
    return { success: true }
  } catch (error) {
    console.error("Gagal mengubah peran anggota tim:", error)
    return { success: false, error: "Gagal mengubah peran anggota tim. Silakan coba lagi." }
  }
}

// Menetapkan tim ke proyek
export async function assignTeamToProject(teamId: string, projectId: number) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("Anda harus login untuk menetapkan tim ke proyek")
  }

  try {
    // Periksa apakah pengguna memiliki izin untuk menetapkan tim
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        teamId: teamId,
        userId: Number(session.user.id),
        role: { in: ["OWNER", "ADMIN"] },
      },
    })

    if (!teamMember) {
      throw new Error("Anda tidak memiliki izin untuk menetapkan tim ini ke proyek")
    }

    // Periksa apakah pengguna memiliki izin untuk memperbarui proyek
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: projectId,
        userId: Number(session.user.id),
        role: { in: ["owner", "admin"] },
      },
    })

    if (!projectMember) {
      throw new Error("Anda tidak memiliki izin untuk memperbarui proyek ini")
    }

    // Tetapkan tim ke proyek
    await prisma.project.update({
      where: { id: projectId },
      data: {
        teamId: teamId,
      },
    })

    revalidatePath(`/dashboard/projects/${projectId}`)
    revalidatePath("/dashboard/teams")
    return { success: true }
  } catch (error) {
    console.error("Gagal menetapkan tim ke proyek:", error)
    return { success: false, error: "Gagal menetapkan tim ke proyek. Silakan coba lagi." }
  }
}

export async function createNotification(userId: number, type: string, message: string, relatedId: number) {
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        message,
        relatedId,
      },
    })
  } catch (error) {
    console.error("Error creating notification:", error)
  }
}

// Mendapatkan semua tim
export async function getTeams() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    })

    return teams.map((team) => ({
      id: team.id,
      name: team.name,
      description: team.description,
      members: team.members.map((member) => ({
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        avatar: member.user.avatar,
        role: member.role,
      })),
    }))
  } catch (error) {
    console.error("Error fetching teams:", error)
    return []
  }
}