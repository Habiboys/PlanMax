"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth"
import { Session } from "next-auth"

// Extend Session type to include user.id
interface ExtendedSession extends Session {
  user: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
  }
}

// Schema for project creation/update
const projectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(255),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.string().default("Not Started"),
})

// Schema untuk validasi project
const createProjectSchema = z.object({
  name: z.string().min(1, "Nama project harus diisi"),
  description: z.string().optional(),
  teamId: z.number().optional(),
})

// Create a new project
export async function createProject(data: z.infer<typeof createProjectSchema>) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { error: "Anda harus login terlebih dahulu" }
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return { error: "User tidak ditemukan" }
    }

    // Validasi data
    const validatedData = createProjectSchema.parse(data)

    // Buat project baru
    const project = await prisma.project.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        createdById: user.id,
        teamId: validatedData.teamId?.toString(),
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
      },
    })

    // Buat risiko default untuk proyek baru
    const defaultRisks = [
      {
        name: "Keterlambatan Jadwal",
        description: "Risiko proyek tidak selesai sesuai dengan timeline yang direncanakan",
        impact: "High",
        probability: "Medium",
        mitigation: "1. Monitoring progress secara rutin\n2. Identifikasi bottleneck sejak dini\n3. Alokasi buffer time untuk task-task kritis",
        status: "Identified",
        projectId: project.id
      },
      {
        name: "Perubahan Kebutuhan",
        description: "Perubahan requirement yang signifikan selama proyek berjalan",
        impact: "Medium",
        probability: "High",
        mitigation: "1. Dokumentasi requirement yang detail\n2. Komunikasi rutin dengan stakeholder\n3. Proses change management yang jelas",
        status: "Identified",
        projectId: project.id
      },
      {
        name: "Keterbatasan Sumber Daya",
        description: "Kekurangan sumber daya manusia atau teknis selama proyek",
        impact: "High",
        probability: "Medium",
        mitigation: "1. Perencanaan alokasi sumber daya di awal\n2. Identifikasi skill gap\n3. Training dan knowledge sharing",
        status: "Identified",
        projectId: project.id
      },
      {
        name: "Masalah Teknis",
        description: "Kendala teknis yang dapat menghambat pengembangan",
        impact: "Medium",
        probability: "Medium",
        mitigation: "1. Code review rutin\n2. Testing komprehensif\n3. Dokumentasi teknis yang baik",
        status: "Identified",
        projectId: project.id
      },
      {
        name: "Komunikasi Tim",
        description: "Miscommunication atau lack of communication dalam tim",
        impact: "Medium",
        probability: "Low",
        mitigation: "1. Daily standup meeting\n2. Penggunaan tools kolaborasi\n3. Dokumentasi komunikasi penting",
        status: "Identified",
        projectId: project.id
      }
    ];

    // Buat semua risiko default
    await prisma.risk.createMany({
      data: defaultRisks
    });

    revalidatePath("/dashboard")
    return { success: true, project }
  } catch (error) {
    console.error("Error creating project:", error)
    return { error: "Terjadi kesalahan saat membuat project" }
  }
}

// Update an existing project
export async function updateProject(projectId: number, formData: FormData) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("You must be logged in to update a project")
  }

  const validatedFields = projectSchema.parse({
    name: formData.get("name"),
    description: formData.get("description"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    status: formData.get("status"),
  })

  try {
    // Check if user has permission to update this project
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: projectId,
        userId: Number.parseInt(session.user.id),
      },
    })

    if (!projectMember) {
      throw new Error("You don't have permission to update this project")
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: {
        name: validatedFields.name,
        description: validatedFields.description || "",
        startDate: validatedFields.startDate ? new Date(validatedFields.startDate) : null,
        endDate: validatedFields.endDate ? new Date(validatedFields.endDate) : null,
        status: validatedFields.status,
      },
    })

    revalidatePath(`/dashboard/${projectId}`)
    revalidatePath("/dashboard")
    return { success: true, projectId: project.id }
  } catch (error) {
    console.error("Failed to update project:", error)
    return { success: false, error: "Failed to update project. Please try again." }
  }
}

// Delete a project
export async function deleteProject(projectId: number) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("You must be logged in to delete a project")
  }

  try {
    // Check if user has permission to delete this project
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: projectId,
        userId: Number.parseInt(session.user.id),
        role: "OWNER", // Only owners can delete projects
      },
    })

    if (!projectMember) {
      throw new Error("You don't have permission to delete this project")
    }

    await prisma.project.delete({
      where: { id: projectId },
    })

    // Revalidate multiple paths to ensure UI updates
    revalidatePath("/dashboard")
    revalidatePath("/")
    return { success: true }
  } catch (error) {
    console.error("Failed to delete project:", error)
    return { success: false, error: "Failed to delete project. Please try again." }
  }
}

// Archive a project
export async function archiveProject(projectId: number) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("You must be logged in to archive a project")
  }

  try {
    // Check if user has permission to archive this project
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: projectId,
        userId: Number.parseInt(session.user.id),
        role: { in: ["OWNER", "ADMIN"] }, // Owners and admins can archive
      },
    })

    if (!projectMember) {
      throw new Error("You don't have permission to archive this project")
    }

    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: "Archived",
      },
    })

    revalidatePath("/dashboard")
    return { success: true }
  } catch (error) {
    console.error("Failed to archive project:", error)
    return { success: false, error: "Failed to archive project. Please try again." }
  }
}

// Get all projects for the current user
export async function getUserProjects() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return { projects: [] }
  }

  try {
    const projectMembers = await prisma.projectMember.findMany({
      where: {
        userId: Number.parseInt(session.user.id),
      },
      include: {
        project: {
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
            tasks: true,
          },
        },
      },
    })

    const projects = projectMembers.map((pm) => {
      const project = pm.project
      const completedTasks = project.tasks.filter((task) => task.status === "Completed").length

      return {
        id: project.id,
        name: project.name,
        description: project.description || "",
        progress: project.progress,
        status: project.status,
        startDate: project.startDate ? project.startDate.toISOString() : null,
        endDate: project.endDate ? project.endDate.toISOString() : null,
        tasks: project.tasks.length,
        completedTasks,
        team: project.members.map((member) => ({
          id: member.user.id,
          name: member.user.name,
          avatar: member.user.avatar || `/placeholder.svg?height=32&width=32&text=${member.user.name.charAt(0)}`,
          role: member.role,
        })),
        role: pm.role,
      }
    })

    return { projects }
  } catch (error) {
    console.error("Failed to fetch projects:", error)
    return { projects: [], error: "Failed to fetch projects. Please try again." }
  }
}

// Get a single project by ID
export async function getProject(projectId: number) {
  try {
    const session = await getServerSession(authOptions) as ExtendedSession
    if (!session?.user?.email) {
      return { error: "Anda harus login terlebih dahulu" }
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return { error: "User tidak ditemukan" }
    }

    // Check if user has permission to view this project
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: projectId,
        userId: user.id,
      },
    })

    // Get project details
    const project = await prisma.project.findUnique({
      where: { id: projectId },
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
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
              },
            },
            dependsOn: {
              select: {
                dependsOnTaskId: true,
              },
            },
          },
        },
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
          },
        },
        risks: true,
      },
    })

    if (!project) {
      return { error: "Project tidak ditemukan" }
    }

    // Check if user is project member or creator
    if (!projectMember && project.createdById !== user.id) {
      return { error: "Anda tidak memiliki akses ke project ini" }
    }

    // Format dates to ISO strings and transform dependencies
    const formattedProject = {
      ...project,
      startDate: project.startDate?.toISOString() || null,
      endDate: project.endDate?.toISOString() || null,
      tasks: project.tasks.map(task => ({
        ...task,
        startDate: task.startDate?.toISOString() || null,
        endDate: task.endDate?.toISOString() || null,
        dependencies: task.dependsOn.map(dep => dep.dependsOnTaskId),
        assignee: task.assignee?.name || null,
        assigneeId: task.assignee?.id || null
      }))
    }

    return { success: true, project: formattedProject }
  } catch (error) {
    console.error("Error fetching project:", error)
    return { error: "Terjadi kesalahan saat mengambil data project" }
  }
}

// Add a team member to a project
export async function addProjectMember(projectId: number, formData: FormData) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("You must be logged in to add team members")
  }

  const email = formData.get("email") as string
  const role = (formData.get("role") as string) || "MEMBER"

  if (!email) {
    return { success: false, error: "Email is required" }
  }

  try {
    // Check if user has permission to add members
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: projectId,
        userId: Number.parseInt(session.user.id),
        role: { in: ["OWNER", "ADMIN"] }, // Only owners and admins can add members
      },
    })

    if (!projectMember) {
      throw new Error("You don't have permission to add members to this project")
    }

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      return {
        success: false,
        error: "User not found. They need to register first.",
      }
    }

    // Check if user is already a member
    const existingMember = await prisma.projectMember.findFirst({
      where: {
        projectId: projectId,
        userId: user.id,
      },
    })

    if (existingMember) {
      return {
        success: false,
        error: "This user is already a member of the project",
      }
    }

    // Add the user to the project
    await prisma.projectMember.create({
      data: {
        projectId: projectId,
        userId: user.id,
        role: role.toUpperCase(),
      },
    })

    // Create a notification for the added user
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: "project_invitation",
        message: `You have been added to the project "${(await prisma.project.findUnique({ where: { id: projectId } }))?.name}"`,
        relatedId: projectId,
        relatedType: "project",
      },
    })

    revalidatePath(`/dashboard/${projectId}`)
    return { success: true }
  } catch (error) {
    console.error("Failed to add team member:", error)
    return { success: false, error: "Failed to add team member. Please try again." }
  }
}

// Remove a team member from a project
export async function removeProjectMember(projectId: number, userId: number) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    throw new Error("You must be logged in to remove team members")
  }

  try {
    // Check if user has permission to remove members
    const projectMember = await prisma.projectMember.findFirst({
      where: {
        projectId: projectId,
        userId: Number.parseInt(session.user.id),
        role: { in: ["OWNER", "ADMIN"] }, // Only owners and admins can remove members
      },
    })

    if (!projectMember) {
      throw new Error("You don't have permission to remove members from this project")
    }

    // Check if trying to remove the owner
    const memberToRemove = await prisma.projectMember.findFirst({
      where: {
        projectId: projectId,
        userId: userId,
      },
    })

    if (memberToRemove?.role === "OWNER") {
      throw new Error("Cannot remove the project owner")
    }

    // Remove the user from the project
    await prisma.projectMember.deleteMany({
      where: {
        projectId: projectId,
        userId: userId,
      },
    })

    revalidatePath(`/dashboard/${projectId}`)
    return { success: true }
  } catch (error) {
    console.error("Failed to remove team member:", error)
    return { success: false, error: "Failed to remove team member. Please try again." }
  }
}

// Fungsi untuk Manajemen Risiko
export async function getRisks(projectId: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { error: "Anda harus login terlebih dahulu" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return { error: "User tidak ditemukan" };
    }

    // Pastikan user memiliki akses ke proyek
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { createdById: user.id },
          {
            members: {
              some: {
                userId: user.id,
              },
            },
          },
        ],
      },
    });

    if (!project) {
      return { error: "Proyek tidak ditemukan atau Anda tidak memiliki akses" };
    }

    const risks = await prisma.risk.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    return { risks };
  } catch (error) {
    console.error("Error getting risks:", error);
    return { error: "Terjadi kesalahan saat mengambil data risiko" };
  }
}

export async function createRisk(data: {
  projectId: number;
  name: string;
  description?: string;
  impact: string;
  probability: string;
  mitigation?: string;
  status?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { error: "Anda harus login terlebih dahulu" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return { error: "User tidak ditemukan" };
    }

    // Pastikan user memiliki akses ke proyek
    const project = await prisma.project.findFirst({
      where: {
        id: data.projectId,
        OR: [
          { createdById: user.id },
          {
            members: {
              some: {
                userId: user.id,
              },
            },
          },
        ],
      },
    });

    if (!project) {
      return { error: "Proyek tidak ditemukan atau Anda tidak memiliki akses" };
    }

    const risk = await prisma.risk.create({
      data: {
        projectId: data.projectId,
        name: data.name,
        description: data.description,
        impact: data.impact,
        probability: data.probability,
        mitigation: data.mitigation,
        status: data.status || "Identified",
      },
    });

    return { success: true, risk };
  } catch (error) {
    console.error("Error creating risk:", error);
    return { error: "Terjadi kesalahan saat membuat risiko" };
  }
}

export async function updateRisk(riskId: number, data: {
  name?: string;
  description?: string;
  impact?: string;
  probability?: string;
  mitigation?: string;
  status?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { error: "Anda harus login terlebih dahulu" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return { error: "User tidak ditemukan" };
    }

    // Ambil risiko yang akan diupdate
    const risk = await prisma.risk.findUnique({
      where: { id: riskId },
      include: { project: true },
    });

    if (!risk) {
      return { error: "Risiko tidak ditemukan" };
    }

    // Pastikan user memiliki akses ke proyek
    const project = await prisma.project.findFirst({
      where: {
        id: risk.projectId,
        OR: [
          { createdById: user.id },
          {
            members: {
              some: {
                userId: user.id,
              },
            },
          },
        ],
      },
    });

    if (!project) {
      return { error: "Anda tidak memiliki akses ke proyek ini" };
    }

    // Update risiko
    const updatedRisk = await prisma.risk.update({
      where: { id: riskId },
      data: {
        name: data.name,
        description: data.description,
        impact: data.impact,
        probability: data.probability,
        mitigation: data.mitigation,
        status: data.status,
      },
    });

    return { success: true, risk: updatedRisk };
  } catch (error) {
    console.error("Error updating risk:", error);
    return { error: "Terjadi kesalahan saat memperbarui risiko" };
  }
}

export async function deleteRisk(riskId: number) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return { error: "Anda harus login terlebih dahulu" };
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return { error: "User tidak ditemukan" };
    }

    // Ambil risiko yang akan dihapus
    const risk = await prisma.risk.findUnique({
      where: { id: riskId },
      include: { project: true },
    });

    if (!risk) {
      return { error: "Risiko tidak ditemukan" };
    }

    // Pastikan user memiliki akses ke proyek
    const project = await prisma.project.findFirst({
      where: {
        id: risk.projectId,
        OR: [
          { createdById: user.id },
          {
            members: {
              some: {
                userId: user.id,
              },
            },
          },
        ],
      },
    });

    if (!project) {
      return { error: "Anda tidak memiliki akses ke proyek ini" };
    }

    // Hapus risiko
    await prisma.risk.delete({
      where: { id: riskId },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting risk:", error);
    return { error: "Terjadi kesalahan saat menghapus risiko" };
  }
}