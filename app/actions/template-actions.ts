"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

interface TemplateTaskInput {
  name: string
  description?: string
  duration: number
  sequence: number
  dependsOn?: number[] // ID tugas template yang menjadi dependensi
}

/**
 * Mendapatkan semua template proyek yang dimiliki oleh user
 */
export async function getProjectTemplates() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { error: "Anda harus login terlebih dahulu" }
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return { error: "User tidak ditemukan" }
    }

    const templates = await db.projectTemplate.findMany({
      where: { createdById: user.id },
      include: {
        tasks: {
          orderBy: { sequence: "asc" },
        },
      },
    })

    return { templates }
  } catch (error) {
    console.error("Error getting project templates:", error)
    return { error: "Terjadi kesalahan saat mengambil template proyek" }
  }
}

/**
 * Mendapatkan detail template proyek berdasarkan ID
 */
export async function getProjectTemplate(templateId: number) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { error: "Anda harus login terlebih dahulu" }
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return { error: "User tidak ditemukan" }
    }

    const template = await db.projectTemplate.findFirst({
      where: {
        id: templateId,
        createdById: user.id,
      },
      include: {
        tasks: {
          include: {
            dependsOn: {
              include: {
                dependsOnTask: true,
              },
            },
          },
          orderBy: { sequence: "asc" },
        },
      },
    })

    if (!template) {
      return { error: "Template tidak ditemukan atau Anda tidak memiliki akses" }
    }

    // Format template untuk frontend
    const formattedTemplate = {
      id: template.id,
      name: template.name,
      description: template.description || "",
      tasks: template.tasks.map((task) => ({
        id: task.id,
        name: task.name,
        description: task.description || "",
        duration: task.duration,
        sequence: task.sequence,
        dependsOn: task.dependsOn.map((dep) => dep.dependsOnTaskId),
      })),
    }

    return { template: formattedTemplate }
  } catch (error) {
    console.error("Error getting project template:", error)
    return { error: "Terjadi kesalahan saat mengambil template proyek" }
  }
}

/**
 * Membuat template proyek baru
 */
export async function createProjectTemplate(data: {
  name: string
  description?: string
  tasks: TemplateTaskInput[]
}) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { error: "Anda harus login terlebih dahulu" }
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return { error: "User tidak ditemukan" }
    }

    // Buat template proyek
    const template = await db.projectTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        createdById: user.id,
      },
    })

    // Buat template tugas
    for (const taskData of data.tasks) {
      await db.templateTask.create({
        data: {
          templateId: template.id,
          name: taskData.name,
          description: taskData.description,
          duration: taskData.duration,
          sequence: taskData.sequence,
        },
      })
    }

    // Buat dependensi antar tugas
    for (let i = 0; i < data.tasks.length; i++) {
      const task = data.tasks[i]
      if (task.dependsOn && task.dependsOn.length > 0) {
        // Temukan ID template task yang baru dibuat
        const createdTask = await db.templateTask.findFirst({
          where: {
            templateId: template.id,
            sequence: task.sequence,
          },
        })

        if (createdTask) {
          for (const dependsOnSeq of task.dependsOn) {
            const dependsOnTask = await db.templateTask.findFirst({
              where: {
                templateId: template.id,
                sequence: dependsOnSeq,
              },
            })

            if (dependsOnTask) {
              await db.templateTaskDependency.create({
                data: {
                  taskId: createdTask.id,
                  dependsOnTaskId: dependsOnTask.id,
                },
              })
            }
          }
        }
      }
    }

    revalidatePath("/dashboard/templates")
    return { success: true, templateId: template.id }
  } catch (error) {
    console.error("Error creating project template:", error)
    return { error: "Terjadi kesalahan saat membuat template proyek" }
  }
}

/**
 * Memperbarui template proyek yang ada
 */
export async function updateProjectTemplate(
  templateId: number,
  data: {
    name?: string
    description?: string
    tasks?: TemplateTaskInput[]
  }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { error: "Anda harus login terlebih dahulu" }
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return { error: "User tidak ditemukan" }
    }

    // Pastikan template milik user
    const template = await db.projectTemplate.findFirst({
      where: {
        id: templateId,
        createdById: user.id,
      },
    })

    if (!template) {
      return { error: "Template tidak ditemukan atau Anda tidak memiliki akses" }
    }

    // Update template
    await db.projectTemplate.update({
      where: { id: templateId },
      data: {
        name: data.name,
        description: data.description,
      },
    })

    // Jika ada update tugas
    if (data.tasks) {
      // Hapus semua tugas dan dependensi yang ada
      const existingTasks = await db.templateTask.findMany({
        where: { templateId },
      })

      for (const task of existingTasks) {
        await db.templateTaskDependency.deleteMany({
          where: {
            OR: [{ taskId: task.id }, { dependsOnTaskId: task.id }],
          },
        })
      }

      await db.templateTask.deleteMany({
        where: { templateId },
      })

      // Buat tugas baru
      for (const taskData of data.tasks) {
        await db.templateTask.create({
          data: {
            templateId,
            name: taskData.name,
            description: taskData.description,
            duration: taskData.duration,
            sequence: taskData.sequence,
          },
        })
      }

      // Buat dependensi baru
      for (let i = 0; i < data.tasks.length; i++) {
        const task = data.tasks[i]
        if (task.dependsOn && task.dependsOn.length > 0) {
          const createdTask = await db.templateTask.findFirst({
            where: {
              templateId,
              sequence: task.sequence,
            },
          })

          if (createdTask) {
            for (const dependsOnSeq of task.dependsOn) {
              const dependsOnTask = await db.templateTask.findFirst({
                where: {
                  templateId,
                  sequence: dependsOnSeq,
                },
              })

              if (dependsOnTask) {
                await db.templateTaskDependency.create({
                  data: {
                    taskId: createdTask.id,
                    dependsOnTaskId: dependsOnTask.id,
                  },
                })
              }
            }
          }
        }
      }
    }

    revalidatePath("/dashboard/templates")
    revalidatePath(`/dashboard/templates/${templateId}`)
    return { success: true }
  } catch (error) {
    console.error("Error updating project template:", error)
    return { error: "Terjadi kesalahan saat memperbarui template proyek" }
  }
}

/**
 * Menghapus template proyek
 */
export async function deleteProjectTemplate(templateId: number) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { error: "Anda harus login terlebih dahulu" }
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return { error: "User tidak ditemukan" }
    }

    // Pastikan template milik user
    const template = await db.projectTemplate.findFirst({
      where: {
        id: templateId,
        createdById: user.id,
      },
    })

    if (!template) {
      return { error: "Template tidak ditemukan atau Anda tidak memiliki akses" }
    }

    // Hapus template
    await db.projectTemplate.delete({
      where: { id: templateId },
    })

    revalidatePath("/dashboard/templates")
    return { success: true }
  } catch (error) {
    console.error("Error deleting project template:", error)
    return { error: "Terjadi kesalahan saat menghapus template proyek" }
  }
}

/**
 * Membuat proyek baru dari template
 */
export async function createProjectFromTemplate(
  templateId: number,
  projectData: {
    name: string
    description?: string
    startDate: Date
  }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { error: "Anda harus login terlebih dahulu" }
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return { error: "User tidak ditemukan" }
    }

    // Ambil template proyek
    const template = await db.projectTemplate.findFirst({
      where: {
        id: templateId,
      },
      include: {
        tasks: {
          include: {
            dependsOn: true,
          },
          orderBy: { sequence: "asc" },
        },
      },
    })

    if (!template) {
      return { error: "Template tidak ditemukan" }
    }

    // Hitung tanggal akhir proyek berdasarkan durasi tugas
    let projectEndDate = new Date(projectData.startDate)
    let totalDuration = 0

    template.tasks.forEach((task) => {
      totalDuration += task.duration
    })

    projectEndDate.setDate(projectEndDate.getDate() + totalDuration)

    // Buat proyek baru
    const project = await db.project.create({
      data: {
        name: projectData.name,
        description: projectData.description,
        startDate: projectData.startDate,
        endDate: projectEndDate,
        status: "Not Started",
        createdById: user.id,
      },
    })

    // Tambahkan pembuat proyek sebagai anggota
    await db.projectMember.create({
      data: {
        projectId: project.id,
        userId: user.id,
        role: "OWNER",
      },
    })

    // Mapping ID template task ke ID task proyek
    const taskIdMapping = new Map<number, number>()

    // Buat tugas berdasarkan template
    let currentDate = new Date(projectData.startDate)

    for (const templateTask of template.tasks) {
      const taskEndDate = new Date(currentDate)
      taskEndDate.setDate(taskEndDate.getDate() + templateTask.duration)

      const task = await db.task.create({
        data: {
          projectId: project.id,
          name: templateTask.name,
          description: templateTask.description,
          startDate: currentDate,
          endDate: taskEndDate,
          status: "Not Started",
          progress: 0,
        },
      })

      // Simpan mapping antara ID template task dan ID task yang baru dibuat
      taskIdMapping.set(templateTask.id, task.id)

      // Perbarui tanggal saat ini untuk tugas berikutnya
      currentDate = new Date(taskEndDate)
    }

    // Buat dependensi antar tugas
    for (const templateTask of template.tasks) {
      const newTaskId = taskIdMapping.get(templateTask.id)

      if (newTaskId) {
        for (const dependency of templateTask.dependsOn) {
          const dependsOnTaskId = taskIdMapping.get(dependency.dependsOnTaskId)

          if (dependsOnTaskId) {
            await db.taskDependency.create({
              data: {
                taskId: newTaskId,
                dependsOnTaskId,
              },
            })
          }
        }
      }
    }

    revalidatePath("/dashboard")
    return { success: true, projectId: project.id }
  } catch (error) {
    console.error("Error creating project from template:", error)
    return { error: "Terjadi kesalahan saat membuat proyek dari template" }
  }
}

/**
 * Menyimpan proyek yang ada sebagai template
 */
export async function saveProjectAsTemplate(
  projectId: number,
  templateName: string,
  templateDescription?: string
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return { error: "Anda harus login terlebih dahulu" }
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return { error: "User tidak ditemukan" }
    }

    // Ambil proyek
    const project = await db.project.findFirst({
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
      include: {
        tasks: {
          include: {
            dependsOn: true,
          },
          orderBy: { startDate: "asc" },
        },
      },
    })

    if (!project) {
      return { error: "Proyek tidak ditemukan atau Anda tidak memiliki akses" }
    }

    // Buat template proyek baru
    const template = await db.projectTemplate.create({
      data: {
        name: templateName,
        description: templateDescription,
        createdById: user.id,
      },
    })

    // Mapping tugas proyek ke sequence
    const taskSequenceMap = new Map<number, number>()
    project.tasks.forEach((task, index) => {
      taskSequenceMap.set(task.id, index + 1)
    })

    // Mapping ID task proyek ke ID template task
    const taskIdMapping = new Map<number, number>()

    // Buat template task berdasarkan tugas proyek
    for (const task of project.tasks) {
      // Hitung durasi task dalam hari
      const startDate = new Date(task.startDate)
      const endDate = new Date(task.endDate)
      const durationInDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24))

      const templateTask = await db.templateTask.create({
        data: {
          templateId: template.id,
          name: task.name,
          description: task.description,
          duration: durationInDays > 0 ? durationInDays : 1, // Minimal 1 hari
          sequence: taskSequenceMap.get(task.id) || 0,
        },
      })

      // Simpan mapping antara ID task proyek dan ID template task
      taskIdMapping.set(task.id, templateTask.id)
    }

    // Buat dependensi antar template task
    for (const task of project.tasks) {
      const templateTaskId = taskIdMapping.get(task.id)

      if (templateTaskId) {
        for (const dependency of task.dependsOn) {
          const dependsOnTemplateTaskId = taskIdMapping.get(dependency.dependsOnTaskId)

          if (dependsOnTemplateTaskId) {
            await db.templateTaskDependency.create({
              data: {
                taskId: templateTaskId,
                dependsOnTaskId: dependsOnTemplateTaskId,
              },
            })
          }
        }
      }
    }

    revalidatePath("/dashboard/templates")
    return { success: true, templateId: template.id }
  } catch (error) {
    console.error("Error saving project as template:", error)
    return { error: "Terjadi kesalahan saat menyimpan proyek sebagai template" }
  }
} 